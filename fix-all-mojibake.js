const fs = require('fs');

const cp1252_to_byte = {
    '\u20AC': 0x80, '\u0081': 0x81, '\u201A': 0x82, '\u0192': 0x83, '\u201E': 0x84,
    '\u2026': 0x85, '\u2020': 0x86, '\u2021': 0x87, '\u02C6': 0x88, '\u2030': 0x89,
    '\u0160': 0x8A, '\u2039': 0x8B, '\u0152': 0x8C, '\u008D': 0x8D, '\u017D': 0x8E,
    '\u008F': 0x8F, '\u0090': 0x90, '\u2018': 0x91, '\u2019': 0x92, '\u201C': 0x93,
    '\u201D': 0x94, '\u2022': 0x95, '\u2013': 0x96, '\u2014': 0x97, '\u02DC': 0x98,
    '\u2122': 0x99, '\u0161': 0x9A, '\u203A': 0x9B, '\u0153': 0x9C, '\u009D': 0x9D,
    '\u017E': 0x9E, '\u0178': 0x9F
};
// for 0xA0 to 0xBF, CP1252 is same as Unicode code point
for(let i = 0xA0; i <= 0xBF; i++) {
    cp1252_to_byte[String.fromCharCode(i)] = i;
}

function fixMojibake(content) {
    // We match Ø or Ù followed by one of the target characters.
    // Ø is \u00D8, Ù is \u00D9
    let regex = /[\u00D8\u00D9][\u20AC\u0081\u201A\u0192\u201E\u2026\u2020\u2021\u02C6\u2030\u0160\u2039\u0152\u008D\u017D\u008F\u0090\u2018\u2019\u201C\u201D\u2022\u2013\u2014\u02DC\u2122\u0161\u203A\u0153\u009D\u017E\u0178\u00A0-\u00BF]/g;
    
    return content.replace(regex, (match) => {
        let b1 = match.charCodeAt(0); // 0xD8 or 0xD9
        let c2 = match.charAt(1);
        let b2 = cp1252_to_byte[c2];
        let buf = Buffer.from([b1, b2]);
        return buf.toString('utf8');
    });
}

function walkDir(dir) {
    const files = fs.readdirSync(dir);
    for (let file of files) {
        const fullPath = dir + '/' + file;
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            walkDir(fullPath);
        } else {
            if (fullPath.endsWith('.html') || fullPath.endsWith('.js') || fullPath.endsWith('.json')) {
                let original = fs.readFileSync(fullPath, 'utf8');
                let fixed = original;
                // Run multiple times in case of nested/consecutive sequences
                let lastFixed = "";
                while(fixed !== lastFixed) {
                    lastFixed = fixed;
                    fixed = fixMojibake(fixed);
                }
                
                if (fixed !== original) {
                    fs.writeFileSync(fullPath, fixed, 'utf8');
                    console.log('Fixed mojibake in', fullPath);
                }
            }
        }
    }
}

walkDir('public');
