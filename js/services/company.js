import { db } from '../config.js';

// Rate limiting for invite codes (in-memory)
const inviteAttempts = new Map();

export class CompanyService {
    // Create new company
    static async createCompany(ownerUid, companyData) {
        try {
            const companyRef = await db.collection('companies').add({
                name: companyData.name,
                ownerUid: ownerUid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                settings: {
                    ...companyData.settings,
                    // GPS settings
                    officeLocation: companyData.settings?.officeLocation || null,
                    gpsRadius: companyData.settings?.gpsRadius || 100,
                    gpsRequired: companyData.settings?.gpsRequired || false,
                    // Other settings
                    requireSelfie: companyData.settings?.requireSelfie || false,
                    workHours: companyData.settings?.workHours || { start: '09:00', end: '17:00' },
                    // Timezone setting (default to UTC)
                    timezone: companyData.settings?.timezone || 'UTC'
                }
            });

            // Add company to owner's companyIds
            await db.collection('users').doc(ownerUid).update({
                companyIds: firebase.firestore.FieldValue.arrayUnion(companyRef.id),
                lastCompanyId: companyRef.id,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return companyRef.id;
        } catch (error) {
            console.error('Error creating company:', error);
            throw new Error('Failed to create company');
        }
    }

    // Get company by ID
    static async getCompany(companyId) {
        try {
            const doc = await db.collection('companies').doc(companyId).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error getting company:', error);
            throw new Error('Failed to get company');
        }
    }

    // Update company
    static async updateCompany(companyId, updates) {
        try {
            await db.collection('companies').doc(companyId).update({
                ...updates,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error updating company:', error);
            throw new Error('Failed to update company');
        }
    }

    // Get user's companies
    static async getUserCompanies(userDoc) {
        try {
            if (!userDoc || !userDoc?.companyIds) return [];

            const companies = [];
            const validCompanyIds = [];
            const invalidCompanyIds = [];

            for (const companyId of userDoc?.companyIds) {
                try {
                    const company = await this.getCompany(companyId);
                    if (company) {
                        companies.push(company);
                        validCompanyIds.push(companyId);
                    }
                } catch (error) {
                    console.log(`User has no access to company ${companyId}`);
                    invalidCompanyIds.push(companyId);
                }
            }

            // Remove invalid companies ONE AT A TIME to respect security rules
            if (invalidCompanyIds.length > 0) {
                const userRef = db.collection('users').doc(userDoc.id);

                for (const invalidId of invalidCompanyIds) {
                    await userRef.update({
                        companyIds: firebase.firestore.FieldValue.arrayRemove(invalidId),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }

                // Update lastCompanyId if needed
                if (userDoc.lastCompanyId && !validCompanyIds.includes(userDoc.lastCompanyId)) {
                    await userRef.update({
                        lastCompanyId: validCompanyIds.length > 0 ? validCompanyIds[0] : null,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
            }

            return companies;
        } catch (error) {
            console.error('Error getting user companies:', error);
            throw new Error('Failed to get companies');
        }
    }

    // ========================================
    // MANAGERS
    // ========================================
    // Remove manager from company
    static async removeManager(companyId, userId) {
        try {
            if (!companyId || !userId) {
                throw new Error('Company ID and User ID are required');
            }

            const managerRef = db.collection('companies')
                .doc(companyId)
                .collection('managers')
                .doc(userId);

            const managerDoc = await managerRef.get();
            if (!managerDoc.exists) {
                throw new Error('Manager not found');
            }

            // Delete manager document
            await managerRef.delete();

            return true;
        } catch (error) {
            console.error('Error removing manager:', error);
            throw new Error('toast-manager-remove-failed');
        }
    }

    // Get all managers
    static async getManagers(companyId) {
        try {
            const snapshot = await db.collection('companies')
                .doc(companyId)
                .collection('managers')
                .get();

            const managers = [];
            for (const doc of snapshot.docs) {
                const managerData = doc.data();
                managers.push({
                    id: doc.id,
                    ...managerData
                });
            }
            return managers;
        } catch (error) {
            console.error('Error getting managers:', error);
            throw new Error('Failed to get managers');
        }
    }

    // ========================================
    // EMPLOYEES
    // ========================================

    // Remove employee from company
    static async removeEmployee(companyId, userId) {
        try {
            if (!companyId || !userId) {
                throw new Error('Company ID and User ID are required');
            }

            const employeeRef = db.collection('companies')
                .doc(companyId)
                .collection('employees')
                .doc(userId);

            const employeeDoc = await employeeRef.get();
            if (!employeeDoc.exists) {
                throw new Error('Employee not found');
            }

            // Delete employee document
            await employeeRef.delete();

            return true;
        } catch (error) {
            console.error('Error removing employee:', error);
            throw new Error('toast-employee-remove-failed');
        }
    }

    // Get all employees
    static async getEmployees(companyId) {
        try {
            const snapshot = await db.collection('companies')
                .doc(companyId)
                .collection('employees')
                .get();

            const employees = [];
            for (const doc of snapshot.docs) {
                const employeeData = doc.data();
                employees.push({
                    id: doc.id,
                    ...employeeData
                });
            }
            return employees;
        } catch (error) {
            console.error('Error getting employees:', error);
            throw new Error('Failed to get employees');
        }
    }

    // ========================================
    // INVITATION CODES
    // ========================================

    // Create shareable invitation code
    static async createInvitationCode(companyId, role) {
        try {
            if (!companyId || !role) {
                throw new Error('Company ID and role are required');
            }

            if (!['manager', 'employee'].includes(role)) {
                throw new Error('Role must be either "manager" or "employee"');
            }

            const inviteCode = this.generateInviteCode();
            const inviteData = {
                code: inviteCode,
                role: role,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
            };

            await db.collection('companies')
                .doc(companyId)
                .collection('invitations')
                .doc(inviteCode)
                .set(inviteData);

            return inviteCode;
        } catch (error) {
            console.error('Error creating invitation code:', error);
            throw new Error('Failed to create invitation code');
        }
    }

    // Join company using invitation code (with rate limiting)
    static async joinWithInvitationCode(userId, inviteCode) {
        try {
            if (!userId || !inviteCode) {
                throw new Error('User ID and invitation code are required');
            }

            // Rate limiting check
            const attemptKey = userId;
            const attempts = inviteAttempts.get(attemptKey) || { count: 0, timestamp: Date.now() };

            // Reset counter if 15 minutes passed
            if (Date.now() - attempts.timestamp > 15 * 60 * 1000) {
                attempts.count = 0;
                attempts.timestamp = Date.now();
            }

            if (attempts.count >= 5) {
                throw new Error('Too many failed attempts. Please try again in 15 minutes.');
            }

            // Search for invitation code across all companies
            const snapshot = await db.collectionGroup('invitations')
                .where('code', '==', inviteCode)
                .limit(1)
                .get();

            if (snapshot.empty) {
                // Increment failed attempts
                attempts.count++;
                inviteAttempts.set(attemptKey, attempts);
                throw new Error('Invalid invitation code');
            }

            const inviteDoc = snapshot.docs[0];
            const inviteData = inviteDoc.data();

            // Check if expired
            if (inviteData.expiresAt.toDate() < new Date()) {
                attempts.count++;
                inviteAttempts.set(attemptKey, attempts);
                throw new Error('Invitation code has expired');
            }

            // Get company ID from the invite doc path
            const companyId = inviteDoc.ref.parent.parent.id;

            // Check if user already belongs to this company
            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                throw new Error('User document not found');
            }

            if (userDoc.data().companyIds?.includes(companyId)) {
                throw new Error('You are already a member of this company');
            }

            // Create member document (always approved)
            const collection = inviteData.role === 'manager' ? 'managers' : 'employees';
            const memberRef = db.collection('companies')
                .doc(companyId)
                .collection(collection)
                .doc(userId);

            await memberRef.set({
                userId: userId,
                userName: userDoc.data().displayName || 'Unknown',
                userEmail: userDoc.data().email || '',
                addedAt: firebase.firestore.FieldValue.serverTimestamp(),
                joinedViaCode: inviteCode,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Add company to user's companyIds
            await userRef.update({
                companyIds: firebase.firestore.FieldValue.arrayUnion(companyId),
                lastCompanyId: companyId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Clear failed attempts on success
            inviteAttempts.delete(attemptKey);

            return companyId;
        } catch (error) {
            console.error('Error joining with invitation code:', error);
            throw error;
        }
    }

    // Generate random invite code
    static generateInviteCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    // Delete invitation code
    static async deleteInvitationCode(companyId, inviteCode) {
        try {
            if (!companyId || !inviteCode) {
                throw new Error('Company ID and invitation code are required');
            }

            await db.collection('companies')
                .doc(companyId)
                .collection('invitations')
                .doc(inviteCode)
                .delete();

            return true;
        } catch (error) {
            console.error('Error deleting invitation code:', error);
            throw new Error('toast-invite-delete-failed');
        }
    }

    // Get all invitation codes for a company
    static async getInvitationCodes(companyId) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const snapshot = await db.collection('companies')
                .doc(companyId)
                .collection('invitations')
                .get();

            const invitations = [];
            snapshot.forEach(doc => {
                invitations.push({
                    id: doc.id,
                    ...doc.data()
                });
            });

            return invitations;
        } catch (error) {
            console.error('Error getting invitation codes:', error);
            throw new Error('Failed to get invitation codes');
        }
    }
}