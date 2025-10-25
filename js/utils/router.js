import { AuthService } from '../services/auth.js';

export class Router {
    constructor() {
        this.routes = {};
        this.currentRoute = null;
        this.contentElement = document.getElementById('app-content');

        // Listen for hash changes
        window.addEventListener('hashchange', () => this.handleRoute());
       // window.addEventListener('popstate', () => this.handleRoute());
    }

    // Register a route
    register(path, handler, options = {}) {
        this.routes[path] = {
            handler,
            requireAuth: options.requireAuth || false,
            roles: options.roles || null, // ['owner', 'manager', 'employee']
            title: options.title || 'A-In'
        };
    }

    // Navigate to a route
    navigate(path) {
        window.location.hash = path;
    }

    // Get current path (without query parameters)
    getCurrentPath() {
        return window.location.hash.slice(1) || '/';        
    }

    // Get full hash including query params
    getFullHash() {
        return window.location.hash.slice(1) || '/';
    }

    // Handle route change
    async handleRoute() {       
        const path = this.getCurrentPath();

        // Split by ? to remove query parameters from the path
        const pathWithoutQuery = path.split('?')[0];

        // Prevent re-rendering only if both path AND query params are identical
        if (path === this.currentRouteWithQuery) return;

        const route = this.routes[pathWithoutQuery] || this.routes['/404'];

        if (!route) {
            this.showError('Route not found');
            return;
        }

        // Check authentication
        if (route.requireAuth && !AuthService.isAuthenticated()) {
            this.navigate('/login');
            return;
        }

        // Check role access
        if (route.roles && AuthService.currentCompanyId) {
            const userRole = await AuthService.getUserRole(AuthService.currentCompanyId);
            if (!route.roles.includes(userRole)) {
                this.showError('Access denied. You do not have permission to view this page.');
                return;
            }
        }

        // Update page title
        document.title = route.title;

        // Execute route handler
        try {
            this.currentRoute = pathWithoutQuery;
            this.currentRouteWithQuery = path; // Store full path with query params
            await route.handler();
            this.updateNavigation();
        } catch (error) {
            console.error('Route handler error:', error);
            this.showError('An error occurred while loading the page.');
        }
    }

    // Update navigation UI based on current route and user role
    updateNavigation() {
        const navLinks = document.querySelectorAll('[data-route]');
        navLinks.forEach(link => {
            const linkPath = link.getAttribute('data-route');
            if (linkPath === this.currentRoute) {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });

        // Show/hide navigation items based on role
        this.updateRoleBasedNav();
    }

    // Update navigation based on user role
    updateRoleBasedNav() {
        const role = AuthService.userRole;

        // Hide all role-specific items first
        document.querySelectorAll('[data-role-required]').forEach(el => {
            el.style.display = 'none';
        });

        // Show items for current role
        if (role) {
            document.querySelectorAll(`[data-role-required*="${role}"]`).forEach(el => {
                el.style.display = '';
            });
        }
    }

    // Show error message
    showError(message) {
        if (this.contentElement) {
            this.contentElement.innerHTML = `
        <div class="error-container">
          <div class="error-message">
            <h2 data-i18n="error">Error</h2>
            <p>${message}</p>
            <button onclick="window.history.back()" data-i18n="go-back">Go Back</button>
          </div>
        </div>
      `;
        }
    }

    // Render content to app
    render(html) {
        if (this.contentElement) {
            this.contentElement.innerHTML = html;
        }
    }

    // Get query parameters from hash
    getQueryParams() {
        const hash = window.location.hash;
        const queryString = hash.includes('?') ? hash.split('?')[1] : '';
        const params = {};

        if (queryString) {
            queryString.split('&').forEach(param => {
                const [key, value] = param.split('=');
                if (key && value) {
                    params[key] = decodeURIComponent(value);
                }
            });
        }

        return params;
    }
}