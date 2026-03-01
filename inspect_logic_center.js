const fs = require('fs');
const content = fs.readFileSync('public/pages/home.js', 'utf8');
const linesArray = content.split('\n');
console.log('--- Lines 800 to 825 ---');
for (let i = 799; i < 825; i++) {
    console.log((i+1) + ': ' + (linesArray[i] || ''));
}
