const fs = require('fs');
const content = fs.readFileSync('public/pages/home.js', 'utf8');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes('projectInventoryMap = new Map()')) {
        console.log('Line ' + (i+1) + ': ' + lines[i].trim());
        for(let j=1; j<10; j++) {
            console.log((i+1+j) + ': ' + (lines[i+j] || '').trim());
        }
        break;
    }
}
