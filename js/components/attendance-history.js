import { AuthService } from '../services/auth.js';
import { AttendanceService } from '../services/attendance.js';
import { CompanyService } from '../services/company.js';
import { showToast, showConfirm, formatDate, formatTime, showLoading, hideLoading } from '../utils/helpers.js';

export async function renderAttendanceHistory() {
    showLoading();

    const user = AuthService.getCurrentUser();
    const companyId = AuthService.currentCompanyId;

    if (!companyId) {
        hideLoading();
        showToast('toast-select-company-first', 'error');
        window.location.hash = '/dashboard';
        return;
    }

    // Check user role
    const role = await AuthService.getUserRole(companyId);
    const isManager = role === 'owner' || role === 'manager';

    // Get URL parameters from hash
    const hash = window.location.hash.slice(1); // Remove the '#'
    const [, queryString] = hash.split('?');
    const urlParams = new URLSearchParams(queryString || '');
    const selectedMonth = urlParams.get('month');
    const viewUserId = urlParams.get('user'); // For managers viewing specific employee

    const now = new Date();
    let year, month;

    if (selectedMonth) {
        [year, month] = selectedMonth.split('-').map(Number);
    } else {
        year = now.getFullYear();
        month = now.getMonth() + 1;
    }

    const startOfMonth = new Date(year, month - 1, 1).toISOString().split('T')[0];
    const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];

    try {
        let attendance = [];
        let viewingUserName = null;
        let uniqueUsers = []; // Unique users from attendance records

        if (isManager) {
            if (viewUserId) {
                // Viewing specific user
                attendance = await AttendanceService.getUserAttendanceHistory(
                    companyId,
                    viewUserId,
                    startOfMonth,
                    endOfMonth
                );

                // Get viewing user name from first attendance record
                if (attendance.length > 0) {
                    viewingUserName = attendance[0].userName || attendance[0].userEmail || viewUserId;
                }
            } else {
                // Viewing all users for the month
                attendance = await AttendanceService.getCompanyAttendanceRange(
                    companyId,
                    startOfMonth,
                    endOfMonth
                );

                // Extract unique users from attendance records for dropdown
                const userMap = new Map();
                for (const record of attendance) {
                    if (!userMap.has(record.userId)) {
                        // Get user data from the attendance record itself
                        userMap.set(record.userId, {
                            displayName: record.userName || record.userEmail || record.userId,
                            email: record.userEmail || ''
                        });
                    }
                }
                uniqueUsers = Array.from(userMap, ([userId, userData]) => ({
                    id: userId,
                    user: userData
                }));
            }
        } else {
            // Employee: View only their own attendance
            attendance = await AttendanceService.getUserAttendanceHistory(
                companyId,
                user.uid,
                startOfMonth,
                endOfMonth
            );
        }

        const content = `
        <div class="history-container">
          <div class="history-header">
            <h1 data-i18n="attendance-history">Attendance History</h1>
            <div class="history-filters">
              ${isManager && !viewUserId ? `
                <select id="employee-selector" class="form-control" style="margin-right: 10px;">
                  <option value="">All Users</option>
                  ${uniqueUsers.map(u => {
            const name = u.user?.displayName || u.user?.email || 'Unknown';
            return `<option value="${u.id}">${name}</option>`;
        }).join('')}
                </select>
              ` : ''}
              ${viewingUserName ? `
                <div class="viewing-employee">
                  <span>Viewing: <strong>${viewingUserName}</strong></span>
                  <button id="view-all-btn" class="btn btn-sm btn-secondary" style="margin: 0 10px;">View All</button>
                </div>
              ` : ''}
              <select id="month-selector" aria-label="Select month">
                ${generateMonthOptions(year, month)}
              </select>
            </div>
          </div>
          
          <div class="history-stats">
            <div class="stat-card">
              <h3 data-i18n="total-days">Total Days</h3>
              <p class="stat-value">${viewUserId ? attendance.length : getUniqueDaysCount(attendance)}</p>
            </div>
            <div class="stat-card">
              <h3 data-i18n="total-hours">Total Hours</h3>
              <p class="stat-value">${calculateTotalHours(attendance)}h</p>
            </div>
            <div class="stat-card">
              <h3 data-i18n="avg-hours">Avg Hours/Day</h3>
              <p class="stat-value">${calculateAvgHours(attendance)}h</p>
            </div>
            ${isManager && !viewUserId ? `
              <div class="stat-card">
                <h3 data-i18n="pending-approval">Pending Approval</h3>
                <p class="stat-value">${attendance.filter(r => r.status === 'pending').length}</p>
              </div>
              <div class="stat-card">
                <h3 data-i18n="total-users">Total Users</h3>
                <p class="stat-value">${uniqueUsers.length}</p>
              </div>
            ` : ''}
          </div>
          
          <div class="history-list">
            ${attendance.length > 0 ? `
              <table class="attendance-table">
                <thead>
                  <tr>
                    ${isManager && !viewUserId ? '<th data-i18n="employee">Employee</th>' : ''}
                    <th data-i18n="date">Date</th>
                    <th data-i18n="check-in">Check In</th>
                    <th data-i18n="check-out">Check Out</th>
                    <th data-i18n="hours">Hours</th>
                    <th data-i18n="status">Status</th>
                    <th data-i18n="photo">Photo</th>
                    ${isManager ? '<th data-i18n="actions">Actions</th>' : ''}
                  </tr>
                </thead>
                <tbody>
                  ${attendance.map(record => {
            const hours = record.checkOut ?
                AttendanceService.calculateWorkHours(record.checkIn, record.checkOut) : '-';
            const displayName = record.userName || record.userEmail || record.userId;

            return `
                        <tr>
                          ${isManager && !viewUserId ? `<td><a href="#/attendance-history?user=${record.userId}&month=${year}-${String(month).padStart(2, '0')}">${displayName}</a></td>` : ''}
                          <td>${formatDate(record.date)}</td>
                          <td>${record.checkIn ? formatTime(record.checkIn) : '-'}</td>
                          <td>${record.checkOut ? formatTime(record.checkOut) : '<span class="text-warning">Not checked out</span>'}</td>
                          <td>${hours !== '-' ? hours + 'h' : '-'}</td>
                          <td>
                            <span class="badge badge-${record.status}">${record.status}</span>
                            ${record.biometricConfirmed ? '<span class="badge badge-success" title="Selfie verified">✓</span>' : ''}
                          </td>
                          <td>
                            ${record.selfieData ? `
                              <button class="btn btn-sm btn-secondary view-selfie-btn" 
                                      data-selfie="${record.selfieData}" 
                                      aria-label="View check-in photo">
                                View
                              </button>
                            ` : '-'}
                          </td>
                          ${isManager ? `
                            <td>
                              <div class="action-buttons">
                                ${record.status === 'pending' ? `
                                  <button class="btn btn-sm btn-success approve-btn" 
                                          data-user-id="${record.userId}" 
                                          data-date="${record.date}"
                                          title="Approve">
                                    ✓
                                  </button>
                                  <button class="btn btn-sm btn-warning reject-btn" 
                                          data-user-id="${record.userId}" 
                                          data-date="${record.date}"
                                          title="Reject">
                                    ✗
                                  </button>
                                ` : ''}
                                <button class="btn btn-sm btn-secondary edit-btn" 
                                        data-user-id="${record.userId}" 
                                        data-date="${record.date}"
                                        title="Edit">
                                  ✎
                                </button>
                                ${record.gps ? `
                                  <button class="btn btn-sm btn-info view-location-btn" 
                                          data-lat="${record.gps.lat}" 
                                          data-lng="${record.gps.lng}"
                                          title="View Location">
                                    📍
                                  </button>
                                ` : ''}
                                <button class="btn btn-sm btn-danger delete-btn" 
                                        data-user-id="${record.userId}" 
                                        data-date="${record.date}"
                                        title="Delete">
                                  🗑
                                </button>
                              </div>
                            </td>
                          ` : ''}
                        </tr>
                      `;
        }).join('')}
                </tbody>
              </table>
            ` : `
              <div class="empty-state">
                <p data-i18n="no-attendance-records">No attendance records found for this period</p>
              </div>
            `}
          </div>
        </div>
        
        <!-- Selfie Modal -->
        <div id="selfie-modal" class="modal" style="display:none;" role="dialog" aria-modal="true" aria-labelledby="selfie-modal-title">
          <div class="modal-content">
            <h2 id="selfie-modal-title" data-i18n="check-in-photo">Check-in Photo</h2>
            <img id="selfie-image" src="" alt="Check-in selfie" style="max-width: 100%; border-radius: 8px;" />
            <div class="modal-actions">
              <button type="button" class="btn btn-primary" id="close-selfie-modal" data-i18n="close">Close</button>
            </div>
          </div>
        </div>

        ${isManager ? `
        <!-- Edit Attendance Modal -->
        <div id="edit-modal" class="modal" style="display:none;" role="dialog" aria-modal="true">
          <div class="modal-content">
            <h2 data-i18n="edit-attendance">Edit Attendance</h2>
            <form id="edit-attendance-form">
              <div class="form-group">
                <label for="edit-check-in" data-i18n="check-in-time">Check-in Time</label>
                <input type="time" id="edit-check-in" class="form-control" required />
              </div>
              <div class="form-group">
                <label for="edit-check-out" data-i18n="check-out-time">Check-out Time</label>
                <input type="time" id="edit-check-out" class="form-control" />
              </div>
              <div class="form-group">
                <label for="edit-status" data-i18n="status">Status</label>
                <select id="edit-status" class="form-control">
                  <option value="pending">Pending</option>
                  <option value="approved">Approved</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              <div class="form-group">
                <label for="edit-notes" data-i18n="notes">Notes (Optional)</label>
                <textarea id="edit-notes" class="form-control" rows="3"></textarea>
              </div>
              <input type="hidden" id="edit-user-id" />
              <input type="hidden" id="edit-date" />
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" id="cancel-edit-btn" data-i18n="cancel">Cancel</button>
                <button type="submit" class="btn btn-primary" data-i18n="save-changes">Save Changes</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Location Modal -->
        <div id="location-modal" class="modal" style="display:none;" role="dialog" aria-modal="true">
          <div class="modal-content">
            <h2 data-i18n="check-in-location">Check-in Location</h2>
            <div id="location-info" style="margin: 20px 0;">
              <p><strong>Latitude:</strong> <span id="location-lat"></span></p>
              <p><strong>Longitude:</strong> <span id="location-lng"></span></p>
            </div>
            <div id="map-link" style="margin: 10px 0;"></div>
            <div class="modal-actions">
              <button type="button" class="btn btn-primary" id="close-location-modal" data-i18n="close">Close</button>
            </div>
          </div>
        </div>
        ` : ''}
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

        // Month selector change handler
        document.getElementById('month-selector')?.addEventListener('change', (e) => {
            const selectedValue = e.target.value;
            const currentParams = new URLSearchParams(window.location.search);
            currentParams.set('month', selectedValue);
            window.location.hash = `/attendance-history?${currentParams.toString()}`;
        });

        // Employee selector (for managers)
        document.getElementById('employee-selector')?.addEventListener('change', (e) => {
            const selectedUserId = e.target.value;
            const currentParams = new URLSearchParams(window.location.search);

            if (selectedUserId) {
                currentParams.set('user', selectedUserId);
            } else {
                currentParams.delete('user');
            }

            window.location.hash = `/attendance-history?${currentParams.toString()}`;
        });

        // View all button
        document.getElementById('view-all-btn')?.addEventListener('click', () => {
            const currentParams = new URLSearchParams(window.location.search);
            currentParams.delete('user');
            window.location.hash = `/attendance-history?${currentParams.toString()}`;
        });

        // View selfie buttons
        document.querySelectorAll('.view-selfie-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const selfieData = btn.getAttribute('data-selfie');
                const dataUrl = AttendanceService.base64ToDataUrl(selfieData);
                document.getElementById('selfie-image').src = dataUrl;
                document.getElementById('selfie-modal').style.display = 'flex';
                document.getElementById('close-selfie-modal')?.focus();
            });
        });

        // Close selfie modal
        document.getElementById('close-selfie-modal')?.addEventListener('click', () => {
            closeSelfieModal();
        });

        // Manager-only features
        if (isManager) {
            // Approve buttons
            document.querySelectorAll('.approve-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const userId = btn.getAttribute('data-user-id');
                    const date = btn.getAttribute('data-date');
                    const originalHtml = btn.innerHTML;

                    btn.disabled = true;
                    btn.innerHTML = '<span class="spinner"></span>';

                    try {
                        await AttendanceService.updateAttendanceStatus(companyId, userId, date, 'approved');
                        showToast('toast-attendance-approved', 'success');
                        renderAttendanceHistory();
                    } catch (error) {
                        console.error('Error approving attendance:', error);
                        showToast('toast-attendance-approve-failed', 'error');
                        btn.disabled = false;
                        btn.innerHTML = originalHtml;
                    }
                });
            });

            // Reject buttons
            document.querySelectorAll('.reject-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const userId = btn.getAttribute('data-user-id');
                    const date = btn.getAttribute('data-date');
                    const originalHtml = btn.innerHTML;

                    showConfirm(
                        'Reject this attendance record?',
                        async () => {
                            btn.disabled = true;
                            btn.innerHTML = '<span class="spinner"></span>';

                            try {
                                await AttendanceService.updateAttendanceStatus(companyId, userId, date, 'rejected');
                                showToast('toast-attendance-rejected', 'success');
                                renderAttendanceHistory();
                            } catch (error) {
                                console.error('Error rejecting attendance:', error);
                                showToast('toast-attendance-reject-failedss', 'error');
                                btn.disabled = false;
                                btn.innerHTML = originalHtml;
                            }
                        }
                    );
                });
            });

            // Edit buttons
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const userId = btn.getAttribute('data-user-id');
                    const date = btn.getAttribute('data-date');

                    try {
                        const record = await AttendanceService.getAttendanceByDate(companyId, userId, date);

                        if (record) {
                            document.getElementById('edit-user-id').value = userId;
                            document.getElementById('edit-date').value = date;

                            if (record.checkIn) {
                                const checkInTime = record.checkIn.toDate ? record.checkIn.toDate() : new Date(record.checkIn);
                                document.getElementById('edit-check-in').value =
                                    checkInTime.toTimeString().substring(0, 5);
                            }

                            if (record.checkOut) {
                                const checkOutTime = record.checkOut.toDate ? record.checkOut.toDate() : new Date(record.checkOut);
                                document.getElementById('edit-check-out').value =
                                    checkOutTime.toTimeString().substring(0, 5);
                            }

                            document.getElementById('edit-status').value = record.status || 'pending';
                            document.getElementById('edit-notes').value = record.notes || '';

                            document.getElementById('edit-modal').style.display = 'flex';
                        }
                    } catch (error) {
                        console.error('Error loading attendance data:', error);
                        showToast('toast-attendance-load-failed', 'error');
                    }
                });
            });

            // Edit form submit
            document.getElementById('edit-attendance-form')?.addEventListener('submit', async (e) => {
                e.preventDefault();

                const userId = document.getElementById('edit-user-id').value;
                const date = document.getElementById('edit-date').value;
                const checkInTime = document.getElementById('edit-check-in').value;
                const checkOutTime = document.getElementById('edit-check-out').value;
                const status = document.getElementById('edit-status').value;
                const notes = document.getElementById('edit-notes').value;

                const submitBtn = e.target.querySelector('button[type="submit"]');
                const originalHtml = submitBtn.innerHTML;
                submitBtn.disabled = true;
                submitBtn.innerHTML = '<span class="spinner"></span> Saving...';

                try {
                    const updates = { status };

                    if (checkInTime) {
                        const checkInDate = new Date(`${date}T${checkInTime}`);
                        updates.checkIn = firebase.firestore.Timestamp.fromDate(checkInDate);
                    }

                    if (checkOutTime) {
                        const checkOutDate = new Date(`${date}T${checkOutTime}`);
                        updates.checkOut = firebase.firestore.Timestamp.fromDate(checkOutDate);
                    }

                    if (notes) {
                        updates.notes = notes;
                    }

                    await AttendanceService.updateAttendance(companyId, userId, date, updates);

                    showToast('toast-attendance-updated', 'success');
                    document.getElementById('edit-modal').style.display = 'none';
                    renderAttendanceHistory();
                } catch (error) {
                    console.error('Error updating attendance:', error);
                    showToast('toast-attendance-update-failed', 'error');
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalHtml;
                }
            });

            // Cancel edit button
            document.getElementById('cancel-edit-btn')?.addEventListener('click', () => {
                document.getElementById('edit-modal').style.display = 'none';
            });

            // Delete buttons
            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const userId = btn.getAttribute('data-user-id');
                    const date = btn.getAttribute('data-date');
                    const originalHtml = btn.innerHTML;

                    showConfirm(
                        'Are you sure you want to delete this attendance record? This action cannot be undone.',
                        async () => {
                            btn.disabled = true;
                            btn.innerHTML = '<span class="spinner"></span>';

                            try {
                                await AttendanceService.deleteAttendance(companyId, userId, date);
                                showToast('toast-attendance-deleted ', 'success');
                                renderAttendanceHistory();
                            } catch (error) {
                                console.error('Error deleting attendance:', error);
                                showToast('toast-attendance-delete-failed', 'error');
                                btn.disabled = false;
                                btn.innerHTML = originalHtml;
                            }
                        }
                    );
                });
            });

            // View location buttons
            document.querySelectorAll('.view-location-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const lat = btn.getAttribute('data-lat');
                    const lng = btn.getAttribute('data-lng');

                    document.getElementById('location-lat').textContent = lat;
                    document.getElementById('location-lng').textContent = lng;

                    const mapsUrl = `https://www.google.com/maps?q=${lat},${lng}`;
                    document.getElementById('map-link').innerHTML =
                        `<a href="${mapsUrl}" target="_blank" class="btn btn-secondary">Open in Google Maps</a>`;

                    document.getElementById('location-modal').style.display = 'flex';
                });
            });

            // Close location modal
            document.getElementById('close-location-modal')?.addEventListener('click', () => {
                document.getElementById('location-modal').style.display = 'none';
            });
        }

        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeSelfieModal();
                if (isManager) {
                    document.getElementById('edit-modal').style.display = 'none';
                    document.getElementById('location-modal').style.display = 'none';
                }
            }
        });

        // Click outside to close selfie modal
        document.getElementById('selfie-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'selfie-modal') {
                closeSelfieModal();
            }
        });

    } catch (error) {
        console.error('Failed to load attendance history:', error);
        hideLoading();
        showToast('toast-attendance-history-failed', 'error');
    }
}

