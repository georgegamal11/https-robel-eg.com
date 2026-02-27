const fetch = require('node-fetch');

const WORKER_URL = "https://robel-api.george-gamal139.workers.dev";
const AUTH_KEY = "George792001";

async function sendRequest(apiPath, method, body) {
    try {
        const resp = await fetch(`${WORKER_URL}/api/${apiPath}`, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_KEY}`
            },
            body: body ? JSON.stringify(body) : null
        });
        const text = await resp.text();
        try { return JSON.parse(text); } catch { return text; }
    } catch (e) {
        return { error: e.message };
    }
}

async function main() {
    console.log("🔍 Checking for Duplicates...");
    const allUnits = await sendRequest('units?projectId=', 'GET');

    if (!Array.isArray(allUnits)) {
        console.error("❌ Failed to fetch units:", allUnits);
        return;
    }

    console.log(`📊 Total Units in DB: ${allUnits.length}`);

    // Group by Code + Building
    const groups = {};
    for (const u of allUnits) {
        const key = `${u.code}-${u.building_id}`;
        if (!groups[key]) groups[key] = [];
        groups[key].push(u);
    }

    let duplicatesFound = 0;
    const idsToDelete = [];

    for (const key in groups) {
        if (groups[key].length > 1) {
            duplicatesFound++;
            console.log(`\n⚠️ Duplicate Found for ${key}: ${groups[key].length} entries`);

            // Sort by completeness (more fields usually better) or simply keep the first one
            // Let's keep the one that looks "newest" or most complete. 
            // In D1, we might not have timestamps easily unless we added them.
            // Let's simple keep the first one and delete the rest.

            const [keep, ...remove] = groups[key];
            console.log(`   ✅ Keeping: ID=${keep.unit_id} (Project=${keep.project_id})`);

            for (const r of remove) {
                console.log(`   ❌ Deleting: ID=${r.unit_id} (Project=${r.project_id})`);
                idsToDelete.push(r.unit_id);
            }
        }
    }

    console.log(`\nFound ${duplicatesFound} duplicate sets.`);
    console.log(`Prepare to delete ${idsToDelete.length} extra records.`);

    if (idsToDelete.length > 0) {
        console.log("🚀 Deleting duplicates...");
        for (const id of idsToDelete) {
            process.stdout.write(`\rDeleting ${id}...`);
            await sendRequest('units', 'POST', { action: 'DELETE', table: 'units', id: id });
        }
        console.log("\n✅ Duplicates removed.");
    } else {
        console.log("✅ No duplicates found based on Code-BuildingID combination.");
    }
}

main().catch(console.error);
