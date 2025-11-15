export class ThemeManager {
    constructor() {
        this.themeToggle = null;
        this.themeIcon = null;
        this.bodyElement = document.body;
        this.currentTheme = 'light';
        this.init();
    }

    init() {
        this.themeToggle = document.getElementById('theme-toggle');
        this.themeIcon = document.getElementById('theme-icon');

        // Get saved theme from localStorage or default to 'light'
        this.currentTheme = localStorage.getItem('theme') || 'light';

        // Apply theme immediately to prevent flash
        this.setTheme(this.currentTheme); 
    }    

    toggleTheme() {
        // Simple toggle between light and dark
        const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        if (!['light', 'dark'].includes(theme)) {
            console.warn(`Invalid theme: ${theme}. Using 'light' instead.`);
            theme = 'light';
        }

        this.currentTheme = theme;
        localStorage.setItem('theme', theme);
        this.applyTheme(theme);
        this.updateIcon();

        // Dispatch custom event for other parts of the app
        window.dispatchEvent(new CustomEvent('themeChanged', {
            detail: { theme }
        }));
    }

    applyTheme(theme) {
        // Remove existing theme classes
        this.bodyElement.classList.remove('light-mode', 'dark-mode');

        if (theme === 'light') {
            this.bodyElement.classList.add('light-mode');
        } else if (theme === 'dark') {
            this.bodyElement.classList.add('dark-mode');
        }
    }

    updateIcon() {
        if (!this.themeIcon) return;

        if (this.currentTheme === 'light') {
            this.themeIcon.className = 'fas fa-sun';
            this.themeToggle?.setAttribute('title', 'Switch to dark mode');
            this.themeToggle?.setAttribute('aria-label', 'Switch to dark mode');
        } else {
            this.themeIcon.className = 'fas fa-moon';
            this.themeToggle?.setAttribute('title', 'Switch to light mode');
            this.themeToggle?.setAttribute('aria-label', 'Switch to light mode');
        }
    }

    getCurrentTheme() {
        return this.currentTheme;
    }

    isDarkMode() {
        return this.currentTheme === 'dark';
    }

    isLightMode() {
        return this.currentTheme === 'light';
    }
}