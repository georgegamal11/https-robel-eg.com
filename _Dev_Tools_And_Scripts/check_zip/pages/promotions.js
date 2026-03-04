
/* ==========================================================================
   OFFERS COUNTDOWN LOGIC
   ========================================================================== */
(function () {
    console.log("⏳ Initializing Promotions Timer...");

    function startOffersCountdown() {
        // Select all timer elements (both desktop and mobile/responsive copies)
        const elements = document.querySelectorAll('#timer-val-horiz, #timer-val-horiz-1, .countdown-val');

        if (elements.length === 0) {
            console.warn("⚠️ No timer elements found.");
            return;
        }

        // Set end date to 15 days from now (Simulated rolling offer)
        let endDate = new Date();
        endDate.setDate(endDate.getDate() + 15);

        function updateTimer() {
            const now = new Date().getTime();
            const distance = endDate - now;

            if (distance < 0) {
                elements.forEach(el => {
                    el.innerText = "EXPIRED";
                });
                return;
            }

            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));

            // Format: 15d 23h
            const timeString = `${days}d ${hours}h`;

            elements.forEach(el => {
                el.innerText = timeString;
            });
        }

        updateTimer();
        setInterval(updateTimer, 60000); // Update every minute
        console.log("✅ Promotions Timer Started.");
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startOffersCountdown);
    } else {
        startOffersCountdown();
    }
})();