function closeSelfieModal() {
    const modal = document.getElementById('selfie-modal');
    if (modal) {
        modal.style.display = 'none';
        const img = document.getElementById('selfie-image');
        if (img) {
            img.src = '';
        }
    }
}

function generateMonthOptions(currentYear, currentMonth) {
    const months = [];
    const now = new Date();

    for (let i = 0; i < 12; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const value = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        const label = date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const isSelected = date.getFullYear() === currentYear && (date.getMonth() + 1) === currentMonth;
        const selected = isSelected ? 'selected' : '';
        months.push(`<option value="${value}" ${selected}>${label}</option>`);
    }

    return months.join('');
}

function getUniqueDaysCount(attendance) {
    const uniqueDates = new Set(attendance.map(r => r.date));
    return uniqueDates.size;
}

function calculateTotalHours(attendance) {
    let total = 0;
    attendance.forEach(record => {
        if (record.checkIn && record.checkOut) {
            total += AttendanceService.calculateWorkHours(record.checkIn, record.checkOut);
        }
    });
    return Math.round(total);
}

function calculateAvgHours(attendance) {
    const daysWithCheckout = attendance.filter(r => r.checkIn && r.checkOut);
    if (daysWithCheckout.length === 0) return 0;

    const total = calculateTotalHours(attendance);
    return (total / daysWithCheckout.length).toFixed(1);
}