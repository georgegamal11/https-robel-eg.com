const fs = require('fs');
const content = fs.readFileSync('public/pages/home.js', 'utf8');
const linesArr = content.split('\n');
console.log('Total lines:', linesArr.length);
