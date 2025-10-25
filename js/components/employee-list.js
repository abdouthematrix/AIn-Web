import { AuthService } from '../services/auth.js';
import { CompanyService } from '../services/company.js';
import { showToast, showConfirm, showLoading, hideLoading } from '../utils/helpers.js';

export async function renderEmployeeList() {
    showLoading();

    const companyId = AuthService.currentCompanyId;
    if (!companyId) {
        hideLoading();
        showToast('toast-select-company-first', 'error');
        window.location.hash = '/dashboard';
        return;
    }

    const role = await AuthService.getUserRole(companyId);
    if (role !== 'owner' && role !== 'manager') {
        hideLoading();
        showToast('toast-access-denied', 'error');
        window.location.hash = '/dashboard';
        return;
    }

    const employees = await CompanyService.getEmployees(companyId);
    const managers = await CompanyService.getManagers(companyId);
    const allInviteCodes = await CompanyService.getInvitationCodes(companyId);

    // Filter invitation codes based on role
    const inviteCodes = allInviteCodes.filter(invite => {
        if (role === 'owner') {
            // Owner sees all codes
            return true;
        } else if (role === 'manager') {
            // Manager only sees employee codes
            return invite.role === 'employee';
        }
        return false;
    });

    const content = `
    <div class="employee-container">
      <div class="employee-header">
        <h1 data-i18n="employees">Employees</h1>
        <button id="generate-invite-btn" class="btn btn-primary" data-i18n="generate-invite">
          Generate Invite Code
        </button>
      </div>
      
      <!-- Active Invitation Codes -->
      ${inviteCodes.length > 0 ? `
        <div class="employee-section">
          <h2 data-i18n="active-invites">Active Invitation Codes</h2>
          <div class="invite-codes-list">
            ${inviteCodes.map(invite => {
        const expiresAt = invite.expiresAt?.toDate?.() || new Date(invite.expiresAt);
        const isExpired = expiresAt < new Date();
        const daysLeft = Math.ceil((expiresAt - new Date()) / (1000 * 60 * 60 * 24));

        return `
                  <div class="invite-code-card ${isExpired ? 'expired' : ''}">
                    <div class="code-info">
                      <div class="code-display">${invite.code}</div>
                      <span class="badge badge-${invite.role}">${invite.role}</span>
                      ${isExpired ?
                '<span class="badge badge-danger">Expired</span>' :
                `<span class="text-muted">${daysLeft} days left</span>`
            }
                    </div>
                    <button class="btn btn-sm btn-danger delete-invite-btn" data-code="${invite.code}">
                      <span data-i18n="delete">Delete</span>
                    </button>
                  </div>
                `;
    }).join('')}
          </div>
        </div>
      ` : ''}
      
      <!-- Managers Section (Owner only) -->
      ${role === 'owner' ? `
        <div class="employee-section">
          <h2 data-i18n="managers">Managers (${managers.length})</h2>
          <div class="employee-list">
            ${managers.length > 0 ? managers.map(manager => `
              <div class="employee-card">
                <div class="employee-info">
                  <h3>${manager.userName || 'Unknown'}</h3>
                  <p>${manager.userEmail || ''}</p>
                  <small class="text-muted">Joined: ${manager.addedAt?.toDate?.().toLocaleDateString() || 'N/A'}</small>
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
        <h2 data-i18n="employees">Employees (${employees.length})</h2>
        <div class="employee-list">
          ${employees.length > 0 ? employees.map(employee => `
            <div class="employee-card">
              <div class="employee-info">
                <h3>${employee.userName || 'Unknown'}</h3>
                <p>${employee.userEmail || ''}</p>
                <small class="text-muted">Joined: ${employee.addedAt?.toDate?.().toLocaleDateString() || 'N/A'}</small>
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
          <p data-i18n="share-code">Share this code to join the company:</p>
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
        const btn = document.getElementById('generate-invite-btn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Generating...';

        try {
            const inviteCode = await CompanyService.createInvitationCode(companyId, 'employee');

            document.getElementById('invite-code-text').textContent = inviteCode;
            document.getElementById('invite-code-modal').style.display = 'flex';

            btn.disabled = false;
            btn.innerHTML = originalText;
        } catch (error) {
            showToast('toast-invite-generate-failed', 'error');
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });

    // Generate manager invite button
    document.getElementById('generate-manager-invite-btn')?.addEventListener('click', async () => {
        const btn = document.getElementById('generate-manager-invite-btn');
        const originalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Generating...';

        try {
            const inviteCode = await CompanyService.createInvitationCode(companyId, 'manager');

            document.getElementById('invite-code-text').textContent = inviteCode;
            document.getElementById('invite-code-modal').style.display = 'flex';

            btn.disabled = false;
            btn.innerHTML = originalText;
        } catch (error) {
            showToast('toast-invite-generate-failed', 'error');
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    });

    // Delete invitation code buttons
    document.querySelectorAll('.delete-invite-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const code = btn.getAttribute('data-code');
            const originalText = btn.innerHTML;

            showConfirm(
                'Delete this invitation code?',
                async () => {
                    btn.disabled = true;
                    btn.innerHTML = '<span class="spinner"></span>';

                    try {
                        await CompanyService.deleteInvitationCode(companyId, code);
                        showToast('toast-invite-deleted', 'success');
                        renderEmployeeList(); // Refresh
                    } catch (error) {
                        showToast('toast-invite-delete-failed', 'error');
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                    }
                }
            );
        });
    });

    // Copy code button
    document.getElementById('copy-code-btn')?.addEventListener('click', async () => {
        const code = document.getElementById('invite-code-text').textContent;
        const btn = document.getElementById('copy-code-btn');
        const originalText = btn.innerHTML;

        try {
            await navigator.clipboard.writeText(code);
            btn.innerHTML = '<span>✓ Copied!</span>';
            setTimeout(() => {
                btn.innerHTML = originalText;
            }, 2000);
            showToast('toast-code-copied', 'success');
        } catch (error) {
            showToast('toast-code-copy-failed', 'error');
        }
    });

    // Close modal button
    document.getElementById('close-invite-modal')?.addEventListener('click', () => {
        document.getElementById('invite-code-modal').style.display = 'none';
        renderEmployeeList(); // Refresh to show new code in list
    });

    // Remove employee buttons
    document.querySelectorAll('.remove-employee-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const employeeId = btn.getAttribute('data-id');
            const originalText = btn.innerHTML;

            showConfirm(
                'Are you sure you want to remove this employee?',
                async () => {
                    btn.disabled = true;
                    btn.innerHTML = '<span class="spinner"></span>';

                    try {
                        await CompanyService.removeEmployee(companyId, employeeId);
                        showToast('toast-employee-removed', 'success');
                        renderEmployeeList(); // Refresh
                    } catch (error) {
                        showToast('toast-employee-remove-failed', 'error');
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                    }
                }
            );
        });
    });

    // Remove manager buttons
    document.querySelectorAll('.remove-manager-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            const managerId = btn.getAttribute('data-id');
            const originalText = btn.innerHTML;

            showConfirm(
                'Are you sure you want to remove this manager?',
                async () => {
                    btn.disabled = true;
                    btn.innerHTML = '<span class="spinner"></span>';

                    try {
                        await CompanyService.removeManager(companyId, managerId);
                        showToast('toast-manager-removed', 'success');
                        renderEmployeeList(); // Refresh
                    } catch (error) {
                        showToast('toast-manager-remove-failed', 'error');
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                    }
                }
            );
        });
    });
}