import { db } from '../config.js';

export class AttendanceService {
    // Check in with deterministic ID to prevent duplicates
    static async checkIn(companyId, userId, gpsCoords, selfieBlob = null) {
        try {
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
            const docId = `${userId}_${today}`; // Deterministic ID

            const attendanceData = {
                userId: userId,
                date: today,
                checkIn: firebase.firestore.FieldValue.serverTimestamp(),
                checkOut: null,
                gps: {
                    lat: gpsCoords.latitude,
                    lng: gpsCoords.longitude
                },
                status: 'pending',
                biometricConfirmed: false
            };

            // Convert selfie to base64 if provided
            if (selfieBlob) {
                const selfieBase64 = await this.blobToBase64(selfieBlob);
                // Store compressed base64 (Firestore has 1MB document limit)
                attendanceData.selfieData = selfieBase64;
                attendanceData.biometricConfirmed = true;
            }

            // Use set() instead of add() to prevent duplicates
            await db.collection('companies')
                .doc(companyId)
                .collection('attendance')
                .doc(docId)
                .set(attendanceData);

            return docId;
        } catch (error) {
            // If document already exists, Firestore will throw an error
            if (error.code === 'permission-denied') {
                throw new Error('Already checked in today');
            }
            console.error('Error checking in:', error);
            throw error;
        }
    }

    // Check out
    static async checkOut(companyId, userId, gpsCoords) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const docId = `${userId}_${today}`;

            // Update with checkout time
            await db.collection('companies')
                .doc(companyId)
                .collection('attendance')
                .doc(docId)
                .update({
                    checkOut: firebase.firestore.FieldValue.serverTimestamp(),
                    checkOutGps: {
                        lat: gpsCoords.latitude,
                        lng: gpsCoords.longitude
                    }
                });

