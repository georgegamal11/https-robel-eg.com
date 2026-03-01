// Email Service - Safe for Bundling
window.EmailService = {
    CONFIG: {
        PUBLIC_KEY: "artQACl169k7ELy62",
        SERVICE_ID: "service_fvp448i",
        TEMPLATE_ID: "template_bt158wt"
    },
    initialized: false,

    init: function () {
        if (typeof emailjs !== 'undefined') {
            emailjs.init(this.CONFIG.PUBLIC_KEY);
            this.initialized = true;
            console.log("✉️ EmailService: Initialized");
        } else {
            console.warn("✉️ EmailService: Library not found");
        }
    },

    // --- FINAL CLEAN SUBMISSION ---
    sendHomeForm: async function (formId) {
        if (!this.initialized) this.init();

        const form = document.getElementById(formId);
        if (!form) return { success: false, error: "Form not found" };

        try {
            // High-precision data extraction
            const payload = {
                Full_Name: (form.querySelector('[name="Full_Name"]')?.value || form.querySelector('#contactName')?.value || '').trim(),
                Phone_Number: (form.querySelector('[name="Phone_Number"]')?.value || form.querySelector('#contactPhone')?.value || '').trim(),
                Preferred_Project_Type: (form.querySelector('[name="Preferred_Project_Type"]')?.value || form.querySelector('#unitType')?.value || '').trim(),
                Additional_Message: (form.querySelector('[name="Additional_Message"]')?.value || form.querySelector('#additionalMessage')?.value || '').trim()
            };

            console.log("✉️ Sending exact payload to EmailJS:");
            console.table(payload);

            if (!payload.Full_Name || !payload.Phone_Number) {
                return { success: false, error: "Missing Name or Phone" };
            }

            const response = await emailjs.send(
                this.CONFIG.SERVICE_ID,
                this.CONFIG.TEMPLATE_ID,
                payload
            );

            return { success: true };
        } catch (error) {
            console.error("✉️ Transmission Error:", error);
            return { success: false, error: error.text || error.message };
        }
    },

    // Legacy sendForm for other pages
    sendForm: async function (formElement) {
        if (!this.initialized) this.init();
        try {
            const response = await emailjs.sendForm(this.CONFIG.SERVICE_ID, this.CONFIG.TEMPLATE_ID, formElement);
            return { success: true, response };
        } catch (error) {
            return { success: false, error: error.text || error.message };
        }
    },
    // Legacy/Generic send method
    send: async function (params) {
        if (!this.initialized) this.init();
        try {
            const response = await emailjs.send(
                this.CONFIG.SERVICE_ID,
                this.CONFIG.TEMPLATE_ID,
                params
            );
            return { success: true, response };
        } catch (error) {
            return { success: false, error: error.message || error };
        }
    }
};

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => EmailService.init());
} else {
    EmailService.init();
}

window.EmailService = EmailService;
