import { db } from '../config.js';
import { CompanyService } from './company.js';

export class AttendanceService {
    // Check in with structure: /companies/{companyId}/attendance/{date}/records/{userId}
    static async checkIn(companyId, user, gpsCoords, selfieBlob = null) {
        try {
            if (!companyId || !user || !gpsCoords) {
                throw new Error('Company ID, User, and GPS coordinates are required');
            }

            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

            // Check if already checked in today
            const existing = await this.getTodayAttendance(companyId, user.uid);
            if (existing) {
                throw new Error('Already checked in today');
            }

            // GPS Validation (based on company settings)
            const company = await CompanyService.getCompany(companyId);
            if (company.settings?.gpsRequired && company.settings?.officeLocation) {
                const userLocation = {
                    lat: gpsCoords.latitude ?? gpsCoords.lat,
                    lng: gpsCoords.longitude ?? gpsCoords.lng
                };

                const officeLocation = {
                    lat: company.settings.officeLocation.lat ?? company.settings.officeLocation.latitude,
                    lng: company.settings.officeLocation.lng ?? company.settings.officeLocation.longitude
                };

                const distance = this.calculateDistance(userLocation, officeLocation);
                const allowedRadius = company.settings.gpsRadius || 100;

                if (distance === null) {
                    throw new Error('LOCATION_VALIDATION_FAILED');
                }

                if (distance > allowedRadius) {
                    const error = new Error('TOO_FAR_FROM_OFFICE');
                    error.data = { distance, allowedRadius };
                    throw error;
                }
            }

            const attendanceData = {
                userId: user.uid,
                companyId: companyId,
                userName: user.displayName,
                userEmail: user.email,
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
                reviewedAt: null,
                reviewedBy: null,
                reviewerName: null,
                lastModifiedBy: null,
                lastModifierName: null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            // Convert selfie to base64 if provided
            if (selfieBlob) {
                const selfieBase64 = await this.blobToBase64(selfieBlob);
                attendanceData.selfieData = selfieBase64;
                attendanceData.biometricConfirmed = true;
            }

            // First, ensure the date document has the date field
            await db.collection('companies')
                .doc(companyId)
                .collection('attendance')
                .doc(today)
                .set({
                    date: today,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

            // Then set the user's attendance record
            await db.collection('companies')
                .doc(companyId)
                .collection('attendance')
                .doc(today)
                .collection('records')
                .doc(user.uid)
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
                .doc(today)
                .collection('records')
                .doc(userId)
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
                .doc(today)
                .collection('records')
                .doc(userId)
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
                .doc(date)
                .collection('records')
                .doc(userId)
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

    // Get attendance history for a user (OPTIMIZED with collectionGroup)
    static async getUserAttendanceHistory(companyId, userId, startDate = null, endDate = null, limit = 100) {
        try {
            if (!companyId || !userId) {
                throw new Error('Company ID and User ID are required');
            }

            let query = db.collectionGroup('records')
                .where('userId', '==', userId)
                .where('companyId', '==', companyId) 
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
                const parentPath = doc.ref.parent.parent.parent.parent.id;
                if (parentPath === companyId) {
                    records.push({ id: doc.id, ...doc.data() });
                }
            });

            return records;
        } catch (error) {
            console.error('Error getting user attendance history:', error);
            throw error;
        }
    }

    // Get company attendance for date range (Optimized)
    static async getCompanyAttendanceRange(companyId, startDate, endDate) {
        try {
            if (!companyId) throw new Error('Company ID is required');

            const attendanceRef = db.collection('companies').doc(companyId).collection('attendance');

            const formatDateId = (date) => new Date(date).toISOString().split('T')[0];
            const startId = startDate ? formatDateId(startDate) : null;
            const endId = endDate ? formatDateId(endDate) : null;

            let queryRef = attendanceRef;
            if (startId && endId) {
                queryRef = queryRef
                    .where(firebase.firestore.FieldPath.documentId(), '>=', startId)
                    .where(firebase.firestore.FieldPath.documentId(), '<=', endId);
            } else if (startId) {
                queryRef = queryRef.where(firebase.firestore.FieldPath.documentId(), '>=', startId);
            } else if (endId) {
                queryRef = queryRef.where(firebase.firestore.FieldPath.documentId(), '<=', endId);
            }

            const datesSnapshot = await queryRef.get();
            const allRecords = [];

            await Promise.all(
                datesSnapshot.docs.map(async (dateDoc) => {
                    const recordsSnapshot = await attendanceRef.doc(dateDoc.id).collection('records').get();
                    recordsSnapshot.forEach((userDoc) => {
                        allRecords.push({
                            id: userDoc.id,
                            userId: userDoc.id,
                            date: dateDoc.id,
                            ...userDoc.data(),
                        });
                    });
                })
            );

            allRecords.sort((a, b) => {
                const dateCompare = new Date(b.date) - new Date(a.date);
                if (dateCompare !== 0) return dateCompare;

                const aTime = a.checkIn?.toMillis?.() || 0;
                const bTime = b.checkIn?.toMillis?.() || 0;
                return bTime - aTime;
            });

            return allRecords;
        } catch (error) {
            console.error('Error getting company attendance range:', error);
            throw error;
        }
    }

    // Update attendance status (approve/reject) - for managers
    static async updateAttendanceStatus(companyId, userId, date, status, reviewerUid, reviewerName) {
        try {
            if (!companyId || !userId || !date || !status) {
                throw new Error('Company ID, User ID, date, and status are required');
            }

            await db.collection('companies')
                .doc(companyId)
                .collection('attendance')
                .doc(date)
                .collection('records')
                .doc(userId)
                .update({
                    status: status,
                    reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    reviewedBy: reviewerUid,
                    reviewerName: reviewerName,
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
                .doc(date)
                .collection('records')
                .doc(userId)
                .delete();

            return true;
        } catch (error) {
            console.error('Error deleting attendance:', error);
            throw error;
        }
    }

    // Update attendance record - for managers
    static async updateAttendance(companyId, userId, date, updates, updaterUid, updaterName) {
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
            updateData.lastModifiedBy = updaterUid;
            updateData.lastModifierName = updaterName;

            await db.collection('companies')
                .doc(companyId)
                .collection('attendance')
                .doc(date)
                .collection('records')
                .doc(userId)
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

            const now = new Date();
            const targetMonth = month || (now.getMonth() + 1);
            const targetYear = year || now.getFullYear();

            const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
            const lastDay = new Date(targetYear, targetMonth, 0).getDate();
            const endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${lastDay}`;

            const attendance = await this.getUserAttendanceHistory(companyId, userId, startDate, endDate, 100);

            let totalDays = 0;
            let totalHours = 0;
            let lateDays = 0;
            let presentDays = 0;
            let incompleteDays = 0;
            let totalCheckInMinutes = 0;
            let checkInCount = 0;

            const standardCheckInHour = 9;
            const lateThresholdMinutes = 15;

            attendance.forEach(record => {
                if (record.checkIn) {
                    presentDays++;

                    const checkInTime = record.checkIn.toDate ?
                        record.checkIn.toDate() : new Date(record.checkIn);
                    const checkInHour = checkInTime.getHours();
                    const checkInMinute = checkInTime.getMinutes();
                    const checkInTotalMinutes = checkInHour * 60 + checkInMinute;

                    totalCheckInMinutes += checkInTotalMinutes;
                    checkInCount++;

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

    // Format time for display with timezone support
    static formatTime(timestamp, timezone = 'UTC') {
        if (!timestamp) return 'N/A';

        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: timezone
        });
    }

    // Format date with timezone support
    static formatDate(timestamp, timezone = 'UTC') {
        if (!timestamp) return 'N/A';

        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            timeZone: timezone
        });
    }

    // Format full datetime with timezone support
    static formatDateTime(timestamp, timezone = 'UTC') {
        if (!timestamp) return 'N/A';

        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true,
            timeZone: timezone
        });
    }

    // Convert blob to base64
    static async blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
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

                    video.onloadedmetadata = () => {
                        const maxWidth = 640;
                        const maxHeight = 480;
                        let width = video.videoWidth;
                        let height = video.videoHeight;

                        if (width > maxWidth || height > maxHeight) {
                            const ratio = Math.min(maxWidth / width, maxHeight / height);
                            width = width * ratio;
                            height = height * ratio;
                        }

                        canvas.width = width;
                        canvas.height = height;

                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(video, 0, 0, width, height);

                        stream.getTracks().forEach(track => track.stop());

                        canvas.toBlob(blob => {
                            resolve(blob);
                        }, 'image/jpeg', 0.7);
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

        const lat1 = gps1.lat ?? gps1.latitude;
        const lng1 = gps1.lng ?? gps1.longitude;
        const lat2 = gps2.lat ?? gps2.latitude;
        const lng2 = gps2.lng ?? gps2.longitude;

        if (lat1 == null || lng1 == null || lat2 == null || lng2 == null) {
            console.error('Invalid GPS coordinates:', { gps1, gps2 });
            return null;
        }

        const latitude1 = parseFloat(lat1);
        const longitude1 = parseFloat(lng1);
        const latitude2 = parseFloat(lat2);
        const longitude2 = parseFloat(lng2);

        if (isNaN(latitude1) || isNaN(longitude1) || isNaN(latitude2) || isNaN(longitude2)) {
            console.error('GPS coordinates are not valid numbers:', { gps1, gps2 });
            return null;
        }

        const R = 6371e3;
        const φ1 = latitude1 * Math.PI / 180;
        const φ2 = latitude2 * Math.PI / 180;
        const Δφ = (latitude2 - latitude1) * Math.PI / 180;
        const Δλ = (longitude2 - longitude1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        const distance = R * c;
        return Math.round(distance);
    }
}