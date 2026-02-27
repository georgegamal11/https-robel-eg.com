
const UNITS_TO_DELETE = [
    "9111", "9123", "9148", "9155", "9163", "9171", "9113A", "9161A",
    "9248", "9251", "9255", "9261A", "9303", "9351", "9355", "9361A",
    "9403", "9411", "9448", "9451", "9455", "9461A", "9023", "9047A"
];

async function deleteB9Units() {
    const AUTH_KEY = "G792001";
    const WORKER_URL = "https://robel-api.george-gamal139.workers.dev";

    console.log(`🗑️ Starting deletion of ${UNITS_TO_DELETE.length} units from Building B9...`);

    for (const code of UNITS_TO_DELETE) {
        const unitId = `unit_B9_${code}`;
        try {
            const resp = await fetch(`${WORKER_URL}/api`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${AUTH_KEY}`
                },
                body: JSON.stringify({
                    action: 'DELETE',
                    table: 'units',
                    id: unitId
                })
            });

            const result = await resp.json();
            if (result.success) {
                console.log(`✅ Deleted: ${unitId}`);
            } else {
                console.error(`❌ Failed: ${unitId}`, result.error);
            }
        } catch (e) {
            console.error(`❌ Error: ${unitId}`, e.message);
        }
    }

    console.log("🏁 Deletion complete.");
}

deleteB9Units();
