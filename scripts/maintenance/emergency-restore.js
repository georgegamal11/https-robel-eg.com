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
    console.log("🔄 FULL DATABASE RESTORATION FROM BACKUP...");

    // Read the complete backup file
    const backupPath = path.join(__dirname, '../units_backup.json');
    let fullBackup = [];

    try {
        fullBackup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
    } catch (e) {
        console.error("❌ Failed to read units_backup.json:", e.message);
        process.exit(1);
    }

    console.log(`✅ Loaded ${fullBackup.length} units from FULL BACKUP.`);
    console.log("⚠️  This will DELETE all current data and restore from backup.");

    // First, fetch current units to delete them
    console.log("📡 Fetching Current Database Units...");
    const dbUnits = await sendRequest('units', 'GET');

    if (!Array.isArray(dbUnits)) {
        console.error("❌ Failed to fetch DB units:", dbUnits);
        return;
    }

    console.log(`📊 DB has ${dbUnits.length} units. Deleting all...`);

    // Delete ALL current units
    for (const u of dbUnits) {
        process.stdout.write(`\rDeleting ${u.unit_id}...`);
        await sendRequest('units', 'POST', { action: 'DELETE', table: 'units', id: u.unit_id });
    }

    console.log(`\n✅ Deleted ${dbUnits.length} units.`);

    // Now restore from backup
    console.log("📥 Restoring ALL units from backup...");

    let restored = 0;
    for (const unit of fullBackup) {
        restored++;
        const unitId = String(unit.unit_id || unit.code);

        process.stdout.write(`\rRestoring ${restored}/${fullBackup.length}: ${unitId}...`);

        await sendRequest('units', 'POST', {
            action: 'UPSERT',
            table: 'units',
            id: unitId,
            data: unit
        });
    }

    console.log(`\n✅ FULL RESTORATION COMPLETE! ${restored} units restored.`);
}

main().catch(console.error);
