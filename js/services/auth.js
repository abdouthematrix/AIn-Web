import { auth, db } from '../config.js';
import { UserService } from './user.js';

export class AuthService {
    static currentUser = null;
    static userRole = null;
    static currentCompanyId = null;

    // Sign up new user
    static async signUp(email, password, displayName) {
        try {
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;

            // Update profile
            await user.updateProfile({ displayName });

            // Create user document in Firestore
            await UserService.createUser(user.uid, {
                email: user.email,
                displayName: displayName,
                companyIds: [],
                lastCompanyId: null,
                status: 'active',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });

            return user;
        } catch (error) {
            console.error('Sign up error:', error);
            throw error;
        }
    }

    // Sign in existing user
    static async signIn(email, password) {
        try {
            const userCredential = await auth.signInWithEmailAndPassword(email, password);
            return userCredential.user;
        } catch (error) {
            console.error('Sign in error:', error);
            throw error;
        }
    }

    // Sign out
    static async signOut() {
        try {
            await auth.signOut();
            this.currentUser = null;
            this.userRole = null;
            this.currentCompanyId = null;
        } catch (error) {
            console.error('Sign out error:', error);
            throw error;
        }
    }

    // Get current user role in a company (simplified - no status checks)
    static async getUserRole(companyId) {
        if (!auth.currentUser) return null;

        try {
            const uid = auth.currentUser.uid;

            // Check if owner
            const companyDoc = await db.collection('companies').doc(companyId).get();
            if (companyDoc.exists && companyDoc.data().ownerUid === uid) {
                return 'owner';
            }

            // Check if manager (no status check - if exists, they're approved)
            const managerDoc = await db.collection('companies')
                .doc(companyId)
                .collection('managers')
                .doc(uid)
                .get();

            if (managerDoc.exists) {
                return 'manager';
            }

            // Check if employee (no status check - if exists, they're approved)
            const employeeDoc = await db.collection('companies')
                .doc(companyId)
                .collection('employees')
                .doc(uid)
                .get();

            if (employeeDoc.exists) {
                return 'employee';
            }

            return null;
        } catch (error) {
            console.error('Error getting user role:', error);
            return null;
        }
    }

    // Check if user has company access
    static async hasCompanyAccess(companyId) {
        const role = await this.getUserRole(companyId);
        return role !== null;
    }

    // Check if user can manage company (owner or manager)
    static async canManageCompany(companyId) {
        const role = await this.getUserRole(companyId);
        return role === 'owner' || role === 'manager';
    }

    // Listen to auth state changes
    static onAuthStateChanged(callback) {
        return auth.onAuthStateChanged(async (user) => {
            this.currentUser = user;

            if (user) {
                // Get user's companies
                const userDoc = await UserService.getUser(user.uid);
                if (userDoc && userDoc.companyIds && userDoc.companyIds.length > 0) {
                    // Use lastCompanyId if available, otherwise use first company
                    this.currentCompanyId = userDoc.lastCompanyId || userDoc.companyIds[0];
                    this.userRole = await this.getUserRole(this.currentCompanyId);
                }
            } else {
                this.currentCompanyId = null;
                this.userRole = null;
            }

            callback(user);
        });
    }

    // Get current user
    static getCurrentUser() {
        return auth.currentUser;
    }

    // Check if authenticated
    static isAuthenticated() {
        return auth.currentUser !== null;
    }

    // Set current company context (with lastCompanyId tracking)
    static async setCurrentCompany(companyId) {
        if (!auth.currentUser) {
            throw new Error('User not authenticated');
        }

        const hasAccess = await this.hasCompanyAccess(companyId);
        if (!hasAccess) {
            throw new Error('User does not have access to this company');
        }

        this.currentCompanyId = companyId;
        this.userRole = await this.getUserRole(companyId);

        // Save user preference
        try {
            await db.collection('users').doc(auth.currentUser.uid).update({
                lastCompanyId: companyId
            });
        } catch (error) {
            console.warn('Could not save company preference:', error);
        }
    }

    // Switch company (alias for setCurrentCompany with better name)
    static async switchCompany(companyId) {
        return await this.setCurrentCompany(companyId);
    }

    // Password reset
    static async resetPassword(email) {
        try {
            await auth.sendPasswordResetEmail(email);
            return true;
        } catch (error) {
            console.error('Password reset error:', error);
            throw error;
        }
    }
}