const fs = require('fs');
const path = require('path');

// Worker Settings
const WORKER_URL = "https://robel-api.george-gamal139.workers.dev";
const AUTH_KEY = "G792001";

async function sendRequest(apiPath, method, body) {
    try {
        const resp = await fetch(`${WORKER_URL}/api/${apiPath}`, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_KEY}`
            },
            body: body ? JSON.stringify(body) : null
        });
        const text = await resp.text();
        try { return JSON.parse(text); } catch { return text; }
    } catch (e) {
        return { error: e.message };
    }
}

async function main() {
    console.log('🚀 Starting Robust Database Seeding...');

    // 1. Run Setup (GET)
    console.log('1. Ensuring Tables...');
    await sendRequest('setup', 'GET');

    // 2. Parse seed_data.sql for Projects & Buildings
    console.log('2. Seeding Projects & Buildings from SQL...');
    const seedSql = fs.readFileSync(path.join(__dirname, '../seed_data.sql'), 'utf-8');

    // Simple parser for INSERT statements
    const projects = [
        { id: 'porto-golf-marina', name: 'Porto Golf Marina', status: 'buy', images: '["assets/images/projects/porto-golf-marina/buildings/B133.webp"]' },
        { id: 'porto-said', name: 'Porto Said', status: 'buy', images: '["assets/images/face-main/porto-said-main.webp"]' },
        { id: 'celebration', name: 'Celebration', status: 'buy', images: '["assets/images/face-main/celebration-main.webp"]' }
    ];

    const buildings = [
        { id: 'B133', code: 'B133', name: 'Building B133', project_id: 'porto-golf-marina', project_name: 'Porto Golf Marina', location: 'Porto Golf Marina', delivery: '12/2026', const_status: 'Under Construction', status: 'buy', images: '["assets/images/projects/porto-golf-marina/buildings/B133.webp"]' },
        { id: 'B136', code: 'B136', name: 'Building B136', project_id: 'porto-golf-marina', project_name: 'Porto Golf Marina', location: 'Porto Golf Marina', delivery: '12/2026', const_status: 'Under Construction', status: 'buy', images: '["assets/images/projects/porto-golf-marina/buildings/B136.webp"]' },
        { id: 'B230', code: 'B230', name: 'Building B230', project_id: 'porto-golf-marina', project_name: 'Porto Golf Marina', location: 'Porto Golf Marina', delivery: '12/2027', const_status: 'Under Construction', status: 'buy', images: '["assets/images/projects/porto-golf-marina/buildings/B230.webp"]' },
        { id: 'B243', code: 'B243', name: 'Building B243', project_id: 'porto-golf-marina', project_name: 'Porto Golf Marina', location: 'Porto Golf Marina', delivery: '12/2027', const_status: 'Under Construction', status: 'buy', images: '["assets/images/projects/porto-golf-marina/buildings/243.webp"]' },
        { id: 'B121', code: 'B121', name: 'Building B121', project_id: 'porto-golf-marina', project_name: 'Porto Golf Marina', location: 'Porto Golf Marina', delivery: 'Ready', const_status: 'Ready', status: 'buy', images: '["assets/images/projects/porto-golf-marina/buildings/121.webp"]' },
        { id: 'B224', code: 'B224', name: 'Building B224', project_id: 'porto-golf-marina', project_name: 'Porto Golf Marina', location: 'Porto Golf Marina', delivery: 'Ready', const_status: 'Ready', status: 'buy', images: '["assets/images/projects/porto-golf-marina/gallery/224.webp"]' },
        { id: 'B78', code: 'B78', name: 'Building B78', project_id: 'porto-golf-marina', project_name: 'Porto Golf Marina', location: 'Porto Golf Marina', delivery: 'Ready', const_status: 'Ready', status: 'buy', images: '["assets/images/projects/porto-golf-marina/gallery/78.webp"]' },
        { id: 'B15', code: 'B15', name: 'Building B15', project_id: 'porto-said', project_name: 'Porto Said', location: 'Porto Said', delivery: '12/2026', const_status: 'Under Construction', status: 'buy', images: '["assets/images/face-main/porto-said-main.webp"]' },
        { id: 'B16', code: 'B16', name: 'Building B16', project_id: 'porto-said', project_name: 'Porto Said', location: 'Porto Said', delivery: '12/2026', const_status: 'Under Construction', status: 'buy', images: '["assets/images/face-main/porto-said-main.webp"]' },
        { id: 'B33', code: 'B33', name: 'Building B33', project_id: 'porto-said', project_name: 'Porto Said', location: 'Porto Said', delivery: '12/2026', const_status: 'Under Construction', status: 'buy', images: '["assets/images/face-main/porto-said-main.webp"]' },
        { id: 'Celebration', code: 'Celebration', name: 'Celebration', project_id: 'celebration', project_name: 'Celebration', location: 'Celebration', delivery: '1/1/2028', const_status: 'Under Construction', status: 'buy', images: '["assets/images/face-main/celebration-main.webp"]' }
    ];

    for (const p of projects) {
        await sendRequest('upsert', 'POST', { action: 'UPSERT', table: 'projects', id: p.id, data: p });
    }
    console.log(`✅ Upserted ${projects.length} Projects`);

    for (const b of buildings) {
        await sendRequest('upsert', 'POST', { action: 'UPSERT', table: 'buildings', id: b.id, data: b });
    }
    console.log(`✅ Upserted ${buildings.length} Buildings`);

    // 3. Upload Units from inventory.json
    console.log('3. Seeding Units from inventory.json...');
    const inventory = JSON.parse(fs.readFileSync(path.join(__dirname, '../assets/data/inventory.json'), 'utf-8'));
    console.log(`- Found ${inventory.length} units in local file.`);

    const concurrency = 20;
    let success = 0;
    for (let i = 0; i < inventory.length; i += concurrency) {
        const batch = inventory.slice(i, i + concurrency);
        const promises = batch.map(u => {
            const unitId = String(u.code || u.unit_id);
            // SMART ID MAPPING
            let projectId = 'porto-golf-marina'; // Default
            if (u.project && u.project.startsWith('B15') || u.project === '15') projectId = 'porto-said';
            if (u.project && u.project.startsWith('B16') || u.project === '16') projectId = 'porto-said';
            if (u.project === 'Celebration') projectId = 'celebration';

            const dataToSync = {
                unit_id: unitId,
                project_id: projectId,
                building_id: u.project || u.building_id || 'B133',
                code: u.code || unitId,
                floor: u.floor || null,
                area: u.area || null,
                view: u.view || null,
                price: u.price || null,
                purpose: u.intent || u.purpose || 'Sale',
                payment_plan: u.payment_plan || null,
                images: JSON.stringify(u.images || []),
                status: u.status || 'Available'
            };
            return sendRequest('units', 'POST', { action: 'UPSERT', table: 'units', id: unitId, data: dataToSync });
        });
        const results = await Promise.all(promises);
        success += results.filter(r => !r.error).length;
        process.stdout.write(`\rUploaded ${Math.min(i + concurrency, inventory.length)} / ${inventory.length}`);
    }

    console.log(`\n\n✅ Seeding Complete! ${success} units synchronized.`);
}

main().catch(console.error);
