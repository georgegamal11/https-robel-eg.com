const fs = require('fs');
const content = fs.readFileSync('public/pages/home.js', 'utf8');
const lines = content.split('\n');
for (let i = 0; i < lines.length; i++) {
   if (lines[i].includes('getElementById') && (lines[i].includes('search') || lines[i].includes('btn'))) {
       console.log('Line ' + (i+1) + ': ' + lines[i].trim());
   }
}
