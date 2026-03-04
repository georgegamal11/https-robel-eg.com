const fs = require('fs');
const inv = JSON.parse(fs.readFileSync('public/assets/data/inventory.json', 'utf8'));

const b133 = inv.filter(u => u.code.startsWith('133')).map(u => ({code: u.code, area: u.area}));
console.log('B133 units & areas:', JSON.stringify(b133));

const b230 = inv.filter(u => u.code.startsWith('230')).map(u => ({code: u.code, area: u.area}));
console.log('B230 units count:', b230.length);
console.log('B230 sample areas:', [...new Set(b230.map(u => u.area))]);

const b243 = inv.filter(u => u.code.startsWith('243')).map(u => ({code: u.code, area: u.area}));
console.log('B243 units count:', b243.length);
console.log('B243 sample areas:', [...new Set(b243.map(u => u.area))]);
