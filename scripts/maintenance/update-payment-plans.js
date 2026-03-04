const fetch = global.fetch || require('node-fetch');

const WORKER_URL = "https://robel-api.george-gamal139.workers.dev";
const AUTH_KEY = "George792001";

async function sendRequest(apiPath, method, body) {
    try {
        const resp = await fetch(`${WORKER_URL}/api/${apiPath}`, {
            method: method,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${AUTH_KEY}` },
            body: body ? JSON.stringify(body) : null
        });
        const text = await resp.text();
        try { return JSON.parse(text); } catch { return text; }
    } catch (e) { return { error: e.message }; }
}

function getPaymentPlan(unit) {
    const bid = unit.building_id;
    const area = Number(unit.area);
    const floor = unit.floor || "";
    const code = unit.code;
    const isGround = floor.toLowerCase().includes('ground') || floor === 'Ground';

    // 1. Buildings 230 & 243
    if (bid === 'B230' || bid === 'B243') {
        // حالة الـ 30 متر أو الدور الأرضي
        if (area === 30 || isGround) {
            return "10% Down Payment over 6 Years";
        }
        // المتكرر (60 - 82 - 90)
        else {
            return "10% Down Payment over 6 Years (Option: 10% Discount OR Finished Delivery)";
        }
    }

    // 2. Building 136
    if (bid === 'B136') {
        let plan = "5% Contract, 5% after 1 month, over 6 Years";

        // Exception Unit 136922
        if (code === '136922' || code === 136922) {
            return "10% Down Payment over 4 Years";
        }

        // Cash Discount for 90m
        if (area === 90) {
            return plan + " | Cash Discount 40%";
        }

        return plan;
    }

    // 3. Building 133
    if (bid === 'B133') {
        let basePlan = "";

        if (area === 90) {
            basePlan = "10% Down Payment over 6 Years";
        } else if (area === 82) {
            basePlan = "10% Down Payment over 5 Years";
        } else if (area === 60) {
            basePlan = "10% Down Payment over 4 Years";
        } else {
            basePlan = "10% Down Payment";
        }

        // Cash Discount for ALL B133
        return basePlan + " | Cash Discount 40%";
    }

    return null; // Don't update others
}

async function main() {
    console.log("💰 Updating Payment Plans Rules...");
    console.log("==================================\n");

    console.log("📡 Fetching units...");
    const units = await sendRequest('units', 'GET');

    if (!Array.isArray(units)) {
        console.error("❌ Failed:", units);
        return;
    }

    console.log(`✅ Found ${units.length} units totally. Filtering for target buildings...\n`);

    let updated = 0;

    for (const unit of units) {
        const plan = getPaymentPlan(unit);

        // Update ONLY if the plan belongs to the specified buildings
        if (plan) {
            // Check if plan is different to avoid unnecessary writes
            if (unit.payment_plan !== plan) {
                const updatedData = { ...unit, payment_plan: plan };

                process.stdout.write(`\r   Updating ${unit.building_id} - ${unit.code} (${unit.area}m) -> ${plan.substring(0, 40)}...`);

                await sendRequest('units', 'POST', {
                    action: 'UPSERT',
                    table: 'units',
                    id: unit.unit_id,
                    data: updatedData
                });
                updated++;
            }
        }
    }

    console.log(`\n\n✅ Successfully updated payment plans for ${updated} units.\n`);
}

main().catch(console.error);
