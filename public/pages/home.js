/* ==========================================================================
   ROBEL REAL ESTATE - MAIN SCRIPT
   ========================================================================== */

// Ensure Cloudflare API constants are available globally
// (these will be set by firebase-queries.js)
window.CLOUDFLARE_WORKER_URL = window.CLOUDFLARE_WORKER_URL || "https://robel-api.george-gamal139.workers.dev";
window.AUTH_KEY = window.AUTH_KEY || "G792001";

// @region 1. L10N & CONFIG



// --- Localization Data ---
/**
 * REALTOR SYSTEM - MAIN LOGIC
 * Translation data is managed in js/translations.js
 */

// Helper to normalize IDs (e.g., 121 -> B121)
// Helper to normalize IDs (e.g., 121 -> B121, b121 -> B121)
function normalizeId(id) {
    if (id === null || id === undefined) return "";
    let clean = id.toString().trim().toUpperCase();

    // If it's just numbers, add 'B' (e.g., 133 -> B133)
    if (/^\d+$/.test(clean)) return 'B' + clean;

    // If it already has B, ensure it's uppercase (e.g., b133 -> B133)
    if (clean.startsWith('B')) return clean;

    return clean;
}
window.normalizeId = normalizeId;

// Robust building metadata retriever for unit
function getUnitMetadata(u) {
    if (!u) return null;
    // Check all possible fields for building ID
    const rawId = u.project || u.projectId || u.buildingId || u.buildingCode || u.building || u.Building;
    if (!rawId) return null;
    return projectMetadata[normalizeId(rawId)] || null;
}

// Robust unit matcher for buildings/projects
function isUnitInTarget(u, target) {
    if (!u || !target) return false;
    const targets = Array.isArray(target) ? target.map(t => normalizeId(t)) : [normalizeId(target)];

    // We already normalize fields during transform/sync, so use buildingId directly for speed
    const uB = u.buildingId || normalizeId(u.building_id || u.buildingCode || u.building || u.Building);
    const uP = u.projectId || u.project || '';

    return targets.some(t => {
        return uB === t || uP === t.toLowerCase() || uB.replace(/^B/i, '') === t.replace(/^B/i, '');
    });
}

// Firebase initialization removed as part of Cloudflare migration.
let auth = null, db = null;

let isLoggedIn = false;
let userRole = localStorage.getItem('userRole') || 'guest'; // 'guest', 'user', 'admin'
let currentUser = null;
let isEditingUnit = false;
let editingUnitCode = null;
let editingUnitId = null;

// --- State Management ---
let currentViewMode = 'buildings'; // 'buildings' | 'units'
let selectedProject = null;
window.activeSearchProject = null; // New global for strict search filtering

// Expose these for AdminUI and global access
window.projectMetadata = {
    // Porto Golf Marina Buildings
    "B133": { projectArea: "Porto Golf Marina", delivery: "12/2026", status: "buy", constStatus: "Under Construction", category: "properties", image: ["assets/images/ui/logo-main.png"] },
    "B136": { projectArea: "Porto Golf Marina", delivery: "12/2026", status: "buy", constStatus: "Under Construction", category: "properties", image: ["assets/images/ui/logo-main.png"] },
    "B230": { projectArea: "Porto Golf Marina", delivery: "12/2027", status: "buy", constStatus: "Under Construction", category: "properties", image: ["assets/images/ui/logo-main.png"] },
    "B243": { projectArea: "Porto Golf Marina", delivery: "12/2027", status: "buy", constStatus: "Under Construction", category: "properties", image: ["assets/images/ui/logo-main.png"] },
    "B121": { projectArea: "Porto Golf Marina", delivery: "Ready", status: "buy", constStatus: "Ready", category: "properties", image: ["assets/images/ui/logo-main.png"] },
    "B224": { projectArea: "Porto Golf Marina", delivery: "Ready", status: "buy", constStatus: "Ready", category: "properties", image: ["assets/images/projects/porto-golf-marina/gallery/224.webp"] },
    "B78": { projectArea: "Porto Golf Marina", delivery: "Ready", status: "buy", constStatus: "Ready", category: "properties", image: ["assets/images/projects/porto-golf-marina/gallery/78.webp"] },
    // Porto Said Buildings
    "B15": { projectArea: "Porto Said", delivery: "12/2026", status: "buy", constStatus: "Under Construction", category: "properties", image: ["assets/images/face-main/porto-said-main.webp"] },
    "B16": { projectArea: "Porto Said", delivery: "12/2026", status: "buy", constStatus: "Under Construction", category: "properties", image: ["assets/images/face-main/porto-said-main.webp"] },
    "B17": { projectArea: "Porto Said", delivery: "12/2026", status: "buy", constStatus: "Under Construction", category: "properties", image: ["assets/images/face-main/porto-said-main.webp"] },
    "B33": { projectArea: "Porto Said", delivery: "12/2026", status: "buy", constStatus: "Under Construction", category: "properties", image: ["assets/images/face-main/porto-said-main.webp"] },
    "B9": { projectArea: "Porto Said", delivery: "12/2026", status: "buy", constStatus: "Under Construction", category: "properties", image: ["assets/images/face-main/porto-said-main.webp"] },
    "B10": { projectArea: "Porto Said", delivery: "12/2026", status: "buy", constStatus: "Under Construction", category: "properties", image: ["assets/images/face-main/porto-said-main.webp"] },
    "SHOPS": { projectArea: "Porto Said", delivery: "Ready", status: "buy", constStatus: "Ready", category: "properties", image: ["assets/images/face-main/porto-said-main.webp"] },
    "Celebration": { projectArea: "Celebration", delivery: "1/1/2028", status: "buy", constStatus: "Under Construction", category: "properties", image: ["assets/images/face-main/celebration-main.webp"] }
};
window.projectAreas = ["Porto Golf Marina", "Porto Said", "Celebration"];
window.projectNames = ["B133", "B136", "B230", "B243", "B121", "B224", "B78", "B15", "B16", "B17", "B33", "B9", "B10", "SHOPS", "Celebration"];
window.inventory = [];
window.adminUnitSortOrder = 'asc'; // Global sort persistent state

// Declare these with 'var' to ensure they are available globally and can be aliased
var projectMetadata = window.projectMetadata;
var projectAreas = window.projectAreas;
var projectNames = window.projectNames;
var inventory = window.inventory; // Point to window.inventory early

// Aliases for compatibility with other scripts/diagnostics
window.allUnits = window.inventory;
window.projectDetailPages = {
    "Porto Golf Marina": "porto-golf-marina.html",
    "Porto Said": "porto-said.html",
    "Celebration": "celebration.html"
};


// 🧹 ONE-TIME CLEANUP: Delete old B-SHOPS duplicate from Cloudflare
(function cleanupOldBShops() {
    const alreadyCleaned = localStorage.getItem('bshops_removed_v1');
    if (alreadyCleaned) return;
    setTimeout(async () => {
        try {
            const url = (window.CLOUDFLARE_WORKER_URL || 'https://robel-api.george-gamal139.workers.dev') + '/api/buildings/B-SHOPS';
            const res = await fetch(url, {
                method: 'DELETE',
                headers: { 'Authorization': window.AUTH_KEY || 'G792001' }
            });
            console.log('🧹 B-SHOPS cleanup result:', res.status);
            localStorage.setItem('bshops_removed_v1', '1');
        } catch (e) {
            console.warn('B-SHOPS cleanup skipped:', e.message);
        }
    }, 5000);
})();

// 🏪 ONE-TIME SEEDER: Push SHOPS units to Cloudflare
(function seedShopsToCloudflare() {
    const alreadySeeded = localStorage.getItem('shops_seeded_v1');
    if (alreadySeeded) return;

    const SHOPS_UNITS = [
        { code: "B10S3B", project: "SHOPS", buildingId: "SHOPS", projectId: "Porto Said", price: 6231000, floor: "Ground Floor", view: "No View", area: 67, status: "Available", type: "shop", intent: "buy" },
        { code: "B10S6B", project: "SHOPS", buildingId: "SHOPS", projectId: "Porto Said", price: 6231000, floor: "Ground Floor", view: "No View", area: 67, status: "Available", type: "shop", intent: "buy" },
        { code: "B9S10", project: "SHOPS", buildingId: "SHOPS", projectId: "Porto Said", price: 2766000, floor: "Ground Floor", view: "No View", area: 33, status: "Available", type: "shop", intent: "buy" },
        { code: "B9S11", project: "SHOPS", buildingId: "SHOPS", projectId: "Porto Said", price: 4358000, floor: "Ground Floor", view: "No View", area: 52, status: "Available", type: "shop", intent: "buy" },
        { code: "B9S12", project: "SHOPS", buildingId: "SHOPS", projectId: "Porto Said", price: 4358000, floor: "Ground Floor", view: "No View", area: 52, status: "Available", type: "shop", intent: "buy" },
        { code: "B9S14", project: "SHOPS", buildingId: "SHOPS", projectId: "Porto Said", price: 3101000, floor: "Ground Floor", view: "No View", area: 37, status: "Available", type: "shop", intent: "buy" },
        { code: "B9S15", project: "SHOPS", buildingId: "SHOPS", projectId: "Porto Said", price: 4107000, floor: "Ground Floor", view: "No View", area: 49, status: "Available", type: "shop", intent: "buy" },
        { code: "B9S16", project: "SHOPS", buildingId: "SHOPS", projectId: "Porto Said", price: 5196000, floor: "Ground Floor", view: "No View", area: 62, status: "Available", type: "shop", intent: "buy" },
        { code: "B9S21", project: "SHOPS", buildingId: "SHOPS", projectId: "Porto Said", price: 3612000, floor: "Ground Floor", view: "No View", area: 42, status: "Available", type: "shop", intent: "buy" },
        { code: "B9S22", project: "SHOPS", buildingId: "SHOPS", projectId: "Porto Said", price: 3183000, floor: "Ground Floor", view: "No View", area: 37, status: "Available", type: "shop", intent: "buy" },
        { code: "B9S25", project: "SHOPS", buildingId: "SHOPS", projectId: "Porto Said", price: 4129000, floor: "Ground Floor", view: "No View", area: 48, status: "Available", type: "shop", intent: "buy" },
        { code: "B9S26", project: "SHOPS", buildingId: "SHOPS", projectId: "Porto Said", price: 3183000, floor: "Ground Floor", view: "No View", area: 37, status: "Available", type: "shop", intent: "buy" },
        { code: "B9S27", project: "SHOPS", buildingId: "SHOPS", projectId: "Porto Said", price: 5160000, floor: "Ground Floor", view: "No View", area: 60, status: "Available", type: "shop", intent: "buy" },
        { code: "B9S3", project: "SHOPS", buildingId: "SHOPS", projectId: "Porto Said", price: 4442000, floor: "Ground Floor", view: "No View", area: 53, status: "Available", type: "shop", intent: "buy" },
        { code: "B9S6", project: "SHOPS", buildingId: "SHOPS", projectId: "Porto Said", price: 3269000, floor: "Ground Floor", view: "No View", area: 39, status: "Available", type: "shop", intent: "buy" },
        { code: "B9S7", project: "SHOPS", buildingId: "SHOPS", projectId: "Porto Said", price: 4358000, floor: "Ground Floor", view: "No View", area: 52, status: "Available", type: "shop", intent: "buy" },
    ];

    setTimeout(async () => {
        // Wait for robelAdminAPI to be ready
        const maxWait = 20;
        let waited = 0;
        while (!window.robelAdminAPI && waited < maxWait) {
            await new Promise(r => setTimeout(r, 500));
            waited++;
        }

        if (!window.robelAdminAPI || !window.robelAdminAPI.createUnit) {
            console.warn('🏪 Shop seeder: robelAdminAPI not available, skipping.');
            return;
        }

        console.log('🏪 Seeding 16 SHOPS units to Cloudflare...');

        // First: Ensure the SHOPS building exists in Cloudflare
        try {
            if (window.robelAdminAPI.createBuilding) {
                await window.robelAdminAPI.createBuilding({
                    id: "SHOPS",
                    code: "SHOPS",
                    projectId: "Porto Said",
                    projectName: "Porto Said",
                    delivery: "Ready",
                    constStatus: "Ready",
                    status: "buy",
                    images: []
                });
                console.log('🏪 SHOPS building created in Cloudflare.');
            }
        } catch (e) {
            console.warn('SHOPS building seed skipped (may already exist):', e.message);
        }

        let ok = 0, fail = 0;
        for (const unit of SHOPS_UNITS) {
            try {
                const unitData = {
                    ...unit,
                    id: `unit_SHOPS_${unit.code}`,
                    buildingCode: "SHOPS",
                    payment_plan: "",
                    images: []
                };
                await window.robelAdminAPI.createUnit(unitData);
                ok++;
            } catch (e) {
                console.warn(`Failed to seed ${unit.code}:`, e.message);
                fail++;
            }
        }
        console.log(`🏪 Shop seeding done: ${ok} seeded, ${fail} failed.`);
        if (ok > 0) {
            localStorage.setItem('shops_seeded_v1', '1');
            // Refresh the admin view
            if (typeof window.loadData === 'function') window.loadData(true);
        }
    }, 8000); // wait 8 seconds for API to be ready
})();


window.initUnitImageUpload = function () {
    const dropZone = document.getElementById('image-drop-zone');
    const fileInput = document.getElementById('unit-images-input');
    const imagesGrid = document.getElementById('unit-images-grid');

    if (!dropZone || !fileInput || !imagesGrid) {
        return;
    }

    // Prevent Double Initialization (Fix for Double Uploads)
    if (fileInput.dataset.uploadInitialized === 'true') {
        // console.log("?? [Init] Image upload already initialized. Skipping.");
        return;
    }
    fileInput.dataset.uploadInitialized = 'true';

    // Remove any existing listeners by cloning (Clean Slate)
    const newFileInput = fileInput.cloneNode(true);
    fileInput.parentNode.replaceChild(newFileInput, fileInput);

    // Re-assign reference
    const activeFileInput = newFileInput;

    activeFileInput.addEventListener('change', (e) => {
        if (typeof window.handleUnitFileSelect === 'function') {
            window.handleUnitFileSelect(e);
        } else {
            console.error('handleUnitFileSelect is not defined on window');
        }
    });

    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, (e) => {
            e.preventDefault();
            e.stopPropagation();
        }, false);
    });

    dropZone.addEventListener('drop', (e) => {
        const files = e.dataTransfer.files;
        if (files && files.length) {
            if (typeof window.handleUnitFiles === 'function') {
                window.handleUnitFiles(files);
            } else if (typeof window.handleUnitImages === 'function') {
                window.handleUnitImages(files);
            }
        }
    }, false);
};

window.clearOldCache = function () {
    console.warn("🧹 [STORAGE] LocalStorage is almost full. Purging heavy caches...");

    // Explicit removal of known heavy items
    localStorage.removeItem('cf_cache_buildings');
    localStorage.removeItem('cf_cache_units');
    localStorage.removeItem('robelProjectMetadata'); // Sometimes needed if it has large images

    // Clear ALL cf_cache keys safely
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('cf_cache_')) {
            keysToRemove.push(key);
        }
    }

    keysToRemove.forEach(k => localStorage.removeItem(k));
    console.log(`✅ Cleared ${keysToRemove.length} cache entries.`);

    // Trigger space check
    if (typeof window.checkLocalStorageUsage === 'function') {
        window.checkLocalStorageUsage();
    }
};
// Backward compatibility for existing calls
const clearOldCache = window.clearOldCache;

// Check space on every home load
if (typeof localStorage !== 'undefined') {
    try {
        const used = JSON.stringify(localStorage).length;
        if (used > 4 * 1024 * 1024) { // > 4MB - Almost Full
            clearOldCache();
        }
    } catch (e) { }
}
window.allBuildings = window.projectMetadata;
window.allProjects = window.projectAreas; // Alias for areas/projects list

/**
 * ?? EMERGENCY RECOVERY: MIGRATE FROM LOCAL BROWSER TO CLOUDFLARE
 * Self-contained version to bypass any "Sync service not ready" errors.
 */
window.migrateAllFirebaseToCloudflare = async function () {
    const ghosts = ['B16', 'B17', 'B121', 'B224', 'B78']; // B15 removed - it's a valid building
    const localUnits = (window.inventory || []).filter(u => {
        const bId = normalizeId(u.building_id || u.buildingId);
        return !ghosts.includes(bId);
    });

    if (localUnits.length === 0) {
        alert("?? ??? ?????? ??? ????? ????? ?? ????? ??????? ?????.");
        return;
    }

    const doWipe = confirm(`???? ${localUnits.length} ???? ?????.\n\n?? ???? ??? ??????? ??????? ?? ?????? ????? ????? ?????? ??? 211 ???? ?????? (???? ????)`);

    // ?? ????? ???? ???? ???? ?????
    const progressOverlay = document.createElement('div');
    progressOverlay.id = "migration-overlay";
    progressOverlay.style = "position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.9); z-index:99999; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; font-family:sans-serif; direction:rtl;";
    progressOverlay.innerHTML = `
        <div style="width:80%; max-width:400px; background:#222; height:12px; border-radius:10px; overflow:hidden; border:1px solid #444; margin-bottom:20px;">
            <div id="migration-bar" style="width:0%; height:100%; background:linear-gradient(90deg, #3b82f6, #60a5fa); transition:width 0.1s;"></div>
        </div>
        <h2 id="migration-status" style="margin:0; font-size:1.2rem; font-weight:600;">???? ???????...</h2>
        <p id="migration-count" style="opacity:0.6; margin:10px 0 0 0; font-size:0.9rem;">0 / ${localUnits.length}</p>
        <p style="font-size:0.8rem; margin-top:20px; color:#c9a23f;">???? ??? ????? ?????? ??? ????????</p>
    `;
    document.body.appendChild(progressOverlay);

    try {
        const AUTH = `Bearer G792001`;
        const API_BASE = "https://robel-api.george-gamal139.workers.dev/api";

        // 1. ?????? ???????
        document.getElementById('migration-status').innerText = "???? ?????? ???????...";
        const pingResp = await fetch(API_BASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': AUTH },
            body: JSON.stringify({ action: 'PING' })
        });
        if (!pingResp.ok) throw new Error("???? ?????? ?? ?????? ?? ??????? ????????");

        // 2. ??? ????????
        if (doWipe) {
            document.getElementById('migration-status').innerText = "???? ????? ????? ????????...";
            await fetch(API_BASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': AUTH },
                body: JSON.stringify({ action: 'WIPE_UNITS' })
            });
        }

        let successCount = 0;
        let failCount = 0;
        let lastError = null;

        for (let i = 0; i < localUnits.length; i++) {
            const unit = localUnits[i];
            const unitId = String(unit.code || unit.unit_id || unit.id);

            const percent = Math.round(((i + 1) / localUnits.length) * 100);
            if (document.getElementById('migration-bar')) document.getElementById('migration-bar').style.width = percent + "%";
            if (document.getElementById('migration-status')) document.getElementById('migration-status').innerText = `??? ????: ${unitId}`;
            if (document.getElementById('migration-count')) document.getElementById('migration-count').innerText = `${i + 1} / ${localUnits.length} (${percent}%)`;

            if (!unitId || unitId === "undefined") { failCount++; continue; }

            const dataToSync = { ...unit };
            dataToSync.unit_id = unitId;
            if (dataToSync.buildingId) { dataToSync.building_id = dataToSync.buildingId; delete dataToSync.buildingId; }
            if (dataToSync.projectId) { dataToSync.project_id = dataToSync.projectId; delete dataToSync.projectId; }
            if (dataToSync.images && Array.isArray(dataToSync.images)) dataToSync.images = JSON.stringify(dataToSync.images);
            delete dataToSync.id;

            try {
                const resp = await fetch(API_BASE + "/units", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': AUTH },
                    body: JSON.stringify({ action: 'UPSERT', table: 'units', id: unitId, data: dataToSync })
                });

                if (resp.ok) successCount++;
                else {
                    const errObj = await resp.json();
                    lastError = errObj.error || "??? ?????";
                    failCount++;
                }
            } catch (e) {
                lastError = e.message;
                failCount++;
            }
        }

        progressOverlay.innerHTML = `
        <div style="background:white; color:#333; padding:40px; border-radius:24px; text-align:center; box-shadow:0 20px 40px rgba(0,0,0,0.4); max-width:90%;">
            <div style="font-size:4rem; margin-bottom:20px;">${successCount > 0 ? "?" : "??"}</div>
            <h2 style="margin:0; font-size:1.8rem;">????? ????????</h2>
            <div style="margin:20px 0; text-align:right; border-top:1px solid #eee; padding-top:10px;">
                <p style="color:green;">?? ????? ?????: <b>${successCount}</b></p>
                <p style="color:red;">??? ?????: <b>${failCount}</b></p>
                ${lastError ? `<p style="font-size:0.8rem; color:#888; background:#f9f9f9; padding:5px; border:1px solid #ddd;">??? ???: ${lastError}</p>` : ""}
            </div>
            <button onclick="location.reload()" style="background:#3b82f6; color:white; border:none; padding:14px 30px; border-radius:12px; cursor:pointer; font-size:1.1rem; font-weight:bold; width:100%;">?????</button>
        </div>
    `;
    } catch (error) {
        if (progressOverlay) progressOverlay.remove();
        alert("??? ??? ??? ?????: " + error.message);
    }
};


// --- INSTANT CACHE LOADER (Fix for "0" counters) ---
// --- INSTANT CACHE LOADER (Fix for "0" counters) ---
(async function loadInstantCache() {
    try {
        console.time("?? Cache Load");

        // 1. Try IndexedDB first (Preferred for heavy data)
        let units = await getFromIDB('robel_inventory_backup');

        // 2. Fallback to LocalStorage
        if (!units) {
            const cachedInv = localStorage.getItem('robel_inventory_backup');
            if (cachedInv) {
                try {
                    const parsed = JSON.parse(cachedInv);
                    if (Array.isArray(parsed)) units = parsed;
                } catch (e) { }
            }
        }

        // 3. Load Metadata from IDB
        const idbMeta = await getFromIDB('robel_project_metadata');
        if (idbMeta) {
            window.projectMetadata = { ...window.projectMetadata, ...idbMeta };
            if (typeof projectMetadata !== 'undefined') projectMetadata = window.projectMetadata;
        }

        const idbAreaMeta = await getFromIDB('robel_area_metadata');
        if (idbAreaMeta) {
            window.robelAreaMetadata = idbAreaMeta;
        }

        if (units && Array.isArray(units) && units.length > 0) {
            window.inventory = units;
            window.allUnits = window.inventory;
            if (typeof inventory !== 'undefined') inventory = window.inventory;

            window.ROBEL_DATA = {
                units: window.inventory,
                buildings: window.projectMetadata,
                timestamp: Date.now(),
                source: 'Cache'
            };

            console.log(`??[Instant Cache] Loaded ${units.length} units and metadata.`);

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    if (window.updateGlobalUnitStats) window.updateGlobalUnitStats();
                });
            } else {
                setTimeout(() => {
                    if (window.updateGlobalUnitStats) window.updateGlobalUnitStats();
                }, 50);
            }
        } else {
            console.log("?? No Instant Cache found.");
            window.ROBEL_DATA = { status: 'Waiting for Cloudflare' };
        }
        console.timeEnd("?? Cache Load");
    } catch (e) {
        console.error("Instant Cache Error:", e);
    }
})();

// --- IndexedDB Support (For Heavy Data Caching) ---
const IDB_NAME = 'RobelCacheDB';
const IDB_STORE = 'units';

