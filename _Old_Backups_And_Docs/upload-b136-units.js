/**
 * Upload B136 Units to Cloudflare Database
 * Building: B136
 * Total Units: 7
 */

const CLOUDFLARE_WORKER_URL = "https://robel-db.george-gamal139.workers.dev";
const AUTH_KEY = "ROBEL_SECURE_SYNC_2025";

// B136 Units Data
const units = [
    {
        code: "136102",
        building_id: "B136",
        project_id: "porto-golf-marina",
        floor: "1",
        area: 90,
        view: "South-facing",
        view2: "Garden view",
        price: 6365000,
        status: "Available",
        purpose: "Sale",
        payment_plan: "Installments"
    },
    {
        code: "136125",
        building_id: "B136",
        project_id: "porto-golf-marina",
        floor: "1",
        area: 90,
        view: "South-facing",
        view2: "Garden view",
        price: 6365000,
        status: "Available",
        purpose: "Sale",
        payment_plan: "Installments"
    },
    {
        code: "136225",
        building_id: "B136",
        project_id: "porto-golf-marina",
        floor: "2",
        area: 90,
        view: "South-facing",
        view2: "Garden view",
        price: 6447000,
        status: "Available",
        purpose: "Sale",
        payment_plan: "Installments"
    },
    {
        code: "136825",
        building_id: "B136",
        project_id: "porto-golf-marina",
        floor: "8",
        area: 90,
        view: "South-facing",
        view2: "Garden view",
        price: 6935000,
        status: "Available",
        purpose: "Sale",
        payment_plan: "Installments"
    },
    {
        code: "136902",
        building_id: "B136",
        project_id: "porto-golf-marina",
        floor: "9",
        area: 90,
        view: "South-facing",
        view2: "Garden view",
        price: 6605000,
        status: "Available",
        purpose: "Sale",
        payment_plan: "Installments"
    },
    {
        code: "136922",
        building_id: "B136",
        project_id: "porto-golf-marina",
        floor: "9",
        area: 60,
        view: "South-facing",
        view2: "Garden view",
        price: 4405000,
        status: "Available",
        purpose: "Sale",
        payment_plan: "Installments"
    },
    {
        code: "136925",
        building_id: "B136",
        project_id: "porto-golf-marina",
        floor: "9",
        area: 90,
        view: "South-facing",
        view2: "Garden view",
        price: 6605000,
        status: "Available",
        purpose: "Sale",
        payment_plan: "Installments"
    }
];

async function uploadUnit(unitData) {
    const unitId = `unit_${unitData.building_id}_${unitData.code}`;

    const payload = {
        action: "UPSERT",
        table: "units",
        id: unitId,
        data: {
            unit_id: unitId,
            code: unitData.code,
            building_id: unitData.building_id,
            project_id: unitData.project_id,
            floor: unitData.floor,
            area: unitData.area,
            view: unitData.view,
            price: unitData.price,
            status: unitData.status,
            purpose: unitData.purpose,
            payment_plan: unitData.payment_plan,
            images: "[]"
        }
    };

    try {
        const response = await fetch(`${CLOUDFLARE_WORKER_URL}/api`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${AUTH_KEY}`
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
        }

        const result = await response.json();
        return { success: true, unitId, result };
    } catch (error) {
        return { success: false, unitId, error: error.message };
    }
}

async function uploadAllUnits() {
    console.log("🚀 Starting B136 Units Upload...");
    console.log(`📊 Total Units: ${units.length}`);
    console.log("━".repeat(60));

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < units.length; i++) {
        const unit = units[i];
        console.log(`\n[${i + 1}/${units.length}] Uploading Unit ${unit.code}...`);

        const result = await uploadUnit(unit);

        if (result.success) {
            successCount++;
            console.log(`✅ SUCCESS: Unit ${unit.code} uploaded`);
        } else {
            failCount++;
            console.error(`❌ FAILED: Unit ${unit.code}`);
            console.error(`   Error: ${result.error}`);
        }

        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log("\n" + "━".repeat(60));
    console.log("📈 UPLOAD SUMMARY:");
    console.log(`   ✅ Successful: ${successCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📊 Total: ${units.length}`);
    console.log("━".repeat(60));

    if (successCount === units.length) {
        console.log("🎉 ALL UNITS UPLOADED SUCCESSFULLY!");
    } else if (successCount > 0) {
        console.log("⚠️  PARTIAL SUCCESS - Some units failed to upload");
    } else {
        console.log("❌ UPLOAD FAILED - No units were uploaded");
    }
}

// Run the upload
uploadAllUnits().catch(error => {
    console.error("💥 FATAL ERROR:", error);
    process.exit(1);
});
