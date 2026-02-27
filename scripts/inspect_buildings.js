
const FETCH_URL = "https://robel-api.george-gamal139.workers.dev/api/buildings";

async function inspect() {
    try {
        const resp = await fetch(FETCH_URL);
        const buildings = await resp.json();
        console.log(`Total Buildings: ${buildings.length}`);

        buildings.forEach(b => {
            console.log(`Building: ${b.code || b.id || b.building_id}, Area: ${b.project_area || b.projectArea}, Image: ${b.image ? 'YES' : 'NO'}`);
            if (b.image) console.log(`  -> ${b.image}`);
        });

    } catch (e) {
        console.error(e);
    }
}
inspect();
