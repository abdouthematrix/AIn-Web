import { AuthService } from '../services/auth.js';
import { showToast } from '../utils/helpers.js';

export async function renderLogin() {
    const content = `
    <div class="auth-container">
      <div class="auth-card">
        <div class="auth-header">
          <h1 data-i18n="app-name">A-In (عين)</h1>
          <p data-i18n="login-subtitle">Attendance Management System</p>
        </div>
        
        <form id="login-form" class="auth-form">
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
              data-i18n-placeholder="password-placeholder"
              autocomplete="current-password"
            />
          </div>
          
          <button type="submit" class="btn btn-primary btn-block" data-i18n="login">
            Login
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