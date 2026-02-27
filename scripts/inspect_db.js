
const FETCH_URL = "https://robel-api.george-gamal139.workers.dev/api/units";

async function inspect() {
    try {
        const resp = await fetch(FETCH_URL);
        const units = await resp.json();
        console.log(`Total: ${units.length}`);

        const idCounts = {};
        units.forEach(u => {
            const id = u.unit_id || u.id;
            idCounts[id] = (idCounts[id] || 0) + 1;
        });

        const duplicates = Object.entries(idCounts).filter(([id, count]) => count > 1);
        console.log(`Duplicates: ${duplicates.length}`);
        if (duplicates.length > 0) console.log(duplicates.slice(0, 5));

        const broken = units.filter(u => !u.project_id && !u.projectId);
        console.log(`Broken (no project): ${broken.length}`);
        if (broken.length > 0) console.log(`Sample broken ID: ${broken[0].unit_id || broken[0].id}`);

        const good = units.filter(u => u.project_id || u.projectId);
        console.log(`Good (with project): ${good.length}`);

    } catch (e) {
        console.error(e);
    }
}
inspect();
