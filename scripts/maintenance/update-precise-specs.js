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

function generatePreciseSpecs(unit) {
    let bedrooms = 1;
    let bathrooms = 1;
    let type = "Chalet"; // Default
    let kitchen = true;
    let living = true;
    let dining = false;

    const area = Number(unit.area);
    const projectId = unit.project_id;
    const buildingId = unit.building_id;

    // ---------------------------------------------------------
    // 1️⃣ PORTO GOLF MARINA (Fixed Areas)
    // ---------------------------------------------------------
    if (projectId === 'porto-golf-marina' || buildingId.startsWith('B13') || buildingId.startsWith('B23') || buildingId.startsWith('B24')) {
        if (area === 30) {
            type = "Studio";
            bedrooms = 1; bathrooms = 1; kitchen = true; living = false;
        } else if (area === 60) {
            type = "Chalet";
            bedrooms = 1; bathrooms = 2; kitchen = true; living = true;
        } else if (area === 82) {
            type = "Chalet";
            bedrooms = 1; bathrooms = 2; kitchen = true; living = true; dining = true;
        } else if (area === 90) {
            type = "Chalet";
            bedrooms = 2; bathrooms = 2; kitchen = true; living = true;
        } else {
            // Fallback for non-standard areas in Golf Marina
            if (area < 50) { bedrooms = 1; bathrooms = 1; type = "Studio"; }
            else if (area < 80) { bedrooms = 1; bathrooms = 2; }
            else { bedrooms = 2; bathrooms = 2; }
        }
    }

    // ---------------------------------------------------------
    // 2️⃣ PORTO SAID - BUILDING B15 (Fixed Areas)
    // ---------------------------------------------------------
    else if (buildingId === 'B15') {
        if (area >= 40 && area <= 48) { // Covers 41 & 47
            type = "Studio";
            bedrooms = 0; bathrooms = 1; kitchen = true; living = false;
        } else if (area >= 68 && area <= 73) { // Covers 69 & 72
            type = "Apartment";
            bedrooms = 1; bathrooms = 1; kitchen = true; living = true;
        } else if (area >= 90 && area <= 108) { // Covers 90 & 107
            type = "Apartment";
            bedrooms = 2; bathrooms = 2; kitchen = true; living = true;
        } else if (area >= 160) { // Covers 165
            type = "Family Apartment";
            bedrooms = 3; bathrooms = 2; kitchen = true; living = true;
        } else {
            // Fallback for B15
            if (area < 50) { bedrooms = 0; bathrooms = 1; type = "Studio"; }
            else if (area < 80) { bedrooms = 1; bathrooms = 1; }
            else if (area < 120) { bedrooms = 2; bathrooms = 2; }
            else { bedrooms = 3; bathrooms = 2; }
        }
    }

    // ---------------------------------------------------------
    // 3️⃣ PORTO SAID - BUILDING B33 (Ranges)
    // ---------------------------------------------------------
    else if (buildingId === 'B33') {
        if (area >= 30 && area <= 59) {
            type = "Studio";
            bedrooms = 0; bathrooms = 1;
        } else if (area >= 60 && area <= 75) {
            type = "Junior 1 Bedroom";
            bedrooms = 1; bathrooms = 1;
        } else if (area >= 76 && area <= 95) {
            type = "1 Bedroom Apartment";
            bedrooms = 1; bathrooms = 1;
        } else if (area >= 96 && area <= 120) {
            type = "2 Bedroom Apartment";
            bedrooms = 2; bathrooms = 2;
        } else if (area >= 121 && area <= 150) {
            type = "Family Apartment";
            bedrooms = 3; bathrooms = 2;
        } else {
            // Fallback B33
            bedrooms = 2; bathrooms = 1;
        }
    }

    // ---------------------------------------------------------
    // 4️⃣ GROUND FLOOR RULE (Private Garden)
    // ---------------------------------------------------------
    let hasGarden = false;
    if (unit.floor && (unit.floor.toLowerCase().includes('ground') || unit.floor === 'Ground')) {
        hasGarden = true;
    }

    return JSON.stringify({
        type: type,
        bedrooms: bedrooms,
        bathrooms: bathrooms,
        kitchen: kitchen,
        living: living,
        dining: dining,
        garden: hasGarden,
        garden_area: hasGarden ? "Private Garden" : null
    });
}

async function main() {
    console.log("🎯 Applying PRECISE Specifications Rules...");
    console.log("==========================================\n");

    console.log("📡 Fetching units...");
    const units = await sendRequest('units', 'GET');

    if (!Array.isArray(units)) {
        console.error("❌ Failed:", units);
        return;
    }

    console.log(`✅ Processing ${units.length} units\n`);

    let updated = 0;
    for (const unit of units) {
        const specs = generatePreciseSpecs(unit);

        // Update only if specs changed or are missing
        if (unit.auto_specs !== specs) {
            const updatedData = { ...unit, auto_specs: specs };
            process.stdout.write(`\r   Updating ${unit.unit_id} (${unit.area}m²) -> ${specs}`);

            await sendRequest('units', 'POST', {
                action: 'UPSERT',
                table: 'units',
                id: unit.unit_id,
                data: updatedData
            });
            updated++;
        }
    }

    console.log(`\n\n✅ Successfully updated ${updated} units with PRECISE rules.\n`);
}

main().catch(console.error);
