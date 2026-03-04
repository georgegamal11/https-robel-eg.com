const fs = require('fs');
const content = fs.readFileSync('public/pages/home.js', 'utf8');
const linesArray = content.split('\n');
let opened = 0;
let started = false;
for (let i = 6290; i < linesArray.length; i++) {
    const line = linesArray[i];
    if (line.includes('{')) { opened += (line.match(/{/g) || []).length; started = true; }
    if (line.includes('}')) { opened -= (line.match(/}/g) || []).length; }
    if (started && opened === 0) { console.log('Function ends at ' + (i+1)); break; }
}
