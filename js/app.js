import { Router } from './utils/router.js';
import { I18n } from './utils/i18n.js';
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
        this.isInitialized = false;
        // Make app globally accessible for components
        window.app = this;
    }

    async init() {
        showLoading();

        try {
            // Initialize i18n
            await this.i18n.init();

            // Setup routes
            this.setupRoutes();

            // Setup auth state listener
            this.setupAuthListener();

            // Setup event listeners
            this.setupEventListeners();

            this.router.handleRoute();

            this.isInitialized = true;
            hideLoading();
        } catch (error) {
            console.error('App initialization error:', error);
            hideLoading();
            showToast('Failed to initialize app', 'error');
        }
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
        AuthService.onAuthStateChanged(async (user) => {
            const nav = document.getElementById('main-nav');
            //const authButtons = document.getElementById('auth-buttons');
            const userMenu = document.getElementById('user-menu');

            if (user) {
                // User is signed in
                nav.style.display = 'flex';
                //authButtons.style.display = 'none';
                userMenu.style.display = 'flex';

                // Update user display name
                const userNameEl = document.getElementById('user-name');
                if (userNameEl) {
                    userNameEl.textContent = user.displayName || user.email;
                }

                // Redirect to dashboard if on login page
                const currentPath = this.router.getCurrentPath();
                if (currentPath === '/login' || currentPath === '/' || currentPath === '/signup') {
                    this.router.navigate('/dashboard');
                }
            } else {
                // User is signed out
                nav.style.display = 'none';
                //authButtons.style.display = 'flex';
                userMenu.style.display = 'none';

                // Redirect to login if on protected page
                const currentPath = this.router.getCurrentPath();
                if (currentPath !== '/signup' && currentPath !== '/login' && currentPath !== '/') {
                    this.router.navigate('/login');
                }
            }
        });
    }

    setupEventListeners() {
        // Language toggle
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

        // Navigation links
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-route]')) {
                e.preventDefault();
                const route = e.target.getAttribute('data-route');
                this.router.navigate(route);
            }
        });

        // Company selector
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
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    const app = new App();
    await app.init();
});

// Export for global access
window.App = App;