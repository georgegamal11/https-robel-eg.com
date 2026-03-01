/**
 * ADMIN MANUAL UNIT HANDLER
 * =========================
 * Handles the "Add Unit" form submission manually.
 * Includes FALLBACK API if the main admin-api.js fails to load.
 */

const FALLBACK_WORKER_URL = "https://robel-api.george-gamal139.workers.dev";
const FALLBACK_AUTH_KEY = "G792001";

/**
 * Promise wrapper with timeout
 */
function withTimeout(promise, ms = 15000, context = 'Operation') {
    const timeout = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`${context} timed out après ${ms}ms`)), ms);
    });
    return Promise.race([promise, timeout]);
}

document.addEventListener('DOMContentLoaded', () => {
    // wait for other scripts
    setTimeout(initManualUnitHandler, 1000);
});

function initManualUnitHandler() {
    // console.log("🛠️ initializing Manual Unit Handler...");

    const form = document.getElementById('addUnitForm');
    if (!form) {
        console.warn("⚠️ [ManualUnit] 'addUnitForm' not found in DOM.");
        return;
    }

    // form.addEventListener('submit', handleManualUnitSubmit);
    // console.log("✅ [ManualUnit] Global handler in home.js will manage 'addUnitForm'.");

}

async function handleManualUnitSubmit(e) {
    e.preventDefault();
    console.log("🚀 [ManualUnit] Form Submitted!");

    const statusDiv = document.getElementById('unit-code-feedback');
    if (statusDiv) statusDiv.textContent = "Processing...";

    // 2. Gather Data (STRIP NON-DIGITS)
    const rawCode = document.getElementById('new-unit-code')?.value || '';

    // 🔥 ROBUST CODE CONSTRUCTION (From user feedback)
    // 1. Strip 'B' or other chars
    let code = rawCode.replace(/\D/g, '');

    // 🚀 SMART EXPANSION FOR SHORT CODES (3 Digits -> Full Code)
    // If user enters '424' and building is 'B133', we want '133424'
    const buildingDisplay = document.getElementById('new-unit-building-display')?.value;
    let buildingId = window.selectedBuildingId || window.currentProjectId;
    if (!buildingId && buildingDisplay && buildingDisplay !== "No Building Selected") {
        buildingId = buildingDisplay;
    }

    if (code.length === 3 && buildingId) {
        const bNum = buildingId.replace(/\D/g, ''); // "133"
        // Only expand if we have a valid building number
        if (bNum.length > 0) {
            console.log(`✨ Expanding Short Code: ${code} + Building ${bNum} -> ${bNum}${code}`);
            code = bNum + code;
        }
    }

    // 🚀 GOD MODE: If user gives full 6-digit code (133424), AUTO-DETECT BUILDING
    if (code.length === 6) {
        const bNum = code.substring(0, 3);
        const autoBuildingId = 'B' + bNum;
        if (buildingId !== autoBuildingId) {
            console.log(`✨ Auto-Switching Building Context: ${buildingId} -> ${autoBuildingId}`);
            buildingId = autoBuildingId;
        }
    }

    // Validation
    const floor = document.getElementById('new-unit-floor')?.value.trim();
    const number = document.getElementById('new-unit-number')?.value.trim();
    const area = document.getElementById('new-unit-area')?.value.trim();
    const view = document.getElementById('new-unit-view')?.value;
    const price = document.getElementById('new-unit-price')?.value.trim();
    const intent = document.getElementById('new-unit-intent')?.value;
    const payment = document.getElementById('new-unit-payment')?.value.trim();

    // ... building resolve ...
    // Re-resolve or just use existing buildingId from above
    if (!buildingId && buildingDisplay && buildingDisplay !== "No Building Selected") {
        buildingId = buildingDisplay;
    }

    if (!buildingId) {
        alert("❌ Error: No Building Selected. Please select a building from the sidebar.");
        return;
    }

    // Flexible Length Check 
    if (!code || code.length < 1 || code.length > 10) {
        alert(`❌ Error: Unit Code must be valid numbers (1-10 digits). You entered ${code.length} digits.`);
        return;
    }

    if (!area || !price || !view) {
        alert("❌ Error: Please fill in all required fields (Area, Price, View).");
        return;
    }

    // Retrieve Images
    let images = [];
    if (typeof window.getUnitImages === 'function') {
        const rawImages = window.getUnitImages();
        images = rawImages.map(img => img.data);
        console.log(`📸 [ManualUnit] Found ${images.length} images to upload.`);
    }

    // Construct Unit Object
    const unitData = {
        code: code,
        buildingId: buildingId,
        project_id: buildingId,
        floor: floor || 'N/A',
        unitNumber: number || 'N/A',
        area: area,
        view: view,
        price: price,
        purpose: intent || 'buy',
        paymentPlan: payment || '',
        status: 'Available',
        images: images
    };

    // UI Feedback
    const form = document.getElementById('addUnitForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        console.log("📤 [ManualUnit] Sending Data to Cloudflare:", unitData);

        let result = false;

        // TRY 1: Main Admin API
        if (window.robelAdminAPI && window.robelAdminAPI.createUnit) {
            console.log("🔹 Using Main Admin API");
            await window.robelAdminAPI.createUnit(unitData);
            result = true;
        }
        // TRY 2: Fallback (Self-contained)
        else {
            console.warn("⚠️ Main Admin API not found. Using FALLBACK create function.");
            result = await fallbackCreateUnit(unitData);
        }

        if (result) {
            console.log("✅ [ManualUnit] Success!");
            alert(`🎉 Unit ${code} created successfully!`);

            // Reset Form
            form.reset();
            document.getElementById('new-unit-building-display').value = buildingId;
            if (typeof window.clearUnitImages === 'function') window.clearUnitImages();
            if (typeof window.AdminSmartEntry !== 'undefined') window.AdminSmartEntry.resetFields();

            // Refresh List
            if (typeof window.renderAdminUnits === 'function') {
                await window.renderAdminUnits(buildingId);
            }
        } else {
            throw new Error("API Execution Failed");
        }

    } catch (error) {
        console.error("❌ [ManualUnit] Error:", error);
        alert("Failed to create unit: " + error.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalText;
        if (statusDiv) statusDiv.textContent = "";
    }
}

// ==========================================================
// FALLBACK FUNCTIONS (In case admin-api.js fails to load)
// ==========================================================

async function fallbackCreateUnit(unitData) {
    const bCode = unitData.buildingId || 'unknown';
    const unitId = `unit_${bCode}_${unitData.code}`;

    const newUnit = {
        unit_id: unitId,
        code: unitData.code,
        building_id: unitData.buildingId,
        project_id: unitData.project_id || unitData.buildingId,
        floor: unitData.floor,
        area: parseInt(unitData.area) || 0,
        view: unitData.view,
        price: parseInt(unitData.price) || 0,
        purpose: unitData.purpose || 'buy',
        payment_plan: unitData.paymentPlan || '',
        status: 'Available',
        images: unitData.images || []
    };

    return await fallbackSync('units', 'UPSERT', unitId, newUnit);
}

async function fallbackSync(table, action, id, data = {}) {
    try {
        console.log(`☁️ [FALLBACK Sync] ${table} ${action} ${id}`);
        const serializedData = { ...data };

        // Handle Image Array -> String
        if (Array.isArray(serializedData.images) && serializedData.images.length > 0) {
            const firstImg = serializedData.images[0];
            serializedData.image = (typeof firstImg === 'object' && firstImg.data) ? firstImg.data : firstImg;
            // Ensure all are strings
            serializedData.images = serializedData.images.map(img => (typeof img === 'object' && img.data) ? img.data : img);
        }

        if (Array.isArray(serializedData.images)) {
            serializedData.images = JSON.stringify(serializedData.images);
        }

        // Clean keys
        if (serializedData.buildingId) delete serializedData.buildingId;
        if (serializedData.projectId) delete serializedData.projectId;
        delete serializedData.id;

        const resp = await withTimeout(fetch(`${FALLBACK_WORKER_URL}/api`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${FALLBACK_AUTH_KEY}` },
            body: JSON.stringify({ action, table, id, data: serializedData })
        }), 15000, 'Fallback Sync');

        if (!resp.ok) {
            console.warn("Fallback Sync Failed:", await resp.text());
            return false;
        }
        return true;
    } catch (e) {
        console.error("Fallback Sync Error:", e);
        return false;
    }
}
