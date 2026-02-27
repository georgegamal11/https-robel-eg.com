const fs = require('fs');
const path = require('path');
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

async function main() {
    console.log("📥 Loading BACKUP Inventory...");
    // Read from units_backup.json which has images and payment plans
    const backupPath = path.join(__dirname, '../units_backup.json');
    let backupUnits = [];
    try {
        backupUnits = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    } catch (e) {
        console.error("❌ Failed to read units_backup.json:", e.message);
        process.exit(1);
    }

    console.log(`✅ Loaded ${backupUnits.length} rich units from backup.`);

    console.log("📡 Fetching Current Database Units...");
    const dbUnits = await sendRequest('units', 'GET');

    if (!Array.isArray(dbUnits)) {
        console.error("❌ Failed to fetch DB units:", dbUnits);
        return;
    }

    console.log(`📊 DB has ${dbUnits.length} units.`);

    // Map Backup data by Code/UnitID for fast lookup
    const backupMap = {};
    backupUnits.forEach(u => {
        // Try strict ID match first
        if (u.unit_id) backupMap[String(u.unit_id)] = u;
        // Also map by code for fallback
        if (u.code) backupMap[String(u.code)] = u;
    });

    console.log("🔄 Restoring detailed data (Images & Payment Plans)...");

    let restoredCount = 0;

    for (const dbUnit of dbUnits) {
        let bestMatch = null;

        // 1. Try exact ID match
        if (backupMap[String(dbUnit.unit_id)]) {
            bestMatch = backupMap[String(dbUnit.unit_id)];
        }
        // 2. Try Code match
        else if (backupMap[String(dbUnit.code)]) {
            bestMatch = backupMap[String(dbUnit.code)];
        }

        if (bestMatch) {
            // Check if we actually need to update (is DB missing data?)
            // We assume DB is currently "lean" (missing images)

            const updates = {};
            let needsUpdate = false;

            // Restore Images if missing or empty in DB but present in Backup
            const dbImages = String(dbUnit.images || "[]");
            const backupImages = String(bestMatch.images || "[]");

            if ((dbImages === "[]" || !dbImages) && backupImages !== "[]") {
                updates.images = backupImages;
                needsUpdate = true;
            }

            // Restore Payment Plan
            if (!dbUnit.payment_plan && bestMatch.payment_plan) {
                updates.payment_plan = bestMatch.payment_plan;
                needsUpdate = true;
            }

            // Restore Specs (auto_specs or specifications)
            if (!dbUnit.auto_specs && bestMatch.auto_specs) {
                updates.auto_specs = bestMatch.auto_specs;
                needsUpdate = true;
            }

            if (needsUpdate) {
                restoredCount++;
                const newData = { ...dbUnit, ...updates };
                process.stdout.write(`\rRestoring ${dbUnit.unit_id}...`);
                await sendRequest('units', 'POST', {
                    action: 'UPSERT',
                    table: 'units',
                    id: dbUnit.unit_id,
                    data: newData
                });
            }
        }
    }

    console.log(`\n✅ Restored details for ${restoredCount} units.`);
}

main().catch(console.error);
