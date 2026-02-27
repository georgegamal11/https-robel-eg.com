/**
 * Update B230 & B243 - Cash Discount Payment Plans
 * Updated February 2026
 */

const fetch = global.fetch || require('node-fetch');

const WORKER_URL = "https://robel-api.george-gamal139.workers.dev";
const ADMIN_EMAIL = "admin@robel.com";
const ADMIN_PASSWORDS = ["George792001", "G792001"]; // try both

let SESSION_TOKEN = null;

// Step 1: Login to get session token
async function login() {
    for (const pwd of ADMIN_PASSWORDS) {
        const resp = await fetch(`${WORKER_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: ADMIN_EMAIL, password: pwd })
        });
        const data = await resp.json();
        if (data.success && data.token) {
            SESSION_TOKEN = data.token;
            console.log(`Login successful with password [${pwd}]. Role: ${data.user?.role}`);
            return true;
        }
    }
    console.error('Login failed with all passwords');
    return false;
}

// GET: fetch all units
async function getUnits() {
    const resp = await fetch(`${WORKER_URL}/api/units`, {
        headers: { 'Authorization': `Bearer ${SESSION_TOKEN}` }
    });
    return resp.json();
}

// POST: upsert a single field (payment_plan only — minimal payload)
async function updatePaymentPlan(unitId, paymentPlan) {
    const payload = {
        action: 'UPSERT',
        table: 'units',
        id: unitId,
        data: {
            unit_id: unitId,
            payment_plan: typeof paymentPlan === 'object'
                ? JSON.stringify(paymentPlan)
                : paymentPlan
        }
    };
    const resp = await fetch(`${WORKER_URL}/api`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SESSION_TOKEN}`
        },
        body: JSON.stringify(payload)
    });
    return resp.json();
}

async function sendRequest(apiPath, method, body) {
    try {
        const resp = await fetch(`${WORKER_URL}/api/${apiPath}`, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_KEY}`
            },
            body: body ? JSON.stringify(body) : null
        });
        const text = await resp.text();
        try { return JSON.parse(text); } catch { return text; }
    } catch (e) { return { error: e.message }; }
}

function getUpdatedPlan(unit) {
    const bid = (unit.building_id || '').toString().toUpperCase();
    const area = Number(unit.area);
    const floor = (unit.floor || '').toString().toLowerCase();
    const isGround = floor.includes('ground') || floor.includes('g') || floor === '0';

    if (bid !== 'B230' && bid !== 'B243') return null;

    // Ground floor OR 30m units -> Standard plan only
    if (area === 30 || isGround) {
        return {
            name: 'Standard Installment Plan',
            name_ar: 'خطة التقسيط القياسية',
            down_payment: '10%',
            installment_years: 6,
            installment_years_text: '6 Years',
            cash_discount: null,
            cash_note: null,
            description: '10% Down Payment - 6 Years Installments',
            updated: 'February 2026'
        };
    }

    // Repeating units (60 / 82 / 90 m²) -> With cash discount options
    return {
        name: 'Standard Installment Plan + Cash Discount',
        name_ar: 'خطة التقسيط + خصم كاش',
        down_payment: '10%',
        installment_years: 6,
        installment_years_text: '6 Years',
        cash_discount_no_finishing: '50%',
        cash_discount_with_finishing: '40%',
        cash_note: 'Without Finishing: 50% | With Finishing: 40%',
        cash_note_ar: 'بدون تشطيب: 50% | بالتشطيب: 40%',
        description: '10% Down Payment - 6 Years | Cash: 50% (No Finishing) or 40% (With Finishing)',
        updated: 'February 2026'
    };
}

async function main() {
    console.log('');
    console.log('==============================================');
    console.log('  B230 & B243 - Cash Discount Update Script');
    console.log('  Updated: February 2026');
    console.log('==============================================\n');

    // Step 1: Login
    console.log('Logging in as admin...');
    const loggedIn = await login();
    if (!loggedIn) { console.error('Cannot proceed without valid session.'); return; }

    console.log('Fetching all units from database...');
    const units = await getUnits();

    if (!Array.isArray(units)) {
        console.error('❌ Failed to fetch units:', units);
        return;
    }

    // Filter B230 and B243 only
    const targetUnits = units.filter(u => {
        const bid = (u.building_id || '').toString().toUpperCase();
        return bid === 'B230' || bid === 'B243';
    });

    console.log(`✅ Found ${units.length} total units`);
    console.log(`🏢 B230 + B243 units: ${targetUnits.length}\n`);

    // Group for display
    const b230 = targetUnits.filter(u => u.building_id?.toString().toUpperCase() === 'B230');
    const b243 = targetUnits.filter(u => u.building_id?.toString().toUpperCase() === 'B243');
    console.log(`   B230: ${b230.length} units`);
    console.log(`   B243: ${b243.length} units\n`);

    let updated = 0;
    let skipped = 0;

    for (const unit of targetUnits) {
        const newPlan = getUpdatedPlan(unit);
        if (!newPlan) { skipped++; continue; }

        const planStr = JSON.stringify(newPlan);
        const existingPlan = typeof unit.payment_plan === 'string'
            ? unit.payment_plan
            : JSON.stringify(unit.payment_plan);

        if (existingPlan === planStr) {
            skipped++;
            continue;
        }

        process.stdout.write(`\r   Updating ${unit.building_id} - ${unit.code} (${unit.area}m2)...`);

        const result = await updatePaymentPlan(unit.unit_id, newPlan);

        if (result && (result.success || typeof result.changes !== 'undefined')) {
            updated++;
        } else {
            process.stdout.write(`\n   FAILED [${unit.code}]: ${JSON.stringify(result)}\n`);
        }
    }

    console.log(`\n\n✅ Done!`);
    console.log(`   Updated : ${updated} units`);
    console.log(`   Skipped : ${skipped} units (already up to date)\n`);
    console.log('Payment plan structure saved:');
    console.log('  Ground/30m  -> 10% Down, 6 Years (no cash discount)');
    console.log('  60/82/90m   -> 10% Down, 6 Years + 50% cash (no finishing) / 40% cash (with finishing)');
    console.log('');
}

main().catch(console.error);
