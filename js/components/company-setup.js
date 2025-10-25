import { AuthService } from '../services/auth.js';
import { CompanyService } from '../services/company.js';
import { AttendanceService } from '../services/attendance.js';
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
              <input type="checkbox" id="gps-required" name="gpsRequired" />
              <span data-i18n="gps-required">Require GPS validation (employees must be within radius)</span>
            </label>
          </div>
          
          <div id="gps-settings" style="display:none;">
            <div class="form-group">
              <label data-i18n="office-location">Office Location</label>
              <button type="button" id="get-current-location-btn" class="btn btn-secondary btn-sm">
                <span data-i18n="use-current-location">Use Current Location</span>
              </button>
              <div class="location-inputs">
                <input 
                  type="number" 
                  id="office-lat" 
                  name="officeLat" 
                  placeholder="Latitude" 
                  step="any"
                />
                <input 
                  type="number" 
                  id="office-lng" 
                  name="officeLng" 
                  placeholder="Longitude" 
                  step="any"
                />
              </div>
              <small class="text-muted" data-i18n="gps-hint">Set your office location for attendance validation</small>
            </div>
            
            <div class="form-group">
              <label for="gps-radius" data-i18n="gps-radius">Allowed Radius (meters)</label>
              <input 
                type="number" 
                id="gps-radius" 
                name="gpsRadius" 
                value="100" 
                min="10" 
                max="1000"
              />
              <small class="text-muted" data-i18n="radius-hint">Employees must be within this distance to check in</small>
            </div>
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

    // Show/hide GPS settings
    const gpsRequiredCheckbox = document.getElementById('gps-required');
    const gpsSettings = document.getElementById('gps-settings');

    gpsRequiredCheckbox.addEventListener('change', (e) => {
        gpsSettings.style.display = e.target.checked ? 'block' : 'none';
    });

    // Get current location button
    document.getElementById('get-current-location-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('get-current-location-btn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Getting location...';

        try {
            const location = await AttendanceService.getCurrentLocation();
            document.getElementById('office-lat').value = location.latitude;
            document.getElementById('office-lng').value = location.longitude;
            showToast('Location captured successfully!', 'success');
            btn.disabled = false;
            btn.innerHTML = originalText;
        } catch (error) {
            showToast(error.message || 'Failed to get location', 'error');
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });

    // Setup form handler
    const form = document.getElementById('company-setup-form');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const companyName = document.getElementById('company-name').value.trim();
        const industry = document.getElementById('industry').value;
        const workHoursStart = document.getElementById('work-hours-start').value;
        const workHoursEnd = document.getElementById('work-hours-end').value;
        const requireSelfie = document.getElementById('require-selfie').checked;
        const gpsRequired = document.getElementById('gps-required').checked;

        if (!companyName) {
            showToast('Please enter a company name', 'error');
            return;
        }

        // GPS validation
        let officeLocation = null;
        let gpsRadius = 100;

        if (gpsRequired) {
            const lat = parseFloat(document.getElementById('office-lat').value);
            const lng = parseFloat(document.getElementById('office-lng').value);
            gpsRadius = parseInt(document.getElementById('gps-radius').value);

            if (!lat || !lng || isNaN(lat) || isNaN(lng)) {
                showToast('Please set office location for GPS validation', 'error');
                return;
            }

            officeLocation = { lat, lng };
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> Creating...';

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
                    gpsRequired,
                    officeLocation,
                    gpsRadius
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
            submitBtn.innerHTML = originalText;
        }
    });
}