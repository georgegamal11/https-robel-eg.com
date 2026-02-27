const fetch = require('node-fetch'); // Ensure node-fetch is available (or use global fetch in Node 18+)

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
    console.log("🧹 Starting Database Cleanup...");

    // 1. Fetch ALL Units
    console.log("🔍 Fetching all units...");
    const allUnits = await sendRequest('units?projectId=', 'GET');

    if (!Array.isArray(allUnits)) {
        console.error("❌ Failed to fetch units or received invalid format:", allUnits);
        return;
    }

    console.log(`📊 Found ${allUnits.length} total units.`);

    const toDelete = [];
    const toUpdate = [];

    for (const u of allUnits) {
        let shouldDelete = false;
        let updates = {};

        // 🚨 CRITERIA 1: Junk Data ("George", "GE...")
        if (u.unit_id && u.unit_id.toString().startsWith('GE')) shouldDelete = true;
        if (u.building_id === 'George') shouldDelete = true;

        // 🚨 CRITERIA 2: Bad Building IDs (Numeric "17" => "B17")
        if (!shouldDelete && u.building_id) {
            const bId = u.building_id.toString();

            // Fix numeric IDs (e.g., "17" -> "B17")
            if (/^\d+$/.test(bId)) {
                updates.building_id = `B${bId}`;
                // Also fix project mapping (B17 is typically Porto Said or Golf depending on context, assuming Golf based on screenshot 17-101)
                // Actually screenshot 17-101 had project_id: porto-golf-marina.
                // We keep the project_id unless it matches the known map.
                updates.project_id = u.project_id || 'porto-golf-marina';
            }

            // Fix "B1516" or similar weird concatenation if exists? No, sticking to numeric fix.
        }

        if (shouldDelete) {
            toDelete.push(u.unit_id);
        } else if (Object.keys(updates).length > 0) {
            toUpdate.push({ id: u.unit_id, ...updates, original: u });
        }
    }

    // 2. Execute Deletions
    console.log(`🗑️  Found ${toDelete.length} junk units to DELETE.`);
    if (toDelete.length > 0) {
        for (const id of toDelete) {
            process.stdout.write(`\rDeleting ${id}...`);
            await sendRequest('units', 'POST', { action: 'DELETE', table: 'units', id: id });
        }
        console.log("\n✅ Deletion complete.");
    }

    // 3. Execute Updates
    console.log(`🛠️  Found ${toUpdate.length} units to FIX (Standardizing IDs).`);
    if (toUpdate.length > 0) {
        let count = 0;
        for (const item of toUpdate) {
            count++;
            const newData = { ...item.original, building_id: item.building_id }; // Merge existing data with new building_id
            if (item.project_id) newData.project_id = item.project_id;

            process.stdout.write(`\rFixing ${count}/${toUpdate.length}: ${item.id} (${item.original.building_id} -> ${item.building_id})`);

            await sendRequest('units', 'POST', {
                action: 'UPSERT',
                table: 'units',
                id: item.id,
                data: newData
            });
        }
        console.log("\n✅ Updates complete.");
    }

    console.log("✨ Database cleanup finished!");
}

main().catch(console.error);
