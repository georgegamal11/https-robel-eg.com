const fs = require('fs');
const content = fs.readFileSync('public/pages/home.js', 'utf8');
const linesArr = content.split('\n');
console.log('--- window.openProject Lines 810 to 825 ---');
for (let i = 809; i < 825; i++) {
    console.log((i+1) + ': ' + (linesArr[i] || ''));
}
