import { db } from '../config.js';

export class CompanyService {
    // Create new company
    static async createCompany(ownerUid, companyData) {
        try {
            const companyRef = await db.collection('companies').add({
                name: companyData.name,
                ownerUid: ownerUid,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                settings: companyData.settings || {}
            });

            // Add company to owner's companyIds
            await db.collection('users').doc(ownerUid).update({
                companyIds: firebase.firestore.FieldValue.arrayUnion(companyRef.id)
            });

            return companyRef.id;
        } catch (error) {
            console.error('Error creating company:', error);
            throw error;
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
            throw error;
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
            throw error;
        }
    }

    // Get user's companies
    static async getUserCompanies(userDoc,uid) {
        try {

            if (!userDoc?.exists || !userDoc?.data().companyIds) return [];

            const companies = [];
            for (const companyId of userDoc?.data().companyIds) {
                const company = await this.getCompany(companyId);
                if (company) {
                    companies.push(company);
                }
            }
            return companies;
        } catch (error) {
            console.error('Error getting user companies:', error);
            throw error;
        }
    }

    // Add manager to company
    static async addManager(companyId, userId, status = 'pending') {
        try {
            // Validate inputs
            if (!companyId || !userId) {
                throw new Error('Company ID and User ID are required');
            }

            if (!['pending', 'approved'].includes(status)) {
                throw new Error('Status must be either "pending" or "approved"');
            }

            // Check if user exists
            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                throw new Error('User does not exist');
            }

            // Check if already a manager
            const managerRef = db.collection('companies')
                .doc(companyId)
                .collection('managers')
                .doc(userId);

            const existingManager = await managerRef.get();
            if (existingManager.exists) {
                throw new Error('User is already a manager');
            }

            // Create manager document
            await managerRef.set({
                userId: userId,
                status: status,
                addedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Add company to user's companyIds only if approved
            if (status === 'approved') {
                await userRef.update({
                    companyIds: firebase.firestore.FieldValue.arrayUnion(companyId)
                });
            }

            return true;
        } catch (error) {
            console.error('Error adding manager:', error);
            throw error;
        }
    }

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

            // Remove company from user's companyIds
            const userRef = db.collection('users').doc(userId);
            await userRef.update({
                companyIds: firebase.firestore.FieldValue.arrayRemove(companyId)
            });

            return true;
        } catch (error) {
            console.error('Error removing manager:', error);
            throw error;
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
                const userDoc = await db.collection('users').doc(managerData.userId).get();
                const userData = userDoc.exists ? { id: userDoc.id, ...userDoc.data() } : null;
                managers.push({
                    id: doc.id,
                    ...managerData,
                    user: userData
                });
            }
            return managers;
        } catch (error) {
            console.error('Error getting managers:', error);
            throw error;
        }
    }

    // Add employee to company
    static async addEmployee(companyId, userId, status = 'pending') {
        try {
            // Validate inputs
            if (!companyId || !userId) {
                throw new Error('Company ID and User ID are required');
            }

            if (!['pending', 'approved'].includes(status)) {
                throw new Error('Status must be either "pending" or "approved"');
            }

            // Check if user exists
            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();

            if (!userDoc.exists) {
                throw new Error('User does not exist');
            }

            // Check if already an employee
            const employeeRef = db.collection('companies')
                .doc(companyId)
                .collection('employees')
                .doc(userId);

            const existingEmployee = await employeeRef.get();
            if (existingEmployee.exists) {
                throw new Error('User is already an employee');
            }

            // Check if user is already a manager (can't be both)
            const managerRef = db.collection('companies')
                .doc(companyId)
                .collection('managers')
                .doc(userId);

            const existingManager = await managerRef.get();
            if (existingManager.exists) {
                throw new Error('User is already a manager of this company');
            }

            // Create employee document
            await employeeRef.set({
                userId: userId,
                status: status,
                addedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Add company to user's companyIds only if approved
            if (status === 'approved') {
                await userRef.update({
                    companyIds: firebase.firestore.FieldValue.arrayUnion(companyId)
                });
            }

            return true;
        } catch (error) {
            console.error('Error adding employee:', error);
            throw error;
        }
    }

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

            // Remove company from user's companyIds
            const userRef = db.collection('users').doc(userId);
            await userRef.update({
                companyIds: firebase.firestore.FieldValue.arrayRemove(companyId)
            });

            return true;
        } catch (error) {
            console.error('Error removing employee:', error);
            throw error;
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
                const userDoc = await db.collection('users').doc(employeeData.userId).get();
                const userData = userDoc.exists ? { id: userDoc.id, ...userDoc.data() } : null;
                employees.push({
                    id: doc.id,
                    ...employeeData,
                    user: userData
                });
            }
            return employees;
        } catch (error) {
            console.error('Error getting employees:', error);
            throw error;
        }
    }

    // Accept invitation (for manager or employee)
    static async acceptInvitation(companyId, userId, role) {
        try {
            if (!companyId || !userId || !role) {
                throw new Error('Company ID, User ID, and role are required');
            }

            if (!['manager', 'employee'].includes(role)) {
                throw new Error('Role must be either "manager" or "employee"');
            }

            const collection = role === 'manager' ? 'managers' : 'employees';
            const memberRef = db.collection('companies')
                .doc(companyId)
                .collection(collection)
                .doc(userId);

            // Check if invitation exists
            const memberDoc = await memberRef.get();
            if (!memberDoc.exists) {
                throw new Error('Invitation not found');
            }

            // Check if already approved
            if (memberDoc.data().status === 'approved') {
                throw new Error('Invitation already accepted');
            }

            // Update status to approved
            await memberRef.update({
                status: 'approved',
                approvedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Add company to user's companyIds
            const userRef = db.collection('users').doc(userId);
            await userRef.update({
                companyIds: firebase.firestore.FieldValue.arrayUnion(companyId)
            });

            return true;
        } catch (error) {
            console.error('Error accepting invitation:', error);
            throw error;
        }
    }

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
            throw error;
        }
    }

    // Join company using invitation code
    static async joinWithInvitationCode(userId, inviteCode) {
        try {
            if (!userId || !inviteCode) {
                throw new Error('User ID and invitation code are required');
            }

            // Search for invitation code across all companies
            const snapshot = await db.collectionGroup('invitations')
                .where('code', '==', inviteCode)
                .limit(1)
                .get();

            if (snapshot.empty) {
                throw new Error('Invalid invitation code');
            }

            const inviteDoc = snapshot.docs[0];
            const inviteData = inviteDoc.data();

            // Check if expired
            if (inviteData.expiresAt.toDate() < new Date()) {
                throw new Error('Invitation code has expired');
            }

            // Get company ID from the invite doc path
            const companyId = inviteDoc.ref.parent.parent.id;

            // Check if user already belongs to this company
            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();

            if (userDoc.exists && userDoc.data().companyIds?.includes(companyId)) {
                throw new Error('You are already a member of this company');
            }

            // Create member document with approved status
            const collection = inviteData.role === 'manager' ? 'managers' : 'employees';
            const memberRef = db.collection('companies')
                .doc(companyId)
                .collection(collection)
                .doc(userId);

            // Try to create the document
            // If it already exists, Firestore will throw an error
            // We'll catch that and handle it gracefully
            try {
                await memberRef.set({
                    userId: userId,
                    status: 'approved',
                    addedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    joinedViaCode: inviteCode
                });
            } catch (setError) {
                // If error is permission denied on a different operation, throw it
                // If it's because document already exists, we can check via user's companyIds
                if (setError.code === 'permission-denied' &&
                    userDoc.data().companyIds?.includes(companyId)) {
                    throw new Error('You already have a membership record in this company');
                }
                throw setError;
            }

            // Add company to user's companyIds
            await userRef.update({
                companyIds: firebase.firestore.FieldValue.arrayUnion(companyId)
            });

            // Optional: Delete the invite code after use (uncomment if desired)
            // await inviteDoc.ref.delete();

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
            throw error;
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
            throw error;
        }
    }
}