function initCacheDB() {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) {
                db.createObjectStore(IDB_STORE);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

async function saveToIDB(key, data) {
    try {
        const db = await initCacheDB();
        const tx = db.transaction(IDB_STORE, 'readwrite');
        tx.objectStore(IDB_STORE).put(data, key);
        return new Promise((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    } catch (e) {
        console.warn("IDB Save Failed:", e);
    }
}

async function getFromIDB(key) {
    try {
        const db = await initCacheDB();
        const tx = db.transaction(IDB_STORE, 'readonly');
        const req = tx.objectStore(IDB_STORE).get(key);
        return new Promise((resolve, reject) => {
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    } catch (e) {
        return null;
    }
}

// Global utility for saving inventory safely
window.saveLocalInventory = async function (customData = null) {
    const dataToSave = customData || window.inventory || [];
    try {
        // 1. Always save full data to IndexedDB (No quota limits)
        await saveToIDB('robel_inventory_backup', dataToSave);

        // 2. Save a "light" version to LocalStorage for quick boot
        // We strip large base64 strings (images) to stay under 5MB limit
        if (typeof safeLocalStorageSet === 'function') {
            safeLocalStorageSet('robel_inventory_backup', dataToSave);
        }
        console.log("?? Inventory saved safely to IndexedDB.");
    } catch (e) {
        console.error("? Failed to save inventory:", e);
    }
};

// Utility to strip large strings from objects to save LocalStorage space
function stripLargeAssets(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    const clean = Array.isArray(obj) ? [] : {};

    for (let key in obj) {
        let val = obj[key];
        // Aggressive: If string is > 1000 chars, it's too big for LocalStorage
        if (typeof val === 'string' && val.length > 1000) {
            val = "[STRIPPED_FOR_QUOTA]";
        } else if (typeof val === 'object') {
            val = stripLargeAssets(val);
        }
        if (Array.isArray(obj)) clean.push(val);
        else clean[key] = val;
    }
    return clean;
}

// Custom setItem with Quota Safeguard
window.safeLocalStorageSet = function (key, data) {
    try {
        localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {
        if (e.name === 'QuotaExceededError') {
            console.warn(`?? LocalStorage Full! Stripping large assets for key: ${key} `);
            const lightData = stripLargeAssets(data);
            localStorage.setItem(key, JSON.stringify(lightData));
        } else {
            throw e;
        }
    }
}
window.saveToIDB = saveToIDB;
window.getFromIDB = getFromIDB;

// --- BACKGROUND CACHE SYNC (Ensures next load is instant) ---
async function refreshGlobalCache() {
    // Only run if system is ready
    if (typeof window.firebaseQueries === 'undefined') return;

    // CRITICAL QUOTA FIX: Only Admins can trigger a sync to Cloudflare.
    // Guests should NEVER touch Firebase to prevent mass reads.
    const isAdmin = window.location.pathname.includes('admin') || document.getElementById('sys-cfg-2026');
    if (!isAdmin) {
        console.log("??? [Data Guard] Guest detected. Using optimized Cloudflare fetching.");
        return;
    }

    // RESCUE MODE: If quota exceeded, stop hitting Firebase and trust the cache
    if (window.firebaseQuotaExceeded) {
        console.log("??? [Rescue Mode] Firebase Quota Exceeded. Skipping sync.");
        return;
    }

    try {
        console.log("?? [Background Sync] System optimized - Syncing via Cloudflare Layer...");

        // 1. Get Projects/Metadata via optimized layer (hits Cloudflare if cache expired)
        const projects = await window.firebaseQueries.getAllProjects();
        if (projects && projects.length > 0) {
            projects.forEach(p => {
                if (window.projectMetadata[p.id]) {
                    window.projectMetadata[p.id] = { ...window.projectMetadata[p.id], ...p };
                }
            });
            await saveToIDB('robel_project_metadata', window.projectMetadata);
            safeLocalStorageSet('robelProjectMetadata', stripLargeAssets(window.projectMetadata));
        }

        // 2. Get All Units (Heavier) - Uses fetchFromCloudflare internally
        // We use a high-level search or projects to get units
        const units = [];
        for (const p of projects) {
            const pUnits = await window.firebaseQueries.getUnitsByProject(p.id);
            if (pUnits) units.push(...pUnits);
        }

        if (units.length > 0) {
            // Deduplicate units locally (B121 vs 121)
            const uniqueMap = {};
            units.forEach(u => {
                const normId = normalizeId(u.id || u.unit_id);
                if (!uniqueMap[normId] || u.id.startsWith('B')) {
                    uniqueMap[normId] = u;
                }
            });
            const cleanUnits = Object.values(uniqueMap);

            await saveToIDB('robel_inventory_backup', cleanUnits);
            window.inventory.splice(0, window.inventory.length, ...cleanUnits);

            console.log(`??[Background Sync] Updated Cache with ${cleanUnits.length} unique units via Cloudflare.`);

            // Refresh UI if it was empty
            if (document.getElementById('dynamic-total-units') && document.getElementById('dynamic-total-units').innerText.includes('0')) {
                if (window.updateGlobalUnitStats) window.updateGlobalUnitStats();
            }
        }
    } catch (e) {
        console.error("Background Sync Failed:", e);
    }
}

// Trigger background sync after load (ONLY FOR ADMINS)
window.addEventListener('load', () => {
    // Check if admin is logged in or on admin page
    const isAdmin = window.location.pathname.includes('admin') || document.getElementById('sys-cfg-2026');
    if (isAdmin) {
        // console.log("?? Admin detected. Starting background cache sync...");
        setTimeout(() => refreshGlobalCache(), 2000); // Small delay to let UI settle
    }
});
window.checkLocalStorageUsage = function () {
    const MAX_SIZE_MB = 5; // Browser limit (approximate)
    let totalBytes = 0;
    const breakdown = {};

    // Calculate size of each key
    for (let key in localStorage) {
        if (localStorage.hasOwnProperty(key)) {
            const itemSize = (localStorage[key].length + key.length) * 2; // UTF-16 = 2 bytes per char
            totalBytes += itemSize;
            breakdown[key] = (itemSize / 1024).toFixed(2) + ' KB';
        }
    }

    const totalKB = (totalBytes / 1024).toFixed(2);
    const totalMB = (totalBytes / (1024 * 1024)).toFixed(3);
    const percentUsed = ((totalBytes / (MAX_SIZE_MB * 1024 * 1024)) * 100).toFixed(1);
    const remainingMB = (MAX_SIZE_MB - (totalBytes / (1024 * 1024))).toFixed(3);

    // Console output with styling
    console.log('%c?? LocalStorage Usage Report', 'font-size: 14px; font-weight: bold; color: #C9A23F;');
    console.log(`% c+---------------------------------------------+`, 'color: #888;');
    console.log(`% c¦  Total Used: ${totalKB} KB(${totalMB} MB)`, 'color: #fff;');
    console.log(`% c¦  Capacity Used: ${percentUsed}% of ${MAX_SIZE_MB} MB`, percentUsed > 80 ? 'color: #e74c3c;' : 'color: #2ecc71;');
    console.log(`% c¦  Remaining: ${remainingMB} MB`, 'color: #3498db;');
    console.log(`% c+---------------------------------------------+`, 'color: #888;');

    console.log('%c?? Breakdown by Key:', 'font-weight: bold; color: #9b59b6;');
    console.table(breakdown);

    // Warnings
    if (percentUsed > 90) {
        console.warn('?? CRITICAL: LocalStorage is almost full! Consider clearing old data.');
    } else if (percentUsed > 70) {
        console.warn('?? WARNING: LocalStorage usage is high (' + percentUsed + '%).');
    }

    return {
        totalBytes,
        totalKB: parseFloat(totalKB),
        totalMB: parseFloat(totalMB),
        percentUsed: parseFloat(percentUsed),
        remainingMB: parseFloat(remainingMB),
        breakdown
    };
};

// ?? Cleanup function to clear old/stale data
window.clearLocalStorageCache = function (keepAuth = true) {
    const keysToRemove = ['robelInventory', 'robelProjectMetadata', 'robelAreaMetadata', 'robel_inventory_backup'];
    const authKeys = ['isLoggedIn', 'userRole', 'preferredLang', 'theme'];

    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`??? Removed: ${key} `);
    });

    if (!keepAuth) {
        authKeys.forEach(key => {
            localStorage.removeItem(key);
            console.log(`??? Removed: ${key} `);
        });
    }

    console.log('%c? LocalStorage cache cleared! Refresh the page to reload from Firebase.', 'color: #2ecc71; font-weight: bold;');
};

// Auto-check on page load
(function () {
    setTimeout(() => {
        if (typeof window.checkLocalStorageUsage === 'function') {
            window.checkLocalStorageUsage();
        }
    }, 3000); // Check after 3 seconds to allow data to load
})();

// Sorting Helpers (Passthrough if not defined)
if (typeof window.getSortedAreasList !== 'function') {
    window.getSortedAreasList = (list) => list.sort();
}
if (typeof window.getSortedBuildingsList !== 'function') {
    window.getSortedBuildingsList = (list) => list.sort();
}

var masterInventory = [];
// DO NOT reassign these variables with = [...]
// Use .splice to mutate the existing arrays/objects to keep all references alive

// --- Project Detail Pages Mapping ---
// Ensure KEYS match the output of normalizeProjectArea (or exact Project Area strings)
// --- URL Slugs Helper ---
const SLUG_MAP = {
    "porto-golf-marina": "Porto Golf Marina",
    "porto-said": "Porto Said",
    "celebration": "Celebration",
    "new-alamein": "Celebration"
};

// Global mapping for specific project landing pages
window.projectDetailPages = {
    "Porto Golf Marina": "porto-golf-marina.html",
    "Porto Said": "porto-said.html",
    "Celebration": "celebration.html"
};

const getProjectSlug = (name) => {
    if (!name) return "";
    const n = name.toLowerCase().trim();
    if (n.includes("golf")) return "porto-golf-marina";
    if (n.includes("said")) return "porto-said";
    if (n.includes("celebration") || n.includes("alamein")) return "celebration";
    return n.replace(/\s+/g, '-');
};

window.openProject = function (pName, forceViewUnits = false) {
    const meta = projectMetadata[pName];
    let area = meta ? meta.projectArea : pName;

    // Robust Normalization for Redirection logic
    let normArea = area;
    if (normArea.includes("Golf")) normArea = "Porto Golf Marina";
    if (normArea.includes("Said")) normArea = "Porto Said";
    if (normArea.includes("Celebration") || normArea.includes("Alamein")) normArea = "Celebration";

    // Check if it's a specific building ID (heuristic)
    // If it starts with 'B' followed by digits, or is just digits, assume it's a building
    // Also check if pName is mapped to an area but is NOT the area name itself (e.g. "B133" vs "Porto Golf Marina")
    let isSpecificBuilding = false;
    if (meta && pName !== normArea) {
        // If pName is not the normalized area name, it's likely a building or sub-project
        // e.g. "B133" !== "Porto Golf Marina"
        isSpecificBuilding = true;
    }
    if (/^b?\d+$/i.test(pName)) isSpecificBuilding = true;


    // Check if we should redirect to a specific landing page (Compound Guide flow)
    // ONLY do this if we are NOT in 'forceViewUnits' mode AND NOT a specific building
    const projectDetailPages = window.projectDetailPages || {};

    if (!forceViewUnits && !isSpecificBuilding) {
        if (projectDetailPages[normArea]) {
            // Direct Link with Query Parameter for Data Sync (Using SLUG)
            const slug = getProjectSlug(normArea);
            const targetUrl = `${projectDetailPages[normArea]}?project=${slug}`;
            window.location.href = targetUrl;
            return;
        }
    }

    if (typeof toggleSidebar === 'function') toggleSidebar(false);

    // Generic fallback to Units Page
    // Pass both area as project (for scope) and pName as building
    const slug = getProjectSlug(normArea);
    let targetUrl = `units.html?project=${slug}`;
    if (meta && pName !== normArea) {
        targetUrl += `&building=${encodeURIComponent(pName)}`;
    }

    // ?? NEW: Persist Area Filter from Homepage
    const areaCheckboxes = document.querySelectorAll('#area-options-list input[type="checkbox"]:checked');
    if (areaCheckboxes.length > 0) {
        const areaVals = Array.from(areaCheckboxes).map(cb => cb.value).join(',');
        targetUrl += `&area=${encodeURIComponent(areaVals)}`;
    }

    // Persist Delivery Filter if available
    const deliveryCheckboxes = document.querySelectorAll('#delivery-options-list input[type="checkbox"]:checked');
    if (deliveryCheckboxes.length > 0) {
        const deliveryVals = Array.from(deliveryCheckboxes).map(cb => cb.value).join(',');
        targetUrl += `&delivery=${encodeURIComponent(deliveryVals)}`;
    }

    window.location.href = targetUrl;
};

// Initialize inventory from LocalStorage (Mutate the shared reference)
(function () {
    const savedInv = JSON.parse(localStorage.getItem('robelInventory')) || [];
    if (savedInv.length > 0) {
        console.log(`[IIFE] Bootstrapping ${savedInv.length} units from LocalStorage immediately.`);
        window.inventory.splice(0, window.inventory.length, ...savedInv);
    } else {
        console.log("[IIFE] No units found in LocalStorage.");
    }
    // Force immediate UI render if data exists
    if (window.inventory.length > 0) {
        // We delay slightly to ensure the functions are defined, but this runs before network
        setTimeout(() => {
            if (typeof finalizeNormalization === 'function') finalizeNormalization();
        }, 0);
    }
})();

// --- AREA RULES ENGINE ---
/**
 * Tabular configuration for area-based filtering. 
 * Allows different logic (fixed list vs ranges) per project and building.
 */
const AREA_RULES_TABLE = [
    {
        project: "Porto Golf Marina",
        building: "B133", // Specific for B133
        type: "fixed",
        rules: [
            { val: 60, label: "60 m²" },
            { val: 82, label: "82 m²" },
            { val: 90, label: "90 m²" }
        ]
    },
    {
        project: "Porto Golf Marina",
        building: "B136", // Specific for B136
        type: "fixed",
        rules: [
            { val: 60, label: "60 m²" },
            { val: 82, label: "82 m²" },
            { val: 90, label: "90 m²" }
        ]
    },
    {
        project: "Porto Golf Marina",
        building: null,
        type: "fixed",
        rules: [
            { val: 30, label: "30 m²" },
            { val: 60, label: "60 m²" },
            { val: 82, label: "82 m²" },
            { val: 90, label: "90 m²" },
            { val: "VILLA", label: "Villa (131+)" }
        ]
    },
    {
        project: "Porto Said",
        building: "B15",
        type: "dynamic",
        rules: []
    },
    {
        project: "Porto Said",
        building: "B33",
        type: "dynamic",
        rules: []
    },
    {
        project: "Porto Said",
        building: null, // Default for Porto Said
        type: "dynamic",
        rules: [
            { val: "30-59", label: "30-59 m²" },
            { val: "60-75", label: "60-75 m²" },
            { val: "76-95", label: "76-95 m²" },
            { val: "96-120", label: "96-120 m²" },
            { val: "121-150", label: "121-150 m²" },
            { val: "VILLA", label: "171+ m²" }
        ]
    },
    {
        project: "Celebration",
        building: null,
        type: "fixed",
        rules: [
            { val: "90", label: "90 m²" },
            { val: "105", label: "105 m²" },
            { val: "120", label: "120 m²" },
            { val: "VILLA", label: "Villa (141+)" }
        ]
    }
];


// Helper to ensure consistent naming across all logic
function normalizeProjectArea(area) {
    if (!area) return "Other";
    const a = area.toString().toLowerCase().trim();

    // Project ID Map: Maps building IDs and various aliases to unified project names
    const idMap = {
        // Porto Golf Marina
        "121": "Porto Golf Marina", "b121": "Porto Golf Marina",
        "224": "Porto Golf Marina", "b224": "Porto Golf Marina",
        "78": "Porto Golf Marina", "b78": "Porto Golf Marina",
        "133": "Porto Golf Marina", "b133": "Porto Golf Marina",
        "136": "Porto Golf Marina", "b136": "Porto Golf Marina",
        "230": "Porto Golf Marina", "b230": "Porto Golf Marina",
        "243": "Porto Golf Marina", "b243": "Porto Golf Marina",
        "porto golf": "Porto Golf Marina", "golf": "Porto Golf Marina",
        "porto-golf-marina": "Porto Golf Marina", // Fix for slug
        // Porto Said
        "15": "Porto Said", "b15": "Porto Said",
        "16": "Porto Said", "b16": "Porto Said",
        "17": "Porto Said", "b17": "Porto Said",
        "33": "Porto Said", "b33": "Porto Said",
        "said": "Porto Said", "porto said": "Porto Said",
        "porto-said": "Porto Said", // Fix for slug
        // Celebration
        "9": "Celebration", "b9": "Celebration",
        "10": "Celebration", "b10": "Celebration",
        "celebration": "Celebration", "alamein": "Celebration", "new alamein": "Celebration"
    };

    // Check if it matches a known ID or alias
    if (idMap[a]) return idMap[a];

    // Fallback search
    if (a.includes('golf')) return "Porto Golf Marina";
    if (a.includes('said')) return "Porto Said";
    if (a.includes('celebration') || a.includes('alamein')) return "Celebration";

    return "Other";
}

// Global helper to check if a unit matches selected area ranges
// Global helper to check if a unit matches selected area ranges
function matchesAreaRange(uArea, rangeVals, projectContext = null) {
    if (!rangeVals || rangeVals.length === 0) return true;
    if (!uArea) return false;
    const area = parseFloat(uArea);
    if (isNaN(area)) return false;

    // Use explicit context or fall back to window global
    let p = projectContext || window.activeSearchProject;
    // Auto-detect project from range type if missing
    if (rangeVals.some(v => v.toString().startsWith("SAID_"))) p = "Porto Said";
    if (!p) p = "Porto Golf Marina";

    return rangeVals.some(val => {
        // 1. Unified Range System (Strings like SAID_STUDIO)
        if (val.toString().startsWith("SAID_")) {
            if (val === "SAID_STUDIO") return area >= 30 && area <= 50;
            if (val === "SAID_1BR") return area >= 51 && area <= 75;
            if (val === "SAID_1BRL") return area >= 76 && area <= 95;
            if (val === "SAID_2BR") return area >= 96 && area <= 120;
            if (val === "SAID_3BR") return area >= 121 && area <= 170;
            return false;
        }

        // 2. Numeric Equality (with tolerance for floor rounding)
        if (!isNaN(parseFloat(val)) && val.toString().indexOf('-') === -1) {
            return Math.abs(area - parseFloat(val)) <= 5;
        }

        // 3. String Ranges (e.g. "30-59")
        if (val.toString().includes('-')) {
            const [min, max] = val.toString().split('-').map(v => parseFloat(v));
            return area >= min && area <= max;
        }

        if (val === "VILLA") {
            if (p === "Porto Said") return area >= 171;
            if (p === "Celebration") return area >= 141;
            return area >= 131; // Porto Golf
        }

        if (p === "Celebration") {
            if (val === "90") return area >= 85 && area <= 99;
            if (val === "105") return area >= 100 && area <= 115;
            if (val === "120") return area >= 116 && area <= 135;
        } else {
            // Default / Porto Golf
            if (val === "30") return area >= 20 && area <= 40;
            if (val === "60") return area >= 41 && area <= 75;
            if (val === "82") return area >= 76 && area <= 86;
            if (val === "90") return area >= 87 && area <= 130;
        }
        return false;
    });
}

/**
 * NEW: Centralized Area Strategy Logic
 * Returns the appropriate area options based on Project and Building.
 */
function getAreaStrategy(project, buildingId) {
    const p = normalizeProjectArea(project);
    const b = normalizeId(buildingId);
    const t = translations[currentLang] || {};

    // Find custom rule for (Project + Building)
    let match = AREA_RULES_TABLE.find(r => r.project === p && r.building === b);

    // Fallback to (Project Only)
    if (!match) match = AREA_RULES_TABLE.find(r => r.project === p && !r.building);

    // STRICT FALLBACK for Porto Said equivalents
    if (!match && p.includes("Porto Said")) {
        match = AREA_RULES_TABLE.find(r => r.project === "Porto Said" && !r.building);
    }

    // Final Fallback (Default Porto Golf Marina style)
    if (!match) match = AREA_RULES_TABLE[0];

    // Localize labels if the rules have specific label structures
    // Localize labels if the rules have specific label structures
    const localizedRules = match.rules.map(opt => {
        let label = opt.label;
        if (opt.val === "VILLA") label = currentLang === 'ar' ? `فيلا (${p === "Porto Said" ? "171" : p === "Celebration" ? "141" : "131"}+)` : `Villa (${p === "Porto Said" ? "171" : p === "Celebration" ? "141" : "131"}+)`;
        else if (opt.label && opt.label.includes('Studio')) label = currentLang === 'ar' ? opt.label.replace('m² (Studio)', 'م² (استوديو)') : opt.label;
        else if (opt.label && opt.label.includes('Junior')) label = currentLang === 'ar' ? opt.label.replace('m² (Junior)', 'م² (جونيور)') : opt.label;
        else if (opt.label && opt.label.includes('1 Bedroom')) label = currentLang === 'ar' ? opt.label.replace('m² (1 Bedroom)', 'م² (غرفة نوم)') : opt.label;
        else if (opt.label && opt.label.includes('2 Bedroom')) label = currentLang === 'ar' ? opt.label.replace('m² (2 Bedroom)', 'م² (غرفتين)') : opt.label;
        else if (opt.label && opt.label.includes('Family')) label = currentLang === 'ar' ? opt.label.replace('m² (Family)', 'م² (عائلية)') : opt.label;

        return { ...opt, label: label };
    });

    return {
        type: match.type,
        options: localizedRules
    };
}


// Move normalization to a helper to allow calling it (Baseline, Metadata, and Units)
function finalizeNormalization() {
    // --- FINAL NORMALIZATION & UI RENDERING ---
    const protectedBuildings = ['B133', 'B136', 'B230', 'B243', 'B121', 'B224', 'B78', 'B15', 'B16', 'B17', 'B33', 'B9', 'B10'];

    const normalizedMetadata = {};
    const projectSlugs = ['PORTO-GOLF-MARINA', 'PORTO-SAID', 'CELEBRATION', 'GEORGE', 'NEW-ALAMEIN', 'EGYPT-PROJECTS', 'OTHER'];

    Object.keys(projectMetadata).forEach(key => {
        const normKey = normalizeId(key);
        const data = projectMetadata[key];

        if (protectedBuildings.includes(normKey)) delete data.deleted;
        if (data.deleted) return;

        // Merge data if duplicates exist
        normalizedMetadata[normKey] = {
            ...(normalizedMetadata[normKey] || {}),
            ...data,
            id: normKey,
            code: normKey
        };

        // --- STRICT CATEGORIZATION ---
        // Identify if this is a project container or a real building
        const isProject = projectSlugs.includes(normKey.toUpperCase()) ||
            projectSlugs.includes(key.toUpperCase()) ||
            (data.projectArea === normKey);

        normalizedMetadata[normKey].category = isProject ? 'projects' : 'properties';

        // --- ROBUST IMAGE NORMALIZATION ---
        // Ensure image/images are parsed if they are JSON strings
        if (data.image && typeof data.image === 'string' && data.image.startsWith('[')) {
            try { data.image = JSON.parse(data.image); } catch (e) { }
        }
        if (data.images && typeof data.images === 'string' && data.images.startsWith('[')) {
            try { data.images = JSON.parse(data.images); } catch (e) { }
        }

        // Ensure that if 'images' is an array, 'image' (singular) is at least the first one
        if (Array.isArray(data.images) && data.images.length > 0 && !data.image) {
            data.image = data.images[0];
        } else if (data.image && !data.images) {
            data.images = [data.image];
        }

        // --- SMART AREA MAPPING ---
        // If it's a building but missing area, try to guess or default
        if (!normalizedMetadata[normKey].projectArea || normalizedMetadata[normKey].projectArea === "Egypt Projects") {
            const guessedArea = normalizeProjectArea(normKey);
            normalizedMetadata[normKey].projectArea = (guessedArea !== "Other") ? guessedArea : (isProject ? normKey : "Other");
        }
    });

    // Replace the global object with normalized version
    Object.keys(projectMetadata).forEach(key => delete projectMetadata[key]);
    Object.assign(projectMetadata, normalizedMetadata);

    // Filter projectNames to ONLY include real buildings (properties)
    const buildingKeys = Object.keys(projectMetadata).filter(k => projectMetadata[k].category === 'properties');
    projectNames.splice(0, projectNames.length, ...buildingKeys);

    const activeAreas = Object.values(projectMetadata)
        .filter(m => m.category === 'properties' && !m.deleted) // Only care about active buildings
        .map(m => {
            let area = m.projectArea || "Other";
            if (area.toLowerCase().includes('porto golf')) return "Porto Golf Marina";
            if (area.toLowerCase().includes('celebration') || area.toLowerCase().includes('new alamein')) return "Celebration";
            if (area.toLowerCase().includes('porto said')) return "Porto Said";
            return area;
        })
        .filter(area => area !== "Other" && area.toLowerCase() !== "ready");

    const newAreas = [...new Set(activeAreas)];
    projectAreas.splice(0, projectAreas.length, ...newAreas);

    // --- DEDUPLICATE & NORMALIZE INVENTORY (UNITS) ---
    const unitMap = new Map();
    window.inventory.forEach(u => {
        if (!u.code) return;
        const code = String(u.code);

        // Normalize building/project refs within the unit data
        if (u.project) u.project = normalizeId(u.project);
        if (u.projectId) u.projectId = normalizeId(u.projectId);
        if (u.buildingId) u.buildingId = normalizeId(u.buildingId);
        if (u.buildingCode) u.buildingCode = normalizeId(u.buildingCode);

        // --- FLOOR NORMALIZATION (Unified to Ordinal String) ---
        if (u.floor !== undefined && u.floor !== null) {
            const raw = u.floor.toString().toLowerCase().trim();
            const numVal = parseInt(raw);

            // Map common text to numbers first
            let effectiveNum = NaN;
            if (!isNaN(numVal)) effectiveNum = numVal;
            else if (raw.includes('ground') || raw === 'gf' || raw === 'g') effectiveNum = 0;
            else if (raw.includes('first') || raw === '1st') effectiveNum = 1;
            else if (raw.includes('second') || raw === '2nd') effectiveNum = 2;
            else if (raw.includes('third') || raw === '3rd') effectiveNum = 3;
            else if (raw.includes('fourth') || raw === '4th') effectiveNum = 4;
            else if (raw.includes('fifth') || raw === '5th') effectiveNum = 5;
            else if (raw.includes('sixth') || raw === '6th') effectiveNum = 6;
            else if (raw.includes('seventh') || raw === '7th') effectiveNum = 7;
            else if (raw.includes('eighth') || raw === '8th') effectiveNum = 8;
            else if (raw.includes('ninth') || raw === '9th') effectiveNum = 9;
            else if (raw.includes('tenth') || raw === '10th') effectiveNum = 10;

            // Convert to nice string
            if (!isNaN(effectiveNum)) {
                if (effectiveNum === 0) u.floor = "Ground Floor";
                else if (effectiveNum === 1) u.floor = "1st Floor";
                else if (effectiveNum === 2) u.floor = "2nd Floor";
                else if (effectiveNum === 3) u.floor = "3rd Floor";
                else u.floor = effectiveNum + "th Floor";
            }
        }

        // FORCE INTENT NORMALIZATION: Treat 'sale'/'SALE'/'Primary' as 'buy'
        // This ensures the Buy/Rent filter works consistently without modifying DB
        const rawIntent = (u.intent || 'buy').toLowerCase();
        if (rawIntent === 'sale' || rawIntent === 'primary' || rawIntent === 'resale') {
            u.intent = 'buy';
        } else {
            u.intent = rawIntent; // Normalize to lowercase
        }

        // Merge duplicate units by code
        const existing = unitMap.get(code);
        const merged = { ...(existing || {}), ...u };

        // 🎯 UNIFIED SYSTEM SPECIFICATIONS (STRICT RULES)
        const areaVal = Number(merged.area) || 0;
        const bKey = (merged.buildingCode || merged.buildingId || merged.building_id || '').toUpperCase().trim();
        const pKey = (merged.project || '').toLowerCase().trim();

        // Check if we already have specifications in JSON format
        let specs = null;
        if (merged.specifications) {
            try {
                specs = typeof merged.specifications === 'string' ? JSON.parse(merged.specifications) : merged.specifications;
            } catch (e) { }
        }

        const isGolf = pKey.includes('golf') || ['B133', 'B136', 'B121', 'B230', 'B243', 'B78', 'B224'].includes(bKey);
        const isB15 = bKey === 'B15' || bKey === '15';
        const isB33 = bKey === 'B33' || bKey === '33';

        if (!specs) {
            specs = { bedrooms: 1, bathrooms: 1, kitchen: true };

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
        }

        // Apply Specs to Unit
        merged.bedrooms = specs.bedrooms;
        merged.bathrooms = specs.bathrooms;
        merged.specifications = typeof specs === 'object' ? JSON.stringify(specs) : specs;
        merged.auto_specs = specs; // Keep sync for internal functions

        // --- IMAGE PRESERVATION RULE ---
        const currentHasImages = Array.isArray(u.images) && u.images.length > 0;
        const existingHasImages = existing && Array.isArray(existing.images) && existing.images.length > 0;
        if (existingHasImages && !currentHasImages) {
            merged.images = existing.images;
            merged.image = existing.image || (Array.isArray(existing.images) ? existing.images[0] : null);
        }

        // --- GROUND FLOOR GARDEN RULE ---
        const rawFloor = (merged.floor || '').toString().toLowerCase();
        if (rawFloor.includes('ground') || rawFloor.includes('0') || rawFloor === 'gf' || rawFloor === 'g') {
            merged.auto_specs.garden = true;
            merged.auto_specs.garden_desc = (currentLang === 'ar' ? "حديقة خاصة" : "Private Garden");
        }

        // --- AUTO-DETECT UNIT NUMBER ---
        if (!merged.unit_number && !merged.number && code && code.length >= 2) {
            merged.unit_number = String(code).slice(isB15 ? -3 : -2);
        }

        unitMap.set(code, merged);
    });
    const cleanInventory = Array.from(unitMap.values());
    window.inventory.splice(0, window.inventory.length, ...cleanInventory);

    window.projectMetadata = projectMetadata;
    window.projectNames = projectNames;
    window.projectAreas = projectAreas;
    // References are already in sync via 'var' aliases

    renderProjectCards();
    if (typeof renderFeaturedProjects === 'function') renderFeaturedProjects();
    if (typeof renderAdminProjectList === 'function') renderAdminProjectList();
}

// Optimization: Debounce UI updates to prevent jitter
let normalizationTimeout;
let renderCount = 0;
const MAX_RENDERS_PER_LOAD = 3; // Limit re-renders to prevent flicker

function debouncedNormalization() {
    clearTimeout(normalizationTimeout);

    // Prevent excessive re-renders (max 3 per page load)
    if (renderCount >= MAX_RENDERS_PER_LOAD) {
        console.log(`?? Skipping render #${renderCount + 1} (max reached)`);
        return;
    }

    normalizationTimeout = setTimeout(() => {
        renderCount++;
        console.log(`?? Render #${renderCount} `);
        finalizeNormalization();
    }, 200); // Reduced from 500ms for faster feel
}

// Reset render counter after page fully loads
setTimeout(() => { renderCount = 0; }, 10000);

// Function to load data asynchronously (Optimized for Speed)
// Function to load data asynchronously (Optimized for Speed)
// Flag to prevent double-loading
window.isDataLoading = false;

window.loadData = async function (forceRefresh = false) {
    if (window.isDataLoading) {
        console.log("?? loadData called but already in progress. Skipping.");
        return;
    }
    window.isDataLoading = true;
    console.log(`?? Starting Data Hydration (Force Refresh: ${forceRefresh})...`);

    try {
        // PASS 0: Instant bootstrap from LocalStorage (Only if not force refreshing)
        if (!forceRefresh) {
            try {
                const cachedMeta = JSON.parse(localStorage.getItem('robelProjectMetadata'));
                const cachedInv = JSON.parse(localStorage.getItem('robelInventory'));

                console.log(`[loadData] PASS 0: Checking Cache...Meta: ${!!cachedMeta}, Inv: ${cachedInv ? cachedInv.length : 'null'} `);

                if (cachedMeta) Object.assign(projectMetadata, cachedMeta);
                if (cachedInv && cachedInv.length > 0) {
                    window.inventory.splice(0, window.inventory.length, ...cachedInv);
                    console.log(`[loadData] PASS 0: HYDRATED ${window.inventory.length} units from Cache.`);
                } else {
                    console.warn("[loadData] PASS 0: Cache MISS - Waiting for Network.");
                }
            } catch (e) {
                console.warn("Bootstrap failed:", e);
            }
            finalizeNormalization(); // Render UI immediately
        }

        // STEP 1: Load Local Baselines (DISABLED to ensure strictly Cloudflare data)
        console.log("?? Local JSON baselines skipped (Using Cloudflare as Source of Truth)");

        // --- STEP 3: Optimized Sync via Cloudflare ---
        console.log("?? Fetching Data from Cloudflare...");

        if (window.firebaseQueries) {
            // --- PARALLEL FETCHING (Much Faster) ---
            const [projects, buildings, units] = await Promise.all([
                window.firebaseQueries.getAllProjects(forceRefresh),
                window.firebaseQueries.getAllBuildings(forceRefresh),
                window.firebaseQueries.getAllUnits(forceRefresh)
            ]);

            if (projects && projects.length > 0) {
                projects.forEach(p => {
                    const normId = normalizeId(p.id);
                    projectMetadata[normId] = { ...(projectMetadata[normId] || {}), ...p, id: normId };
                });
            }

            if (buildings && buildings.length > 0) {
                buildings.forEach(b => {
                    const key = normalizeId(b.code || b.id || b.building_id);
                    projectMetadata[key] = { ...(projectMetadata[key] || {}), ...b, id: key };
                });
            }

            if (Array.isArray(units)) {
                console.log(`? [Cloudflare] Syncing inventory: ${units.length} units.`);
                const ghosts = ['B16', 'B17'];
                const cleanUnits = units.filter(u => {
                    const bId = u.buildingId || normalizeId(u.building_id || u.buildingId || u.project);
                    return !ghosts.includes(bId);
                });
                window.inventory.splice(0, window.inventory.length, ...cleanUnits);
                saveCurrentInventory();
            }

            debouncedNormalization();
        } else {
            console.warn("?? firebaseQueries not available - falling back to cache.");
        }
    } catch (criticalErr) {
        console.error("CRITICAL error in loadData:", criticalErr);
    } finally {
        window.isDataLoading = false;
    }
}

// System Utility: Upload JSON data to Firestore (Admin Only tool)


// Function to persist current state
// Function to persist current state
function saveCurrentInventory() {
    // 🚀 PERFORMANCE FIX: Purge redundant heavy data from LocalStorage to prevent slowdowns
    try {
        localStorage.removeItem('robel_inventory_backup'); // Remove huge legacy backups
    } catch (e) { }

    console.log(`[saveCurrentInventory] Saving ${inventory.length} units to LocalStorage.`);

    try {
        localStorage.setItem('robelInventory', JSON.stringify(inventory));
    } catch (e) {
        if (e.name === 'QuotaExceededError' || e.code === 22) {
            console.warn("⚠️ LocalStorage full! Attempting emergency cleanup...");
            if (typeof clearOldCache === 'function') clearOldCache();

            try {
                localStorage.setItem('robelInventory', JSON.stringify(inventory));
                console.log("✅ Saved successfully after cleanup.");
            } catch (err) {
                console.error("❌ Still full after cleanup. Falling back to ULTRA-lightweight save.");

                // Fallback to ULTRA-lightweight save (Minified for Listing Only)
                try {
                    const minifiedInventory = inventory.map(u => ({
                        id: u.id,
                        unit_id: u.unit_id,
                        code: u.code,
                        project: u.project,
                        building_id: u.building_id,
                        status: u.status,
                        price: u.price,
                        area: u.area,
                        type: u.type,
                        rooms: u.rooms,
                        floor: u.floor,
                        // Exclude: images, floorPlan, description, specs, payment_plan (heavy text)
                    }));
                    localStorage.setItem('robelInventory', JSON.stringify(minifiedInventory));
                    console.log("✅ Ultra-lightweight inventory saved (Listing fields only).");
                } catch (innerE) {
                    console.error("❌ Critical: Even minified inventory failed to save. Storage is exhausted.");
                }
            }
        } else {
            console.warn("⚠️ LocalStorage save failed for unknown reason:", e);
        }
    }

    try {
        // Persist Metadata (including deletions/renames)
        if (window.projectMetadata) {
            try {
                localStorage.setItem('robelProjectMetadata', JSON.stringify(window.projectMetadata));
            } catch (metaErr) {
                console.warn("⚠️ Metadata save failed (Quota). Retrying without heavy image data...");
                // Strip images from metadata if save fails
                const lightMeta = {};
                Object.keys(window.projectMetadata).forEach(k => {
                    const { image, images, ...rest } = window.projectMetadata[k];
                    lightMeta[k] = rest; // Keep text data only
                });
                localStorage.setItem('robelProjectMetadata', JSON.stringify(lightMeta));
            }
        }
    } catch (e) {
        console.warn("Metadata save failed:", e);
    }

    renderProjectCards(); // Sync main UI
    if (typeof renderFeaturedProjects === 'function') renderFeaturedProjects();
}

const RESORT_LOCATION = "Other"; // Default context for legacy items

// Initialize users from LocalStorage or use defaults
// --- Users Data (Managed by Firebase now) ---
// const defaultUsers = ... (Removed)
// let users = ... (Removed)

// Local users array removed in favor of Firebase Auth

let currentLang = 'en'; // Default to English on every fresh open as requested
let revealObserver;
let currentSearchMode = 'all'; // Unified search mode by default

// --- Zoom Logic Removed ---
// Browsers do not allow websites to force-reset user zoom settings for security reasons.
// The best approach is to let the browser handle scaling naturally.


document.addEventListener('DOMContentLoaded', () => {
    // Ensure we start at the top of the page
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    setTimeout(() => window.scrollTo(0, 0), 100);

    // --- Definitions Hoisted for Correct Execution ---
    window.updateLoginButton = function () {
        const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        const userRole = localStorage.getItem('userRole') || 'guest';
        const t = (typeof translations !== 'undefined' && translations[currentLang]) ? translations[currentLang] : { login_btn: 'Login', logout_btn: 'Logout' };

        // Select all possible login/logout buttons across desktop, mobile and sidebar
        const loginBtns = document.querySelectorAll('#login-btn, #login-btn-top, #sidebar-login-btn');
        const adminBtns = document.querySelectorAll('.admin-only-ui');

        loginBtns.forEach(btn => {
            if (isLoggedIn) {
                // Change Login to Logout
                btn.innerHTML = `<span>${t.logout_btn || 'Logout'}</span>`;
                btn.onclick = (e) => {
                    if (e) e.preventDefault();
                    localStorage.setItem('isLoggedIn', 'false');
                    localStorage.setItem('userRole', 'guest');
                    window.updateLoginButton();
                    const adminDashboard = document.getElementById('sys-cfg-2026');
                    if (adminDashboard) adminDashboard.classList.remove('active');
                };
            } else {
                // Change Logout back to Login
                btn.innerHTML = `<span>${t.login_btn || 'Login'}</span>`;
                btn.onclick = (e) => {
                    if (e) e.preventDefault();
                    if (typeof openAuthModal === 'function') openAuthModal();
                };
            }
        });

        const isAdminFlag = localStorage.getItem('isAdmin') === 'true';

        // Admin bits managed by auth-service.js
    };

    window.setLanguage = function (lang) {
        currentLang = lang;
        localStorage.setItem('preferredLang', lang);
        const t = translations[lang];

        const langBtns = document.querySelectorAll('.lang-toggle-btn, #lang-btn, #sidebar-lang-btn, #lang-btn-mobile, #lang-btn-nav, #lang-btn-top');
        langBtns.forEach(btn => {
            // Add click listener
            btn.onclick = () => {
                const nextLang = currentLang === 'en' ? 'ar' : 'en';
                window.setLanguage(nextLang);
            };

            // Mobile button might show "AR" or "EN" instead of full text
            if (btn.classList.contains('lang-toggle-btn') || btn.id.includes('mobile') || btn.id.includes('btn-top') || btn.id.includes('btn-header') || btn.id === 'lang-btn-nav' || btn.id === 'lang-btn') {
                btn.textContent = lang === 'en' ? 'AR' : 'EN';
            } else {
                btn.textContent = lang === 'en' ? 'العربية' : 'English';
            }
        });
        document.documentElement.lang = lang;

        // --- NUCLEAR FIX: Physically hide the sidebar from the layout engine during transition ---
        const sidebar = document.getElementById('main-sidebar');
        const overlay = document.getElementById('sidebar-overlay');

        if (sidebar) sidebar.style.display = 'none';
        if (overlay) overlay.style.display = 'none';

        document.documentElement.lang = lang;
        document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
        document.body.style.fontFamily = lang === 'en' ? '"Inter", sans-serif' : '"Tajawal", sans-serif';

        // Force browser to process the disappearance and direction change
        void document.documentElement.offsetHeight;

        // Restore visibility instantly
        setTimeout(() => {
            if (sidebar) sidebar.style.display = 'flex';
            if (overlay) overlay.style.display = 'block';
        }, 30);

        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            if (key === 'port_title' && window.projectAreas && window.projectAreas.length > 0) {
                el.textContent = window.projectAreas.filter(a => a !== 'Other').join(' • ');
            } else if (t[key]) {
                if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.getAttribute('placeholder')) {
                    el.placeholder = t[key];
                } else if (el.tagName === 'OPTION') {
                    el.textContent = t[key];
                } else {
                    el.innerHTML = t[key];
                }
            }
        });

        // Update Project Rendering
        if (typeof renderProjectCards === 'function') {
            renderProjectCards();
            if (typeof renderFeaturedProjects === 'function') renderFeaturedProjects();
        }

        // Refresh filter labels/dropdowns
        if (typeof refreshFilterOptions === 'function') {
            refreshFilterOptions();
        }
        if (typeof updateFilterLabels === 'function') updateFilterLabels();
    };

    // Load Data First
    loadData().then(() => {
        // --- CRITICAL FIX: Filter out ghost/empty units (e.g. 193-350) ---
        if (window.inventory && Array.isArray(window.inventory)) {
            const initialCount = window.inventory.length;
            window.inventory = window.inventory.filter(u => {
                // Keep unit only if it has a Code AND (Price OR Area)
                // This removes rows that are completely empty or just have a project ID
                const hasCode = u.code && u.code !== 'NULL' && u.code !== 'undefined';
                const hasPrice = u.price && u.price > 0;
                const hasArea = u.area && u.area > 0;
                return hasCode && (hasPrice || hasArea);
            });
            console.log(`[Data Sanitization] Removed ${initialCount - window.inventory.length} ghost units.`);
            inventory = window.inventory; // Sync local variable
            if (window.allUnits) window.allUnits = window.inventory;
        }
        if (typeof setLanguage === 'function') setLanguage(currentLang);

        // --- ADDED: Handle Query Parameters for Direct Linking ---
        const urlParams = new URLSearchParams(window.location.search);
        const projectParam = urlParams.get('project');
        const forceUnits = urlParams.get('view_units') === 'true';
        const areaParam = urlParams.get('area');
        if (projectParam && projectMetadata[projectParam]) {
            setTimeout(() => {
                window.openProject(projectParam, forceUnits);
            }, 1000); // Wait for data to load and parallax
        } else if (areaParam) {
            setTimeout(() => {
                if (typeof window.refreshByArea === 'function') {
                    window.refreshByArea(areaParam);
                }
            }, 1000);
        }

        // Hide Loader
        const loader = document.getElementById('page-loader');
        if (loader) {
            loader.style.opacity = '0';
            setTimeout(() => {
                loader.style.display = 'none';
            }, 500);
        }
    }).catch(err => {
        console.error("Critical error during data load:", err);
        // Force hide loader anyway to unblock UI
        const loader = document.getElementById('page-loader');
        if (loader) loader.style.display = 'none';
    });


    const loginBtn = document.getElementById('login-btn');
    const adminHeaderBtn = document.getElementById('admin-header-btn');
    const sidebar = document.getElementById('main-sidebar');
    const adminOpenBtn = document.getElementById('open-admin-btn');
    const adminDashboard = document.getElementById('sys-cfg-2026');
    const adminCloseBtn = document.getElementById('close-admin');
    const adminProjList = document.getElementById('admin-project-list');
    const settingsBtn = document.getElementById('admin-settings-btn');
    const settingsView = document.getElementById('admin-settings-view');
    const unitHeader = document.getElementById('unit-mgmt-header');
    const tableArea = document.getElementById('unit-table-area');
    const addProjView = document.getElementById('add-project-view');
    const addUnitContainer = document.getElementById('add-unit-container');

    // Add Unit button - clear images when opening new unit form
    const showAddUnitBtn = document.getElementById('show-add-unit-form');
    if (showAddUnitBtn) {
        showAddUnitBtn.addEventListener('click', () => {
            if (addUnitContainer) {
                addUnitContainer.style.display = 'block';
                // Reset form first
                const form = document.getElementById('addUnitForm');
                if (form) form.reset();

                // ?? CRITICAL: Populate building context immediately
                const bDisplay = document.getElementById('new-unit-building-display');
                const activeSidebarProj = document.querySelector('.admin-proj-item.active');
                const currentB = window.selectedBuildingId || (activeSidebarProj ? activeSidebarProj.dataset.id : null);

                if (bDisplay && currentB) {
                    bDisplay.value = currentB;
                    window.selectedBuildingId = currentB;
                } else if (bDisplay) {
                    bDisplay.value = 'Select a Building';
                }

                window.clearUnitImages();
                isEditingUnit = false;
                editingUnitCode = null;

                const formHeader = document.querySelector('#add-unit-container .form-header h4');
                if (formHeader) formHeader.textContent = currentLang === 'ar' ? 'إضافة وحدة جديدة' : 'Add New Unit';
            }
        });
    }

    // Cancel button - clear images and hide form
    const cancelAddUnitBtn = document.getElementById('cancel-add-unit');
    if (cancelAddUnitBtn) {
        cancelAddUnitBtn.addEventListener('click', () => {
            if (addUnitContainer) addUnitContainer.style.display = 'none';
            window.clearUnitImages();
            isEditingUnit = false;
            editingUnitCode = null;
        });
    }


    // --- Improved Sidebar Logic ---
    const sidebarToggles = document.querySelectorAll('#sidebar-toggle-mobile, #sidebar-toggle-topbar, #sidebar-toggle, #sidebar-toggle-header, #sidebar-toggle-desktop');
    const sidebarClose = document.getElementById('sidebar-close');
    const sidebarOverlay = document.getElementById('sidebar-overlay');
    const sidebarLinks = document.querySelectorAll('.sidebar-links a');

    // defined at line 495: const sidebar = document.getElementById('main-sidebar');

    window.toggleSidebar = function (show) {
        console.log("Toggle Sidebar Global:", show);
        const sb = document.getElementById('main-sidebar');
        const overlay = document.getElementById('sidebar-overlay');

        if (!sb) return console.error("Sidebar element not found");

        if (show) {
            sb.classList.remove('closing');
            sb.classList.add('active');
            if (overlay) overlay.classList.add('active');
            document.body.style.overflow = 'hidden';

            // Staggered child animation reset
            const links = sb.querySelectorAll('.sidebar-links li');
            links.forEach((li, idx) => {
                li.style.animation = 'none';
                li.offsetHeight; // trigger reflow
                li.style.animation = `sidebarItemIn 0.5s cubic - bezier(0.2, 0.8, 0.2, 1) forwards ${0.1 + (idx * 0.05)} s`;
            });
        } else {
            sb.classList.add('closing');
            if (overlay) overlay.classList.remove('active');
            document.body.style.overflow = '';

            // Wait for animation
            setTimeout(() => {
                sb.classList.remove('active');
                sb.classList.remove('closing');
            }, 500);
        }
    };

    window.toggleQuickNavDropdown = function (e) {
        // Only prevent default if it's the toggle button (href is #)
        const target = e.currentTarget || e.target;
        if (target && target.getAttribute('href') === '#') {
            if (e) e.preventDefault();
        }

        const dropdown = document.getElementById('quick-projects-dropdown');
        if (dropdown) {
            dropdown.classList.toggle('active');
            const btn = document.querySelector('.quick-nav-drop-btn i');
            if (btn) btn.style.transform = dropdown.classList.contains('active') ? 'rotate(180deg)' : 'rotate(0deg)';
        }
    };

    // 🚀 PREDICTIVE PRE-FETCHING: Load data when user hovers a project
    function initPredictivePrefetch() {
        const projectItems = document.querySelectorAll('.project-select-btn, .queen-menu-item, .hero-dot, .achieve-card');
        projectItems.forEach(item => {
            item.addEventListener('mouseenter', () => {
                const p = item.dataset.project || item.textContent.trim();
                const slugMap = {
                    "porto-golf-marina": "Porto Golf Marina",
                    "porto-said": "Porto Said",
                    "celebration": "Celebration",
                    "Porto Golf Marina": "Porto Golf Marina",
                    "Porto Said": "Porto Said",
                    "Celebration": "Celebration"
                };
                const finalP = slugMap[p] || p;
                if (finalP && window.firebaseQueries && finalP.length > 3) {
                    // console.log(`🔮 Predictive Prefetch: ${finalP}`);
                    window.firebaseQueries.getUnitsByProject(finalP).catch(() => { });
                }
            }, { once: true }); // Only prefetch once per item per session
        });
    }
    initPredictivePrefetch();

    // Close mobile dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.quick-nav-dropdown')) {
            const dropdown = document.getElementById('quick-projects-dropdown');
            if (dropdown && dropdown.classList.contains('active')) {
                dropdown.classList.remove('active');
                const btn = document.querySelector('.quick-nav-drop-btn i');
                if (btn) btn.style.transform = 'rotate(0deg)';
            }
        }
    });

    if (sidebarOverlay) {
        sidebarOverlay.addEventListener('click', () => {
            toggleSidebar(false);
        });
    }

    if (sidebarToggles.length > 0) {
        console.log(`Found ${sidebarToggles.length} sidebar toggle buttons`);
        sidebarToggles.forEach(toggle => {
            toggle.onclick = (e) => {
                if (e) {
                    e.preventDefault();
                    e.stopPropagation();
                }
                toggleSidebar(true);
            };
        });
    } else {
        console.error("Sidebar toggle button NOT found in DOM");
    }

    if (sidebarClose) {
        sidebarClose.onclick = () => toggleSidebar(false);
    }

    if (sidebarOverlay) {
        sidebarOverlay.onclick = () => toggleSidebar(false);
    }

    // Close on link click (using addEventListener to avoid overwriting onclick attributes)
    sidebarLinks.forEach(link => {
        link.addEventListener('click', () => toggleSidebar(false));
    });

    // --- Login / Logout Logic (Handled by js/auth.js now) ---
    isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    userRole = localStorage.getItem('userRole') || 'guest';

    // Call it once on load
    window.updateLoginButton();

    // --- Admin Dashboard Logic with Dynamic Loading ---
    async function loadAdminResources() {
        if (window.adminResourcesLoaded) return Promise.resolve();

        console.log("Loading Admin Resources...");
        const scripts = [
            "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js",
            "https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.5.31/jspdf.plugin.autotable.min.js",
            "https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js",
            "utils/image-loader-utils.js",
            "pages/admin-smart-entry.js",
            "pages/admin-ui.js"
        ];

        for (const src of scripts) {
            try {
                await new Promise((resolve, reject) => {
                    const script = document.createElement('script');
                    script.src = src;
                    script.onload = resolve;
                    script.onerror = () => {
                        console.warn(`Failed to load: ${src} `);
                        resolve(); // Resolve anyway to continue loading others
                    };
                    document.body.appendChild(script);
                });
            } catch (e) {
                console.error("Script load error:", e);
            }
        }
        window.adminResourcesLoaded = true;
        console.log("Admin Resources Loaded Successfully.");
    }

    const adminDashboardOpener = adminOpenBtn || adminHeaderBtn;
    if (adminDashboardOpener) {
        adminDashboardOpener.addEventListener('click', async (e) => {
            e.preventDefault();
            console.log("Admin button clicked...");

            // Lazy load admin resources
            try {
                await loadAdminResources();
                if (adminDashboard) {
                    adminDashboard.classList.add('active');
                    console.log("Admin Dashboard opened.");
                    if (typeof renderAdminProjectList === 'function') renderAdminProjectList();
                }
            } catch (err) {
                console.error("Error opening admin dashboard:", err);
            }
        });
    }

    // Additional check for mobile/header buttons
    [adminOpenBtn, adminHeaderBtn].forEach(btn => {
        if (btn && btn !== adminDashboardOpener) {
            btn.addEventListener('click', () => adminDashboardOpener.click());
        }
    });


    if (adminCloseBtn) {
        adminCloseBtn.addEventListener('click', () => {
            adminDashboard.classList.remove('active');
        });
    }


    // Helper for Area Normalization
    // Helper for Area Normalization (Case-insensitive)
    window.normalizeProjectArea = function (area) {
        if (!area) return 'Other';
        let a = area.trim().toLowerCase();
        if (a.includes('porto-golf') || a.includes('porto golf') || a === 'porto golf') return "Porto Golf Marina";
        if (a === 'porto said' || a.includes('porto-said')) return "Porto Said";
        if (a === 'celebration' || a === 'new alamein' || a.includes('celebration')) return "Celebration";

        // Capitalize default
        return area.trim();
    };

    /**
     * 🔗 DATABASE CONNECTION HELPER
     * Matches a unit to its corresponding Building-Level Payment Plan (Offer)
     */
    window.getMatchedOfferForUnit = function (unit) {
        if (unit.payment_plan && unit.payment_plan !== 'N/A' && unit.payment_plan !== '-') return unit.payment_plan;

        // 1. Get Building Context
        const bName = unit.project || unit.building_id || unit.buildingCode;
        if (!bName) return null;

        const bMeta = projectMetadata[bName];
        if (!bMeta) return null;

        // 2. Refresh Offers if needed (Cloudflare Sync)
        const areaPlans = bMeta.offers || [];
        if (areaPlans.length === 0) return null;

        // 3. Match Logic: Area-Specific -> Generic -> First Available
        const areaVal = Number(unit.area);
        const activePlans = areaPlans.filter(p => !p.status || p.status === 'active')
            .sort((a, b) => (a.priority || 99) - (b.priority || 99));

        if (activePlans.length === 0) return null;

        const matched = activePlans.find(p => Number(p.linkedArea) === areaVal) ||
            activePlans.find(p => !p.linkedArea || Number(p.linkedArea) === 0) ||
            activePlans[0];

        return matched ? matched.name : null;
    };

    window.getSortedAreasList = function (areas) {
        const areaPri = ["Porto Golf Marina", "Porto Said", "Celebration"];
        return [...areas].sort((a, b) => {
            const normA = normalizeProjectArea(a);
            const normB = normalizeProjectArea(b);
            const idxA = areaPri.indexOf(normA);
            const idxB = areaPri.indexOf(normB);

            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });
    };

    window.getSortedBuildingsList = function (buildingNames) {
        const areaPri = ["Porto Golf Marina", "Porto Said", "Celebration"];
        const bPri = ['133', '136', '230', '243', '121', '224'];

        return [...buildingNames].sort((nameA, nameB) => {
            const metaA = projectMetadata[nameA];
            const metaB = projectMetadata[nameB];

            // 1. Sort by Area Priority
            const areaA = metaA ? normalizeProjectArea(metaA.projectArea) : 'Other';
            const areaB = metaB ? normalizeProjectArea(metaB.projectArea) : 'Other';

            if (areaA !== areaB) {
                const idxA = areaPri.indexOf(areaA);
                const idxB = areaPri.indexOf(areaB);
                if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                if (idxA !== -1) return -1;
                if (idxB !== -1) return 1;
                return areaA.localeCompare(areaB);
            }

            // 2. Sort by Building Priority (within same area)
            // Priority check for Porto Golf
            const isGolf = (areaA === 'Porto Golf Marina');

            if (isGolf || (nameA.length <= 4 && bPri.some(x => nameA.includes(x)))) {
                const getPri = (name) => {
                    for (let i = 0; i < bPri.length; i++) {
                        if (name.includes(bPri[i])) return i;
                    }
                    return 999;
                };
                const pA = getPri(nameA);
                const pB = getPri(nameB);
                if (pA !== pB) return pA - pB;
            }
            return nameA.localeCompare(nameB);
        });
    };

    window.renderAdminProjectList = function () {
        window.renderAdminProjectList = renderAdminProjectList; // Re-exposure for safety
        const adminProjList = document.getElementById('admin-project-list');
        const settingsBtn = document.getElementById('admin-settings-btn');
        if (!adminProjList) return;
        adminProjList.innerHTML = '';

        // Group by Project Area (Normalized)
        const areas = {};
        projectNames.forEach(pName => {
            const meta = projectMetadata[pName];
            if (meta && meta.deleted) return; // Skip deleted buildings
            if (pName === 'B-SHOPS') return; // Skip old duplicate - replaced by SHOPS

            const area = normalizeProjectArea(meta ? meta.projectArea : 'Other');
            if (!areas[area]) areas[area] = [];
            areas[area].push(pName);
        });

        let areaKeys = Object.keys(areas);
        areaKeys = getSortedAreasList(areaKeys);

        areaKeys.forEach(area => {
            const areaHeader = document.createElement('div');
            areaHeader.className = 'sidebar-area-category';
            areaHeader.style.padding = '25px 25px 10px';
            areaHeader.style.textAlign = 'center';
            areaHeader.innerHTML = `<h3 style="font-size: 0.7rem; letter-spacing: 1.5px; opacity: 0.4; font-weight: 800; text-transform: uppercase; margin:0;">${area}</h3>`;
            adminProjList.appendChild(areaHeader);

            // Filter out projects/others from building list
            const areaBuildings = (areas[area] || []).filter(p => projectMetadata[p]?.category === 'properties');
            const sortedBuildings = getSortedBuildingsList(areaBuildings);

            sortedBuildings.forEach(pName => {
                const div = document.createElement('div');
                div.className = 'admin-proj-item';
                const pDelivery = projectMetadata[pName]?.delivery || 'Ready';

                div.innerHTML = `
        <div style="display:flex; align-items:center; gap:10px;">
                        <i class="fas fa-building" style="opacity:0.3; font-size:0.8rem;"></i>
                        <span>${pName}</span>
                    </div>
        <span style="font-size: 0.7rem; opacity: 0.4; font-weight:400;">${pDelivery}</span>
    `;

                div.onclick = () => {
                    document.querySelectorAll('.admin-proj-item').forEach(el => el.classList.remove('active'));
                    if (settingsBtn) settingsBtn.classList.remove('active');
                    div.classList.add('active');

                    if (settingsView) settingsView.style.display = 'none';
                    if (addProjView) addProjView.style.display = 'none';
                    if (unitHeader) unitHeader.style.display = 'block';
                    if (tableArea) tableArea.style.display = 'block';
                    if (addUnitContainer) addUnitContainer.style.display = 'none';

                    renderAdminUnits(pName);
                };
                adminProjList.appendChild(div);
            });
        });
    };

    // --- Consolidated Admin Navigation Logic ---
    if (settingsBtn) {
        settingsBtn.onclick = () => {
            // Reset active states in sidebar
            document.querySelectorAll('.admin-proj-item').forEach(el => el.classList.remove('active'));
            settingsBtn.classList.add('active');

            // Toggle Visibility
            if (settingsView) settingsView.style.display = 'block';
            if (unitHeader) unitHeader.style.display = 'none';
            if (tableArea) tableArea.style.display = 'none';
            if (addProjView) addProjView.style.display = 'none';
            if (addUnitContainer) addUnitContainer.style.display = 'none';

            // Sync current areas before render - Normalize names to match projectAreas
            const metaAreas = Object.values(projectMetadata).map(m => m.projectArea);
            metaAreas.forEach(a => {
                if (!a) return;
                const normalized = normalizeProjectArea(a);
                if (normalized && !projectAreas.includes(normalized)) {
                    projectAreas.push(normalized);
                }
            });

            // Initialize the Settings List & Filters
            renderSettingsProjectList();
        };
    }

    function renderSettingsProjectList() {
        const listContainer = document.getElementById('settings-project-list');
        if (!listContainer) return;
        listContainer.innerHTML = '';

        const filters = getAdminFilters();

        // Normalize and Sync projectAreas
        const metaAreas = Object.values(projectMetadata)
            .filter(m => !m.deleted && m.category !== 'projects')
            .map(m => m.projectArea || 'Other');
        let unifiedAreas = [...new Set([...projectAreas, ...metaAreas].map(a => a.trim()))];

        // 🛡️ CRITICAL FIX: Filter out areas that are marked as deleted
        unifiedAreas = unifiedAreas.filter(a => {
            const meta = projectMetadata[a];
            if (meta && meta.deleted) return false;
            return true;
        });

        // Custom Sort for Areas: Porto Golf -> Porto Said -> Celebration -> Others
        const areaPri = ["Porto Golf Marina", "Porto Said", "Celebration"];
        unifiedAreas.sort((a, b) => {
            const normA = normalizeProjectArea(a);
            const normB = normalizeProjectArea(b);
            const idxA = areaPri.indexOf(normA);
            const idxB = areaPri.indexOf(normB);

            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return a.localeCompare(b);
        });

        // Initial clean list
        let activeAreas = unifiedAreas.filter((v, i, a) => a.findIndex(t => t.toLowerCase() === v.toLowerCase()) === i);

        // We filter buildings first, then decide which areas to show
        let filteredBuildings = projectNames.filter(pName => {
            const meta = projectMetadata[pName];
            if (!meta || meta.deleted) return false;
            if (pName === 'B-SHOPS') return false; // Old duplicate, replaced by SHOPS

            // 🛡️ ONLY show real buildings (properties), hide project containers
            if (meta.category === 'projects') return false;

            // Search
            if (filters.search && !pName.toLowerCase().includes(filters.search)) return false;

            // Project Dropdown
            if (filters.project && meta.projectArea !== filters.project) return false;

            // Building Dropdown
            if (filters.building && pName !== filters.building) return false;

            // Delivery Dropdown
            if (filters.delivery && meta.delivery !== filters.delivery) return false;

            // Status Dropdown
            if (filters.status) {
                const status = (meta.constStatus || '').toLowerCase();
                if (filters.status === 'Ready' && status !== 'ready') return false;
                if (filters.status === 'Under Construction' && status.includes('ready')) return false; // Rough logic
            }

            return true;
        });

        // Filter Areas based on remaining buildings
        if (filters.search || filters.project || filters.building || filters.delivery || filters.status) {
            const activeAreaNames = new Set(filteredBuildings.map(p => projectMetadata[p]?.projectArea));
            activeAreas = activeAreas.filter(a => activeAreaNames.has(a));
        }

        activeAreas.forEach(areaName => {
            let buildingsInArea = filteredBuildings.filter(pName => {
                const area = projectMetadata[pName]?.projectArea || normalizeProjectArea(pName);
                return area.toLowerCase().trim() === areaName.toLowerCase().trim();
            });

            // 🛡️ HIDE EMPTY GHOST FOLDERS (Unless they are primary areas)
            const isPrimary = areaPri.some(p => p.toLowerCase() === areaName.toLowerCase());
            if (buildingsInArea.length === 0 && !isPrimary) return;

            const folder = document.createElement('div');
            folder.className = 'hierarchy-folder';
            folder.style.marginBottom = '15px';
            folder.style.background = 'var(--bg-secondary)';
            folder.style.borderRadius = '16px';
            folder.style.overflow = 'hidden';
            folder.style.border = '1px solid var(--border-light)';
            folder.style.transition = '0.3s';

            // Custom Sort for Priority Buildings in Porto Golf
            if (normalizeProjectArea(areaName) === 'Porto Golf Marina') {
                const bPri = ['B133', 'B136', 'B230', 'B243', 'B121', 'B224'];
                buildingsInArea.sort((a, b) => {
                    const getPri = (name) => {
                        for (let i = 0; i < bPri.length; i++) {
                            if (name.includes(bPri[i])) return i;
                        }
                        return 999;
                    };
                    const pA = getPri(a);
                    const pB = getPri(b);
                    if (pA !== pB) return pA - pB; // Sort by priority index
                    return a.localeCompare(b); // Then alphabetical
                });
            } else {
                buildingsInArea.sort(); // Default alphabetical for others
            }

            folder.innerHTML = `
        <div class="folder-header" style="padding: 20px 25px; display: flex; justify-content: space-between; align-items: center; cursor: pointer; user-select: none;">
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <div style="width: 40px; height: 40px; border-radius: 10px; background: rgba(201, 162, 63, 0.1); display: flex; align-items: center; justify-content: center; color: var(--gold-main);">
                            <i class="fas fa-folder"></i>
                        </div>
                        <div>
                            <h3 style="margin:0; font-size: 1.1rem; font-weight: 800; color: var(--navy-deep);">${areaName}</h3>
                            <span style="font-size: 0.75rem; opacity: 0.5;">${buildingsInArea.length} Buildings</span>
                        </div>
                    </div>
                    <div style="display: flex; gap: 8px;" onclick="event.stopPropagation();">
                        <button class="btn-icon" title="Edit Project Details" onclick="window.editArea('${areaName}')" 
                                style="background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: none; width: 35px; height: 35px; border-radius: 8px;">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" title="Add Building to this Project" onclick="window.triggerAddBuildingFor('${areaName}')" 
                                style="background: rgba(59, 130, 246, 0.1); color: #3b82f6; border: none; width: 35px; height: 35px; border-radius: 8px;">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn-icon" title="Delete Project" onclick="window.AdminUI ? window.AdminUI.promptDelete('${areaName}', 'area') : deleteArea('${areaName}')"
                                style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: none; width: 35px; height: 35px; border-radius: 8px;">
                            <i class="fas fa-trash"></i>
                        </button>
                        <i class="fas fa-chevron-down folder-chevron" style="margin-left: 10px; opacity: 0.3; transition: 0.3s;"></i>
                    </div>
                </div>
        <div class="folder-content" style="max-height: 0; overflow: hidden; transition: 0.4s ease-out; background: var(--bg-main);">
            <div class="buildings-inner" style="padding: 10px 25px 25px;">
                <!-- Buildings list -->
            </div>
        </div>
    `;

            const bInner = folder.querySelector('.buildings-inner');
            if (buildingsInArea.length === 0) {
                bInner.innerHTML = '<p style="font-size:0.85rem; opacity:0.5; font-style: italic; padding: 10px 0;">No buildings initialized in this project area.</p>';
            }

            buildingsInArea.forEach(pName => {
                const meta = projectMetadata[pName];
                const bDiv = document.createElement('div');
                bDiv.className = 'admin-proj-item';
                bDiv.style.margin = '5px 0';
                bDiv.style.padding = '12px 15px';
                bDiv.style.justifyContent = 'space-between';
                bDiv.style.background = 'var(--bg-secondary)';
                bDiv.style.border = '1px solid rgba(0,0,0,0.03)';

                // Get cover image if available
                let coverImageHTML = '';
                if (meta && meta.image) {
                    const imageData = Array.isArray(meta.image) ? meta.image[0] : meta.image;
                    const imageSrc = typeof imageData === 'object' ? imageData.data : imageData;
                    if (imageSrc) {
                        coverImageHTML = `<img src="${imageSrc}" alt="${pName}" style="width: 45px; height: 45px; object-fit: cover; border-radius: 8px; border: 2px solid rgba(212, 175, 55, 0.3);" onerror="this.style.display='none'">`;
                    }
                }

                // If no image, show placeholder icon
                if (!coverImageHTML) {
                    coverImageHTML = '<div style="width: 45px; height: 45px; background: rgba(212, 175, 55, 0.1); border-radius: 8px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-building" style="color:var(--gold-main); font-size: 1rem;"></i></div>';
                }

                bDiv.innerHTML = `
        <div style="display:flex; align-items:center; gap:12px;">
            ${coverImageHTML}
    <div style="display: flex; flex-direction: column; gap: 3px;">
        <span style="font-weight:600; font-size: 0.9rem;">${pName}</span>
        <span style="font-size:0.7rem; opacity:0.5;">Del: ${meta?.delivery || 'N/A'}</span>
    </div>
                    </div>
        <div style="display:flex; gap:5px;">
            <button class="btn-icon edit" onclick="event.stopPropagation(); window.editProject('${pName}')" title="Edit Building"
                style="width:30px; height:30px; font-size: 0.8rem; color:#3b82f6; background:rgba(59, 130, 246, 0.1);">
                <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon delete" onclick="event.stopPropagation(); window.AdminUI ? window.AdminUI.promptDelete('${pName}', 'project') : deleteProject('${pName}')" title="Delete Building"
                style="width:30px; height:30px; font-size: 0.8rem;">
                <i class="fas fa-trash-alt"></i>
            </button>
        </div>
                `;
                bInner.appendChild(bDiv);
            });

            // Toggle Logic
            const header = folder.querySelector('.folder-header');
            const content = folder.querySelector('.folder-content');
            const chevron = folder.querySelector('.folder-chevron');

            header.onclick = () => {
                const isOpen = content.style.maxHeight !== '0px';
                // Close all others first optionally or just toggle this one
                content.style.maxHeight = isOpen ? '0' : content.scrollHeight + 'px';
                chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
                folder.style.borderColor = isOpen ? 'var(--border-light)' : 'var(--gold-main)';
                folder.style.boxShadow = isOpen ? 'none' : '0 10px 25px rgba(0,0,0,0.05)';
            };

            listContainer.appendChild(folder);
        });

        // If no results from filter
        if (projectAreas.length === 0) {
            listContainer.innerHTML = '<div style="text-align:center; padding:40px; opacity:0.6;">No buildings match your filter.</div>';
        }

        updateAreaDropdown();
        updateAdminFilterDropdowns(); // Populate filter options
    }

    // --- Admin Filter Logic ---
    function getAdminFilters() {
        return {
            search: document.getElementById('admin-filter-search')?.value.toLowerCase() || '',
            project: document.getElementById('admin-filter-project')?.value || '',
            building: document.getElementById('admin-filter-building')?.value || '',
            delivery: document.getElementById('admin-filter-delivery')?.value || '',
            status: document.getElementById('admin-filter-status')?.value || ''
        };
    }

    function setupAdminFilterListeners() {
        const ids = ['admin-filter-search', 'admin-filter-project', 'admin-filter-building', 'admin-filter-delivery', 'admin-filter-status'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => renderSettingsProjectList());
                el.addEventListener('change', () => renderSettingsProjectList());
            }
        });
    }
    // Initialize listeners once
    setupAdminFilterListeners();

    function updateAdminFilterDropdowns() {
        const projSel = document.getElementById('admin-filter-project');
        const bldgSel = document.getElementById('admin-filter-building');
        const delSel = document.getElementById('admin-filter-delivery');

        if (!projSel || !bldgSel || !delSel) return;

        // Preserve current selection if possible
        const currProj = projSel.value;
        const currBldg = bldgSel.value;
        const currDel = delSel.value;

        // 1. Projects
        const distinctProjects = [...new Set(Object.values(projectMetadata).map(m => m.projectArea))].sort();
        projSel.innerHTML = '<option value="">All Projects</option>' + distinctProjects.map(p => `<option value="${p}">${p}</option>`).join('');
        if (distinctProjects.includes(currProj)) projSel.value = currProj;

        // 2. Buildings (Filtered by Project if selected)
        let relevantBuildings = projectNames;
        if (currProj) relevantBuildings = relevantBuildings.filter(p => projectMetadata[p]?.projectArea === currProj);
        bldgSel.innerHTML = '<option value="">All Buildings</option>' + relevantBuildings.sort().map(b => `<option value="${b}">${b}</option>`).join('');
        if (relevantBuildings.includes(currBldg)) bldgSel.value = currBldg;

        // 3. Delivery
        const distinctDelivery = [...new Set(relevantBuildings.map(p => projectMetadata[p]?.delivery).filter(Boolean))].sort();
        delSel.innerHTML = '<option value="">All Dates</option>' + distinctDelivery.map(d => `<option value="${d}">${d}</option>`).join('');
        if (distinctDelivery.includes(currDel)) delSel.value = currDel;
    }

    // triggerAddBuildingFor duplicate removed (defined later with more context)


    function updateAreaDropdown() {
        const select = document.getElementById('new-proj-area-loc');
        const delAreaSelect = document.getElementById('delete-area-select');
        const delBldgSelect = document.getElementById('delete-building-select');

        if (select) {
            const currentVal = select.value;
            select.innerHTML = '<option value="">Select Project</option>';
            projectAreas.sort().forEach(area => {
                const opt = document.createElement('option');
                opt.value = area;
                opt.textContent = area;
                select.appendChild(opt);
            });
            if (currentVal && projectAreas.includes(currentVal)) select.value = currentVal;
        }

        if (delAreaSelect) {
            delAreaSelect.innerHTML = '<option value="">Select Project to Delete</option>';
            projectAreas.sort().forEach(area => {
                const opt = document.createElement('option');
                opt.value = area;
                opt.textContent = area;
                delAreaSelect.appendChild(opt);
            });
        }

        if (delBldgSelect) {
            delBldgSelect.innerHTML = '<option value="">Select Building to Delete</option>';
            projectNames.sort().forEach(p => {
                const opt = document.createElement('option');
                opt.value = p;
                opt.textContent = p;
                delBldgSelect.appendChild(opt);
            });
        }
    }

    window.addNewArea = async function () {
        const pass = prompt("Enter Master Password to add a new project area:");
        if (pass !== '792001') {
            alert("Incorrect password. Operation cancelled.");
            return;
        }

        const input = document.getElementById('sidebar-new-area-input');
        const name = input.value.trim();
        if (!name) return;
        if (projectAreas.includes(name)) {
            alert("Project already exists.");
            return;
        }

        // ?? Sync to Cloudflare/Firebase (Admin Service)
        if (window.robelAdminAPI && window.robelAdminAPI.createProject) {
            try {
                await window.robelAdminAPI.createProject({
                    name: name,
                    id: name.toLowerCase().replace(/\s+/g, '-'),
                    status: 'buy'
                });
            } catch (e) {
                console.warn("Cloudflare Project Sync Failed:", e);
            }
        }

        projectAreas.push(name);
        input.value = '';
        renderSettingsProjectList();
        renderAdminProjectList();
        alert("Project added successfully to Cloudflare Database.");
    }

    window.deleteArea = function (areaName) {
        const pass = prompt("Enter Master Password to delete project area:");
        if (pass !== '792001') {
            alert("Incorrect password. Operation cancelled.");
            return;
        }
        if (!confirm(`Are you sure you want to delete Project(Area) "${areaName}" and ALL its buildings?`)) return;

        const buildingsToDelete = projectNames.filter(pName => projectMetadata[pName] && projectMetadata[pName].projectArea === areaName);

        buildingsToDelete.forEach(pName => {
            window.deleteProject(pName, true);
        });

        projectAreas = projectAreas.filter(a => a !== areaName);
        renderAdminProjectList();
        renderSettingsProjectList();
        alert("Project removed.");
    }

    // --- SORTING HELPER ---
    window.toggleAdminUnitSort = function () {
        window.adminUnitSortOrder = window.adminUnitSortOrder === 'asc' ? 'desc' : 'asc';
        const icon = document.getElementById('sort-icon-unit');
        if (icon) {
            icon.className = window.adminUnitSortOrder === 'asc' ? 'fas fa-sort-up text-gold-main' : 'fas fa-sort-down text-gold-main';
        }
        // Re-render current building
        const pName = document.getElementById('mgr-project-name').textContent;
        if (pName && pName !== 'Select Building') {
            renderAdminUnits(pName);
        }
    };

    function renderAdminUnits(pName) {
        // --- FIX: Expose selected building/project names globally ---
        window.selectedBuildingId = pName;
        window.currentProjectId = pName;
        window.renderAdminUnits = renderAdminUnits;

        // Find the actual project name from units that belong to this building/project identifier
        const sampleUnit = inventory.find(u =>
            (u.project === pName) || (u.projectId === pName) || (u.project_id === pName) ||
            (u.buildingCode === pName) || (u.buildingId === pName) || (u.building_id === pName)
        );
        window.currentProjectName = sampleUnit ? (sampleUnit.project || sampleUnit.project_name || pName) : pName;
        // ------------------------------------------------

        // FAIL-SAFE: If inventory is empty, try to load it and retry rendering
        if (inventory.length === 0) {
            console.warn("[renderAdminUnits] Inventory is empty! Triggering loadData...");
            if (typeof window.loadData === 'function') {
                window.loadData().then(() => {
                    setTimeout(() => renderAdminUnits(pName), 500);
                });
                return; // Exit this run, wait for retry
            }
        }

        const unitList = document.getElementById('admin-unit-list');
        const unitCards = document.getElementById('admin-unit-cards-list');
        const projTitle = document.getElementById('mgr-project-name');
        const projStats = document.getElementById('mgr-stats-brief');
        const addBtn = document.getElementById('show-add-unit-form');
        const addContainer = document.getElementById('add-unit-container');

        if (addContainer) addContainer.style.display = 'none';

        // Reset Local Filters when switching project
        const filterSearch = document.getElementById('admin-unit-search');
        const filterFloor = document.getElementById('admin-unit-filter-floor');
        const filterArea = document.getElementById('admin-unit-filter-area');

        const filterView = document.getElementById('admin-unit-filter-view');

        // We only reset if the project actually changed (not a refresh from filter button)
        const currentActiveProj = projTitle.textContent;
        if (currentActiveProj !== pName) {
            if (filterSearch) filterSearch.value = '';
            if (filterFloor) filterFloor.value = '';
            if (filterView) filterView.value = '';
            if (filterArea) filterArea.value = '';
        }

        // Populate View Filter Dropdown
        // --- IMPROVED FILTER POPULATION & LOGIC ---

        // 🔧 STRICT MATCHER: Use same logic as isUnitInTarget to prevent wrong building matches
        // This prevents B13 from matching B133, etc.
        const targetNormalized = normalizeId(pName);

        const allMatches = inventory.filter(u => isUnitInTarget(u, pName));

        // 1. Populate View Filter (Dynamically from matched units)
        if (filterView) {
            const uniqueViews = [...new Set(allMatches.map(u => u.view))].filter(Boolean).sort();
            const currentVal = filterView.value;
            // Only update if options changed or empty (to preserve selection if valid)
            // Ideally we re-render options but keep selection
            filterView.innerHTML = '<option value="">All Views</option>' +
                uniqueViews.map(v => `<option value="${v}" ${v === currentVal ? 'selected' : ''}>${v}</option>`).join('');
            // Restore selection if possible, otherwise it falls to ""
            if (currentVal && uniqueViews.includes(currentVal)) filterView.value = currentVal;
        }

        // 2. Populate Floor Filter (Dynamically from matched units)
        if (filterFloor) {
            const uniqueFloors = [...new Set(allMatches.map(u => u.floor))].filter(Boolean).sort((a, b) => {
                const aN = parseInt(a);
                const bN = parseInt(b);
                if (isNaN(aN) && isNaN(bN)) return a.localeCompare(b);
                if (isNaN(aN)) return -1;
                if (isNaN(bN)) return 1;
                return aN - bN;
            });
            const currentF = filterFloor.value;
            filterFloor.innerHTML = '<option value="">All Floors</option>' +
                uniqueFloors.map(f => `<option value="${f}" ${f === currentF ? 'selected' : ''}>${f}</option>`).join('');
            if (currentF && uniqueFloors.includes(currentF)) filterFloor.value = currentF;
        }

        // 3. Populate Area Filter (Dynamically from matched units)
        if (filterArea) {
            const uniqueAreas = [...new Set(allMatches.map(u => parseInt(u.area)))]
                .filter(a => !isNaN(a) && a > 0)
                .sort((a, b) => a - b); // Sort numerically
            const currentA = filterArea.value;
            filterArea.innerHTML = '<option value="">All Areas</option>' +
                uniqueAreas.map(a => `<option value="${a}" ${a == currentA ? 'selected' : ''}>${a} m²</option>`).join('');
            if (currentA && uniqueAreas.includes(parseInt(currentA))) filterArea.value = currentA;
        }

        // 4. Apply Filters to Create Final List
        const units = allMatches.filter(u => {
            const searchVal = document.getElementById('admin-unit-search')?.value.toLowerCase().trim() || '';
            const floorVal = document.getElementById('admin-unit-filter-floor')?.value || '';
            const viewVal = document.getElementById('admin-unit-filter-view')?.value || '';
            const areaVal = document.getElementById('admin-unit-filter-area')?.value || '';
            const statusVal = document.getElementById('admin-unit-filter-status')?.value || '';

            const uArea = parseInt(u.area) || 0;

            // Robust text search (Code or View)
            if (searchVal) {
                const uCode = (u.code || u.unit_id || '').toString().toLowerCase();
                const uView = (u.view || '').toString().toLowerCase();
                if (!uCode.includes(searchVal) && !uView.includes(searchVal)) return false;
            }

            // Strict/Loose matching for properties
            if (floorVal && String(u.floor) !== floorVal) return false;
            if (viewVal && (u.view || '') !== viewVal) return false;
            if (statusVal && (u.status || '').toLowerCase() !== statusVal.toLowerCase()) return false;

            // Filter by exact area match if selected
            if (areaVal && uArea !== parseInt(areaVal)) return false;

            return true;
        });
        window.lastAdminFilteredUnits = units; // 🚀 Store for export logic

        // 5. Apply Sorting by Code
        units.sort((a, b) => {
            const valA = (a.code || a.unit_id || '').toString();
            const valB = (b.code || b.unit_id || '').toString();

            // Use numeric-aware string comparison for codes like B1, B2, B10
            return window.adminUnitSortOrder === 'asc'
                ? valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' })
                : valB.localeCompare(valA, undefined, { numeric: true, sensitivity: 'base' });
        });

        console.log(`[renderAdminUnits] Filtered ${inventory.length} units -> ${units.length} matches for "${pName}"`);
        const meta = projectMetadata[pName];
        const t = translations[currentLang];

        projTitle.textContent = pName;

        // --- SYNC BUILDING DISPLAY ---
        const bDisplay = document.getElementById('new-unit-building-display');
        if (bDisplay) bDisplay.value = pName;

        // Update Header Summaries (Total Units & Total Area)
        const headerUnits = document.getElementById('header-total-units');
        const headerArea = document.getElementById('header-total-area');
        if (headerUnits) {
            headerUnits.innerHTML = currentLang === 'ar' ? `عدد الوحدات: <span lang="en">${units.length}</span> ` : `Units: ${units.length} `;
        }
        if (headerArea) {
            const sumArea = units.reduce((sum, u) => sum + (parseInt(u.area) || 0), 0);
            headerArea.innerHTML = currentLang === 'ar' ? `إجمالي المساحة: <span lang="en">${sumArea}</span> م²` : `Total: ${sumArea} m²`;
        }

        const headerTotalPrice = document.getElementById('header-total-price');
        if (headerTotalPrice) {
            const sumPrice = units.reduce((sum, u) => sum + (parseInt(u.price) || 0), 0);
            headerTotalPrice.innerHTML = currentLang === 'ar' ? `إجمالي السعر: <span lang="en">${sumPrice.toLocaleString('en-US')}</span> ` : `Sum: ${sumPrice.toLocaleString('en-US')} `;
        }

        // Render Top Stats (Project-Wide, ignored by table filters)
        if (projStats) {
            const allProjUnits = inventory.filter(u => isUnitInTarget(u, pName));
            const availCount = allProjUnits.filter(u => u.status === 'Available').length;
            const reservedCount = allProjUnits.filter(u => u.status === 'Reserved').length;
            const soldCount = allProjUnits.filter(u => u.status === 'Sold').length;
            projStats.innerHTML = `
                <span class="px-2 py-1 rounded bg-gray-100 text-gray-600 text-[10px] font-bold uppercase flex items-center gap-1">
                    <i class="fas fa-calendar-alt"></i> DEL: ${meta ? meta.delivery : 'N/A'}
                </span>
                <span class="px-2 py-1 rounded bg-green-50 text-green-600 text-[10px] font-bold uppercase"><span lang="en">${availCount}</span> ${t.tab_buy || 'AVAILABLE'}</span>
                <span class="px-2 py-1 rounded bg-orange-50 text-orange-600 text-[10px] font-bold uppercase"><span lang="en">${reservedCount}</span> RESERVED</span>
                <span class="px-2 py-1 rounded bg-red-50 text-red-600 text-[10px] font-bold uppercase"><span lang="en">${soldCount}</span> ${t.status_sold || 'SOLD'}</span>
                <span class="px-2 py-1 rounded bg-gray-100 text-gray-600 text-[10px] font-bold uppercase">TOTAL: <span lang="en">${allProjUnits.length}</span></span>
                `;
        }

        const isReporter = localStorage.getItem('isReporter') === 'true';
        if (addBtn) addBtn.style.display = isReporter ? 'none' : 'flex';

        // DESKTOP TABLE RENDER
        unitList.innerHTML = '';
        if (units.length === 0) {
            unitList.innerHTML = `<tr><td colspan="7" class="px-6 py-20 text-center text-gray-400 select-hint">${currentLang === 'ar' ? 'لا توجد وحدات.' : 'No units found.'}</td></tr>`;
        } else {
            units.forEach(u => {
                const tr = document.createElement('tr');
                tr.className = "hover:bg-gray-50/50 transition-colors";

                // Status styling: Green for Available, Orange for Reserved, Red for Sold
                let statusClass = 'bg-green-50 text-green-600 border-green-100';
                if (u.status === 'Reserved') {
                    statusClass = 'bg-orange-50 text-orange-600 border-orange-100';
                } else if (u.status === 'Sold') {
                    statusClass = 'bg-red-50 text-red-600 border-red-100';
                    tr.className = "bg-red-50/30 hover:bg-red-50/50 transition-colors"; // Highlight entire row
                }

                // Match Payment Plan by Area
                let matchedPlan = null;
                const bMeta = projectMetadata[pName];
                const areaPlans = bMeta ? (bMeta.offers || []) : [];

                if (areaPlans.length > 0) {
                    const activeSorted = areaPlans.filter(p => p.status === 'active')
                        .sort((a, b) => (a.priority || 99) - (b.priority || 99));
                    // Match exact area
                    matchedPlan = activeSorted.find(p => Number(p.linkedArea) === Number(u.area));
                }

                const planText = matchedPlan
                    ? `<div class="flex flex-col"><span class="text-[11px] font-bold text-emerald-700">${matchedPlan.name}</span><span class="text-[9px] text-gray-500">${matchedPlan.discountValue || ''}</span></div>`
                    : '<span class="text-gray-300 text-[10px] italic">No specific plan</span>';

                // --- Intelligent Fallback for Admin View ---
                let displayImg = 'https://placehold.co/100x100?text=No+Img';
                let fallbackImg = 'https://placehold.co/100x100?text=Error';

                try {
                    if (bMeta && bMeta.image && bMeta.image.length > 0) {
                        fallbackImg = bMeta.image[0];
                    }

                    let rawImgs = u.images || u.image;
                    if (typeof rawImgs === 'string' && rawImgs.startsWith('[')) rawImgs = JSON.parse(rawImgs);
                    if (Array.isArray(rawImgs) && rawImgs.length > 0) {
                        const first = rawImgs[0];
                        displayImg = typeof first === 'string' ? first : (first.url || first.data || displayImg);
                    } else {
                        displayImg = fallbackImg;
                    }
                } catch (e) { }

                tr.innerHTML = `
                    <td class="px-6 py-4 font-extrabold text-gray-900 text-sm"><span lang="en">#${u.code}</span></td>

                    <td class="px-6 py-4 text-gray-600 text-sm font-medium">${u.floor}</td>
                    <td class="px-6 py-4 text-gray-900 text-sm font-bold"><span lang="en">${u.area}</span> m²</td>
                    <td class="px-6 py-4 text-gray-500 text-xs font-semibold">${u.view}</td>
                    <td class="px-6 py-4"><span class="px-2 py-1 rounded text-[10px] font-bold uppercase bg-sky-50 text-sky-600 border border-sky-100">${t['tab_' + (u.purpose || u.intent || 'Sale').toLowerCase()] || (u.purpose || u.intent || 'Sale').toUpperCase()}</span></td>
                    <td class="px-6 py-4 text-gray-900 text-sm font-bold"><span lang="en">${u.price ? u.price.toLocaleString('en-US') : '-'}</span> EGP</td>
                    <td class="px-6 py-4"><span class="px-2 py-1 rounded text-[10px] font-bold uppercase border ${statusClass}">${u.status}</span></td>
                    <td class="px-6 py-4 text-right">
                        <div class="flex items-center gap-2" style="${isReporter ? 'display:none' : ''}">
                            <button class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-100 transition-colors" onclick="window.editUnit('${u.unit_id || u.id || u.code}')">
                                <i class="fas fa-edit text-xs"></i>
                            </button>
                            <button class="w-8 h-8 rounded-lg bg-green-50 text-green-600 flex items-center justify-center hover:bg-green-100 transition-colors" onclick="toggleUnitStatus('${u.unit_id || u.id || u.code}')" title="Cycle Status">
                                <i class="fas fa-sync-alt text-xs"></i>
                            </button>
                            <button class="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center hover:bg-red-100 transition-colors btn-delete" 
                                     onclick="window.AdminUI ? window.AdminUI.promptDelete('${u.unit_id || u.id || u.code}', 'unit') : deleteUnit('${u.unit_id || u.id || u.code}')">
                                 <i class="fas fa-trash-alt text-xs"></i>
                             </button>
                        </div>
                    </td>
                `;
                unitList.appendChild(tr);
            });

            // Refresh plans if not loaded (Cloudflare Version)
            if (projectMetadata[pName] && !projectMetadata[pName].plansLoaded) {
                if (window.firebaseQueries) {
                    window.firebaseQueries.getBuilding(pName).then(data => {
                        if (data) {
                            projectMetadata[pName].offers = data.offers || [];
                            projectMetadata[pName].delivery = data.delivery || '';
                            projectMetadata[pName].plansLoaded = true;
                            if (document.getElementById('mgr-project-name').textContent === pName) renderAdminUnits(pName);
                        }
                    });
                    projectMetadata[pName].plansLoaded = true;
                }
            }
        }

        // MOBILE CARDS RENDER
        unitCards.innerHTML = '';
        if (units.length === 0) {
            unitCards.innerHTML = `<div class="p-10 text-center text-gray-400">${currentLang === 'ar' ? 'لا توجد وحدات.' : 'No units found.'}</div>`;
        } else {
            units.forEach(u => {
                let displayImg = 'https://placehold.co/100x100?text=No+Img';
                let fallbackImg = 'https://placehold.co/100x100?text=Error';

                try {
                    const bMetaLocal = projectMetadata[pName];
                    if (bMetaLocal && bMetaLocal.image && bMetaLocal.image.length > 0) {
                        fallbackImg = bMetaLocal.image[0];
                    }

                    let rawImgs = u.images || u.image;
                    if (typeof rawImgs === 'string' && rawImgs.startsWith('[')) rawImgs = JSON.parse(rawImgs);
                    if (Array.isArray(rawImgs) && rawImgs.length > 0) {
                        const first = rawImgs[0];
                        displayImg = typeof first === 'string' ? first : (first.url || first.data || displayImg);
                    } else {
                        displayImg = fallbackImg;
                    }
                } catch (e) { }

                const card = document.createElement('div');
                card.className = "bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-4";

                // Status styling for mobile cards
                let statusClass = 'bg-green-50 text-green-600';
                if (u.status === 'Reserved') {
                    statusClass = 'bg-orange-50 text-orange-600';
                } else if (u.status === 'Sold') {
                    statusClass = 'bg-red-50 text-red-600';
                    card.className = "bg-red-50/20 p-5 rounded-2xl border border-red-100 shadow-sm flex flex-col gap-4";
                }

                card.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div class="flex gap-4 items-center">
                            <img 
                                src="${displayImg}" 
                                data-optimized="true"
                                class="w-12 h-12 rounded-xl object-cover border border-gray-100"
                                onerror="this.onerror=null; this.src='${fallbackImg}';"
                            >
                            <div>
                                <span class="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest">Unit Code</span>
                                <h3 class="text-xl font-extrabold text-gray-900 mt-0.5"><span lang="en">#${u.code}</span></h3>
                            </div>
                        </div>
                        <span class="px-3 py-1.5 rounded-full text-[10px] font-extrabold uppercase ${statusClass}">${u.status}</span>
                    </div>

                    <div class="grid grid-cols-2 gap-4 py-4 border-y border-gray-50">
                        <div class="flex flex-col gap-1">
                            <span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Floor / Area</span>
                            <span class="text-xs font-extrabold text-gray-700">${u.floor} / <span lang="en">${u.area}</span>m²</span>
                        </div>
                        <div class="flex flex-col gap-1">
                            <span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Purpose / View</span>
                            <span class="text-xs font-extrabold text-gray-700">${(u.intent || 'Sale').toUpperCase()} / ${u.view}</span>
                        </div>
                    </div>

                    <div class="flex flex-col gap-1">
                        <span class="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Payment Plan / Price</span>
                        <span class="text-xs font-medium text-gray-500">${u.payment_plan || 'N/A'} / <span class="text-gray-900 font-bold"><span lang="en">${u.price ? u.price.toLocaleString('en-US') + ' EGP' : '-'}</span></span></span>
                    </div>

                    <div class="grid grid-cols-3 gap-2 mt-2">
                        <button onclick="window.editUnit('${u.unit_id || u.id || u.code}')" class="flex flex-col items-center justify-center gap-1 p-3 bg-blue-50 text-blue-600 rounded-xl">
                            <i class="fas fa-edit text-sm"></i>
                            <span class="text-[10px] font-bold">Edit</span>
                        </button>
                        <button onclick="toggleUnitStatus('${u.unit_id || u.id || u.code}')" class="flex flex-col items-center justify-center gap-1 p-3 bg-green-50 text-green-600 rounded-xl">
                            <i class="fas fa-sync-alt text-sm"></i>
                            <span class="text-[10px] font-bold">Status</span>
                        </button>
                        <button onclick="window.AdminUI ? window.AdminUI.promptDelete('${u.unit_id || u.id || u.code}', 'unit') : deleteUnit('${u.unit_id || u.id || u.code}')" class="flex flex-col items-center justify-center gap-1 p-3 bg-red-50 text-red-600 rounded-xl btn-delete">
                            <i class="fas fa-trash-alt text-sm"></i>
                            <span class="text-[10px] font-bold">Delete</span>
                        </button>
                    </div>
                `;
                unitCards.appendChild(card);
            });
        }
    }

    window.deleteProject = function (pName, silent = false) {
        if (!silent) {
            const pass = prompt("Enter Master Password to delete building:");
            if (pass !== '792001') {
                alert("Incorrect password. Operation cancelled.");
                return;
            }
            if (!confirm(`Are you sure you want to PERMANENTLY delete building "${pName}" and all its units?`)) return;
        }

        // ?? CLOUDFLARE SYNC (PRIMARY)
        if (window.robelAdminAPI && window.robelAdminAPI.deleteBuilding) {
            window.robelAdminAPI.deleteBuilding(pName)
                .then(() => {
                    // Update Local State
                    delete projectMetadata[pName];
                    projectNames = projectNames.filter(n => n !== pName); // Remove from list

                    // Update Inventory
                    inventory = inventory.filter(u =>
                        u.project !== pName &&
                        u.projectId !== pName &&
                        u.project_id !== pName &&
                        u.buildingId !== pName &&
                        u.building_id !== pName
                    );

                    if (!silent) alert('Building and its units deleted successfully (Cloudflare)');

                    // Refresh UI
                    renderAdminProjectList();
                    renderSettingsProjectList();
                    renderProjectCards();

                    // Reset View
                    document.getElementById('mgr-project-name').textContent = 'Select Building';
                    document.getElementById('admin-unit-list').innerHTML = `<tr><td colspan="8" class="px-6 py-20 text-center text-gray-400 select-hint">Building Deleted.</td></tr>`;
                })
                .catch(err => {
                    console.warn("Cloudflare delete failed, forcing local cleanup:", err);
                    if (!silent) alert("Warning: Cloudflare delete failed, but removing locally. (" + err.message + ")");

                    // FORCE LOCAL DELETE ANYWAY
                    delete projectMetadata[pName];
                    projectNames = projectNames.filter(n => n !== pName); // Remove from list

                    // Update Inventory
                    inventory = inventory.filter(u =>
                        u.project !== pName &&
                        u.projectId !== pName &&
                        u.project_id !== pName &&
                        u.buildingId !== pName &&
                        u.building_id !== pName
                    );

                    // Refresh UI
                    renderAdminProjectList();
                    renderSettingsProjectList();
                    renderProjectCards();

                    // Reset View
                    if (document.getElementById('mgr-project-name')) document.getElementById('mgr-project-name').textContent = 'Select Building';
                    if (document.getElementById('admin-unit-list')) document.getElementById('admin-unit-list').innerHTML = `<tr><td colspan="8" class="px-6 py-20 text-center text-gray-400 select-hint">Building Deleted locally.</td></tr>`;
                });
        } else {
            if (!silent) alert("Sync Service Not Ready.");
        }
    }

    const showAddProjBtn = document.getElementById('show-add-project-form');
    const topAddProjBtn = document.getElementById('top-add-project-btn');
    // addProjView already declared above in nav block
    // const addProjView = document.getElementById('add-project-view');
    const cancelAddProjBtn = document.getElementById('cancel-add-project');
    const addProjectForm = document.getElementById('addProjectForm');
    // settingsBtn and settingsView already declared above in scope or global, removing duplicates

    // Unit form elements (Restored) - buttons already declared above with event listeners
    // const showAddUnitBtn = document.getElementById('show-add-unit-form');
    // addUnitContainer already declared above in nav block
    // const addUnitContainer = document.getElementById('add-unit-container');
    // const cancelAddUnitBtn = document.getElementById('cancel-add-unit');
    const addUnitForm = document.getElementById('addUnitForm');

    // consolidated settingsBtn logic moved above to lines 663+
    // removal of old block at 1072-1095 to prevent conflicts

    // Wire up Add Area button
    const addNewAreaBtn = document.getElementById('add-new-area-btn');
    if (addNewAreaBtn) {
        addNewAreaBtn.onclick = () => window.addNewArea();
    }

    const setAddBldgTrigger = document.getElementById('settings-add-building-trigger');
    if (setAddBldgTrigger) {
        setAddBldgTrigger.onclick = () => {
            if (addProjView) addProjView.style.display = 'block';
            if (settingsView) settingsView.style.display = 'none';
        };
    }

    const delAreaBtnTrigger = document.getElementById('delete-area-btn-trigger');
    if (delAreaBtnTrigger) {
        delAreaBtnTrigger.onclick = () => {
            const val = document.getElementById('delete-area-select').value;
            if (val) {
                if (window.AdminUI) window.AdminUI.promptDelete(val, 'area');
                else window.deleteArea(val);
            } else alert("Please select a project to delete.");
        };
    }

    const delBldgBtnTrigger = document.getElementById('delete-building-btn-trigger');
    if (delBldgBtnTrigger) {
        delBldgBtnTrigger.onclick = () => {
            const val = document.getElementById('delete-building-select').value;
            if (val) {
                if (window.AdminUI) window.AdminUI.promptDelete(val, 'project');
                else window.deleteProject(val);
            } else alert("Please select a building to delete.");
        };
    }

    if (showAddProjBtn) {
        showAddProjBtn.onclick = () => {
            document.querySelectorAll('.admin-proj-item').forEach(el => el.classList.remove('active'));
            if (addProjView) addProjView.style.display = 'block';

            // Clear previous building images
            buildingImages = [];
            const input = document.getElementById('building-image-input');
            if (input) input.value = '';
            renderBuildingImagesPreview();

            if (settingsView) settingsView.style.display = 'none';
            document.getElementById('unit-mgmt-header').style.display = 'none';
            document.getElementById('unit-table-area').style.display = 'none';
            if (addUnitContainer) addUnitContainer.style.display = 'none';
        };
    }

    if (topAddProjBtn) {
        topAddProjBtn.onclick = () => {
            if (addProjView) addProjView.style.display = 'block';
            if (settingsView) settingsView.style.display = 'none';
        };
    }

    // --- Admin Unit Table Filters Logic ---
    const adminUnitSearch = document.getElementById('admin-unit-search');
    const adminUnitFloor = document.getElementById('admin-unit-filter-floor');
    const adminUnitArea = document.getElementById('admin-unit-filter-area'); // NEW: Area dropdown

    const triggerAdminUnitFilter = () => {
        const pName = document.getElementById('mgr-project-name').textContent;
        if (pName && pName !== 'Select Building') {
            renderAdminUnits(pName);
        }
    };

    if (adminUnitSearch) {
        adminUnitSearch.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') triggerAdminUnitFilter();
        });
        adminUnitSearch.addEventListener('input', triggerAdminUnitFilter);
    }
    if (adminUnitFloor) adminUnitFloor.addEventListener('change', triggerAdminUnitFilter);
    const adminUnitViewFilter = document.getElementById('admin-unit-filter-view');
    if (adminUnitViewFilter) adminUnitViewFilter.addEventListener('change', triggerAdminUnitFilter);
    if (adminUnitArea) adminUnitArea.addEventListener('change', triggerAdminUnitFilter); // NEW: Area dropdown listener
    const adminUnitStatusFilter = document.getElementById('admin-unit-filter-status');
    if (adminUnitStatusFilter) adminUnitStatusFilter.addEventListener('change', triggerAdminUnitFilter);

    if (showAddUnitBtn) {
        showAddUnitBtn.onclick = () => {
            isEditingUnit = false;
            editingUnitCode = null;
            addUnitForm.reset();

            // Clear previous unit images
            unitImages = [];
            displayImages();

            const formHeader = document.querySelector('#add-unit-container .form-header h4');
            if (formHeader) formHeader.textContent = currentLang === 'ar' ? 'إضافة وحدة جديدة' : 'Create New Unit';

            addUnitContainer.style.display = 'block';
            if (addProjView) addProjView.style.display = 'none'; // Close project view
        };
    }

    if (cancelAddUnitBtn) {
        cancelAddUnitBtn.onclick = () => {
            addUnitContainer.style.display = 'none';
        };
    }

    if (cancelAddProjBtn) {
        cancelAddProjBtn.onclick = () => {
            if (addProjView) addProjView.style.display = 'none';
            // Show background again (settings or unit)
            if (settingsView.style.display === 'none' && document.getElementById('unit-mgmt-header').style.display === 'none') {
                settingsView.style.display = 'block';
            }
        };
    }

    // --- NEW: Mobile Sidebar & Interactivity Logic ---
    const adminSidebar = document.getElementById('admin-sidebar');
    const adminOverlay = document.getElementById('admin-sidebar-overlay');
    const mobileToggle = document.getElementById('admin-mobile-menu-toggle');
    const mobileClose = document.getElementById('close-admin-mobile');

    window.toggleAdminSidebar = (force) => {
        if (!adminSidebar) return;
        const isOpen = force !== undefined ? force : adminSidebar.classList.contains('translate-x-0');

        if (!isOpen) {
            // Open it
            adminSidebar.classList.remove('-translate-x-full');
            adminSidebar.classList.add('translate-x-0');
            adminOverlay?.classList.remove('hidden');
            setTimeout(() => adminOverlay?.classList.add('opacity-100'), 10);
        } else {
            // Close it
            adminSidebar.classList.add('-translate-x-full');
            adminSidebar.classList.remove('translate-x-0');
            adminOverlay?.classList.remove('opacity-100');
            setTimeout(() => adminOverlay?.classList.add('hidden'), 300);
        }
    };

    if (mobileToggle) mobileToggle.onclick = () => toggleAdminSidebar();
    if (mobileClose) mobileClose.onclick = () => toggleAdminSidebar(true);
    if (adminOverlay) adminOverlay.onclick = () => toggleAdminSidebar(true);

    // Sync mobile bottom bar buttons with main functionality
    const mobileSettingsBtn = document.getElementById('admin-settings-mobile');
    const mobileSaveBtn = document.getElementById('save-inventory-mobile');
    const desktopCloseAdmin = document.getElementById('close-admin');

    if (mobileSettingsBtn) {
        mobileSettingsBtn.onclick = () => {
            const settingsBtn = document.getElementById('admin-settings-btn');
            settingsBtn?.click();
            toggleAdminSidebar(true);
        };
    }
    if (mobileSaveBtn) {
        mobileSaveBtn.onclick = () => {
            const saveBtn = document.getElementById('save-inventory-btn');
            saveBtn?.click();
        };
    }
    // Mobile close trigger for the entire dashboard
    const mobileDashboardClose = document.getElementById('close-admin-mobile');
    if (mobileDashboardClose) {
        mobileDashboardClose.onclick = () => {
            desktopCloseAdmin?.click();
        };
    }

    // Close sidebar on project selection (mobile)
    const originalRenderAdminUnits = renderAdminUnits;
    renderAdminUnits = function (pName) {
        originalRenderAdminUnits(pName);
        if (window.innerWidth < 1024) toggleAdminSidebar(true);
    };

    // --- Image Compression Utility ---
    window.compressImage = async function (base64Str, maxWidth = 1200, quality = 0.7) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.src = base64Str;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                if (width > maxWidth) {
                    height = (maxWidth / width) * height;
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.onerror = (e) => reject(e);
        });
    };

    /**
     * ??? ROBUST UPLOAD HELPER
     * Handles cases where robelAdminAPI might be undefined
     */
    async function uploadFileSafe(fileData, fileName, type) {
        try {
            if (window.robelAdminAPI && typeof window.robelAdminAPI.uploadToCloudflare === 'function') {
                console.log(`?? Attempting Cloudflare R2 upload for ${fileName}...`);
                const url = await window.robelAdminAPI.uploadToCloudflare(fileData, fileName, type);
                if (url) return { success: true, url: url };
            }
        } catch (e) {
            console.warn("Upload to Cloudflare failed, falling back to Base64:", e);
        }

        console.log(`?? Server upload fallback: Using Base64 storage for ${fileName}`);
        if (fileData && fileData.startsWith('data:image')) {
            return { success: true, url: fileData };
        }
        return { success: false, error: 'Invalid image data' };
    }

    /* =========================================
       UNIT IMAGES UPLOAD FUNCTIONALITY
       ========================================= */
    let unitImages = [];
    window.unitImages = unitImages;
    window.getUnitImages = () => unitImages;
    window.clearUnitImages = () => { unitImages = []; window.unitImages = []; if (typeof displayImages === 'function') displayImages(); };
    // window.initUnitImageUpload defined at the top of the file now

    // --- 6-DIGIT CODE AUTO-PARSING ---
    const unitCodeInput = document.getElementById('unit-code-upload');
    if (unitCodeInput) {

        unitCodeInput.addEventListener('input', (e) => {
            let code = e.target.value.trim();
            const feedbackEl = document.getElementById('unit-code-feedback');
            if (!feedbackEl) return;

            // Strip B for parsing
            const cleanCode = code.replace(/^b/i, '').replace(/\D/g, '');

            // Get Current Context
            const bDisplay = document.getElementById('new-unit-building-display');
            const pName = bDisplay ? bDisplay.value : '';
            const pNameClean = pName.replace(/\D/g, ''); // e.g. "133"

            // ----------------------------------------------------
            // ?? SMART PARSE: Handle 3-Digit Short Code (Floor + Unit)
            // ----------------------------------------------------
            const submitBtn = document.querySelector('#addUnitForm button[type="submit"]');

            // Helper to check duplicate
            const checkRealTimeDuplicate = (checkCode, checkBName) => {
                if (isEditingUnit) return false;

                const normCheckB = (checkBName || '').replace(/^b/i, '');
                const normCheckC = (checkCode || '').replace(/^b/i, '');

                return inventory.some(u => {
                    const uPName = (u.project || u.buildingId || u.buildingCode || '').toString().replace(/^b/i, '');
                    const uCodeClean = u.code.toString().replace(/^b/i, '');
                    return (uCodeClean === normCheckC) && (uPName === normCheckB);
                });
            };

            // ----------------------------------------------------
            // ?? SMART PARSE: Handle 3-Digit Short Code (Floor + Unit)
            // ----------------------------------------------------
            if (cleanCode.length === 3 && pNameClean) {
                // Pattern: 424 -> Floor 4, Unit 24 (Building Implicit)
                const fDigit = cleanCode.substring(0, 1);
                const uDigits = cleanCode.substring(1, 3);
                const impliedFullCode = pNameClean + fDigit + uDigits; // 133424

                // DUPLICATE CHECK
                const isDup = checkRealTimeDuplicate(impliedFullCode, pNameClean);

                // Fill Auto-fields
                const floorEl = document.getElementById('new-unit-floor');
                const unitNumEl = document.getElementById('new-unit-number');

                if (floorEl) {
                    const s = (fDigit === '1') ? 'st' : (fDigit === '2') ? 'nd' : (fDigit === '3') ? 'rd' : 'th';
                    floorEl.value = `${fDigit}${s}`;
                    floorEl.dispatchEvent(new Event('input'));
                }
                if (unitNumEl) {
                    unitNumEl.value = uDigits;
                    unitNumEl.dispatchEvent(new Event('input'));
                }

                if (isDup) {
                    if (submitBtn) submitBtn.disabled = true;
                    feedbackEl.innerHTML = `
                        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; padding: 10px; border-radius: 12px; margin-top: 8px;">
                            <div style="color: #b91c1c; font-weight: 800; font-size: 0.8rem; display: flex; align-items: center; gap: 6px;">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span>DUPLICATE DETECTED</span>
                            </div>
                            <div style="font-size: 0.75rem; color: #7f1d1d;">
                                Unit <strong>${uDigits}</strong> in <strong>B${pNameClean}</strong> already exists!
                            </div>
                        </div>`;
                } else {
                    if (submitBtn) submitBtn.disabled = false;
                    feedbackEl.innerHTML = `
                         <div style="background: rgba(16, 185, 129, 0.1); 
                                    border: 1px solid #10b981; 
                                    padding: 10px; border-radius: 12px; margin-top: 8px; animation: fadeIn 0.3s ease;">
                            <div style="color: #059669; font-weight: 800; font-size: 0.8rem; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                <i class="fas fa-magic"></i>
                                <span>SMART ENTRY DETECTED</span>
                            </div>
                            <div style="font-size: 0.75rem; color: #64748b; font-weight: 600;">
                                System will save as: <strong style="color:#000;">B${impliedFullCode}</strong><br/>
                                Building: <strong style="color:#000;">${pName}</strong> | 
                                Floor: <strong style="color:#000;">${fDigit}th</strong> | 
                                Unit: <strong style="color:#000;">${uDigits}</strong>
                            </div>
                        </div>
                    `;
                }
                return;
            }

            // ----------------------------------------------------
            // ?? EXISTING LOGIC: Handle Full 6-Digit Code
            // ----------------------------------------------------
            else if (cleanCode.length === 6) {
                // Pattern: 133 4 24
                const bStr = cleanCode.substring(0, 3);
                const bIdDetected = 'B' + bStr;
                const fDigit = cleanCode.substring(3, 4);
                const uDigits = cleanCode.substring(4, 6);

                // DUPLICATE CHECK
                const isDup = checkRealTimeDuplicate(cleanCode, bStr);

                // Fill Auto-fields
                const floorEl = document.getElementById('new-unit-floor');
                const unitNumEl = document.getElementById('new-unit-number');

                if (floorEl) {
                    const s = (fDigit === '1') ? 'st' : (fDigit === '2') ? 'nd' : (fDigit === '3') ? 'rd' : 'th';
                    floorEl.value = `${fDigit}${s}`;
                    floorEl.dispatchEvent(new Event('input'));
                }
                if (unitNumEl) {
                    unitNumEl.value = uDigits;
                    unitNumEl.dispatchEvent(new Event('input'));
                }

                // Cross-check with Sidebar Selection
                const currentSelection = bDisplay ? bDisplay.value : '';
                const isCorrectBuilding = (currentSelection === bIdDetected || currentSelection === bStr);

                if (isDup) {
                    if (submitBtn) submitBtn.disabled = true;
                    feedbackEl.innerHTML = `
                        <div style="background: rgba(239, 68, 68, 0.1); border: 1px solid #ef4444; padding: 10px; border-radius: 12px; margin-top: 8px;">
                            <div style="color: #b91c1c; font-weight: 800; font-size: 0.8rem; display: flex; align-items: center; gap: 6px;">
                                <i class="fas fa-exclamation-triangle"></i>
                                <span>DUPLICATE DETECTED</span>
                            </div>
                            <div style="font-size: 0.75rem; color: #7f1d1d;">
                                Unit code <strong>${cleanCode}</strong> already exists in inventory.
                            </div>
                        </div>`;
                } else {
                    if (submitBtn) submitBtn.disabled = false;
                    feedbackEl.innerHTML = `
                        <div style="background: ${isCorrectBuilding ? 'rgba(16, 185, 129, 0.1)' : 'rgba(249, 115, 22, 0.1)'}; 
                                    border: 1px solid ${isCorrectBuilding ? '#10b981' : '#f97316'}; 
                                    padding: 10px; border-radius: 12px; margin-top: 8px; animation: fadeIn 0.3s ease;">
                            <div style="color: ${isCorrectBuilding ? '#059669' : '#d97706'}; font-weight: 800; font-size: 0.8rem; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                                <i class="fas ${isCorrectBuilding ? 'fa-check-circle' : 'fa-info-circle'}"></i>
                                <span>${isCorrectBuilding ? 'SYSTEM CODE: B' + cleanCode : 'BUILDING MISMATCH'}</span>
                            </div>
                            <div style="font-size: 0.75rem; color: #64748b; font-weight: 600;">
                                Building: <strong style="color:#000;">${bIdDetected}</strong> | 
                                Floor: <strong style="color:#000;">${fDigit}th</strong> | 
                                Unit: <strong style="color:#000;">${uDigits}</strong>
                            </div>
                        </div>
                    `;
                }
            } else if (code.length > 0) {
                if (submitBtn) submitBtn.disabled = false;
                // Check if building is selected to give specific advice
                if (pNameClean) {
                    feedbackEl.innerHTML = `<div style="color:#94a3b8; font-size:0.7rem; margin-top:5px;">
                            Enter <b>3 digits</b> (e.g. 424) for instant auto-fill in ${pName}. <br/>
                            Or enter full <b>6 digits</b> (e.g. ${pNameClean}424) to override building.
                         </div>`;
                } else {
                    feedbackEl.innerHTML = `<div style="color:#94a3b8; font-size:0.7rem; margin-top:5px;">System Code Preview: B${cleanCode} (Needs 6 digits for Auto-Fill)</div>`;
                }
            } else {
                if (submitBtn) submitBtn.disabled = false;
                feedbackEl.innerHTML = '';
            }
        });
    }

    function handleUnitFileSelect(e) {
        // console.log('?? [File Select] File input triggered');
        const files = e.target.files;
        // console.log(`?? [File Select] Files selected:`, files.length);
        handleUnitImages(files);
    }
    window.handleUnitFileSelect = handleUnitFileSelect;

    async function handleUnitImages(files) {
        window.handleUnitImages = handleUnitImages;
        window.handleUnitFiles = handleUnitImages;
        // console.log('?? [handleUnitImages] Function called with files:', files);
        // console.log('?? [handleUnitImages] Files count:', files ? files.length : 0);

        if (!files || files.length === 0) {
            // console.warn('?? [handleUnitImages] No files received!');
            return;
        }

        const maxSize = 5 * 1024 * 1024; // 5MB
        const limitMsg = currentLang === 'ar' ? 'يمكنك رفع 5 صور كحد أقصى.' : 'You can upload a maximum of 5 images.';

        // console.log(`?? [handleUnitImages] Current unitImages count: ${unitImages.length}`);

        for (const file of Array.from(files)) {
            // console.log(`?? [Processing] File: ${file.name}, Type: ${file.type}, Size: ${file.size}`);

            if (unitImages.length >= 5) {
                alert(limitMsg);
                break;
            }

            if (!file.type.startsWith('image/')) {
                alert(`File ${file.name} is not an image.`);
                continue;
            }
            if (file.size > maxSize) {
                alert(`File ${file.name} exceeds 5MB limit.`);
                continue;
            }

            // Create temporary placeholder
            const tempId = 'up_' + Math.random().toString(36).substr(2, 9);
            // console.log(`? [Created] Placeholder with ID: ${tempId}`);

            unitImages.push({
                id: tempId,
                name: file.name,
                data: 'placeholder',
                loading: true
            });

            // console.log(`?? [Status] unitImages array now has ${unitImages.length} items`);
            displayImages();
            // console.log('??? [Display] displayImages() called');
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    console.log(`?? [FileReader] File loaded: ${file.name}`);
                    // Higher quality: 1024px max width, 70% quality (Optimized for Upload Reliability)
                    const compressedData = await compressImage(e.target.result, 1024, 0.70);
                    console.log(`? [Compress] Image compressed: ${file.name}`);

                    // ?? Upload to Cloudflare (Safe Mode)
                    console.log(`?? [Upload] Starting Cloudflare upload for: ${file.name}`);
                    const uploadResult = await uploadFileSafe(compressedData, file.name, 'unit');
                    console.log(`?? [Upload] Result:`, uploadResult);

                    const idx = unitImages.findIndex(img => img.id === tempId);
                    if (idx > -1) {
                        if (uploadResult.success && uploadResult.url) {
                            unitImages[idx] = {
                                name: file.name,
                                data: uploadResult.url,
                                size: file.size
                            };
                            console.log(`? [Success] Image uploaded and saved: ${file.name}`);
                        } else {
                            unitImages.splice(idx, 1);
                            alert(`Failed to upload ${file.name}. Error: ${uploadResult.error || 'Unknown'}`);
                            console.error(`? [Failed] Upload failed for: ${file.name}`);
                        }
                        displayImages();
                    }
                } catch (err) {
                    console.error("? [Error] processing unit image:", err);
                    const idx = unitImages.findIndex(img => img.id === tempId);
                    if (idx > -1) unitImages.splice(idx, 1);
                    displayImages();
                }
            };

            reader.onerror = (err) => {
                console.error(`? [FileReader Error] Failed to read file ${file.name}:`, err);
            };

            console.log(`?? [FileReader] Starting to read: ${file.name}`);
            reader.readAsDataURL(file);
        }
    }

    window.displayImages = function () {
        const imagesGrid = document.getElementById('unit-images-grid');
        const dropZone = document.getElementById('image-drop-zone');

        if (!imagesGrid) return;

        // Show/hide grid based on images
        if (unitImages.length > 0) {
            imagesGrid.style.display = 'grid';
        } else {
            imagesGrid.style.display = 'none';
        }

        // Show/hide drop zone based on limit
        if (dropZone) {
            if (unitImages.length >= 5) {
                dropZone.style.display = 'none';
            } else {
                dropZone.style.display = 'block';
                const p = dropZone.querySelector('p');
                if (p) {
                    p.textContent = unitImages.length === 0
                        ? (currentLang === 'ar' ? 'اسحب الصور وأفلتها هنا' : 'Drag & Drop images here')
                        : (currentLang === 'ar' ? 'أضف صورة أخرى' : 'Add another image');
                }
            }
        }

        // Clear and populate grid
        imagesGrid.innerHTML = '';

        unitImages.forEach((image, index) => {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-grid-item';

            // Loader overlay if uploading
            const isPlaceholder = image.data === 'placeholder';
            const src = isPlaceholder ? 'assets/images/ui/loader.gif' : image.data;
            const style = isPlaceholder ? 'opacity: 0.5; filter: grayscale(1);' : '';

            imageItem.innerHTML = `
                    <div style="position:relative; width:100%; height:100%;">
                        <img src="${src}" alt="${image.name}" style="width:100%; height:100%; object-fit:cover; border-radius:8px; ${style}">
                        ${isPlaceholder ? '<div class="upload-spin" style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.5); color:var(--gold-main); border-radius:8px;"><i class="fas fa-spinner fa-spin"></i></div>' : ''}
                        <button type="button" class="remove-image-btn" onclick="removeImage(${index})" style="position:absolute; top:-8px; right:-8px; background:white; color:red; border-radius:50%; width:24px; height:24px; border:1px solid #ddd; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 4px rgba(0,0,0,0.1);">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    `;
            imagesGrid.appendChild(imageItem);
        });

        // Add "Add More" button in grid if limit not reached
        if (unitImages.length < 5) {
            const addMoreBtn = document.createElement('div');
            addMoreBtn.className = 'image-grid-item';
            addMoreBtn.style.cssText = 'cursor:pointer; display:flex; align-items:center; justify-content:center; flex-direction:column; gap:10px; border: 2px dashed var(--gold-muted); border-radius:12px; min-height:120px;';
            addMoreBtn.innerHTML = `
                        <i class="fas fa-plus" style="font-size: 2rem; color: var(--gold-muted);"></i>
                        <span style="font-size: 0.75rem; opacity: 0.7;">Add More</span>
                    `;
            addMoreBtn.onclick = () => {
                document.getElementById('unit-images-input').click();
            };
            imagesGrid.appendChild(addMoreBtn);
        }
    };

    window.removeImage = function (index) {
        if (index === undefined) {
            unitImages = [];
        } else {
            unitImages.splice(index, 1);
        }
        const fileInput = document.getElementById('unit-images-input');
        if (fileInput) fileInput.value = '';
        displayImages();
    };

    window.clearUnitImages = function () {
        unitImages = [];
        displayImages();
        const fileInput = document.getElementById('unit-images-input');
        if (fileInput) fileInput.value = '';
    };

    window.getUnitImages = function () {
        return unitImages;
    };

    // --- Building Multiple Image Handling ---
    let buildingImages = []; // Array of {data: base64, name: string}

    function initBuildingImageUpload() {
        const buildingImgInput = document.getElementById('building-image-input');
        const buildingDropZone = document.getElementById('building-image-drop-zone');
        const buildingImgPreview = document.getElementById('building-image-preview');

        if (!buildingImgInput || !buildingDropZone || !buildingImgPreview) return;

        // Click to upload
        buildingDropZone.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'I') buildingImgInput.click();
        };
        buildingImgInput.onchange = (e) => handleBuildingImages(e.target.files);

        // Improved Drag and drop handlers
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            buildingDropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            buildingDropZone.addEventListener(eventName, () => {
                buildingDropZone.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            buildingDropZone.addEventListener(eventName, () => {
                buildingDropZone.classList.remove('dragover');
            }, false);
        });

        buildingDropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files && files.length) {
                handleBuildingImages(files);
            }
        });
    }

    async function handleBuildingImages(files) {
        if (!files || files.length === 0) return;
        const maxSize = 5 * 1024 * 1024;
        const limitMsg = currentLang === 'ar' ? '????? ??? 5 ??? ??? ????.' : 'You can upload a maximum of 5 images.';

        for (const file of Array.from(files)) {
            if (buildingImages.length >= 5) {
                alert(limitMsg);
                break;
            }
            if (!file.type.startsWith('image/')) {
                alert('File is not an image.');
                continue;
            }
            if (file.size > maxSize) {
                alert('File is too large (Max 5MB).');
                continue;
            }

            // Temp placeholder
            const tempId = 'up_b_' + Math.random().toString(36).substr(2, 9);
            buildingImages.push({
                idx: tempId,
                name: file.name,
                data: 'placeholder'
            });
            renderBuildingImagesPreview();

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const compressed = await compressImage(e.target.result, 1200, 0.7);

                    // ?? Upload building image (Safe Mode)
                    const uploadResult = await uploadFileSafe(compressed, file.name, 'building');

                    const idx = buildingImages.findIndex(img => img.idx === tempId);
                    if (idx > -1) {
                        if (uploadResult.success && uploadResult.url) {
                            buildingImages[idx] = {
                                data: uploadResult.url,
                                name: file.name
                            };
                        } else {
                            buildingImages.splice(idx, 1);
                            alert(`Failed to upload building image: ${file.name}. Error: ${uploadResult.error}`);
                        }
                        renderBuildingImagesPreview();
                    }
                } catch (err) {
                    console.error("Compression/Upload error:", err);
                    const idx = buildingImages.findIndex(img => img.idx === tempId);
                    if (idx > -1) buildingImages.splice(idx, 1);
                    renderBuildingImagesPreview();
                }
            };
            reader.readAsDataURL(file);
        }
    }

    function renderBuildingImagesPreview() {
        const buildingImgPreview = document.getElementById('building-image-preview');
        const buildingDropZone = document.getElementById('building-image-drop-zone');
        const buildingImgInput = document.getElementById('building-image-input');

        if (!buildingImgPreview) return;
        buildingImgPreview.innerHTML = '';

        // Mode: 0 images
        if (buildingImages.length === 0) {
            buildingImgPreview.style.display = 'none';
            if (buildingDropZone) {
                buildingDropZone.style.display = 'block';
                const p = buildingDropZone.querySelector('p');
                if (p) p.textContent = currentLang === 'ar' ? '???? ????? ????? ???' : 'Drag & Drop images here';
            }
            return;
        }

        // Mode: 1+ images
        buildingImgPreview.style.display = 'grid';

        // Check limit
        if (buildingDropZone) {
            if (buildingImages.length >= 5) {
                buildingDropZone.style.display = 'none';
            } else {
                buildingDropZone.style.display = 'block';
                const p = buildingDropZone.querySelector('p');
                if (p) p.textContent = currentLang === 'ar' ? '??? ???? ????' : 'Add another image';
            }
        }

        buildingImages.forEach((imgObj, index) => {
            const div = document.createElement('div');
            div.className = 'image-grid-item';

            const isPlaceholder = imgObj.data === 'placeholder';
            const src = isPlaceholder ? 'assets/images/ui/loader.gif' : (typeof imgObj === 'object' ? (imgObj.url || imgObj.data) : imgObj);
            const style = isPlaceholder ? 'opacity: 0.5; filter: grayscale(1);' : '';

            div.innerHTML = `
                        <img src="${src}" alt="Building Image ${index}" style="${style}" onerror="this.src='https://placehold.co/100x100?text=Error'">
                            ${isPlaceholder ? '<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:var(--gold-main);"><i class="fas fa-spinner fa-spin"></i></div>' : ''}
                    <button type="button" class="remove-image-btn" onclick="removeBuildingImage(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                    `;
            buildingImgPreview.appendChild(div);
        });

        // Add "Add More" box only if limit not reached
        if (buildingImages.length < 5) {
            const addMore = document.createElement('div');
            addMore.className = 'image-grid-item';
            addMore.style.cssText = 'cursor:pointer; display:flex; align-items:center; justify-content:center; border: 2px dashed var(--gold-muted); border-radius:12px; min-height:120px;';
            addMore.innerHTML = '<i class="fas fa-plus" style="font-size: 1.5rem; color: var(--gold-muted);"></i>';
            addMore.onclick = () => buildingImgInput.click();
            buildingImgPreview.appendChild(addMore);
        }
    }

    window.removeBuildingImage = function (index) {
        if (index === undefined) {
            buildingImages = [];
        } else {
            buildingImages.splice(index, 1);
        }
        const input = document.getElementById('building-image-input');
        if (input) input.value = '';
        renderBuildingImagesPreview();
    };

    // --- Area Multiple Image Handling ---
    let areaImages = [];
    let editingAreaName = null;
    let areaMetadataStore = JSON.parse(localStorage.getItem('robelAreaMetadata')) || {};

    function initAreaImageUpload() {
        const areaImgInput = document.getElementById('area-image-input');
        const areaDropZone = document.getElementById('area-image-drop-zone');
        const areaImgPreview = document.getElementById('area-image-preview');

        if (!areaImgInput || !areaDropZone || !areaImgPreview) return;

        areaDropZone.onclick = (e) => {
            if (e.target.tagName !== 'BUTTON' && e.target.tagName !== 'I') areaImgInput.click();
        };
        areaImgInput.onchange = (e) => handleAreaImages(e.target.files);

        // Improved Drag and drop handlers
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            areaDropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        ['dragenter', 'dragover'].forEach(eventName => {
            areaDropZone.addEventListener(eventName, () => {
                areaDropZone.classList.add('dragover');
            }, false);
        });

        ['dragleave', 'drop'].forEach(eventName => {
            areaDropZone.addEventListener(eventName, () => {
                areaDropZone.classList.remove('dragover');
            }, false);
        });

        areaDropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files && files.length) {
                handleAreaImages(files);
            }
        });
    }

    async function handleAreaImages(files) {
        if (!files || files.length === 0) return;
        const limitMsg = currentLang === 'ar' ? '????? ??? 5 ??? ??? ????.' : 'You can upload a maximum of 5 images.';

        for (const file of Array.from(files)) {
            if (areaImages.length >= 5) {
                alert(limitMsg);
                break;
            }
            if (!file.type.startsWith('image/')) continue;

            // 1. Add Placeholder
            const placeholderIdx = areaImages.length;
            areaImages.push({ data: 'placeholder', name: file.name });
            renderAreaImagesPreview();

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const compressed = await window.compressImage(e.target.result, 1200, 0.7);

                    // 2. ?? Upload to Cloudflare (Safe Mode)
                    const uploadResult = await uploadFileSafe(compressed, file.name, 'area');

                    if (uploadResult.success && uploadResult.url) {
                        // 3. Replace Placeholder
                        areaImages[placeholderIdx] = { data: uploadResult.url, url: uploadResult.url, name: file.name };
                    } else {
                        // Remove if failed
                        areaImages.splice(placeholderIdx, 1);
                        alert(`Failed to upload ${file.name}. Error: ${uploadResult.error}`);
                    }
                    renderAreaImagesPreview();
                } catch (err) {
                    console.error("Area image upload error:", err);
                    areaImages.splice(placeholderIdx, 1);
                    renderAreaImagesPreview();
                }
            };
            reader.readAsDataURL(file);
        }
    }

    function renderAreaImagesPreview() {
        const areaImgPreview = document.getElementById('area-image-preview');
        const areaDropZone = document.getElementById('area-image-drop-zone');
        const areaImgInput = document.getElementById('area-image-input');

        if (!areaImgPreview) return;
        areaImgPreview.innerHTML = '';
        if (areaImages.length === 0) {
            areaImgPreview.style.display = 'none';
            if (areaDropZone) {
                areaDropZone.style.display = 'block';
                const p = areaDropZone.querySelector('p');
                if (p) p.textContent = currentLang === 'ar' ? '???? ????? ????? ???' : 'Drag & Drop images here';
            }
            return;
        }
        areaImgPreview.style.display = 'grid';

        if (areaDropZone) {
            if (areaImages.length >= 5) {
                areaDropZone.style.display = 'none';
            } else {
                areaDropZone.style.display = 'block';
                const p = areaDropZone.querySelector('p');
                if (p) p.textContent = currentLang === 'ar' ? '??? ???? ????' : 'Add another image';
            }
        }

        areaImages.forEach((imgObj, index) => {
            const div = document.createElement('div');
            div.className = 'image-grid-item';

            const isPlaceholder = imgObj.data === 'placeholder';
            const src = isPlaceholder ? 'assets/images/ui/loader.gif' : (typeof imgObj === 'object' ? (imgObj.url || imgObj.data) : imgObj);
            const style = isPlaceholder ? 'opacity: 0.5; filter: grayscale(1);' : '';

            div.innerHTML = `
                        <img src="${src}" alt="Area Image ${index}" style="${style}" onerror="this.src='https://placehold.co/100x100?text=Error'">
                            ${isPlaceholder ? '<div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:var(--gold-main);"><i class="fas fa-spinner fa-spin"></i></div>' : ''}
                    <button type="button" class="remove-image-btn" onclick="removeAreaImage(${index})">
                        <i class="fas fa-times"></i>
                    </button>
                    `;
            areaImgPreview.appendChild(div);
        });

        // Add "Add More" box only if limit not reached
        if (areaImages.length < 5) {
            const addMore = document.createElement('div');
            addMore.className = 'image-grid-item';
            addMore.style.cssText = 'cursor:pointer; display:flex; align-items:center; justify-content:center; border: 2px dashed var(--gold-muted); border-radius:12px; min-height:120px;';
            addMore.innerHTML = '<i class="fas fa-plus" style="font-size: 1.5rem; color: var(--gold-muted);"></i>';
            addMore.onclick = () => {
                if (areaImgInput) areaImgInput.click();
            };
            areaImgPreview.appendChild(addMore);
        }
    }

    window.removeAreaImage = function (index) {
        if (index === undefined) areaImages = [];
        else areaImages.splice(index, 1);
        const input = document.getElementById('area-image-input');
        if (input) input.value = '';
        renderAreaImagesPreview();
    };

    window.editArea = function (areaName) {
        editingAreaName = areaName;
        document.getElementById('edit-area-name').value = areaName;
        document.getElementById('admin-settings-view').style.display = 'none';
        document.getElementById('edit-area-view').style.display = 'block';

        if (areaMetadataStore[areaName] && areaMetadataStore[areaName].image) {
            const imgData = areaMetadataStore[areaName].image;
            areaImages = Array.isArray(imgData) ? [...imgData] : [{ data: imgData, name: 'Imported Cover' }];
        } else {
            areaImages = [];
        }
        renderAreaImagesPreview();
    };

    window.saveAreaDetails = function () {
        const pass = prompt("Enter Master Password to save details:");
        if (pass !== '792001') {
            alert("Incorrect password. Operation cancelled.");
            return;
        }
        if (!editingAreaName) return;
        if (!areaMetadataStore[editingAreaName]) areaMetadataStore[editingAreaName] = {};
        areaMetadataStore[editingAreaName].image = areaImages;
        localStorage.setItem('robelAreaMetadata', JSON.stringify(areaMetadataStore));

        if (window.robelAdminAPI && window.robelAdminAPI.syncToCloudflare) {
            window.robelAdminAPI.syncToCloudflare('project_areas', 'UPSERT', editingAreaName, {
                id: editingAreaName,
                name: editingAreaName, // Assuming name is the same as id for areas
                image: areaImages
            });
        }

        alert("Project details saved!");

        // Return to settings
        document.getElementById('edit-area-view').style.display = 'none';
        document.getElementById('admin-settings-view').style.display = 'block';

        // Refresh UI
        if (typeof renderFeaturedProjects === 'function') renderFeaturedProjects();
    };

    // --- Construction Status Dependency Logic ---
    const newProjConstSelect = document.getElementById('new-proj-const');
    const newProjDeliveryInput = document.getElementById('new-proj-delivery');

    function updateDeliveryFieldState() {
        if (!newProjConstSelect || !newProjDeliveryInput) return;

        const status = newProjConstSelect.value;
        if (status === 'Under Construction') {
            newProjDeliveryInput.disabled = false;
            newProjDeliveryInput.style.cursor = 'text';
            newProjDeliveryInput.style.opacity = '1';
            newProjDeliveryInput.placeholder = "e.g. 1/1/2027";
            if (newProjDeliveryInput.value === 'Ready') newProjDeliveryInput.value = '';
        } else if (status === 'Ready') {
            newProjDeliveryInput.value = 'Ready';
            newProjDeliveryInput.disabled = true;
            newProjDeliveryInput.style.cursor = 'not-allowed';
            newProjDeliveryInput.style.opacity = '0.6';
        } else {
            // Default / Empty
            newProjDeliveryInput.disabled = true;
            newProjDeliveryInput.style.cursor = 'not-allowed';
            newProjDeliveryInput.style.opacity = '0.6';
            newProjDeliveryInput.placeholder = "Select Status First";
            newProjDeliveryInput.value = '';
        }
    }

    if (newProjConstSelect) {
        newProjConstSelect.addEventListener('change', updateDeliveryFieldState);
    }

    // --- Modify Form Trigger to Reset for "Add" ---
    window.triggerAddBuildingFor = function (areaName) {
        const addView = document.getElementById('add-project-view');
        const setView = document.getElementById('admin-settings-view');
        const areaSelect = document.getElementById('new-proj-area-loc');
        const formTitle = document.getElementById('project-form-title');
        const nameInput = document.getElementById('new-proj-name');
        const originalNameInput = document.getElementById('edit-project-original-name');
        const addProjectForm = document.getElementById('addProjectForm');

        if (addView && setView && areaSelect) {
            if (addProjectForm) addProjectForm.reset();
            window.removeBuildingImage();

            // Reset dependency fields
            const constSelect = document.getElementById('new-proj-const');
            if (constSelect) {
                constSelect.value = "";
                if (typeof updateDeliveryFieldState === 'function') updateDeliveryFieldState();
            }

            areaSelect.value = areaName;
            if (formTitle) formTitle.textContent = "إضافة مبنى جديد";
            if (nameInput) {
                nameInput.disabled = false;
                nameInput.readOnly = false;
                nameInput.style.opacity = '1';
                nameInput.value = '';
            }
            if (originalNameInput) originalNameInput.value = "";

            addView.style.display = 'block';
            setView.style.display = 'none';
        }
    }

    // --- New: Edit Project Function ---
    // --- New: Edit Project Function ---
    window.editProject = function (pName) {
        const addView = document.getElementById('add-project-view');
        const setView = document.getElementById('admin-settings-view');
        const formTitle = document.getElementById('project-form-title');
        const originalNameInput = document.getElementById('edit-project-original-name');
        const addProjectForm = document.getElementById('addProjectForm');

        const meta = projectMetadata[pName];
        if (!meta || !addView || !setView) return;

        if (addProjectForm) addProjectForm.reset();
        window.removeBuildingImage();

        if (originalNameInput) originalNameInput.value = pName;
        if (formTitle) formTitle.textContent = "تعديل بيانات المبنى";

        const nameInput = document.getElementById('new-proj-name');
        if (nameInput) {
            nameInput.value = pName;
            nameInput.readOnly = false;
            nameInput.style.opacity = '1';
        }

        document.getElementById('new-proj-area-loc').value = meta.projectArea;
        document.getElementById('new-proj-const').value = meta.constStatus;

        // Update dependency state based on status
        if (typeof updateDeliveryFieldState === 'function') updateDeliveryFieldState();

        // Only set delivery date if valid/needed
        if (meta.constStatus === 'Under Construction') {
            document.getElementById('new-proj-delivery').value = meta.delivery;
        }

        document.getElementById('new-proj-status').value = meta.status;

        // Category removed from UI, keeping data consistent in background if needed, or ignoring
        // No input element to set.

        if (meta.image) {
            const imgData = meta.image;
            buildingImages = Array.isArray(imgData) ? [...imgData] : [{ data: imgData, name: 'Imported Cover' }];
            renderBuildingImagesPreview();
        }

        addView.style.display = 'block';
        setView.style.display = 'none';
    };

    if (addProjectForm) {
        addProjectForm.onsubmit = (e) => {
            e.preventDefault();

            const pass = prompt("Enter Master Password to save changes:");
            if (pass !== '792001') {
                alert("Incorrect password. Operation cancelled.");
                return;
            }

            const projName = document.getElementById('new-proj-name').value.trim();
            const projArea = document.getElementById('new-proj-area-loc').value;
            const projDelivery = document.getElementById('new-proj-delivery').value;
            const projConst = document.getElementById('new-proj-const').value;
            const projStatus = document.getElementById('new-proj-status').value;

            const originalName = document.getElementById('edit-project-original-name')?.value;
            const isEdit = !!originalName;

            const newProj = {
                projectArea: projArea,
                delivery: projDelivery,
                constStatus: projConst,
                status: projStatus,
                category: 'properties',
                image: buildingImages
            };

            const successMsg = isEdit ? 'Building updated successfully!' : 'Building created successfully!';

            // Helper function to compress and prepare images for Firestore
            async function compressBuildingImages(images) {
                if (!images || images.length === 0) return [];

                const compressedImages = [];

                for (let i = 0; i < images.length; i++) {
                    const img = images[i];
                    const imgData = typeof img === 'object' ? img.data : img;

                    // Skip if already a URL (not base64)
                    if (imgData.startsWith('http://') || imgData.startsWith('https://')) {
                        compressedImages.push(imgData);
                        continue;
                    }

                    try {
                        // Compress base64 image
                        const compressed = await compressImage(imgData, 0.5, 800); // 50% quality, max 800px
                        console.log(`Image ${i} compressed.Size: ${Math.round(compressed.length / 1024)} KB`);
                        compressedImages.push(compressed);
                    } catch (error) {
                        console.error('Error compressing image:', error);
                        // Use original if compression fails
                        compressedImages.push(imgData);
                    }
                }

                return compressedImages;
            }

            // Image compression function
            function compressImage(base64, quality = 0.7, maxWidth = 1000) {
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = function () {
                        const canvas = document.createElement('canvas');
                        let width = img.width;
                        let height = img.height;

                        // Calculate new dimensions
                        if (width > maxWidth) {
                            height = (height * maxWidth) / width;
                            width = maxWidth;
                        }

                        canvas.width = width;
                        canvas.height = height;

                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        // Convert to compressed base64
                        const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
                        resolve(compressedBase64);
                    };
                    img.onerror = reject;
                    img.src = base64;
                });
            }

            // ?? USE CENTRALIZED ADMIN SERVICE (Cloudflare-first)
            const adminAction = async () => {
                const compressedImages = await compressBuildingImages(buildingImages);
                const buildingData = {
                    id: projName,
                    code: projName,
                    projectId: projArea,
                    projectName: projArea,
                    delivery: projDelivery,
                    constStatus: projConst,
                    status: projStatus,
                    images: compressedImages
                };

                if (window.robelAdminAPI) {
                    if (isEdit) {
                        // 🛠️ Handle Renaming: If name changed, delete the old one
                        if (projName !== originalName) {
                            console.log(`🔄 Renaming building from ${originalName} to ${projName}`);
                            await window.robelAdminAPI.deleteProject(originalName, true); // true = building table
                            delete projectMetadata[originalName];
                            projectNames = projectNames.filter(n => n !== originalName);
                        }
                        await window.robelAdminAPI.updateBuilding(projName, buildingData);
                    } else {
                        if (window.robelAdminAPI && window.robelAdminAPI.createBuilding) {
                            await window.robelAdminAPI.createBuilding(buildingData);
                            console.log("? Building Synced to Cloudflare.");
                        }
                    }
                }
            };

            adminAction().then(() => {
                // Update Local State
                projectMetadata[projName] = {
                    ...projectMetadata[projName],
                    projectArea: projArea,
                    delivery: projDelivery,
                    constStatus: projConst,
                    status: projStatus,
                    image: buildingImages // Keep local high-quality or reference
                };
                if (!projectNames.includes(projName)) projectNames.push(projName);

                // Sync Storage
                if (typeof safeLocalStorageSet === 'function') {
                    safeLocalStorageSet('robelProjectMetadata', projectMetadata);
                    saveToIDB('robel_project_metadata', projectMetadata);
                } else {
                    localStorage.setItem('robelProjectMetadata', JSON.stringify(projectMetadata));
                }

                alert(successMsg);
                finalizeProjectSave();
            }).catch(err => {
                console.error("Error saving building:", err);
                alert("Error saving building: " + err.message);
            });

            function finalizeProjectSave() {
                addProjectForm.reset();
                window.removeBuildingImage();
                if (addProjView) addProjView.style.display = 'none';
                settingsView.style.display = 'block';
                renderAdminProjectList();
                renderSettingsProjectList();
                if (typeof renderProjectCards === 'function') {
                    renderProjectCards();
                    if (typeof renderFeaturedProjects === 'function') renderFeaturedProjects();
                }
            }
        };
    }

    if (addUnitForm) {
        addUnitForm.onsubmit = async (e) => {
            e.preventDefault();

            const pass = prompt("Enter Master Password to save unit:");
            if (pass !== '792001') {
                alert("Incorrect password. Operation cancelled.");
                return;
            }

            // ?? BLOCK IF IMAGES ARE STILL UPLOADING
            const isUploading = unitImages.some(img => img.loading === true || img.data === 'placeholder');
            if (isUploading) {
                alert(currentLang === 'ar' ? '???? ???????? ??? ?????? ??? ?????.' : 'Please wait for all images to finish uploading.');
                return;
            }

            const submitBtn = addUnitForm.querySelector('button[type="submit"]');
            if (submitBtn) {
                if (submitBtn.disabled) return; // Prevent double click
                submitBtn.disabled = true;
                submitBtn.originalText = submitBtn.textContent;
                submitBtn.textContent = 'Saving...';
            }

            const rawCode = document.getElementById('new-unit-code').value.toUpperCase();
            let cleanCode = rawCode.replace(/[^0-9SABC]/g, '');

            if (cleanCode.length < 1 || cleanCode.length > 12) {
                alert(currentLang === 'ar' ? `خطأ: الكود يجب أن يكون بين 1 إلى 12 حرف. لقد أدخلت ${cleanCode.length} حرف.` : `Error: Unit Code must be 1-12 characters. You entered ${cleanCode.length} chars.`);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = submitBtn.originalText;
                }
                return;
            }

            const isShop = cleanCode.includes('S');
            let pName = document.getElementById('mgr-project-name').textContent.trim();

            // Handle placeholders
            if (pName === 'Select' || pName === 'Select Project' || pName === 'Select Building') {
                pName = '';
            }

            // 🏗️ GOD MODE: Auto-Detect Building
            if (isShop) {
                pName = "SHOPS";
            } else if (cleanCode.length >= 5) {
                const allBuildingNums = Object.keys(projectMetadata)
                    .map(k => k.replace(/\D/g, ''))
                    .filter(Boolean)
                    .sort((a, b) => b.length - a.length); // Match longest prefix first

                for (const bNum of allBuildingNums) {
                    if (cleanCode.startsWith(bNum)) {
                        const autoPName = 'B' + bNum;
                        if (pName !== autoPName) {
                            console.log(`🚀 [God Mode] Auto-Switching Context: "${pName}" -> "${autoPName}"`);
                            pName = autoPName;
                        }
                        break;
                    }
                }
            }
            // 💡 [Smart Entry] Expansion
            else if (cleanCode.length === 3 && pName && !isShop) {
                const pNum = pName.replace(/\D/g, '');
                if (pNum) {
                    console.log(`💡 [Smart Entry] Expanding Code: ${cleanCode} -> ${pNum}${cleanCode}`);
                    cleanCode = pNum + cleanCode;
                }
            }

            const meta = projectMetadata[pName] || {};

            // ?? STRICT VALIDATION: Prevent junk values from being saved
            if (!pName) {
                alert(currentLang === 'ar' ? 'يرجى اختيار المشروع/المبنى يدوياً (أو إدخال كود الوحدة كاملاً).' : 'Please select a building explicitly OR enter the full 6-digit unit code.');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.originalText; }
                return;
            }

            const floorVal = document.getElementById('new-unit-floor').value;
            const priceVal = parseInt(document.getElementById('new-unit-price').value) || 0;
            const areaVal = parseInt(document.getElementById('new-unit-area').value) || 0;

            if (!floorVal) {
                alert(currentLang === 'ar' ? 'يرجى اختيار الدور.' : 'Please select a floor.');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.originalText; }
                return;
            }

            if (priceVal <= 0 || areaVal <= 0) {
                alert(currentLang === 'ar' ? 'يرجى إدخال السعر والمساحة بشكل صحيح.' : 'Please enter valid price and area.');
                if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = submitBtn.originalText; }
                return;
            }

            // 🔍 SMART ID RESOLUTION: Check if unit already exists by code + building
            const targetBId = normalizeId(pName).toUpperCase();
            const targetCode = cleanCode.toString().trim().toUpperCase();

            const existingUnit = inventory.find(u => {
                const uBId = normalizeId(u.buildingId || u.building_id || u.project || u.projectId || '').toUpperCase();
                const uCode = (u.code || '').toString().trim().toUpperCase();
                return (uBId === targetBId) && (uCode === targetCode);
            });

            // ℹ️ Log if updating existing unit
            if (existingUnit && !isEditingUnit) {
                console.log(`♻️ Found existing unit: ${existingUnit.id || existingUnit.unit_id}. Will UPDATE instead of creating duplicate.`);
            }

            const cleanPName = pName.replace(/\D/g, '');

            const unitData = {
                id: isEditingUnit ? (editingUnitId || editingUnitCode) : (existingUnit ? (existingUnit.id || existingUnit.unit_id) : `unit_B${isShop ? 'SHOPS' : cleanPName}_${cleanCode}`),
                code: cleanCode,
                project: isShop ? "SHOPS" : pName,
                buildingId: isShop ? "SHOPS" : (meta.id || pName),
                projectId: isShop ? (projectMetadata["SHOPS"]?.projectArea || "Porto Said") : (meta.projectArea || pName),
                price: priceVal,
                floor: floorVal,
                view: isShop ? "No View" : (document.getElementById('new-unit-view').value || "No View"),
                area: areaVal,
                status: isEditingUnit ? (existingUnit?.status || "Available") : (existingUnit?.status || "Available"),
                type: isShop ? "shop" : "residential",
                intent: document.getElementById('new-unit-intent').value,
                payment_plan: document.getElementById('new-unit-payment').value,
                images: window.getUnitImages(),
                buildingCode: pName
            };


            // ---------------------------------------------------------
            // ?? UNIFIED CLOUDFLARE SAVE (VIA ADMIN SYNC HELPER)
            // ---------------------------------------------------------
            let syncSuccessful = false;
            try {
                if (window.robelAdminAPI && window.robelAdminAPI.createUnit) {
                    console.log("?? Syncing Unit to Cloudflare (Unified)...");
                    await window.robelAdminAPI.createUnit(unitData);
                    console.log("? Unit Synced Successfully!");
                    syncSuccessful = true;
                } else {
                    console.warn("?? Sync helper (robelAdminAPI) not found.");
                    alert(currentLang === 'ar' ? '??? ??????: ???? ???????? ??? ????.' : "Save failed: Sync system not ready.");
                    if (submitBtn) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = submitBtn.originalText;
                    }
                    return;
                }
            } catch (cfErr) {
                console.error("? Sync Error:", cfErr);
                alert(currentLang === 'ar' ? "??? ????? ?? ????? ????????: " + cfErr.message : "Database Sync failed: " + cfErr.message);
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.textContent = submitBtn.originalText;
                }
                return; // ?? STOP HERE - DO NOT UPDATE LOCAL IF CLOUD FAILED
            }

            // ---------------------------------------------------------
            // LOCAL UPDATE & UI RESET (Only reached if syncSuccessful)
            // ---------------------------------------------------------
            const targetId = unitData.id || unitData.unit_id;
            const existingLocallyIdx = inventory.findIndex(u => (u.id === targetId || u.unit_id === targetId));

            if (existingLocallyIdx > -1) {
                inventory[existingLocallyIdx] = { ...inventory[existingLocallyIdx], ...unitData };
                if (isEditingUnit) {
                    alert(currentLang === 'ar' ? 'تم تحديث الوحدة بنجاح!' : 'Unit updated successfully!');
                } else {
                    alert(currentLang === 'ar' ? '?? ????? ??????? ?????!' : 'Unit data updated (already existed)!');
                }
            } else {
                inventory.push(unitData);
                alert(currentLang === 'ar' ? 'تم إضافة الوحدة بنجاح!' : 'Unit added successfully!');
            }

            // ?? SAVE LOCAL IMMEDIATELY
            if (typeof window.saveLocalInventory === 'function') {
                window.saveLocalInventory();
            } else if (typeof saveToIDB === 'function') {
                await saveToIDB('robel_inventory_backup', inventory);
            }

            // ?? SMART UI REFRESH (No Full Reload)
            console.log("? Updating UI from Local State (Bypassing LoadData)...");

            // Global data object for other scripts
            window.ROBEL_DATA = {
                units: inventory,
                buildings: projectMetadata,
                timestamp: Date.now(),
                source: 'AdminUpdate'
            };

            // Reset Form and Hide
            addUnitForm.reset();
            if (typeof window.clearUnitImages === 'function') window.clearUnitImages();
            if (typeof addUnitContainer !== 'undefined') addUnitContainer.style.display = 'none';

            // Reset state
            isEditingUnit = false;
            editingUnitCode = null;
            editingUnitId = null;

            // Refresh Admin List
            if (typeof renderAdminUnits === 'function') renderAdminUnits(pName);
            if (typeof renderProjectCards === 'function') renderProjectCards();

            // ?? CLEAR GUEST CACHE: Ensure public pages see updates immediately
            try {
                const normB = pName.startsWith('B') ? pName : 'B' + pName;
                localStorage.removeItem(`cf_cache_units_buildingId_${pName}`);
                localStorage.removeItem(`cf_cache_units_buildingId_${normB}`);
                localStorage.removeItem(`cf_cache_units`); // Clear global units cache
                console.log("?? Guest Cache invalidated for immediate consistency.");
            } catch (e) { }

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = submitBtn.originalText;
            }
        };
    }

    window.editUnit = function (id) {
        const unit = inventory.find(u => u.unit_id === id || u.id === id || u.code === id);
        if (!unit) return;

        isEditingUnit = true;
        editingUnitId = unit.unit_id || unit.id || unit.code;
        editingUnitCode = unit.code;
        window.selectedBuildingId = normalizeId(unit.building_id || unit.buildingId || unit.buildingCode || '');
        const codeInput = document.getElementById('new-unit-code');
        const floorInput = document.getElementById('new-unit-floor');
        const areaInput = document.getElementById('new-unit-area');
        const unitNumInput = document.getElementById('new-unit-number');

        // 1. First, sync the basic building display (this might reset fields, so we do it first)
        if (window.AdminSmartEntry) {
            window.AdminSmartEntry.updateBuildingDisplay();
        }

        // 2. Now set the actual unit values
        if (codeInput) codeInput.value = unit.code || '';
        if (floorInput) floorInput.value = unit.floor || '';
        if (areaInput) areaInput.value = unit.area || '';

        // Auto-populate Unit Number (derived from code if missing)
        if (unitNumInput) {
            let unitNumber = unit.unit_number || unit.number;
            if (!unitNumber && unit.code) {
                const isB15 = String(unit.code).startsWith('15');
                unitNumber = String(unit.code).slice(isB15 ? -3 : -2);
            }
            unitNumInput.value = unitNumber || '';
        }

        // 3. Trigger Smart Entry validation to sync floor names and formatting
        if (window.AdminSmartEntry && unit.code) {
            window.AdminSmartEntry.handleInput({ target: codeInput });
        }

        const viewSelect = document.getElementById('new-unit-view');
        if (viewSelect && unit.view) {
            let exists = false;
            for (let i = 0; i < viewSelect.options.length; i++) {
                if (viewSelect.options[i].value === unit.view) {
                    exists = true;
                    break;
                }
            }
            if (!exists) {
                const newOpt = document.createElement('option');
                newOpt.value = unit.view;
                newOpt.textContent = unit.view;
                // Insert before the last option (usually "Add New View")
                const lastOpt = viewSelect.querySelector('option[value="add-new-view"]') || viewSelect.options[viewSelect.options.length - 1];
                viewSelect.insertBefore(newOpt, lastOpt);
            }
            viewSelect.value = unit.view;
        }
        document.getElementById('new-unit-price').value = unit.price;
        document.getElementById('new-unit-intent').value = unit.intent || 'buy';
        document.getElementById('new-unit-payment').value = unit.payment_plan || '';

        // Load existing images
        if (unit.images && Array.isArray(unit.images) && unit.images.length > 0) {
            // Normalize images to ensure {data, name} structure
            unitImages = unit.images.map((img, i) => {
                if (typeof img === 'string') {
                    return { data: img, name: `Image ${i + 1} ` };
                }
                return img;
            });
            displayImages();
        } else if (unit.floorPlan) {
            // Support legacy floorPlan field by loading it as an image
            const fp = unit.floorPlan;
            const fpData = (typeof fp === 'object' && fp.data) ? fp.data : fp;
            const fpName = (typeof fp === 'object' && fp.name) ? fp.name : 'Floor Plan';
            unitImages = [{ data: fpData, name: fpName }];
            displayImages();
        } else {
            window.clearUnitImages();
        }

        const formHeader = document.querySelector('#add-unit-container .form-header h4');
        if (formHeader) formHeader.textContent = currentLang === 'ar' ? 'تعديل الوحدة' : 'Edit Unit';

        addUnitContainer.style.display = 'block';
        addUnitContainer.scrollIntoView({ behavior: 'smooth' });
    };

    window.toggleUnitStatus = async function (id) {
        const idx = inventory.findIndex(u => u.unit_id === id || u.id === id || u.code === id);
        if (idx > -1) {
            const unit = inventory[idx];
            const currentStatus = unit.status || 'Available';
            const statuses = ['Available', 'Reserved', 'Sold'];
            const nextStatus = statuses[(statuses.indexOf(currentStatus) + 1) % statuses.length];
            const pName = unit.project;
            const targetId = unit.unit_id || unit.id || unit.code;

            // Optimistic UI Update
            unit.status = nextStatus;
            renderAdminUnits(pName);
            renderProjectCards();

            // ?? UNIFIED CLOUDFLARE UPDATE
            if (window.robelAdminAPI && window.robelAdminAPI.updateUnit) {
                window.robelAdminAPI.updateUnit(targetId, { status: nextStatus })
                    .then(() => console.log("? Status Synced to Cloudflare"))
                    .catch(err => console.warn("Sync failed:", err));
            }

            // Local Save
            if (typeof window.saveLocalInventory === 'function') window.saveLocalInventory();
            else await saveToIDB('robel_inventory_backup', inventory);
        }
    };

    window.openProject = openProject;
    window.deleteUnit = async function (id) {
        if (confirm('Are you sure you want to remove this unit?')) {
            const idx = inventory.findIndex(u => u.unit_id === id || u.id === id || u.code === id);
            if (idx > -1) {
                const pName = inventory[idx].project;
                const targetId = inventory[idx].unit_id || inventory[idx].id || id;

                // ?? Call centralized Admin Delete (Cloudflare-first)
                if (window.robelAdminAPI && window.robelAdminAPI.deleteUnit) {
                    await window.robelAdminAPI.deleteUnit(targetId);
                }

                // Local Update
                inventory.splice(idx, 1);
                if (typeof window.saveLocalInventory === 'function') window.saveLocalInventory();
                else await saveToIDB('robel_inventory_backup', inventory);
                renderAdminUnits(pName);
                renderProjectCards();
            }
        }
    };

    // --- SAVE Inventory Button ---
    const saveInternalBtn = document.getElementById('save-inventory-btn');
    if (saveInternalBtn) {
        saveInternalBtn.onclick = () => {
            // Data is synced to Cloudflare D1 automatically
            alert('All data is synchronized with Cloudflare D1 automatically.');
        };
    }

    /**
     * 🔧 CLOUD REPAIR TOOL: Force Sync Specifications (Aggressive)
     * This utility fetches fresh cloud data and reapplies strict rules to ALL units.
     */
    window.repairSpecifications = async function () {
        if (!confirm("This will perform an aggressive REPAIR on ALL units in the Cloud database. \n\nIt will first fetch fresh data, then re-calculate specs for every unit. \n\nContinue?")) return;

        console.log("🚀 [Admin] Starting AGGRESSIVE Global Specifications Repair...");
        const btn = document.getElementById('repair-specs-btn');
        const originalText = btn ? btn.innerHTML : '';
        if (btn) btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Syncing...';

        try {
            // 1. Fetch fresh, un-cached data from Cloudflare
            const rawData = await fetchFromCloudflare('units', true);
            if (!rawData || !Array.isArray(rawData)) {
                throw new Error("Could not fetch fresh data from Cloudflare.");
            }

            // 🎯 DEDUPLICATION: Merge records by Code to find the REAL inventory
            const unitMap = new Map();
            rawData.forEach(u => {
                const key = u.code || u.unit_id || u.id;
                if (key) unitMap.set(key, u);
            });
            const freshInventory = Array.from(unitMap.values());

            console.log(`📡 Cloud Rows: ${rawData.length} | Unique Units: ${freshInventory.length}`);

            let success = 0;
            let errors = 0;

            // 2. Iterate and update
            for (const unit of freshInventory) {
                const targetId = unit.code || unit.unit_id || unit.id;
                if (!targetId) {
                    console.warn("⚠️ Skipping unit without identification:", unit);
                    continue;
                }

                try {
                    // Trigger auto-recalculation in updateUnit by sending core fields
                    await window.robelAdminAPI.updateUnit(targetId, {
                        area: unit.area,
                        project_id: unit.project_id || unit.project || unit.projectId,
                        building_id: unit.building_id || unit.buildingId || unit.buildingCode,
                        buildingCode: unit.buildingCode || unit.building_id || unit.buildingId
                    });

                    success++;
                    if (success % 10 === 0) console.log(`✓ [Repair] Processed ${success}/${freshInventory.length} - Last Code: ${unit.code || targetId}`);
                } catch (e) {
                    console.error(`✗ Error repairing unit ${unit.code || targetId}:`, e);
                    errors++;
                }
            }

            if (btn) btn.innerHTML = originalText;
            alert(`Aggressive Sync Complete!\n✅ Success: ${success}\n❌ Failed: ${errors}\n\nThe browser will now refresh.`);
            window.location.reload();

        } catch (error) {
            console.error("❌ Repair Process Failed:", error);
            if (btn) btn.innerHTML = originalText;
            alert("Repair failed: " + error.message);
        }
    };

    /**
     * 💾 BACKUP TOOL: Download all cloud data as JSON
     */
    window.downloadDatabaseBackup = async function () {
        try {
            console.log("📥 [Admin] Fetching full database for backup...");
            const data = await fetchFromCloudflare('units', true);
            if (!data) throw new Error("No data fetched");

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `inventory_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            alert("✅ Backup downloaded successfully! Keep this file safe.");
        } catch (e) {
            alert("Backup failed: " + e.message);
        }
    };

    /**
     * 🧹 CLEAN TOOL: Permanent Deduplication (Delete & Re-Upsert Mapping)
     * This handles the 444 vs 222 issue by ensuring each code has exactly one record
     * where unit_id === code.
     */
    window.deduplicateDatabase = async function () {
        if (!confirm("FINAL CLEANUP: This will normalize your database to exactly 222 units. \n\nIt will group units by 'Code', delete all versions in the cloud, and restore one clean master record per unit. \n\nContinue?")) return;

        console.log("🚀 [Admin] Starting Master Deduplication...");
        const rawData = await fetchFromCloudflare('units', true);
        if (!rawData || !Array.isArray(rawData)) return;

        // Grouping
        const groups = {};
        rawData.forEach(row => {
            const key = (row.code || row.unit_id || row.id || '').toString().toUpperCase().trim();
            if (!key) return;
            if (!groups[key]) groups[key] = [];
            groups[key].push(row);
        });

        const codes = Object.keys(groups);
        let totalProcessed = 0;
        let totalDeleted = 0;
        let totalRestored = 0;

        console.log(`🔍 Found ${codes.length} unique codes across ${rawData.length} rows.`);

        for (const code of codes) {
            const rows = groups[code];

            // 1. Pick the best record (one with specifications or most images)
            const masterRecord = rows.reduce((best, current) => {
                const bestScore = (best.specifications ? 10 : 0) + (Array.isArray(best.images) ? best.images.length : 0);
                const currScore = (current.specifications ? 10 : 0) + (Array.isArray(current.images) ? current.images.length : 0);
                return currScore > bestScore ? current : best;
            }, rows[0]);

            // 2. Delete ALL existing rows for this code to clear the clutter
            // (We iterate over all IDs associated with this code)
            for (const row of rows) {
                const dbId = row.unit_id || row.id;
                if (!dbId) continue;
                try {
                    await window.robelAdminAPI.syncToCloudflare('units', 'DELETE', dbId);
                    totalDeleted++;
                } catch (e) { console.error("Error deleting old row:", dbId, e); }
            }

            // 3. Re-Upsert the master record with unit_id === code
            try {
                // Ensure specifications is a string for storage
                if (masterRecord.specifications && typeof masterRecord.specifications === 'object') {
                    masterRecord.specifications = JSON.stringify(masterRecord.specifications);
                }

                await window.robelAdminAPI.syncToCloudflare('units', 'UPSERT', code, masterRecord);
                totalRestored++;
            } catch (e) {
                console.error("Error restoring master row:", code, e);
            }

            totalProcessed++;
            if (totalProcessed % 10 === 0) console.log(`🔄 [Progress] ${totalProcessed}/${codes.length} unique codes processed...`);
        }

        alert(`Cleanup Complete!\n- Rows Deleted: ${totalDeleted}\n- Unique Units Restored: ${totalRestored}\n\nYour database is now clean (222 units).`);
        window.location.reload();
    };

    // --- BULK UPLOAD LOGIC ---
    const bulkInput = document.getElementById('bulk-upload-input');
    if (bulkInput) {
        bulkInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (!Array.isArray(data)) throw new Error("File must be a JSON array.");

                    if (!confirm(`Ready to upload ${data.length} units to Cloudflare ? This acts immediately.`)) return;

                    console.log("Starting Bulk Upload...");
                    let successCount = 0;
                    let errorCount = 0;

                    const chunkSize = 50;
                    for (let i = 0; i < data.length; i += chunkSize) {
                        const chunk = data.slice(i, i + chunkSize);
                        const promises = chunk.map(async (unit) => {
                            if (!unit.code || !unit.project) {
                                console.warn("Skipping invalid unit:", unit);
                                errorCount++;
                                return;
                            }
                            if (window.robelAdminAPI && window.robelAdminAPI.createUnit) {
                                try {
                                    await window.robelAdminAPI.createUnit(unit);
                                    successCount++;
                                    const existingIdx = inventory.findIndex(u => u.code == unit.code);
                                    if (existingIdx > -1) inventory[existingIdx] = unit;
                                    else inventory.push(unit);
                                } catch (e) {
                                    console.error("Upload error:", e);
                                    errorCount++;
                                }
                            }
                        });
                        await Promise.all(promises);
                        console.log(`Processed batch ${i / chunkSize + 1} `);
                    }

                    alert(`Upload Complete!\nSuccess: ${successCount} \nErrors: ${errorCount} `);
                    renderProjectCards();
                    renderAdminProjectList();
                    bulkInput.value = '';
                } catch (parseError) {
                    alert("Error parsing JSON file: " + parseError.message);
                    console.error(parseError);
                }
            };
            reader.readAsText(file);
        });
    }

    // --- Language Switcher ---
    const langBtns = document.querySelectorAll('.lang-toggle-btn, #lang-btn, #sidebar-lang-btn, #lang-btn-mobile, #lang-btn-nav, #lang-btn-top');
    langBtns.forEach(btn => {
        btn.onclick = (e) => {
            if (e) e.stopPropagation(); // Prevent triggering sidebar if button is inside a toggle area
            const newLang = currentLang === 'en' ? 'ar' : 'en';
            setLanguage(newLang);

            // If the button was clicked inside the sidebar, close the sidebar
            if (btn.id === 'sidebar-lang-btn' || btn.closest('#main-sidebar')) {
                toggleSidebar(false);
            }
        };
    });




    function updateFilterLabels() {
        const t = translations[currentLang];

        if (typeof getSelectedProjects === 'function') {
            const projs = getSelectedProjects();
            const el = document.getElementById('selected-projects-text');
            if (el) {
                if (projs.length === 0) el.textContent = t.filter_project;
                else el.textContent = projs.join(', ');
            }
        }

        if (typeof getSelectedAreas === 'function') {
            const areas = getSelectedAreas();
            const el = document.getElementById('selected-areas-text');
            if (el) {
                if (areas.length === 0) el.textContent = t.filter_area;
                else el.textContent = areas.join(', ') + ' m²';
            }
        }

        if (typeof getSelectedDelivery === 'function') {
            const deliveries = getSelectedDelivery();
            const el = document.getElementById('selected-delivery-text');
            if (el) {
                if (deliveries.length === 0) el.textContent = t.filter_delivery;
                else el.textContent = deliveries.join(', ');
            }
        }

        if (typeof getSelectedProjectArea === 'function') {
            const areas = getSelectedProjectArea();
            const el = document.getElementById('selected-project-area-text');
            if (el) {
                if (areas.length === 0) el.textContent = t.filter_project_area;
                else el.textContent = areas.join(', ');
            }
        }
    }

    // --- Dark Mode ---
    const themeBtns = document.querySelectorAll('.theme-toggle-btn, #theme-btn, #sidebar-theme-btn, #theme-btn-mobile, #theme-btn-nav');
    const updateAllIcons = (theme) => {
        themeBtns.forEach(btn => {
            const icon = btn.querySelector('i');
            if (!icon) return;
            if (theme === 'dark') {
                icon.classList.remove('fa-moon');
                icon.classList.add('fa-sun');
            } else {
                icon.classList.remove('fa-sun');
                icon.classList.add('fa-moon');
            }
        });
    };

    // Forced Scroll to top on load - Multi-stage
    function resetScroll() {
        window.scrollTo({ top: 0, behavior: 'auto' });
        document.body.scrollTop = 0;
        document.documentElement.scrollTop = 0;
    }

    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }

    resetScroll();
    setTimeout(resetScroll, 10);
    window.addEventListener('load', () => {
        setTimeout(resetScroll, 50);
        // Hide Loader
        const loader = document.getElementById('page-loader');
        if (loader) {
            loader.classList.add('loader-finished');
            setTimeout(() => loader.remove(), 800);
        }
    });

    // Force LIGHT mode for this session to ensure "White Mode" request is met
    let savedTheme = localStorage.getItem('theme');
    if (!savedTheme || savedTheme === 'dark') {
        savedTheme = 'light';
        localStorage.setItem('theme', 'light');
    }
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateAllIcons(savedTheme);

    themeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const newTheme = current === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateAllIcons(newTheme);
        });
    });

    function updateIcon(theme) {
        if (theme === 'dark') {
            icon.classList.remove('fa-moon');
            icon.classList.add('fa-sun');
        } else {
            icon.classList.remove('fa-sun');
            icon.classList.add('fa-moon');
        }
    }

    // --- Scroll Features (Progress, Header, Back to Top, Scroll Spy) ---
    const header = document.querySelector('.main-header');
    const scrollProgress = document.getElementById('scroll-progress');
    const backToTop = document.getElementById('back-to-top');
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links > li > a.nav-item-btn:not(.nav-link-projects), .nav-link-projects');
    const quickNavLinks = document.querySelectorAll('.quick-nav > a, .quick-nav-drop-btn');

    window.addEventListener('scroll', () => {
        const scrollTop = window.scrollY;
        const docHeight = document.documentElement.scrollHeight - window.innerHeight;
        const progress = (scrollTop / docHeight) * 100;

        // 1. Update Progress Bar
        if (scrollProgress) scrollProgress.style.width = progress + "%";

        // 2. Sticky Header Effect (Desktop Only)
        if (header && window.innerWidth >= 992) {
            if (scrollTop > 50) header.classList.add('scrolled');
            else header.classList.remove('scrolled');
        } else if (header) {
            header.classList.remove('scrolled');
        }

        // 3. Back to Top Visibility
        if (backToTop) {
            if (scrollTop > 500) backToTop.classList.add('active');
            else backToTop.classList.remove('active');
        }

        // 4. Scroll Spy
        let currentSection = "";
        sections.forEach((section) => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            if (scrollTop >= sectionTop - 150) {
                currentSection = section.getAttribute("id");
            }
        });

        navLinks.forEach((link) => {
            link.classList.remove("active");
            if (link.getAttribute("href") === `#${currentSection} `) {
                link.classList.add("active");
            }
        });

        quickNavLinks.forEach((link) => {
            link.classList.remove("active");
            if (link.getAttribute("href") === `#${currentSection} `) {
                link.classList.add("active");
            }
        });
    });

    if (backToTop) {
        backToTop.onclick = () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
    }

    // --- Intersection Observer (Reveals) ---
    const revealOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const el = entry.target;
                const delay = el.getAttribute('data-delay') || 0;
                setTimeout(() => {
                    el.classList.add('reveal-visible');
                }, delay);
                revealObserver.unobserve(el);
            }
        });
    }, revealOptions);

    document.querySelectorAll('.reveal').forEach(el => {
        revealObserver.observe(el);
    });

    // --- Improved Hero Scroll Logic (Fix: Keeping filters visible) ---
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const heroTitle = document.querySelector('.hero-title-center');
        const heroSubtitle = document.querySelector('.hero-subtitle-center');
        const heroSlider = document.querySelector('.hero-slider');
        const searchPills = document.querySelector('.search-mode-pills');
        const heroFilter = document.querySelector('.filter--hero');

        // Fade out titles only
        if (heroTitle) {
            heroTitle.style.opacity = Math.max(1 - (scrolled / 300), 0);
            heroTitle.style.transform = `translateY(${scrolled * - 0.2}px)`;
        }
        if (heroSubtitle) {
            heroSubtitle.style.opacity = Math.max(1 - (scrolled / 250), 0);
            heroSubtitle.style.transform = `translateY(${scrolled * - 0.15}px)`;
        }

        // Keep search pills and filters visible longer or fix them
        if (searchPills) {
            // Slight fade but stays mostly visible
            searchPills.style.opacity = Math.max(1 - (scrolled / 600), 0.3);
            searchPills.style.transform = `translateY(${scrolled * - 0.1}px)`;
        }
        if (heroFilter) {
            // Filters stay visible and move slightly for parallax
            heroFilter.style.opacity = Math.max(1 - (scrolled / 800), 0.8);
            heroFilter.style.transform = `translateY(${scrolled * - 0.05}px)`;
        }

        if (heroSlider) {
            // Parallax effect for the background frame
            heroSlider.style.transform = `translateY(${scrolled * 0.4}px)`;
        }
    });

    // Handle smooth anchor clicks for the whole site
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) target.scrollIntoView({ behavior: 'smooth' });
        });
    });

    // --- Multi-Select Initialization Helper ---
    function initMultiSelect(btnId, dropdownId, applyId, textId, defaultTextKey, onApply) {
        const btn = document.getElementById(btnId);
        const dropdown = document.getElementById(dropdownId);
        const applyBtn = document.getElementById(applyId);
        const textSpan = document.getElementById(textId);
        let selectedValues = [];

        if (btn && dropdown) {
            btn.onclick = (e) => {
                e.stopPropagation();
                const isHidden = dropdown.style.display === 'none' || dropdown.style.display === '';
                // Close other dropdowns first
                document.querySelectorAll('.multi-select-dropdown').forEach(d => d.style.display = 'none');
                dropdown.style.display = isHidden ? 'block' : 'none';
            };
        }

        if (applyBtn) {
            applyBtn.onclick = (e) => {
                e.stopPropagation();
                const checked = dropdown.querySelectorAll('input:checked');
                selectedValues = Array.from(checked).map(c => c.value);

                if (selectedValues.length === 0) {
                    textSpan.textContent = (translations[currentLang] && translations[currentLang][defaultTextKey]) || "All";
                } else {
                    let suffix = '';
                    // Strictly check Column 2 Button ID for area suffix
                    if (btnId === 'area-multi-select-btn') suffix = ' m²';
                    textSpan.textContent = (selectedValues.length > 1 ? selectedValues.length + " Items" : selectedValues[0]) + suffix;
                }
                if (onApply) onApply(selectedValues);
            };

            // AUTO-APPLY: Trigger apply on any checkbox change
            dropdown.addEventListener('change', (e) => {
                if (e.target.type === 'checkbox') {
                    // Force the apply logic
                    applyBtn.click();
                    // Keep dropdown open during auto-apply
                    dropdown.style.display = 'block';
                }
            });

            applyBtn.style.display = 'none';
        }

        // Return a dynamic getter that always checks the DOM state
        return () => {
            const checked = dropdown.querySelectorAll('input:checked');
            return Array.from(checked).map(c => c.value);
        };
    }

    // --- Linked Filters Logic (CROSS-FILTERING) ---
    function refreshFilterOptions(shouldReset = false) {
        // Fix: initMultiSelect passes an array of selected values as the first arg. 
        // We must ensure shouldReset is only true if explicitly passed as a boolean true.
        if (typeof shouldReset !== 'boolean') shouldReset = false;

        const tStrings = translations[currentLang];

        // Get currently selected values - Respect Reset Flag
        let selectedProjs = [];
        let selectedAreas = [];
        let selectedDelivery = [];
        let selectedProjectArea = [];

        if (!shouldReset) {
            selectedProjs = (typeof getSelectedProjects === 'function') ? getSelectedProjects() : [];
            selectedAreas = (typeof getSelectedAreas === 'function') ? getSelectedAreas() : [];
            selectedDelivery = (typeof getSelectedDelivery === 'function') ? getSelectedDelivery() : [];
            selectedProjectArea = (typeof getSelectedProjectArea === 'function') ? getSelectedProjectArea() : [];
        }

        // Determine Effective "Selected" Projects for Dependent Filters
        // Rule: 
        // 1. If user MANUALLY selected specific buildings (checkboxes), use ONLY those.
        // 2. Else if user selected a Project Tab (e.g. Porto Golf), use ALL buildings in that project.
        let effectiveSelectedProjs = [];
        if (selectedProjs.length > 0) {
            effectiveSelectedProjs = [...selectedProjs];
        } else if (window.activeSearchProject) {
            // Add all confirmed buildings for this project
            const projectBuildings = projectNames.filter(p => {
                const meta = projectMetadata[p];
                return meta && normalizeProjectArea(meta.projectArea) === window.activeSearchProject;
            });
            effectiveSelectedProjs = projectBuildings;
        }

        const statusBtn = document.querySelector('.filter__status-btn.active');
        const currentStatus = statusBtn ? statusBtn.getAttribute('data-val') : 'all';

        const rentBuyBtn = document.querySelector('.filter__toggle-btn.active');
        const currentRentBuy = rentBuyBtn ? rentBuyBtn.getAttribute('data-val') : 'buy';

        // matchesAreaRange moved to global scope

        // 1. Update Projects Dropdown
        // Filter by: Status + Area + Type
        let projInv = inventory;
        if (currentStatus !== 'all') {
            projInv = projInv.filter(u => {
                const isReady = (u.project.includes('121') || u.project === '224');
                return currentStatus === 'ready' ? isReady : !isReady;
            });
        }
        if (currentRentBuy) {
            projInv = projInv.filter(u => {
                const i = (u.intent || 'buy').toLowerCase();
                const filter = currentRentBuy.toLowerCase();
                if (filter === 'buy') return i === 'buy' || i === 'sale' || i === 'primary' || i === 'resale';
                return i === filter;
            });
        }
        if (selectedAreas.length > 0) {
            projInv = projInv.filter(u => matchesAreaRange(u.area, selectedAreas));
        }
        if (selectedDelivery.length > 0) {
            projInv = projInv.filter(u => {
                const meta = getUnitMetadata(u);
                return meta && selectedDelivery.includes(meta.delivery);
            });
        }
        if (selectedProjectArea.length > 0) {
            projInv = projInv.filter(u => {
                const meta = getUnitMetadata(u);
                return meta && selectedProjectArea.includes(normalizeProjectArea(meta.projectArea));
            });
        }

        // Mode is now unified
        let mode = currentSearchMode;

        // STRICT PROJECT FILTER: Determine active project ONCE at the start
        // This variable is used throughout the function, so it must be defined here
        let effectiveActiveProject = window.activeSearchProject;
        if (!effectiveActiveProject) {
            const activeBtn = document.querySelector('.project-select-btn.active');
            if (activeBtn) effectiveActiveProject = normalizeProjectArea(activeBtn.dataset.project || activeBtn.innerText);
        }

        // Logic Change: Derive the list of selectable buildings from Metadata + Inventory
        // This ensures "Linking" works even if one building is empty but defined in metadata.
        let buildingsMatchingFilters = projectNames.filter(p => {
            const meta = projectMetadata[p];
            if (!meta) return false;

            // Mode check:
            // 1. If we have an active strict project, FORCE 'properties' mode behavior (show buildings, hide project cards)
            if (window.activeSearchProject) {
                if (meta.category === 'projects') return false; // Hide parent card
            }
            // 2. Normal Mode check
            else {
                const isAllowedByMode = (mode === 'projects') ? (meta && meta.category === 'projects') : true;
                if (!isAllowedByMode) return false;
            }

            // Use the effectiveActiveProject from outer scope
            if (effectiveActiveProject) {
                const active = normalizeProjectArea(effectiveActiveProject);
                const pArea = normalizeProjectArea(meta.projectArea);

                // 1. Primary Check: Metadata Area Match
                if (pArea !== active) return false;

                // 2. Secondary Check: ID Pattern Safety (Double Lock)
                const bId = p.toString().toLowerCase().replace(/^b/i, '');

                // Porto Golf Marina - Allowed IDs (STRICT WHITELIST)
                if (active === "Porto Golf Marina") {
                    // Celebration is absolutely forbidden here
                    if (p.toLowerCase().includes('celebration')) return false;

                    // Allow only known Golf IDs. Reject B16, B15, etc.
                    // Note: We strip 'B' to be safe, but check strictly.
                    const golfSpecifics = ["121", "224", "78", "133", "136", "230", "243"];
                    if (!golfSpecifics.includes(bId)) return false;
                }

                // Porto Said - Allowed IDs
                if (active === "Porto Said") {
                    const saidIds = ["9", "10", "15", "16", "17", "33", "shops"];
                    if (!saidIds.includes(bId)) return false;
                }

                // Celebration - Allowed IDs
                if (active === "Celebration") {
                    const celIDs = ["celebration"];
                    if (!celIDs.includes(bId) && !p.toLowerCase().includes('celebration')) return false;
                }
            }

            // Project Area check (The core "Linking" request)
            if (selectedProjectArea.length > 0) {
                const normalizedMetaArea = normalizeProjectArea(meta.projectArea);
                if (!selectedProjectArea.includes(normalizedMetaArea)) return false;
            }

            // Other metadata filters (Delivery etc)
            if (selectedDelivery.length > 0) {
                if (!selectedDelivery.includes(meta.delivery)) return false;
            }

            // 5. Area Range Check (Bidirectional Linking)
            if (selectedAreas.length > 0) {
                const hasMatchingAreaUnit = inventory.some(u => {
                    if (!isUnitInTarget(u, p)) return false;
                    return matchesAreaRange(u.area, selectedAreas);
                });
                if (!hasMatchingAreaUnit) return false;
            }

            // Status Check
            if (currentStatus !== 'all') {
                const isReady = (meta.constStatus || '').toLowerCase() === 'ready';
                if (currentStatus === 'ready' && !isReady) return false;
                if (currentStatus === 'u-const' && isReady) return false;
            }

            return true;
        });

        // 1. Update Projects Dropdown
        const projectList = document.getElementById('project-options-list');
        const projectDropdown = document.getElementById('project-multi-dropdown');
        if (projectList && (!projectDropdown || projectDropdown.style.display !== 'block')) {
            // Sort projects: Active units first, then original order
            const sortedProjectNames = [...projectNames].sort((a, b) => {
                const hasUnitsA = inventory.some(u => isUnitInTarget(u, a));
                const hasUnitsB = inventory.some(u => isUnitInTarget(u, b));
                if (hasUnitsA && !hasUnitsB) return -1;
                if (!hasUnitsA && hasUnitsB) return 1;
                return projectNames.indexOf(a) - projectNames.indexOf(b);
            });

            projectList.innerHTML = sortedProjectNames.map(p => {
                if (!buildingsMatchingFilters.includes(p)) return '';
                const isChecked = selectedProjs.includes(p);
                const bId = p.toString().toLowerCase();
                const cleanId = bId.replace(/^b/i, '');

                let hasUnits = inventory.some(u => {
                    const searchFields = [u.project, u.projectName, u.projectId, u.buildingId, u.building_id, u.building];
                    const isMatch = searchFields.some(f => f && (f.toString().toLowerCase() === bId || f.toString().toLowerCase() === cleanId));
                    if (!isMatch) return false;
                    if (currentRentBuy) {
                        const rawI = (u.intent || 'buy').toLowerCase();
                        const i = (rawI === 'sale' || rawI === 'primary' || rawI === 'resale') ? 'buy' : rawI;
                        const filter = (currentRentBuy.toLowerCase() === 'sale' || currentRentBuy.toLowerCase() === 'primary') ? 'buy' : currentRentBuy.toLowerCase();
                        if (i !== filter) return false;
                    }
                    if (currentStatus !== 'all') {
                        const isReady = (u.project && (u.project.includes('121') || u.project === '224')) || (u.status && u.status.toLowerCase() === 'ready');
                        if (currentStatus === 'ready' && !isReady) return false;
                        if (currentStatus === 'u-const' && isReady) return false;
                    }
                    return true;
                });

                const isDisabled = (inventory.length > 0) ? !hasUnits : false;
                return `
                    <div class="multi-select-item" style="${isDisabled ? 'opacity: 0.4; pointer-events: none; filter: grayscale(1);' : ''}">
                        <label class="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-all">
                            <input type="checkbox" value="${p}" ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''} 
                                   class="custom-gold-checkbox">
                            <span class="text-sm ${isChecked ? 'text-gold-main font-bold' : 'text-gray-700'}">${p}</span>
                        </label>
                    </div>
                `;
            }).join('');
        }

        // 2. Update Areas Dropdown
        const areaOptionsList = document.getElementById('area-options-list');
        const areaDropdown = document.getElementById('area-multi-dropdown');

        let areaInvForOptions = inventory;
        if (currentRentBuy) {
            areaInvForOptions = areaInvForOptions.filter(u => {
                const i = (u.intent || 'buy').toLowerCase();
                const filter = currentRentBuy.toLowerCase();
                if (filter === 'buy') return i === 'buy' || i === 'sale' || i === 'primary' || i === 'resale';
                return i === filter;
            });
        }
        if (effectiveSelectedProjs.length > 0) {
            areaInvForOptions = areaInvForOptions.filter(u => isUnitInTarget(u, effectiveSelectedProjs));
        }

        let activeP = window.activeSearchProject;
        if (!activeP && effectiveSelectedProjs.length > 0) {
            const first = effectiveSelectedProjs[0];
            const meta = projectMetadata[first];
            if (meta && meta.projectArea) activeP = normalizeProjectArea(meta.projectArea);
        }
        if (!activeP) activeP = "Porto Golf Marina";

        const strategy = getAreaStrategy(activeP, effectiveSelectedProjs.length === 1 ? effectiveSelectedProjs[0] : null);
        let availOptions = strategy.options;

        // Dynamic Option Generation (e.g. for B15)
        if (strategy.type === 'dynamic') {
            const uniqueAreas = [...new Set(areaInvForOptions.map(u => parseInt(u.area)))]
                .filter(a => !isNaN(a) && a > 0)
                .sort((a, b) => a - b);
            availOptions = uniqueAreas.map(a => ({ val: a, label: `${a} m²` }));
        }

        if (areaOptionsList && (!areaDropdown || areaDropdown.style.display !== 'block')) {
            areaOptionsList.innerHTML = availOptions.map(opt => {
                const isChecked = selectedAreas.includes(opt.val.toString());
                const displayLabel = opt.label || `${opt.val} m²`;
                const hasUnits = areaInvForOptions.some(u => matchesAreaRange(u.area, [opt.val], activeP));
                const isDisabled = !hasUnits;

                return `
                    <div class="multi-select-item" style="${isDisabled ? 'opacity: 0.4; pointer-events: none; filter: grayscale(1); display: none;' : ''}">
                        <label class="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-all">
                            <input type="checkbox" value="${opt.val}" ${isChecked ? 'checked' : ''} ${isDisabled ? 'disabled' : ''} 
                                   class="custom-gold-checkbox">
                            <span class="text-sm ${isChecked ? 'text-gold-main font-bold' : 'text-gray-700'}">${displayLabel}</span>
                        </label>
                    </div>
                `;
            }).join('');
        }

        // 3. Update Delivery Dropdown (DYNAMICALLY LINKED)
        const deliveryList = document.getElementById('delivery-options-list');
        const deliveryDropdown = document.getElementById('delivery-multi-dropdown');
        if (deliveryList && (!deliveryDropdown || deliveryDropdown.style.display !== 'block')) {
            let validDates = new Set();
            // Linkage Rule: Show dates ONLY for selected buildings
            const buildingsToQuery = effectiveSelectedProjs.length > 0 ? effectiveSelectedProjs : buildingsMatchingFilters;
            buildingsToQuery.forEach(pId => {
                const meta = projectMetadata[pId];
                if (meta && meta.delivery) validDates.add(meta.delivery);
            });
            const deliveryOptions = [...validDates].sort((a, b) => {
                if (a === 'Ready') return -1;
                if (b === 'Ready') return 1;
                const [mA, yA] = a.split('/').map(n => parseInt(n) || 0);
                const [mB, yB] = b.split('/').map(n => parseInt(n) || 0);
                if (yA !== yB) return yA - yB;
                return mA - mB;
            });
            deliveryList.innerHTML = deliveryOptions.map(date => {
                const isChecked = selectedDelivery.includes(date);
                return `
                    <div class="multi-select-item">
                        <label class="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-all">
                            <input type="checkbox" value="${date}" ${isChecked ? 'checked' : ''} 
                                   class="custom-gold-checkbox">
                            <span class="text-sm ${isChecked ? 'text-gold-main font-bold' : 'text-gray-700'}">${date}</span>
                        </label>
                    </div>
                `;
            }).join('');
        }

        // 4. Update Project Area Dropdown
        const projectAreaList = document.getElementById('project-area-options-list');
        if (projectAreaList) {
            let dynamicAreaOptions = [...new Set(projectNames.map(p => projectMetadata[p] ? normalizeProjectArea(projectMetadata[p].projectArea) : null).filter(Boolean))].sort();
            projectAreaList.innerHTML = dynamicAreaOptions.map(pa => {
                const isChecked = selectedProjectArea.includes(pa);
                return `
                    <div class="multi-select-item">
                        <label class="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-all">
                            <input type="checkbox" value="${pa}" ${isChecked ? 'checked' : ''} 
                                   class="custom-gold-checkbox">
                            <span class="text-sm ${isChecked ? 'text-gold-main font-bold' : 'text-gray-700'}">${pa}</span>
                        </label>
                    </div>
                `;
            }).join('');
        }
    }

    const getSelectedProjects = initMultiSelect('project-multi-select-btn', 'project-multi-dropdown', 'apply-multi-project', 'selected-projects-text', 'filter_project', refreshFilterOptions);
    const getSelectedAreas = initMultiSelect('area-multi-select-btn', 'area-multi-dropdown', 'apply-multi-area', 'selected-areas-text', 'filter_area', refreshFilterOptions);
    const getSelectedDelivery = initMultiSelect('delivery-multi-select-btn', 'delivery-multi-dropdown', 'apply-multi-delivery', 'selected-delivery-text', 'filter_delivery', refreshFilterOptions);
    const getSelectedProjectArea = initMultiSelect('project-area-multi-select-btn', 'project-area-multi-dropdown', 'apply-multi-project-area', 'selected-project-area-text', 'filter_project_area', refreshFilterOptions);

    refreshFilterOptions();

    // --- Segmented Toggle Logic (Rent/Buy & Status) ---
    function setupToggles(className, activeClass) {
        const items = document.querySelectorAll('.' + className);
        items.forEach(item => {
            item.onclick = () => {
                items.forEach(i => i.classList.remove(activeClass));
                item.classList.add(activeClass);
                refreshFilterOptions(); // Trigger update for Status toggle
            };
        });
    }
    setupToggles('filter__toggle-btn', 'active'); // Rent/Buy
    setupToggles('filter__status-btn', 'active'); // U-Const/Ready/All

    // --- Project Select Button Logic (Centralized) ---
    document.querySelectorAll('.project-select-btn').forEach(btn => {
        btn.onclick = () => {
            const proj = btn.getAttribute('data-project') || btn.innerText.trim();
            window.activeSearchProject = normalizeProjectArea(proj);
            console.log('?? Project Selection Changed:', window.activeSearchProject);

            // Toggle active class
            document.querySelectorAll('.project-select-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Show secondary filters
            const secRow = document.getElementById('secondary-filters-row');
            if (secRow) {
                secRow.style.display = 'flex';
                // Trigger scroll to secondary filters for better UX on mobile
                // secRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }

            // Trigger refresh - RESET dependent filters because scope changed radically
            // This prevents "contradictory selections" (e.g. having a Porto Said building selected while in Porto Golf tab)
            refreshFilterOptions(true);

            // Update Labels
            if (typeof updateFilterLabels === 'function') updateFilterLabels();
        };
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.filter__select-wrap') && !e.target.closest('.multi-select-dropdown')) {
            document.querySelectorAll('.multi-select-dropdown').forEach(d => d.style.display = 'none');
        }
    });

    // --- Search & Filter Logic (ROBUST ATTACHMENT) ---
    const triggerSearch = (e) => {
        if (e && typeof e.preventDefault === 'function') {
            e.preventDefault();
            e.stopPropagation();
        }

        console.log('--- Search Triggered ---');

        // 1. Get Values from Multi-selects
        const projVals = (typeof getSelectedProjects === 'function') ? getSelectedProjects() : [];
        const areaVals = (typeof getSelectedAreas === 'function') ? getSelectedAreas() : [];
        const deliveryVals = (typeof getSelectedDelivery === 'function') ? getSelectedDelivery() : [];
        const projectAreaVals = (typeof getSelectedProjectArea === 'function') ? getSelectedProjectArea() : [];

        // 2. Get Values from Toggles
        const rentBuyBtn = document.querySelector('.filter__toggle-btn.active');
        const rentBuyVal = rentBuyBtn ? rentBuyBtn.getAttribute('data-val') : 'buy';

        const statusBtn = document.querySelector('.filter__status-btn.active');
        const statusVal = statusBtn ? statusBtn.getAttribute('data-val') : 'all';

        // 3. Get Keyword
        const searchInput = document.getElementById('hero-keyword-input');
        const keywordVal = searchInput ? searchInput.value.trim() : '';

        const filters = {
            projects: projVals,
            areas: areaVals,
            delivery: deliveryVals,
            projectArea: projectAreaVals,
            rentBuy: rentBuyVal,
            status: statusVal,
            keyword: keywordVal
        };

        console.log('Applying Filters:', filters);

        // 4. Render
        if (typeof renderProjectCards === 'function') {
            renderProjectCards(filters);
        } else {
            console.error('renderProjectCards function not found!');
        }

        // 5. Scroll to Results grid
        const grid = document.querySelector('.projects-grid');
        const resultsSection = document.getElementById('projects');

        if (grid) {
            grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
            grid.classList.add('search-refresh-pulse');
            setTimeout(() => grid.classList.remove('search-refresh-pulse'), 1000);
        } else if (resultsSection) {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    };

    // Attach to search input (Enter key)
    const searchInputEl = document.getElementById('hero-keyword-input');
    if (searchInputEl) {
        searchInputEl.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                triggerSearch(e);
            }
        });
    }

    // Attach to search buttons using event delegation for maximum reliability
    document.addEventListener('click', (e) => {
        const searchBtn = e.target.closest('.filter__btn-search');
        if (searchBtn) {
            triggerSearch(e);
        }
    });

    // --- Reset Filters Logic ---
    const resetFiltersBtn = document.getElementById('clear-filters-btn');
    if (resetFiltersBtn) {
        resetFiltersBtn.addEventListener('click', () => {
            // 1. Clear Keyword
            const searchInput = document.getElementById('hero-keyword-input');
            if (searchInput) searchInput.value = '';

            // 2. Clear All Checkboxes
            document.querySelectorAll('.multi-select-dropdown input[type="checkbox"]').forEach(cb => {
                cb.checked = false;
            });

            // Reset Active Project
            window.activeSearchProject = null;
            document.querySelectorAll('.project-select-btn').forEach(b => b.classList.remove('active'));
            const secRow = document.getElementById('secondary-filters-row');
            if (secRow) secRow.style.display = 'none';

            // 3. Reset Toggles to 'Buy' and 'All'
            document.querySelectorAll('.filter__toggle-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-val') === 'buy');
            });
            document.querySelectorAll('.filter__status-btn').forEach(btn => {
                btn.classList.toggle('active', btn.getAttribute('data-val') === 'all');
            });

            // 4. Update Filter Labels
            if (typeof updateFilterLabels === 'function') updateFilterLabels();

            // 5. Refresh Filter Options (Enables/Disables boxes correctly)
            if (typeof refreshFilterOptions === 'function') refreshFilterOptions();

            // 6. Final Render
            renderProjectCards();

        });
    }

    // Initial Render & Translation
    setLanguage(currentLang);

    // If not in a project-specific view, render the overview
    const isProjectView = document.querySelector('.internal-filter-bar');
    if (!isProjectView) {
        renderProjectCards();
    }

    // --- Hero Slider Logic ---
    let currentHeroSlide = 0;
    let heroSlideTimer;
    const heroTitlesList = [
        { title: "hero_title", subtitle: "hero_subtitle" },             // Slide 0: Porto Golf
        { title: "nav_porto_said", subtitle: "hero_slide3_subtitle" },  // Slide 1: Porto Said
        { title: "Celebration", subtitle: "hero_slide4_subtitle" }      // Slide 2: Celebration
    ];

    window.setHeroSlide = function (index) {
        const slides = document.querySelectorAll('.hero-slide');
        const dots = document.querySelectorAll('.hero-dot');
        const titleEl = document.querySelector('.hero-title-center');
        const subtitleEl = document.querySelector('.hero-subtitle-center');

        if (slides.length === 0) return;

        currentHeroSlide = index;
        if (currentHeroSlide >= slides.length) currentHeroSlide = 0;
        if (currentHeroSlide < 0) currentHeroSlide = slides.length - 1;

        slides.forEach((slide, i) => slide.classList.toggle('active', i === currentHeroSlide));
        dots.forEach((dot, i) => dot.classList.toggle('active', i === currentHeroSlide));

        if (titleEl) {
            // Add a special class for the first slide (which has the long title)
            titleEl.classList.toggle('title-long', currentHeroSlide === 0);
        }

        if (titleEl && subtitleEl) {
            const info = heroTitlesList[currentHeroSlide];
            titleEl.setAttribute('data-i18n', info.title);
            subtitleEl.setAttribute('data-i18n', info.subtitle);
            // Re-run localization for these specific elements
            const t = translations[currentLang];
            let finalTitle = (t && t[info.title]) ? t[info.title] : titleEl.textContent;

            // iPhone SE Fix: Remove "Investment" if screen is small and it's the first slide
            if (window.innerWidth <= 380 && currentHeroSlide === 0) {
                finalTitle = finalTitle.replace(/Investment/g, '').replace(/Ø§Ù„Ø§Ø³ØªØ«Ù…Ø§Ø±/g, '').trim();
            }

            titleEl.textContent = finalTitle;
            if (t && t[info.subtitle]) subtitleEl.textContent = t[info.subtitle];
        }

        clearInterval(heroSlideTimer);
        heroSlideTimer = setInterval(() => window.setHeroSlide(currentHeroSlide + 1), 7000);
    };

    window.moveHeroSlide = function (direction) {
        window.setHeroSlide(currentHeroSlide + direction);
    };

    // Swipe Functionality
    const sliderContainer = document.querySelector('.hero-section');
    let touchStartX = 0;
    let touchEndX = 0;

    if (sliderContainer) {
        sliderContainer.addEventListener('touchstart', e => {
            if (e.target.closest('button, input, a, select')) return;
            touchStartX = e.changedTouches[0].screenX;
        }, { passive: true });

        sliderContainer.addEventListener('touchend', e => {
            if (e.target.closest('button, input, a, select')) return;
            touchEndX = e.changedTouches[0].screenX;
            handleSwipe();
        }, { passive: true });

        // Mouse drag as well
        let isDragging = false;
        let startX = 0;

        sliderContainer.addEventListener('mousedown', e => {
            if (e.target.closest('button, input, a, select')) return;
            isDragging = true;
            startX = e.screenX;
            sliderContainer.style.cursor = 'grabbing';
        });

        sliderContainer.addEventListener('mouseup', e => {
            if (!isDragging) return;
            sliderContainer.style.cursor = '';
            const endX = e.screenX;
            const diff = startX - endX;
            if (Math.abs(diff) > 50) {
                if (diff > 0) window.moveHeroSlide(1);
                else window.moveHeroSlide(-1);
            }
            isDragging = false;
        });

        sliderContainer.addEventListener('mouseleave', () => {
            isDragging = false;
        });

        function handleSwipe() {
            const diff = touchStartX - touchEndX;
            if (Math.abs(diff) > 50) { // threshold
                if (diff > 0) window.moveHeroSlide(1); // swipe left -> next
                else window.moveHeroSlide(-1); // swipe right -> prev
            }
        }
    }

    // Auto-start slider with a small delay to ensure rendering
    setTimeout(() => {
        if (document.querySelectorAll('.hero-slide').length > 0) {
            window.setHeroSlide(0);
        }
    }, 500);
    // --- Featured Portfolio Slider ---
    const portfolioTrack = document.getElementById('portfolio-track');
    const prevBtn = document.getElementById('prev-project');
    const nextBtn = document.getElementById('next-project');
    let portfolioScrollPos = 0;

    if (portfolioTrack && prevBtn && nextBtn) {
        const getCardWidth = () => {
            const card = portfolioTrack.querySelector('.portfolio-card');
            return card ? card.offsetWidth + 30 : 410; // card width + gap
        };

        nextBtn.onclick = () => {
            const cardWidth = getCardWidth();
            const maxScroll = portfolioTrack.scrollWidth - portfolioTrack.parentElement.offsetWidth;
            portfolioScrollPos = Math.min(portfolioScrollPos + cardWidth, maxScroll);
            portfolioTrack.style.transform = `translateX(${currentLang === 'ar' ? portfolioScrollPos : -portfolioScrollPos}px)`;
        };

        prevBtn.onclick = () => {
            const cardWidth = getCardWidth();
            portfolioScrollPos = Math.max(portfolioScrollPos - cardWidth, 0);
            portfolioTrack.style.transform = `translateX(${currentLang === 'ar' ? portfolioScrollPos : -portfolioScrollPos}px)`;
        };

        // Reset on window resize
        window.addEventListener('resize', () => {
            portfolioScrollPos = 0;
            portfolioTrack.style.transform = 'translateX(0)';
        });
    }

    // --- Scroll Performance Optimization ---
    let scrollTimeout;
    window.addEventListener('scroll', () => {
        if (!document.body.classList.contains('is-scrolling')) {
            document.body.classList.add('is-scrolling');
        }
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
            document.body.classList.remove('is-scrolling');
        }, 150);
    }, { passive: true });

    // --- Initialize all image upload sections ---
    if (typeof initBuildingImageUpload === 'function') {
        // console.log("Initializing Building Image Upload...");
        initBuildingImageUpload();
    }
    if (typeof initAreaImageUpload === 'function') {
        // console.log("Initializing Area Image Upload...");
        initAreaImageUpload();
    }
    if (typeof initUnitImageUpload === 'function') {
        // console.log("Initializing Unit Image Upload...");
        initUnitImageUpload();
    }

    // Initialize Project Selection Logic
    if (typeof window.setupProjectSelectionLogic === 'function') {
        window.setupProjectSelectionLogic();
    }
});

