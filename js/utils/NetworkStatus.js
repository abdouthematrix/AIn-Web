// Add this to your main app.js or create a new file: js/components/NetworkStatus.js

export class NetworkStatus {
    constructor() {
        this.indicator = null;
        this.init();
    }

    init() {
        // Create status indicator
        this.indicator = document.createElement('div');
        this.indicator.id = 'network-status';
        this.indicator.className = 'network-status';
        document.body.appendChild(this.indicator);

        // Listen to custom events from config.js
        window.addEventListener('app:online', () => this.showOnline());
        window.addEventListener('app:offline', () => this.showOffline());

        // Check initial status
        if (!navigator.onLine) {
            this.showOffline();
        }
    }

    showOffline() {
        this.indicator.innerHTML = `
            <i class="fas fa-wifi-slash"></i>
            <span data-i18n="working-offline">Working Offline</span>
        `;
        this.indicator.className = 'network-status offline show';

        // Update i18n if available
        if (window.app?.i18n) {
            window.app.i18n.updatePageText();
        }
    }

    showOnline() {
        this.indicator.innerHTML = `
            <i class="fas fa-wifi"></i>
            <span data-i18n="back-online">Back Online - Syncing...</span>
        `;
        this.indicator.className = 'network-status online show';

        // Update i18n if available
        if (window.app?.i18n) {
            window.app.i18n.updatePageText();
        }

        // Hide after 3 seconds
        setTimeout(() => {
            this.indicator.classList.remove('show');
        }, 3000);
    }
}