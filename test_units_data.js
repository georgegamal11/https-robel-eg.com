const fs = require('fs');
const inv = JSON.parse(fs.readFileSync('public/assets/data/inventory.json', 'utf8'));

function normalizeId(id) {
    if (!id) return id;
    if (typeof id === 'number') id = id.toString();
    id = id.toString().trim().toUpperCase();
    if (/^\d+$/.test(id)) return 'B' + id;
    return id;
}

const b133Units = inv.filter(u => normalizeId(u.building_id || u.project) === 'B133');
console.log('B133 units total:', b133Units.length);

const available = b133Units.filter(u => (u.status || 'Available').toLowerCase() === 'available');
console.log('B133 available units:', available.length);

if (b133Units.length > 0) {
    const u = b133Units[0];
    console.log('Sample unit data:', {
        code: u.code,
        delivery_status: u.delivery_status || u.deliveryStatus,
        status: u.status
    });
}
