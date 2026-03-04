
const AUTH_KEY = "ROBEL_SECURE_SYNC_2025";

async function wipe() {
    try {
        const resp = await fetch("https://robel-api.george-gamal139.workers.dev/api", {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_KEY}` },
            body: JSON.stringify({
                action: 'WIPE_UNITS',
                table: 'units'
            })
        });
        console.log(await resp.json());
    } catch (e) { console.error(e); }
}
wipe();
