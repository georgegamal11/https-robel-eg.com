
const UNITS_TO_ADD = [
    { code: "9111", area: 87, view: "Main Road" },
    { code: "9123", area: 87, view: "Main Road" },
    { code: "9148", area: 92, view: "Aquaporto" },
    { code: "9155", area: 87, view: "Champs Elysees" },
    { code: "9163", area: 85, view: "Champs Elysees" },
    { code: "9171", area: 85, view: "Champs Elysees" },
    { code: "9113A", area: 102, view: "Main Road" },
    { code: "9161A", area: 95, view: "Champs Elysees" },
    { code: "9248", area: 92, view: "Aquaporto" },
    { code: "9251", area: 85, view: "Champs Elysees" },
    { code: "9255", area: 87, view: "Champs Elysees" },
    { code: "9261A", area: 95, view: "Champs Elysees" },
    { code: "9303", area: 85, view: "Main Road" },
    { code: "9351", area: 85, view: "Champs Elysees" },
    { code: "9355", area: 87, view: "Champs Elysees" },
    { code: "9361A", area: 95, view: "Champs Elysees" },
    { code: "9403", area: 85, view: "Main Road" },
    { code: "9411", area: 87, view: "Main Road" },
    { code: "9448", area: 92, view: "Aquaporto" },
    { code: "9451", area: 85, view: "Champs Elysees" },
    { code: "9455", area: 87, view: "Champs Elysees" },
    { code: "9461A", area: 95, view: "Champs Elysees" },
    { code: "9023", area: 87, view: "Main Road" },
    { code: "9047A", area: 99, view: "Landscape" }
];

async function uploadB9Units() {
    const AUTH_KEY = "G792001";
    const WORKER_URL = "https://robel-api.george-gamal139.workers.dev";

    console.log(`🚀 Starting upload of ${UNITS_TO_ADD.length} units to Building B9 (Porto Said)...`);

    for (const unit of UNITS_TO_ADD) {
        // Extract floor: 9111 -> 1, 9023 -> 0, 9461A -> 4
        // Logic: digits skip first digit (building 9), next digit is floor
        const digits = unit.code.replace(/\D/g, '');
        const floor = digits.length >= 2 ? digits.substring(1, 2) : "0";

        const unitData = {
            unit_id: `unit_B9_${unit.code}`,
            code: unit.code,
            building_id: "B9",
            project_id: "Porto Said",
            floor: floor,
            area: unit.area,
            view: unit.view,
            status: "Available",
            purpose: "Sale"
        };

        try {
            const resp = await fetch(`${WORKER_URL}/api`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AUTH_KEY}`
                },
                body: JSON.stringify({
                    action: 'UPSERT',
                    table: 'units',
                    id: unitData.unit_id,
                    data: unitData
                })
            });

            const result = await resp.json();
            if (result.success) {
                console.log(`✅ Success: Unit ${unit.code}`);
            } else {
                console.error(`❌ Failed: Unit ${unit.code}`, result.error);
            }
        } catch (e) {
            console.error(`❌ Network Error: Unit ${unit.code}`, e.message);
        }
    }

    console.log("🏁 Batch upload complete.");
}

uploadB9Units();
