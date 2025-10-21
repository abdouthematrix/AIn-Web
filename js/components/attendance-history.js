import { AuthService } from '../services/auth.js';
import { AttendanceService } from '../services/attendance.js';
import { showToast, formatDate, formatTime, showLoading, hideLoading } from '../utils/helpers.js';

export async function renderAttendanceHistory() {
    showLoading();

    const user = AuthService.getCurrentUser();
    const companyId = AuthService.currentCompanyId;

    if (!companyId) {
        hideLoading();
        showToast('Please select a company first', 'error');
        window.location.hash = '/dashboard';
        return;
    }

    // Get date range from query params or default to current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];

    const attendance = await AttendanceService.getUserAttendanceHistory(
        companyId,
        user.uid,
        startOfMonth,
        endOfMonth
    );

    const content = `
    <div class="history-container">
      <div class="history-header">
        <h1 data-i18n="attendance-history">Attendance History</h1>
        <div class="history-filters">
          <select id="month-selector">
            ${generateMonthOptions()}
          </select>
        </div>
      </div>
      
      <div class="history-stats">
        <div class="stat-card">
          <h3 data-i18n="total-days">Total Days</h3>
          <p class="stat-value">${attendance.length}</p>
        </div>
        <div class="stat-card">
          <h3 data-i18n="total-hours">Total Hours</h3>
          <p class="stat-value">${calculateTotalHours(attendance)}h</p>
        </div>
        <div class="stat-card">
          <h3 data-i18n="avg-hours">Avg Hours/Day</h3>
          <p class="stat-value">${calculateAvgHours(attendance)}h</p>
        </div>
      </div>
      
      <div class="history-list">
        ${attendance.length > 0 ? `
          <table class="attendance-table">
            <thead>
              <tr>
                <th data-i18n="date">Date</th>
                <th data-i18n="check-in">Check In</th>
                <th data-i18n="check-out">Check Out</th>
                <th data-i18n="hours">Hours</th>
                <th data-i18n="status">Status</th>
                <th data-i18n="photo">Photo</th>
              </tr>
            </thead>
            <tbody>
              ${attendance.map(record => `
                <tr>
                  <td>${formatDate(record.date)}</td>
                  <td>${record.checkIn ? formatTime(record.checkIn) : '-'}</td>
                  <td>${record.checkOut ? formatTime(record.checkOut) : '-'}</td>
                  <td>${record.checkOut ? AttendanceService.calculateWorkHours(record.checkIn, record.checkOut) + 'h' : '-'}</td>
                  <td><span class="badge badge-${record.status}">${record.status}</span></td>
                  <td>
                    ${record.selfieData ? `
                      <button class="btn btn-sm btn-secondary view-selfie-btn" data-selfie="${record.selfieData}">
                        View
                      </button>
                    ` : '-'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : `
          <div class="empty-state">
            <p data-i18n="no-attendance-records">No attendance records found for this period</p>
          </div>
        `}
      </div>
    </div>
    
    <!-- Selfie Modal -->
    <div id="selfie-modal" class="modal" style="display:none;">
      <div class="modal-content">
        <h2 data-i18n="check-in-photo">Check-in Photo</h2>
        <img id="selfie-image" src="" alt="Check-in selfie" style="max-width: 100%; border-radius: 8px;" />
        <div class="modal-actions">
          <button type="button" class="btn btn-primary" id="close-selfie-modal" data-i18n="close">Close</button>
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

    // Month selector
    const monthSelector = document.getElementById('month-selector');
    if (monthSelector) {
        monthSelector.addEventListener('change', () => {
            renderAttendanceHistory(); // Refresh with new month
        });
    }

    // View selfie buttons
    document.querySelectorAll('.view-selfie-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const selfieData = btn.getAttribute('data-selfie');
            const dataUrl = AttendanceService.base64ToDataUrl(selfieData);
            document.getElementById('selfie-image').src = dataUrl;
            document.getElementById('selfie-modal').style.display = 'flex';
        });
    });

    // Close selfie modal
    document.getElementById('close-selfie-modal')?.addEventListener('click', () => {
        document.getElementById('selfie-modal').style.display = 'none';
    });
}

function generateMonthOptions() {
    const months = [];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const selected = i === 0 ? 'selected' : '';
        months.push(`<option value="${value}" ${selected}>${label}</option>`);
    }

    return months.join('');
}

function calculateTotalHours(attendance) {
    let total = 0;
    attendance.forEach(record => {
        if (record.checkIn && record.checkOut) {
            total += AttendanceService.calculateWorkHours(record.checkIn, record.checkOut);
        }
    });
    return Math.round(total);
}

function calculateAvgHours(attendance) {
    const daysWithCheckout = attendance.filter(r => r.checkIn && r.checkOut);
    if (daysWithCheckout.length === 0) return 0;

    const total = calculateTotalHours(attendance);
    return Math.round((total / daysWithCheckout.length) * 10) / 10;
}