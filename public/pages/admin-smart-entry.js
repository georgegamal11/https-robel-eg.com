/**
 * ADMIN SMART ENTRY SYSTEM
 * ========================
 * Automatic parsing and validation for Unit Codes.
 * Enforces format: [BBB][F][UU] (Building-Floor-Unit)
 */

var AdminSmartEntry = {
    // Configuration
    floors: {
        '0': 'Ground Floor', '1': '1st Floor', '2': '2nd Floor', '3': '3rd Floor',
        '4': '4th Floor', '5': '5th Floor', '6': '6th Floor', '7': '7th Floor',
        '8': '8th Floor', '9': '9th Floor', '10': '10th Floor', '11': '11th Floor',
        '12': '12th Floor', '13': '13th Floor', '14': '14th Floor', '15': '15th Floor',
        '16': '16th Floor', '17': '17th Floor', '18': '18th Floor', '19': '19th Floor',
        '20': '20th Floor', '21': '21st Floor', '22': '22nd Floor', '23': '23rd Floor',
        '24': '24th Floor', '25': '25th Floor', '26': '26th Floor', '27': '27th Floor',
        '28': '28th Floor', '29': '29th Floor', '30': '30th Floor',
        '31': '31st Floor', '32': '32nd Floor', '33': '33rd Floor', '34': '34th Floor',
        '35': '35th Floor', '36': '36th Floor', '37': '37th Floor', '38': '38th Floor',
        '39': '39th Floor', '40': '40th Floor', '41': '41st Floor', '42': '42nd Floor', '43': '43rd Floor',
        '44': '44th Floor', '45': '45th Floor', '46': '46th Floor', '47': '47th Floor', '48': '48th Floor',
        '49': '49th Floor', '50': '50th Floor'
    },

    elements: {
        inputCode: 'new-unit-code',
        inputBuilding: 'new-unit-building-display',
        inputFloor: 'new-unit-floor',
        inputUnitNum: 'new-unit-number',
        feedback: 'unit-code-feedback',
        submitBtn: '#addUnitForm button[type="submit"]'
    },

    init: function () {
        console.log('🚀 AdminSmartEntry: Initializing...');
        this.attachListeners();

        // Use delegated listener for "Add Unit" as it might be re-rendered
        document.body.addEventListener('click', (e) => {
            const btn = e.target.closest('#show-add-unit-form');
            if (btn) {
                console.log('🔘 Add Unit Clicked - Updating Building Display');
                // Small delay to ensure any specific container toggle logic finishes
                setTimeout(() => this.updateBuildingDisplay(), 50);
            }
        });

        // Also check immediately if form is visible
        const container = document.getElementById('add-unit-container');
        if (container && container.style.display !== 'none') {
            this.updateBuildingDisplay();
        }
    },

    attachListeners: function () {
        const codeInput = document.getElementById(this.elements.inputCode);
        if (codeInput) {
            codeInput.addEventListener('input', (e) => this.handleInput(e));
        }

        // Handle Add New View selection
        const viewSelect = document.getElementById('new-unit-view');
        if (viewSelect) {
            viewSelect.addEventListener('change', (e) => {
                if (e.target.value === 'add-new-view') {
                    const newViewName = prompt("Enter the name of the new View:");
                    if (newViewName && newViewName.trim() !== "") {
                        // Add to dropdown
                        const option = document.createElement('option');
                        option.value = newViewName.trim();
                        option.textContent = newViewName.trim();
                        // Insert before the "Add New View" option
                        viewSelect.insertBefore(option, e.target.lastElementChild);
                        viewSelect.value = option.value;
                    } else {
                        viewSelect.value = ""; // Reset
                    }
                }
            });
        }
    },

    updateBuildingDisplay: function () {
        const display = document.getElementById(this.elements.inputBuilding);

        // 1. Try global variables
        let currentBuilding = window.selectedBuildingId || window.currentProjectId;

        // 2. Fallback: Try reading from Header Title if global is missing
        if (!currentBuilding) {
            const headerTitle = document.getElementById('mgr-project-name');
            if (headerTitle && headerTitle.textContent !== 'Select Building') {
                currentBuilding = headerTitle.textContent;
            }
        }

        console.log(`🏗️ SmartEntry: Detected Building -> ${currentBuilding}`);

        if (display) {
            if (currentBuilding) {
                display.value = currentBuilding;
                // Enable/Disable form based on context if needed
            } else {
                display.value = "No Building Selected";
            }
        }

        // Clear previous inputs
        const codeInput = document.getElementById(this.elements.inputCode);
        if (codeInput) codeInput.value = '';
        this.resetFields();
    },

    handleInput: function (e) {
        // Allow digits, 'S' (shop marker), and A/B/C (model suffix e.g. B10S3B)
        const code = e.target.value.toUpperCase().replace(/[^0-9SABCabc]/g, '');
        e.target.value = code;

        const currentBuilding = window.selectedBuildingId || window.currentProjectId || "";
        const currentBuildingNum = currentBuilding.replace(/\D/g, '');

        // If code contains 'S', it's a shop — skip standard length check
        if (/S/i.test(code)) {
            this.parseAndValidate(code);
            return;
        }

        const bLen = currentBuildingNum.length || 3;
        const isB15 = currentBuildingNum === '15';
        const unitDigits = isB15 ? 3 : 2;

        // Support 1 or 2 digits for floor
        const minLen = bLen + unitDigits + 1;
        const maxLen = bLen + unitDigits + 2;

        if (code.length < minLen || code.length > maxLen) {
            const format = "0".repeat(bLen) + "[F/FF]" + "U".repeat(unitDigits);
            this.showError(`Invalid code length. Expected ${minLen}-${maxLen} digits. Format: [${format}]`);
            this.resetFields();
            return;
        }

        this.parseAndValidate(code);
    },

    parseAndValidate: function (code) {
        const currentBuilding = window.selectedBuildingId || window.currentProjectId || "";
        const currentBuildingNum = currentBuilding.replace(/\D/g, '');

        // Dynamic Parsing
        const isB15 = currentBuildingNum === '15';
        const unitDigits = isB15 ? 3 : 2;
        const bLen = currentBuildingNum.length || 3;

        // 🚀 Detect Shop Pattern (e.g. 9S10, 10S3B)
        const shopRegex = /^(\d+)S(\d+)([ABC]?)$/i;
        const shopMatch = code.match(shopRegex);

        if (shopMatch) {
            const buildingNumInCode = shopMatch[1];
            const shopNum = shopMatch[2];
            const modelSuffix = shopMatch[3] ? shopMatch[3].toUpperCase() : '';

            // ✅ VALID if we are in "SHOPS" building OR if building number matches
            if (currentBuilding.toUpperCase().includes("SHOPS") || buildingNumInCode === currentBuildingNum) {
                const displayNum = shopNum + (modelSuffix ? `-${modelSuffix}` : '');
                this.showSuccess(`✅ Shop Detected${modelSuffix ? ' (Model ' + modelSuffix + ')' : ''}`);
                this.fillFields("Ground Floor", displayNum, true);
                return;
            }
        }

        // Standard Apartment Logic
        const digitsOnly = code.replace(/\D/g, '');
        if (digitsOnly.length < (bLen + unitDigits + 1)) return; // Too short to parse yet

        const buildingCode = digitsOnly.substring(0, bLen);
        const unitNum = digitsOnly.slice(-unitDigits);
        const floorCode = digitsOnly.substring(bLen, digitsOnly.length - unitDigits);

        // 1. Validate Building
        if (currentBuildingNum && buildingCode !== currentBuildingNum) {
            this.showError(`Unit Code ${code} does not belong to Building ${currentBuilding}`);
            this.resetFields();
            return;
        }

        // 2. Validate Floor (Supports 0-50 now)
        if (!this.floors[floorCode]) {
            this.showError(`Invalid floor code '${floorCode}' – allowed range is 0 to 50`);
            this.resetFields();
            return;
        }

        // 3. Validate Unit Number
        const unitInt = parseInt(unitNum, 10);
        const maxUnit = isB15 ? 999 : 99;
        if (unitInt < 1 || unitInt > maxUnit) {
            const range = isB15 ? "001-999" : "01-99";
            this.showError(`Invalid unit number '${unitNum}' (Allowed: ${range})`);
            this.resetFields();
            return;
        }

        // ✅ Valid Apartment
        this.showSuccess();
        this.fillFields(this.floors[floorCode], unitNum, false);
    },

    fillFields: function (floorName, unitNum, isShop) {
        const floorInput = document.getElementById(this.elements.inputFloor);
        const unitNumInput = document.getElementById(this.elements.inputUnitNum);
        const viewSelect = document.getElementById('new-unit-view');

        if (floorInput) floorInput.value = floorName;
        if (unitNumInput) unitNumInput.value = unitNum;

        // 🛡️ SHOP LOGIC: No View for shops
        if (viewSelect) {
            if (isShop) {
                viewSelect.value = "Main Road View"; // Defaulting to Main Road or similar for shops
                viewSelect.disabled = true;
                viewSelect.style.opacity = '0.5';
                viewSelect.style.cursor = 'not-allowed';
            } else {
                viewSelect.disabled = false;
                viewSelect.style.opacity = '1';
                viewSelect.style.cursor = 'pointer';
            }
        }

        this.toggleSubmit(true);
    },

    resetFields: function () {
        const floorInput = document.getElementById(this.elements.inputFloor);
        const unitNumInput = document.getElementById(this.elements.inputUnitNum);
        const viewSelect = document.getElementById('new-unit-view');

        if (floorInput) floorInput.value = '';
        if (unitNumInput) unitNumInput.value = '';

        if (viewSelect) {
            viewSelect.disabled = false;
            viewSelect.style.opacity = '1';
            viewSelect.style.cursor = 'pointer';
        }

        this.toggleSubmit(false);
    },

    showError: function (msg) {
        const fb = document.getElementById(this.elements.feedback);
        const codeValue = document.getElementById(this.elements.inputCode).value;

        if (fb) {
            fb.textContent = msg;
            fb.style.color = '#ef4444';
        }
        document.getElementById(this.elements.inputCode).style.borderColor = '#ef4444';

        // Log Rejected Entry for Audit (If it was a full attempt)
        const currentBuilding = window.selectedBuildingId || window.currentProjectId || "";
        const expectedLength = (currentBuilding.replace(/\D/g, '').length || 3) + 3;

        if (codeValue.length === expectedLength && window.robelAdminAPI && window.robelAdminAPI.logActivity) {
            window.robelAdminAPI.logActivity('REJECTED_ENTRY', {
                reason: 'VALIDATION_FAILED',
                code: codeValue,
                error: msg,
                project: currentBuilding || 'Unknown'
            });
        }

    },

    showSuccess: function (msg = "✅ Valid Code") {
        const fb = document.getElementById(this.elements.feedback);
        if (fb) {
            fb.textContent = msg;
            fb.style.color = '#10b981';
        }
        document.getElementById(this.elements.inputCode).style.borderColor = '#10b981';
    },

    toggleSubmit: function (enable) {
        const btn = document.querySelector(this.elements.submitBtn);
        if (btn) {
            btn.disabled = !enable;
            btn.style.opacity = enable ? '1' : '0.5';
            btn.style.cursor = enable ? 'pointer' : 'not-allowed';
        }
    }
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    AdminSmartEntry.init();
});

// Expose
window.AdminSmartEntry = AdminSmartEntry;
