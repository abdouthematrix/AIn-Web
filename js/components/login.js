import { AuthService } from '../services/auth.js';
import { showToast } from '../utils/helpers.js';

export async function renderLogin() {
    const content = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1 class="brand-logo">
           <span class="fa-stack" style="color: var(--primary-color); -webkit-text-fill-color: initial !important;">
                        <i class="fa-solid fa-eye fa-stack-2x"></i>
                        <i class="fa-solid fa-fingerprint fa-stack-1x fa-inverse"></i>
                    </span>
            <span data-i18n="app-name">A-In (عين)</span>
          </h1>
          <p data-i18n="login-subtitle">Attendance Management System</p>
        </div>
        
        <form id="login-form" class="auth-form">
          <div class="form-group">
            <label for="email">
              <i class="fas fa-envelope"></i>
              <span data-i18n="email">Email</span>
            </label>
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
            <label for="password">
              <i class="fas fa-lock"></i>
              <span data-i18n="password">Password</span>
            </label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              required 
              data-i18n-placeholder="password-placeholder"
              autocomplete="current-password"
            />
          </div>
          
          <button type="submit" class="btn btn-primary btn-block">
            <i class="fas fa-sign-in-alt"></i>
            <span data-i18n="login">Login</span>
          </button>
        </form>
        
        <div class="auth-footer">
          <p>
            <span data-i18n="no-account">Don't have an account?</span>
            <a href="#/signup" data-route="/signup" data-i18n="signup">Sign Up</a>
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
    const form = document.getElementById('login-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = window.app?.i18n.t('btn-logging-in') || 'Logging in...';

        try {
            await AuthService.signIn(email, password);
            showToast('toast-login-success', 'success');
        } catch (error) {
            console.error('Login error:', error);
            let message = 'toast-login-failed';

            if (error.code === 'auth/user-not-found') {
                message = 'toast-user-not-found';
            } else if (error.code === 'auth/wrong-password') {
                message = 'toast-wrong-password';
            } else if (error.code === 'auth/invalid-email') {
                message = 'toast-invalid-email';
            }

            showToast(message, 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = window.app?.i18n.t('login') || 'Login';
        }
    });
}