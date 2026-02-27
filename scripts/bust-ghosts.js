const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// CONFIG
const WORKER_URL = "https://robel-api.george-gamal139.workers.dev";
const AUTH_KEY = "George792001";

// 1. Load Inventory (Source of Truth)
const inventoryPath = path.join(__dirname, '../assets/data/inventory.json');
const raw = fs.readFileSync(inventoryPath, 'utf-8');
const inventory = JSON.parse(raw);

console.log(`📦 Loaded ${inventory.length} units from inventory.json`);

// Helper
async function sendRequest(apiPath, method, body) {
    try {
        const resp = await fetch(`${WORKER_URL}/api/${apiPath}`, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_KEY}` },
            body: body ? JSON.stringify(body) : null
        });
        const text = await resp.text();
        try { return JSON.parse(text); } catch { return text; }
    } catch (e) {
        return { error: e.message };
    }
}

async function main() {
    console.log("🔍 Fetching DB units...");
    const dbUnits = await sendRequest('units?projectId=', 'GET');

    if (!Array.isArray(dbUnits)) {
        console.error("❌ Failed to fetch DB units:", dbUnits);
        return;
    }
    console.log(`📊 DB currently has ${dbUnits.length} units.`);

    // 2. Build Set of Valid IDs from Inventory
    // Note: The worker script uses `id` as primary key.
    // In seed-database.js: unitId = String(u.code || u.unit_id)

    const validIds = new Set();
    const validCodes = new Set();

    inventory.forEach(u => {
        const id = String(u.code || u.unit_id || u.id);
        validIds.add(id);
        if (u.code) validCodes.add(String(u.code));
    });

    console.log(`✅ Valid IDs Count: ${validIds.size}`);

    // 3. Identify Ghosts
    const ghosts = [];
    const duplicates = []; // If DB has multiple entries for same valid ID (handled by PK usually but let's check)

    for (const u of dbUnits) {
        const dbId = u.unit_id; // Primary Key in DB
        const dbCode = u.code;

        // Check 1: Is the PK in our valid list?
        if (!validIds.has(dbId)) {
            // Check 2: Maybe the PK is old format but code is valid?
            // If code is valid, but PK is different, then this PK entry is likely a duplicate or old version 
            // of the "real" entry that should account for that code.
            // Example: DB has ID="15101" (Ghost) but Inventory has ID="15-101".
            // Since "15101" is not in validIds (which contains "15-101"), it is a ghost.

            ghosts.push(u);
        }
    }

    console.log(`👻 Found ${ghosts.length} Ghost Units (Not in inventory.json).`);

    if (ghosts.length > 0) {
        console.log("Here are some examples:");
        ghosts.slice(0, 5).forEach(g => console.log(` - ID: ${g.unit_id} | Code: ${g.code} | Project: ${g.project_id}`));

        console.log("\n🚀 Deleting Ghosts...");
        for (const g of ghosts) {
            process.stdout.write(`\rDeleting ${g.unit_id}...`);
            await sendRequest('units', 'POST', { action: 'DELETE', table: 'units', id: g.unit_id });
        }
        console.log("\n✅ Ghosts Busted.");
    } else {
        console.log("✨ No ghosts found. Database matches inventory file count (mostly).");
    }

    // Final check
    const finalCount = dbUnits.length - ghosts.length;
    console.log(`\n🎉 Final Estimated DB Count: ${finalCount}`);
    console.log(`   Target Inventory Count: ${inventory.length}`);
}

main().catch(console.error);
