const fs = require('fs');
const content = fs.readFileSync('public/pages/home.js', 'utf8');
const part = content.substring(content.indexOf('function refreshFilterOptions'), content.indexOf('initMultiSelect'));
if (part.includes('triggerSearch')) {
    console.log('YES: refreshFilterOptions contains triggerSearch');
} else {
    console.log('NO: refreshFilterOptions does NOT contain triggerSearch');
}
