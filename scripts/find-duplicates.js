const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'tmp_units.json');
if (!fs.existsSync(p)) { console.error('tmp_units.json not found'); process.exit(2); }
let raw = fs.readFileSync(p);
let data;
try { data = JSON.parse(raw.toString('utf8').replace(/^\uFEFF/, '')); }
catch(e) { data = JSON.parse(raw.toString('utf16le').replace(/^\uFEFF/, '')); }
if (data && data.value && Array.isArray(data.value)) data = data.value;
const map = new Map();
for (const u of data) {
  const c = u.code || null;
  if (!map.has(c)) map.set(c, []);
  map.get(c).push(u);
}
const dupes = Array.from(map.entries()).filter(([k,v]) => v.length > 1);
console.log('duplicate groups:', dupes.length);
for (let i=0;i<Math.min(10,dupes.length);i++) {
  const [code, rows] = dupes[i];
  console.log('---', code, 'count=', rows.length);
  rows.forEach(r => console.log('  unit_id=', r.unit_id, 'building_id=', r.building_id, 'project_id=', r.project_id));
}