// --- NEW: Strict Project Selection Logic ---
window.setupProjectSelectionLogic = function () {
    // console.log("Initializing Project Selection Logic...");
    const projectBtns = document.querySelectorAll('.project-select-btn');
    const secondaryRow = document.getElementById('secondary-filters-row');

    if (projectBtns.length === 0) return;

    // Ensure secondary row is hidden initially (Strict Requirement)
    if (secondaryRow && !window.activeSearchProject) {
        secondaryRow.style.display = 'none';
        // Also ensure no filters are pre-checked
    }

    projectBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const pName = btn.getAttribute('data-project');
            console.log("Project Selected: " + pName);

            // 1. Visual Toggle
            projectBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // 2. Set State
            window.activeSearchProject = normalizeProjectArea(pName);
            console.log(`? Set window.activeSearchProject to: "${window.activeSearchProject}" (from button: "${pName}")`);

            // 3. Show Secondary Filters
            if (secondaryRow) {
                secondaryRow.style.display = 'flex';
                // Small animation
                secondaryRow.style.opacity = '0';
                secondaryRow.style.transform = 'translateY(-10px)';
                secondaryRow.style.transition = 'all 0.3s ease';
                requestAnimationFrame(() => {
                    secondaryRow.style.opacity = '1';
                    secondaryRow.style.transform = 'translateY(0)';
                });
            }


            // 4. FULL FILTER RESET - Ensures clean state for new Project
            // A. Uncheck all multi-select items (Buildings, Areas, Delivery)
            document.querySelectorAll('.multi-select-dropdown input[type="checkbox"]').forEach(cb => cb.checked = false);

            // B. Reset Toggle Status Buttons (Rent/Buy, Ready/U-Const/All)
            // Reset to Defaults: Buy + All
            const statusAllBtn = document.querySelector('.filter__status-btn[data-val="all"]');
            if (statusAllBtn) statusAllBtn.click(); // This will trigger its logic

            // C. Clear Internal Filter State Variables
            if (typeof selectedProjs !== 'undefined') selectedProjs = [];
            if (typeof selectedAreas !== 'undefined') selectedAreas = [];
            if (typeof selectedDelivery !== 'undefined') selectedDelivery = [];

            // D. Reset Dropdown Text Labels
            const t = translations[currentLang] || {};
            const labelsMap = {
                'selected-projects-text': 'filter_project', // "Buildings"
                'selected-areas-text': 'filter_area',       // "Area"
                'selected-delivery-text': 'filter_delivery', // "Delivery"
                'selected-project-area-text': 'filter_project_area'
            };
            Object.entries(labelsMap).forEach(([id, i18nKey]) => {
                const el = document.getElementById(id);
                if (el) {
                    // Fallback English text
                    let defaultText = "Select";
                    if (id.includes('projects')) defaultText = "Buildings";
                    if (id.includes('areas')) defaultText = "Area";
                    if (id.includes('delivery')) defaultText = "Delivery (All)";

                    el.textContent = t[i18nKey] || defaultText;
                }
            });

            // 5. Trigger Filter Refresh (Force Reset of Selections)
            if (typeof refreshFilterOptions === 'function') refreshFilterOptions(true);
        });
    });
};

