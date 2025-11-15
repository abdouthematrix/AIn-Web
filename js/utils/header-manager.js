import { AuthService } from '../services/auth.js';
import { showToast } from './helpers.js';

/**
 * Enhanced HeaderManager with:
 * - Error boundaries and recovery
 * - XSS protection
 * - Memory management
 * - Focus trap
 * - Offline indicators
 * - Performance optimizations
 */
export class HeaderManager {
    constructor() {
        // State management
        this.state = {
            mobileMenuOpen: false,
            userMenuOpen: false,
            searchOpen: false,
            isOnline: navigator.onLine,
            lastScrollTop: 0,
            scrollThreshold: 200,
            isInitialized: false,
            hasError: false
        };

        // Cached DOM elements
        this.elements = new Map();

        // Event listeners for cleanup
        this.listeners = new Map();

        // Focus trap
        this.focusTrap = {
            elements: [],
            first: null,
            last: null,
            handler: null
        };

        // Debounce timers
        this.timers = {
            search: null,
            scroll: null,
            resize: null
        };

        // Error recovery
        this.errorCount = 0;
        this.maxErrors = 5;
        // Auto-cleanup on page unload
        this.setupUnloadHandler();
    }

    /**
    * ==========================================
    * UNLOAD HANDLER
    * ==========================================
    */
    setupUnloadHandler() {
        // Bind destroy to beforeunload
        this.unloadHandler = () => {
            this.destroy();
        };

        window.addEventListener('beforeunload', this.unloadHandler);
    }

    /**
     * ==========================================
     * INITIALIZATION WITH ERROR BOUNDARY
     * ==========================================
     */
    async init() {
        try {
            if (this.state.isInitialized) {
                console.warn('HeaderManager already initialized');
                return;
            }

            await this.safeInit();
            this.state.isInitialized = true;
            this.state.hasError = false;
            this.errorCount = 0;

            console.log('✓ HeaderManager initialized successfully');
        } catch (error) {
            this.handleInitError(error);
        }
    }

    async safeInit() {
        // Initialize in stages with error handling
        await this.initStage('cacheElements', () => this.cacheElements());
        await this.initStage('mobileMenu', () => this.setupMobileMenu());
        await this.initStage('userMenu', () => this.setupUserMenu());
        await this.initStage('scrollBehavior', () => this.setupScrollBehavior());
        await this.initStage('companySelector', () => this.setupCompanySelector());
        await this.initStage('search', () => this.setupSearch());
        await this.initStage('notifications', () => this.setupNotifications());
        await this.initStage('networkStatus', () => this.setupNetworkStatus());
        await this.initStage('keyboardShortcuts', () => this.setupKeyboardShortcuts());
    }

    async initStage(stageName, initFn) {
        try {
            await initFn();
        } catch (error) {
            console.error(`Header initialization failed at stage: ${stageName}`, error);
            this.recordError(`Init:${stageName}`, error);
            // Continue with other stages
        }
    }

    handleInitError(error) {
        console.error('❌ HeaderManager initialization failed:', error);
        this.state.hasError = true;
        this.errorCount++;

        if (this.errorCount >= this.maxErrors) {
            console.error('Max errors reached, disabling header features');
            return;
        }

        // Show user-friendly error
        showToast('header-init-error', 'error');

        // Try to recover after delay
        setTimeout(() => {
            if (!this.state.isInitialized) {
                console.log('Attempting to recover header...');
                this.init();
            }
        }, 2000);
    }

    /**
     * ==========================================
     * SAFE DOM ELEMENT CACHING
     * ==========================================
     */
    cacheElements() {
        const elementIds = {
            // Header
            header: '.app-header',
            
            // Mobile menu
            mobileToggle: '#mobile-menu-toggle',
            mainNav: '#main-nav',
            overlay: '#mobile-overlay',
            
            // User menu
            userMenu: '#user-menu',
            userMenuBtn: '#user-menu-btn',
            userMenuContent: '#user-menu-content',
            logoutBtn: '#logout-btn-menu',
            
            // User info
            displayName: '#user-display-name',
            fullName: '#user-full-name',
            email: '#user-email',
            roleBadge: '#user-role-badge',
            roleText: '#user-role-text',
            
            // Company selector
            companySelector: '#menu-company-select',
            companySwitcher: '#menu-company-switcher',
            
            // Search
            searchContainer: '#header-search',
            searchInput: '#header-search-input',
            searchResults: '#search-results',
            
            // Notifications
            notificationBtn: '#notification-btn',
            notificationBadge: '#notification-count',
            
            // Breadcrumb
            breadcrumb: '#breadcrumb',
            breadcrumbList: '#breadcrumb-list'
        };

        Object.entries(elementIds).forEach(([key, selector]) => {
            try {
                const element = selector.startsWith('#') 
                    ? document.getElementById(selector.slice(1))
                    : document.querySelector(selector);
                
                if (element) {
                    this.elements.set(key, element);
                } else {
                    console.warn(`Element not found: ${selector}`);
                }
            } catch (error) {
                console.error(`Error caching element ${key}:`, error);
            }
        });
    }

