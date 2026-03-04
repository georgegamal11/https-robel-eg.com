const fs = require('fs');
let content = fs.readFileSync('public/pages/home.js', 'utf8');

const targetPart = "let targetUrl = `units.html?project=${slug}`;";
const replacement = "let targetUrl = `units.html?project=${slug}`;" + `
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

// Find the whole block including the next few lines
const findBlock = "let targetUrl = `units.html?project=${slug}`;" + `
    if (meta && pName !== normArea) {
        targetUrl += \`&building=\${encodeURIComponent(pName)}\`;
    }`;

if (content.includes(findBlock)) {
    content = content.replace(findBlock, replacement);
    fs.writeFileSync('public/pages/home.js', content);
    console.log('? Successfully patched home.js with flexible match');
} else {
    console.log('? Still could not find target block');
}
