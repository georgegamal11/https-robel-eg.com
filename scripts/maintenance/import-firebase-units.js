const fs = require('fs');
const path = require('path');
const fetch = global.fetch || require('node-fetch');

const WORKER_URL = 'https://robel-api.george-gamal139.workers.dev';
const AUTH_KEY = 'ROBEL_SECURE_SYNC_2025';

const candidates = [
  path.join(__dirname, '..', 'assets', 'data', 'export_units.json'),
  path.join(__dirname, '..', 'assets', 'data', 'firebase_units.json'),
  path.join(__dirname, '..', 'assets', 'data', 'inventory.json')
];

function normalizeUnit(u) {
  // Map common firebase shape to D1 columns
  const code = u.code || u.unit_code || u.id || u.unitId || u.unit_id || null;
  const unit_id = String(code || u.unit_id || u.id || '');
  const buildingId = u.buildingId || u.building_id || u.building || u.project || null;
  const projectId = u.projectId || u.project_id || u.project || null;

  return {
    unit_id: unit_id,
    code: code || null,
    building_id: buildingId || null,
    project_id: projectId || null,
    floor: u.floor || null,
    area: u.area || null,
    view: u.view || null,
    price: u.price || null,
    purpose: u.purpose || u.intent || 'Sale',
    payment_plan: u.payment_plan || u.paymentPlan || null,
    images: JSON.stringify(u.images || u.photos || []),
    status: u.status || 'Available'
  };
}

async function upsert(unit) {
  const id = unit.unit_id || unit.code || String(Date.now());
  try {
    const res = await fetch(`${WORKER_URL}/api/units`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_KEY}` },
      body: JSON.stringify({ action: 'UPSERT', table: 'units', id, data: unit })
    });
    if (!res.ok) {
      const t = await res.text();
      return { ok: false, status: res.status, text: t };
    }
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
}

(async ()=>{
  // find file
  let filePath = null;
  for (const c of candidates) if (fs.existsSync(c)) { filePath = c; break; }
  if (!filePath) {
    console.error('No export file found. Place your Firebase export JSON as one of:', candidates.join('\n'));
    process.exit(2);
  }

  console.log('Using file:', filePath);
  let raw = fs.readFileSync(filePath, 'utf8');
  let data;
  try { data = JSON.parse(raw); } catch (e) { console.error('Invalid JSON:', e.message); process.exit(3); }

  // Accept either array or { value: [...] } or object map
  let units = [];
  if (Array.isArray(data)) units = data;
  else if (data && Array.isArray(data.value)) units = data.value;
  else if (typeof data === 'object') {
    // object map - collect values
    units = Object.values(data).flatMap(v => Array.isArray(v) ? v : [v]);
  }

  console.log('Found units in file:', units.length);
  const normalized = units.map(normalizeUnit);

  let success = 0, failed = 0;
  for (let i=0;i<normalized.length;i++) {
    const u = normalized[i];
    const r = await upsert(u);
    if (r.ok) success++; else { failed++; console.warn('Upsert failed for', u.unit_id, r); }
    process.stdout.write(`\rProcessed ${i+1} / ${normalized.length}`);
  }
  console.log('\nDone. Success:', success, 'Failed:', failed);

  const stats = await (await fetch(`${WORKER_URL}/api/stats`)).json();
  console.log('Stats:', JSON.stringify(stats, null, 2));
})();