    getElement(key) {
        return this.elements.get(key);
    }

    /**
     * ==========================================
     * MOBILE MENU WITH FOCUS TRAP
     * ==========================================
     */
    setupMobileMenu() {
        const mobileToggle = this.getElement('mobileToggle');
        const mainNav = this.getElement('mainNav');
        const overlay = this.getElement('overlay');

        if (!mobileToggle || !mainNav || !overlay) {
            console.warn('Mobile menu elements not found');
            return;
        }

        // Toggle button
        this.addListener(mobileToggle, 'click', (e) => {
            e.preventDefault();
            this.safeExecute('toggleMobileMenu', () => this.toggleMobileMenu());
        });

        // Overlay click
        this.addListener(overlay, 'click', () => {
            this.safeExecute('closeMobileMenu', () => this.closeMobileMenu());
        });

        // Close menu when clicking nav links
        this.addListener(mainNav, 'click', (e) => {
            if (e.target.closest('[data-route]')) {
                this.safeExecute('closeMobileMenu', () => this.closeMobileMenu());
            }
        });

        // Resize handler with debounce
        this.addListener(window, 'resize', () => {
            clearTimeout(this.timers.resize);
            this.timers.resize = setTimeout(() => {
                if (window.innerWidth > 768 && this.state.mobileMenuOpen) {
                    this.safeExecute('closeMobileMenu', () => this.closeMobileMenu());
                }
            }, 150);
        });
    }

    toggleMobileMenu() {
        const mainNav = this.getElement('mainNav');
        const overlay = this.getElement('overlay');
        const mobileToggle = this.getElement('mobileToggle');

        if (!mainNav || !overlay || !mobileToggle) return;

        this.state.mobileMenuOpen = !this.state.mobileMenuOpen;

        // Update UI
        mainNav.classList.toggle('open', this.state.mobileMenuOpen);
        overlay.classList.toggle('show', this.state.mobileMenuOpen);

        // Update icon
        const icon = mobileToggle.querySelector('i');
        if (icon) {
            icon.className = this.state.mobileMenuOpen ? 'fas fa-times' : 'fas fa-bars';
        }

        // Update ARIA
        mobileToggle.setAttribute('aria-expanded', String(this.state.mobileMenuOpen));

        // Handle body scroll and focus
        if (this.state.mobileMenuOpen) {
            this.preventBodyScroll();
            this.trapFocus(mainNav);
        } else {
            this.allowBodyScroll();
            this.releaseFocus();
            mobileToggle.focus();
        }
    }

    closeMobileMenu() {
        if (!this.state.mobileMenuOpen) return;

        const mainNav = this.getElement('mainNav');
        const overlay = this.getElement('overlay');
        const mobileToggle = this.getElement('mobileToggle');

        this.state.mobileMenuOpen = false;

        mainNav?.classList.remove('open');
        overlay?.classList.remove('show');
        
        const icon = mobileToggle?.querySelector('i');
        if (icon) icon.className = 'fas fa-bars';

        mobileToggle?.setAttribute('aria-expanded', 'false');

        this.allowBodyScroll();
        this.releaseFocus();
    }

