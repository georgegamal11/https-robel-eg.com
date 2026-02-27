/**
 * AuthSystem - Cloudflare Native Authentication
 * Handles Login, Register, Session Management, and UI Injection.
 * Optimized for: robust ID matching with index.html
 */

// Auth System - Safe for Bundling
window.AuthSystem = {
    state: {
        currentView: 'selection', // selection, email, phone
        mode: 'login' // login or register
    },

    init: function () {
        console.log("🔐 AuthSystem: Initializing...");
        this.setupListeners();
        this.checkAuthState();
    },

    // --- UI Navigation ---

    openModal: function () {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.classList.add('active');
            modal.style.display = 'flex'; // Ensure flex for centering
            this.switchView('selection');
        } else {
            console.error("Auth Modal not found in DOM");
        }
    },

    closeModal: function () {
        const modal = document.getElementById('auth-modal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.style.display = 'none', 300); // Wait for fade out
        }
    },

    switchView: function (viewName) {
        this.state.currentView = viewName;

        const views = ['selection', 'email', 'phone'];
        views.forEach(v => {
            const el = document.getElementById(`auth-step-${v}`);
            if (el) el.style.display = 'none';
        });

        // Show target view
        const target = document.getElementById(`auth-step-${viewName}`);
        if (target) {
            target.style.display = 'block';
            target.classList.add('active');
        }
    },

    showMethod: function (method) {
        if (method === 'google') {
            alert("Google Authentication coming soon.");
            return;
        }
        if (method === 'phone') {
            this.switchView('phone');
            return;
        }
        if (method === 'guest') {
            // Guest "login" - just close modal
            this.closeModal();
            return;
        }
    },

    handleQuickEmail: function () {
        const quickInput = document.getElementById('quick-email-input');
        if (!quickInput) return;

        const email = quickInput.value.trim();

        if (!email) {
            alert("Please enter your email address.");
            return;
        }

        // Pre-fill the main login form
        const mainInput = document.getElementById('auth-email');
        if (mainInput) mainInput.value = email;

        this.switchView('email');
    },

    // --- Authentication Logic ---

    toggleEmailMode: function (e) {
        if (e) e.preventDefault();
        const isLogin = this.state.mode === 'login';
        this.state.mode = isLogin ? 'register' : 'login';

        // Update UI Text
        const title = document.querySelector('[data-i18n="email_login_title"]');
        const submitBtn = document.querySelector('#emailAuthForm button[type="submit"]');
        const toggleLink = document.getElementById('email-mode-toggle');
        const noAccountText = document.querySelector('[data-i18n="no_account"]');

        if (this.state.mode === 'register') {
            if (title) title.textContent = "Create Account";
            if (submitBtn) submitBtn.textContent = "Sign Up";
            if (toggleLink) toggleLink.textContent = "Log In";
            if (noAccountText) noAccountText.textContent = "Already have an account? ";
        } else {
            if (title) title.textContent = "Email Login";
            if (submitBtn) submitBtn.textContent = "Login";
            if (toggleLink) toggleLink.textContent = "Sign Up";
            if (noAccountText) noAccountText.textContent = "Don't have an account? ";
        }
    },

    handleEmailsubmit: async function () {
        const emailInput = document.getElementById('auth-email');
        const passInput = document.getElementById('auth-password');
        const btn = document.querySelector('#emailAuthForm button[type="submit"]');

        if (!emailInput || !passInput) return;

        const email = emailInput.value;
        const password = passInput.value;

        if (!email || !password) {
            alert("Please fill in all fields.");
            return;
        }

        this.setLoading(btn, true);

        try {
            const endpoint = this.state.mode === 'enter_mode_here_but_logic_below';
            // Better logic: use register endpoint if mode is register
            const url = this.state.mode === 'register'
                ? 'https://robel-api.george-gamal139.workers.dev/api/auth/register'
                : 'https://robel-api.george-gamal139.workers.dev/api/auth/login';

            const payload = { email, password };

            if (this.state.mode === 'register') {
                payload.username = email.split('@')[0];
                payload.role = 'staff';
            }

            const resp = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await resp.json();

            if (resp.ok && result.success) {
                this.saveSession(result);
            } else {
                console.error("Login Error:", result);
                this.showError(result.error || 'Authentication failed: ' + (result.message || 'Unknown error'));
            }
        } catch (error) {
            this.showError(error.message);
        } finally {
            this.setLoading(btn, false);
        }
    },

    // --- Session & State ---

    setupListeners: function () {
        // Close button
        const closeBtn = document.getElementById('close-auth');
        if (closeBtn) closeBtn.onclick = () => this.closeModal();

        // Bind to existing Login Buttons
        const loginBtn = document.getElementById('login-btn');
        const sidebarBtn = document.getElementById('sidebar-login-btn'); // if exists
        const topBtn = document.getElementById('login-btn-top'); // if exists
        const mobileBtn = document.querySelector('.logout-pill-btn.mobile-only');

        const opener = (e) => { e.preventDefault(); this.openModal(); };

        if (loginBtn) loginBtn.onclick = opener;
        if (sidebarBtn) sidebarBtn.onclick = opener;
        if (topBtn) topBtn.onclick = opener;
        if (mobileBtn) mobileBtn.onclick = opener;

        // No fallback floating button - only show login if buttons exist in HTML

        // Global opener
        window.openAuthModal = () => this.openModal();
        window.AuthSystem = this; // Expose globally for inline onclicks
    },


    saveSession: function (data) {
        localStorage.setItem('cf_auth_token', data.token);
        localStorage.setItem('isLoggedIn', 'true');
        const userRole = data.user.role || 'staff';
        localStorage.setItem('userRole', userRole);

        if (userRole === 'admin') localStorage.setItem('isAdmin', 'true');
        if (userRole === 'reporter') localStorage.setItem('isReporter', 'true');

        this.closeModal();
        this.checkAuthState();

        alert(`Welcome, ${data.user.username || 'User'}!`);

        // Reload if specialized role to unlock features
        if (userRole === 'admin' || userRole === 'reporter') {
            setTimeout(() => location.reload(), 1000);
        }
    },

    checkAuthState: async function () {
        const token = localStorage.getItem('cf_auth_token');
        if (!token) {
            // PURGE LEGACY FLAGS: Ensure old admin sessions are cleared if no new token exists
            localStorage.removeItem('isAdmin');
            localStorage.removeItem('userRole');
            localStorage.setItem('isLoggedIn', 'false');

            this.updateUIForGuest();
            return;
        }

        // Optimistic UI update
        this.updateButtons(true);

        try {
            const resp = await fetch('https://robel-api.george-gamal139.workers.dev/api/auth/verify', {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (resp.ok) {
                const { user } = await resp.json();
                window.currentUser = user;
                this.updateUIForUser(user);
            } else {
                throw new Error("Session expired");
            }
        } catch (e) {
            this.logout(false);
        }
    },

    updateUIForUser: function (user) {
        this.updateButtons(true);
        const isAdmin = user.role === 'admin';
        const isReporter = user.role === 'reporter';

        if (isAdmin || isReporter) {
            document.querySelectorAll('.admin-only-ui').forEach(el =>
                el.style.setProperty('display', 'inline-flex', 'important'));
        }
    },

    updateUIForGuest: function () {
        this.updateButtons(false);
        document.querySelectorAll('.admin-only-ui').forEach(el =>
            el.style.setProperty('display', 'none', 'important'));
    },

    updateButtons: function (isLoggedIn) {
        const text = isLoggedIn ? 'Logout' : 'Login';
        const icon = isLoggedIn ? 'fa-sign-out-alt' : 'fa-lock';

        const updateBtn = (btn) => {
            if (!btn) return;
            // Respect existing structure if complex, else exact replace
            if (btn.querySelector('span')) {
                const span = btn.querySelector('span');
                span.textContent = text;
                // Update data-i18n if present to prevent overwrite
                span.setAttribute('data-i18n', isLoggedIn ? 'logout_btn' : 'login_btn');
            } else {
                btn.textContent = text;
            }

            // clear inline onclicks
            btn.onclick = isLoggedIn ? (e) => { e.preventDefault(); this.logout(true); } : (e) => { e.preventDefault(); this.openModal(); };
        };

        const ids = ['login-btn', 'sidebar-login-btn', 'login-btn-top'];
        ids.forEach(id => updateBtn(document.getElementById(id)));

        // Handle class-based buttons
        document.querySelectorAll('.logout-pill-btn').forEach(btn => updateBtn(btn));
    },

    logout: function (reload = true) {
        if (reload && !confirm("Are you sure you want to logout?")) return;
        localStorage.removeItem('cf_auth_token');
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userRole');
        localStorage.removeItem('isAdmin');
        localStorage.removeItem('isReporter');
        if (reload) location.reload();
        else this.updateUIForGuest();
    },

    showError: function (msg) {
        alert(msg);
    },

    setLoading: function (btn, isLoading) {
        if (!btn) return;
        if (isLoading) {
            btn.dataset.original = btn.textContent;
            btn.textContent = 'Processing...';
            btn.disabled = true;
        } else {
            btn.textContent = btn.dataset.original || 'Submit';
            btn.disabled = false;
        }
    }
};

// Initialize
window.AuthSystem = AuthSystem;
document.addEventListener('DOMContentLoaded', () => {
    AuthSystem.init();
});