// --- Featured Portfolio Slider Render Function ---
function renderFeaturedProjects() {
    const track = document.getElementById('portfolio-track');
    if (!track) return;
    track.innerHTML = '';

    // Safety check for metadata logic
    let areasToRender = (typeof projectAreas !== 'undefined') ? [...projectAreas] : ["Porto Golf Marina", "Porto Said", "Celebration"];

    // Ensure critical projects are always rendered even if missing from partial updates
    if (!areasToRender.includes("Celebration")) areasToRender.push("Celebration");

    if (typeof getSortedAreasList === 'function') areasToRender = getSortedAreasList(areasToRender);
    // Also ensure projectNames and projectMetadata exist
    const names = (typeof projectNames !== 'undefined') ? projectNames : [];
    const metaStore = (typeof projectMetadata !== 'undefined') ? projectMetadata : {};
    const areaStore = (typeof areaMetadataStore !== 'undefined') ? areaMetadataStore : {};
    const fmt = (n) => n.toLocaleString('en-US');

    areasToRender.forEach(areaName => {
        let buildings = names.filter(p => {
            const m = metaStore[p];
            return m && normalizeProjectArea(m.projectArea) === normalizeProjectArea(areaName);
        });
        if (typeof getSortedBuildingsList === 'function') buildings = getSortedBuildingsList(buildings);

        let imagesArray = [];
        let representativeBuilding = null;

        // Optimized structure: Primary images from 'project-overview-cover' folder
        const areaDefaults = {
            "Porto Golf Marina": [
                "assets/images/projects/porto-golf-marina/project-overview-cover/cover-1.webp",
                "assets/images/projects/porto-golf-marina/project-overview-cover/cover-2.webp",
                "assets/images/projects/porto-golf-marina/project-overview-cover/cover-3.webp"
            ],
            "Porto Said": [
                "assets/images/projects/porto-said/project-overview-cover/cover-1.webp",
                "assets/images/projects/porto-said/project-overview-cover/cover-2.webp",
                "assets/images/projects/porto-said/project-overview-cover/cover-3.webp"
            ],
            "Celebration": [
                "assets/images/projects/celebration/project-overview-cover/cover-1.webp",
                "assets/images/projects/celebration/project-overview-cover/cover-2.webp",
                "assets/images/projects/celebration/project-overview-cover/cover-3.webp",
                "assets/images/projects/celebration/project-overview-cover/cover-4.webp"
            ]
        };

        // Priority 1: Explicit Area Images
        if (areaStore[areaName] && areaStore[areaName].image) {
            const imgData = areaStore[areaName].image;
            if (Array.isArray(imgData)) {
                imagesArray = imgData.map(img => img.data || img);
            } else {
                imagesArray = [imgData.data || imgData];
            }
        }

        // Priority 2: Hardcoded Defaults (Supplement/Fallback)
        const defaults = areaDefaults[normalizeProjectArea(areaName)];
        if (defaults) {
            // Merge with existing images, ensuring no duplicates
            defaults.forEach(d => {
                if (!imagesArray.includes(d)) imagesArray.push(d);
            });
        }

        let minPrice = Infinity;
        let locationStr = "Egypt"; // Default

        if (buildings.length > 0) {
            representativeBuilding = buildings[0]; // Default

            // If we still have very few images, try to pull from representative building
            if (imagesArray.length < 2) {
                const bWithImg = buildings.find(b => metaStore[b] && metaStore[b].image);
                if (bWithImg) {
                    const bImgData = metaStore[bWithImg].image;
                    const bImgs = Array.isArray(bImgData) ? bImgData.map(img => img.data || img) : [bImgData.data || bImgData];
                    bImgs.forEach(img => { if (!imagesArray.includes(img)) imagesArray.push(img); });
                }
            }

            // Priority 3: Fallback to first Unit image if still empty (if imagesArray is still too small)
            if (imagesArray.length < 2) {
                const uWithImg = (typeof inventory !== 'undefined') ? inventory.find(u => buildings.includes(u.project) && u.images && u.images.length > 0) : null;
                if (uWithImg) {
                    uWithImg.images.map(img => img.data || img).forEach(img => {
                        if (!imagesArray.includes(img)) imagesArray.push(img);
                    });
                }
            }

            buildings.forEach(b => {
                const bUnits = (typeof getUnitsInProjectFast !== 'undefined') ? getUnitsInProjectFast(b) : (typeof inventory !== 'undefined' ? inventory.filter(u => u.project === b) : []);
                bUnits.forEach(u => {
                    if (u.price && u.price < minPrice) minPrice = u.price;
                });
            });

            if (areaName.includes("Golf")) {
                locationStr = currentLang === 'ar' ? "بورتو جولف مارينا - الساحل الشمالي" : "Porto Golf Marina – North Coast, Egypt";
                if (minPrice === Infinity) minPrice = 1953000;
            }
            else if (areaName.includes("Said")) {
                locationStr = currentLang === 'ar' ? "بورتو سعيد - بورسعيد" : "Porto Said – Port Said, Egypt";
                if (minPrice === Infinity) minPrice = 3000000;
            }
            else if (areaName.includes("Celebration")) {
                locationStr = currentLang === 'ar' ? "سليبريشن - الساحل الشمالي" : "Celebration – North Coast, Egypt";
                if (minPrice === Infinity) minPrice = 5500000;
            }
            else locationStr = currentLang === 'ar' ? "موقع متميز" : "Prime Location";
        }

        if (imagesArray.length === 0) imagesArray = ["https://placehold.co/800x600/0f172a/c9a23f?text=" + encodeURIComponent(areaName)];
        if (minPrice === Infinity) minPrice = currentLang === 'ar' ? "اتصل للسعر" : "Call for Price";
        else minPrice = "EGP " + fmt(minPrice);

        // Render Card
        const card = document.createElement('div');
        card.className = 'portfolio-card';
        card.onclick = () => {
            const normalized = normalizeProjectArea(areaName);
            if (window.projectDetailPages && window.projectDetailPages[normalized]) {
                const slug = getProjectSlug(normalized);
                window.location.href = `${window.projectDetailPages[normalized]}?project=${slug}`;
            } else if (representativeBuilding) {
                // False flag allows redirection to Landing Page (Compound Guide) if available
                openProject(representativeBuilding, false);
            }
        };

        card.innerHTML = `
    <div class="portfolio-card-img">
                <div class="portfolio-card-badge">${currentLang === 'ar' ? 'مميز' : 'Featured'}</div>
                <img src="${imagesArray[0]}" 
                     data-images='${JSON.stringify(imagesArray).replace(/'/g, "&apos;")}' 
data-current-index="0"
class="portfolio-cycle-image"
alt="${areaName}"
loading="lazy"
onerror="this.src='https://placehold.co/800x600/0f172a/c9a23f?text=Image+Not+Found'">
            </div>
    <div class="portfolio-card-content">
        <h3 class="portfolio-card-title">${areaName}</h3>
        <div class="portfolio-card-meta">
            <div class="portfolio-meta-item">
                <i class="fas fa-map-marker-alt"></i> <span>${locationStr}</span>
            </div>
        </div>
        <div class="portfolio-card-footer">
            <div class="portfolio-price-info">
                <span class="portfolio-price-label">${currentLang === 'ar' ? 'يبدأ من:' : 'Starting From:'}</span>
                <span class="portfolio-price-value">${(minPrice === "Call for Price" || minPrice === "اتصل للسعر") ? minPrice : minPrice}</span>
            </div>
            ${representativeBuilding || (window.projectDetailPages && window.projectDetailPages[normalizeProjectArea(areaName)]) ?
                `<button class="portfolio-view-btn"><i class="fas fa-arrow-right"></i></button>` :
                `<button class="portfolio-view-btn" style="opacity:0.5; cursor:not-allowed;"><i class="fas fa-lock"></i></button>`}
        </div>
    </div>
`;
        track.appendChild(card);
    });

    // Start auto-cycling images
    startProjectImageCycling();
}

