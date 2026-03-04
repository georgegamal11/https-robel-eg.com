const fs = require('fs');

try {
    let raw = fs.readFileSync('tmp_units.json', 'utf8');

    if (raw.charCodeAt(0) === 0xFEFF) {
        raw = raw.slice(1);
    }

    const data = JSON.parse(raw);

    if (data.value && Array.isArray(data.value)) {
        console.log(`Found ${data.value.length} units in tmp_units.json`);
        console.log('\\nFirst unit sample:');
        console.log(JSON.stringify(data.value[0], null, 2));
    } else if (Array.isArray(data)) {
        console.log(`Found ${data.length} units in tmp_units.json`);
        console.log('\\nFirst unit sample:');
        console.log(JSON.stringify(data[0], null, 2));
    } else {
        console.log('Data structure:', Object.keys(data));
    }
} catch (e) {
    console.error('Error:', e.message);
}
