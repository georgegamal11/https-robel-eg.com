/**
 * 🚀 CACHE BUSTER - Run before every deploy!
 * Usage: node scripts/cache-bust.js
 * Updates all ?v=XXXX version strings in HTML files
 */
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const OLD_VERSION = '20260228032718';
const NEW_VERSION = new Date().toISOString().replace(/[-T:.Z]/g, '').substring(0, 14);

console.log('🚀 Cache Buster');
console.log('━'.repeat(40));
console.log(`Old version: ${OLD_VERSION}`);
console.log(`New version: ${NEW_VERSION}`);
console.log('━'.repeat(40));

let totalFiles = 0;
let totalReplacements = 0;

const VERSION_REGEX = /\?v=\d{14}/g;

function processDir(dir) {
    const entries = fs.readdirSync(dir);
    for (const entry of entries) {
        const fullPath = path.join(dir, entry);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            if (entry === 'node_modules' || entry === '.git') continue;
            processDir(fullPath);
        } else if (entry.endsWith('.html')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            if (VERSION_REGEX.test(content)) {
                content = content.replace(VERSION_REGEX, `?v=${NEW_VERSION}`);
                fs.writeFileSync(fullPath, content);
                totalFiles++;
                console.log(`✅ ${path.relative(PUBLIC_DIR, fullPath)} → Updated version to ${NEW_VERSION}`);
            }
        }
    }
}

processDir(PUBLIC_DIR);

console.log('━'.repeat(40));
console.log(`✅ Done! Updated version in ${totalFiles} files.`);
console.log(`New cache version: ${NEW_VERSION}`);

// Also update the purge version in home.js
const homeJsPath = path.join(PUBLIC_DIR, 'pages', 'home.js');
if (fs.existsSync(homeJsPath)) {
    let homeJs = fs.readFileSync(homeJsPath, 'utf8');
    const purgeMatch = homeJs.match(/PURGE_VERSION\s*=\s*"([^"]+)"/);
    if (purgeMatch) {
        const oldPurge = purgeMatch[1];
        const newPurge = `v${NEW_VERSION}_deploy`;
        homeJs = homeJs.replace(`"${oldPurge}"`, `"${newPurge}"`);
        fs.writeFileSync(homeJsPath, homeJs);
        console.log(`✅ home.js PURGE_VERSION: "${oldPurge}" → "${newPurge}"`);
    }
}
