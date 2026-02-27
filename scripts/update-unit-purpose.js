const fetch = global.fetch || require('node-fetch');

const WORKER_URL = "https://robel-api.george-gamal139.workers.dev";
const AUTH_KEY = "George792001";

async function sendRequest(apiPath, method, body) {
    try {
        const url = apiPath.startsWith('http') ? apiPath : `${WORKER_URL}/api/${apiPath}`;
        const resp = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_KEY}`,
                'X-Auth-Key': AUTH_KEY
            },
            body: body ? JSON.stringify(body) : null
        });
        const text = await resp.text();
        try { return JSON.parse(text); } catch { return text; }
    } catch (e) { return { error: e.message }; }
}

async function updateAllPurpose() {
    try {
        console.log('Fetching all units...');
        const response = await sendRequest('units', 'GET');

        let units = [];
        if (Array.isArray(response)) {
            units = response;
        } else if (response && response.results) {
            units = response.results;
        } else {
            console.error('Failed to fetch units. Response:', response);
            return;
        }

        console.log(`Found ${units.length} units. Updating purpose to 'Buy'...`);

        // Count existing statuses
        const statuses = {};
        units.forEach(u => statuses[u.purpose] = (statuses[u.purpose] || 0) + 1);
        console.log('Current Purpose stats:', statuses);

        let count = 0;
        let skipped = 0;

        for (const u of units) {
            // Check if update is needed
            // User requested "Purpose تكون شراء BUY".
            if (u.purpose === 'Buy' && u.intent === 'Buy') {
                skipped++;
                continue;
            }

            // Also if purpose is "For Sale", we want to change it to "Buy".
            // If purpose is "Sale", change to "Buy".
            // Basically standardize ALL to "Buy".

            const updatedData = {
                ...u,
                purpose: 'Buy',
                intent: 'Buy'
            };

            const updateRes = await sendRequest('units', 'POST', {
                action: 'UPSERT',
                table: 'units',
                id: u.unit_id || u.id,
                data: updatedData
            });

            if (updateRes && (updateRes.success || updateRes.id || updateRes.unit_id)) {
                process.stdout.write('.');
                count++;
            } else {
                // Ignore silent failures if already processed?
                // console.log('Update result:', updateRes);
            }

            // Throttle
            if (count % 20 === 0) await new Promise(r => setTimeout(r, 50));
        }

        console.log(`\n\nUpdated ${count} units to 'Buy'. Skipped ${skipped} already 'Buy'.`);

    } catch (error) {
        console.error('Error:', error);
    }
}

updateAllPurpose();
