/**
 * CLOUDFLARE QUERY FUNCTIONS
 * =========================
 * Optimized query functions powered by Cloudflare D1
 */

// Make these global so other scripts can access them
window.CLOUDFLARE_WORKER_URL = "https://robel-api.george-gamal139.workers.dev";
const CLOUDFLARE_WORKER_URL = window.CLOUDFLARE_WORKER_URL;

// Global request tracker to prevent redundant fetches
const inflightRequests = new Map();

// Auth key for Cloudflare API
window.AUTH_KEY = "G792001";
const AUTH_KEY = window.AUTH_KEY;

// Helper to normalize IDs (e.g., 121 -> B121, b121 -> B121)
function normalizeId(id) {
    if (!id) return id;
    if (typeof id === 'number') id = id.toString();
    let clean = id.toString().trim().toUpperCase();
    if (/^\d+$/.test(clean)) return 'B' + clean;
    if (clean.startsWith('B')) return clean;
    return clean;
}
window.normalizeId = normalizeId; // Global access

// Global Cloudflare Fetcher with Smart Caching
async function fetchFromCloudflare(path, forceRefresh = false) {
    const cacheKey = `cf_cache_v2_${path.replace(/[^a-z0-9]/gi, '_')}`;

    // 🚀 DEDUPLICATION: If we are already fetching this, return the existing promise
    if (inflightRequests.has(path)) {
        return inflightRequests.get(path);
    }

    const fetchPromise = (async () => {
        try {
            // 🧠 SMART TTL: Adapt to network conditions
            let cacheTTL = 1000 * 60 * 1; // Default: 1 Minute (Faster sync)
            if (navigator.connection && (navigator.connection.effectiveType === '2g' || navigator.connection.effectiveType === '3g')) {
                cacheTTL = 1000 * 60 * 5; // 5 Minutes for weak connections
            }

            // Check if we have cached data
            if (!forceRefresh) {
                try {
                    const cached = localStorage.getItem(cacheKey);
                    if (cached) {
                        const { timestamp, data } = JSON.parse(cached);
                        const isStale = Date.now() - timestamp > cacheTTL;

                        if (!isStale) return data;

                        // Stale-While-Revalidate
                        if (data) {
                            fetchFromCloudflare(path, true).catch(() => { });
                            return data;
                        }
                    }
                } catch (e) { }
            }

            const isAdmin = window.location.pathname.includes('admin') ||
                document.getElementById('sys-cfg-2026') ||
                (window.currentUser && window.currentUser.role === 'admin');

            const fetchUrl = new URL(`${CLOUDFLARE_WORKER_URL}/api/${path}`);
            if (isAdmin || forceRefresh) {
                fetchUrl.searchParams.set('_t', Date.now());
            }

            const fetchWithRetry = async (url, options, retries = 3) => {
                try {
                    const timeoutMs = (navigator.connection && (navigator.connection.effectiveType === '2g' || navigator.connection.effectiveType === '3g')) ? 30000 : 15000;
                    const controller = new AbortController();
                    const id = setTimeout(() => controller.abort(), timeoutMs);
                    const response = await fetch(url, { ...options, signal: controller.signal });
                    clearTimeout(id);
                    return response;
                } catch (err) {
                    if (retries > 0) {
                        const delay = (4 - retries) * 1000 + (Math.pow(2, 4 - retries) * 500);
                        await new Promise(r => setTimeout(r, delay));
                        return fetchWithRetry(url, options, retries - 1);
                    }
                    throw err;
                }
            };

            const response = await fetchWithRetry(fetchUrl.toString(), {
                cache: (isAdmin || forceRefresh) ? 'no-store' : 'default',
                headers: {
                    'Authorization': `Bearer ${AUTH_KEY}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                let processedData = data;

                // Stability Fix for 0 results
                const cachedRaw = localStorage.getItem(cacheKey);
                if (!forceRefresh && Array.isArray(processedData) && processedData.length === 0 && cachedRaw) {
                    try {
                        const cachedParsed = JSON.parse(cachedRaw);
                        if (cachedParsed.data && Array.isArray(cachedParsed.data) && cachedParsed.data.length > 0) {
                            return cachedParsed.data;
                        }
                    } catch (e) { }
                }

                const transformItem = (item) => ({
                    id: item.unit_id || item.building_id || item.project_id || item.id,
                    buildingId: normalizeId(item.building_id || item.buildingId || item.building),
                    projectId: (item.project_id || item.projectId || item.project || '').toString().toLowerCase().trim(),
                    project: (item.project_id || item.projectId || item.project || '').toString().toLowerCase().trim(),
                    code: item.code || item.unit_id,
                    floor: item.floor,
                    area: parseFloat(item.area) || 0,
                    view: item.view,
                    price: parseFloat(item.price) || 0,
                    status: (item.status || 'Available'),
                    deliveryStatus: item.delivery_status || item.deliveryStatus,
                    ...item,
                    images: (function () {
                        let val = item.images;
                        if (!val) return [];
                        if (Array.isArray(val)) return val.filter(v => v);
                        if (typeof val === 'string') {
                            if (val.startsWith('[')) { try { return JSON.parse(val).filter(v => v); } catch (e) { return []; } }
                            if (val.includes(',')) return val.split(',').map(s => s.trim()).filter(v => v);
                            return [val];
                        }
                        return [];
                    })(),
                    image: (function () {
                        let val = item.image;
                        if (!val) return [];
                        if (Array.isArray(val)) return val.filter(v => v);
                        if (typeof val === 'string') {
                            if (val.startsWith('[')) { try { return JSON.parse(val).filter(v => v); } catch (e) { return []; } }
                            return [val];
                        }
                        return [];
                    })()
                });

                if (Array.isArray(data)) processedData = data.map(transformItem);
                else if (data && typeof data === 'object') processedData = transformItem(data);

                // Save to Cache
                try {
                    localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: processedData }));
                } catch (e) {
                    if (e.name === 'QuotaExceededError') {
                        const keys = Object.keys(localStorage).filter(k => k.startsWith('cf_cache_'));
                        keys.forEach(k => localStorage.removeItem(k));
                        localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: processedData }));
                    }
                }
                return processedData;
            } else {
                const cached = localStorage.getItem(cacheKey);
                return cached ? JSON.parse(cached).data : null;
            }
        } catch (e) {
            const cached = localStorage.getItem(cacheKey);
            return cached ? JSON.parse(cached).data : null;
        } finally {
            inflightRequests.delete(path);
        }
    })();

    inflightRequests.set(path, fetchPromise);
    return fetchPromise;
}

// ============================================================================
// PROJECT QUERIES
// ============================================================================

async function getAllProjects(forceRefresh = false) {
    try {
        let cfData = await fetchFromCloudflare('projects', forceRefresh);
        if (!cfData) return [];
        return cfData.map(p => ({
            ...p,
            id: normalizeId(p.id),
            name: (p.name && /^\d+$/.test(p.name)) ? 'B' + p.name : p.name
        }));
    } catch (error) { return []; }
}

async function getProject(projectId) {
    const normId = normalizeId(projectId);
    const projects = await getAllProjects();
    return projects.find(p => p.id === normId) || null;
}

async function getProjectsByStatus(status) {
    const projects = await getAllProjects();
    return projects.filter(p => p.status === status);
}

// ============================================================================
// BUILDING QUERIES
// ============================================================================

async function getBuildingsByProject(projectId) {
    const cfData = await fetchFromCloudflare(`buildings?projectId=${projectId}`);
    return cfData || [];
}

async function getBuilding(buildingId) {
    const cfData = await fetchFromCloudflare(`buildings`);
    if (cfData) return cfData.find(b => b.id === buildingId || b.code === buildingId) || null;
    return null;
}

async function getAllBuildings(forceRefresh = false) {
    const cfData = await fetchFromCloudflare('buildings', forceRefresh);
    return cfData || [];
}

// ============================================================================
// UNIT QUERIES
// ============================================================================

async function getAllUnits(forceRefresh = false) {
    const cfUnits = await fetchFromCloudflare('units', forceRefresh);
    return cfUnits || null;
}

async function getUnitsByBuilding(buildingId, forceRefresh = false) {
    const normId = normalizeId(buildingId);
    if (window.inventory && window.inventory.length > 0) {
        const local = window.inventory.filter(u => normalizeId(u.buildingId || u.building_id || u.project) === normId);
        if (local.length > 0) return local;
    }
    const data = await fetchFromCloudflare(`units?buildingId=${encodeURIComponent(normId)}`, forceRefresh);
    if (data && data.length > 0) return data;
    const allUnits = await getAllUnits(false);
    if (allUnits) return allUnits.filter(u => normalizeId(u.buildingId || u.building_id || u.project) === normId);
    return [];
}

async function getUnitsByProject(projectId) {
    let cfData = await fetchFromCloudflare(`units?projectId=${encodeURIComponent(projectId)}`);
    if (!cfData || cfData.length === 0) {
        cfData = await fetchFromCloudflare(`units?project=${encodeURIComponent(projectId)}`);
    }
    return cfData || [];
}

async function getUnit(unitId, forceRefresh = false) {
    if (!unitId) return null;
    const normId = unitId.toString().trim();
    if (window.inventory) {
        const found = window.inventory.find(u => (u.unit_id || u.code || u.id).toString() === normId);
        if (found) return found;
    }
    const cfData = await fetchFromCloudflare(`units?id=${encodeURIComponent(normId)}`, forceRefresh);
    if (cfData) {
        const units = Array.isArray(cfData) ? cfData : [cfData];
        return units.find(u => (u.unit_id || u.code || u.id).toString() === normId) || null;
    }
    return null;
}

async function searchUnits(filters = {}) {
    let units = filters.projectId ? await getUnitsByProject(filters.projectId) :
        filters.buildingId ? await getUnitsByBuilding(filters.buildingId) :
            await getAllUnits();
    if (!units) return [];
    if (filters.status) units = units.filter(u => u.status === filters.status);
    if (filters.purpose) units = units.filter(u => (u.purpose || u.intent) === filters.purpose);
    if (filters.minArea) units = units.filter(u => u.area >= filters.minArea);
    if (filters.maxArea) units = units.filter(u => u.area <= filters.maxArea);
    if (filters.minPrice) units = units.filter(u => (u.price || 0) >= filters.minPrice);
    if (filters.maxPrice) units = units.filter(u => (u.price || 0) <= filters.maxPrice);
    if (filters.keyword) {
        const k = filters.keyword.toLowerCase();
        units = units.filter(u => (u.unitNumber || '').toLowerCase().includes(k) || (u.code || '').toLowerCase().includes(k) || (u.view || '').toLowerCase().includes(k));
    }
    return units;
}

async function getAvailableUnits(projectId) {
    const units = await getUnitsByProject(projectId);
    return units.filter(u => u.status === 'Available');
}

if (typeof window !== 'undefined') {
    window.firebaseQueries = {
        fetchFromCloudflare,
        getAllProjects,
        getProject,
        getProjectsByStatus,
        getBuildingsByProject,
        getBuilding,
        getAllBuildings,
        getAllUnits,
        getUnitsByBuilding,
        getUnitsByProject,
        getUnit,
        searchUnits,
        getAvailableUnits
    };
}
