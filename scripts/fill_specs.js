/**
 * Update unit specifications in Firestore based on area rules
 */

const WORKER_URL = "https://robel-api.george-gamal139.workers.dev";
const AUTH_KEY = "ROBEL_SECURE_SYNC_2025";

function calculateSpecs(area, projectId, buildingId) {
    let bedrooms, bathrooms;

    const pid = (projectId || '').toLowerCase();
    const bid = (buildingId || '').toUpperCase();

    // Porto Golf Marina Rules
    if (pid.includes('golf') || pid === 'porto-golf-marina' || ['B133', 'B136', 'B121', 'B230', 'B243', 'B78'].includes(bid)) {
        if (area <= 38) {
            bedrooms = 1; bathrooms = 1;
        } else if (area >= 50 && area <= 70) {
            bedrooms = 1; bathrooms = 2;
        } else if (area >= 78 && area <= 88) {
            bedrooms = 1; bathrooms = 2;
        } else if (area >= 89) {
            bedrooms = 2; bathrooms = 2;
        } else {
            bedrooms = 1; bathrooms = 1;
        }
    }
    // Porto Said Rules
    else if (pid.includes('said') || pid === 'porto-said' || ['B15', 'B33'].includes(bid)) {
        if (bid === 'B15') {
            if (area <= 50) {
                bedrooms = 0; bathrooms = 1;
            } else if (area <= 75) {
                bedrooms = 1; bathrooms = 1;
            } else if (area <= 110) {
                bedrooms = 2; bathrooms = 2;
            } else {
                bedrooms = 3; bathrooms = 2;
            }
        } else {
            if (area <= 59) {
                bedrooms = 0; bathrooms = 1;
            } else if (area <= 76) {
                bedrooms = 1; bathrooms = 1;
            } else if (area <= 95) {
                bedrooms = 1; bathrooms = 1;
            } else if (area <= 120) {
                bedrooms = 2; bathrooms = 2;
            } else {
                bedrooms = 3; bathrooms = 2;
            }
        }
    }
    // Default
    else {
        bedrooms = area >= 90 ? 2 : 1;
        bathrooms = area >= 90 ? 2 : 1;
    }

    return {
        bedrooms,
        bathrooms,
        kitchen: true,
        living: true
    };
}

async function updateSpecs() {
    console.log('🔄 Fetching all units...\n');

    const response = await fetch(`${WORKER_URL}/api/units`);
    const units = await response.json();

    console.log(`Found ${units.length} total units\n`);

    let updated = 0;
    let skipped = 0;

    for (const unit of units) {
        const area = parseInt(unit.area);
        if (isNaN(area) || area === 0) {
            console.log(`⚠️  Skipping ${unit.code}: Invalid area`);
            skipped++;
            continue;
        }

        // Skip if already has specs
        if (unit.bedrooms && unit.bathrooms) {
            console.log(`✓ Skipping ${unit.code}: Already has specs`);
            skipped++;
            continue;
        }

        const specs = calculateSpecs(area, unit.project_id || unit.project, unit.building_id);

        console.log(`📝 Updating ${unit.code} (${area}m²): ${specs.bedrooms} beds, ${specs.bathrooms} baths`);

        try {
            const updateResponse = await fetch(`${WORKER_URL}/api/units/${unit.unit_id || unit.code}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Auth-Key': AUTH_KEY
                },
                body: JSON.stringify({
                    bedrooms: specs.bedrooms,
                    bathrooms: specs.bathrooms,
                    specifications: specs
                })
            });

            if (updateResponse.ok) {
                updated++;
            } else {
                const error = await updateResponse.text();
                console.error(`❌ Failed to update ${unit.code}:`, error);
            }

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
            console.error(`❌ Error updating ${unit.code}:`, error.message);
        }
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log(`✅ Updated: ${updated} units`);
    console.log(`⏭️  Skipped: ${skipped} units`);
    console.log(`${'='.repeat(80)}`);
}

updateSpecs().catch(console.error);
