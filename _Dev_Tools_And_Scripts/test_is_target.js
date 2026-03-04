const fs = require('fs');
const inventory = JSON.parse(fs.readFileSync('public/assets/data/inventory.json', 'utf8'));
function isUnitInTarget(u, targetProj) {
    if (!u || !targetProj) return false;
    const t = targetProj.toString().toLowerCase();
    const cleanT = t.replace(/^b/i, '');
    const fields = [u.project, u.projectName, u.projectId, u.buildingId, u.building_id, u.building];
    return fields.some(f => f && (f.toString().toLowerCase() === t || f.toString().toLowerCase() === cleanT));
}
console.log('B133:', inventory.some(u => isUnitInTarget(u, 'B133')));
console.log('B136:', inventory.some(u => isUnitInTarget(u, 'B136')));
console.log('B230:', inventory.some(u => isUnitInTarget(u, 'B230')));
console.log('B243:', inventory.some(u => isUnitInTarget(u, 'B243')));
