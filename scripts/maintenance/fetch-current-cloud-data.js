const fs = require('fs');
const path = require('path');
const fetch = global.fetch || require('node-fetch');

const WORKER_URL = "https://robel-api.george-gamal139.workers.dev";
const AUTH_KEY = "George792001";

async function sendRequest(apiPath, method) {
    try {
        const resp = await fetch(`${WORKER_URL}/api/${apiPath}`, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_KEY}`
            }
        });
        const text = await resp.text();
        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    } catch (e) {
        return { error: e.message };
    }
}

async function main() {
    console.log("☁️  FETCHING CURRENT DATA FROM CLOUDFLARE D1...");
    console.log("================================================");

    // Fetch all current units from cloud
    console.log("\n📡 Fetching ALL Units from Cloud Database...");
    const cloudUnits = await sendRequest('units', 'GET');

    if (!Array.isArray(cloudUnits)) {
        console.error("❌ Failed to fetch cloud units:", cloudUnits);
        return;
    }

    console.log(`✅ Fetched ${cloudUnits.length} units from Cloudflare D1`);

    // Check sample unit structure
    if (cloudUnits.length > 0) {
        console.log("\n📋 Sample Unit Structure:");
        const sample = cloudUnits[0];
        console.log("  - unit_id:", sample.unit_id);
        console.log("  - code:", sample.code);
        console.log("  - project_id:", sample.project_id);
        console.log("  - building_id:", sample.building_id);
        console.log("  - price:", sample.price);
        console.log("  - area:", sample.area);
        console.log("  - has images:", sample.images ? (sample.images.length > 10 ? "YES ✅" : "NO ❌") : "NO ❌");
        console.log("  - has payment_plan:", sample.payment_plan ? "YES ✅" : "NO ❌");
        console.log("  - has auto_specs:", sample.auto_specs ? "YES ✅" : "NO ❌");
    }

    // Save to backup file with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(__dirname, `../cloud_backup_${timestamp}.json`);

    console.log("\n💾 Saving to:", backupPath);
    fs.writeFileSync(backupPath, JSON.stringify(cloudUnits, null, 2));

    console.log(`✅ BACKUP COMPLETE! Saved ${cloudUnits.length} units`);

    // Analyze data completeness
    let withImages = 0;
    let withPaymentPlan = 0;
    let withSpecs = 0;

    cloudUnits.forEach(u => {
        if (u.images && u.images.length > 10) withImages++;
        if (u.payment_plan) withPaymentPlan++;
        if (u.auto_specs) withSpecs++;
    });

    console.log("\n📊 DATA COMPLETENESS:");
    console.log(`  - Units with Images: ${withImages}/${cloudUnits.length}`);
    console.log(`  - Units with Payment Plans: ${withPaymentPlan}/${cloudUnits.length}`);
    console.log(`  - Units with Specs: ${withSpecs}/${cloudUnits.length}`);

    return cloudUnits;
}

main().catch(console.error);