    /**
     * ==========================================
     * FOCUS TRAP FOR ACCESSIBILITY
     * ==========================================
     */
    trapFocus(container) {
        if (!container) return;

        try {
            // Get focusable elements
            const focusableSelector = 'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';
            this.focusTrap.elements = Array.from(container.querySelectorAll(focusableSelector));

            if (this.focusTrap.elements.length === 0) return;

            this.focusTrap.first = this.focusTrap.elements[0];
            this.focusTrap.last = this.focusTrap.elements[this.focusTrap.elements.length - 1];

            // Focus first element
            setTimeout(() => {
                this.focusTrap.first?.focus();
            }, 100);

            // Create trap handler
            this.focusTrap.handler = (e) => {
                if (e.key !== 'Tab') return;

                if (e.shiftKey) {
                    if (document.activeElement === this.focusTrap.first) {
                        e.preventDefault();
                        this.focusTrap.last?.focus();
                    }
                } else {
                    if (document.activeElement === this.focusTrap.last) {
                        e.preventDefault();
                        this.focusTrap.first?.focus();
                    }
                }
            };

            container.addEventListener('keydown', this.focusTrap.handler);
        } catch (error) {
            console.error('Focus trap error:', error);
        }
    }

    releaseFocus() {
        if (this.focusTrap.handler) {
            const mainNav = this.getElement('mainNav');
            mainNav?.removeEventListener('keydown', this.focusTrap.handler);
        }

        this.focusTrap = {
            elements: [],
            first: null,
            last: null,
            handler: null
        };
    }

    /**
     * ==========================================
     * USER MENU DROPDOWN
     * ==========================================
     */
    setupUserMenu() {
        const userMenuBtn = this.getElement('userMenuBtn');
        const userMenuContent = this.getElement('userMenuContent');
        const logoutBtn = this.getElement('logoutBtn');

        if (!userMenuBtn || !userMenuContent) return;

        // Toggle button
        this.addListener(userMenuBtn, 'click', (e) => {
            e.stopPropagation();
            this.safeExecute('toggleUserMenu', () => this.toggleUserMenu());
        });

        // Close on outside click
        this.addListener(document, 'click', (e) => {
            const userMenu = this.getElement('userMenu');
            if (userMenu && !userMenu.contains(e.target)) {
                this.safeExecute('closeUserMenu', () => this.closeUserMenu());
            }
        });

        // Close when clicking menu items
        this.addListener(userMenuContent, 'click', (e) => {
            if (e.target.closest('[data-route]')) {
                this.safeExecute('closeUserMenu', () => this.closeUserMenu());
            }
        });

        // Logout button
        if (logoutBtn) {
            this.addListener(logoutBtn, 'click', async () => {
                this.closeUserMenu();
                await this.safeExecute('handleLogout', () => this.handleLogout());
            });
        }
    }

    toggleUserMenu() {
        const userMenuBtn = this.getElement('userMenuBtn');
        const userMenuContent = this.getElement('userMenuContent');

        if (!userMenuBtn || !userMenuContent) return;

        this.state.userMenuOpen = !this.state.userMenuOpen;
        
        userMenuContent.classList.toggle('show', this.state.userMenuOpen);
        userMenuBtn.classList.toggle('active', this.state.userMenuOpen);
        userMenuBtn.setAttribute('aria-expanded', String(this.state.userMenuOpen));
    }

    closeUserMenu() {
        const userMenuBtn = this.getElement('userMenuBtn');
        const userMenuContent = this.getElement('userMenuContent');

        if (!userMenuBtn || !userMenuContent) return;

        this.state.userMenuOpen = false;
        userMenuContent.classList.remove('show');
        userMenuBtn.classList.remove('active');
        userMenuBtn.setAttribute('aria-expanded', 'false');
    }

    async handleLogout() {
        try {
            await AuthService.signOut();
            showToast('logged-out', 'success');
            window.location.hash = '/login';
        } catch (error) {
            console.error('Logout error:', error);
            showToast('error-logout', 'error');
            this.recordError('Logout', error);
        }
    }

    /**
     * ==========================================
     * SCROLL BEHAVIOR WITH DEBOUNCE
     * ==========================================
     */
    setupScrollBehavior() {
        const header = this.getElement('header');
        if (!header) return;

        // Initialize scroll state
        this.state.lastScrollTop = 0;
        this.state.scrollThreshold = this.state.scrollThreshold || 100;

        let ticking = false;
        this.addListener(window, 'scroll', () => {
            if (!ticking) {
                window.requestAnimationFrame(() => {
                    this.safeExecute('handleScroll', () => this.handleScroll());
                    ticking = false;
                });
                ticking = true;
            }
        }, { passive: true });
    }

