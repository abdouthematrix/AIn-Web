import { UserService } from '../services/user.js';
import { AuthService } from '../services/auth.js';
import { CompanyService } from '../services/company.js';
import { AttendanceService } from '../services/attendance.js';
import { formatDate, formatTime, showLoading, hideLoading, showToast } from '../utils/helpers.js';

export async function renderDashboard() {
    showLoading();

    const user = AuthService.getCurrentUser();
    const userData = await UserService.getUser(user.uid);
    const companies = await CompanyService.getUserCompanies(userData);

    let content = '';

    if (companies.length === 0) {
        // No company - show welcome and setup option
        content = `
      <div class="dashboard-container">
        <div class="welcome-section">
          <h1>
            <i class="fas fa-hand-wave"></i>
            <span data-i18n="welcome">Welcome to A-In!</span>
          </h1>
          <p data-i18n="welcome-message">Get started by creating your company or join an existing one.</p>
          
          <div class="welcome-actions">
            <a href="#/company-setup" data-route="/company-setup" class="btn btn-primary">
              <i class="fas fa-building"></i>
              <span data-i18n="create-company">Create Company</span>
            </a>
            <a href="#/join-company" data-route="/join-company" class="btn btn-secondary">
              <i class="fas fa-user-plus"></i>
              <span data-i18n="join-company">Join Company</span>
            </a>
          </div>
        </div>
      </div>
    `;
    } else {
        // Has company - show dashboard
        const currentCompany = companies.find(c => c.id === AuthService.currentCompanyId) || companies[0];
        const role = await AuthService.getUserRole(currentCompany.id);
        const todayAttendance = await AttendanceService.getTodayAttendance(currentCompany.id, user.uid);

        // Get stats for current month
        const now = new Date();
        const stats = await AttendanceService.getAttendanceStats(
            currentCompany.id,
            user.uid,
            now.getMonth() + 1,
            now.getFullYear()
        );

        content = `
      <div class="dashboard-container">
        <div class="dashboard-header">
          <div>
            <h1>
              <i class="fas fa-chart-line"></i>
              <span data-i18n="dashboard">Dashboard</span>
            </h1>
            ${companies.length > 1 ? `
              <div class="company-switcher">
                <label>
                  <i class="fas fa-building"></i>
                  <span data-i18n="current-company">Company:</span>
                </label>
                <select id="company-switcher-select">
                  ${companies.map(c => `
                    <option value="${c.id}" ${c.id === currentCompany.id ? 'selected' : ''}>
                      ${c.name}
                    </option>
                  `).join('')}
                </select>
              </div>
            ` : `
              <div class="company-info">
                <i class="fas fa-building"></i>
                <strong>${currentCompany.name}</strong>
              </div>
            `}
          </div>
          <div class="role-badge">
            <span class="badge badge-${role}">
              <i class="fas fa-user-tag"></i>
              ${role}
            </span>
          </div>
        </div>
        
        <div class="dashboard-grid">
          <!-- Today's Status -->
          <div class="dashboard-card">
            <h3>
              <i class="fas fa-calendar-day"></i>
              <span data-i18n="today-status">Today's Status</span>
            </h3>
            <div class="attendance-status">
              ${todayAttendance && todayAttendance.checkIn ? `
                <div class="status-item">
                  <i class="fas fa-clock"></i>
                  <span data-i18n="check-in">Check In</span>
                  <strong>${formatTime(todayAttendance.checkIn)}</strong>
                </div>
                ${todayAttendance.checkOut ? `
                  <div class="status-item">
                    <i class="fas fa-clock"></i>
                    <span data-i18n="check-out">Check Out</span>
                    <strong>${formatTime(todayAttendance.checkOut)}</strong>
                  </div>
                  <div class="status-item">
                    <i class="fas fa-hourglass-half"></i>
                    <span data-i18n="work-hours">Work Hours</span>
                    <strong>${AttendanceService.calculateWorkHours(todayAttendance.checkIn, todayAttendance.checkOut)}h</strong>
                  </div>
                ` : `
                  <a href="#/attendance" data-route="/attendance" class="btn btn-secondary">
                    <i class="fas fa-sign-out-alt"></i>
                    <span data-i18n="check-out-now">Check Out Now</span>
                  </a>
                `}
              ` : `
                <p>
                  <i class="fas fa-info-circle"></i>
                  <span data-i18n="not-checked-in">You haven't checked in today</span>
                </p>
                <a href="#/attendance" data-route="/attendance" class="btn btn-primary">
                  <i class="fas fa-sign-in-alt"></i>
                  <span data-i18n="check-in-now">Check In Now</span>
                </a>
              `}
            </div>
          </div>
          
          <!-- Monthly Stats -->
          <div class="dashboard-card">
            <h3>
              <i class="fas fa-chart-bar"></i>
              <span data-i18n="monthly-stats">Monthly Statistics</span>
            </h3>
            <div class="stats-grid">
              <div class="stat-item">
                <i class="fas fa-calendar-check"></i>
                <span data-i18n="present-days">Present Days</span>
                <strong>${stats.presentDays}</strong>
              </div>
              <div class="stat-item">
                <i class="fas fa-clock"></i>
                <span data-i18n="total-hours">Total Hours</span>
                <strong>${Math.round(stats.totalHours)}h</strong>
              </div>
              <div class="stat-item">
                <i class="fas fa-chart-line"></i>
                <span data-i18n="avg-hours">Avg Hours/Day</span>
                <strong>${stats.avgHoursPerDay}h</strong>
              </div>
              <div class="stat-item">
                <i class="fas fa-exclamation-triangle"></i>
                <span data-i18n="late-days">Late Days</span>
                <strong>${stats.lateDays}</strong>
              </div>
            </div>
          </div>
          
          <!-- Quick Actions -->
          <div class="dashboard-card">
            <h3>
              <i class="fas fa-bolt"></i>
              <span data-i18n="quick-actions">Quick Actions</span>
            </h3>
            <div class="quick-actions">
              <a href="#/attendance" data-route="/attendance" class="action-btn">
                <i class="fas fa-calendar-check"></i>
                <span data-i18n="attendance">Attendance</span>
              </a>
              <a href="#/attendance-history" data-route="/attendance-history" class="action-btn">
                <i class="fas fa-history"></i>
                <span data-i18n="view-history">View History</span>
              </a>
              ${role === 'owner' || role === 'manager' ? `
                <a href="#/employees" data-route="/employees" class="action-btn">
                  <i class="fas fa-users"></i>
                  <span data-i18n="manage-employees">Manage Employees</span>
                </a>
              ` : ''}
              <a href="#/company-setup" data-route="/company-setup" class="action-btn">
                <i class="fas fa-building"></i>
                <span data-i18n="create-company">Create Company</span>
              </a>
              <a href="#/join-company" data-route="/join-company" class="action-btn">
                <i class="fas fa-user-plus"></i>
                <span data-i18n="join-another-company">Join Another Company</span>
              </a>
              <a href="#/profile" data-route="/profile" class="action-btn">
                <i class="fas fa-user-circle"></i>
                <span data-i18n="profile">Profile</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    `;
    }

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

    // Company switcher handler
    const companySwitcher = document.getElementById('company-switcher-select');
    if (companySwitcher) {
        companySwitcher.addEventListener('change', async (e) => {
            const newCompanyId = e.target.value;
            const originalValue = e.target.value;

            showLoading();

            try {
                await AuthService.switchCompany(newCompanyId);
                showToast('toast-company-switched', 'success');

                hideLoading();
                // Reload dashboard
                renderDashboard();
            } catch (error) {
                hideLoading();
                showToast('toast-company-switch-failed', 'error');
                e.target.value = originalValue; // Revert selection
            }
        });
    }
}