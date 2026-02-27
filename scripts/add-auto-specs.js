const fetch = global.fetch || require('node-fetch');

const WORKER_URL = "https://robel-api.george-gamal139.workers.dev";
const AUTH_KEY = "George792001";

async function sendRequest(apiPath, method, body) {
    try {
        const resp = await fetch(`${WORKER_URL}/api/${apiPath}`, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_KEY}` },
            body: body ? JSON.stringify(body) : null
        });
        const text = await resp.text();
        try { return JSON.parse(text); } catch { return text; }
    } catch (e) { return { error: e.message }; }
}

function generateSpecs(area, floor) {
    let bedrooms = 1;
    let bathrooms = 1;

    // القواعد الثابتة حسب المساحة
    if (area <= 35) {
        bedrooms = 1;
        bathrooms = 1;
    } else if (area >= 36 && area <= 50) {
        bedrooms = 1;
        bathrooms = 1;
    } else if (area >= 51 && area <= 75) {
        bedrooms = 1;
        bathrooms = 1;
    } else if (area >= 76 && area <= 100) {
        bedrooms = 2;
        bathrooms = 2;
    } else if (area >= 101 && area <= 130) {
        bedrooms = 3;
        bathrooms = 2;
    } else if (area >= 131 && area <= 160) {
        bedrooms = 3;
        bathrooms = 3;
    } else {
        bedrooms = 4;
        bathrooms = 3;
    }

    // حديقة خاصة للدور الأرضي
    const hasGarden = floor && (floor.toLowerCase().includes('ground') || floor === 'Ground');

    return JSON.stringify({
        bedrooms: bedrooms,
        bathrooms: bathrooms,
        kitchen: true,
        living: true,
        garden: hasGarden
    });
}

async function main() {
    console.log("🔧 Adding Auto-Specifications to All Units");
    console.log("==========================================\n");

    console.log("📡 Fetching all units...");
    const units = await sendRequest('units', 'GET');

    if (!Array.isArray(units)) {
        console.error("❌ Failed to fetch units:", units);
        return;
    }

    console.log(`✅ Found ${units.length} units\n`);
    console.log("📝 Generating and updating specifications...\n");

    let updated = 0;
    for (const unit of units) {
        const specs = generateSpecs(unit.area, unit.floor);

        const updatedData = { ...unit, auto_specs: specs };

        process.stdout.write(`\r   Updating ${unit.unit_id} (${unit.area}m²)...`);

        await sendRequest('units', 'POST', {
            action: 'UPSERT',
            table: 'units',
            id: unit.unit_id,
            data: updatedData
        });

        updated++;
    }

    console.log(`\n\n✅ Updated ${updated} units with auto-specs\n`);

    // عرض عينة من المواصفات
    console.log("📊 Sample Specifications:");
    console.log("   • 30m² → 1 bed, 1 bath");
    console.log("   • 60m² → 1 bed, 1 bath");
    console.log("   • 90m² → 2 beds, 2 baths");
    console.log("   • 120m² → 3 beds, 2 baths");
    console.log("   • 150m² → 3 beds, 3 baths");
    console.log("   • Ground floor → Private garden ✅\n");
}

main().catch(console.error);