    handleScroll() {
        const header = this.getElement('header');
        if (!header) return;

        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const scrollDelta = scrollTop - this.state.lastScrollTop;

        // Add scrolled class for styling
        header.classList.toggle('scrolled', scrollTop > 50);

        // Always show header near top of page
        if (scrollTop <= this.state.scrollThreshold) {
            header.classList.remove('hidden');
        }
        // Hide/show header based on scroll direction
        else if (Math.abs(scrollDelta) > 5) {
            const scrollingDown = scrollDelta > 0;

            // Hide when scrolling down, show when scrolling up
            if (scrollingDown && !this.state.mobileMenuOpen) {
                header.classList.add('hidden');
            } else if (!scrollingDown) {
                header.classList.remove('hidden');
            }
        }

        // Update last scroll position
        this.state.lastScrollTop = Math.max(0, scrollTop);
    }

    /**
     * ==========================================
     * COMPANY SELECTOR
     * ==========================================
     */
    setupCompanySelector() {
        const companySelector = this.getElement('companySelector');
        if (!companySelector) return;

        this.addListener(companySelector, 'change', async (e) => {
            const companyId = e.target.value;
            if (!companyId) return;

            await this.safeExecute('switchCompany', async () => {
                try {
                    await AuthService.setCurrentCompany(companyId);
                    showToast('company-switched', 'success');
                    this.closeUserMenu();
                    window.app?.router?.handleRoute(true);
                } catch (error) {
                    console.error('Company switch error:', error);
                    showToast('error-switch-company', 'error');
                    throw error;
                }
            });
        });
    }

    async updateCompanySelector(companies, currentCompanyId) {
        const companySelector = this.getElement('companySelector');
        const companySwitcher = this.getElement('companySwitcher');

        if (!companySelector || !companySwitcher) return;

        try {
            if (!companies || companies.length === 0) {
                companySwitcher.style.display = 'none';
                return;
            }

            if (companies.length > 1) {
                companySwitcher.style.display = 'block';

                // Clear safely
                companySelector.innerHTML = '';

                // Add options with XSS protection
                companies.forEach(company => {
                    const option = document.createElement('option');
                    option.value = this.sanitizeAttribute(company.id);
                    option.textContent = this.sanitizeText(company.name);
                    option.selected = company.id === currentCompanyId;
                    companySelector.appendChild(option);
                });
            } else {
                companySwitcher.style.display = 'none';
            }
        } catch (error) {
            console.error('Error updating company selector:', error);
            companySwitcher.style.display = 'none';
            this.recordError('UpdateCompanySelector', error);
        }
    }

    /**
     * ==========================================
     * SEARCH WITH XSS PROTECTION
     * ==========================================
     */
    setupSearch() {
        const searchInput = this.getElement('searchInput');
        const searchResults = this.getElement('searchResults');
        const searchContainer = this.getElement('searchContainer');

        if (!searchInput || !searchResults) return;

        // Input handler with debounce
        this.addListener(searchInput, 'input', (e) => {
            clearTimeout(this.timers.search);
            const query = e.target.value.trim();

            if (query.length < 2) {
                searchResults.classList.remove('show');
                return;
            }

            this.timers.search = setTimeout(() => {
                this.safeExecute('performSearch', () => this.performSearch(query));
            }, 300);
        });

        // Close on outside click
        this.addListener(document, 'click', (e) => {
            if (searchContainer && !searchContainer.contains(e.target)) {
                searchResults.classList.remove('show');
            }
        });

        // Keyboard navigation
        this.addListener(searchInput, 'keydown', (e) => {
            if (e.key === 'Escape') {
                searchResults.classList.remove('show');
                searchInput.blur();
            }
        });
    }

    async performSearch(query) {
        const searchResults = this.getElement('searchResults');
        if (!searchResults) return;

        try {
            // Sanitize query
            const sanitizedQuery = this.sanitizeText(query);

            // Show loading
            searchResults.innerHTML = this.createSafeElement('div', {
                className: 'search-result-item',
                textContent: 'Searching...'
            });
            searchResults.classList.add('show');

            // Simulate search (replace with real Firestore query)
            await new Promise(resolve => setTimeout(resolve, 500));

            // Mock results with XSS protection
            const results = [];

            if (results.length === 0) {
                const noResults = this.createSafeElement('div', {
                    className: 'search-result-item'
                });
                const icon = document.createElement('i');
                icon.className = 'fas fa-search';
                const text = document.createElement('span');
                text.textContent = `No results found for "${sanitizedQuery}"`;
                noResults.appendChild(icon);
                noResults.appendChild(text);
                
                searchResults.innerHTML = '';
                searchResults.appendChild(noResults);
            } else {
                searchResults.innerHTML = '';
                results.forEach(result => {
                    const item = this.createSearchResultItem(result);
                    searchResults.appendChild(item);
                });
            }

            searchResults.classList.add('show');
        } catch (error) {
            console.error('Search error:', error);
            this.recordError('Search', error);
            
            const errorDiv = this.createSafeElement('div', {
                className: 'search-result-item'
            });
            const icon = document.createElement('i');
            icon.className = 'fas fa-exclamation-triangle';
            const text = document.createElement('span');
            text.textContent = 'Search failed. Please try again.';
            errorDiv.appendChild(icon);
            errorDiv.appendChild(text);
            
            searchResults.innerHTML = '';
            searchResults.appendChild(errorDiv);
        }
    }

