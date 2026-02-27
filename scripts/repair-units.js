#!/usr/bin/env node

/**
 * Repair units by reading local inventory and projects mapping,
 * then UPSERT correct `building_id` and `project_id` into D1 via Worker API.
 *
 * Usage: node scripts/repair-units.js
 */

const fs = require('fs');
const path = require('path');
const fetch = global.fetch || require('node-fetch');

const WORKER_URL = 'https://robel-api.george-gamal139.workers.dev';
const AUTH_KEY = 'ROBEL_SECURE_SYNC_2025';

function slugify(name) {
    if (!name) return null;
    return name.toString().trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
}

async function upsertUnit(unitId, data) {
    try {
        const res = await fetch(`${WORKER_URL}/api/units`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_KEY}` },
            body: JSON.stringify({ action: 'UPSERT', table: 'units', id: unitId, data })
        });
        if (!res.ok) {
            const txt = await res.text();
            return { ok: false, status: res.status, error: txt };
        }
        return { ok: true };
    } catch (e) {
        return { ok: false, error: e.message };
    }
}

async function main() {
    const invPath = path.join(__dirname, '../assets/data/inventory.json');
    const projPath = path.join(__dirname, '../assets/data/projects.json');

    let inventory = [];
    let projects = {};
    try { inventory = JSON.parse(fs.readFileSync(invPath, 'utf8')); } catch (e) { console.error('Failed read inventory.json', e.message); process.exit(1); }
    try { projects = JSON.parse(fs.readFileSync(projPath, 'utf8')); } catch (e) { console.error('Failed read projects.json', e.message); process.exit(1); }

    // Build mapping from building code (with or without B prefix) to project slug
    const buildingToProjectSlug = {};
    Object.keys(projects).forEach(k => {
        const info = projects[k];
        const buildingCode = (k.toString().startsWith('B') ? k : (k.toString().startsWith('B') ? k : (k.toString())));
        // projectArea -> slug
        const slug = slugify(info.projectArea || info.project_area || info.projectArea);
        // store both with and without 'B' prefix
        buildingToProjectSlug[buildingCode] = slug;
        if (!buildingCode.startsWith('B')) buildingToProjectSlug['B' + buildingCode] = slug;
    });

    console.log(`Found ${inventory.length} units in inventory`);

    let success = 0, failed = 0;
    for (const unit of inventory) {
        const unitId = String(unit.code || unit.unit_id || unit.id);
        // unit.project in inventory contains building code like 'B133'
        let buildingId = unit.project || unit.building_id || null;
        if (buildingId && typeof buildingId === 'number') buildingId = String(buildingId);
        if (buildingId && !buildingId.startsWith('B')) {
            // maybe numeric, convert to B+num
            if (/^\d+$/.test(buildingId)) buildingId = 'B' + buildingId;
        }

        const projectSlug = buildingToProjectSlug[buildingId] || null;

        const data = {
            building_id: buildingId,
            project_id: projectSlug,
            code: unit.code || unitId,
            floor: unit.floor || null,
            area: unit.area || null,
            view: unit.view || null,
            price: unit.price || null,
            purpose: unit.intent || unit.purpose || 'Sale',
            images: JSON.stringify(unit.images || []),
            status: unit.status || 'Available'
        };

        const r = await upsertUnit(unitId, data);
        if (r.ok) success++; else { failed++; console.warn('Failed', unitId, r); }
        process.stdout.write(`\rProcessed ${success + failed} / ${inventory.length}`);
    }

    console.log('\nDone. Success:', success, 'Failed:', failed);

    const statsRes = await fetch(`${WORKER_URL}/api/stats`);
    const stats = await statsRes.json();
    console.log('Stats after repair:', JSON.stringify(stats, null, 2));
}

main().catch(e => { console.error(e); process.exit(1); });
