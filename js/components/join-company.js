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
              style="text-transform: uppercase; font-size: 1.2em; letter-spacing: 2px; text-align: center;"
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
        e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
    });

    // Focus effect
    inviteInput.addEventListener('focus', (e) => {
        e.target.parentElement.classList.add('focused');
    });

    inviteInput.addEventListener('blur', (e) => {
        e.target.parentElement.classList.remove('focused');
    });

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const inviteCode = inviteInput.value.trim().toUpperCase();

        if (inviteCode.length !== 8) {
            showToast('toast-code-length-invalid', 'error');
            inviteInput.focus();
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Joining...';
        inviteInput.disabled = true;

        try {
            const user = AuthService.getCurrentUser();
            const companyId = await CompanyService.joinWithInvitationCode(user.uid, inviteCode);

            // Set as current company
            await AuthService.setCurrentCompany(companyId);

            showToast('toast-joined-company', 'success');

            // Small delay to show success message
            setTimeout(() => {
                window.location.hash = '/dashboard';
            }, 1000);
        } catch (error) {
            console.error('Join error:', error);

            // Specific error messages
            let errorMessage = error.message;
            if (errorMessage.includes('Invalid invitation code')) {
                errorMessage = 'Invalid code. Please check and try again.';
            } else if (errorMessage.includes('expired')) {
                errorMessage = 'This invitation code has expired.';
            } else if (errorMessage.includes('already a member')) {
                errorMessage = 'You are already a member of this company.';
            } else if (errorMessage.includes('Too many')) {
                errorMessage = 'Too many attempts. Please wait 15 minutes.';
            }

            showToast(errorMessage, 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
            inviteInput.disabled = false;
            inviteInput.focus();
            inviteInput.select();
        }
    });
}