
const FETCH_URL = "https://robel-api.george-gamal139.workers.dev/api/units";

async function checkSpecs() {
    try {
        const resp = await fetch(FETCH_URL);
        if (!resp.ok) throw new Error("Failed to fetch units");
        const units = await resp.json();

        console.log(`Total Units Found: ${units.length}`);

        const results = {
            total: units.length,
            missing_specs: 0,
            missing_auto_specs: 0,
            missing_ids: [],
            projects: {}
        };

        units.forEach(u => {
            const pid = u.project_id || u.projectId || 'unknown';
            if (!results.projects[pid]) results.projects[pid] = { count: 0, missing_auto: 0 };
            results.projects[pid].count++;

            const hasSpecs = u.specifications && u.specifications !== 'NULL' && u.specifications !== '{}' && u.specifications !== 'null';
            const hasAuto = u.auto_specs && u.auto_specs !== 'NULL' && u.auto_specs !== '{}' && u.auto_specs !== 'null';

            if (!hasSpecs) results.missing_specs++;
            if (!hasAuto) {
                results.missing_auto_specs++;
                results.projects[pid].missing_auto++;
                results.missing_ids.push(u.unit_id || u.id);
            }
        });

        console.log(JSON.stringify(results, null, 2));

        console.log("\nSample Auto Specs:");
        const samples = units.filter(u => u.auto_specs).slice(0, 3);
        samples.forEach(s => console.log(`${s.unit_id}: ${s.auto_specs}`));
    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkSpecs();