            return true;
        } catch (error) {
            if (error.code === 'not-found') {
                throw new Error('No check-in record found for today');
            }
            if (error.code === 'permission-denied') {
                throw new Error('Already checked out today');
            }
            console.error('Error checking out:', error);
            throw error;
        }
    }

    // Get today's attendance for a user
    static async getTodayAttendance(companyId, userId) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const docId = `${userId}_${today}`;

            const doc = await db.collection('companies')
                .doc(companyId)
                .collection('attendance')
                .doc(docId)
                .get();

            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error getting today attendance:', error);
            return null;
        }
    }

    // Get attendance history for a user
    static async getUserAttendanceHistory(companyId, userId, startDate = null, endDate = null) {
        try {
            let query = db.collection('companies')
                .doc(companyId)
                .collection('attendance')
                .where('userId', '==', userId);

            // Simple date filtering without orderBy to avoid index requirements
            if (startDate) {
                query = query.where('date', '>=', startDate);
            }
            if (endDate) {
                query = query.where('date', '<=', endDate);
            }

            const snapshot = await query.get();

            // Sort in memory instead of using orderBy
            const records = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            records.sort((a, b) => b.date.localeCompare(a.date));

            return records;
        } catch (error) {
            console.error('Error getting user attendance history:', error);
            throw error;
        }
    }

    // Get all attendance records for a company (for managers/owners)
    static async getCompanyAttendance(companyId, date = null) {
        try {
            let query = db.collection('companies')
                .doc(companyId)
                .collection('attendance');

            if (date) {
                query = query.where('date', '==', date);
            }

            const snapshot = await query.limit(100).get();

            // Sort in memory
            const records = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            records.sort((a, b) => {
                const dateCompare = b.date.localeCompare(a.date);
                if (dateCompare !== 0) return dateCompare;

                // Secondary sort by checkIn time
                const aTime = a.checkIn?.toMillis?.() || 0;
                const bTime = b.checkIn?.toMillis?.() || 0;
                return bTime - aTime;
            });

            return records;
        } catch (error) {
            console.error('Error getting company attendance:', error);
            throw error;
        }
    }

    // Update attendance status (approve/reject)
    static async updateAttendanceStatus(companyId, attendanceId, status) {
        try {
            await db.collection('companies')
                .doc(companyId)
                .collection('attendance')
                .doc(attendanceId)
                .update({
                    status: status,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            return true;
        } catch (error) {
            console.error('Error updating attendance status:', error);
            throw error;
        }
    }

    // Convert blob to base64
    static async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                // Get base64 string without data:image/jpeg;base64, prefix
                const base64String = reader.result.split(',')[1];
                resolve(base64String);
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    }

    // Convert base64 to data URL for display
    static base64ToDataUrl(base64String, mimeType = 'image/jpeg') {
        return `data:${mimeType};base64,${base64String}`;
    }

    // Get current location using Geolocation API
    static async getCurrentLocation() {
        return new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
                reject(new Error('Geolocation is not supported by your browser'));
                return;
            }

            navigator.geolocation.getCurrentPosition(
                (position) => {
                    resolve({
                        latitude: position.coords.latitude,
                        longitude: position.coords.longitude,
                        accuracy: position.coords.accuracy
                    });
                },
                (error) => {
                    reject(error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 0
                }
            );
        });
    }

    // Capture selfie from camera (compressed)
    static async captureSelfie() {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');

            navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
                .then(stream => {
                    video.srcObject = stream;
                    video.play();

                    // Wait for video to be ready
                    video.onloadedmetadata = () => {
                        // Limit size to reduce storage (max 640x480)
                        const maxWidth = 640;
                        const maxHeight = 480;
                        let width = video.videoWidth;
                        let height = video.videoHeight;

                        // Calculate scaling to fit within max dimensions
                        if (width > maxWidth || height > maxHeight) {
                            const ratio = Math.min(maxWidth / width, maxHeight / height);
                            width = width * ratio;
                            height = height * ratio;
                        }

                        canvas.width = width;
                        canvas.height = height;

                        // Draw video frame to canvas
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(video, 0, 0, width, height);

                        // Stop video stream
                        stream.getTracks().forEach(track => track.stop());

                        // Convert canvas to blob with compression
                        canvas.toBlob(blob => {
                            resolve(blob);
                        }, 'image/jpeg', 0.7); // 70% quality for smaller size
                    };
                })
                .catch(error => {
                    reject(error);
                });
        });
    }

    // Calculate work hours
    static calculateWorkHours(checkIn, checkOut) {
        if (!checkIn || !checkOut) return 0;

        const checkInTime = checkIn.toDate ? checkIn.toDate() : new Date(checkIn);
        const checkOutTime = checkOut.toDate ? checkOut.toDate() : new Date(checkOut);

        const diffMs = checkOutTime - checkInTime;
        const diffHours = diffMs / (1000 * 60 * 60);

        return Math.round(diffHours * 100) / 100; // Round to 2 decimal places
    }

    // Get attendance statistics
    static async getAttendanceStats(companyId, userId, month, year) {
        try {
            const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
            const endDate = `${year}-${String(month).padStart(2, '0')}-31`;

            const attendance = await this.getUserAttendanceHistory(companyId, userId, startDate, endDate);

            let totalDays = 0;
            let totalHours = 0;
            let lateDays = 0;
            let presentDays = 0;

            attendance.forEach(record => {
                if (record.checkIn) {
                    presentDays++;

                    if (record.checkOut) {
                        totalDays++;
                        const hours = this.calculateWorkHours(record.checkIn, record.checkOut);
                        totalHours += hours;
                    }

                    // Check if late (after 9 AM)
                    const checkInTime = record.checkIn.toDate ? record.checkIn.toDate() : new Date(record.checkIn);
                    if (checkInTime.getHours() >= 9) {
                        lateDays++;
                    }
                }
            });

            return {
                presentDays,
                totalDays,
                totalHours,
                lateDays,
                avgHoursPerDay: totalDays > 0 ? Math.round((totalHours / totalDays) * 100) / 100 : 0
            };
        } catch (error) {
            console.error('Error getting attendance stats:', error);
            throw error;
        }
    }
}