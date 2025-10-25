import { AuthService } from '../services/auth.js';
import { showToast, isValidEmail } from '../utils/helpers.js';

export async function renderSignup() {
    const content = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1 data-i18n="app-name">A-In (عين)</h1>
          <p data-i18n="signup-subtitle">Create your account</p>
        </div>
        
        <form id="signup-form" class="auth-form">
          <div class="form-group">
            <label for="display-name" data-i18n="full-name">Full Name</label>
            <input 
              type="text" 
              id="display-name" 
              name="displayName" 
              required 
              data-i18n-placeholder="full-name-placeholder"
            />
          </div>
          
          <div class="form-group">
            <label for="email" data-i18n="email">Email</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              required 
              data-i18n-placeholder="email-placeholder"
              autocomplete="email"
            />
          </div>
          
          <div class="form-group">
            <label for="password" data-i18n="password">Password</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              required 
              minlength="6"
              data-i18n-placeholder="password-placeholder"
              autocomplete="new-password"
            />
            <small data-i18n="password-hint">Minimum 6 characters</small>
          </div>
          
          <div class="form-group">
            <label for="confirm-password" data-i18n="confirm-password">Confirm Password</label>
            <input 
              type="password" 
              id="confirm-password" 
              name="confirmPassword" 
              required 
              minlength="6"
              data-i18n-placeholder="confirm-password-placeholder"
              autocomplete="new-password"
            />
          </div>
          
          <button type="submit" class="btn btn-primary btn-block" data-i18n="signup">
            Sign Up
          </button>
        </form>
        
        <div class="auth-footer">
          <p>
            <span data-i18n="have-account">Already have an account?</span>
            <a href="#/login" data-route="/login" data-i18n="login">Login</a>
          </p>
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
    const form = document.getElementById('signup-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const displayName = document.getElementById('display-name').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirm-password').value;

        // Validation
        if (!displayName) {
            showToast('toast-name-required', 'error');
            return;
        }

        if (!isValidEmail(email)) {
            showToast('toast-valid-email-required', 'error');
            return;
        }

        if (password.length < 6) {
            showToast('toast-password-min-length', 'error');
            return;
        }

        if (password !== confirmPassword) {
            showToast('toast-passwords-not-match', 'error');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = window.app?.i18n.t('btn-creating-account') || 'Creating account...';

        try {
            await AuthService.signUp(email, password, displayName);
            showToast('toast-signup-success', 'success');
            // User will be automatically redirected by auth state listener
        } catch (error) {
            console.error('Signup error:', error);
            let message = 'toast-signup-failed';

            if (error.code === 'auth/email-already-in-use') {
                message = 'toast-email-in-use';
            } else if (error.code === 'auth/invalid-email') {
                message = 'toast-invalid-email';
            } else if (error.code === 'auth/weak-password') {
                message = 'toast-weak-password';
            }

            showToast(message, 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = window.app?.i18n.t('signup') || 'Sign Up';
        }
    });
}