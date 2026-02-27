
const UNITS_TO_ADD = [
    { code: "9111", view: "Main Road", area: 87, price: 5120000, intent: "Buy" },
    { code: "9123", view: "Main Road", area: 87, price: 5120000, intent: "Buy" },
    { code: "9148", view: "Aquaporto", area: 92, price: 5413000, intent: "Buy" },
    { code: "9155", view: "Champs Elysees", area: 87, price: 4705000, intent: "Buy" },
    { code: "9163", view: "Champs Elysees", area: 85, price: 4596000, intent: "Buy" },
    { code: "9171", view: "Champs Elysees", area: 85, price: 4596000, intent: "Buy" },
    { code: "9113A", view: "Main Road", area: 102, price: 6002000, intent: "Buy" },
    { code: "9161A", view: "Champs Elysees", area: 95, price: 5137000, intent: "Buy" },
    { code: "9248", view: "Aquaporto", area: 92, price: 5502000, intent: "Buy" },
    { code: "9251", view: "Champs Elysees", area: 85, price: 4678000, intent: "Buy" },
    { code: "9255", view: "Champs Elysees", area: 87, price: 4787000, intent: "Buy" },
    { code: "9259", view: "Champs Elysees", area: 85, price: 4678000, intent: "Buy" },
    { code: "9265", view: "Champs Elysees", area: 85, price: 4678000, intent: "Buy" },
    { code: "9267", view: "Champs Elysees", area: 85, price: 4678000, intent: "Buy" },
    { code: "9271", view: "Champs Elysees", area: 85, price: 4678000, intent: "Buy" },
    { code: "9247C", view: "Champs Elysees", area: 84, price: 4622000, intent: "Buy" },
    { code: "9261A", view: "Champs Elysees", area: 95, price: 5228000, intent: "Buy" },
    { code: "9303", view: "Main Road", area: 85, price: 5164000, intent: "Buy" },
    { code: "9307", view: "Main Road", area: 85, price: 5164000, intent: "Buy" },
    { code: "9351", view: "Champs Elysees", area: 85, price: 4758000, intent: "Buy" },
    { code: "9355", view: "Champs Elysees", area: 87, price: 4870000, intent: "Buy" },
    { code: "9359", view: "Champs Elysees", area: 85, price: 4758000, intent: "Buy" },
    { code: "9363", view: "Champs Elysees", area: 85, price: 4758000, intent: "Buy" },
    { code: "9371", view: "Champs Elysees", area: 85, price: 4758000, intent: "Buy" },
    { code: "9347C", view: "Champs Elysees", area: 84, price: 4702000, intent: "Buy" },
    { code: "9361A", view: "Champs Elysees", area: 95, price: 5318000, intent: "Buy" },
    { code: "9403", view: "Main Road", area: 85, price: 5245000, intent: "Buy" },
    { code: "9407", view: "Main Road", area: 85, price: 5245000, intent: "Buy" },
    { code: "9411", view: "Main Road", area: 87, price: 5369000, intent: "Buy" },
    { code: "9448", view: "Aquaporto", area: 92, price: 5677000, intent: "Buy" },
    { code: "9451", view: "Champs Elysees", area: 85, price: 4839000, intent: "Buy" },
    { code: "9455", view: "Champs Elysees", area: 87, price: 4954000, intent: "Buy" },
    { code: "9459", view: "Champs Elysees", area: 85, price: 4839000, intent: "Buy" },
    { code: "9463", view: "Champs Elysees", area: 85, price: 4839000, intent: "Buy" },
    { code: "9465", view: "Champs Elysees", area: 85, price: 4839000, intent: "Buy" },
    { code: "9447C", view: "Champs Elysees", area: 84, price: 4783000, intent: "Buy" },
    { code: "9461A", view: "Champs Elysees", area: 95, price: 5409000, intent: "Buy" },
    { code: "9023", view: "Main Road", area: 87, price: 5673000, intent: "Buy" },
    { code: "9047A", view: "Landscape", area: 99, price: 6567000, intent: "Buy" }
];

async function uploadB9UnitsWithDetails() {
    const AUTH_KEY = "G792001";
    const WORKER_URL = "https://robel-api.george-gamal139.workers.dev";

    console.log(`🚀 Starting upload of ${UNITS_TO_ADD.length} units to Building B9 with prices and intent...`);

    for (const unit of UNITS_TO_ADD) {
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
            price: unit.price,
            status: "Available",
            purpose: "Buy", // DB column for Sale/Rent (Standardized to 'Buy' instead of 'Sale')
            intent: unit.intent.toLowerCase() // internal filter logic (buy/rent)
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
                console.log(`✅ Success: Unit ${unit.code} - ${unit.price} EGP`);
            } else {
                console.error(`❌ Failed: Unit ${unit.code}`, result.error);
            }
        } catch (e) {
            console.error(`❌ Network Error: Unit ${unit.code}`, e.message);
        }
    }

    console.log("🏁 Batch upload complete.");
}

uploadB9UnitsWithDetails();
