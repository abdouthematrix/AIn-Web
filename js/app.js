/**
 * Updated app.js with Header Manager integration
 * Replace your existing app.js setupEventListeners and setupAuthListener methods
 */

import { Router } from './utils/router.js';
import { I18n } from './utils/i18n.js';
import { ThemeManager } from './utils/theme-manager.js';
import { AuthService } from './services/auth.js';
import { showToast, showLoading, hideLoading } from './utils/helpers.js';
import { HeaderManager } from './utils/header-manager.js'; // Import header manager

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
        this.headerManager = new HeaderManager();
        this.isInitialized = false;
        window.app = this;
    }

    async init() {
        showLoading();

        try {
            // Initialize theme manager first
            this.themeManager.init();

            // Initialize i18n
            await this.i18n.init();

            // Initialize header manager
            this.headerManager.init();

            // Setup routes BEFORE auth listener
            this.setupRoutes();

            // Wait for initial auth state before handling route
            await this.waitForInitialAuth();

            // Setup auth state listener (after initial check)
            this.setupAuthListener();

            // Setup event listeners
            this.setupEventListeners();

            this.isInitialized = true;
            hideLoading();
        } catch (error) {
            console.error('App initialization error:', error);
            hideLoading();
            showToast('Failed to initialize app', 'error');
        }
    }

    waitForInitialAuth() {
        return new Promise((resolve) => {
            const unsubscribe = AuthService.onAuthStateChanged((user) => {
                unsubscribe();
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
        let isInitialLoad = true;

        AuthService.onAuthStateChanged(async (user) => {
            const currentPath = this.router.getCurrentPath();
            if (user) {
                // User is signed in
                let userRole = null;
                let currentCompanyName = null;

                try {
                    const companies = await AuthService.getUserCompanies();
                    const currentCompanyId = AuthService.currentCompanyId;

                    // Get user role for current company
                    if (currentCompanyId) {
                        userRole = await AuthService.getUserRole(currentCompanyId);
                        const currentCompany = companies.find(c => c.id === currentCompanyId);
                        currentCompanyName = currentCompany?.name;
                    }

                    // Update user info with role
                    this.headerManager.updateUserInfo(user, userRole, currentCompanyName);

                    // Update company selector
                    await this.headerManager.updateCompanySelector(companies, currentCompanyId);

                    // Update header authentication state
                    this.headerManager.updateAuthState(!!user);
                } catch (error) {
                    console.error('Error updating header info:', error);
                    // Update user info without role if error occurs
                    this.headerManager.updateUserInfo(user);
                }

                // Optional: Update notification count
                // this.headerManager.updateNotificationCount(5);

                if (isInitialLoad) {
                    if (currentPath === '/' || currentPath === '/login' || currentPath === '/signup') {
                        return this.router.navigate('/dashboard');
                    }
                    return this.router.handleRoute();
                } else {
                    if (currentPath === '/login' || currentPath === '/' || currentPath === '/signup') {
                        return this.router.navigate('/dashboard');
                    }
                }
            } else {
                // Update header authentication state
                this.headerManager.updateAuthState(!!user);
                // User is signed out
                if (currentPath !== '/login' && currentPath !== '/' && currentPath !== '/signup') {
                    return this.router.navigate('/login');
                }

                if (isInitialLoad) {
                    return this.router.handleRoute();
                }
            }    
            isInitialLoad = false;
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

        // Navigation links - Delegated event listener
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-route]');
            if (target) {
                e.preventDefault();
                const route = target.getAttribute('data-route');
                this.router.navigate(route);
            }
        });

        // Optional: Listen for theme changes
        window.addEventListener('themeChanged', (e) => {
            console.log('Theme changed to:', e.detail.theme);
        });
    }

    // Public API methods
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

    showToast(messageKey, type = 'info', duration = 3000) {
        showToast(messageKey, type, duration);
    }

    // Helper method to update breadcrumb from any page
    updateBreadcrumb(items) {
        this.headerManager.updateBreadcrumb(items);
    }

    // Helper method to update notification count
    updateNotificationCount(count) {
        this.headerManager.updateNotificationCount(count);
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    await app.init();
});

// Export for global access
window.App = App;