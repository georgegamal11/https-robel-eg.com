#!/usr/bin/env node

/**
 * Fix unit_id for units where it's NULL by using the `code` field.
 * Usage: node scripts/fix-unit-ids.js
 */

const fetch = global.fetch || require('node-fetch');
const WORKER_URL = 'https://robel-api.george-gamal139.workers.dev';
const AUTH_KEY = 'ROBEL_SECURE_SYNC_2025';

async function fetchJson(url) {
    const r = await fetch(url);
    const t = await r.text();
    try { return JSON.parse(t); } catch { return t; }
}

async function upsert(unitId, data) {
    const res = await fetch(`${WORKER_URL}/api/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_KEY}` },
        body: JSON.stringify({ action: 'UPSERT', table: 'units', id: unitId, data })
    });
    const text = await res.text();
    return { ok: res.ok, status: res.status, text };
}

async function main() {
    console.log('Fetching all units...');
    const units = await fetchJson(`${WORKER_URL}/api/units`);
    if (!Array.isArray(units)) {
        console.error('Failed to fetch units:', units);
        process.exit(1);
    }
    console.log(`Total units fetched: ${units.length}`);

    let updated=0, failed=0, skipped=0;
    for (const u of units) {
        const unitId = u.unit_id || null;
        const code = u.code || u.unit_code || null;
        if ((!unitId || unitId === null) && code) {
            const id = String(code);
            const data = { unit_id: id };
            const r = await upsert(id, data);
            if (r.ok) updated++; else { failed++; console.warn('Failed upsert', id, r.status, r.text); }
        } else skipped++;
        process.stdout.write(`\rProcessed ${updated+failed+skipped} / ${units.length}`);
    }
    console.log('\nDone. Updated:', updated, 'Failed:', failed, 'Skipped:', skipped);

    const stats = await fetchJson(`${WORKER_URL}/api/stats`);
    console.log('Stats:', JSON.stringify(stats, null, 2));
}

main().catch(e=>{console.error(e);process.exit(1);});
