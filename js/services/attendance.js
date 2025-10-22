import { db } from '../config.js';

export class AttendanceService {
    // Get today's attendance for a user
    static async getTodayAttendance(companyId, userId) {
        try {
            const today = new Date().toISOString().split('T')[0];
            
            const doc = await db.collection('companies')
                .doc(companyId)
                .collection('attendance')
                .doc(userId)
                .collection('records')
                .doc(today)
                .get();

            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error getting today attendance:', error);
            throw error;
        }
    }

    // Check in
    static async checkIn(companyId, userId, gps, selfieData = null) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const now = firebase.firestore.FieldValue.serverTimestamp();

            const attendanceData = {
                userId: userId,
                date: today,
                checkIn: now,
                gps: gps,
                checkOut: null,
                checkOutGps: null
            };

            if (selfieData) {
                attendanceData.selfieData = selfieData;
            }

            await db.collection('companies')
                .doc(companyId)
                .collection('attendance')
                .doc(userId)
                .collection('records')
                .doc(today)
                .set(attendanceData);

            return true;
        } catch (error) {
            console.error('Error checking in:', error);
            throw error;
        }
    }

    // Check out
    static async checkOut(companyId, userId, checkOutGps) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const now = firebase.firestore.FieldValue.serverTimestamp();

            await db.collection('companies')
                .doc(companyId)
                .collection('attendance')
                .doc(userId)
                .collection('records')
                .doc(today)
                .update({
                    checkOut: now,
                    checkOutGps: checkOutGps
                });

            return true;
        } catch (error) {
            console.error('Error checking out:', error);
            throw error;
        }
    }

    // Get attendance records for a user (date range)
    static async getUserAttendance(companyId, userId, startDate, endDate) {
        try {
            let query = db.collection('companies')
                .doc(companyId)
                .collection('attendance')
                .doc(userId)
                .collection('records')
                .orderBy('date', 'desc');

            if (startDate) {
                query = query.where('date', '>=', startDate);
            }
            if (endDate) {
                query = query.where('date', '<=', endDate);
            }

            const snapshot = await query.get();
            const records = [];
            
            snapshot.forEach(doc => {
                records.push({ id: doc.id, ...doc.data() });
            });

            return records;
        } catch (error) {
            console.error('Error getting user attendance:', error);
            throw error;
        }
    }

    // Get all attendance for a company (for managers/owners)
    static async getCompanyAttendance(companyId, date = null) {
        try {
            const targetDate = date || new Date().toISOString().split('T')[0];
            
            // Get all user IDs in attendance collection
            const attendanceSnapshot = await db.collection('companies')
                .doc(companyId)
                .collection('attendance')
                .get();

            const allRecords = [];
            
            // For each user, get their record for the target date
            for (const userDoc of attendanceSnapshot.docs) {
                const userId = userDoc.id;
                const recordDoc = await db.collection('companies')
                    .doc(companyId)
                    .collection('attendance')
                    .doc(userId)
                    .collection('records')
                    .doc(targetDate)
                    .get();

                if (recordDoc.exists) {
                    allRecords.push({
                        id: recordDoc.id,
                        userId: userId,
                        ...recordDoc.data()
                    });
                }
            }

            return allRecords;
        } catch (error) {
            console.error('Error getting company attendance:', error);
            throw error;
        }
    }

    // Get attendance records for date range (for managers)
    static async getCompanyAttendanceRange(companyId, startDate, endDate) {
        try {
            // Get all user IDs in attendance collection
            const attendanceSnapshot = await db.collection('companies')
                .doc(companyId)
                .collection('attendance')
                .get();

            const allRecords = [];
            
            // For each user, get their records in the date range
            for (const userDoc of attendanceSnapshot.docs) {
                const userId = userDoc.id;
                
                let query = db.collection('companies')
                    .doc(companyId)
                    .collection('attendance')
                    .doc(userId)
                    .collection('records')
                    .orderBy('date', 'desc');

                if (startDate) {
                    query = query.where('date', '>=', startDate);
                }
                if (endDate) {
                    query = query.where('date', '<=', endDate);
                }

                const recordsSnapshot = await query.get();
                
                recordsSnapshot.forEach(doc => {
                    allRecords.push({
                        id: doc.id,
                        userId: userId,
                        ...doc.data()
                    });
                });
            }

            return allRecords;
        } catch (error) {
            console.error('Error getting company attendance range:', error);
            throw error;
        }
    }

    // Delete attendance record (managers only)
    static async deleteAttendance(companyId, userId, date) {
        try {
            await db.collection('companies')
                .doc(companyId)
                .collection('attendance')
                .doc(userId)
                .collection('records')
                .doc(date)
                .delete();

            return true;
        } catch (error) {
            console.error('Error deleting attendance:', error);
            throw error;
        }
    }

    // Update attendance record (managers only)
    static async updateAttendance(companyId, userId, date, updates) {
        try {
            await db.collection('companies')
                .doc(companyId)
                .collection('attendance')
                .doc(userId)
                .collection('records')
                .doc(date)
                .update({
                    ...updates,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            return true;
        } catch (error) {
            console.error('Error updating attendance:', error);
            throw error;
        }
    }
}
