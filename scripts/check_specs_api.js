/**
 * Check unit specifications via Cloudflare API
 */

const WORKER_URL = "https://robel-api.george-gamal139.workers.dev";

async function checkSpecs() {
    console.log('🔍 Fetching units from Cloudflare...\n');

    try {
        const response = await fetch(`${WORKER_URL}/api/units?buildingId=B133`);
        const units = await response.json();

        console.log(`Found ${units.length} units in B133\n`);
        console.log('='.repeat(80));

        // Show first 10 units
        units.slice(0, 10).forEach(u => {
            console.log(`\nUnit: ${u.code || u.unit_id}`);
            console.log(`  Area: ${u.area} m²`);
            console.log(`  bedrooms: ${u.bedrooms}`);
            console.log(`  bathrooms: ${u.bathrooms}`);
            if (u.specifications) {
                const specs = typeof u.specifications === 'string'
                    ? JSON.parse(u.specifications)
                    : u.specifications;
                console.log(`  specifications:`, specs);
            }
            console.log('-'.repeat(80));
        });

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

checkSpecs();
