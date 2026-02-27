/**
 * FIREBASE ADMIN FUNCTIONS
 * =========================
 * CRUD operations for managing projects, buildings, and units
 */

// ============================================================================
// HELPERS & CONFIG
// ============================================================================

// Relying on globals declared in query-api.js (loaded first)
// window.CLOUDFLARE_WORKER_URL and window.AUTH_KEY should be available.

/**
 * Promise wrapper with timeout
 */
function withTimeout(promise, ms = 15000, context = 'Operation') {
    const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`${context} timed out après ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeout]);
}

/**
 * Global Cloudflare Sync Helper
 */
async function syncToCloudflare(table, action, id, data = {}) {
    try {
        console.log(`☁️ [Cloudflare Sync] START: ${table} ${action} ${id}`);

        // 🔒 SECURITY LOCK: Reporters cannot modify or delete data
        const isReporter = localStorage.getItem('isReporter') === 'true';
        if (isReporter && (action === 'DELETE' || action === 'UPSERT' || action === 'UPLOAD')) {
            console.error("❌ SECURITY LOCK: Action blocked. Reporters are restricted to 'ReadOnly/Export' access.");
            alert("Security Error: Reporters do not have permission to modify data.");
            return { success: false, error: "Permission Denied: Reporter role is Read-Only." };
        }

        // Strict Delete Check: Only Admin can delete
        if (action === 'DELETE') {
            const isAdmin = localStorage.getItem('isAdmin') === 'true';
            if (!isAdmin) {
                console.error("❌ SECURITY LOCK: Action blocked. Only Admin can delete data.");
                alert("Security Error: You do not have permission to delete.");
                return { success: false, error: "Permission Denied: Only Admin can delete." };
            }
        }

        // Serialize complex data for SQL
        const serializedData = { ...data };

        // 🚀 DATABASE COLUMN MAPPING (CamelCase -> Underscores for D1)
        if (table === 'units') {
            // Ensure unit_id is set as the PK
            serializedData.unit_id = id || data.code || data.unit_id;

            // 🌆 Image Handling:
            // Ensure `images` is kept as the primary source of truth (Array -> JSON String)
            // But also populate `image` (singular) for legacy views that might pick only one.
            if (Array.isArray(serializedData.images) && serializedData.images.length > 0) {
                const firstImg = serializedData.images[0];
                // If it's an object { data: "..." }, extract data. otherwise assume string.
                serializedData.image = (typeof firstImg === 'object' && firstImg.data) ? firstImg.data : firstImg;

                // FLATTEN IMAGES FOR STORAGE
                // Convert [{data: "..."}] -> ["..."] to save space if needed, or just stringify the objects?
                // Better to standardise on array of strings if they are base64.
                serializedData.images = serializedData.images.map(img => (typeof img === 'object' && img.data) ? img.data : img);
            }

            if (serializedData.buildingId) {
                serializedData.building_id = serializedData.buildingId;
                delete serializedData.buildingId;
            }
            if (serializedData.projectId) {
                serializedData.project_id = serializedData.projectId;
                delete serializedData.projectId;
            }
            if (serializedData.project && !serializedData.project_id) {
                serializedData.project_id = serializedData.project;
                delete serializedData.project;
            }
            // cleanup generic id to avoid confusion
            delete serializedData.id;
        } else if (table === 'buildings') {
            if (id) serializedData.id = id.toString();
            if (serializedData.projectId) {
                serializedData.project_id = serializedData.projectId;
                delete serializedData.projectId;
            }
            if (serializedData.projectName) {
                serializedData.project_name = serializedData.projectName;
                delete serializedData.projectName;
            }
            if (serializedData.constStatus) {
                serializedData.const_status = serializedData.constStatus;
                delete serializedData.constStatus;
            }
            // IMAGE KEY FIX
            if (serializedData.image && !serializedData.images) {
                serializedData.images = serializedData.image; // singular to plural?
            } else if (Array.isArray(serializedData.images) && serializedData.images.length > 0 && !serializedData.image) {
                const firstImg = serializedData.images[0];
                serializedData.image = (typeof firstImg === 'object' && firstImg.data) ? firstImg.data : firstImg;
            }

            // Map project metadata if exists
            if (serializedData.projectArea) {
                serializedData.location = serializedData.projectArea;
            }
        } else if (id) {
            serializedData.id = id.toString();
        }

        // Handle images/arrays -> JSON String
        if (Array.isArray(serializedData.images)) {
            serializedData.images = JSON.stringify(serializedData.images);
        }
        if (typeof serializedData.amenities === 'object' && serializedData.amenities !== null) serializedData.amenities = JSON.stringify(serializedData.amenities);
        if (typeof serializedData.features === 'object' && serializedData.features !== null) serializedData.features = JSON.stringify(serializedData.features);
        if (typeof serializedData.auto_specs === 'object' && serializedData.auto_specs !== null) serializedData.auto_specs = JSON.stringify(serializedData.auto_specs);
        if (typeof serializedData.specifications === 'object' && serializedData.specifications !== null) serializedData.specifications = JSON.stringify(serializedData.specifications);

        // Clean Timestamps (Firebase ServerValue -> Date)
        Object.keys(serializedData).forEach(key => {
            if (serializedData[key] && typeof serializedData[key] === 'object' && serializedData[key]._methodName === 'serverTimestamp') {
                serializedData[key] = new Date().toISOString();
            }
        });

        const resp = await withTimeout(fetch(`${window.CLOUDFLARE_WORKER_URL}/api`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.AUTH_KEY}`
            },
            body: JSON.stringify({ action, table, id, data: serializedData })
        }), 15000, 'Cloudflare Sync');

        if (resp.ok) {
            const result = await resp.json();
            console.log(`✅ Cloudflare Sync Success: ${table} ${id}`, result);
            return result;
        } else {
            let errorDetail = await resp.text();
            try {
                const errorJson = JSON.parse(errorDetail);
                if (errorJson.error) errorDetail = errorJson.error;
            } catch (e) { }

            console.warn(`⚠️ Cloudflare Sync Failed for ${table}:`, errorDetail);
            return { success: false, error: errorDetail };
        }
    } catch (e) {
        console.error(`❌ Cloudflare Sync Network/Logic Error:`, e);
        return { success: false, error: e.message };
    }
}

