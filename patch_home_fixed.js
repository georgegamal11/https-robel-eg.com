const fs = require('fs');
let content = fs.readFileSync('public/pages/home.js', 'utf8');

const target = `    // Generic fallback to Units Page
    // Pass both area as project (for scope) and pName as building
    const slug = getProjectSlug(normArea);
    let targetUrl = \`units.html?project=\${slug}\`;
    if (meta && pName !== normArea) {
        targetUrl += \`&building=\${encodeURIComponent(pName)}\`;
    }`;

const replacement = `    // Generic fallback to Units Page
    // Pass both area as project (for scope) and pName as building
    const slug = getProjectSlug(normArea);
    let targetUrl = \`units.html?project=\${slug}\`;
    if (meta && pName !== normArea) {
        targetUrl += \`&building=\${encodeURIComponent(pName)}\`;
    }

    // ?? PERSIST CURRENT FILTERS TO UNITS PAGE
    if (typeof filters !== 'undefined') {
        if (filters.areas && filters.areas.length > 0) {
            targetUrl += \`&area=\${encodeURIComponent(filters.areas.join(','))}\`;
        }
        if (filters.delivery && filters.delivery.length > 0) {
            targetUrl += \`&delivery=\${encodeURIComponent(filters.delivery.join(','))}\`;
        }
    }`;

if (content.includes(target)) {
    content = content.replace(target, replacement);
    fs.writeFileSync('public/pages/home.js', content);
    console.log('? Successfully patched home.js');
} else {
    console.log('? Could not find target block in home.js');
}