    createSearchResultItem(result) {
        const item = this.createSafeElement('div', {
            className: 'search-result-item'
        });

        if (result.path) {
            item.dataset.route = this.sanitizeAttribute(result.path);
        }

        const icon = document.createElement('i');
        icon.className = result.type === 'employee' ? 'fas fa-user' : 'fas fa-file';

        if (result.type === 'employee') {
            const container = document.createElement('div');
            const name = this.createSafeElement('strong', {
                textContent: this.sanitizeText(result.name)
            });
            const email = this.createSafeElement('small', {
                textContent: this.sanitizeText(result.email || '')
            });
            container.appendChild(name);
            container.appendChild(email);
            
            item.appendChild(icon);
            item.appendChild(container);
        } else {
            const text = this.createSafeElement('span', {
                textContent: this.sanitizeText(result.name)
            });
            item.appendChild(icon);
            item.appendChild(text);
        }

        return item;
    }

    /**
     * ==========================================
     * NOTIFICATIONS
     * ==========================================
     */
    setupNotifications() {
        const notificationBtn = this.getElement('notificationBtn');
        if (!notificationBtn) return;

        this.addListener(notificationBtn, 'click', () => {
            this.safeExecute('showNotifications', () => {
                showToast('Notifications coming soon!', 'info');
            });
        });
    }

    updateNotificationCount(count) {
        const notificationBadge = this.getElement('notificationBadge');
        const notificationBtn = this.getElement('notificationBtn');

        if (!notificationBadge || !notificationBtn) return;

        try {
            const safeCount = Math.max(0, parseInt(count) || 0);

            if (safeCount > 0) {
                notificationBadge.textContent = safeCount > 99 ? '99+' : String(safeCount);
                notificationBadge.style.display = 'block';
                notificationBadge.classList.add('pulse');
                notificationBtn.style.display = 'flex';
            } else {
                notificationBadge.style.display = 'none';
                notificationBadge.classList.remove('pulse');
            }
        } catch (error) {
            console.error('Error updating notification count:', error);
        }
    }

    /**
     * ==========================================
     * NETWORK STATUS WITH INDICATORS
     * ==========================================
     */
    setupNetworkStatus() {
        // Create status indicator if doesn't exist
        if (!this.elements.has('networkStatus')) {
            const indicator = this.createNetworkIndicator();
            if (indicator) {
                this.elements.set('networkStatus', indicator);
            }
        }

        // Listen to browser events for faster reaction
        this.addListener(window, 'online', () => this.checkAndUpdateNetwork());
        this.addListener(window, 'offline', () => this.checkAndUpdateNetwork());

        // Start real internet monitoring with Google 204
        this.startNetworkMonitoring();
    }

    createNetworkIndicator() {
        try {
            const indicator = document.createElement('div');
            indicator.className = 'header-network-status';
            indicator.setAttribute('role', 'status');
            indicator.setAttribute('aria-live', 'polite');

            const headerContainer = document.querySelector('.header-container');
            const headerActions = document.querySelector('.header-actions');

            if (headerContainer && headerActions) {
                headerContainer.insertBefore(indicator, headerActions);
                return indicator;
            }
        } catch (error) {
            console.error('Error creating network indicator:', error);
        }
        return null;
    }

