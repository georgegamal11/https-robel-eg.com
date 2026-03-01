const fs = require('fs');
const content = fs.readFileSync('public/pages/home.js', 'utf8');
const linesArr = content.split('\n');
let brackets = 0;
let started = false;
for (let i = 779; i < linesArr.length; i++) {
    const line = linesArr[i];
    if (line.includes('{')) {
        brackets += (line.match(/{/g) || []).length;
        started = true;
    }
    if (line.includes('}')) {
        brackets -= (line.match(/}/g) || []).length;
    }
    if (started && brackets === 0) {
        console.log('Function window.openProject ends at line ' + (i+1));
        break;
    }
}
