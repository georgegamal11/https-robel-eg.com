const fs = require('fs');
const path = require('path');

// Worker Settings
const WORKER_URL = "https://robel-api.george-gamal139.workers.dev";
const AUTH_KEY = "George792001";

// Helper for fetch (Node 18+ has global fetch)
const fetch = global.fetch || require('node-fetch');

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
    console.log('📥 Loading Inventory File...');
    const invPath = path.join(__dirname, '../assets/data/inventory.json');
    let inventory = [];
    try {
        inventory = JSON.parse(fs.readFileSync(invPath, 'utf8'));
    } catch (e) {
        console.error("❌ Failed to read inventory.json:", e.message);
        process.exit(1);
    }

    // 1. Build Set of Valid IDs (The Source of Truth)
    const validIds = new Set();
    inventory.forEach(u => {
        // We use code as ID, just like seed-database.js
        const id = String(u.code || u.unit_id || u.id);
        if (id) validIds.add(id);
    });

    console.log(`✅ Inventory contains ${inventory.length} records.`);
    console.log(`✅ Unique Valid IDs: ${validIds.size}`);

    // 2. Fetch Database Content
    console.log('📡 Fetching Database Units...');
    const dbUnits = await sendRequest('units', 'GET');

    if (!Array.isArray(dbUnits)) {
        console.error('❌ Failed to fetch units from DB:', dbUnits);
        process.exit(1);
    }

    console.log(`📊 Database currently has ${dbUnits.length} units.`);

    // 3. Identify Ghosts
    const ghosts = dbUnits.filter(u => !validIds.has(String(u.unit_id)));

    console.log(`👻 Found ${ghosts.length} "Ghost" units (Not in inventory.json).`);

    if (ghosts.length > 0) {
        const sample = ghosts.slice(0, 3).map(g => g.unit_id).join(', ');
        console.log(`   Sample Ghosts: ${sample}...`);

        console.log('🚀 Deleting Ghosts...');
        // Delete in batches to be safe/fast
        for (const g of ghosts) {
            process.stdout.write(`\rDeleting ${g.unit_id}...`);
            await sendRequest('units', 'POST', { action: 'DELETE', table: 'units', id: g.unit_id });
        }
        console.log('\n✅ Deletion Complete.');
        console.log(`🎉 Final Database Count: ${dbUnits.length - ghosts.length}`);
    } else {
        console.log('✨ Database is already perfectly synchronized with inventory.json!');
    }
}

main().catch(console.error);
