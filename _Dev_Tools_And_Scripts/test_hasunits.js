const fs = require('fs');
const currentRentBuy = 'buy';
const currentStatus = 'all';
const inventory = JSON.parse(fs.readFileSync('public/assets/data/inventory.json', 'utf8'));

const bId = 'b133';
const cleanId = '133';

let hasUnits = inventory.some(u => {
    const searchFields = [u.project, u.projectName, u.projectId, u.buildingId, u.building_id, u.building];
    const isMatch = searchFields.some(f => f && (f.toString().toLowerCase() === bId || f.toString().toLowerCase() === cleanId));
    if (!isMatch) return false;
    
    if (currentRentBuy) {
        const rawI = (u.intent || 'buy').toLowerCase();
        const i = (rawI === 'sale' || rawI === 'primary' || rawI === 'resale') ? 'buy' : rawI;
        const filter = (currentRentBuy.toLowerCase() === 'sale' || currentRentBuy.toLowerCase() === 'primary') ? 'buy' : currentRentBuy.toLowerCase();
        if (i !== filter) return false;
    }
    
    if (currentStatus !== 'all') {
        const isReady = (u.project && (u.project.includes('121') || u.project === '224')) || (u.status && u.status.toLowerCase() === 'ready');
        if (currentStatus === 'ready' && !isReady) return false;
        if (currentStatus === 'u-const' && isReady) return false;
    }
    return true;
});

console.log('hasUnits for B133:', hasUnits);
