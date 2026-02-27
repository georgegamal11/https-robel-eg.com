
const fs = require('fs');
const units = JSON.parse(fs.readFileSync('b133.json'));
let inventory = units.map(item => ({
    id: item.unit_id || item.building_id || item.project_id || item.id,
    buildingId: normalizeId(item.building_id || item.buildingId || item.building),
    projectId: (item.project_id || item.projectId || item.project || '').toString().toLowerCase().trim(),
    project: (item.project_id || item.projectId || item.project || '').toString().toLowerCase().trim(),
    code: item.code || item.unit_id,
    floor: item.floor,
    area: parseFloat(item.area) || 0,
    view: item.view,
    price: parseFloat(item.price) || 0,
    status: (item.status || 'Available'),
    deliveryStatus: item.delivery_status || item.deliveryStatus
}));

function normalizeId(id) {
    if (id === null || id === undefined) return '';
    let clean = id.toString().trim().toUpperCase();
    if (/^\d+$/.test(clean)) return 'B' + clean;
    if (clean.startsWith('B')) return clean;
    return clean;
}

function isUnitInTarget(u, target) {
    if (!u || !target) return false;
    const targets = Array.isArray(target) ? target.map(t => t.toString().toLowerCase()) : [target.toString().toLowerCase()];
    const searchFields = [
        u.project, u.projectName, u.projectId, u.project_id,
        u.buildingCode, u.buildingId, u.building_id, u.building, u.Building
    ];
    return searchFields.some(f => {
        if (!f) return false;
        const str = normalizeId(f);
        return targets.some(t => {
            const normT = normalizeId(t);
            return str === normT || str.replace(/^B/i, '') === normT.replace(/^B/i, '');
        });
    });
}

// simulate cleanUnits
const ghosts = ['B16', 'B17'];
const cleanUnits = inventory.filter(u => {
    const bId = normalizeId(u.building_id || u.buildingId || u.project);
    return !['B16', 'B17'].includes(bId);
});
inventory = cleanUnits;
// Simulate Data Sanitization
inventory = inventory.filter(u => {
    const hasCode = u.code && u.code !== 'NULL' && u.code !== 'undefined';
    const hasPrice = u.price && u.price > 0;
    const hasArea = u.area && u.area > 0;
    return hasCode && (hasPrice || hasArea);
});

console.log('Total inventory length after sanitization:', inventory.length);
let pName = 'B133';
let count = inventory.filter(u => {
    if (u.status && u.status.toLowerCase() !== 'available') return false;
    return isUnitInTarget(u, pName);
}).length;
console.log('Count for B133:', count);
