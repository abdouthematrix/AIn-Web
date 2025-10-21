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


            // Add company to owner's companyIds using batch
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
    static async getUserCompanies(uid) {
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (!userDoc.exists || !userDoc.data().companyIds) return [];

            const companies = [];
            for (const companyId of userDoc.data().companyIds) {
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

            const managerRef = db.collection('companies')
                .doc(companyId)
                .collection('managers')
                .doc(userId);

            await managerRef.set({
                userId: userId,
                status: status,
                addedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Add company to user's companyIds
            const userRef = db.collection('users').doc(userId);
            await userRef.update({
                companyIds: firebase.firestore.FieldValue.arrayUnion(companyId)
            });
                        return true;
        } catch (error) {
            console.error('Error adding manager:', error);
            throw error;
        }
    }

    // Remove manager from company
    static async removeManager(companyId, userId) {
        try {
            const managerRef = db.collection('companies')
                .doc(companyId)
                .collection('managers')
                .doc(userId);

            managerRef.delete();

            // Remove company from user's companyIds
            const userRef = db.collection('users').doc(userId);
            userRef.update({
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
            const employeeRef = db.collection('companies')
                .doc(companyId)
                .collection('employees')
                .doc(userId);

            employeeRef.set({
                userId: userId,
                status: status,
                addedAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Add company to user's companyIds
            const userRef = db.collection('users').doc(userId);
            userRef.update({
                companyIds: firebase.firestore.FieldValue.arrayUnion(companyId)
            });

            
            return true;
        } catch (error) {
            console.error('Error adding employee:', error);
            throw error;
        }
    }

    // Remove employee from company
    static async removeEmployee(companyId, userId) {
        try {
            

            const employeeRef = db.collection('companies')
                .doc(companyId)
                .collection('employees')
                .doc(userId);

            employeeRef.delete();

            // Remove company from user's companyIds
            const userRef = db.collection('users').doc(userId);
            userRef.update({
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
            const collection = role === 'manager' ? 'managers' : 'employees';
            await db.collection('companies')
                .doc(companyId)
                .collection(collection)
                .doc(userId)
                .update({
                    status: 'approved',
                    approvedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            return true;
        } catch (error) {
            console.error('Error accepting invitation:', error);
            throw error;
        }
    }

    // Create shareable invitation code (stored in company document)
    static async createInvitationCode(companyId, role) {
        try {
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
            // Search for invitation code across all companies
            // This requires a collection group query
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

            // Add user to company
            if (inviteData.role === 'manager') {
                await this.addManager(companyId, userId, 'approved');
            } else {
                await this.addEmployee(companyId, userId, 'approved');
            }

            // Optional: Delete the invite code after use
            //await inviteDoc.ref.delete();

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

    // REMOVED: inviteUserByEmail() - not possible without server-side code
    // Use invitation codes instead
}