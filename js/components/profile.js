import { AuthService } from '../services/auth.js';
import { UserService } from '../services/user.js';
import { CompanyService } from '../services/company.js';
import { showToast, showLoading, hideLoading } from '../utils/helpers.js';

export async function renderProfile() {
    showLoading();

    const user = AuthService.getCurrentUser();
    const userData = await UserService.getUser(user.uid);
    const companies = await CompanyService.getUserCompanies(userData);

    const content = `
    <div class="profile-container">
      <div class="profile-header">       
        <h1>
         <i class="fas fa-user-circle"></i>
         <span data-i18n="profile">Profile</span>
        </h1>
      </div>
      
      <div class="profile-content">
        <div class="profile-section">
          <h2>
            <i class="fas fa-id-card"></i>
            <span data-i18n="personal-info">Personal Information</span>
          </h2>
          <div class="profile-info">
            <div class="info-item">
              <label>
                <i class="fas fa-user"></i>
                <span data-i18n="full-name">Full Name</span>
              </label>
              <p>${userData?.displayName || user.displayName || '-'}</p>
            </div>
            <div class="info-item">
              <label>
                <i class="fas fa-envelope"></i>
                <span data-i18n="email">Email</span>
              </label>
              <p>${user.email}</p>
            </div>
            <div class="info-item">
              <label>
                <i class="fas fa-info-circle"></i>
                <span data-i18n="status">Status</span>
              </label>
              <p><span class="badge badge-${userData?.status || 'active'}">${userData?.status || 'active'}</span></p>
            </div>
          </div>
        </div>
        
        <div class="profile-section">
          <h2>
            <i class="fas fa-building"></i>
            <span data-i18n="companies">My Companies</span>
          </h2>
          <div class="companies-list">
            ${companies.length > 0 ? companies.map(company => {
        const isCurrent = company.id === AuthService.currentCompanyId;
        const isOwner = company.ownerUid === user.uid;
        return `
                <div class="company-item ${isCurrent ? 'active' : ''}">
                  <div class="company-info">
                    <h3>
                      <i class="fas fa-briefcase"></i>
                      ${company.name}
                    </h3>
                    <p>
                      <i class="fas fa-${isOwner ? 'crown' : 'user-tag'}"></i>
                      ${isOwner ? 'Owner' : 'Member'}
                    </p>
                  </div>
                  <div class="company-actions">
                    ${isOwner ? `
                      <button class="btn btn-sm btn-secondary edit-company-btn" data-id="${company.id}">
                        <i class="fas fa-edit"></i>
                        <span data-i18n="edit">Edit</span>
                      </button>
                    ` : ''}
                    ${!isCurrent ? `
                      <button class="btn btn-sm btn-secondary switch-company-btn" data-id="${company.id}">
                        <i class="fas fa-exchange-alt"></i>
                        <span data-i18n="switch">Switch</span>
                      </button>
                    ` : `
                      <span class="badge badge-success">
                        <i class="fas fa-check-circle"></i>
                        <span data-i18n="current">Current</span>
                      </span>
                    `}
                  </div>
                </div>
              `;
    }).join('') : `
              <p>
                <i class="fas fa-exclamation-circle"></i>
                <span data-i18n="no-companies">You are not part of any company yet</span>
              </p>
            `}
          </div>
        </div>
        
        <div class="profile-section">
          <h2>
            <i class="fas fa-cog"></i>
            <span data-i18n="account-settings">Account Settings</span>
          </h2>
          <div class="settings-actions">
            <button id="change-password-btn" class="btn btn-secondary">
              <i class="fas fa-key"></i>
              <span data-i18n="change-password">Change Password</span>
            </button>
            <button id="logout-btn" class="btn btn-danger">
              <i class="fas fa-sign-out-alt"></i>
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

    // Edit company buttons
    document.querySelectorAll('.edit-company-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const companyId = btn.getAttribute('data-id');
            window.location.hash = `/company-setup?id=${companyId}`;
        });
    });

    // Switch company buttons
    document.querySelectorAll('.switch-company-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const companyId = btn.getAttribute('data-id');
            try {
                await AuthService.setCurrentCompany(companyId);
                showToast('toast-company-switched', 'success');
                window.location.hash = '/dashboard';
            } catch (error) {
                showToast('toast-company-switch-failed', 'error');
            }
        });
    });

    // Change password button
    document.getElementById('change-password-btn')?.addEventListener('click', async () => {
        const email = user.email;
        try {
            await AuthService.resetPassword(email);
            showToast('toast-password-reset-sent', 'success');
        } catch (error) {
            showToast('toast-password-reset-failed', 'error');
        }
    });

    // Logout button
    document.getElementById('logout-btn')?.addEventListener('click', async () => {
        try {
            await AuthService.signOut();
            showToast('toast-logout-success', 'success');
            window.location.hash = '/login';
        } catch (error) {
            showToast('toast-logout-failed', 'error');
        }
    });
}