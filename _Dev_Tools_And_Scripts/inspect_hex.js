const fs = require('fs');
let content = fs.readFileSync('public/pages/home.js', 'utf8');
const linesArr = content.split('\n');
console.log('--- Line 820 to 825 with hex codes ---');
for (let i = 819; i < 825; i++) {
    const line = linesArr[i] || '';
    const hex = Buffer.from(line).toString('hex');
    console.log((i+1) + ': ' + line + ' [' + hex + ']');
}
