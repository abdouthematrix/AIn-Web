import { AuthService } from '../services/auth.js';
import { AttendanceService } from '../services/attendance.js';
import { CompanyService } from '../services/company.js';
import { showToast, showLoading, hideLoading, formatTime } from '../utils/helpers.js';

export async function renderAttendance() {
    showLoading();

    const user = AuthService.getCurrentUser();
    const companyId = AuthService.currentCompanyId;

    if (!companyId) {
        hideLoading();
        showToast('toast-select-company-first', 'error');
        window.location.hash = '/dashboard';
        return;
    }

    // Get company settings to check requireSelfie
    const company = await CompanyService.getCompany(companyId);
    const requireSelfie = company?.settings?.requireSelfie || false;

    const todayAttendance = await AttendanceService.getTodayAttendance(companyId, user.uid);

    // Calculate work hours if checked out
    const workHours = todayAttendance?.checkIn && todayAttendance?.checkOut
        ? AttendanceService.calculateWorkHours(todayAttendance.checkIn, todayAttendance.checkOut)
        : null;

    // Determine current status
    const isCheckedIn = todayAttendance && todayAttendance.checkIn;
    const isCheckedOut = todayAttendance && todayAttendance.checkOut;

    const content = `
    <div class="attendance-container fade-in">
      <div class="attendance-card">
        <!-- Header with current date/time -->
        <div class="attendance-header-section">
          <h1>
            <i class="fas fa-calendar-check"></i>
            <span data-i18n="attendance">Attendance</span>
          </h1>
          <div class="current-datetime">
            <i class="fas fa-calendar-day"></i>
            <span id="current-date-time"></span>
          </div>
        </div>
        
        ${isCheckedIn ? `
          <!-- Status: Checked In -->
          <div class="attendance-status ${isCheckedOut ? 'completed' : 'success'}">
            <div class="status-icon-wrapper">
              <div class="status-icon ${isCheckedOut ? 'completed' : 'active'}">
                ${isCheckedOut ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-user-clock"></i>'}
              </div>
              ${!isCheckedOut ? '<div class="pulse-ring"></div>' : ''}
            </div>
            
            <h2>
              <i class="fas fa-${isCheckedOut ? 'check-double' : 'user-check'}"></i>
              <span data-i18n="${isCheckedOut ? 'work-completed' : 'checked-in'}">${isCheckedOut ? 'Work Completed' : 'Checked In'}</span>
            </h2>
            
            <!-- Timeline View -->
            <div class="attendance-timeline">
              <div class="timeline-item completed">
                <div class="timeline-dot"></div>
                <div class="timeline-content">
                  <span class="timeline-label">
                    <i class="fas fa-sign-in-alt"></i>
                    <span data-i18n="check-in-time">Check-in time</span>
                  </span>
                  <strong class="timeline-value">${formatTime(todayAttendance.checkIn)}</strong>
                </div>
              </div>
              
              ${isCheckedOut ? `
                <div class="timeline-connector"></div>
                <div class="timeline-item completed">
                  <div class="timeline-dot"></div>
                  <div class="timeline-content">
                    <span class="timeline-label">
                      <i class="fas fa-sign-out-alt"></i>
                      <span data-i18n="check-out-time">Check-out time</span>
                    </span>
                    <strong class="timeline-value">${formatTime(todayAttendance.checkOut)}</strong>
                  </div>
                </div>
              ` : ''}
            </div>
            
            ${isCheckedOut ? `
              <!-- Work Summary Card -->
              <div class="work-summary-card">
                <div class="summary-stat">
                  <i class="fas fa-clock"></i>
                  <div>
                    <span data-i18n="work-duration">Work duration</span>
                    <strong>${workHours} <span data-i18n="hours">hours</span></strong>
                  </div>
                </div>
              </div>
            ` : `
              <!-- Active Session -->
              <div class="active-session-card">
                <div class="session-timer">
                  <i class="fas fa-hourglass-half animate-pulse"></i>
                  <div>
                    <span data-i18n="session-active">Session Active</span>
                    <strong id="work-timer">00:00</strong>
                  </div>
                </div>
                
                <button id="checkout-btn" class="btn btn-danger btn-large">
                  <i class="fas fa-sign-out-alt"></i>
                  <span data-i18n="check-out">Check Out</span>
                </button>
              </div>
            `}
          </div>
        ` : `
          <!-- Status: Not Checked In -->
          <div class="attendance-status pending">
            <div class="status-icon-wrapper">
              <div class="status-icon pending-icon">
                <i class="fas fa-user-clock"></i>
              </div>
            </div>
            
            <h2>
              <i class="fas fa-exclamation-circle"></i>
              <span data-i18n="not-checked-in-yet">Not Checked In Yet</span>
            </h2>
            <p class="status-message">
              <i class="fas fa-info-circle"></i>
              <span data-i18n="check-in-message">Ready to start your day? Check in now!</span>
            </p>
            
            ${requireSelfie ? `
              <!-- Selfie Info (Required by Company) -->
              <div class="checkin-options-card">
                <div class="option-info selfie-required">
                  <i class="fas fa-camera"></i>
                  <span data-i18n="selfie-required-info">Selfie verification is required by your company</span>
                </div>
              </div>
            ` : ''}
            
            <button id="checkin-btn" class="btn btn-primary btn-large btn-glow">
              <i class="fas fa-sign-in-alt"></i>
              <span data-i18n="check-in">Check In</span>
            </button>
          </div>
        `}
        
        <!-- Location Information -->
        <div class="attendance-info">
          <div class="info-header">
            <i class="fas fa-map-marker-alt"></i>
            <h3 data-i18n="location-info">Location Information</h3>
          </div>
          
          <div id="location-display" class="location-display">
            <div class="location-loading">
              <div class="spinner-small"></div>
              <p data-i18n="getting-location">Getting your location...</p>
            </div>
          </div>
          
          <!-- Google Map -->
          <div id="location-map-container" class="location-map-wrapper" style="display:none;">
            <iframe 
              id="location-map" 
              class="location-map-iframe"
              frameborder="0" 
              allowfullscreen
              loading="lazy"
            ></iframe>
          </div>
        </div>
        
        <!-- Quick Actions Footer -->
        <div class="attendance-footer">
          <a href="#/attendance-history" class="footer-link">
            <i class="fas fa-history"></i>
            <span data-i18n="view-history">View History</span>
          </a>
        </div>
      </div>
    </div>
  `;

    const router = window.app?.router || {
        render: (html) => {
            document.getElementById('app-content').innerHTML = html;
        }
    };

    router.render(content);

    // Update i18n
    if (window.app?.i18n) {
        window.app.i18n.updatePageText();
    }

    hideLoading();

    let dateTimeInterval = null;
    let workTimerInterval = null;

    // Initialize current date/time display
    updateDateTime();
    dateTimeInterval = setInterval(updateDateTime, 1000);

    // Initialize work timer if checked in but not checked out
    if (isCheckedIn && !isCheckedOut) {
        updateWorkTimer(todayAttendance.checkIn);
        workTimerInterval = setInterval(() => updateWorkTimer(todayAttendance.checkIn), 1000);
    }

    // Function to update date/time with proper locale
    function updateDateTime() {
        const dateTimeEl = document.getElementById('current-date-time');
        if (dateTimeEl) {
            const now = new Date();
            const options = {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            };

            // Get current language from i18n system
            const currentLang = window.app?.i18n?.currentLang || 'en';
            const locale = currentLang === 'ar' ? 'ar-EG' : 'en-US';

            dateTimeEl.textContent = now.toLocaleString(locale, options);
        }
    }

    // Function to update work timer
    function updateWorkTimer(checkInTime) {
        const timerEl = document.getElementById('work-timer');
        if (!timerEl) return;

        const now = new Date();
        const checkIn = checkInTime.toDate ? checkInTime.toDate() : new Date(checkInTime);
        const diff = now - checkIn;

        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        timerEl.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    }

    // Function to update map embed
    function updateLocationMap(lat, lng) {
        const mapContainer = document.getElementById('location-map-container');
        const mapIframe = document.getElementById('location-map');

        if (!mapContainer || !mapIframe) return;

        if (lat && lng) {
            mapContainer.style.display = 'block';
            const embedUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=17&output=embed`;
            mapIframe.src = embedUrl;
        }
    }

    // Handle language changes
    const handleLanguageChange = () => {
        updateDateTime(); // Update date/time format immediately
        if (window.app?.i18n) {
            window.app.i18n.updatePageText(); // Update all translations
        }
    };

    window.addEventListener('languageChanged', handleLanguageChange);

    // Get current location
    try {
        const location = await AttendanceService.getCurrentLocation();
        const locationDisplay = document.getElementById('location-display');
        if (locationDisplay) {
            locationDisplay.innerHTML = `
                <div class="location-grid">
                    <div class="location-item">
                        <i class="fas fa-compass"></i>
                        <div>
                            <span data-i18n="latitude">Latitude</span>
                            <strong>${location.latitude.toFixed(6)}</strong>
                        </div>
                    </div>
                    <div class="location-item">
                        <i class="fas fa-compass"></i>
                        <div>
                            <span data-i18n="longitude">Longitude</span>
                            <strong>${location.longitude.toFixed(6)}</strong>
                        </div>
                    </div>
                    <div class="location-item">
                        <i class="fas fa-crosshairs"></i>
                        <div>
                            <span data-i18n="accuracy">Accuracy</span>
                            <strong>${Math.round(location.accuracy)}<span data-i18n="meters">m</span></strong>
                        </div>
                    </div>
                </div>
            `;

            // Update i18n for dynamically added content
            if (window.app?.i18n) {
                window.app.i18n.updatePageText();
            }
        }

        updateLocationMap(location.latitude, location.longitude);
        window.currentLocation = location;
    } catch (error) {
        console.error('Location error:', error);
        const locationDisplay = document.getElementById('location-display');
        if (locationDisplay) {
            locationDisplay.innerHTML = `
                <div class="location-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p data-i18n="location-error">Could not get your location. Please enable location services.</p>
                </div>
            `;

            // Update i18n for dynamically added content
            if (window.app?.i18n) {
                window.app.i18n.updatePageText();
            }
        }
    }

    // Check-in button handler
    const checkinBtn = document.getElementById('checkin-btn');
    if (checkinBtn) {
        checkinBtn.addEventListener('click', async () => {
            if (checkinBtn.disabled) return;
            checkinBtn.disabled = true;
            if (!window.currentLocation) {
                showToast('toast-location-not-available', 'error');
                checkinBtn.disabled = false;
                return;
            }
            const originalHTML = checkinBtn.innerHTML;
            checkinBtn.innerHTML = '<div class="spinner-small"></div><span data-i18n="btn-checking-in">Checking in...</span>';

            // Update i18n for button text
            if (window.app?.i18n) {
                window.app.i18n.updatePageText();
            }

            try {
                let selfieBlob = null;

                // Use company settings to determine if selfie is required
                if (requireSelfie) {
                    try {
                        showToast('toast-smile-camera', 'info');
                        selfieBlob = await AttendanceService.captureSelfie();
                    } catch (error) {
                        console.error('Selfie capture error:', error);
                        showToast('toast-selfie-capture-failed', 'warning');
                        checkinBtn.disabled = false;
                        checkinBtn.innerHTML = originalHTML;
                        if (window.app?.i18n) {
                            window.app.i18n.updatePageText();
                        }
                        showToast('toast-checkin-failed', 'error');
                        return; // Stop check-in if selfie is required but failed
                    }
                }

                await AttendanceService.checkIn(
                    companyId,
                    user,
                    window.currentLocation,
                    selfieBlob
                );

                showToast('toast-checked-in-success', 'success');
                setTimeout(() => renderAttendance(), 500);
            } catch (error) {
                console.error('Check-in error:', error);
                if (error.message === 'TOO_FAR_FROM_OFFICE' && error.data) {
                    showToast('toast-too-far-from-office', 'error', error.data);
                } else if (error.message === 'LOCATION_VALIDATION_FAILED') {
                    showToast('toast-location-validation-failed', 'error');
                } else {
                    showToast('toast-checkin-failed', 'error');
                }
                checkinBtn.disabled = false;
                checkinBtn.innerHTML = originalHTML;

                // Update i18n after restoring original HTML
                if (window.app?.i18n) {
                    window.app.i18n.updatePageText();
                }
            }
        });
    }

    // Check-out button handler
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', async () => {
            if (checkoutBtn.disabled) return; // Already processing
            checkoutBtn.disabled = true;
            if (!window.currentLocation) {
                showToast('toast-location-not-available', 'error');
                checkoutBtn.disabled = false;
                return;
            }
            const originalHTML = checkoutBtn.innerHTML;
            checkoutBtn.innerHTML = '<div class="spinner-small"></div><span data-i18n="btn-checking-out">Checking out...</span>';

            // Update i18n for button text
            if (window.app?.i18n) {
                window.app.i18n.updatePageText();
            }

            try {
                await AttendanceService.checkOut(
                    companyId,
                    user.uid,
                    window.currentLocation
                );

                showToast('toast-checked-out-success', 'success');
                setTimeout(() => renderAttendance(), 500);
            } catch (error) {
                console.error('Check-out error:', error);
                showToast('toast-checkout-failed', 'error');
                checkoutBtn.disabled = false;
                checkoutBtn.innerHTML = originalHTML;

                // Update i18n after restoring original HTML
                if (window.app?.i18n) {
                    window.app.i18n.updatePageText();
                }
            }
        });
    }

    // Clear intervals when leaving page
    function cleanup() {
        if (dateTimeInterval) clearInterval(dateTimeInterval);
        if (workTimerInterval) clearInterval(workTimerInterval);
        window.removeEventListener('languageChanged', handleLanguageChange);
    }
    window.addEventListener('hashchange', cleanup, { once: true });
}