/**
 * Automatically cycles through project images for each card
 * every 5 seconds with a smooth fade effect.
 */
function startProjectImageCycling() {
    if (window.projectCycleInterval) clearInterval(window.projectCycleInterval);

    window.projectCycleInterval = setInterval(() => {
        const cycleImages = document.querySelectorAll('.portfolio-cycle-image');
        cycleImages.forEach(img => {
            try {
                const imagesStr = img.getAttribute('data-images');
                if (!imagesStr) return;

                const images = JSON.parse(imagesStr);
                if (images.length <= 1) return;

                let curIdx = parseInt(img.getAttribute('data-current-index') || '0');
                const nextIdx = (curIdx + 1) % images.length;

                // Fade out, change src, fade in
                img.style.transition = 'opacity 0.6s ease';
                img.style.opacity = '0';

                setTimeout(() => {
                    img.src = images[nextIdx];
                    img.setAttribute('data-current-index', nextIdx);
                    img.style.opacity = '1';
                }, 600);
            } catch (err) {
                console.error("Error cycling project image:", err);
            }
        });
    }, 7000); // 7 seconds interval as requested
}

// --- PROJECT AREA FILTERS LOGIC ---
let activeAreaFilter = null; // 'Porto Golf Marina', 'Porto Said', 'Celebration', or null (All)

