
const FETCH_URL = "https://robel-api.george-gamal139.workers.dev/api/units";

async function inspect() {
    try {
        const resp = await fetch(FETCH_URL);
        const units = await resp.json();
        const ids = new Set(units.map(u => u.unit_id));
        console.log(`Unique unit_ids count: ${ids.size}`);
        console.log(`Actual units count: ${units.length}`);

        const list = Array.from(ids);
        console.log(`Sample valid IDs: ${list.filter(id => id).slice(0, 5)}`);
        console.log(`Is null in IDs? ${ids.has(null)}`);
        console.log(`Is "null" in IDs? ${ids.has("null")}`);
        console.log(`Is undefined in IDs? ${ids.has(undefined)}`);
    } catch (e) { console.error(e); }
}
inspect();
