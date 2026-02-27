
const FETCH_URL = "https://robel-api.george-gamal139.workers.dev/api/units";

async function verify() {
    try {
        const resp = await fetch(FETCH_URL);
        const units = await resp.json();
        const golf = units.filter(u => (u.project_id || '').includes('golf'));
        console.log(`Porto Golf Units: ${golf.length}`);

        const areas = [30, 60, 82, 90];
        areas.forEach(a => {
            const u = golf.find(unit => Math.round(unit.area) === a);
            if (u) {
                console.log(`\nArea ${a}m² Example:`);
                console.log(`Specs: ${u.auto_specs}`);
            } else {
                console.log(`\nArea ${a}m² not found in current inventory.`);
            }
        });

    } catch (e) { console.error(e); }
}
verify();
