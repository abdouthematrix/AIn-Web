import { Router } from './utils/router.js';
import { I18n } from './utils/i18n.js';
import { ThemeManager } from './utils/theme-manager.js';
import { AuthService } from './services/auth.js';
import { showToast, showLoading, hideLoading } from './utils/helpers.js';

// Import page handlers
import { renderLogin } from './components/login.js';
import { renderSignup } from './components/signup.js';
import { renderDashboard } from './components/dashboard.js';
import { renderAttendance } from './components/attendance-check.js';
import { renderCompanySetup } from './components/company-setup.js';
import { renderJoinCompany } from './components/join-company.js';
import { renderEmployeeList } from './components/employee-list.js';
import { renderAttendanceHistory } from './components/attendance-history.js';
import { renderProfile } from './components/profile.js';

class App {
    constructor() {
        this.router = new Router();
        this.i18n = new I18n();
        this.themeManager = new ThemeManager();
        this.isInitialized = false;
        // Make app globally accessible for components
        window.app = this;
    }

    async init() {
        showLoading();

        try {
            // Initialize theme manager first
            this.themeManager.init();

            // Initialize i18n
            await this.i18n.init();

            // Setup routes BEFORE auth listener
            this.setupRoutes();

            // Wait for initial auth state before handling route
            await this.waitForInitialAuth();

            // Setup auth state listener (after initial check)
            this.setupAuthListener();

            // Setup event listeners
            this.setupEventListeners();

            // Handle initial route (now safe because auth is ready)
            this.router.handleRoute();

            this.isInitialized = true;
            hideLoading();
        } catch (error) {
            console.error('App initialization error:', error);
            hideLoading();
            showToast('Failed to initialize app', 'error');
        }
    }

    // Add new method to wait for initial auth state
    waitForInitialAuth() {
        return new Promise((resolve) => {
            const unsubscribe = AuthService.onAuthStateChanged((user) => {
                unsubscribe(); // Unsubscribe after first call
                resolve(user);
            });
        });
    }

    setupRoutes() {
        // Public routes
        this.router.register('/', renderLogin, { title: 'A-In - Login' });
        this.router.register('/login', renderLogin, { title: 'A-In - Login' });
        this.router.register('/signup', renderSignup, { title: 'A-In - Sign Up' });

        // Protected routes
        this.router.register('/dashboard', renderDashboard, {
            requireAuth: true,
            title: 'A-In - Dashboard'
        });

        this.router.register('/attendance', renderAttendance, {
            requireAuth: true,
            roles: ['employee', 'manager', 'owner'],
            title: 'A-In - Attendance'
        });

        this.router.register('/company-setup', renderCompanySetup, {
            requireAuth: true,
            title: 'A-In - Company Setup'
        });

        this.router.register('/join-company', renderJoinCompany, {
            requireAuth: true,
            title: 'A-In - Join Company'
        });

        this.router.register('/employees', renderEmployeeList, {
            requireAuth: true,
            roles: ['manager', 'owner'],
            title: 'A-In - Employees'
        });

        this.router.register('/attendance-history', renderAttendanceHistory, {
            requireAuth: true,
            title: 'A-In - Attendance History'
        });

        this.router.register('/profile', renderProfile, {
            requireAuth: true,
            title: 'A-In - Profile'
        });

        // 404 route
        this.router.register('/404', () => {
            this.router.showError('Page not found');
        }, { title: 'A-In - 404' });
    }

    setupAuthListener() {
        let isInitialLoad = true; // Add flag to track first auth state change

        AuthService.onAuthStateChanged(async (user) => {
            const nav = document.getElementById('main-nav');
            const userMenu = document.getElementById('user-menu');

            if (user) {
                // User is signed in
                if (nav) nav.style.display = 'flex';
                if (userMenu) userMenu.style.display = 'flex';

                // Update user display name
                const userNameEl = document.getElementById('user-name');
                if (userNameEl) {
                    userNameEl.textContent = user.displayName || user.email;
                }

                // Only redirect on actual login, not on page refresh
                const currentPath = this.router.getCurrentPath();
                if (!isInitialLoad && (currentPath === '/login' || currentPath === '/' || currentPath === '/signup')) {
                    this.router.navigate('/dashboard');
                }
            } else {
                // User is signed out
                if (nav) nav.style.display = 'none';
                if (userMenu) userMenu.style.display = 'none';

                // Redirect to login if on protected page
                const currentPath = this.router.getCurrentPath();
                if (currentPath !== '/signup' && currentPath !== '/login' && currentPath !== '/') {
                    this.router.navigate('/login');
                }
            }

            isInitialLoad = false; // After first auth state change
        });
    }

    setupEventListeners() {   
        // Theme toggle button
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => {
                this.themeManager.toggleTheme();
            });
        }

        // Language toggle button
        const langToggle = document.getElementById('lang-toggle');
        if (langToggle) {
            langToggle.addEventListener('click', () => {
                const newLang = this.i18n.getCurrentLang() === 'en' ? 'ar' : 'en';
                this.i18n.switchLanguage(newLang);
            });
        }

        // Logout button
        const logoutBtn = document.getElementById('logout-btn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await AuthService.signOut();
                    showToast(this.i18n.t('logged-out'), 'success');
                    this.router.navigate('/login');
                } catch (error) {
                    showToast(this.i18n.t('error-logout'), 'error');
                }
            });
        }

        // Navigation links - Delegated event listener
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-route]');
            if (target) {
                e.preventDefault();
                const route = target.getAttribute('data-route');
                this.router.navigate(route);
            }
        });

        // Company selector (if exists)
        const companySelector = document.getElementById('company-selector');
        if (companySelector) {
            companySelector.addEventListener('change', async (e) => {
                const companyId = e.target.value;
                try {
                    await AuthService.setCurrentCompany(companyId);
                    showToast(this.i18n.t('company-switched'), 'success');
                    this.router.handleRoute(); // Refresh current page
                } catch (error) {
                    showToast(this.i18n.t('error-switch-company'), 'error');
                }
            });
        }

        // Optional: Listen for theme changes (for analytics, logging, etc.)
        window.addEventListener('themeChanged', (e) => {
            console.log('Theme changed to:', e.detail.theme);
            // You can add additional logic here, such as:
            // - Analytics tracking
            // - Updating dynamic chart colors
            // - Refreshing components that depend on theme
        });
    }

    // Public API methods for accessing app functionality
    getTheme() {
        return this.themeManager.getCurrentTheme();
    }

    setTheme(theme) {
        this.themeManager.setTheme(theme);
    }

    isDarkMode() {
        return this.themeManager.isDarkMode();
    }

    isLightMode() {
        return this.themeManager.isLightMode();
    }

    getCurrentLanguage() {
        return this.i18n.getCurrentLang();
    }

    switchLanguage(lang) {
        this.i18n.switchLanguage(lang);
    }
    switchLanguage(lang) {
        this.i18n.switchLanguage(lang);
    }
    showToast(messageKey, type = 'info', duration = 3000) {
        showToast(messageKey, type, duration);
    }

}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    await app.init();
});

// Export for global access
window.App = App;