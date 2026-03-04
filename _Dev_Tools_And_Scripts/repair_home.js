const fs = require('fs');
let content = fs.readFileSync('public/pages/home.js', 'utf8');

// 1. Fix the Map population
const mapTarget = "    const projectInventoryMap = new Map();\r\n    inventory.forEach(u => {\r\n        // Index by pre-normalized building ID and project ID/Name\r\n        const keys = new Set();\r\n        if (u.buildingId) keys.add(u.buildingId);\r\n        if (u.projectId) keys.add(u.projectId);\r\n        if (u.project) keys.add(normalizeId(u.project));";

const mapReplacement = "    const projectInventoryMap = new Map();\r\n    inventory.forEach(u => {\r\n        // Index by pre-normalized building ID and project ID/Name\r\n        const keys = new Set();\r\n        if (u.buildingId) keys.add(normalizeId(u.buildingId));\r\n        if (u.building_id) keys.add(normalizeId(u.building_id));\r\n        if (u.projectId) keys.add(normalizeId(u.projectId));\r\n        if (u.project_id) keys.add(normalizeId(u.project_id));\r\n        if (u.project) keys.add(normalizeId(u.project));";

if (content.includes(mapTarget)) {
    content = content.replace(mapTarget, mapReplacement);
} else {
    // Try with LF if CRLF failed
    const mapTargetLF = mapTarget.replace(/\r/g, '');
    const mapReplacementLF = mapReplacement.replace(/\r/g, '');
    if (content.includes(mapTargetLF)) {
        content = content.replace(mapTargetLF, mapReplacementLF);
    } else {
        console.log('? Could not find mapTarget');
    }
}

// 2. Fix the missing parts caused by previous bad edit (if any)
// Check if updateSectionTitle(filters) is missing
if (!content.includes('updateSectionTitle(filters);') && content.includes('window.updateGlobalUnitStats();')) {
    content = content.replace('window.updateGlobalUnitStats();', 'window.updateGlobalUnitStats();\n    updateSectionTitle(filters);\n    const container = document.querySelector(\'.projects-grid\');\n    if (!container) return;');
}

fs.writeFileSync('public/pages/home.js', content);
console.log('? home.js repair and update complete');
