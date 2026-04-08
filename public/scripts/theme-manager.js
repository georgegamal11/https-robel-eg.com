// Modern Theme Manager - Dark/Light Mode Toggle
// Supports localStorage + System Preference + Smooth Transitions

class ThemeManager {
    constructor() {
        this.init();
    }

    init() {
        // Create toggle button if not exists
        if (!document.getElementById('theme-toggle')) {
            this.createToggleButton();
        }

        this.currentTheme = this.getSavedTheme() || this.getSystemTheme();
        this.applyTheme(this.currentTheme);
        this.attachListeners();
    }

    createToggleButton() {
        const button = document.createElement('button');
        button.id = 'theme-toggle';
        button.className = 'theme-toggle';
        button.innerHTML = '<i class="fas fa-moon-stars" id="theme-icon"></i>';
        button.title = 'Toggle Theme';
        button.onclick = () => this.toggleTheme();
        
        // Position: Fixed top-right
        document.body.appendChild(button);
    }

    getSystemTheme() {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }

    getSavedTheme() {
        return localStorage.getItem('robel-theme');
    }

    saveTheme(theme) {
        localStorage.setItem('robel-theme', theme);
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        document.getElementById('theme-icon')?.className = 
            theme === 'dark' ? 'fas fa-sun-bright' : 'fas fa-moon-stars';
        
        this.currentTheme = theme;
        this.saveTheme(theme);
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        
        // Smooth transition
        document.documentElement.style.transition = 'background-color 0.4s ease, color 0.4s ease';
        setTimeout(() => {
            document.documentElement.style.transition = '';
        }, 400);
    }

    attachListeners() {
        // System preference change
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!this.getSavedTheme()) {
                this.applyTheme(e.matches ? 'dark' : 'light');
            }
        });

        // Keyboard shortcut
        document.addEventListener('keydown', (e) => {
            if (e.key === 't' && e.ctrlKey) {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', () => {
    new ThemeManager();
});

// Export for global use
window.toggleTheme = () => new ThemeManager().toggleTheme();

// Auto-init for existing buttons
document.querySelectorAll('[onclick*="toggleTheme"]').forEach(btn => {
    btn.onclick = () => new ThemeManager().toggleTheme();
});

