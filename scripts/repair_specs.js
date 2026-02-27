
const FETCH_URL = "https://robel-api.george-gamal139.workers.dev/api/units";
const AUTH_KEY = "ROBEL_SECURE_SYNC_2025";

async function repair() {
    try {
        const resp = await fetch(FETCH_URL);
        const units = await resp.json();
        console.log(`Fetched ${units.length} units.`);

        let repairCount = 0;

        for (const u of units) {
            const area = Math.round(parseFloat(u.area) || 0);
            const floor = String(u.floor || "0").toLowerCase();
            const pid = (u.project_id || u.projectId || '').toLowerCase();
            const unitId = u.unit_id || u.id;

            let specs = null;

            if (pid.includes('said')) {
                // Porto Said Logic
                if (area >= 30 && area <= 59) specs = { bedrooms: 0, bathrooms: 1, kitchen: true, living_area: false, type: "Studio" };
                else if (area >= 60 && area <= 85) specs = { bedrooms: 1, bathrooms: 1, kitchen: true, living_area: true, type: "1 Bedroom" };
                else if (area >= 86 && area <= 115) specs = { bedrooms: 2, bathrooms: 2, kitchen: true, living_area: true, type: "2 Bedroom" };
                else if (area >= 116) specs = { bedrooms: 3, bathrooms: 2, kitchen: true, living_area: true, type: "3 Bedroom/Family" };
            }
            else if (pid.includes('golf')) {
                // Porto Golf Marina - FIXED AREA SYSTEM 🎯
                if (area === 30) {
                    specs = { bedrooms: 1, bathrooms: 1, kitchen: true, living_area: false, dining_area: false, type: "Studio" };
                } else if (area === 60) {
                    specs = { bedrooms: 1, bathrooms: 2, kitchen: true, living_area: true, type: "Apartment" };
                } else if (area === 82) {
                    specs = { bedrooms: 1, bathrooms: 2, kitchen: true, living_area: true, dining_area: true, type: "Apartment" };
                } else if (area === 90) {
                    specs = { bedrooms: 2, bathrooms: 2, kitchen: true, living_area: true, type: "Apartment" };
                }
            }

            if (specs) {
                // Ground Floor Rule
                if (floor === '0' || floor.includes('ground') || floor.includes('ardi')) {
                    specs.garden = true;
                    specs.garden_desc = "Private Garden";
                } else {
                    specs.garden = false;
                }

                repairCount++;
                console.log(`Updating ${unitId} (Area: ${area})...`);

                await fetch("https://robel-api.george-gamal139.workers.dev/api", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_KEY}` },
                    body: JSON.stringify({
                        action: 'UPSERT',
                        table: 'units',
                        id: unitId,
                        data: {
                            auto_specs: JSON.stringify(specs),
                            specifications: JSON.stringify(specs)
                        }
                    })
                });
            }
        }

        console.log(`Successfully updated ${repairCount} units with precise rules.`);
    } catch (e) {
        console.error("Error:", e.message);
    }
}

repair();