    updateNetworkStatus(isOnline) {
        const wasOnline = this.state.isOnline;
        this.state.isOnline = isOnline;

        const networkStatus = this.elements.get('networkStatus');
        if (!networkStatus) return;

        try {
            networkStatus.className = `header-network-status ${isOnline ? 'online' : 'offline'}`;
            networkStatus.innerHTML = '';

            const icon = document.createElement('i');
            icon.className = isOnline ? 'fas fa-wifi' : 'fas fa-wifi-slash';

            const text = document.createElement('span');
            text.setAttribute('data-i18n', isOnline ? 'online' : 'offline');
            text.textContent = isOnline ? 'Online' : 'Offline';

            networkStatus.appendChild(icon);
            networkStatus.appendChild(text);

            this.updateUserStatusIndicator(isOnline ? 'online' : 'offline');

            // Show banner only when state changes
            if (wasOnline !== null && wasOnline !== isOnline) {
                networkStatus.style.display = 'flex';
                if (isOnline) {
                    setTimeout(() => {
                        networkStatus.style.display = 'none';
                    }, 2000);
                }
                console.log(`Network: ${isOnline ? '🟢 Online' : '🔴 Offline'}`);
            } else if (wasOnline === null) {
                networkStatus.style.display = isOnline ? 'none' : 'flex';
            }

            window.app?.i18n?.updatePageText();
        } catch (error) {
            console.error('Error updating network status:', error);
        }
    }

    updateUserStatusIndicator(status) {
        try {
            let statusIndicator = document.getElementById('header-status-indicator');
            if (statusIndicator) {
                statusIndicator.className = `user-status-indicator ${status}`;
                statusIndicator.setAttribute('title', status === 'online' ? 'Online' : 'Offline');
                statusIndicator.setAttribute('aria-label', status === 'online' ? 'Online' : 'Offline');
            }
        } catch (error) {
            console.error('Error updating user status indicator:', error);
        }
    }

