const fs = require('fs');
let content = fs.readFileSync('public/pages/home.js', 'utf8');

const target =     // Generic fallback to Units Page
    // Pass both area as project (for scope) and pName as building
    const slug = getProjectSlug(normArea);
    let targetUrl = \units.html?project=\\;
    if (meta && pName !== normArea) {
        targetUrl += \&building=\\;
    };

const replacement =     // Generic fallback to Units Page
    // Pass both area as project (for scope) and pName as building
    const slug = getProjectSlug(normArea);
    let targetUrl = \units.html?project=\\;
    if (meta && pName !== normArea) {
        targetUrl += \&building=\\;
    }

    // ?? PERSIST CURRENT FILTERS TO UNITS PAGE
    if (typeof filters !== 'undefined') {
        if (filters.areas && filters.areas.length > 0) {
            targetUrl += \&area=\\;
        }
        if (filters.delivery && filters.delivery.length > 0) {
            targetUrl += \&delivery=\\;
        }
    };

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('public/pages/home.js', content);
    console.log('? Successfully patched home.js');
} else {
    console.log('? Could not find target block in home.js');
    console.log('Sample of what I saw around line 818:');
    const lines = content.split('\\n');
    for (let i = 815; i < 835; i++) {
        console.log((i+1) + ': ' + (lines[i] || ''));
    }
}
