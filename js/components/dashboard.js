import { UserService } from '../services/user.js';
import { AuthService } from '../services/auth.js';
import { CompanyService } from '../services/company.js';
import { AttendanceService } from '../services/attendance.js';
import { formatDate, formatTime, showLoading, hideLoading } from '../utils/helpers.js';

export async function renderDashboard() {
    showLoading();

    const user = AuthService.getCurrentUser();
    const userData = await UserService.getUser(user.uid);
    const companies = await CompanyService.getUserCompanies(userData,user.uid);

    let content = '';

    if (companies.length === 0) {
        // No company - show welcome and setup option
        content = `
      <div class="dashboard-container">
        <div class="welcome-section">
          <h1 data-i18n="welcome">Welcome to A-In!</h1>
          <p data-i18n="welcome-message">Get started by creating your company or join an existing one.</p>
          
          <div class="welcome-actions">
            <a href="#/company-setup" data-route="/company-setup" class="btn btn-primary">
              <span data-i18n="create-company">Create Company</span>
            </a>
            <a href="#/join-company" data-route="/join-company" class="btn btn-secondary">
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
          <h1 data-i18n="dashboard">Dashboard</h1>
          <div class="company-info">
            <strong>${currentCompany.name}</strong>
            <span class="badge">${role}</span>
          </div>
        </div>
        
        <div class="dashboard-grid">
          <!-- Today's Status -->
          <div class="dashboard-card">
            <h3 data-i18n="today-status">Today's Status</h3>
            <div class="attendance-status">
              ${todayAttendance && todayAttendance.checkIn ? `
                <div class="status-item">
                  <span data-i18n="check-in">Check In</span>
                  <strong>${formatTime(todayAttendance.checkIn)}</strong>
                </div>
                ${todayAttendance.checkOut ? `
                  <div class="status-item">
                    <span data-i18n="check-out">Check Out</span>
                    <strong>${formatTime(todayAttendance.checkOut)}</strong>
                  </div>
                  <div class="status-item">
                    <span data-i18n="work-hours">Work Hours</span>
                    <strong>${AttendanceService.calculateWorkHours(todayAttendance.checkIn, todayAttendance.checkOut)}h</strong>
                  </div>
                ` : `
                  <a href="#/attendance" data-route="/attendance" class="btn btn-secondary">
                    <span data-i18n="check-out-now">Check Out Now</span>
                  </a>
                `}
              ` : `
                <p data-i18n="not-checked-in">You haven't checked in today</p>
                <a href="#/attendance" data-route="/attendance" class="btn btn-primary">
                  <span data-i18n="check-in-now">Check In Now</span>
                </a>
              `}
            </div>
          </div>
          
          <!-- Monthly Stats -->
          <div class="dashboard-card">
            <h3 data-i18n="monthly-stats">Monthly Statistics</h3>
            <div class="stats-grid">
              <div class="stat-item">
                <span data-i18n="present-days">Present Days</span>
                <strong>${stats.presentDays}</strong>
              </div>
              <div class="stat-item">
                <span data-i18n="total-hours">Total Hours</span>
                <strong>${Math.round(stats.totalHours)}h</strong>
              </div>
              <div class="stat-item">
                <span data-i18n="avg-hours">Avg Hours/Day</span>
                <strong>${stats.avgHoursPerDay}h</strong>
              </div>
              <div class="stat-item">
                <span data-i18n="late-days">Late Days</span>
                <strong>${stats.lateDays}</strong>
              </div>
            </div>
          </div>
          
          <!-- Quick Actions -->
          <div class="dashboard-card">
            <h3 data-i18n="quick-actions">Quick Actions</h3>
            <div class="quick-actions">
              <a href="#/attendance" data-route="/attendance" class="action-btn">
                <span data-i18n="attendance">Attendance</span>
              </a>
              <a href="#/attendance-history" data-route="/attendance-history" class="action-btn">
                <span data-i18n="view-history">View History</span>
              </a>
              ${role === 'owner' || role === 'manager' ? `
                <a href="#/employees" data-route="/employees" class="action-btn">
                  <span data-i18n="manage-employees">Manage Employees</span>
                </a>
              ` : ''}
              <a href="#/join-company" data-route="/join-company" class="action-btn">
                <span data-i18n="join-another-company">Join Another Company</span>
              </a>
              <a href="#/profile" data-route="/profile" class="action-btn">
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
}