
const FETCH_URL = "https://robel-api.george-gamal139.workers.dev/api/units";
const AUTH_KEY = "ROBEL_SECURE_SYNC_2025";
const fs = require('fs');

async function backup() {
    try {
        const resp = await fetch(FETCH_URL);
        const units = await resp.json();
        const good = units.filter(u => u.unit_id && u.unit_id !== 'null');
        console.log(`Backing up ${good.length} units...`);
        fs.writeFileSync('units_backup.json', JSON.stringify(good, null, 2));
        console.log("Done.");
    } catch (e) { console.error(e); }
}
backup();
