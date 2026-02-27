
const FETCH_URL = "https://robel-api.george-gamal139.workers.dev/api/units";

async function dump() {
    try {
        const resp = await fetch(FETCH_URL);
        const units = await resp.json();
        console.log("Keys of first unit:", Object.keys(units[0]));
        console.log("First unit data:", JSON.stringify(units[0], null, 2));

        const broken = units.find(u => !u.project_id);
        if (broken) {
            console.log("\nBroken unit keys:", Object.keys(broken));
            console.log("Broken unit data:", JSON.stringify(broken, null, 2));
        }
    } catch (e) { console.error(e); }
}
dump();
