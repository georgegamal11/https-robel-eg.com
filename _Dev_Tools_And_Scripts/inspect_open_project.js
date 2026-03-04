const fs = require('fs');
const content = fs.readFileSync('public/pages/home.js', 'utf8');
const linesArray = content.split('\n');
console.log('--- window.openProject Lines 780 to 850 ---');
for (let i = 779; i < 850; i++) {
    console.log((i+1) + ': ' + linesArray[i]);
}