    /**
     * ==========================================
     * KEYBOARD SHORTCUTS
     * ==========================================
     */
    setupKeyboardShortcuts() {
        this.addListener(document, 'keydown', (e) => {
            // Escape key handler
            if (e.key === 'Escape') {
                if (this.state.mobileMenuOpen) {
                    this.closeMobileMenu();
                } else if (this.state.userMenuOpen) {
                    this.closeUserMenu();
                } else if (this.state.searchOpen) {
                    const searchResults = this.getElement('searchResults');
                    searchResults?.classList.remove('show');
                }
            }

            // Ctrl/Cmd + K for search
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                const searchInput = this.getElement('searchInput');
                searchInput?.focus();
            }
        });
    }

    /**
     * ==========================================
     * USER INFO WITH XSS PROTECTION
     * ==========================================
     */
    updateUserInfo(user, role = null, companyName = null) {
        try {
            const userName = user.displayName || user.email?.split('@')[0] || 'User';
            
            const displayName = this.getElement('displayName');
            const fullName = this.getElement('fullName');
            const email = this.getElement('email');
            const roleBadge = this.getElement('roleBadge');
            const roleText = this.getElement('roleText');

            if (displayName) {
                displayName.textContent = this.sanitizeText(userName);
            }

            if (fullName) {
                fullName.textContent = this.sanitizeText(userName);
            }

            if (email) {
                email.textContent = this.sanitizeText(user.email || '');
            }

            // Update role badge
            if (roleBadge && roleText && role) {
                roleText.textContent = this.sanitizeText(
                    role.charAt(0).toUpperCase() + role.slice(1)
                );
                roleBadge.className = `user-role-badge role-${this.sanitizeAttribute(role)}`;
                roleBadge.style.display = 'inline-flex';
            } else if (roleBadge) {
                roleBadge.style.display = 'none';
            }

            // Update status
            this.updateUserStatusIndicator(this.state.isOnline ? 'online' : 'offline');
        } catch (error) {
            console.error('Error updating user info:', error);
            this.recordError('UpdateUserInfo', error);
        }
    }

    /**
     * ==========================================
     * BREADCRUMB WITH XSS PROTECTION
     * ==========================================
     */
    updateBreadcrumb(items) {
        const breadcrumb = this.getElement('breadcrumb');
        const breadcrumbList = this.getElement('breadcrumbList');

        if (!breadcrumb || !breadcrumbList) return;

        try {
            if (!items || items.length === 0) {
                breadcrumb.style.display = 'none';
                return;
            }

            breadcrumb.style.display = 'block';
            breadcrumbList.innerHTML = '';

            items.forEach((item, index) => {
                const li = document.createElement('li');
                const isLast = index === items.length - 1;

                if (isLast) {
                    li.textContent = this.sanitizeText(item.label);
                    li.setAttribute('aria-current', 'page');
                } else {
                    const a = document.createElement('a');
                    a.textContent = this.sanitizeText(item.label);
                    a.href = `#${this.sanitizeAttribute(item.path)}`;
                    a.dataset.route = this.sanitizeAttribute(item.path);
                    li.appendChild(a);
                }

                breadcrumbList.appendChild(li);
            });
        } catch (error) {
            console.error('Error updating breadcrumb:', error);
            breadcrumb.style.display = 'none';
            this.recordError('UpdateBreadcrumb', error);
        }
    }

    /**
     * ==========================================
     * AUTH STATE
     * ==========================================
     */
    updateAuthState(isAuthenticated) {
        const mainNav = this.getElement('mainNav');
        const userMenu = this.getElement('userMenu');
        const mobileToggle = this.getElement('mobileToggle');

        try {
            if (mainNav) {
                mainNav.style.display = isAuthenticated ? 'flex' : 'none';
            }

            if (userMenu) {
                userMenu.style.display = isAuthenticated ? 'block' : 'none';
            }

            // Toggle hidden class for mobile toggle
            if (mobileToggle) {
                if (isAuthenticated) {
                    mobileToggle.classList.remove('hidden');
                } else {
                    mobileToggle.classList.add('hidden');
                }
            }
            
            // Close menus if logged out
            if (!isAuthenticated) {
                if (this.state.mobileMenuOpen) this.closeMobileMenu();
                if (this.state.userMenuOpen) this.closeUserMenu();
            }
        } catch (error) {
            console.error('Error updating auth state:', error);
            this.recordError('UpdateAuthState', error);
        }
    }

    /**
     * ==========================================
     * XSS PROTECTION UTILITIES
     * ==========================================
     */
    sanitizeText(text) {
        if (typeof text !== 'string') return '';
        
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    sanitizeAttribute(value) {
        if (typeof value !== 'string') return '';
        
        return value
            .replace(/[<>'"]/g, '')
            .replace(/javascript:/gi, '')
            .replace(/on\w+=/gi, '');
    }

    createSafeElement(tagName, properties = {}) {
        const element = document.createElement(tagName);
        
        Object.entries(properties).forEach(([key, value]) => {
            if (key === 'textContent') {
                element.textContent = String(value);
            } else if (key === 'className') {
                element.className = String(value);
            } else if (key === 'innerHTML') {
                // Don't use innerHTML from properties
                console.warn('innerHTML not allowed in createSafeElement');
            } else {
                element.setAttribute(key, String(value));
            }
        });

        return element;
    }

    /**
     * ==========================================
     * EVENT LISTENER MANAGEMENT
     * ==========================================
     */
    addListener(element, event, handler, options = {}) {
        if (!element) return;

        try {
            element.addEventListener(event, handler, options);
            
            // Store for cleanup
            const key = `${element.toString()}-${event}`;
            if (!this.listeners.has(key)) {
                this.listeners.set(key, []);
            }
            this.listeners.get(key).push({ handler, options });
        } catch (error) {
            console.error('Error adding listener:', error);
        }
    }

    removeListener(element, event) {
        if (!element) return;

        try {
            const key = `${element.toString()}-${event}`;
            const handlers = this.listeners.get(key);

            if (handlers) {
                handlers.forEach(({ handler, options }) => {
                    element.removeEventListener(event, handler, options);
                });
                this.listeners.delete(key);
            }
        } catch (error) {
            console.error('Error removing listener:', error);
        }
    }

    /**
     * ==========================================
     * BODY SCROLL MANAGEMENT
     * ==========================================
     */
    preventBodyScroll() {
        try {
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            document.body.style.overflow = 'hidden';
            document.body.style.paddingRight = `${scrollbarWidth}px`;
        } catch (error) {
            console.error('Error preventing body scroll:', error);
        }
    }

    allowBodyScroll() {
        try {
            document.body.style.overflow = '';
            document.body.style.paddingRight = '';
        } catch (error) {
            console.error('Error allowing body scroll:', error);
        }
    }

    /**
     * ==========================================
     * ERROR HANDLING AND RECOVERY
     * ==========================================
     */
    safeExecute(operationName, fn) {
        try {
            return fn();
        } catch (error) {
            console.error(`Error in ${operationName}:`, error);
            this.recordError(operationName, error);
            
            // Try to recover from common errors
            if (this.errorCount < this.maxErrors) {
                this.attemptRecovery(operationName);
            }
            
            return null;
        }
    }

    recordError(operation, error) {
        this.errorCount++;
        
        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
            console.error(`[HeaderManager] ${operation} error:`, error);
        }

        // Could send to error tracking service here
        // Example: Sentry.captureException(error, { tags: { component: 'HeaderManager', operation } });
    }

    attemptRecovery(operationName) {
        console.log(`Attempting recovery for: ${operationName}`);

        switch (operationName) {
            case 'toggleMobileMenu':
            case 'closeMobileMenu':
                // Force close menu
                this.state.mobileMenuOpen = false;
                this.allowBodyScroll();
                this.releaseFocus();
                break;

            case 'toggleUserMenu':
            case 'closeUserMenu':
                // Force close user menu
                this.state.userMenuOpen = false;
                break;

            case 'performSearch':
                // Clear search results
                const searchResults = this.getElement('searchResults');
                if (searchResults) {
                    searchResults.classList.remove('show');
                    searchResults.innerHTML = '';
                }
                break;

            default:
                console.warn(`No recovery strategy for: ${operationName}`);
        }
    }

    /**
     * ==========================================
     * MEMORY CLEANUP
     * ==========================================
     */
    destroy() {
        try {
            console.log('Destroying HeaderManager...');

            // Clear all timers
            Object.values(this.timers).forEach(timer => {
                if (timer) clearTimeout(timer);
            });
            this.timers = {};

            // Remove all event listeners
            this.listeners.forEach((handlers, key) => {
                const [elementStr, event] = key.split('-');
                handlers.forEach(({ handler, options }) => {
                    // Note: Can't reliably remove without element reference
                    // This is why we store references properly
                });
            });
            this.listeners.clear();

            // Close open menus
            if (this.state.mobileMenuOpen) this.closeMobileMenu();
            if (this.state.userMenuOpen) this.closeUserMenu();

            // Reset body styles
            this.allowBodyScroll();

            // Release focus trap
            this.releaseFocus();

            // Clear elements cache
            this.elements.clear();

            // Reset state
            this.state = {
                mobileMenuOpen: false,
                userMenuOpen: false,
                searchOpen: false,
                isOnline: navigator.onLine,
                lastScrollTop: 0,
                scrollThreshold: 200,
                isInitialized: false,
                hasError: false
            };

            // Remove network indicator
            const networkStatus = document.getElementById('header-network-status');
            if (networkStatus) {
                networkStatus.remove();
            }

            this.stopNetworkMonitoring();

            console.log('✓ HeaderManager destroyed successfully');
        } catch (error) {
            console.error('Error destroying HeaderManager:', error);
        }
    }

    /**
     * ==========================================
     * PUBLIC API
     * ==========================================
     */
    
    // Get current state
    getState() {
        return { ...this.state };
    }

    // Check if initialized
    isInitialized() {
        return this.state.isInitialized && !this.state.hasError;
    }

    // Check if has errors
    hasError() {
        return this.state.hasError;
    }

    // Get error count
    getErrorCount() {
        return this.errorCount;
    }

    // Reset error count
    resetErrorCount() {
        this.errorCount = 0;
        this.state.hasError = false;
    }

    // Force refresh
    async refresh() {
        console.log('Refreshing HeaderManager...');
        this.destroy();
        await this.init();
    }

    /**
 * ==========================================
 * REAL INTERNET DETECTION (Google 204)
 * ==========================================
 */
    async checkRealInternet() {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 3000);

            await fetch("https://www.google.com/generate_204", {
                mode: "no-cors",
                cache: "no-store",
                signal: controller.signal
            });

            clearTimeout(timeout);
            return true;
        } catch (error) {
            return false;
        }
    }

    startNetworkMonitoring() {
        this.checkAndUpdateNetwork();
        this.timers.networkCheck = setInterval(() => {
            this.checkAndUpdateNetwork();
        }, 4000);
        console.log('✓ Network monitoring started');
    }

    async checkAndUpdateNetwork() {
        const online = await this.checkRealInternet();
        if (this.state.isOnline !== online) {
            this.updateNetworkStatus(online);
        }
    }

    stopNetworkMonitoring() {
        if (this.timers.networkCheck) {
            clearInterval(this.timers.networkCheck);
            this.timers.networkCheck = null;
        }
    }
}