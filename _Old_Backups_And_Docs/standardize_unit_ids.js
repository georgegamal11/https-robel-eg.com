/**
 * STANDARDIZE UNIT IDs SCRIPT
 * Run this script in the browser console (F12) while on the admin page
 * This will convert all unit IDs to the unified format: unit_B{building}_{code}
 */

(async function standardizeAllUnitIDs() {
    console.log("🔧 Starting Unit ID Standardization...");

    const WORKER_URL = 'https://robel-api.george-gamal139.workers.dev';
    const AUTH_KEY = 'George792001';

    try {
        // 1. Fetch all units
        console.log("📥 Fetching all units from database...");
        const response = await fetch(`${WORKER_URL}/api/units`);
        if (!response.ok) throw new Error("Failed to fetch units");
        const units = await response.json();
        console.log(`✅ Found ${units.length} total units`);

        // 2. Identify units that need standardization
        const toUpdate = [];

        units.forEach(u => {
            const currentId = u.unit_id || u.id;

            // Normalize building ID
            let bCode = u.building_id || u.buildingId || '';
            if (/^\d+$/.test(bCode)) bCode = 'B' + bCode;
            if (typeof bCode === 'string' && bCode.toLowerCase().startsWith('b')) {
                bCode = 'B' + bCode.substring(1).toUpperCase();
            }

            // Generate standard ID format
            const code = (u.code || '').toString().trim();
            const standardId = `unit_${bCode}_${code}`;

            // Check if conversion needed
            if (currentId !== standardId && code && bCode) {
                toUpdate.push({
                    oldId: currentId,
                    newId: standardId,
                    building: bCode,
                    code: code,
                    unit: u
                });
            }
        });

        if (toUpdate.length === 0) {
            console.log("✅ All unit IDs are already standardized!");
            alert("✅ All unit IDs are already standardized!");
            return;
        }

        // 3. Show summary
        console.log(`\n📊 SUMMARY:`);
        console.log(`   Units needing update: ${toUpdate.length}`);
        console.log(`\n📝 Examples (first 5):`);
        toUpdate.slice(0, 5).forEach(item => {
            console.log(`   • ${item.oldId} → ${item.newId}`);
        });

        const confirmed = confirm(
            `Found ${toUpdate.length} units with non-standard IDs.\n\n` +
            `Examples:\n` +
            toUpdate.slice(0, 3).map(item => `• ${item.oldId} → ${item.newId}`).join('\n') +
            `\n\nDo you want to standardize all IDs?\n\n` +
            `⚠️ This process may take a few minutes.`
        );

        if (!confirmed) {
            console.log("❌ Operation cancelled by user");
            return;
        }

        // 4. Process updates
        console.log("\n🚀 Starting conversion process...");
        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < toUpdate.length; i++) {
            const item = toUpdate[i];
            const progress = `${i + 1}/${toUpdate.length}`;

            try {
                console.log(`[${progress}] Converting: ${item.oldId} → ${item.newId}`);

                // Delete old record
                const deleteResp = await fetch(`${WORKER_URL}/api`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${AUTH_KEY}`
                    },
                    body: JSON.stringify({
                        action: 'DELETE',
                        table: 'units',
                        id: item.oldId
                    })
                });

                if (!deleteResp.ok) {
                    throw new Error(`Delete failed: ${await deleteResp.text()}`);
                }

                // Create new record with standardized ID
                const newUnit = {
                    ...item.unit,
                    unit_id: item.newId,
                    building_id: item.building
                };

                const createResp = await fetch(`${WORKER_URL}/api`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${AUTH_KEY}`
                    },
                    body: JSON.stringify({
                        action: 'UPSERT',
                        table: 'units',
                        id: item.newId,
                        data: newUnit
                    })
                });

                if (!createResp.ok) {
                    throw new Error(`Create failed: ${await createResp.text()}`);
                }

                successCount++;
                console.log(`   ✅ Success [${progress}]`);

                // Small delay to avoid overwhelming the API
                if (i % 10 === 0 && i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }

            } catch (error) {
                errorCount++;
                console.error(`   ❌ Error [${progress}]:`, error.message);
            }
        }

        // 5. Final summary
        console.log("\n" + "=".repeat(50));
        console.log("📊 FINAL REPORT:");
        console.log("=".repeat(50));
        console.log(`✅ Successfully converted: ${successCount} units`);
        console.log(`❌ Failed: ${errorCount} units`);
        console.log(`📦 Total processed: ${toUpdate.length} units`);
        console.log("=".repeat(50));

        alert(
            `✅ Standardization Complete!\n\n` +
            `Successfully converted: ${successCount} units\n` +
            `Failed: ${errorCount} units\n\n` +
            `Page will reload now.`
        );

        // Reload page to refresh data
        window.location.reload();

    } catch (error) {
        console.error("❌ Standardization failed:", error);
        alert("❌ Error: " + error.message);
    }
})();
