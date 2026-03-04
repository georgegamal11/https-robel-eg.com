const fs = require('fs');
const path = require('path');
const p = path.join(__dirname, '..', 'tmp_units.json');
if (!fs.existsSync(p)) { console.error('tmp_units.json not found'); process.exit(2); }
let raw = fs.readFileSync(p);
let data;
try {
  // try utf8 first
  let s = raw.toString('utf8').replace(/^\uFEFF/, '');
  data = JSON.parse(s);
} catch (e) {
  // fallback to utf16le (PowerShell default encoding)
  let s = raw.toString('utf16le').replace(/^\uFEFF/, '');
  data = JSON.parse(s);
}
if (data && data.value && Array.isArray(data.value)) data = data.value;
const total = Array.isArray(data) ? data.length : 0;
const nullUnitId = Array.isArray(data) ? data.filter(u => !u.unit_id).length : 0;
const distinctCodes = new Set(data.map(u => u.code)).size;
const map = new Map();
for (const u of data) {
  const c = u.code || null;
  if (!map.has(c)) map.set(c, 0);
  map.set(c, map.get(c) + 1);
}
const dupes = Array.from(map.entries()).filter(([k,v]) => v > 1).map(([k,v]) => ({ code: k, count: v }));
dupes.sort((a,b)=>b.count-a.count);
const top = dupes.slice(0,10);
console.log(JSON.stringify({ total, nullUnitId, distinctCodes, duplicate_groups: dupes.length, top_duplicates: top }, null, 2));
