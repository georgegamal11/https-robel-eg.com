/**
 * BATCH UPLOAD SCRIPT FOR B230 UNITS
 * ===================================
 * Uploads 41 units from building B230 based on the provided images
 */

const WORKER_URL = "https://robel-api.george-gamal139.workers.dev";
const AUTH_KEY = "ROBEL_SECURE_SYNC_2025";
const BUILDING_ID = "B230";
const PROJECT_ID = "porto-golf-marina"; // Adjust if needed

// All 41 units from the images
const units = [
    // Ground Floor - من الصورة الأولى
    { code: "230016", floor: "Ground floor", area: 60, view: "Villa", price: 4440000 },
    { code: "230018", floor: "Ground floor", area: 60, view: "Villa", price: 4440000 },
    { code: "230021", floor: "Ground floor", area: 60, view: "Garden", price: 4922000 },
    { code: "230022", floor: "Ground floor", area: 60, view: "Garden", price: 4722000 },
    { code: "230024", floor: "Ground floor", area: 60, view: "Garden", price: 4722000 },
    { code: "230026", floor: "Ground floor", area: 30, view: "Garden", price: 2699000 },

    // 1st Floor
    { code: "230103", floor: "1st floor", area: 60, view: "Garden", price: 3685000 },
    { code: "230106", floor: "1st floor", area: 60, view: "Garden", price: 3685000 },
    { code: "230107", floor: "1st floor", area: 82, view: "Villa", price: 4750000 },
    { code: "230108", floor: "1st floor", area: 60, view: "Villa", price: 3461850 },
    { code: "230110", floor: "1st floor", area: 60, view: "Villa", price: 3475000 },
    { code: "230112", floor: "1st floor", area: 90, view: "Villa", price: 5195000 },

    // 3rd Floor
    { code: "230302", floor: "3rd floor", area: 90, view: "Garden", price: 5637000 },
    { code: "230307", floor: "3rd floor", area: 82, view: "Villa", price: 4830000 },
    { code: "230314", floor: "3rd floor", area: 30, view: "Villa", price: 1992000 },

    // 4th Floor
    { code: "230407", floor: "4th floor", area: 82, view: "Villa", price: 4878000 },
    { code: "230412", floor: "4th floor", area: 90, view: "Villa", price: 5355000 },
    { code: "230413", floor: "4th floor", area: 60, view: "Villa", price: 3570000 },
    { code: "230420", floor: "4th floor", area: 82, view: "Villa", price: 4878000 },

    // 5th Floor
    { code: "230507", floor: "5th floor", area: 82, view: "Villa", price: 4928000 },
    { code: "230512", floor: "5th floor", area: 90, view: "Villa", price: 5408000 },
    { code: "230514", floor: "5th floor", area: 30, view: "Villa", price: 2035000 },
    { code: "230525", floor: "5th floor", area: 90, view: "Garden", price: 5755000 },

    // 6th Floor - من الصورة الأولى
    { code: "230613", floor: "6th floor", area: 60, view: "Villa", price: 3639000 },
    { code: "230615", floor: "6th floor", area: 60, view: "Villa", price: 3639000 },
    { code: "230620", floor: "6th floor", area: 82, view: "Villa", price: 4978000 },

    // 6th Floor - من الصورة الثانية
    { code: "230625", floor: "6th floor", area: 90, view: "Garden", price: 5810000 },
    { code: "230626", floor: "6th floor", area: 30, view: "Garden", price: 2245000 },

    // 7th Floor
    { code: "230707", floor: "7th floor", area: 82, view: "Villa", price: 5026000 },

    // 8th Floor
    { code: "230812", floor: "8th floor", area: 90, view: "Villa", price: 5570000 },
    { code: "230815", floor: "8th floor", area: 60, view: "Villa", price: 3715000 },
    { code: "230818", floor: "8th floor", area: 60, view: "Villa", price: 3715000 },
    { code: "230820", floor: "8th floor", area: 82, view: "Villa", price: 5075000 },
    { code: "230825", floor: "8th floor", area: 90, view: "Garden", price: 5926000 },

    // 9th Floor
    { code: "230902", floor: "9th floor", area: 90, view: "Garden", price: 5526000 },
    { code: "230907", floor: "9th floor", area: 82, view: "Villa", price: 4750000 },
    { code: "230910", floor: "9th floor", area: 60, view: "Villa", price: 3475000 },
    { code: "230911", floor: "9th floor", area: 60, view: "Villa", price: 3475000 },
    { code: "230912", floor: "9th floor", area: 90, view: "Villa", price: 5195000 },
    { code: "230913", floor: "9th floor", area: 60, view: "Villa", price: 3475000 },
    { code: "230925", floor: "9th floor", area: 90, view: "Garden", price: 5526000 }
];

async function syncUnit(unitData) {
    const unitId = `unit_${BUILDING_ID}_${unitData.code}`;

    const payload = {
        unit_id: unitId,
        code: unitData.code,
        building_id: BUILDING_ID,
        project_id: PROJECT_ID,
        floor: unitData.floor,
        area: unitData.area,
        view: unitData.view,
        price: unitData.price,
        purpose: 'Sale',
        payment_plan: '',
        status: 'Available',
        images: JSON.stringify([]) // No images for now
    };

    try {
        const resp = await fetch(`${WORKER_URL}/api`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${AUTH_KEY}`
            },
            body: JSON.stringify({
                action: 'UPSERT',
                table: 'units',
                id: unitId,
                data: payload
            })
        });

        if (resp.ok) {
            const result = await resp.json();
            console.log(`✅ Unit ${unitData.code} uploaded successfully`);
            return { success: true, code: unitData.code };
        } else {
            const error = await resp.text();
            console.error(`❌ Failed to upload unit ${unitData.code}:`, error);
            return { success: false, code: unitData.code, error };
        }
    } catch (e) {
        console.error(`❌ Error uploading unit ${unitData.code}:`, e);
        return { success: false, code: unitData.code, error: e.message };
    }
}

async function uploadAllUnits() {
    console.log(`🚀 Starting upload of ${units.length} units for building ${BUILDING_ID}...`);

    const results = {
        success: [],
        failed: []
    };

    // Upload in batches of 5 to avoid rate limits
    const batchSize = 5;
    for (let i = 0; i < units.length; i += batchSize) {
        const batch = units.slice(i, i + batchSize);
        console.log(`📦 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(units.length / batchSize)}...`);

        const batchResults = await Promise.all(batch.map(unit => syncUnit(unit)));

        batchResults.forEach(result => {
            if (result.success) {
                results.success.push(result.code);
            } else {
                results.failed.push({ code: result.code, error: result.error });
            }
        });

        // Small delay between batches
        if (i + batchSize < units.length) {
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    console.log('\n=================================');
    console.log('📊 UPLOAD SUMMARY');
    console.log('=================================');
    console.log(`✅ Successfully uploaded: ${results.success.length} units`);
    console.log(`❌ Failed: ${results.failed.length} units`);

    if (results.failed.length > 0) {
        console.log('\n❌ Failed units:');
        results.failed.forEach(f => console.log(`  - ${f.code}: ${f.error}`));
    }

    if (results.success.length > 0) {
        console.log('\n✅ Successfully uploaded units:');
        console.log(results.success.join(', '));
    }

    return results;
}

// Run the upload
uploadAllUnits().then(results => {
    console.log('\n🎉 Upload process completed!');
}).catch(error => {
    console.error('💥 Upload process failed:', error);
});
