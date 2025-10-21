export class I18n {
    constructor() {
        this.currentLang = localStorage.getItem('lang') || 'en';
        this.translations = {};
    }

    // Initialize i18n
    async init() {
        await this.loadTranslations(this.currentLang);
        this.updatePageText();
        this.updateDirection();
    }

    // Load translation file
    async loadTranslations(lang) {
        try {
            const response = await fetch(`./locales/${lang}.json`);
            this.translations = await response.json();
            this.currentLang = lang;
            localStorage.setItem('lang', lang);
        } catch (error) {
            console.error('Error loading translations:', error);
            // Fallback to English
            if (lang !== 'en') {
                await this.loadTranslations('en');
            }
        }
    }

    // Get translation
    t(key, params = {}) {
        let translation = this.translations[key] || key;

        // Replace parameters
        Object.keys(params).forEach(param => {
            translation = translation.replace(`{${param}}`, params[param]);
        });

        return translation;
    }

    // Update all text on page
    updatePageText() {
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            element.textContent = this.t(key);
        });

        // Update placeholders
        document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
            const key = element.getAttribute('data-i18n-placeholder');
            element.placeholder = this.t(key);
        });

        // Update titles
        document.querySelectorAll('[data-i18n-title]').forEach(element => {
            const key = element.getAttribute('data-i18n-title');
            element.title = this.t(key);
        });
    }

    // Switch language
    async switchLanguage(lang) {
        await this.loadTranslations(lang);
        this.updatePageText();
        this.updateDirection();

        // Trigger custom event for components to update
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { lang } }));
    }

    // Update text direction for RTL languages
    updateDirection() {
        const isRTL = this.currentLang === 'ar';
        document.documentElement.setAttribute('dir', isRTL ? 'rtl' : 'ltr');
        document.documentElement.setAttribute('lang', this.currentLang);
    }

    // Get current language
    getCurrentLang() {
        return this.currentLang;
    }

    // Check if current language is RTL
    isRTL() {
        return this.currentLang === 'ar';
    }
}