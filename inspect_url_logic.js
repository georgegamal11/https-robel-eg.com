const fs = require('fs');
const content = fs.readFileSync('public/pages/home.js', 'utf8');
const linesArray = content.split('\n');
console.log('--- Lines 825 to 845 ---');
for (let i = 824; i < 845; i++) {
    console.log((i+1) + ': ' + (linesArray[i] || ''));
}
