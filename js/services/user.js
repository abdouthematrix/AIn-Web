import { db } from '../config.js';

export class UserService {
    // Create new user document
    static async createUser(uid, userData) {
        try {
            await db.collection('users').doc(uid).set({
                ...userData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error creating user:', error);
            throw error;
        }
    }

    // Get user document
    static async getUser(uid) {
        try {
            const doc = await db.collection('users').doc(uid).get();
            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error getting user:', error);
            throw error;
        }
    }

    // Update user document (excluding companyIds - managed by company service)
    static async updateUser(uid, updates) {
        try {
            // Remove companyIds from updates to prevent direct manipulation
            const { companyIds, ...safeUpdates } = updates;

            await db.collection('users').doc(uid).update({
                ...safeUpdates,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            return true;
        } catch (error) {
            console.error('Error updating user:', error);
            throw error;
        }
    }
}