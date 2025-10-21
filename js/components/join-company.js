import { AuthService } from '../services/auth.js';
import { CompanyService } from '../services/company.js';
import { showToast, showLoading, hideLoading } from '../utils/helpers.js';

export async function renderJoinCompany() {
    const content = `
    <div class="join-container">
      <div class="join-card">
        <div class="join-header">
          <h1 data-i18n="join-company">Join Company</h1>
          <p data-i18n="join-subtitle">Enter the invitation code you received</p>
        </div>
        
        <form id="join-form" class="join-form">
          <div class="form-group">
            <label for="invite-code" data-i18n="invitation-code">Invitation Code</label>
            <input 
              type="text" 
              id="invite-code" 
              name="inviteCode" 
              required 
              placeholder="XXXXXXXX"
              maxlength="8"
              style="text-transform: uppercase;"
            />
            <small data-i18n="code-hint">Enter the 8-character code</small>
          </div>
          
          <button type="submit" class="btn btn-primary btn-block" data-i18n="join-btn">
            Join Company
          </button>
        </form>
        
        <div class="join-footer">
          <a href="#/dashboard" data-route="/dashboard" data-i18n="back-to-dashboard">
            Back to Dashboard
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

    // Setup form handler
    const form = document.getElementById('join-form');
    const inviteInput = document.getElementById('invite-code');

    // Auto-uppercase input
    inviteInput.addEventListener('input', (e) => {
        e.target.value = e.target.value.toUpperCase();
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const inviteCode = inviteInput.value.trim().toUpperCase();

        if (inviteCode.length !== 8) {
            showToast('Please enter a valid 8-character code', 'error');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Joining...';

        try {
            const user = AuthService.getCurrentUser();
            const companyId = await CompanyService.joinWithInvitationCode(user.uid, inviteCode);

            // Set as current company
            await AuthService.setCurrentCompany(companyId);

            showToast('Successfully joined the company!', 'success');
            window.location.hash = '/dashboard';
        } catch (error) {
            console.error('Join error:', error);
            showToast(error.message || 'Failed to join company. Please check the code and try again.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Join Company';
        }
    });
}