/**
 * Global Cloudflare Storage Helper (R2 via Worker)
 */
async function uploadToCloudflare(fileData, fileName, type = 'unit') {
    try {
        console.log(`📤 [Cloudflare Storage] Uploading ${fileName}...`);

        const resp = await withTimeout(fetch(`${window.CLOUDFLARE_WORKER_URL}/api`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.AUTH_KEY}`
            },
            body: JSON.stringify({
                action: 'UPLOAD',
                table: 'storage',
                data: {
                    fileName: `${type}_${Date.now()}_${fileName.replace(/\s+/g, '_')}`,
                    fileData: fileData, // Base64 content
                    contentType: 'image/jpeg'
                }
            })
        }), 20000, 'Cloudflare Upload');

        if (resp.ok) {
            const result = await resp.json();
            console.log(`✅ Cloudflare Storage Success: ${result.url}`);
            return result.url;
        } else {
            console.warn(`⚠️ Cloudflare Storage Failed:`, await resp.text());
            return null;
        }
    } catch (e) {
        console.error(`❌ Cloudflare Storage Error:`, e);
        // Fallback: If upload fails but we have the base64, we can potentially return it 
        // but the current architecture expects a URL from the worker.
        return null;
    }
}

// ============================================================================
// LOGGING SYSTEM (Stubs: Can be redirected to D1 later if needed)
// ============================================================================

async function logActivity(action, details, user = 'Admin') {
    console.log(`📝 [Activity Log] ${action}`, details, user);
    // Future: POST to /api/logs if required
}

// ============================================================================
// PROJECT MANAGEMENT
// ============================================================================

async function createProject(projectData) {
    try {
        const projectId = projectData.id || projectData.name.toLowerCase().replace(/\s+/g, '-');
        const newProject = {
            id: projectId,
            name: projectData.name,
            status: projectData.status || 'buy',
            images: projectData.images || []
        };
        const result = await syncToCloudflare('projects', 'UPSERT', projectId, newProject);
        if (!result || !result.success) throw new Error("Failed to create project on Cloudflare");
        await logActivity('CREATE_PROJECT', { projectId, name: projectData.name });
        return projectId;
    } catch (error) {
        console.error('Error creating project:', error);
        throw error;
    }
}

async function updateProject(projectId, updates) {
    try {
        const result = await syncToCloudflare('projects', 'UPSERT', projectId, updates);
        if (!result || !result.success) throw new Error("Failed to update project on Cloudflare");
        await logActivity('UPDATE_PROJECT', { projectId, updates: Object.keys(updates) });
    } catch (error) {
        console.error('Error updating project:', error);
        throw error;
    }
}

async function deleteProject(projectId, isBuilding = false) {
    try {
        const table = isBuilding ? 'buildings' : 'projects';
        const result = await syncToCloudflare(table, 'DELETE', projectId);
        if (!result || !result.success) throw new Error(`Failed to delete ${isBuilding ? 'building' : 'project'} on Cloudflare`);
        await logActivity(isBuilding ? 'DELETE_BUILDING' : 'DELETE_PROJECT', { projectId });
    } catch (error) {
        console.error('Error deleting project/building:', error);
        throw error;
    }
}

// ============================================================================
// BUILDING MANAGEMENT
// ============================================================================

async function createBuilding(buildingData) {
    try {
        const bCodeRaw = buildingData.code || buildingData.id || '';
        const bNum = bCodeRaw.toString().replace(/\D/g, '');
        const buildingId = `B${bNum}`; // Use Uppercase 'B' always

        const newBuilding = {
            id: buildingId,
            code: buildingId, // Standardize code to match ID
            name: buildingData.name || `Building ${buildingId}`,
            project_id: buildingData.projectId || buildingData.project_id,
            project_name: buildingData.projectName || buildingData.project_name,
            location: buildingData.location || buildingData.projectName || buildingData.project_name,
            delivery: buildingData.delivery || 'TBA',
            const_status: buildingData.constStatus || 'Planned',
            status: buildingData.status || 'buy',
            images: buildingData.images || []
        };
        const result = await syncToCloudflare('buildings', 'UPSERT', buildingId, newBuilding);
        if (!result || !result.success) throw new Error("Failed to create building on Cloudflare");
        await logActivity('CREATE_BUILDING', { buildingId, code: buildingData.code });
        return buildingId;
    } catch (error) {
        console.error('Error creating building:', error);
        throw error;
    }
}

async function updateBuilding(buildingId, updates) {
    try {
        const result = await syncToCloudflare('buildings', 'UPSERT', buildingId, updates);
        if (!result || !result.success) throw new Error("Failed to update building on Cloudflare");
        await logActivity('UPDATE_BUILDING', { buildingId, updates: Object.keys(updates) });
    } catch (error) {
        console.error('Error updating building:', error);
        throw error;
    }
}

async function deleteBuilding(buildingId) {
    try {
        const result = await syncToCloudflare('buildings', 'DELETE', buildingId);
        if (!result || !result.success) throw new Error("Failed to delete building on Cloudflare");
        await logActivity('DELETE_BUILDING', { buildingId });
    } catch (error) {
        console.error('Error deleting building:', error);
        throw error;
    }
}

// ============================================================================
// UNIT MANAGEMENT
// ============================================================================

async function createUnit(unitData) {
    try {
        // 1. Resolve Building Code (e.g., B133)
        let bCode = unitData.buildingId || unitData.building_id || unitData.project || 'unknown';
        if (/^\d+$/.test(bCode)) bCode = 'B' + bCode;
        if (typeof bCode === 'string' && bCode.toLowerCase().startsWith('b')) {
            bCode = 'B' + bCode.substring(1); // Standardize to Uppercase 'B'
        }

        // 🔍 CRITICAL: Search for existing unit by code + building (prevents duplicates from different ID formats)
        let existingUnitId = null;
        try {
            // Speed optimization: Fetch only units for the target building, and add a timeout
            const queryUrl = `${window.CLOUDFLARE_WORKER_URL}/api/units?buildingId=${encodeURIComponent(bCode)}`;
            const allUnits = await withTimeout(
                fetch(queryUrl).then(r => r.json()),
                5000,
                'Duplicate Check'
            );

            const targetCode = (unitData.code || '').toString().trim().toUpperCase();
            const targetBuilding = bCode.toUpperCase();

            const existing = allUnits.find(u => {
                const uCode = (u.code || '').toString().trim().toUpperCase();
                const uBuilding = (u.building_id || u.buildingId || '').toString().trim().toUpperCase();
                return (uCode === targetCode) && (uBuilding === targetBuilding);
            });

            if (existing) {
                existingUnitId = existing.unit_id || existing.id;
                console.log(`♻️ Found existing unit: ${existingUnitId} (will UPDATE instead of creating duplicate)`);
            }
        } catch (e) {
            console.warn('⚠️ Could not check for existing units (timeout or error):', e.message);
        }

        // 2. Resolve Unit ID (Priority: existing > unitData.id > generated)
        const unitId = existingUnitId || unitData.id || unitData.unit_id || `unit_${bCode}_${unitData.code}`;
        const newUnit = {
            unit_id: unitId,
            code: unitData.code,
            building_id: bCode, // ✅ Use normalized building code
            project_id: unitData.projectId || unitData.project_id || bCode,
            floor: unitData.floor,
            area: parseInt(unitData.area) || 0,
            net_area: parseInt(unitData.net_area) || null,
            garden_area: parseInt(unitData.garden_area) || null,
            view: unitData.view,
            price: parseInt(unitData.price) || 0,
            purpose: unitData.purpose || unitData.intent || 'Buy',
            payment_plan: unitData.paymentPlan || unitData.payment_plan,
            specifications: unitData.specifications ? (typeof unitData.specifications === 'object' ? JSON.stringify(unitData.specifications) : unitData.specifications) : null,
            status: unitData.status || 'Available',
            images: unitData.images || [],
            auto_specs: unitData.auto_specs || {}
        };

        // --- 🎯 UNIFIED SYSTEM SPECIFICATIONS (STRICT RULES) ---
        const areaVal = Number(newUnit.area) || 0;
        const bKey = (newUnit.building_id || '').toUpperCase().trim();
        const pKey = (newUnit.project_id || '').toLowerCase().trim();

        let specs = { bedrooms: 1, bathrooms: 1, kitchen: true };
        const isGolf = pKey.includes('golf') || ['B133', 'B136', 'B121', 'B230', 'B243', 'B78', 'B224'].includes(bKey);
        const isB15 = bKey === 'B15' || bKey === '15';
        const isB33 = bKey === 'B33' || bKey === '33';

        if (isGolf) {
            if (Math.abs(areaVal - 30) <= 2) specs = { bedrooms: 1, bathrooms: 1, kitchen: true, type: 'Studio' };
            else if (Math.abs(areaVal - 60) <= 2) specs = { bedrooms: 1, bathrooms: 2, living_area: true, kitchen: true, type: 'Apartment' };
            else if (Math.abs(areaVal - 82) <= 2) specs = { bedrooms: 1, bathrooms: 2, living_area: true, kitchen: true, dining_area: true, type: 'Apartment' };
            else if (Math.abs(areaVal - 90) <= 5) specs = { bedrooms: 2, bathrooms: 2, living_area: true, kitchen: true, type: 'Apartment' };
        } else if (isB15) {
            if ([41, 47].includes(areaVal) || (areaVal >= 40 && areaVal <= 48)) specs = { bedrooms: 0, bathrooms: 1, kitchen: true, type: 'Studio' };
            else if ([69, 72].includes(areaVal) || (areaVal >= 68 && areaVal <= 73)) specs = { bedrooms: 1, bathrooms: 1, living_area: true, kitchen: true, type: 'Apartment' };
            else if ([90, 107].includes(areaVal) || (areaVal >= 89 && areaVal <= 108)) specs = { bedrooms: 2, bathrooms: 2, living_area: true, kitchen: true, type: 'Apartment' };
            else if (areaVal >= 160) specs = { bedrooms: 3, bathrooms: 2, living_area: true, kitchen: true, type: 'Family Apartment' };
        } else if (isB33) {
            if (areaVal >= 30 && areaVal <= 59) specs = { bedrooms: 0, bathrooms: 1, kitchen: true, type: 'Studio' };
            else if (areaVal >= 60 && areaVal <= 75) specs = { bedrooms: 1, bathrooms: 1, living_area: true, kitchen: true, type: 'Junior 1 Bedroom' };
            else if (areaVal >= 76 && areaVal <= 95) specs = { bedrooms: 1, bathrooms: 1, living_area: true, kitchen: true, type: 'Apartment' };
            else if (areaVal >= 96 && areaVal <= 120) specs = { bedrooms: 2, bathrooms: 2, living_area: true, kitchen: true, type: 'Apartment' };
            else if (areaVal >= 121 && areaVal <= 150) specs = { bedrooms: 3, bathrooms: 2, living_area: true, kitchen: true, type: 'Family Apartment' };
        }

        // Apply Specs to single column as JSON
        if (specs) {
            newUnit.specifications = JSON.stringify(specs);
        }

        // --- GROUND FLOOR GARDEN RULE ---
        const rawFloor = (newUnit.floor || '').toString().toLowerCase();
        if (rawFloor.includes('ground') || rawFloor.includes('0') || rawFloor === 'gf' || rawFloor === 'g') {
            if (typeof newUnit.specifications === 'string') {
                try { specs = JSON.parse(newUnit.specifications); } catch (e) { specs = specs || {}; }
            } else {
                specs = specs || {};
            }
            specs.garden = true;
            specs.garden_desc = "Private Garden";
            newUnit.specifications = JSON.stringify(specs);
        }

        console.log(`📤 Sending Unit ${unitId} to Cloudflare (Images: ${newUnit.images.length})`);

        const result = await syncToCloudflare('units', 'UPSERT', unitId, newUnit);

        if (!result || result.success === false) {
            throw new Error(result?.error || "Worker returned error or invalid response");
        }

        await logActivity('CREATE_UNIT', { unitId, code: unitData.code });
        return unitId;
    } catch (error) {
        console.error('Error creating unit:', error);
        throw error;
    }
}

async function updateUnit(unitId, updates) {
    try {
        // Map common frontend fields to D1 underscore format
        const mappedUpdates = { ...updates };
        if (mappedUpdates.buildingId) { mappedUpdates.building_id = mappedUpdates.buildingId; delete mappedUpdates.buildingId; }
        if (mappedUpdates.projectId) { mappedUpdates.project_id = mappedUpdates.projectId; delete mappedUpdates.projectId; }
        if (mappedUpdates.paymentPlan) { mappedUpdates.payment_plan = mappedUpdates.paymentPlan; delete mappedUpdates.paymentPlan; }
        if (mappedUpdates.intent) { mappedUpdates.purpose = mappedUpdates.intent; delete mappedUpdates.intent; }
        if (mappedUpdates.specifications) {
            mappedUpdates.specifications = typeof mappedUpdates.specifications === 'object' ? JSON.stringify(mappedUpdates.specifications) : mappedUpdates.specifications;
        }
        if (mappedUpdates.netArea) { mappedUpdates.net_area = mappedUpdates.netArea; delete mappedUpdates.netArea; }
        if (mappedUpdates.gardenArea) { mappedUpdates.garden_area = mappedUpdates.gardenArea; delete mappedUpdates.gardenArea; }

        // --- 🎯 UNIFIED SYSTEM SPECIFICATIONS (STRICT RULES) ---
        const areaVal = Number(mappedUpdates.area || mappedUpdates.areaVal || 0);
        const bKey = (mappedUpdates.building_id || mappedUpdates.buildingId || '').toUpperCase().trim();
        const pKey = (mappedUpdates.project_id || mappedUpdates.project || '').toLowerCase().trim();

        // Always attempt to set specs if we are updating area/project or if specs are missing
        let specs = { bedrooms: 1, bathrooms: 1, kitchen: true };
        const isGolf = pKey.includes('golf') || ['B133', 'B136', 'B121', 'B230', 'B243', 'B78', 'B224', '133', '136', '121', '230', '243', '78', '224'].includes(bKey);
        const isB15 = bKey === 'B15' || bKey === '15';
        const isB33 = bKey === 'B33' || bKey === '33';

        if (isGolf) {
            if (Math.abs(areaVal - 30) <= 2) specs = { bedrooms: 1, bathrooms: 1, kitchen: true, type: 'Studio' };
            else if (Math.abs(areaVal - 60) <= 2) specs = { bedrooms: 1, bathrooms: 2, living_area: true, kitchen: true, type: 'Apartment' };
            else if (Math.abs(areaVal - 82) <= 2) specs = { bedrooms: 1, bathrooms: 2, living_area: true, kitchen: true, dining_area: true, type: 'Apartment' };
            else if (Math.abs(areaVal - 90) <= 5) specs = { bedrooms: 2, bathrooms: 2, living_area: true, kitchen: true, type: 'Apartment' };
        } else if (isB15) {
            if ([41, 47].includes(areaVal) || (areaVal >= 40 && areaVal <= 48)) specs = { bedrooms: 0, bathrooms: 1, kitchen: true, type: 'Studio' };
            else if ([69, 72].includes(areaVal) || (areaVal >= 68 && areaVal <= 73)) specs = { bedrooms: 1, bathrooms: 1, living_area: true, kitchen: true, type: 'Apartment' };
            else if ([90, 107].includes(areaVal) || (areaVal >= 89 && areaVal <= 108)) specs = { bedrooms: 2, bathrooms: 2, living_area: true, kitchen: true, type: 'Apartment' };
            else if (areaVal >= 160) specs = { bedrooms: 3, bathrooms: 2, living_area: true, kitchen: true, type: 'Family Apartment' };
        } else if (isB33) {
            if (areaVal >= 30 && areaVal <= 59) specs = { bedrooms: 0, bathrooms: 1, kitchen: true, type: 'Studio' };
            else if (areaVal >= 60 && areaVal <= 75) specs = { bedrooms: 1, bathrooms: 1, living_area: true, kitchen: true, type: 'Junior 1 Bedroom' };
            else if (areaVal >= 76 && areaVal <= 95) specs = { bedrooms: 1, bathrooms: 1, living_area: true, kitchen: true, type: 'Apartment' };
            else if (areaVal >= 96 && areaVal <= 120) specs = { bedrooms: 2, bathrooms: 2, living_area: true, kitchen: true, type: 'Apartment' };
            else if (areaVal >= 121 && areaVal <= 150) specs = { bedrooms: 3, bathrooms: 2, living_area: true, kitchen: true, type: 'Family Apartment' };
        }

        // Always stringify for the database (Redundancy: sync to both columns)
        const specsStr = JSON.stringify(specs);
        mappedUpdates.specifications = specsStr;
        mappedUpdates.auto_specs = specsStr;

        const result = await syncToCloudflare('units', 'UPSERT', unitId, mappedUpdates);
        if (!result || !result.success) throw new Error("Failed to update unit on Cloudflare");
        await logActivity('UPDATE_UNIT', { unitId, updates: Object.keys(updates) });
    } catch (error) {
        console.error('Error updating unit:', error);
        throw error;
    }
}

async function deleteUnit(unitId) {
    try {
        const result = await syncToCloudflare('units', 'DELETE', unitId);
        if (!result || !result.success) throw new Error("Failed to delete unit from Cloudflare");
        await logActivity('DELETE_UNIT', { unitId });
    } catch (error) {
        console.error('Error deleting unit:', error);
        throw error;
    }
}

// ============================================================================
// BATCH OPERATIONS
// ============================================================================

/**
 * Update unit status in batch
 * @param {Array<string>} unitIds - Array of unit IDs
 * @param {string} newStatus - New status
 * @returns {Promise<void>}
 */
async function batchUpdateUnitStatus(unitIds, newStatus) {
    try {
        console.log(`🚀 Batch updating ${unitIds.length} units to ${newStatus}...`);

        // Chunking to avoid rate limits
        const chunkSize = 5;
        for (let i = 0; i < unitIds.length; i += chunkSize) {
            const chunk = unitIds.slice(i, i + chunkSize);
            await Promise.all(chunk.map(unitId =>
                syncToCloudflare('units', 'UPSERT', unitId, {
                    status: newStatus,
                    updatedAt: new Date().toISOString()
                })
            ));
        }

        await logActivity('BATCH_UPDATE_STATUS', { count: unitIds.length, newStatus });
        console.log(`✅ Batch updated ${unitIds.length} units to ${newStatus}`);

    } catch (error) {
        console.error('Error in batch update:', error);
        throw error;
    }
}

/**
 * Deduplicate Units (Cleanup Tool)
 * Finds units with same code + building but different IDs
 */
async function deduplicateUnits() {
    try {
        console.log("🧹 Starting Unit Deduplication...");
        const response = await fetch(`${window.CLOUDFLARE_WORKER_URL}/api/units`);
        if (!response.ok) throw new Error("Failed to fetch units");
        const units = await response.json();

        const groups = {};
        units.forEach(u => {
            // Use global normalizeId if available, fallback to basic logic
            const norm = (window.normalizeId) ? window.normalizeId : (id) => id.toString().trim().toUpperCase().replace(/^B/i, '');

            const bId = norm(u.building_id || u.buildingId || '');
            const code = (u.code || '').toString().trim().toUpperCase();

            const key = `${bId}_${code}`;
            if (!groups[key]) groups[key] = [];
            groups[key].push(u);
        });

        const toDelete = [];
        const toUpdate = [];

        Object.values(groups).forEach(group => {
            if (group.length > 1) {
                // Keep the one with images, or the one with the 'unit_' prefix if both have images
                const sorted = group.sort((a, b) => {
                    const parseImgs = (val) => {
                        if (!val) return [];
                        if (Array.isArray(val)) return val;
                        try { return JSON.parse(val); } catch (e) { return []; }
                    };
                    const aHasImg = parseImgs(a.images).length > 0;
                    const bHasImg = parseImgs(b.images).length > 0;
                    if (aHasImg && !bHasImg) return -1;
                    if (!aHasImg && bHasImg) return 1;
                    // Prefer unit_B format if both same
                    if (a.unit_id?.startsWith('unit_') && !b.unit_id?.startsWith('unit_')) return -1;
                    return 0;
                });

                const winner = sorted[0];
                const losers = sorted.slice(1);
                losers.forEach(loser => {
                    toDelete.push(loser.unit_id || loser.id);
                });
                console.log(`♻️  Duplicate Found: [Building: ${winner.building_id}, Code: ${winner.code}]. Keeping ID: ${winner.unit_id || winner.id} (Has Images: ${parseImgs(winner.images).length > 0}). Deleting ${losers.length} duplicate(s).`);
            }
        });

        if (toDelete.length > 0) {
            if (!confirm(`Found ${toDelete.length} duplicate units. Do you want to delete them?`)) return;

            const toast = document.createElement('div');
            toast.style.cssText = "position:fixed; top:20px; left:20px; background:#f59e0b; color:white; padding:15px; border-radius:8px; z-index:9999; font-family:sans-serif; font-weight:bold; box-shadow:0 4px 12px rgba(0,0,0,0.3);";
            toast.innerHTML = `<i class="fas fa-broom fa-spin"></i> Cleaning: 0/${toDelete.length}...`;
            document.body.appendChild(toast);

            for (let i = 0; i < toDelete.length; i++) {
                await deleteUnit(toDelete[i]);
                toast.innerHTML = `<i class="fas fa-broom fa-spin"></i> Cleaning: ${i + 1}/${toDelete.length}...`;
            }

            toast.style.background = "#10b981";
            toast.innerHTML = `<i class="fas fa-check-circle"></i> Cleaned ${toDelete.length} duplicates!`;
            setTimeout(() => { toast.remove(); window.location.reload(); }, 2000);
        } else {
            alert("No duplicates found.");
        }
    } catch (e) {
        console.error("Deduplication failed:", e);
    }
}

/**
 * Standardize Unit IDs (Convert all to unit_B{building}_{code} format)
 */
async function standardizeUnitIDs() {
    try {
        console.log("🔧 Starting Unit ID Standardization...");
        const response = await fetch(`${window.CLOUDFLARE_WORKER_URL}/api/units`);
        if (!response.ok) throw new Error("Failed to fetch units");
        const units = await response.json();

        const toUpdate = [];

        units.forEach(u => {
            const currentId = u.unit_id || u.id;

            // Normalize building ID
            let bCode = u.building_id || u.buildingId || '';
            if (/^\d+$/.test(bCode)) bCode = 'B' + bCode;
            if (typeof bCode === 'string' && bCode.toLowerCase().startsWith('b')) {
                bCode = 'B' + bCode.substring(1);
            }

            // Generate standard ID format
            const code = (u.code || '').toString().trim();
            const standardId = `unit_${bCode}_${code}`;

            // Check if conversion needed
            if (currentId !== standardId && code) {
                toUpdate.push({
                    oldId: currentId,
                    newId: standardId,
                    unit: u
                });
            }
        });

        if (toUpdate.length === 0) {
            alert("✅ All unit IDs are already standardized!");
            return;
        }

        const msg = `Found ${toUpdate.length} units with non-standard IDs.\n\nExamples:\n` +
            toUpdate.slice(0, 3).map(item => `• ${item.oldId} → ${item.newId}`).join('\n') +
            `\n\nDo you want to standardize all IDs?`;

        if (!confirm(msg)) return;

        const toast = document.createElement('div');
        toast.style.cssText = "position:fixed; top:20px; left:20px; background:#3b82f6; color:white; padding:15px; border-radius:8px; z-index:9999; font-family:sans-serif; font-weight:bold; box-shadow:0 4px 12px rgba(0,0,0,0.3);";
        toast.innerHTML = `<i class="fas fa-sync fa-spin"></i> Standardizing: 0/${toUpdate.length}...`;
        document.body.appendChild(toast);

        for (let i = 0; i < toUpdate.length; i++) {
            const item = toUpdate[i];

            // Delete old ID
            await deleteUnit(item.oldId);

            // Create with new ID
            const unitData = {
                ...item.unit,
                id: item.newId,
                unit_id: item.newId
            };
            await createUnit(unitData);

            toast.innerHTML = `<i class="fas fa-sync fa-spin"></i> Standardizing: ${i + 1}/${toUpdate.length}...`;
        }

        toast.style.background = "#10b981";
        toast.innerHTML = `<i class="fas fa-check-circle"></i> Standardized ${toUpdate.length} unit IDs!`;
        setTimeout(() => { toast.remove(); window.location.reload(); }, 2000);
    } catch (e) {
        console.error("ID Standardization failed:", e);
        alert("❌ Error: " + e.message);
    }
}

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

/**
 * Fix Unit Purposes (Batch Update 'Sale' -> 'Buy')
 */
async function fixUnitPurposes() {
    try {
        console.log("🔧 Starting Unit Purpose Fix (Standardizing to 'Buy')...");
        const response = await fetch(`${window.CLOUDFLARE_WORKER_URL}/api/units`);
        if (!response.ok) throw new Error("Failed to fetch units");

        const units = await response.json();
        // Aggressive Filter: Fix ANYTHING that is not exactly 'Buy' or 'Rent'
        const toFix = units.filter(u => !u.purpose || (u.purpose !== 'Buy' && u.purpose !== 'Rent'));
        if (toFix.length > 0) {
            console.log(`⚠️ STARTING CRITICAL DATABASE FIX: ${toFix.length} units found with legacy labels.`);

            // Show a non-blocking toast/notification
            const toast = document.createElement('div');
            toast.style.cssText = "position:fixed; bottom:20px; right:20px; background:#ef4444; color:white; padding:15px; border-radius:8px; z-index:9999; font-family:sans-serif; font-weight:bold; box-shadow:0 4px 12px rgba(0,0,0,0.3);";
            toast.innerHTML = `<i class="fas fa-cog fa-spin"></i> Fixing Database: 0/${toFix.length} units...`;
            document.body.appendChild(toast);

            const chunkSize = 5;
            let processed = 0;

            for (let i = 0; i < toFix.length; i += chunkSize) {
                const chunk = toFix.slice(i, i + chunkSize);
                await Promise.all(chunk.map(unit =>
                    syncToCloudflare('units', 'UPSERT', unit.unit_id || unit.id, {
                        purpose: 'Buy'
                    })
                ));
                processed += chunk.length;
                toast.innerHTML = `<i class="fas fa-cog fa-spin"></i> Fixing Database: ${processed}/${toFix.length} units...`;
                console.log(`✅ Processed ${processed} / ${toFix.length}`);
            }

            toast.style.background = "#10b981";
            toast.innerHTML = `<i class="fas fa-check-circle"></i> Database Fixed! Refreshing...`;

            setTimeout(() => {
                toast.remove();
                window.location.reload(); // Force reload to show correct data
            }, 1000);
        } else {
            console.log("✅ Database Integrity Verified: All units are correctly set to 'Buy'.");
        }
    } catch (e) {
        console.error("Fix failed:", e);
    }
}

/**
 * Repair Missing Specifications (NULL Fix)
 */
async function repairSpecifications() {
    try {
        console.log("🛠️ Starting Specifications Repair...");
        const response = await fetch(`${window.CLOUDFLARE_WORKER_URL}/api/units`);
        if (!response.ok) throw new Error("Failed to fetch units");
        const units = await response.json();

        // Filter units with missing or explicitly NULL specifications (checks both columns)
        const toFix = units.filter(u => {
            const hasSpecs = u.specifications && u.specifications !== 'NULL' && u.specifications !== 'null' && u.specifications !== '{}' && u.specifications !== '';
            const hasAuto = u.auto_specs && u.auto_specs !== 'NULL' && u.auto_specs !== 'null' && u.auto_specs !== '{}' && u.auto_specs !== '';
            return !hasSpecs || !hasAuto;
        });

        if (toFix.length > 0) {
            console.log(`⚠️ REPAIRING ${toFix.length} units with NULL specifications...`);

            const toast = document.createElement('div');
            toast.style.cssText = "position:fixed; top:20px; left:20px; background:#3b82f6; color:white; padding:15px; border-radius:8px; z-index:9999; font-family:sans-serif; font-weight:bold; box-shadow:0 4px 12px rgba(0,0,0,0.3);";
            toast.innerHTML = `<i class="fas fa-tools fa-spin"></i> Repairing Specs: 0/${toFix.length}...`;
            document.body.appendChild(toast);

            const chunkSize = 5;
            let processed = 0;

            for (let i = 0; i < toFix.length; i += chunkSize) {
                const chunk = toFix.slice(i, i + chunkSize);
                await Promise.all(chunk.map(u => {
                    const area = parseFloat(u.area) || 0;
                    const bId = (u.building_id || u.buildingId || '').toString();
                    const pId = (u.project_id || u.projectId || '').toString().toLowerCase();

                    // Smart Logic based on Project context
                    let bedrooms = 1;
                    let bathrooms = 1;

                    if (pId.includes('said') || bId.startsWith('15')) {
                        bedrooms = area < 51 ? 1 : (area < 96 ? 1 : (area < 121 ? 2 : 3));
                        bathrooms = area < 96 ? 1 : 2;
                    } else if (pId.includes('golf') || bId.startsWith('133') || bId.startsWith('121') || bId.startsWith('243')) {
                        // Golf Marina has different thresholds (e.g. 90m is 2BR)
                        bedrooms = area < 50 ? 1 : (area < 80 ? 1 : (area < 121 ? 2 : 3));
                        bathrooms = area < 90 ? 1 : 2;
                    } else {
                        bedrooms = area < 52 ? 1 : (area < 96 ? 1 : (area < 121 ? 2 : 3));
                        bathrooms = area < 96 ? 1 : 2;
                    }

                    const specs = {
                        bedrooms,
                        bathrooms,
                        kitchen: true,
                        living: true
                    };

                    // --- Ground Floor Garden Rule ---
                    const flNum = parseInt(u.floor);
                    if (u.floor === "0" || flNum === 0 || u.floor === "Ground") {
                        specs.garden = true;
                        specs.garden_desc = "Private Garden";
                    }

                    return syncToCloudflare('units', 'UPSERT', u.unit_id || u.id, {
                        specifications: specs,
                        auto_specs: specs
                    });
                }));
                processed += chunk.length;
                toast.innerHTML = `<i class="fas fa-tools fa-spin"></i> Repairing Specs: ${processed}/${toFix.length}...`;
            }

            toast.style.background = "#10b981";
            toast.innerHTML = `<i class="fas fa-check-circle"></i> Specifications Repaired!`;
            setTimeout(() => toast.remove(), 2000);
        } else {
            console.log("✅ All units have valid specifications.");
        }
    } catch (e) {
        console.error("Repair failed:", e);
    }
}

/**
 * WIPE ALL UNITS (Danger Zone)
 * Deletes ALL units from the Cloudflare database.
 */
async function wipeAllUnits() {
    if (!confirm("⚠️ CRITICAL WARNING ⚠️\n\nAre you sure you want to DELETE ALL UNITS?\n\nThis action cannot be undone and will remove every unit from the database.")) return;

    if (!confirm("Final Confirmation: Type OK to wipe the database.")) return;

    try {
        console.log("⚠️ TRIGGERING GLOBAL UNIT WIPE...");

        // Show loading state
        const btn = document.activeElement;
        if (btn && btn.tagName === 'BUTTON') {
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> WIPING...';
        }

        const resp = await fetch(`${window.CLOUDFLARE_WORKER_URL}/api`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${window.AUTH_KEY}`
            },
            body: JSON.stringify({ action: 'WIPE_UNITS' })
        });

        if (resp.ok) {
            console.log("✅ WIPE SUCCESSFUL");
            alert("✅ Database Wiped Successfully!");
            window.location.reload();
            return true;
        } else {
            const err = await resp.text();
            console.error("❌ WIPE FAILED:", err);
            alert("❌ Wipe Failed: " + err);
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-bomb"></i> TRY AGAIN';
            }
            return false;
        }
    } catch (e) {
        console.error("❌ WIPE ERROR:", e);
        alert("Error: " + e.message);
        return false;
    }
}


// Auto-run on load if contained in admin context - REMOVED PER USER REQUEST
// if (typeof window !== 'undefined') {
//     // Wait for DOM
//     setTimeout(async () => {
//         if (window.location.pathname.includes('admin') || document.getElementById('sys-cfg-2026')) {
//             console.log("🛡️ Admin Context Detected: Running Database Integrity Checks...");
//             await fixUnitPurposes();
//             await repairSpecifications();
//         }
//     }, 2000);
// }

if (typeof window !== 'undefined') {
    window.robelAdminAPI = {
        // Logging
        logActivity,

        // Projects
        createProject,
        updateProject,
        deleteProject,

        // Buildings
        createBuilding,
        updateBuilding,
        deleteBuilding,

        // Units
        createUnit,
        updateUnit,
        deleteUnit,

        // Cloudflare
        syncToCloudflare,
        uploadToCloudflare,

        // Batch
        batchUpdateUnitStatus,

        // Maintenance
        fixUnitPurposes,
        repairSpecifications,
        deduplicateUnits,
        standardizeUnitIDs,
        wipeAllUnits
    };

    // console.log('✅ Admin API (Cloudflare) loaded with Maintenance Tools');
}
