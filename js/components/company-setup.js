import { AuthService } from '../services/auth.js';
import { CompanyService } from '../services/company.js';
import { showToast } from '../utils/helpers.js';

export async function renderCompanySetup() {
    const content = `
    <div class="setup-container">
      <div class="setup-card">
        <div class="setup-header">
          <h1 data-i18n="create-company">Create Your Company</h1>
          <p data-i18n="company-setup-subtitle">Set up your organization to start managing attendance</p>
        </div>
        
        <form id="company-setup-form" class="setup-form">
          <div class="form-group">
            <label for="company-name" data-i18n="company-name">Company Name</label>
            <input 
              type="text" 
              id="company-name" 
              name="companyName" 
              required 
              data-i18n-placeholder="company-name-placeholder"
            />
          </div>
          
          <div class="form-group">
            <label for="industry" data-i18n="industry">Industry (Optional)</label>
            <select id="industry" name="industry">
              <option value="">Select industry</option>
              <option value="technology">Technology</option>
              <option value="retail">Retail</option>
              <option value="healthcare">Healthcare</option>
              <option value="education">Education</option>
              <option value="manufacturing">Manufacturing</option>
              <option value="services">Services</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="work-hours-start" data-i18n="work-hours-start">Work Hours Start</label>
            <input 
              type="time" 
              id="work-hours-start" 
              name="workHoursStart" 
              value="09:00"
            />
          </div>
          
          <div class="form-group">
            <label for="work-hours-end" data-i18n="work-hours-end">Work Hours End</label>
            <input 
              type="time" 
              id="work-hours-end" 
              name="workHoursEnd" 
              value="17:00"
            />
          </div>
          
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" id="require-selfie" name="requireSelfie" />
              <span data-i18n="require-selfie">Require selfie verification for check-in</span>
            </label>
          </div>
          
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" id="gps-tracking" name="gpsTracking" checked />
              <span data-i18n="gps-tracking">Enable GPS tracking</span>
            </label>
          </div>
          
          <button type="submit" class="btn btn-primary btn-block" data-i18n="create-company-btn">
            Create Company
          </button>
        </form>
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
    const form = document.getElementById('company-setup-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const companyName = document.getElementById('company-name').value.trim();
        const industry = document.getElementById('industry').value;
        const workHoursStart = document.getElementById('work-hours-start').value;
        const workHoursEnd = document.getElementById('work-hours-end').value;
        const requireSelfie = document.getElementById('require-selfie').checked;
        const gpsTracking = document.getElementById('gps-tracking').checked;

        if (!companyName) {
            showToast('Please enter a company name', 'error');
            return;
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Creating...';

        try {
            const user = AuthService.getCurrentUser();
            const companyId = await CompanyService.createCompany(user.uid, {
                name: companyName,
                settings: {
                    industry,
                    workHours: {
                        start: workHoursStart,
                        end: workHoursEnd
                    },
                    requireSelfie,
                    gpsTracking
                }
            });

            // Set as current company
            await AuthService.setCurrentCompany(companyId);

            showToast('Company created successfully!', 'success');
            window.location.hash = '/dashboard';
        } catch (error) {
            console.error('Company creation error:', error);
            showToast('Failed to create company. Please try again.', 'error');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Company';
        }
    });
}