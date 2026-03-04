const fs = require('fs');
const inv = JSON.parse(fs.readFileSync('public/assets/data/inventory.json', 'utf8'));

const codes = inv.map(u => u.code);
const count133 = codes.filter(c => c.startsWith('133')).length;
const count136 = codes.filter(c => c.startsWith('136')).length;
const count230 = codes.filter(c => c.startsWith('230')).length;
const count243 = codes.filter(c => c.startsWith('243')).length;

console.log('133 units:', count133);
console.log('136 units:', count136);
console.log('230 units:', count230);
console.log('243 units:', count243);

const b133 = inv.filter(u => u.code.startsWith('133'));
console.log('B133 projects found in data:', [...new Set(b133.map(u => u.project))]);