document.addEventListener('DOMContentLoaded', () => {
    const areaBtns = document.querySelectorAll('.area-tab-btn');
    areaBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const area = btn.getAttribute('data-area');

            // Toggle Logic
            if (activeAreaFilter === area) {
                activeAreaFilter = null; // Deselect if already active
                btn.classList.remove('active');
            } else {
                activeAreaFilter = area;
                // Update UI classes
                areaBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
            }

            // Re-render
            renderProjectCards();
        });
    });
});



// Helper to update Section Header (Project / Area Name)
function updateSectionTitle(filters = {}, forceProjectName = null) {
    const titleEl = document.querySelector('#projects .section-title');
    const subtitleEl = document.querySelector('#projects .section-subtitle');
    const t = translations[currentLang];
    if (!titleEl || !subtitleEl) return;

    let dynamicTitle = t.port_title || "Porto Golf • Porto Said • Celebration";
    let dynamicSubtitle = t.port_subtitle || "Projects"; // Fixed label as requested

    // 0. Keyword Match (Highest precedence)
    if (filters.keyword) {
        const searchTerm = filters.keyword.length > 20 ? filters.keyword.substring(0, 17) + '...' : filters.keyword;
        dynamicTitle = (currentLang === 'ar' ? 'نتائج البحث عن' : 'Search Results for') + `: "${searchTerm}"`;
        dynamicSubtitle = (currentLang === 'ar' ? 'المشاريع والوحدات المطابقة' : 'Matching Projects & Units');
    }
    // 1. Active Area Tab (e.g. Porto Golf tab)
    else if (activeAreaFilter) {
        dynamicTitle = activeAreaFilter;
    }
    // 2. Focused Project or Single Building
    else if (forceProjectName || (filters.projects && filters.projects.length === 1)) {
        const pName = forceProjectName || filters.projects?.[0];
        const meta = projectMetadata[pName];
        if (meta) dynamicTitle = normalizeProjectArea(meta.projectArea);
        else dynamicTitle = pName;
    }
    // 3. Single Area selection in dropdown
    else if (filters.projectArea && filters.projectArea.length === 1) {
        dynamicTitle = filters.projectArea[0];
    }
    // 4. Multiple specific buildings selected
    else if (filters.projects && filters.projects.length > 0) {
        const areas = new Set();
        filters.projects.forEach(pn => {
            const m = projectMetadata[pn];
            if (m) areas.add(normalizeProjectArea(m.projectArea));
        });
        if (areas.size === 1) dynamicTitle = Array.from(areas)[0];
        else dynamicTitle = Array.from(areas).slice(0, 3).join(' • ');
    }

    titleEl.innerHTML = dynamicTitle;
    subtitleEl.textContent = dynamicSubtitle;

    // Add specific styling for the projects header to match the image
    const header = document.querySelector('#projects .section-header');
    if (header) {
        header.style.textAlign = 'center';
        header.style.marginBottom = '20px';

        const title = header.querySelector('.section-title');
        const subtitle = header.querySelector('.section-subtitle');

        if (title) {
            title.style.fontFamily = "'Cinzel', serif";
            title.style.fontSize = "2.2rem";
            title.style.color = "var(--gold-main)";
            title.style.textTransform = "uppercase";
            title.style.letterSpacing = "2px";
            title.style.marginBottom = "5px";
            title.style.textAlign = "center"; // Enforce center
        }

        if (subtitle) {
            subtitle.style.fontSize = "1.5rem";
            subtitle.style.color = "var(--navy-deep)";
            subtitle.style.fontWeight = "600";
            subtitle.style.letterSpacing = "1px";
        }
    }
}

