const fs = require('fs');
let content = fs.readFileSync('public/pages/home.js', 'utf8');

const targetPart = "targetUrl += `&building=${encodeURIComponent(pName)}`;";
const injectPart = "\n\n    // ?? PERSIST CURRENT FILTERS TO UNITS PAGE\n    if (typeof filters !== 'undefined') {\n        if (filters.areas && filters.areas.length > 0) {\n            targetUrl += `&area=${encodeURIComponent(filters.areas.join(','))}`;\n        }\n        if (filters.delivery && filters.delivery.length > 0) {\n            targetUrl += `&delivery=${encodeURIComponent(filters.delivery.join(','))}`;\n        }\n    }";

if (content.indexOf(targetPart) !== -1) {
    // Inject AFTER the closing brace of the if(meta && pName !== normArea) Block
    const marker = "targetUrl += `&building=${encodeURIComponent(pName)}`;\r\n    }";
    if (content.indexOf(marker) !== -1) {
        content = content.replace(marker, marker + injectPart);
        fs.writeFileSync('public/pages/home.js', content);
        console.log('? Successfully patched home.js with CRLF marker');
    } else {
         content = content.replace(targetPart, targetPart + injectPart);
         fs.writeFileSync('public/pages/home.js', content);
         console.log('? Patched home.js using direct target (partially inside block or after)');
    }
} else {
    console.log('? Still could not find targetPart');
}
