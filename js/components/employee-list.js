import { AuthService } from '../services/auth.js';
import { CompanyService } from '../services/company.js';
import { showToast, showConfirm, showLoading, hideLoading } from '../utils/helpers.js';

export async function renderEmployeeList() {
    showLoading();

    const companyId = AuthService.currentCompanyId;
    if (!companyId) {
        showToast('Please select a company first', 'error');
        window.location.hash = '/dashboard';
        return;
    }

    const role = await AuthService.getUserRole(companyId);
    if (role !== 'owner' && role !== 'manager') {
        showToast('Access denied', 'error');
        window.location.hash = '/dashboard';
        return;
    }

    const employees = await CompanyService.getEmployees(companyId);
    const managers = await CompanyService.getManagers(companyId);

    const content = `
    <div class="employee-container">
      <div class="employee-header">
        <h1 data-i18n="employees">Employees</h1>
        <button id="generate-invite-btn" class="btn btn-primary" data-i18n="generate-invite">
          Generate Invite Code
        </button>
      </div>
      
      <!-- Managers Section (Owner only) -->
      ${role === 'owner' ? `
        <div class="employee-section">
          <h2 data-i18n="managers">Managers</h2>
          <div class="employee-list">
            ${managers.length > 0 ? managers.map(manager => `
              <div class="employee-card">
                <div class="employee-info">
                  <h3>${manager.user?.displayName || 'Unknown'}</h3>
                  <p>${manager.user?.email || ''}</p>
                  <span class="badge badge-${manager.status}">${manager.status}</span>
                </div>
                <div class="employee-actions">
                  <button class="btn btn-sm btn-danger remove-manager-btn" data-id="${manager.id}">
                    <span data-i18n="remove">Remove</span>
                  </button>
                </div>
              </div>
            `).join('') : `
              <p data-i18n="no-managers">No managers added yet</p>
            `}
          </div>
          <button id="generate-manager-invite-btn" class="btn btn-secondary" data-i18n="generate-manager-invite">
            Generate Manager Invite
          </button>
        </div>
      ` : ''}
      
      <!-- Employees Section -->
      <div class="employee-section">
        <h2 data-i18n="employees">Employees</h2>
        <div class="employee-list">
          ${employees.length > 0 ? employees.map(employee => `
            <div class="employee-card">
              <div class="employee-info">
                <h3>${employee.user?.displayName || 'Unknown'}</h3>
                <p>${employee.user?.email || ''}</p>
                <span class="badge badge-${employee.status}">${employee.status}</span>
              </div>
              <div class="employee-actions">
                <a href="#/attendance-history?user=${employee.id}" class="btn btn-sm btn-secondary">
                  <span data-i18n="view-attendance">View Attendance</span>
                </a>
                <button class="btn btn-sm btn-danger remove-employee-btn" data-id="${employee.id}">
                  <span data-i18n="remove">Remove</span>
                </button>
              </div>
            </div>
          `).join('') : `
            <p data-i18n="no-employees">No employees added yet</p>
          `}
        </div>
      </div>
    </div>
    
    <!-- Invite Code Modal -->
    <div id="invite-code-modal" class="modal" style="display:none;">
      <div class="modal-content">
        <h2 data-i18n="invitation-code">Invitation Code</h2>
        <div class="invite-code-display">
          <p data-i18n="share-code">Share this code with your employee:</p>
          <div class="code-box">
            <span id="invite-code-text"></span>
            <button id="copy-code-btn" class="btn btn-sm btn-secondary">
              <span data-i18n="copy">Copy</span>
            </button>
          </div>
          <p class="code-info" data-i18n="code-expires">Code expires in 7 days</p>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-primary" id="close-invite-modal" data-i18n="close">Close</button>
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

    // Generate employee invite button
    document.getElementById('generate-invite-btn')?.addEventListener('click', async () => {
        try {
            showLoading();
            const inviteCode = await CompanyService.createInvitationCode(companyId, 'employee');
            hideLoading();

            document.getElementById('invite-code-text').textContent = inviteCode;
            document.getElementById('invite-code-modal').style.display = 'flex';
        } catch (error) {
            hideLoading();
            showToast('Failed to generate invite code', 'error');
        }
    });

    // Generate manager invite button
    document.getElementById('generate-manager-invite-btn')?.addEventListener('click', async () => {
        try {
            showLoading();
            const inviteCode = await CompanyService.createInvitationCode(companyId, 'manager');
            hideLoading();

            document.getElementById('invite-code-text').textContent = inviteCode;
            document.getElementById('invite-code-modal').style.display = 'flex';
        } catch (error) {
            hideLoading();
            showToast('Failed to generate invite code', 'error');
        }
    });

    // Copy code button
    document.getElementById('copy-code-btn')?.addEventListener('click', async () => {
        const code = document.getElementById('invite-code-text').textContent;
        try {
            await navigator.clipboard.writeText(code);
            showToast('Code copied to clipboard!', 'success');
        } catch (error) {
            showToast('Failed to copy code', 'error');
        }
    });

    // Close modal button
    document.getElementById('close-invite-modal')?.addEventListener('click', () => {
        document.getElementById('invite-code-modal').style.display = 'none';
    });

    // Remove employee buttons
    document.querySelectorAll('.remove-employee-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const employeeId = btn.getAttribute('data-id');

            showConfirm(
                'Are you sure you want to remove this employee?',
                async () => {
                    try {
                        await CompanyService.removeEmployee(companyId, employeeId);
                        showToast('Employee removed successfully', 'success');
                        renderEmployeeList(); // Refresh
                    } catch (error) {
                        showToast('Failed to remove employee', 'error');
                    }
                }
            );
        });
    });

    // Remove manager buttons
    document.querySelectorAll('.remove-manager-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const managerId = btn.getAttribute('data-id');

            showConfirm(
                'Are you sure you want to remove this manager?',
                async () => {
                    try {
                        await CompanyService.removeManager(companyId, managerId);
                        showToast('Manager removed successfully', 'success');
                        renderEmployeeList(); // Refresh
                    } catch (error) {
                        showToast('Failed to remove manager', 'error');
                    }
                }
            );
        });
    });
}