/**
 * Helper: Animate Counter
 */
function animateCount(el, target, duration = 1000, suffix = '') {
    if (!el) return;

    // Smooth transition from skeleton to value
    el.classList.remove('is-loading');
    el.classList.add('value-ready');
    el.innerHTML = '0' + suffix;

    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const currentCount = Math.floor(progress * target);

        el.innerHTML = currentCount.toLocaleString('en-US') + suffix;

        if (progress < 1) {
            window.requestAnimationFrame(step);
        } else {
            el.innerHTML = target.toLocaleString('en-US') + suffix;
        }
    };
    window.requestAnimationFrame(step);
}

// Function to update global stats in Trust Strip
window.updateGlobalUnitStats = function () {
    const unitEl = document.getElementById('dynamic-total-units');
    const projEl = document.getElementById('dynamic-total-projects');
    const compEl = document.getElementById('stat-projects');
    const estEl = document.getElementById('stat-established');

    const inv = (typeof inventory !== 'undefined' && inventory.length > 0) ? inventory : masterInventory;
    const names = (typeof projectNames !== 'undefined') ? projectNames : [];

    // 1. Units Count
    if (unitEl) {
        const unitCount = inv.filter(u => (u.status || 'Available').toLowerCase() === 'available').length;
        // Only update if value changed or first time
        if (unitCount > 0 || unitEl.classList.contains('is-loading')) {
            animateCount(unitEl, unitCount);
        }
    }

    // 2. Total Buildings Count
    if (projEl) {
        if (names.length > 0 || projEl.classList.contains('is-loading')) {
            animateCount(projEl, names.length);
        }
    }

    // 3. Static-ish counts (but with premium animation)
    if (compEl && compEl.classList.contains('is-loading')) {
        animateCount(compEl, 18, 1000, '<span>+</span>');
    }
    if (estEl && estEl.classList.contains('is-loading')) {
        animateCount(estEl, 2018, 1200);
    }
};

// Render Main Project Cards
function renderProjectCards(filters = {}) {
    window.renderProjectCards = renderProjectCards;
    window.updateGlobalUnitStats();
    updateSectionTitle(filters);
    const container = document.querySelector('.projects-grid');
    if (!container) return;

    // 🚀 PERFORMANCE OPTIMIZATION: High-speed project lookup cache
    const projectInventoryMap = new Map();
    inventory.forEach(u => {
        // Index by pre-normalized building ID and project ID/Name
        const keys = new Set();
        if (u.buildingId) keys.add(u.buildingId);
        if (u.projectId) keys.add(u.projectId);
        if (u.project) keys.add(normalizeId(u.project));

        keys.forEach(k => {
            if (!k) return;
            if (!projectInventoryMap.has(k)) projectInventoryMap.set(k, []);
            projectInventoryMap.get(k).push(u);
        });
    });

    const getUnitsInProjectFast = (pName) => {
        const norm = normalizeId(pName);
        return projectInventoryMap.get(norm) || [];
    };

    const t = translations[currentLang];
    container.innerHTML = '';
    let projectsToRender = projectNames;
    if (typeof getSortedBuildingsList === 'function') projectsToRender = getSortedBuildingsList(projectsToRender);

    // Category mode filtering removed for unified search

    // EXCLUDE PARENT PROJECT DOCUMENTS from being displayed as cards
    // We only want to show actual buildings (e.g. "B133"), not the container projects (e.g. "porto-golf-marina")
    const excludedProjects = ["porto-golf-marina", "porto-said", "george", "egypt-projects"];
    projectsToRender = projectsToRender.filter(p => !excludedProjects.includes(p.toLowerCase()));

    // 1. Strict Active Project Filter (Global State)
    if (window.activeSearchProject) {
        projectsToRender = projectsToRender.filter(p => {
            const meta = projectMetadata[p];
            return meta && normalizeProjectArea(meta.projectArea) === window.activeSearchProject;
        });
    }

    // 2. Filter by Projects (Multi-select)
    if (filters.projects && filters.projects.length > 0) {
        projectsToRender = projectsToRender.filter(p => filters.projects.includes(p));
    }

    // 3. Business Rules Logic (Rent, Type, Status)

    // Rule: Rent logic - Now uses actual unit intent
    // Rule: Rent logic - Checks units first, falls back to metadata
    if (filters.rentBuy) {
        projectsToRender = projectsToRender.filter(pName => {
            // ?? BYPASS: Always show if explicitly selected via tab OR dropdown
            if (activeSearchProject && normalizeId(pName) === normalizeId(activeSearchProject)) return true;
            if (filters.projects && filters.projects.includes(pName)) return true;

            const filter = filters.rentBuy.toLowerCase();
            const normalizedFilter = (filter === 'buy' || filter === 'sale' || filter === 'primary') ? 'buy' : filter;

            // 1. Check Units (Truth)
            const projectUnits = getUnitsInProjectFast(pName);
            if (projectUnits.length > 0) {
                return projectUnits.some(u => {
                    const i = (u.intent || 'buy').toLowerCase();
                    const uIntent = (i === 'sale' || i === 'primary' || i === 'resale') ? 'buy' : i;
                    return uIntent === normalizedFilter;
                });
            }

            // 2. Fallback to Metadata (if units empty)
            const meta = projectMetadata[pName];
            if (meta && meta.status) {
                const mStatus = meta.status.toLowerCase();
                const metaIntent = (mStatus === 'sale' || mStatus === 'primary') ? 'buy' : mStatus;
                return metaIntent === normalizedFilter;
            }

            // Default: If no units and no metadata status, generally allow 'buy' as default for real estate
            return normalizedFilter === 'buy';
        });
    }

    // Rule: Type logic (All units are residential, commercial returns nothing)
    if (filters.types && filters.types.length > 0) {
        if (filters.types.includes('commercial') && !filters.types.includes('residential')) {
            projectsToRender = [];
        }
    }

    // Rule: Status logic (Dynamic from Firebase Metadata)
    if (filters.status && filters.status !== 'all') {
        projectsToRender = projectsToRender.filter(p => {
            if (activeSearchProject && normalizeId(p) === normalizeId(activeSearchProject)) return true;
            if (filters.projects && filters.projects.includes(p)) return true;
            const meta = projectMetadata[p];
            // Fallback to legacy logic if metadata not yet loaded
            const isReady = meta ? (meta.constStatus || '').toLowerCase() === 'ready' : (p.includes('121') || p === '224');

            if (filters.status === 'ready') return isReady;
            if (filters.status === 'u-const') return !isReady;
            return true;
        });
    }

    // Rule: Delivery Filtering
    if (filters.delivery && filters.delivery.length > 0) {
        projectsToRender = projectsToRender.filter(p => {
            if (activeSearchProject && normalizeId(p) === normalizeId(activeSearchProject)) return true;
            if (filters.projects && filters.projects.includes(p)) return true;
            const meta = projectMetadata[p];
            return meta && filters.delivery.includes(meta.delivery);
        });
    }

    // Rule: Project Area Filtering
    if (filters.projectArea && filters.projectArea.length > 0) {
        projectsToRender = projectsToRender.filter(p => {
            const meta = projectMetadata[p];
            if (!meta) return false;
            return filters.projectArea.includes(normalizeProjectArea(meta.projectArea));
        });
    }

    // --- NEW: Active Tab Filter (Global) ---
    if (activeAreaFilter) {
        projectsToRender = projectsToRender.filter(p => {
            const meta = projectMetadata[p];
            if (!meta) return false;
            return normalizeProjectArea(meta.projectArea) === activeAreaFilter;
        });
    }


    // 4. Area Filter
    if (filters.areas && filters.areas.length > 0) {
        projectsToRender = projectsToRender.filter(pName => {
            // ?? BYPASS: If this is the explicitly selected building, ALWAYS show it
            // This allows users to click "View Units" and see filtered results on the next page
            // even if the homepage check fails (e.g. data sync issues or strict filtering)
            if (activeSearchProject && normalizeId(pName) === normalizeId(activeSearchProject)) return true;
            if (filters.projects && filters.projects.includes(pName)) {
                return true;
            }

            const projectUnits = getUnitsInProjectFast(pName);
            const pMeta = projectMetadata[pName];
            const pContext = pMeta ? normalizeProjectArea(pMeta.projectArea) : null;
            return projectUnits.some(u => matchesAreaRange(u.area, filters.areas, pContext));
        });
    }

    // ?? SMART RESCUE: If no matches in current specific filters (like Porto Said), search EVERYWHERE 
    // This satisfies the "Don't show No Results" requirement when a specific area is chosen
    if (projectsToRender.length === 0 && (filters.areas?.length > 0 || filters.keyword)) {
        projectsToRender = projectNames.filter(pName => {
            const projectUnits = getUnitsInProjectFast(pName);
            if (filters.areas?.length > 0) {
                return projectUnits.some(u => matchesAreaRange(u.area, filters.areas, null));
            }
            return projectUnits.length > 0; // For keyword, just any building with units
        });

        if (projectsToRender.length > 0) {
            const hint = document.createElement('div');
            hint.className = 'search-hint-alert';
            hint.style = 'grid-column: 1/-1; background:rgba(201, 162, 63, 0.1); color:var(--gold-main); padding:15px; border-radius:12px; margin-bottom:20px; border:1px solid rgba(201, 162, 63, 0.3); font-weight:600; text-align:center; animation: fadeIn 0.5s ease;';
            hint.innerHTML = `<i class="fas fa-info-circle"></i> ${currentLang === 'ar' ? 'وجدنا طلبك في المباني التالية:' : 'Found your requested areas in these available buildings:'}`;
            container.appendChild(hint);
        }
    }

    // 5. Keyword Filter (Does the project name or area match?)
    if (filters.keyword) {
        const key = filters.keyword.toLowerCase().trim();
        const t = translations[currentLang] || {};

        projectsToRender = projectsToRender.filter(pName => {
            const meta = projectMetadata[pName];
            const area = meta ? normalizeProjectArea(meta.projectArea).toLowerCase() : '';
            const unitsInProject = getUnitsInProjectFast(pName);

            // Get translated names if available
            // Note: In this project, project names are often the keys themselves or mapped in nav_ tags
            const enKeys = Object.keys(translations.en);
            const projTransKey = enKeys.find(k => translations.en[k] === pName);
            const projNameAR = (projTransKey && translations.ar[projTransKey]) ? translations.ar[projTransKey].toLowerCase() : '';

            const areaTransKey = enKeys.find(k => translations.en[k] === (meta ? meta.projectArea : ''));
            const areaNameAR = (areaTransKey && translations.ar[areaTransKey]) ? translations.ar[areaTransKey].toLowerCase() : '';

            // 1. Match Project Name (EN or AR)
            const matchesProj = pName.toLowerCase().includes(key) || projNameAR.includes(key);
            if (matchesProj) return true;

            // 2. Match Area Name (EN or AR)
            const matchesArea = area.includes(key) || areaNameAR.includes(key);
            if (matchesArea) return true;

            // 3. Match Units (Code, View, Area val) inside this building
            return unitsInProject.some(u => {
                const uCode = (u.code || '').toLowerCase();
                const uView = (u.view || '').toLowerCase();
                const uArea = String(u.area || '');

                // Translated view
                const viewTransKey = enKeys.find(k => translations.en[k] === u.view);
                const viewNameAR = (viewTransKey && translations.ar[viewTransKey]) ? translations.ar[viewTransKey].toLowerCase() : '';

                // Robust Area Match: check if exact number or string contains it
                const areaMatch = uArea === key || uArea.includes(key);

                return uCode.includes(key) ||
                    uView.includes(key) ||
                    viewNameAR.includes(key) ||
                    areaMatch;
            });
        });
    }

    if (projectsToRender.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:50px; color:var(--text-secondary); background:var(--bg-secondary); border-radius:15px; border:1px dashed var(--border-light);">
            <i class="fas fa-search" style="font-size:3rem; margin-bottom:20px; opacity:0.3;"></i>
            <p>${currentLang === 'ar' ? 'عفواً، لم نجد نتائج مطابقة. جرب تغيير معايير البحث.' : 'No specific results found. Try changing the criteria or area.'}</p>
            <button class="btn-gold" onclick="renderProjectCards()" style="margin-top:20px; padding:10px 20px;">${currentLang === 'ar' ? 'عرض كل المشاريع والمباني' : 'Show All Projects & Buildings'}</button>
        </div>`;
        return;
    }

    projectsToRender.forEach((pName, index) => {
        const card = document.createElement('div');
        card.className = 'project-card reveal';
        card.setAttribute('data-delay', (index % 4) * 100);

        let count = getUnitsInProjectFast(pName).filter(u => {
            // ONLY count 'Available' units for public display if status exists
            if (u.status && u.status.toLowerCase() !== 'available') return false;
            return true;
        }).length;

        // Fallback to Metadata adminCount if inventory match failed but meta has a count (e.g. from Firestore Buildings doc)
        if (count === 0 && projectMetadata[pName] && projectMetadata[pName].availableUnits) {
            count = projectMetadata[pName].availableUnits;
        }
        const meta = projectMetadata[pName];

        // --- MULTI-IMAGE LOGIC ---
        let imgUrls = [];

        if (meta && meta.image) {
            const imgData = meta.image;
            if (Array.isArray(imgData)) {
                imgUrls = imgData.map(img => (typeof img === 'object' && img.data) ? img.data : img);
            } else {
                imgUrls = [imgData];
            }
        }

        // Fallback: Use image from one of the units in this project
        if (imgUrls.length === 0) {
            const projectUnits = getUnitsInProjectFast(pName);

            // 🔥 ROBUST FALLBACK: Find the best unit to represent this building
            // Sort to prefer units WITH images
            const unitWithImg = projectUnits.sort((a, b) => {
                const aHas = (a.images && a.images.length > 0) || a.floorPlan;
                const bHas = (b.images && b.images.length > 0) || b.floorPlan;
                if (aHas && !bHas) return -1;
                if (!aHas && bHas) return 1;
                return 0;
            }).find(u => (u.images && u.images.length > 0) || u.floorPlan);

            if (unitWithImg) {
                let uImgData = null;
                if (unitWithImg.images && unitWithImg.images.length > 0) {
                    uImgData = unitWithImg.images[0];
                } else if (unitWithImg.floorPlan) {
                    uImgData = unitWithImg.floorPlan;
                }

                if (uImgData) {
                    const url = (typeof uImgData === 'object' && uImgData.data) ? uImgData.data : uImgData;
                    imgUrls = [url];
                }
            }
        }

        // Fallback 2: Map to generic placeholder if absolutely nothing found
        if (imgUrls.length === 0) {
            imgUrls = ["https://placehold.co/800x600/f8fafc/cbd5e1?text=No+Image+Available"]; // Clean placeholder
        }

        const html = `
    <div class="project-img-container" id="project-slider-${index}">
                <label class="tag-project-badge">${projectMetadata[pName]?.projectArea || RESORT_LOCATION}</label>
                <div class="project-slides-wrapper">
                    ${imgUrls.map((url, i) => `
                        <img src="${url}" alt="${pName}" class="project-slide-img ${i === 0 ? 'active' : ''}" 
                             style="opacity:${i === 0 ? '1' : '0'};" 
                             loading="lazy">
                    `).join('')}
                </div>
            </div>
    <div class="project-content">
        <h2 class="project-card-title">${pName}</h2>
        <p class="project-card-units">
            ${count} ${t.avail_units || (currentLang === 'ar' ? 'وحدة متاحة' : 'Units Available')}
        </p>
        ${projectMetadata[pName] ? `
                <p class="project-card-delivery">
                    <i class="far fa-calendar-alt"></i> ${t.filter_delivery || t.delivery || 'Delivery'}: ${projectMetadata[pName].delivery}
                </p>` : ''}
        <button class="project-view-cta view-project-btn" data-project="${pName}" onclick="openProject('${pName}', true, ${JSON.stringify(filters).replace(/"/g, '&quot;')})">
            ${t.view_units || t.pd_view_units || (currentLang === 'ar' ? 'عرض الوحدات' : 'View Units')}
        </button>
    </div>
