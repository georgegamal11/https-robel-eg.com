const fs = require('fs');
const content = fs.readFileSync('public/pages/home.js', 'utf8');

const match = content.match(/const projectMetadata = {([\s\S]*?)};/);
if (!match) { console.log('not found'); process.exit(1); }
const metaString = '{' + match[1] + '}';
let meta = {};
try {
    eval('meta = ' + metaString);
} catch(e) { console.error('eval error', e); }

const currentStatus = 'all';
const effectiveActiveProject = 'Porto Golf Marina'; // Normalizes to "Porto Golf Marina"
const selectedProjectArea = [];
const selectedDelivery = [];
const selectedAreas = [];
const inventory = JSON.parse(fs.readFileSync('public/assets/data/inventory.json', 'utf8'));

const projectNames = ["B133", "B136", "B230", "B243", "B121", "B224", "B78", "B15", "B16", "B17", "B33", "B9", "B10", "SHOPS", "Celebration"];

let res = projectNames.filter(p => {
    const m = meta[p];
    if (!m) return false;
    
    // ... skipping mode check since it's just 'properties' mode
    if (m.category === 'projects') return false; 
    
    // checks
    const pArea = m.projectArea;
    if (pArea !== 'Porto Golf Marina') return false;
    
    const bId = p.toLowerCase().replace(/^b/i, '');
    const golfSpecifics = ["121", "224", "78", "133", "136", "230", "243"];
    if (!golfSpecifics.includes(bId)) return false;
    
    return true;
});

console.log('matching buildings:', res);
