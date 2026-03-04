const fs = require('fs');
const fetch = global.fetch || require('node-fetch');
const WORKER_BASE = 'https://robel-api.george-gamal139.workers.dev';
const AUTH_KEY = 'ROBEL_SECURE_SYNC_2025';

function pickPreferred(rows, validProjects) {
  // Prefer row whose project_id is in validProjects
  for (const r of rows) if (r.project_id && validProjects.includes(r.project_id)) return r;
  // Then prefer row with project_id non-null
  for (const r of rows) if (r.project_id) return r;
  // Then prefer row with building_id starting with B
  for (const r of rows) if (r.building_id && String(r.building_id).startsWith('B')) return r;
  return rows[0];
}

(async ()=>{
  try {
    console.log('Fetching projects...');
    const pr = await fetch(`${WORKER_BASE}/api/projects`);
    const projects = await pr.json();
    const validProjects = Array.isArray(projects) ? projects.map(p => p.id || p) : projects || [];

    console.log('Fetching all units...');
    const ru = await fetch(`${WORKER_BASE}/api/units`);
    const all = await ru.json();
    if (!Array.isArray(all)) throw new Error('Unexpected /api/units response');

    const map = new Map();
    for (const u of all) {
      const code = u.code || null;
      if (!map.has(code)) map.set(code, []);
      map.get(code).push(u);
    }

    const dedup = [];
    for (const [code, rows] of map.entries()) {
      const pick = pickPreferred(rows, validProjects);
      // normalize: ensure unit_id equals code
      const unitId = String(code || (pick.unit_id || pick.id || ''));
      pick.unit_id = unitId;
      dedup.push(pick);
    }

    console.log('Deduped count:', dedup.length);

    // WIPE
    console.log('Wiping units table...');
    await fetch(`${WORKER_BASE}/api/units`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_KEY}` },
      body: JSON.stringify({ action: 'WIPE_UNITS', table: 'units' })
    });

    // Insert deduped
    console.log('Inserting deduped rows...');
    let success = 0, failed = 0;
    for (const r of dedup) {
      const id = String(r.code || r.unit_id);
      const data = {
        unit_id: id,
        project_id: r.project_id || null,
        building_id: r.building_id || null,
        code: r.code || id,
        floor: r.floor || null,
        area: r.area || null,
        view: r.view || null,
        price: r.price || null,
        purpose: r.purpose || r.intent || 'Sale',
        payment_plan: r.payment_plan || null,
        images: JSON.stringify(r.images || []),
        status: r.status || 'Available'
      };
      const res = await fetch(`${WORKER_BASE}/api/units`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_KEY}` },
        body: JSON.stringify({ action: 'UPSERT', table: 'units', id, data })
      });
      if (res.ok) success++; else { failed++; const t = await res.text(); console.warn('failed', id, t); }
    }

    console.log('Inserted', success, 'failed', failed);
    const statsRes = await fetch(`${WORKER_BASE}/api/stats`);
    const stats = await statsRes.json();
    console.log('Stats after rebuild:', JSON.stringify(stats, null, 2));
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