`;

        card.innerHTML = html;
        container.appendChild(card);

        // --- TIMER LOGIC (7 SECONDS) ---
        if (imgUrls.length > 1) {
            let currentImgIndex = 0;
            const slides = card.querySelectorAll('.project-slide-img');
            // Store interval ID on the element to clear it later if re-rendered
            if (card._imageCycleInterval) clearInterval(card._imageCycleInterval);
            card._imageCycleInterval = setInterval(() => {
                if (slides[currentImgIndex]) slides[currentImgIndex].style.opacity = '0';
                currentImgIndex = (currentImgIndex + 1) % slides.length;
                if (slides[currentImgIndex]) slides[currentImgIndex].style.opacity = '1';
            }, 7000);
        }

        if (window.revealObserver) window.revealObserver.observe(card);
        else card.classList.add('reveal-visible'); // Fallback

        card.style.cursor = 'pointer';
        card.onclick = (e) => {
            if (e.target.closest('button')) return;
            openProject(pName, true);
        };
    });
}

// Render All Units directly (for "Properties" mode)
function renderAllUnits(filters = {}) {
    updateSectionTitle(filters);
    const container = document.querySelector('.projects-grid');
    if (!container) return;

    container.innerHTML = '';
    const t = translations[currentLang];

    let filtered = inventory;

    // 1. MODE FILTERING:
    if (currentSearchMode === 'projects') {
        filtered = filtered.filter(u => {
            const meta = projectMetadata[u.project];
            return meta && meta.category === 'projects';
        });
    } else {
        // "Properties / All": Include everything
        filtered = filtered;
    }

    // 2. Filter by Projects
    if (filters.projects && filters.projects.length > 0) {
        filtered = filtered.filter(u => filters.projects.includes(u.project));
    }

    // 2. Filter by Status (Ready / U-Const)
    if (filters.status && filters.status !== 'all') {
        filtered = filtered.filter(u => {
            const meta = projectMetadata[u.project];
            const isReady = meta ? (meta.constStatus || '').toLowerCase() === 'ready' : (u.project.includes('121') || u.project === '224');
            return filters.status === 'ready' ? isReady : !isReady;
        });
    }

    // 3. Filter by Delivery
    if (filters.delivery && filters.delivery.length > 0) {
        filtered = filtered.filter(u => {
            const meta = projectMetadata[u.project];
            return meta && filters.delivery.includes(meta.delivery);
        });
    }

    // 4. Filter by Project Area
    if (filters.projectArea && filters.projectArea.length > 0) {
        filtered = filtered.filter(u => {
            const meta = projectMetadata[u.project];
            return meta && filters.projectArea.includes(normalizeProjectArea(meta.projectArea));
        });
    }

    // 5. Filter by Type
    if (filters.types && filters.types.length > 0) {
        filtered = filtered.filter(u => filters.types.includes(u.type.toLowerCase()));
    }

    // 6. Filter by Area (Range)
    if (filters.areas && filters.areas.length > 0) {
        filtered = filtered.filter(u => {
            const meta = projectMetadata[u.project];
            const pContext = meta ? normalizeProjectArea(meta.projectArea) : null;
            return matchesAreaRange(u.area, filters.areas, pContext);
        });
    }

    // 5. Filter by Intent
    if (filters.rentBuy) {
        filtered = filtered.filter(u => (u.intent || 'buy') === filters.rentBuy);
    }

    // Keyword Filter
    if (filters.keyword) {
        const key = filters.keyword.toLowerCase();
        filtered = filtered.filter(u => {
            const meta = projectMetadata[u.project];
            const area = meta ? normalizeProjectArea(meta.projectArea).toLowerCase() : '';
            const uArea = String(u.area || '');

            // Match translated view if possible
            const viewKey = Object.keys(translations.en).find(k => translations.en[k] === u.view);
            const viewAR = viewKey ? (translations.ar[viewKey] || '').toLowerCase() : '';

            return u.code.toLowerCase().includes(key) ||
                u.view.toLowerCase().includes(key) ||
                viewAR.includes(key) ||
                u.floor.toLowerCase().includes(key) ||
                u.project.toLowerCase().includes(key) ||
                area.includes(key) ||
                uArea === key || uArea.includes(key);
        });
    }


    if (filtered.length === 0) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:50px; color:var(--text-secondary); background:var(--bg-secondary); border-radius:15px;">
            <i class="fas fa-search" style="font-size:3rem; margin-bottom:20px; opacity:0.3;"></i>
            <p>${currentLang === 'ar' ? '?????? ?? ???? ????? ????? ??? ????????.' : 'No units found matching these criteria.'}</p>
            <button class="btn-gold" onclick="document.querySelector('.mode-pill[data-mode=projects]').click()" style="margin-top:20px; padding:10px 20px;">${currentLang === 'ar' ? 'تصفح المشاريع' : 'Browse Projects'}</button>
        </div>`;
        return;
    }

    // Wrapper for units grid to maintain responsiveness
    const unitGrid = document.createElement('div');
    unitGrid.className = 'col-12';
    unitGrid.style.gridColumn = '1 / -1';
    unitGrid.style.display = 'grid';
    unitGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(300px, 1fr))';
    unitGrid.style.gap = '25px';
    container.appendChild(unitGrid);

    filtered.forEach((unit, index) => {
        const card = document.createElement('div');
        card.className = 'project-card reveal';
        card.setAttribute('data-delay', (index % 4) * 50);

        const priceFormatted = unit.price.toLocaleString('en-US');
        let imgUrl = 'https://placehold.co/800x600/f1f5f9/64748b?text=Unit+Photo';
        if (unit.images && unit.images.length > 0) {
            const firstImg = unit.images[0];
            imgUrl = (typeof firstImg === 'object' && firstImg.data) ? firstImg.data : firstImg;
        } else if (unit.floorPlan) {
            const fp = unit.floorPlan;
            imgUrl = (typeof fp === 'object' && fp.data) ? fp.data : fp;
        }

        card.innerHTML = `
    <div class="project-img">
                <label class="tag-project" style="background:var(--navy-deep); color:#fff; z-index:10; left:15px; top:15px;">${projectMetadata[unit.project]?.projectArea || RESORT_LOCATION} - ${unit.project}</label>
                <label class="tag-project" style="background:${(unit.intent || 'buy') === 'rent' ? 'var(--gold-main)' : 'var(--navy-deep)'}; color:#fff; z-index:10; left:15px; top:45px;">${(unit.intent || 'buy') === 'rent' ? t.tab_rent : t.tab_buy}</label>
                <label class="tag-project" style="background:${unit.status === 'Sold' ? '#ef4444' : 'var(--gold-muted)'}; color:#fff; z-index:10; right:15px; left:auto; top:15px;">${unit.status}</label>
                <img src="${imgUrl}" alt="${unit.project}" loading="lazy">
            </div>
            <div class="project-info">
                <div class="unit-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <h3 style="margin:0; font-size:1.2rem;">#${unit.code}</h3>
                    <span style="color:var(--gold-main); font-weight:900; font-size:1.1rem;">${priceFormatted} EGP</span>
                </div>
                <div class="unit-details" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:0.85rem; color:#64748b; margin-bottom:15px;">
                    <span><i class="fas fa-layer-group"></i> ${t.floor}: ${unit.floor}</span>
                    <span style="color:var(--navy-deep); font-weight:800; background:rgba(0,0,0,0.03); padding:2px 6px; border-radius:4px; display:inline-flex; align-items:center; gap:5px;"><i class="fas fa-ruler-combined"></i> ${unit.area} m²</span>
                    <span><i class="fas fa-eye"></i> ${unit.view}</span>
                    ${window.getMatchedOfferForUnit(unit) ? `<span style="grid-column: span 2; color:var(--gold-main); font-weight:700;"><i class="fas fa-credit-card"></i> ${window.getMatchedOfferForUnit(unit)}</span>` : ''}
                </div>
            </div>
`;
        unitGrid.appendChild(card);
        if (revealObserver) revealObserver.observe(card);
    });
}



// Global helper for sidebar area links
window.refreshByArea = function (areaName) {
    // 1. Uncheck everything first
    document.querySelectorAll('.multi-select-dropdown input[type="checkbox"]').forEach(cb => cb.checked = false);

    // 2. Find and check the specific area in the dropdown
    const areaList = document.getElementById('project-area-options-list');
    if (areaList) {
        const checkbox = areaList.querySelector(`input[value = "${areaName}"]`);
        if (checkbox) checkbox.checked = true;
    }

    // 3. Update the button text Label
    const textSpan = document.getElementById('selected-project-area-text');
    if (textSpan) textSpan.textContent = areaName;

    // 4. Trigger the Filter Logic
    if (typeof refreshFilterOptions === 'function') {
        refreshFilterOptions();
    }

    // Scroll to section
    const section = document.getElementById('projects');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
};

// Render Units for Specific Project
function renderProjectUnits(projectName) {
    selectedProject = projectName;
    currentViewMode = 'units';

    updateSectionTitle({}, projectName);
    const container = document.querySelector('.projects-grid');
    if (!container) return;

    const t = translations[currentLang];

    // Smooth Transition Out
    container.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
    container.style.opacity = '0';
    container.style.transform = 'translateY(10px)';

    setTimeout(() => {
        container.innerHTML = '';

        // --- 1. Header & Controls Section ---
        const controlsWrapper = document.createElement('div');
        controlsWrapper.className = 'project-controls-wrapper';
        // Inline styles for layout
        Object.assign(controlsWrapper.style, {
            gridColumn: '1 / -1',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
            marginBottom: '30px',
            width: '100%',
            opacity: '0',
            animation: 'fadeInUp 0.5s ease forwards'
        });

        // Back Button & Title Bar
        const backBar = document.createElement('div');
        Object.assign(backBar.style, {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 25px',
            background: 'var(--white, #fff)',
            borderRadius: '16px',
            boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
            border: '1px solid rgba(201,162,63,0.15)',
            flexWrap: 'wrap',
            gap: '15px'
        });

        const projectMeta = projectMetadata[projectName] || {};
        const areaName = projectMeta.projectArea || '';
        const projectUnitsAll = getUnitsInProjectFast(projectName);

        backBar.innerHTML = `
            <div style="display:flex; align-items:center; gap:20px;">
                <button id="back-btn" class="hover-scale" style="
                    background: var(--navy-deep, #0f172a); 
                    color: var(--gold, #c9a23f); 
                    border: none;
                    width: 48px; height: 48px; 
                    border-radius: 14px; 
                    display: flex; align-items: center; justify-content: center;
                    cursor: pointer; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    box-shadow: 0 4px 15px rgba(15, 23, 42, 0.25);">
                    <i class="fas fa-arrow-${currentLang === 'ar' ? 'right' : 'left'}" style="font-size: 1.2rem;"></i>
                </button>
                <div style="display: flex; flex-direction: column;">
                    <h2 style="margin:0; font-size:2rem; font-weight:800; color:var(--navy-deep); letter-spacing: -0.8px; line-height: 1.1;">
                        ${projectName}
                    </h2>
                    ${areaName ? `
                    <div style="display:flex; align-items:center; gap:8px; margin-top:6px;">
                        <i class="fas fa-map-marker-alt" style="color:var(--gold); font-size: 0.85rem; opacity: 0.8;"></i>
                        <span style="color:var(--text-secondary); font-size:1rem; font-weight: 600; opacity: 0.7;">${areaName}</span>
                    </div>` : ''}
                </div>
            </div>
            <div id="unit-results-count" class="search-refresh-pulse" style="
                font-weight:800; 
                color:var(--navy-deep); 
                background: linear-gradient(135deg, #fffcf2 0%, #fff 100%); 
                padding:12px 24px; 
                border-radius:40px; 
                border: 1px solid rgba(201,162,63,0.3);
                display: flex; align-items: center; gap: 12px;
                box-shadow: 0 6px 20px rgba(0,0,0,0.05);
                transition: all 0.3s ease;">
                <i class="fas fa-building" style="color:var(--gold); font-size: 1.1rem;"></i>
                <span style="font-size: 1.05rem;">${projectUnitsAll.length} ${t.avail_units || 'Units'}</span>
            </div>
        `;

        // Filter Bar (Compact & Modern)
        const filterBar = document.createElement('div');
        filterBar.className = 'internal-filter-bar';
        Object.assign(filterBar.style, {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))',
            gap: '15px',
            padding: '25px',
            background: 'rgba(255, 255, 255, 0.7)',
            backdropFilter: 'blur(15px)',
            webkitBackdropFilter: 'blur(15px)',
            borderRadius: '24px',
            border: '1px solid rgba(201,162,63,0.1)',
            boxShadow: '0 4px 20px rgba(0,0,0,0.02)',
            marginTop: '10px'
        });

        // Prepare Filter Options
        const floors = [...new Set(projectUnitsAll.map(u => u.floor))].filter(Boolean).sort();
        const views = [...new Set(projectUnitsAll.map(u => u.view))].filter(Boolean).sort();
        const areas = [...new Set(projectUnitsAll.map(u => u.area))].filter(Boolean).sort((a, b) => a - b);

        const createSelect = (id, label, optionsHml) => `
    <div class="filter__group" style="display:flex; flex-direction:column; gap:6px;">
                <label style="font-size:0.75rem; font-weight:700; color:var(--text-secondary); text-transform:uppercase; letter-spacing:0.5px; margin-left: 2px;">${label}</label>
                <div style="position:relative;">
                    <select id="${id}" style="
                        width:100%; padding: 10px 12px; 
                        border-radius: 8px; border: 1px solid #e2e8f0; 
                        background: #fff; color: var(--navy-deep); 
                        font-weight: 500; appearance: none;
                        font-size: 0.9rem;
                        cursor: pointer; transition: all 0.2s;
                        box-shadow: 0 2px 5px rgba(0,0,0,0.02);">
                        ${optionsHml}
                    </select>
                    <i class="fas fa-chevron-down" style="position:absolute; ${(currentLang === 'ar' ? 'left:12px' : 'right:12px')}; top:50%; transform:translateY(-50%); pointer-events:none; color:#94a3b8; font-size:0.7rem;"></i>
                </div>
            </div>
    `;

        filterBar.innerHTML = `
            ${createSelect('f-floor', t.floor, `<option value="">${t.all_floors}</option>${floors.map(f => `<option value="${f}">${f}</option>`).join('')}`)}
            ${createSelect('f-view', t.view, `<option value="">${t.all_views}</option>${views.map(v => `<option value="${v}">${v}</option>`).join('')}`)}
            ${createSelect('f-area', `${t.area} (m²)`, `<option value="">${t.all_areas}</option>${areas.map(a => `<option value="${a}">${a} m²</option>`).join('')}`)}
            ${createSelect('f-status', t.status, `<option value="">${t.all_status}</option><option value="Available">${t.status_available || 'Available'}</option><option value="Sold">${t.status_sold || 'Sold'}</option>`)}
            ${createSelect('f-price', t.price_label, `<option value="">${t.all_prices}</option><option value="7000000+">${t.price_above_7m}</option>`)}
            ${createSelect('f-intent', t.purpose || 'Purpose', `<option value="">${t.status_all}</option><option value="buy">${t.tab_buy}</option><option value="rent">${t.tab_rent}</option>`)}
`;

        controlsWrapper.appendChild(backBar);
        controlsWrapper.appendChild(filterBar);
        container.appendChild(controlsWrapper);

        // Add a "Results Label" just above grid
        const resultsLabel = document.createElement('div');
        resultsLabel.id = 'project-results-label';
        resultsLabel.style.cssText = 'grid-column: 1/-1; font-size: 0.9rem; font-weight: 700; color: var(--navy-deep); opacity: 0.6; margin-bottom: -10px; display: flex; align-items: center; gap: 8px;';
        resultsLabel.innerHTML = `<i class="fas fa-stream"></i> UNIT INVENTORY`;
        container.appendChild(resultsLabel);

        // --- 2. Units Grid ---
        const unitGrid = document.createElement('div');
        unitGrid.id = 'project-units-grid';
        Object.assign(unitGrid.style, {
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
            gap: '25px',
            gridColumn: '1 / -1',
            width: '100%',
            opacity: '0',
            animation: 'fadeInUp 0.6s ease 0.1s forwards'
        });
        container.appendChild(unitGrid);

        // --- 3. Event Listeners ---
        document.getElementById('back-btn').onclick = () => {
            selectedProject = null;
            currentViewMode = 'buildings';

            // Animate Out
            container.style.opacity = '0';
            container.style.transform = 'translateY(10px)';

            setTimeout(() => {
                renderProjectCards();
                // Reset Layout
                container.style.transition = 'none';
                container.style.opacity = '1';
                container.style.transform = 'translateY(0)';

                // Scroll to projects top
                const section = document.getElementById('projects');
                if (section) {
                    const yOffset = -100;
                    const y = section.getBoundingClientRect().top + window.pageYOffset + yOffset;
                    window.scrollTo({ top: y, behavior: 'smooth' });
                }
            }, 200);
        };

        ['f-floor', 'f-view', 'f-area', 'f-status', 'f-price', 'f-intent'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', () => applyUnitFilters(projectName, unitGrid));
        });

        // --- 4. Initial Render ---
        applyUnitFilters(projectName, unitGrid);

        // Transition In
        requestAnimationFrame(() => {
            container.style.opacity = '1';
            container.style.transform = 'translateY(0)';
        });

    }, 200); // Wait for fade-out
}

function applyUnitFilters(projectName, unitGrid) {
    const t = translations[currentLang];

    // Get filter values
    const floorVal = document.getElementById('f-floor').value;
    const viewVal = document.getElementById('f-view').value;
    const areaVal = document.getElementById('f-area').value;
    const selStatus = document.getElementById('f-status').value;
    const selPrice = document.getElementById('f-price').value;
    const selIntent = document.getElementById('f-intent').value;

    let filtered = getUnitsInProjectFast(projectName);

    if (floorVal) filtered = filtered.filter(u => u.floor === floorVal);
    if (viewVal) filtered = filtered.filter(u => u.view === viewVal);
    if (areaVal) filtered = filtered.filter(u => u.area == areaVal);
    if (selStatus) filtered = filtered.filter(u => u.status === selStatus);

    if (selPrice) {
        if (selPrice.includes('+')) {
            filtered = filtered.filter(u => u.price >= 7000000);
        } else {
            const [min, max] = selPrice.split('-').map(Number);
            filtered = filtered.filter(u => u.price >= min && u.price <= max);
        }
    }

    if (selIntent) {
        filtered = filtered.filter(u => (u.intent || 'buy') === selIntent);
    }

    // Update Result Count with Animation
    const countBadge = document.getElementById('unit-results-count');
    if (countBadge) {
        const span = countBadge.querySelector('span');
        if (span) span.innerText = `${filtered.length} ${t.avail_units || 'Units'}`;

        // Pulse effect
        countBadge.classList.remove('search-refresh-pulse');
        void countBadge.offsetWidth; // Trigger reflow
        countBadge.classList.add('search-refresh-pulse');
    }

    unitGrid.innerHTML = '';

    if (filtered.length === 0) {
        unitGrid.innerHTML = `<div style="grid-column: 1/-1; text-align:center; padding:50px; color:var(--text-secondary);">No units match your selection.</div>`;
        return;
    }

    filtered.forEach((unit, index) => {
        const card = document.createElement('div');
        card.className = 'project-card reveal reveal-visible';
        card.style.animationDelay = `${index * 0.05} s`;

        const priceFormatted = unit.price.toLocaleString('en-US');

        // ?? Robust Image Detection for Admin List
        let imgUrl = 'https://placehold.co/600x400/eee/333?text=No+Photo';
        const imgCandidates = unit.images || unit.gallery || unit.image || unit.unit_images;
        if (imgCandidates) {
            const first = Array.isArray(imgCandidates) ? imgCandidates[0] : imgCandidates;
            if (first) {
                imgUrl = (typeof first === 'object' && first.data) ? first.data : (typeof first === 'string' ? first : imgUrl);
            }
        }

        card.innerHTML = `
    <div class="project-img">
                <label class="tag-project" style="background:${(unit.intent || 'buy') === 'rent' ? 'var(--gold-main)' : 'var(--navy-deep)'}; z-index:11; top:45px; left:15px;">${(unit.intent || 'buy') === 'rent' ? t.tab_rent : t.tab_buy}</label>
                <label class="tag-project" style="background:${unit.status === 'Sold' ? '#ef4444' : 'var(--navy-deep)'}; z-index:10;">${unit.status}</label>
                <img src="${imgUrl}" alt="${unit.project}" loading="lazy" style="object-fit:cover; height:200px; width:100%;">
            </div>
            <div class="project-info">
                <div class="unit-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <h3 style="margin:0; font-size:1.2rem;">#${unit.code}</h3>
                    <span style="color:var(--gold-main); font-weight:900; font-size:1.1rem;">${priceFormatted} EGP</span>
                </div>
                <div class="unit-details" style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; font-size:0.85rem; color:#64748b; margin-bottom:15px;">
                    <span><i class="fas fa-layer-group"></i> ${t.floor}: ${unit.floor}</span>
                    <span style="color:var(--navy-deep); font-weight:800; background:rgba(0,0,0,0.03); padding:2px 6px; border-radius:4px; display:inline-flex; align-items:center; gap:5px;"><i class="fas fa-ruler-combined"></i> ${unit.area} m²</span>
                    <span><i class="fas fa-eye"></i> ${unit.view}</span>
                    ${window.getMatchedOfferForUnit(unit) ? `<span style="grid-column: span 2; color:var(--gold-main); font-weight:700; grid-row: 3; grid-column: 1/3;"><i class="fas fa-credit-card"></i> ${window.getMatchedOfferForUnit(unit)}</span>` : ''}
                </div>
                <button class="btn-gold small-btn" style="width:100%; border-radius:6px; padding:10px;" onclick="window.viewUnitDetails('${unit.code}')">${t.view_details}</button>
            </div>
`;
        unitGrid.appendChild(card);
    });
}
// --- ONE-TIME FIREBASE UPLOAD UTILITY ---
window.uploadLocalDataToCloudflare = async function () {
    if (!confirm("This will upload ALL local JSON data to Cloudflare. Continue?")) return;

    console.log("Starting Upload...");
    let batchC = 0;

    // Upload Projects
    try {
        const pKeys = Object.keys(projectMetadata);
        for (const p of pKeys) {
            console.log(`Uploaded Project: ${p} `);
        }
    } catch (e) {
        console.error("Project upload failed:", e);
    }

    // Upload Units (Batching to avoid browser freeze)
    try {
        const chunks = [];
        for (let i = 0; i < masterInventory.length; i += 400) {
            chunks.push(masterInventory.slice(i, i + 400));
        }

        for (const chunk of chunks) {
            const promises = chunk.map(u => {
                if (window.robelAdminAPI && window.robelAdminAPI.createUnit) {
                    return window.robelAdminAPI.createUnit(u);
                }
                return Promise.resolve();
            });
            await Promise.all(promises);
            console.log(`Uploaded batch of ${chunk.length} units to Cloudflare...`);
        }
        alert("Upload Complete! Cloudflare Database is now populated.");
    } catch (e) {
        alert("Upload failed: " + e.message);
    }
};
// --- Billboard Slider Logic ---
window.scrollBillboards = function (direction) {
    const track = document.getElementById('billboard-track');
    const card = track?.querySelector('.billboard-card');
    if (!track || !card) return;

    const gap = 20;
    const cardWidth = card.offsetWidth + gap;

    // In our forced RTL track, Card 1 starts on the RIGHT.
    // Clicking the Left Arrow (direction -1) scrolls the viewport LEFT to see more cards.
    // Clicking the Right Arrow (direction 1) scrolls the viewport RIGHT to go back.
    const moveAmount = direction * cardWidth;

    track.scrollBy({
        left: moveAmount,
        behavior: 'smooth'
    });
};

// Update dots on scroll
const trackEl = document.getElementById('billboard-track');
if (trackEl) {
    trackEl.addEventListener('scroll', () => {
        const cardWidth = trackEl.querySelector('.billboard-card').offsetWidth + 20;
        const scrollPos = Math.abs(trackEl.scrollLeft);
        const index = Math.round(scrollPos / cardWidth);

        const dots = document.querySelectorAll('.billboard-dot');
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
    });
}

window.viewUnitDetails = function (unitCode) {
    const contactSection = document.getElementById('contact');
    if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth' });
        // Optional: Pre-fill a message if a form exists
        const messageInput = document.getElementById('contact-message');
        if (messageInput) {
            messageInput.value = `I am interested in unit #${unitCode}. Please provide more details.`;
        }
    } else {
        alert(currentLang === 'ar' ? `???? ??? ?????? ?????? #${unitCode} ` : `Viewing details for unit #${unitCode}`);
    }
};

/* ==========================================================================
   PERFORMANCE & STABILITY ENHANCEMENTS (Auto-Added)
   ========================================================================== */

/**
 * CRITICAL: Robust Loader Hiding Mechanism
 * Ensures loader disappears even if errors occur.
 */
(function () {
    const LOADER_TIMEOUT = 3000; // Max wait time
    let loaderHidden = false;

    function forceHideLoader() {
        if (loaderHidden) return;
        const loader = document.getElementById('page-loader');
        if (loader) {
            loader.classList.add('loader-finished');
            setTimeout(() => {
                loader.style.display = 'none'; /* Remove from DOM flow */
            }, 800);
        }
        document.body.style.overflow = ''; // Ensure scroll is restored
        loaderHidden = true;
    }

    // Hide on load
    window.addEventListener('load', forceHideLoader);

    // Hide on DOMContentLoaded (fallback/safety)
    // We add a slight delay to ensure the initial render is visible
    document.addEventListener('DOMContentLoaded', () => {
        // FAQ Accordion logic
        const faqItems = document.querySelectorAll('.faq-item');
        faqItems.forEach(item => {
            const header = item.querySelector('.faq-header');
            if (header) {
                header.addEventListener('click', () => {
                    const isActive = item.classList.contains('active');
                    faqItems.forEach(i => i.classList.remove('active'));
                    if (!isActive) item.classList.add('active');
                });
            }
        });

        setTimeout(forceHideLoader, 1500);
    });

    // Ultimate fallback timeout
    setTimeout(forceHideLoader, LOADER_TIMEOUT);

    // Global Error Handler to unblock user if JS crashes
    window.addEventListener('error', (e) => {
        console.warn("Global Error Caught (Safety Protocol):", e.message);
        forceHideLoader();
    });

    window.addEventListener('unhandledrejection', (e) => {
        console.warn("Unhandled Promise (Safety Protocol):", e.reason);
        forceHideLoader();
    });
})();


// Dark Mode Animation Handler (Advanced Wipe)
const themeBtn = document.getElementById('theme-btn');

// Inject Overlay if not present
if (!document.getElementById('theme-transition-overlay')) {
    const overlay = document.createElement('div');
    overlay.id = 'theme-transition-overlay';
    document.body.appendChild(overlay);
}

const overlay = document.getElementById('theme-transition-overlay');

if (themeBtn) {
    // Clone to remove any old listeners if present, ensuring fresh logic
    const newThemeBtn = themeBtn.cloneNode(true);
    if (themeBtn.parentNode) themeBtn.parentNode.replaceChild(newThemeBtn, themeBtn);

    newThemeBtn.addEventListener('click', () => {
        // 1. Determine direction
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        const nextTheme = isDark ? 'light' : 'dark';
        // Colors from tokens.css
        const nextColor = nextTheme === 'dark' ? '#262626' : '#FFFFFF';

        // 2. Prepare Overlay
        overlay.style.backgroundColor = nextColor;
        overlay.classList.add('animate');

        // 3. Animate Icon
        newThemeBtn.classList.add('theme-transition');

        // 4. WAIT for wipe to cover screen (approx 500ms)
        setTimeout(() => {
            // Toggle Actual Theme
            if (nextTheme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
                newThemeBtn.innerHTML = '<i class="fas fa-sun"></i>';
            } else {
                document.documentElement.setAttribute('data-theme', 'light');
                newThemeBtn.innerHTML = '<i class="fas fa-moon"></i>';
            }

            // Reset Icon Animation
            newThemeBtn.classList.remove('theme-transition');

            // 5. Complete Animation
            setTimeout(() => {
                overlay.classList.remove('animate');
            }, 50);

        }, 500);
    });
}

/**
 * SECURITY: Basic Console Protection
 */
if (window.location.hostname !== 'localhost') {
    console.log("%cStop!", "color: red; font-size: 30px; font-weight: bold;");
    console.log("This is a browser feature intended for developers.");
}

/**
 * Helper: Filter from Menu Dropdown
 */
window.filterByProjectMenu = function (projectName, el) {
    // 1. Thoroughly remove 'active' and inline styles from ALL project links (Desktop & Mobile)
    const allProjectLinks = document.querySelectorAll('.queen-menu-item, .quick-nav-dropdown-content a');
    allProjectLinks.forEach(link => {
        link.classList.remove('active');
        link.style.backgroundColor = 'transparent';
        link.style.color = ''; // Reset to default CSS
        link.style.fontWeight = '';
    });

    // 2. Apply highlight to the specifically clicked element
    if (el) {
        el.classList.add('active');
        el.style.backgroundColor = '#D4AF37'; // Solid Gold
        el.style.color = '#000000';           // Pure Black
        el.style.fontWeight = '800';
    }

    // 3. Trigger the filtering logic
    if (typeof window.refreshByArea === 'function') {
        window.refreshByArea(projectName);
    } else {
        const section = document.getElementById('projects');
        if (section) section.scrollIntoView({ behavior: 'smooth' });
    }
};

/* ==========================================================================
   OFFERS COUNTDOWN LOGIC (New Cards)
   ========================================================================== */
function startOffersCountdown() {
    const timerElement = document.getElementById('timer-val') || document.getElementById('timer-val-horiz');
    if (!timerElement) return;

    // Set end date to 15 days from now
    let endDate = new Date();
    endDate.setDate(endDate.getDate() + 15);

    function updateTimer() {
        const now = new Date().getTime();
        const distance = endDate - now;

        if (distance < 0) {
            // Update all timers
            const elements = document.querySelectorAll('#timer-val, #timer-val-horiz');
            elements.forEach(el => {
                el.innerText = "EXPIRED";
            });
            return;
        }

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

        // Update all timers
        const elements = document.querySelectorAll('#timer-val, #timer-val-horiz');
        elements.forEach(el => {
            el.innerText = `${days}d ${hours} h`;
        });
    }

    updateTimer();
    setInterval(updateTimer, 60000);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startOffersCountdown);
} else {
    startOffersCountdown();
}

// --- Smart WhatsApp CTA Helper ---
window.getWhatsAppLink = function (projectName, unitCode) {
    const phone = "201234567890"; // Target number
    let message = `Hello Robel Real Estate, I am interested in ${projectName || 'your projects'}.`;
    if (unitCode) {
        message += ` Specifically the unit with code: ${unitCode}.`;
    }
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
};

window.openWhatsApp = function (projectName, unitCode) {
    window.open(window.getWhatsAppLink(projectName, unitCode), '_blank');
};

// --- NEW: Project Selection Button Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const projectBtns = document.querySelectorAll('.project-select-btn');
    const secondaryRow = document.getElementById('secondary-filters-row');
    const projectAreaDropdown = document.getElementById('project-area-multi-dropdown');
    const projectAreaFilterCol = document.getElementById('project-area-multi-select-btn')?.parentElement;

    if (projectBtns.length > 0) {
        projectBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const projectToSelect = btn.getAttribute('data-project');

                // 1. UI: Toggle Active State
                projectBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // 2. UI: Show Secondary Filters Row
                if (secondaryRow) {
                    secondaryRow.style.display = 'grid';
                    secondaryRow.classList.add('active-filters');
                }

                // 3. UI: Hide redundant 'Project Area' filter
                if (projectAreaFilterCol) {
                    projectAreaFilterCol.style.display = 'none';
                }

                // 4. LOGIC: Update Filter State
                // We simulating checking the 'Project Area' checkbox
                if (projectAreaDropdown) {
                    const checkboxes = projectAreaDropdown.querySelectorAll('input[type="checkbox"]');
                    checkboxes.forEach(cb => {
                        // Match normalized value if needed
                        const cbVal = cb.value;
                        // Robust match
                        if (cbVal === projectToSelect || cbVal.includes(projectToSelect) || projectToSelect.includes(cbVal)) {
                            cb.checked = true;
                        } else {
                            cb.checked = false;
                        }
                    });

                    // Trigger the 'Apply' logic for this filter
                    const applyBtn = document.getElementById('apply-multi-project-area');
                    if (applyBtn) {
                        applyBtn.click(); // This calls refreshFilterOptions()
                    } else {
                        if (typeof refreshFilterOptions === 'function') refreshFilterOptions();
                    }
                }
            });
        });
    }
});










// Start fetching/syncing as early as possible

if (typeof window.loadData === 'function') {
    window.loadData();
} else {
    // Fallback if defined later
    window.addEventListener('DataLoadedModule', () => {
        if (typeof window.loadData === 'function') window.loadData();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Double check
        if (inventory.length === 0 && typeof window.loadData === 'function') {
            window.loadData().then(() => {
                // Force UI refresh after late load
                if (typeof renderProjectCards === 'function') renderProjectCards();
            });
        }
    });
} else {
    // Already ready? Check immediately
    if (inventory.length === 0 && typeof window.loadData === 'function') {
        window.loadData();
    }
}

/* ----------------------------------------------------------------
   FINAL FIX: Update UI after everything is ready (Polling Logic)
   ---------------------------------------------------------------- */

(function initializeHomepage() {
    'use strict';

    console.log('%c?? [HOMEPAGE INIT] Starting Polling...',
        'background: #d4af37; color: #000; font-weight: bold; padding: 5px;');

    // --------------------------------------------------------
    // Helper: Update All UI Counters
    // --------------------------------------------------------

    function updateAllCounters() {
        // Check Data Availability
        if (!window.inventory || window.inventory.length === 0) {
            // Silently wait for Firestore or Cache
            return false;
        }








        // console.log('%c?? [UPDATE COUNTERS] Data Found! Updating UI...', 'color: #3498db;');

        // Force UI Refresh
        if (typeof renderProjectCards === 'function') renderProjectCards();

        const totalUnitsElements = document.querySelectorAll('[data-stat="total-units"], .stat-units, #totalUnits');
        totalUnitsElements.forEach(el => {
            el.textContent = window.inventory.length;
        });

        // console.log('%c? All counters updated successfully!', 'color: #27ae60; font-weight: bold;');
        return true;
    }

    // --------------------------------------------------------
    // Polling Mechanism
    // --------------------------------------------------------

    let updateAttempts = 0;
    const maxAttempts = 50; // Try for 25 seconds (500ms * 50) - Firestore might be slow on first load

    function attemptUpdate() {
        updateAttempts++;
        const success = updateAllCounters();

        if (success) {
            // console.log('%c?? Homepage UI Sync Complete!', 'color: #27ae60; font-weight: bold;');
            return;
        }

        if (updateAttempts < maxAttempts) {
            setTimeout(attemptUpdate, 500);
        } else {
            console.warn('%c?? Max attempts reached. If units are still 0, check your Firebase connection or credentials.', 'color: #e74c3c;');
        }
    }

    // Start Polling
    attemptUpdate();

    // Also hook into listeners
    window.addEventListener('load', attemptUpdate);
    window.addEventListener('DataLoadedModule', attemptUpdate);

})();

/* ----------------------------------------------------------------
   BRANDING & SETTINGS MANAGER
   ---------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
    const logoInput = document.getElementById('logo-upload-input');
    const syncBtn = document.getElementById('sync-logo-firebase');
    const previewImg = document.getElementById('admin-logo-preview');

    if (!logoInput && !syncBtn) return;
    // console.log('??? [Admin Branding] Initializing Branding Manager...');

    if (logoInput) {
        logoInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                if (previewImg) previewImg.style.opacity = '0.3';
                const reader = new FileReader();
                reader.onload = async (event) => {
                    const compressed = await window.compressImage(event.target.result, 800, 0.7);

                    // ?? Upload to Cloudflare R2
                    const url = await window.robelAdminAPI.uploadToCloudflare(compressed, 'logo.png', 'branding');

                    if (url) {
                        if (previewImg) {
                            previewImg.src = url;
                            previewImg.style.opacity = '1';
                        }
                        // Save metadata to Cloudflare D1
                        await window.robelAdminAPI.syncToCloudflare('branding', 'UPSERT', 'main', { logo: url });

                        // Sync UI and Exports
                        const exportLogo = document.getElementById('logo-for-export');
                        if (exportLogo) exportLogo.src = url;

                        // Store in cache for admin-export.js
                        window.corporateBranding = window.corporateBranding || {};
                        window.corporateBranding.logoBase64 = compressed;

                        document.getElementById('logo-status-text').textContent = 'Live on Cloudflare';
                        alert('Logo updated and synced to Cloudflare!');
                    } else {
                        if (previewImg) previewImg.style.opacity = '1';
                        alert('Failed to upload logo to Cloudflare Storage.');
                    }
                };
                reader.readAsDataURL(file);
            } catch (err) {
                console.error("Logo upload error:", err);
                if (previewImg) previewImg.style.opacity = '1';
            }
        };
    }

    if (syncBtn) {
        syncBtn.onclick = async () => {
            const originalText = syncBtn.innerHTML;
            syncBtn.disabled = true;
            syncBtn.innerHTML = '<i class="fas fa-sync fa-spin"></i> Syncing...';

            try {
                // Try to fetch branding from Cloudflare
                if (window.firebaseQueries && window.firebaseQueries.fetchFromCloudflare) {
                    const branding = await window.firebaseQueries.fetchFromCloudflare('branding');
                    const mainBranding = Array.isArray(branding) ? branding.find(b => b.id === 'main') : branding;

                    if (mainBranding && mainBranding.logo) {
                        if (previewImg) previewImg.src = mainBranding.logo;

                        const exportLogo = document.getElementById('logo-for-export');
                        if (exportLogo) exportLogo.src = mainBranding.logo;

                        document.getElementById('logo-status-text').textContent = 'Synced from Cloudflare';
                        console.log("? Branding synced from remote source.");
                    } else {
                        alert('No remote logo found in Cloudflare Storage.');
                    }
                }
            } catch (err) {
                console.error("Branding sync error:", err);
            } finally {
                syncBtn.disabled = false;
                syncBtn.innerHTML = originalText;
            }
        };
    }
});

// Global execution logic
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        if (typeof window.loadData === 'function') window.loadData();
        if (typeof window.initUnitImageUpload === 'function') window.initUnitImageUpload();
    });
} else {
    if (typeof window.loadData === 'function') window.loadData();
    if (typeof window.initUnitImageUpload === 'function') window.initUnitImageUpload();
}

