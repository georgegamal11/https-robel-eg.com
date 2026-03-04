// Language Management
var currentLang = 'en'; // Force English on every refresh as requested

function setLanguage(lang) {
    currentLang = lang;
    window.currentLang = lang; // Expose to other scripts
    localStorage.setItem('preferredLang', lang);
    const t = translations[lang];

    // Update Page attributes
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'en' ? 'ltr' : 'rtl';
    document.body.style.fontFamily = lang === 'en' ? '"Inter", sans-serif' : '"Tajawal", sans-serif';

    // Update Elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (t[key]) {
            if ((el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') && el.getAttribute('placeholder')) {
                el.placeholder = t[key];
            } else if (el.hasAttribute('data-i18n-placeholder')) {
                el.placeholder = t[key];
            } else {
                el.textContent = t[key];
            }
        }
    });

    // Specific logic for elements that use attribute-based translation
    document.querySelectorAll('[data-i18n-attr]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        const attr = el.getAttribute('data-i18n-attr');
        if (t[key]) {
            el.setAttribute(attr, t[key]);
        }
    });

    updateLangButtons(lang);
}

function updateLangButtons(lang) {
    const langBtns = document.querySelectorAll('.lang-toggle-btn');
    langBtns.forEach(btn => {
        btn.textContent = lang === 'en' ? 'AR' : 'EN';
    });
}

// Initialize AOS (Animate On Scroll)
document.addEventListener('DOMContentLoaded', function () {
    // Force scroll to top on refresh
    if ('scrollRestoration' in history) {
        history.scrollRestoration = 'manual';
    }
    window.scrollTo(0, 0);
    setTimeout(() => window.scrollTo(0, 0), 100); // Late correction for some browsers

    // Initial Language Apply
    if (typeof translations !== 'undefined') {
        const savedLang = localStorage.getItem('preferredLang') || 'en';
        setLanguage(savedLang);
    }

    // Lang Toggle Listener (All buttons)
    document.addEventListener('click', (e) => {
        if (e.target.classList.contains('lang-toggle-btn')) {
            const nextLang = currentLang === 'en' ? 'ar' : 'en';
            setLanguage(nextLang);
        }
    });

    if (typeof AOS !== 'undefined') {
        AOS.init({
            duration: 1000,
            once: true,
            offset: 100
        });
    }

    // FAQ logic
    document.querySelectorAll('.faq-item').forEach(item => {
        const header = item.querySelector('.faq-header');
        if (header) {
            header.addEventListener('click', () => {
                const isActive = item.classList.contains('active');
                document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));
                if (!isActive) item.classList.add('active');
            });
        }
    });
});

// Sidebar & Auth Logic
window.toggleSidebar = function (show) {
    const sb = document.getElementById('main-sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (!sb) return;

    if (show) {
        sb.classList.add('active');
        sb.classList.remove('closing');
        if (overlay) overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    } else {
        sb.classList.add('closing');
        if (overlay) overlay.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(() => {
            sb.classList.remove('active');
            sb.classList.remove('closing');
        }, 300);
    }
};

window.openAuthModal = function () {
    const modal = document.getElementById('auth-modal');
    if (modal) {
        modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
};

// --- Navigation & Redirection ---
if (typeof projectDetailPages === 'undefined') {
    var projectDetailPages = {
        "Porto Golf Marina": "porto-golf-marina.html",
        "Porto Said": "porto-said.html",
        "Celebration": "celebration.html",
        "New Alamein": "celebration.html"
    };
}

window.openProject = function (pName, forceViewUnits = false, filters = {}) {
    const getSlug = (name) => {
        if (!name) return "";
        const n = name.toLowerCase().trim();
        if (n.includes("golf")) return "porto-golf-marina";
        if (n.includes("said")) return "porto-said";
        if (n.includes("celebration") || n.includes("alamein")) return "celebration";
        return n.replace(/\s+/g, '-');
    };

    let normArea = pName;
    if (normArea.includes("Golf")) normArea = "Porto Golf Marina";
    if (normArea.includes("Said")) normArea = "Porto Said";
    if (normArea.includes("Celebration") || normArea.includes("Alamein")) normArea = "Celebration";

    const targetPage = projectDetailPages[normArea];
    const currentPage = window.location.pathname.split('/').pop().toLowerCase();

    if (targetPage && currentPage === targetPage.toLowerCase() && !forceViewUnits) {
        window.toggleSidebar(false);
        const section = document.getElementById('buildings');
        if (section) {
            section.scrollIntoView({ behavior: 'smooth' });
            return;
        }
    }

    if (targetPage && !forceViewUnits) {
        const slug = getSlug(pName);
        window.location.href = `${targetPage}?project=${slug}`;
        return;
    }

    const slug = getSlug(normArea);
    let url = `units.html?project=${slug}`;
    window.location.href = url;
};

// --- Standard Global Form Handler ---
document.addEventListener('submit', function (e) {
    const form = e.target;
    if (form && form.id === 'projectContactForm') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        const lang = (typeof currentLang !== 'undefined') ? currentLang : 'en';
        const t = (typeof translations !== 'undefined' && translations[lang]) ? translations[lang] : {};
        const btn = form.querySelector('button[type="submit"]');
        const originalText = btn ? btn.innerHTML : 'Send';

        const nameVal = form.querySelector('#contactName')?.value;
        const phoneVal = form.querySelector('#contactPhone')?.value;

        if (!nameVal || !phoneVal) {
            alert(lang === 'en' ? "Please fill in Name and Phone" : "يرجى ملء الاسم ورقم الهاتف");
            return false;
        }

        if (typeof EmailService === 'undefined') {
            alert("Error: Email Service not loaded");
            return false;
        }

        if (btn) {
            btn.disabled = true;
            btn.innerHTML = lang === 'en' ? 'Sending...' : 'جاري الإرسال...';
        }

        EmailService.sendForm(form).then(result => {
            if (result.success) {
                alert(t.form_success || 'Thank you! Message sent.');
                form.reset();
            } else {
                alert((lang === 'en' ? 'Error: ' : 'خطأ: ') + result.error);
            }
        }).catch(err => {
            console.error("Send error:", err);
            alert("Critical Error: " + err.message);
        }).finally(() => {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });

        return false;
    }
}, true);
