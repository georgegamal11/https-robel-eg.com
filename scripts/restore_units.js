
const AUTH_KEY = "ROBEL_SECURE_SYNC_2025";
const fs = require('fs');

async function restore() {
    try {
        const units = JSON.parse(fs.readFileSync('units_backup.json', 'utf8'));
        console.log(`Restoring/Updating ${units.length} units...`);

        for (const u of units) {
            const area = parseFloat(u.area) || 0;
            const floor = String(u.floor || "0").toLowerCase();
            const pid = (u.project_id || u.projectId || '').toLowerCase();
            const unitId = u.unit_id || u.id;

            let specs = {};
            if (pid.includes('said')) {
                // Porto Said Range System
                if (area >= 30 && area <= 59) specs = { bedrooms: 0, bathrooms: 1, kitchen: true, living_area: false, type: "Studio" };
                else if (area >= 60 && area <= 85) specs = { bedrooms: 1, bathrooms: 1, kitchen: true, living_area: true, type: "1 Bedroom" };
                else if (area >= 86 && area <= 115) specs = { bedrooms: 2, bathrooms: 2, kitchen: true, living_area: true, type: "2 Bedroom" };
                else if (area >= 116) specs = { bedrooms: 3, bathrooms: 2, kitchen: true, living_area: true, type: "3 Bedroom/Family" };
            } else {
                // Porto Golf Marina - FIXED AREA SYSTEM 🎯
                if (area === 30) {
                    specs = { bedrooms: 1, bathrooms: 1, kitchen: true, living_area: false, dining_area: false, type: "Studio" };
                } else if (area === 60) {
                    specs = { bedrooms: 1, bathrooms: 2, kitchen: true, living_area: true, type: "Apartment" };
                } else if (area === 82) {
                    specs = { bedrooms: 1, bathrooms: 2, kitchen: true, living_area: true, dining_area: true, type: "Apartment" };
                } else if (area === 90) {
                    specs = { bedrooms: 2, bathrooms: 2, kitchen: true, living_area: true, type: "Apartment" };
                } else {
                    // Default fallback
                    specs = { bedrooms: 1, bathrooms: 1, kitchen: true, living: true };
                }
            }

            if (floor === '0' || floor.includes('ground') || floor.includes('ardi')) {
                specs.garden = true;
                specs.garden_desc = "Private Garden";
            } else {
                specs.garden = false;
            }

            const data = {
                ...u,
                auto_specs: JSON.stringify(specs),
                specifications: JSON.stringify(specs)
            };

            // Cleanup to match D1 columns if necessary (CamelCase -> Underscores)
            if (data.projectId) { data.project_id = data.projectId; delete data.projectId; }
            if (data.buildingId) { data.building_id = data.buildingId; delete data.buildingId; }
            if (data.paymentPlan) { data.payment_plan = data.paymentPlan; delete data.paymentPlan; }
            if (data.intent) { data.purpose = data.intent; delete data.intent; }
            delete data.id;

            await fetch("https://robel-api.george-gamal139.workers.dev/api", {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_KEY}` },
                body: JSON.stringify({
                    action: 'UPSERT',
                    table: 'units',
                    id: unitId,
                    data: data
                })
            });
        }
        console.log("Restoration Complete.");
    } catch (e) { console.error(e); }
}
restore();
