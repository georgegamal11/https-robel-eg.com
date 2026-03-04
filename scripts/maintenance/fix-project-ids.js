#!/usr/bin/env node

/**
 * Fix units' project_id by mapping from buildings
 * Usage: node scripts/fix-project-ids.js
 */

const fetch = global.fetch || require('node-fetch');
const WORKER_URL = 'https://robel-api.george-gamal139.workers.dev';
const AUTH_KEY = 'ROBEL_SECURE_SYNC_2025';

async function fetchJson(url, opts) {
    const r = await fetch(url, opts);
    const text = await r.text();
    try { return JSON.parse(text); } catch { return text; }
}

async function main() {
    console.log('🔎 Fetching buildings...');
    const buildings = await fetchJson(`${WORKER_URL}/api/buildings`);
    if (!Array.isArray(buildings)) {
        console.error('❌ Failed to fetch buildings:', buildings);
        process.exit(1);
    }

    const buildingToProject = {};
    buildings.forEach(b => {
        if (b.id) buildingToProject[b.id] = b.project_id || b.project || null;
    });

    console.log(`   Found ${buildings.length} buildings, mapping prepared.`);

    console.log('🔎 Fetching units (first 1000)...');
    const units = await fetchJson(`${WORKER_URL}/api/units`);
    if (!Array.isArray(units)) {
        console.error('❌ Failed to fetch units:', units);
        process.exit(1);
    }

    console.log(`   Found ${units.length} units.`);

    let updated = 0, skipped = 0, failed = 0;

    for (const u of units) {
        const unitId = u.unit_id || u.id || u.code;
        const bId = u.building_id || null;
        const curProject = u.project_id || null;

        if ((!curProject || curProject === '') && bId) {
            const mapped = buildingToProject[bId];
            if (mapped) {
                // PATCH via UPSERT
                const body = {
                    action: 'UPSERT',
                    table: 'units',
                    id: unitId,
                    data: { project_id: mapped }
                };

                try {
                    const resp = await fetch(`${WORKER_URL}/api/units`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_KEY}` },
                        body: JSON.stringify(body)
                    });
                    if (!resp.ok) {
                        const txt = await resp.text();
                        console.warn(`⚠️ Failed updating ${unitId}: ${resp.status} ${txt}`);
                        failed++;
                    } else {
                        updated++;
                    }
                } catch (e) {
                    console.warn(`⚠️ Error updating ${unitId}: ${e.message}`);
                    failed++;
                }
            } else {
                skipped++;
            }
        } else {
            skipped++;
        }
    }

    console.log('\n✅ Done.');
    console.log(`   Updated: ${updated}, Failed: ${failed}, Skipped: ${skipped}`);

    console.log('\n📊 Re-checking stats...');
    const stats = await fetchJson(`${WORKER_URL}/api/stats`);
    console.log(JSON.stringify(stats, null, 2));
}

main().catch(err => {
    console.error('Fatal:', err);
    process.exit(1);
});
