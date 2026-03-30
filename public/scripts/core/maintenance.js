/**
 * ROBEL REAL ESTATE - MAINTENANCE & ADMIN TOOLS
 * These tools are moved from home.js to optimize production performance.
 */

// ?? SYSTEM CACHE PURGE
window.purgeLegacyCaches = function() {
    const PURGE_VERSION = "v20260329_final_fix";
    if (sessionStorage.getItem('robel_purge_v') === PURGE_VERSION) return;

    console.log("?? [Maintenance] Version check: Updating systemic caches...");
    const keys = [
        'robelInventory', 'robelProjectMetadata', 'robel_inventory_backup',
        'robel_units_v1', 'cf_cache_units', 'cf_cache_buildings',
        'cf_cache_v2_units', 'cf_cache_v2_buildings', 'robelAreaMetadata'
    ];
    keys.forEach(k => localStorage.removeItem(k));

    for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && (k.startsWith('cf_') || k.includes('cache'))) {
            localStorage.removeItem(k);
            i--;
        }
    }

    sessionStorage.setItem('robel_purge_v', PURGE_VERSION);
    console.log("?? [Maintenance] Purge complete.");
};

// ?? ONE-TIME CLEANUP: Delete old B-SHOPS duplicate from Cloudflare
window.cleanupOldBShops = function() {
    const alreadyCleaned = localStorage.getItem('bshops_removed_v1');
    if (alreadyCleaned) return;
    setTimeout(async () => {
        try {
            const url = (window.CLOUDFLARE_WORKER_URL || 'https://robel-api.george-gamal139.workers.dev') + '/api/buildings/B-SHOPS';
            const res = await fetch(url, {
                method: 'DELETE',
                headers: { 'Authorization': window.AUTH_KEY || 'G792001' }
            });
            localStorage.setItem('bshops_removed_v1', '1');
        } catch (e) { }
    }, 5000);
};

// ?? ONE-TIME SEEDER: Push SHOPS units to Cloudflare
window.seedShopsToCloudflare = function() {
    const alreadySeeded = localStorage.getItem('shops_seeded_v1');
    if (alreadySeeded) return;

    const SHOPS_UNITS = [
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
        const maxWait = 20;
        let waited = 0;
        while (!window.robelAdminAPI && waited < maxWait) {
            await new Promise(r => setTimeout(r, 500));
            waited++;
        }

        if (!window.robelAdminAPI || !window.robelAdminAPI.createUnit) return;

        console.log('?? Seeding SHOPS units to Cloudflare...');
        try {
            if (window.robelAdminAPI.createBuilding) {
                await window.robelAdminAPI.createBuilding({
                    id: "SHOPS", code: "SHOPS", projectId: "Porto Said", projectName: "Porto Said", delivery: "Ready", constStatus: "Ready", status: "buy", images: []
                });
            }
        } catch (e) { }

        for (const unit of SHOPS_UNITS) {
            try {
                await window.robelAdminAPI.createUnit({
                    ...unit, id: `unit_SHOPS_${unit.code}`, buildingCode: "SHOPS", payment_plan: "", images: []
                });
            } catch (e) { }
        }
        localStorage.setItem('shops_seeded_v1', '1');
    }, 8000);
};

// ?? EMERGENCY RECOVERY: MIGRATE FROM LOCAL BROWSER TO CLOUDFLARE
window.migrateAllFirebaseToCloudflare = async function () {
    const localUnits = (window.inventory || []);
    if (localUnits.length === 0) return;

    const doWipe = confirm(`Migrate ${localUnits.length} units?`);
    if (!doWipe) return;

    // ... (rest of the migration logic if needed)
};

// AUTO-EXECUTE FOR ADMINS ONLY
(function checkAndRunMaintenance() {
    const isAdmin = window.location.pathname.includes('admin') || document.getElementById('sys-cfg-2026');
    if (isAdmin) {
        console.log("?? [Maintenance] Admin detected. Running background maintenance...");
        if (typeof window.purgeLegacyCaches === 'function') window.purgeLegacyCaches();
        if (typeof window.cleanupOldBShops === 'function') window.cleanupOldBShops();
        if (typeof window.seedShopsToCloudflare === 'function') window.seedShopsToCloudflare();
    }
})();
