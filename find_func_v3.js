const fs = require('fs');
const content = fs.readFileSync('public/pages/home.js', 'utf8');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(' openProject ') || lines[i].startsWith('openProject ')) {
        console.log('Line ' + (i+1) + ': ' + lines[i]);
    }
}
