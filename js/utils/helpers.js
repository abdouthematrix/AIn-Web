// Format date to locale string
export function formatDate(date, locale = 'en-US') {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString(locale, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Format time to locale string
export function formatTime(date, locale = 'en-US') {
    if (!date) return '';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit'
    });
}

// Format datetime
export function formatDateTime(date, locale = 'en-US') {
    return `${formatDate(date, locale)} ${formatTime(date, locale)}`;
}

// Show loading spinner
export function showLoading(container = document.body) {
    const spinner = document.createElement('div');
    spinner.className = 'loading-spinner';
    spinner.innerHTML = '<div class="spinner"></div>';
    spinner.id = 'loading-spinner';
    container.appendChild(spinner);
}

// Hide loading spinner
export function hideLoading() {
    const spinner = document.getElementById('loading-spinner');
    if (spinner) {
        spinner.remove();
    }
}

// Create toast container if not exists
function getToastContainer() {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        document.body.appendChild(container);
    }
    return container;
}

// Show toast notification with icons + stacking + progress
export function showToast(messageKey, type = 'info', duration = 3000) {
    const container = getToastContainer();

    // Get translated message
    const message = window.app?.i18n?.t(messageKey) || messageKey;

    const iconMap = {
        success: '<i class="fas fa-check-circle"></i>',
        error: '<i class="fas fa-exclamation-circle"></i>',
        warning: '<i class="fas fa-exclamation-triangle"></i>',
        info: '<i class="fas fa-info-circle"></i>',
    };

    // Create toast item
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.style.setProperty("--toast-duration", `${duration}ms`);

    toast.innerHTML = `
        <div class="toast-content">
            ${iconMap[type] || iconMap.info}
            <span>${message}</span>
        </div>
        <div class="progress"></div>
    `;

    container.appendChild(toast);

    // Animate show
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Schedule auto hide
    setTimeout(() => {
        toast.classList.remove('show');
        toast.classList.add('hide');
        toast.addEventListener("transitionend", () => toast.remove());
    }, duration);

    // Limit max visible toasts to 4
    if (container.children.length > 4) {
        container.firstChild.remove();
    }
}


// Show confirmation dialog with icons
export function showConfirm(message, onConfirm, onCancel) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
    <div class="modal-content">
      <div class="confirm-icon">
        <i class="fas fa-question-circle"></i>
      </div>
      <p>${message}</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" id="cancel-btn">
          <i class="fas fa-times"></i>
          <span data-i18n="cancel">Cancel</span>
        </button>
        <button class="btn btn-primary" id="confirm-btn">
          <i class="fas fa-check"></i>
          <span data-i18n="confirm">Confirm</span>
        </button>
      </div>
    </div>
  `;

    document.body.appendChild(modal);
    modal.style.display = 'flex';

    // Update i18n for dynamically added content
    if (window.app?.i18n) {
        window.app.i18n.updatePageText();
    }

    document.getElementById('confirm-btn').addEventListener('click', () => {
        modal.remove();
        if (onConfirm) onConfirm();
    });

    document.getElementById('cancel-btn').addEventListener('click', () => {
        modal.remove();
        if (onCancel) onCancel();
    });

    // Close on backdrop click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.remove();
            if (onCancel) onCancel();
        }
    });

    // ESC key to close
    const escHandler = (e) => {
        if (e.key === 'Escape') {
            modal.remove();
            if (onCancel) onCancel();
            document.removeEventListener('keydown', escHandler);
        }
    };
    document.addEventListener('keydown', escHandler);
}

// Debounce function
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Validate email
export function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

// Generate random ID
export function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

// Calculate distance between two GPS coordinates (in km)
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Format file size
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

// Sanitize HTML to prevent XSS
export function sanitizeHTML(str) {
    const temp = document.createElement('div');
    temp.textContent = str;
    return temp.innerHTML;
}

// Deep clone object
export function deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
}

// Check if mobile device
export function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// Format duration (minutes to hours:minutes)
export function formatDuration(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
}