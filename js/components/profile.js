import { AuthService } from '../services/auth.js';
import { UserService } from '../services/user.js';
import { CompanyService } from '../services/company.js';
import { showToast, showLoading, hideLoading } from '../utils/helpers.js';

export async function renderProfile() {
    showLoading();

    const user = AuthService.getCurrentUser();
    const userData = await UserService.getUser(user.uid);
    const companies = await CompanyService.getUserCompanies(userData,user.uid);

    const content = `
    <div class="profile-container">
      <div class="profile-header">
        <h1 data-i18n="profile">Profile</h1>
      </div>
      
      <div class="profile-content">
        <div class="profile-section">
          <h2 data-i18n="personal-info">Personal Information</h2>
          <div class="profile-info">
            <div class="info-item">
              <label data-i18n="full-name">Full Name</label>
              <p>${userData?.displayName || user.displayName || '-'}</p>
            </div>
            <div class="info-item">
              <label data-i18n="email">Email</label>
              <p>${user.email}</p>
            </div>
            <div class="info-item">
              <label data-i18n="status">Status</label>
              <p><span class="badge badge-${userData?.status || 'active'}">${userData?.status || 'active'}</span></p>
            </div>
          </div>
        </div>
        
        <div class="profile-section">
          <h2 data-i18n="companies">My Companies</h2>
          <div class="companies-list">
            ${companies.length > 0 ? companies.map(company => {
        const isCurrent = company.id === AuthService.currentCompanyId;
        return `
                <div class="company-item ${isCurrent ? 'active' : ''}">
                  <h3>${company.name}</h3>
                  <p>${company.ownerUid === user.uid ? 'Owner' : 'Member'}</p>
                  ${!isCurrent ? `
                    <button class="btn btn-sm btn-secondary switch-company-btn" data-id="${company.id}">
                      <span data-i18n="switch">Switch</span>
                    </button>
                  ` : `
                    <span class="badge badge-success" data-i18n="current">Current</span>
                  `}
                </div>
              `;
    }).join('') : `
              <p data-i18n="no-companies">You are not part of any company yet</p>
            `}
          </div>
        </div>
        
        <div class="profile-section">
          <h2 data-i18n="account-settings">Account Settings</h2>
          <div class="settings-actions">
            <button id="change-password-btn" class="btn btn-secondary">
              <span data-i18n="change-password">Change Password</span>
            </button>
            <button id="logout-btn" class="btn btn-danger">
              <span data-i18n="logout">Logout</span>
            </button>
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

    // Switch company buttons
    document.querySelectorAll('.switch-company-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const companyId = btn.getAttribute('data-id');
            try {
                await AuthService.setCurrentCompany(companyId);
                showToast('Company switched successfully', 'success');
                window.location.hash = '/dashboard';
            } catch (error) {
                showToast('Failed to switch company', 'error');
            }
        });
    });

    // Change password button
    document.getElementById('change-password-btn')?.addEventListener('click', async () => {
        const email = user.email;
        try {
            await AuthService.resetPassword(email);
            showToast('Password reset email sent! Check your inbox.', 'success');
        } catch (error) {
            showToast('Failed to send password reset email', 'error');
        }
    });

    // Logout button
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        try {
            await AuthService.signOut();
            showToast('Logged out successfully', 'success');
            window.location.hash = '/login';
        } catch (error) {
            showToast('Failed to logout', 'error');
        }
    });
}