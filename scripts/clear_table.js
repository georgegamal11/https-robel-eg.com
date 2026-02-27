
const FETCH_URL = "https://robel-api.george-gamal139.workers.dev/api/units";
const AUTH_KEY = "ROBEL_SECURE_SYNC_2025";

async function clearTable() {
    try {
        const resp = await fetch(FETCH_URL);
        const units = await resp.json();
        console.log(`Units in DB: ${units.length}. Clearing...`);

        // We can't easily bulk delete if worker doesn't support it, 
        // but we can try to delete by ID one by one if necessary.
        // However, let's try a clever DELETE action if supported.

        for (const u of units) {
            const id = u.unit_id || u.id;
            // Even if id is null, we try to send it if we can find a way to reference the row.
            // But if unit_id is the PK and it's null, we might need a custom worker action.

            // For now, let's delete valid ones.
            if (id && id !== 'null' && id !== 'undefined') {
                await fetch("https://robel-api.george-gamal139.workers.dev/api", {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_KEY}` },
                    body: JSON.stringify({ action: 'DELETE', table: 'units', id: id })
                });
            }
        }

        // Final attempt at the ghosts
        await fetch("https://robel-api.george-gamal139.workers.dev/api", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_KEY}` },
            body: JSON.stringify({ action: 'DELETE', table: 'units', id: null })
        });
        await fetch("https://robel-api.george-gamal139.workers.dev/api", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_KEY}` },
            body: JSON.stringify({ action: 'DELETE', table: 'units', id: 'undefined' })
        });

        console.log("Cleanup complete.");
    } catch (e) { console.error(e); }
}
clearTable();
