import { AuthService } from '../services/auth.js';
import { CompanyService } from '../services/company.js';
import { AttendanceService } from '../services/attendance.js';
import { showToast, showLoading, hideLoading } from '../utils/helpers.js';

export async function renderCompanySetup() {
    showLoading();

    // Get URL parameters from hash
    const hash = window.location.hash.slice(1); // Remove the '#'
    const [, queryString] = hash.split('?');
    const urlParams = new URLSearchParams(queryString || '');
    const companyId = urlParams.get('id');

    // Determine if we're editing or creating
    const isEditMode = !!companyId;
    let companyData = null;

    // Load company data if editing
    if (isEditMode) {
        try {
            companyData = await CompanyService.getCompany(companyId);
            const user = AuthService.getCurrentUser();

            // Verify user is the owner
            if (companyData.ownerUid !== user.uid) {
                showToast('toast-unauthorized', 'error');
                window.location.hash = '/dashboard';
                return;
            }
        } catch (error) {
            console.error('Error loading company:', error);
            showToast('toast-company-load-failed', 'error');
            window.location.hash = '/dashboard';
            return;
        }
    }

    const content = `
    <div class="setup-container">
      <div class="setup-card">
        <div class="setup-header">
          <h1 data-i18n="${isEditMode ? 'edit-company' : 'create-company'}">${isEditMode ? 'Edit Company' : 'Create Your Company'}</h1>
          <p data-i18n="${isEditMode ? 'edit-company-subtitle' : 'company-setup-subtitle'}">${isEditMode ? 'Update your organization settings' : 'Set up your organization to start managing attendance'}</p>
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
              value="${isEditMode ? companyData.name : ''}"
            />
          </div>
          
          <div class="form-group">
            <label for="industry" data-i18n="industry">Industry (Optional)</label>
            <select id="industry" name="industry">
              <option value="">Select industry</option>
              <option value="technology" ${isEditMode && companyData.settings?.industry === 'technology' ? 'selected' : ''}>Technology</option>
              <option value="retail" ${isEditMode && companyData.settings?.industry === 'retail' ? 'selected' : ''}>Retail</option>
              <option value="healthcare" ${isEditMode && companyData.settings?.industry === 'healthcare' ? 'selected' : ''}>Healthcare</option>
              <option value="education" ${isEditMode && companyData.settings?.industry === 'education' ? 'selected' : ''}>Education</option>
              <option value="manufacturing" ${isEditMode && companyData.settings?.industry === 'manufacturing' ? 'selected' : ''}>Manufacturing</option>
              <option value="services" ${isEditMode && companyData.settings?.industry === 'services' ? 'selected' : ''}>Services</option>
              <option value="other" ${isEditMode && companyData.settings?.industry === 'other' ? 'selected' : ''}>Other</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="work-hours-start" data-i18n="work-hours-start">Work Hours Start</label>
            <input 
              type="time" 
              id="work-hours-start" 
              name="workHoursStart" 
              value="${isEditMode ? companyData.settings?.workHours?.start || '09:00' : '09:00'}"
            />
          </div>
          
          <div class="form-group">
            <label for="work-hours-end" data-i18n="work-hours-end">Work Hours End</label>
            <input 
              type="time" 
              id="work-hours-end" 
              name="workHoursEnd" 
              value="${isEditMode ? companyData.settings?.workHours?.end || '17:00' : '17:00'}"
            />
          </div>
          
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" id="require-selfie" name="requireSelfie" ${isEditMode && companyData.settings?.requireSelfie ? 'checked' : ''} />
              <span data-i18n="require-selfie">Require selfie verification for check-in</span>
            </label>
          </div>
          
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" id="gps-required" name="gpsRequired" ${isEditMode && companyData.settings?.gpsRequired ? 'checked' : ''} />
              <span data-i18n="gps-required">Require GPS validation (employees must be within radius)</span>
            </label>
          </div>
          
          <div id="gps-settings" style="display:${isEditMode && companyData.settings?.gpsRequired ? 'block' : 'none'};">
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
                  value="${isEditMode && companyData.settings?.officeLocation?.lat ? companyData.settings.officeLocation.lat : ''}"
                />
                <input 
                  type="number" 
                  id="office-lng" 
                  name="officeLng" 
                  placeholder="Longitude" 
                  step="any"
                  value="${isEditMode && companyData.settings?.officeLocation?.lng ? companyData.settings.officeLocation.lng : ''}"
                />
              </div>
              <small class="text-muted" data-i18n="gps-hint">Set your office location for attendance validation</small>
              
              <!-- Google Map Embed -->
              <div id="map-container" style="margin-top:10px; display:none;">
                <iframe 
                  id="location-map" 
                  style="width:100%; height:300px; border-radius:8px; border:1px solid #ddd;" 
                  frameborder="0" 
                  allowfullscreen
                ></iframe>
              </div>
            </div>
            
            <div class="form-group">
              <label for="gps-radius" data-i18n="gps-radius">Allowed Radius (meters)</label>
              <input 
                type="number" 
                id="gps-radius" 
                name="gpsRadius" 
                value="${isEditMode ? companyData.settings?.gpsRadius || 100 : 100}" 
                min="10" 
                max="1000"
              />
              <small class="text-muted" data-i18n="radius-hint">Employees must be within this distance to check in</small>
            </div>
          </div>
          
          <button type="submit" class="btn btn-primary btn-block" data-i18n="${isEditMode ? 'update-company-btn' : 'create-company-btn'}">
            ${isEditMode ? 'Update Company' : 'Create Company'}
          </button>
          
          ${isEditMode ? `
            <button type="button" id="cancel-edit-btn" class="btn btn-secondary btn-block" data-i18n="cancel">
              Cancel
            </button>
          ` : ''}
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

    hideLoading();

    // Update Google Maps embed
    function updateMapEmbed(lat, lng) {
        const mapContainer = document.getElementById('map-container');
        const mapIframe = document.getElementById('location-map');

        if (!mapContainer || !mapIframe) return;

        if (lat && lng && !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lng))) {
            // Show map container
            mapContainer.style.display = 'block';

            // Update iframe src with coordinates
            const embedUrl = `https://maps.google.com/maps?q=${lat},${lng}&z=16&output=embed`;
            mapIframe.src = embedUrl;
        } else {
            // Hide map if coordinates are invalid
            mapContainer.style.display = 'none';
        }
    }

    // Show/hide GPS settings
    const gpsRequiredCheckbox = document.getElementById('gps-required');
    const gpsSettings = document.getElementById('gps-settings');

    gpsRequiredCheckbox.addEventListener('change', (e) => {
        gpsSettings.style.display = e.target.checked ? 'block' : 'none';

        if (!e.target.checked) {
            document.getElementById('map-container').style.display = 'none';
        }
    });

    // Initialize map if location exists in edit mode
    if (isEditMode && companyData.settings?.gpsRequired && companyData.settings?.officeLocation) {
        const lat = companyData.settings.officeLocation.lat;
        const lng = companyData.settings.officeLocation.lng;
        updateMapEmbed(lat, lng);
    }

    // Update map when latitude changes
    document.getElementById('office-lat')?.addEventListener('input', (e) => {
        const lat = e.target.value;
        const lng = document.getElementById('office-lng').value;
        updateMapEmbed(lat, lng);
    });

    // Update map when longitude changes
    document.getElementById('office-lng')?.addEventListener('input', (e) => {
        const lat = document.getElementById('office-lat').value;
        const lng = e.target.value;
        updateMapEmbed(lat, lng);
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

            // Update map with new location
            updateMapEmbed(location.latitude, location.longitude);

            showToast('toast-location-captured', 'success');
            btn.disabled = false;
            btn.innerHTML = originalText;
        } catch (error) {
            showToast('toast-location-failed', 'error');
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });

    // Cancel edit button
    if (isEditMode) {
        document.getElementById('cancel-edit-btn')?.addEventListener('click', () => {
            window.location.hash = '/dashboard';
        });
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
        const gpsRequired = document.getElementById('gps-required').checked;

        if (!companyName) {
            showToast('toast-company-name-required', 'error');
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
                showToast('toast-office-location-required', 'error');
                return;
            }

            officeLocation = { lat, lng };
        }

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `<span class="spinner"></span> ${isEditMode ? 'Updating...' : 'Creating...'}`;

        try {
            const user = AuthService.getCurrentUser();

            if (isEditMode) {
                // Update existing company
                await CompanyService.updateCompany(companyId, {
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

                showToast('toast-company-updated', 'success');
                window.location.hash = '/dashboard';
            } else {
                // Create new company
                const newCompanyId = await CompanyService.createCompany(user.uid, {
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
                await AuthService.setCurrentCompany(newCompanyId);

                showToast('toast-company-created', 'success');
                window.location.hash = '/dashboard';
            }
        } catch (error) {
            console.error('Company operation error:', error);
            showToast(isEditMode ? 'toast-company-update-failed' : 'toast-company-create-failed', 'error');
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    });
}