const fs = require('fs');
const path = require('path');
const fetch = global.fetch || require('node-fetch');

const WORKER_URL = 'https://robel-api.george-gamal139.workers.dev';
const AUTH_KEY = 'ROBEL_SECURE_SYNC_2025';

const projectsPath = path.join(__dirname, '..', 'assets', 'data', 'projects.json');

if (!fs.existsSync(projectsPath)) {
    console.error("projects.json not found at", projectsPath);
    process.exit(1);
}

const projectsData = JSON.parse(fs.readFileSync(projectsPath, 'utf8'));

async function upsertBuilding(id, data) {
    // Map JSON structure to D1 'buildings' table columns
    const payload = {
        id: id,
        code: id,
        project_name: data.projectArea,
        location: data.projectArea,
        delivery: data.delivery,
        const_status: data.constStatus,
        status: data.status,
        images: JSON.stringify(data.image || [])
    };

    // Determine project_id based on area
    // This allows better filtering in the future
    if (data.projectArea && data.projectArea.includes('Golf')) payload.project_id = 'porto-golf-marina';
    else if (data.projectArea && data.projectArea.includes('Said')) payload.project_id = 'porto-said';
    else if (data.projectArea && data.projectArea.includes('Celebration')) payload.project_id = 'celebration';
    else payload.project_id = 'other';

    try {
        const res = await fetch(`${WORKER_URL}/api`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_KEY}` },
            body: JSON.stringify({ action: 'UPSERT', table: 'buildings', id, data: payload })
        });
        if (!res.ok) console.error(`Failed ${id}:`, await res.text());
        else console.log(`Synced ${id}`);
    } catch (e) {
        console.error(`Error ${id}:`, e.message);
    }
}

(async () => {
    console.log("Syncing buildings metadata from projects.json to Cloudflare D1...");
    const entries = Object.entries(projectsData);
    for (const [key, value] of entries) {
        await upsertBuilding(key, value);
    }
    console.log(`Done syncing ${entries.length} buildings.`);
})();
