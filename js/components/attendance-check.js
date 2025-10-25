import { AuthService } from '../services/auth.js';
import { AttendanceService } from '../services/attendance.js';
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

    const todayAttendance = await AttendanceService.getTodayAttendance(companyId, user.uid);

    const content = `
    <div class="attendance-container">
      <div class="attendance-card">
        <h1 data-i18n="attendance">Attendance</h1>
        
        ${todayAttendance && todayAttendance.checkIn ? `
          <!-- Already checked in -->
          <div class="attendance-status success">
            <div class="status-icon">✓</div>
            <h2 data-i18n="checked-in">Checked In</h2>            
            <p>
              <span data-i18n="check-in-time">Check-in time:</span>
              <strong>${formatTime(todayAttendance.checkIn)}</strong>
            </p>
            
            ${!todayAttendance.checkOut ? `
              <button id="checkout-btn" class="btn btn-primary btn-large">
                <span data-i18n="check-out">Check Out</span>
              </button>
            ` : `
              <div class="checkout-info">                
                <p>
                <span data-i18n="check-out-time">Check-out time:</span>
                <strong>${formatTime(todayAttendance.checkOut)}</strong>
                </p>
                <p>
                <span data-i18n="work-duration">Work duration:</span>
                <strong>${AttendanceService.calculateWorkHours(todayAttendance.checkIn, todayAttendance.checkOut)} hours</strong>
                </p>
              </div>
            `}
          </div>
        ` : `
          <!-- Not checked in yet -->
          <div class="attendance-status pending">
            <div class="status-icon">⏱</div>
            <h2 data-i18n="not-checked-in-yet">Not Checked In Yet</h2>
            <p data-i18n="check-in-message">Ready to start your day? Check in now!</p>
            
            <div class="checkin-options">
              <label class="checkbox-label">
                <input type="checkbox" id="use-selfie" />
                <span data-i18n="use-selfie">Use selfie verification</span>
              </label>
            </div>
            
            <button id="checkin-btn" class="btn btn-primary btn-large">
              <span data-i18n="check-in">Check In</span>
            </button>
          </div>
        `}
        
        <div class="attendance-info">
          <h3 data-i18n="location-info">Location Information</h3>
          <div id="location-display" class="location-display">
            <p data-i18n="getting-location">Getting your location...</p>
          </div>
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

    // Get current location
    try {
        const location = await AttendanceService.getCurrentLocation();
        const locationDisplay = document.getElementById('location-display');
        if (locationDisplay) {
            locationDisplay.innerHTML = `
        <p><strong>Latitude:</strong> ${location.latitude.toFixed(6)}</p>
        <p><strong>Longitude:</strong> ${location.longitude.toFixed(6)}</p>
        <p><strong>Accuracy:</strong> ${Math.round(location.accuracy)}m</p>
      `;
        }

        // Store location for later use
        window.currentLocation = location;
    } catch (error) {
        console.error('Location error:', error);
        const locationDisplay = document.getElementById('location-display');
        if (locationDisplay) {
            locationDisplay.innerHTML = `
        <p class="error" data-i18n="location-error">Could not get your location. Please enable location services.</p>
      `;
        }
    }

    // Check-in button handler
    const checkinBtn = document.getElementById('checkin-btn');
    if (checkinBtn) {
        checkinBtn.addEventListener('click', async () => {
            if (!window.currentLocation) {
                showToast('toast-location-not-available', 'error');
                return;
            }

            checkinBtn.disabled = true;
            checkinBtn.textContent = window.app?.i18n.t('btn-checking-in') || 'Checking in...';

            try {
                const useSelfie = document.getElementById('use-selfie')?.checked;
                let selfieBlob = null;

                if (useSelfie) {
                    try {
                        showToast('toast-smile-camera', 'info');
                        selfieBlob = await AttendanceService.captureSelfie();
                    } catch (error) {
                        console.error('Selfie capture error:', error);
                        showToast('toast-selfie-capture-failed', 'warning');
                    }
                }

                await AttendanceService.checkIn(
                    companyId,
                    user,
                    window.currentLocation,
                    selfieBlob
                );

                showToast('toast-checked-in-success', 'success');
                renderAttendance(); // Refresh the page
            } catch (error) {
                console.error('Check-in error:', error);
                showToast('toast-checkin-failed', 'error');
                checkinBtn.disabled = false;
                checkinBtn.textContent = window.app?.i18n.t('check-in') || 'Check In';
            }
        });
    }

    // Check-out button handler
    const checkoutBtn = document.getElementById('checkout-btn');
    if (checkoutBtn) {
        checkoutBtn.addEventListener('click', async () => {
            if (!window.currentLocation) {
                showToast('toast-location-not-available', 'error');
                return;
            }

            checkoutBtn.disabled = true;
            checkoutBtn.textContent = window.app?.i18n.t('btn-checking-out') || 'Checking out...';

            try {
                await AttendanceService.checkOut(
                    companyId,
                    user.uid,
                    window.currentLocation
                );

                showToast('toast-checked-out-success', 'success');
                renderAttendance(); // Refresh the page
            } catch (error) {
                console.error('Check-out error:', error);
                showToast('toast-checkin-failed', 'error');
                checkoutBtn.disabled = false;
                checkoutBtn.textContent = window.app?.i18n.t('check-out') || 'Check Out';
            }
        });
    }
}