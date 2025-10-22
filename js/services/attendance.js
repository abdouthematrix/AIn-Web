import { db } from '../config.js';

export class AttendanceService {
    // Check in with new structure: /companies/{companyId}/attendance/{userId}/records/{date}
    static async checkIn(companyId, userId, gpsCoords, selfieBlob = null) {
        try {
            if (!companyId || !userId || !gpsCoords) {
                throw new Error('Company ID, User ID, and GPS coordinates are required');
            }

            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

            // Check if already checked in today
            const existing = await this.getTodayAttendance(companyId, userId);
            if (existing) {
                throw new Error('Already checked in today');
            }

            const attendanceData = {
                userId: userId,
                date: today,
                checkIn: firebase.firestore.FieldValue.serverTimestamp(),
                checkOut: null,
                gps: {
                    lat: gpsCoords.latitude,
                    lng: gpsCoords.longitude
                },
                checkOutGps: null,
                status: 'pending',
                biometricConfirmed: false,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Convert selfie to base64 if provided
            if (selfieBlob) {
                const selfieBase64 = await this.blobToBase64(selfieBlob);
                attendanceData.selfieData = selfieBase64;
                attendanceData.biometricConfirmed = true;
            }

            // New structure: /attendance/{userId}/records/{date}
            await db.collection('companies')
                .doc(companyId)
                .collection('attendance')
                .doc(userId)
                .collection('records')
                .doc(today)
                .set(attendanceData);

            return { date: today, ...attendanceData };
        } catch (error) {
            console.error('Error checking in:', error);
            throw error;
        }
    }

    // Check out
    static async checkOut(companyId, userId, gpsCoords) {
        try {
            if (!companyId || !userId || !gpsCoords) {
                throw new Error('Company ID, User ID, and GPS coordinates are required');
            }

            const today = new Date().toISOString().split('T')[0];

            // Check if checked in
            const existing = await this.getTodayAttendance(companyId, userId);
            if (!existing) {
                throw new Error('No check-in record found for today');
            }

            if (existing.checkOut) {
                throw new Error('Already checked out today');
            }

            // Update with checkout time
            await db.collection('companies')
                .doc(companyId)
                .collection('attendance')
                .doc(userId)
                .collection('records')
                .doc(today)
                .update({
                    checkOut: firebase.firestore.FieldValue.serverTimestamp(),
                    checkOutGps: {
                        lat: gpsCoords.latitude,
                        lng: gpsCoords.longitude
                    },
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });

            return true;
        } catch (error) {
            console.error('Error checking out:', error);
            throw error;
        }
    }

    // Get today's attendance for a user
    static async getTodayAttendance(companyId, userId) {
        try {
            if (!companyId || !userId) {
                throw new Error('Company ID and User ID are required');
            }

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
            return null;
        }
    }

    // Get attendance record for specific date
    static async getAttendanceByDate(companyId, userId, date) {
        try {
            if (!companyId || !userId || !date) {
                throw new Error('Company ID, User ID, and date are required');
            }

            const doc = await db.collection('companies')
                .doc(companyId)
                .collection('attendance')
                .doc(userId)
                .collection('records')
                .doc(date)
                .get();

            if (doc.exists) {
                return { id: doc.id, ...doc.data() };
            }
            return null;
        } catch (error) {
            console.error('Error getting attendance by date:', error);
            throw error;
        }
    }

    // Get attendance history for a user
    static async getUserAttendanceHistory(companyId, userId, startDate = null, endDate = null, limit = 100) {
        try {
            if (!companyId || !userId) {
                throw new Error('Company ID and User ID are required');
            }

            let query = db.collection('companies')
                .doc(companyId)
                .collection('attendance')
                .doc(userId)
                .collection('records')
                .orderBy('date', 'desc')
                .limit(limit);

            if (startDate && endDate) {
                query = query.where('date', '>=', startDate)
                            .where('date', '<=', endDate);
            } else if (startDate) {
                query = query.where('date', '>=', startDate);
            } else if (endDate) {
                query = query.where('date', '<=', endDate);
            }

            const snapshot = await query.get();
            const records = [];

            snapshot.forEach(doc => {
                records.push({ id: doc.id, ...doc.data() });
            });

            return records;
        } catch (error) {
            console.error('Error getting user attendance history:', error);
            throw error;
        }
    }

    // Get all attendance records for a company on a specific date
    static async getCompanyAttendance(companyId, date = null) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

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

            // Sort by check-in time
            allRecords.sort((a, b) => {
                const aTime = a.checkIn?.toMillis?.() || 0;
                const bTime = b.checkIn?.toMillis?.() || 0;
                return bTime - aTime;
            });

            return allRecords;
        } catch (error) {
            console.error('Error getting company attendance:', error);
            throw error;
        }
    }

    // Get company attendance for date range
    static async getCompanyAttendanceRange(companyId, startDate, endDate) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

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

                if (startDate && endDate) {
                    query = query.where('date', '>=', startDate)
                                .where('date', '<=', endDate);
                } else if (startDate) {
                    query = query.where('date', '>=', startDate);
                } else if (endDate) {
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

            // Sort all records by date descending
            allRecords.sort((a, b) => b.date.localeCompare(a.date));

            return allRecords;
        } catch (error) {
            console.error('Error getting company attendance range:', error);
            throw error;
        }
    }

    // Update attendance status (approve/reject) - for managers
    static async updateAttendanceStatus(companyId, userId, date, status) {
        try {
            if (!companyId || !userId || !date || !status) {
                throw new Error('Company ID, User ID, date, and status are required');
            }

            await db.collection('companies')
                .doc(companyId)
                .collection('attendance')
                .doc(userId)
                .collection('records')
                .doc(date)
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

    // Delete attendance record - for managers
    static async deleteAttendance(companyId, userId, date) {
        try {
            if (!companyId || !userId || !date) {
                throw new Error('Company ID, User ID, and date are required');
            }

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

    // Update attendance record - for managers
    static async updateAttendance(companyId, userId, date, updates) {
        try {
            if (!companyId || !userId || !date) {
                throw new Error('Company ID, User ID, and date are required');
            }

            const allowedFields = ['checkIn', 'checkOut', 'gps', 'checkOutGps', 'status', 'notes'];
            const updateData = {};

            Object.keys(updates).forEach(key => {
                if (allowedFields.includes(key)) {
                    updateData[key] = updates[key];
                }
            });

            if (Object.keys(updateData).length === 0) {
                throw new Error('No valid fields to update');
            }

            updateData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();

            await db.collection('companies')
                .doc(companyId)
                .collection('attendance')
                .doc(userId)
                .collection('records')
                .doc(date)
                .update(updateData);

            return true;
        } catch (error) {
            console.error('Error updating attendance:', error);
            throw error;
        }
    }

    // Get attendance statistics for a user
    static async getAttendanceStats(companyId, userId, month = null, year = null) {
        try {
            if (!companyId || !userId) {
                throw new Error('Company ID and User ID are required');
            }

            // Use current month/year if not provided
            const now = new Date();
            const targetMonth = month || (now.getMonth() + 1);
            const targetYear = year || now.getFullYear();

            const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
            const lastDay = new Date(targetYear, targetMonth, 0).getDate();
            const endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${lastDay}`;

            const attendance = await this.getUserAttendanceHistory(companyId, userId, startDate, endDate, 1000);

            let totalDays = 0;
            let totalHours = 0;
            let lateDays = 0;
            let presentDays = 0;
            let incompleteDays = 0;
            let totalCheckInMinutes = 0;
            let checkInCount = 0;

            // Standard check-in time: 9:00 AM
            const standardCheckInHour = 9;
            const lateThresholdMinutes = 15;

            attendance.forEach(record => {
                if (record.checkIn) {
                    presentDays++;

                    // Calculate check-in time
                    const checkInTime = record.checkIn.toDate ? 
                        record.checkIn.toDate() : new Date(record.checkIn);
                    const checkInHour = checkInTime.getHours();
                    const checkInMinute = checkInTime.getMinutes();
                    const checkInTotalMinutes = checkInHour * 60 + checkInMinute;
                    
                    totalCheckInMinutes += checkInTotalMinutes;
                    checkInCount++;

                    // Check if late (after 9:15 AM)
                    if (checkInHour > standardCheckInHour || 
                        (checkInHour === standardCheckInHour && checkInMinute > lateThresholdMinutes)) {
                        lateDays++;
                    }

                    if (record.checkOut) {
                        totalDays++;
                        const hours = this.calculateWorkHours(record.checkIn, record.checkOut);
                        totalHours += hours;
                    } else {
                        incompleteDays++;
                    }
                }
            });

            // Calculate average check-in time
            let avgCheckInTime = null;
            if (checkInCount > 0) {
                const avgMinutes = totalCheckInMinutes / checkInCount;
                const hours = Math.floor(avgMinutes / 60);
                const minutes = Math.round(avgMinutes % 60);
                avgCheckInTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }

            return {
                month: targetMonth,
                year: targetYear,
                presentDays,
                totalDays,
                incompleteDays,
                totalHours: Math.round(totalHours * 100) / 100,
                lateDays,
                avgHoursPerDay: totalDays > 0 ? Math.round((totalHours / totalDays) * 100) / 100 : 0,
                avgCheckInTime,
                onTimeRate: presentDays > 0 ? Math.round(((presentDays - lateDays) / presentDays) * 100) : 0,
                completionRate: presentDays > 0 ? Math.round(((presentDays - incompleteDays) / presentDays) * 100) : 0
            };
        } catch (error) {
            console.error('Error getting attendance stats:', error);
            throw error;
        }
    }

    // Calculate work hours between check-in and check-out
    static calculateWorkHours(checkIn, checkOut) {
        if (!checkIn || !checkOut) return 0;

        const checkInTime = checkIn.toDate ? checkIn.toDate() : new Date(checkIn);
        const checkOutTime = checkOut.toDate ? checkOut.toDate() : new Date(checkOut);

        const diffMs = checkOutTime - checkInTime;
        const diffHours = diffMs / (1000 * 60 * 60);

        return Math.round(diffHours * 100) / 100;
    }

    // Format time for display
    static formatTime(timestamp) {
        if (!timestamp) return 'N/A';

        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
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
                    let errorMessage = 'Unable to get location';
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Location permission denied. Please enable location access.';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Location information unavailable.';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Location request timed out.';
                            break;
                    }
                    reject(new Error(errorMessage));
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
                    let errorMessage = 'Unable to access camera';
                    if (error.name === 'NotAllowedError') {
                        errorMessage = 'Camera permission denied. Please enable camera access.';
                    } else if (error.name === 'NotFoundError') {
                        errorMessage = 'No camera found on this device.';
                    }
                    reject(new Error(errorMessage));
                });
        });
    }

    // Calculate distance between two GPS coordinates (in meters)
    static calculateDistance(gps1, gps2) {
        if (!gps1 || !gps2) return null;

        const R = 6371e3; // Earth's radius in meters
        const φ1 = gps1.lat * Math.PI / 180;
        const φ2 = gps2.lat * Math.PI / 180;
        const Δφ = (gps2.lat - gps1.lat) * Math.PI / 180;
        const Δλ = (gps2.lng - gps1.lng) * Math.PI / 180;

        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

        const distance = R * c;
        return Math.round(distance);
    }
}