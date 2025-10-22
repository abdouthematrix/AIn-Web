import { db } from '../config.js';

export class AttendanceService {
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
            throw error;
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

    // Check in
    static async checkIn(companyId, userId, gps, selfieData = null) {
        try {
            if (!companyId || !userId || !gps) {
                throw new Error('Company ID, User ID, and GPS are required');
            }

            if (!gps.lat || !gps.lng) {
                throw new Error('GPS coordinates (lat, lng) are required');
            }

            const today = new Date().toISOString().split('T')[0];
            
            // Check if already checked in today
            const existing = await this.getTodayAttendance(companyId, userId);
            if (existing) {
                throw new Error('Already checked in today');
            }

            const now = firebase.firestore.FieldValue.serverTimestamp();

            const attendanceData = {
                userId: userId,
                date: today,
                checkIn: now,
                gps: {
                    lat: gps.lat,
                    lng: gps.lng
                },
                checkOut: null,
                checkOutGps: null,
                createdAt: now
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

            return { date: today, ...attendanceData };
        } catch (error) {
            console.error('Error checking in:', error);
            throw error;
        }
    }

    // Check out
    static async checkOut(companyId, userId, checkOutGps) {
        try {
            if (!companyId || !userId || !checkOutGps) {
                throw new Error('Company ID, User ID, and GPS are required');
            }

            if (!checkOutGps.lat || !checkOutGps.lng) {
                throw new Error('GPS coordinates (lat, lng) are required');
            }

            const today = new Date().toISOString().split('T')[0];
            
            // Check if already checked in
            const existing = await this.getTodayAttendance(companyId, userId);
            if (!existing) {
                throw new Error('No check-in record found for today');
            }

            if (existing.checkOut) {
                throw new Error('Already checked out today');
            }

            const now = firebase.firestore.FieldValue.serverTimestamp();

            await db.collection('companies')
                .doc(companyId)
                .collection('attendance')
                .doc(userId)
                .collection('records')
                .doc(today)
                .update({
                    checkOut: now,
                    checkOutGps: {
                        lat: checkOutGps.lat,
                        lng: checkOutGps.lng
                    },
                    updatedAt: now
                });

            return true;
        } catch (error) {
            console.error('Error checking out:', error);
            throw error;
        }
    }

    // Get attendance records for a user (date range)
    static async getUserAttendance(companyId, userId, startDate = null, endDate = null, limit = 50) {
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
            console.error('Error getting user attendance:', error);
            throw error;
        }
    }

    // Get attendance summary for a user (total hours, days present, etc.)
    static async getUserAttendanceSummary(companyId, userId, startDate, endDate) {
        try {
            if (!companyId || !userId) {
                throw new Error('Company ID and User ID are required');
            }

            const records = await this.getUserAttendance(companyId, userId, startDate, endDate, 1000);
            
            let totalHours = 0;
            let daysPresent = 0;
            let daysLate = 0;
            let daysIncomplete = 0;

            records.forEach(record => {
                if (record.checkIn) {
                    daysPresent++;
                    
                    if (record.checkOut) {
                        // Calculate hours worked
                        const checkInTime = record.checkIn.toDate ? record.checkIn.toDate() : new Date(record.checkIn);
                        const checkOutTime = record.checkOut.toDate ? record.checkOut.toDate() : new Date(record.checkOut);
                        const hoursWorked = (checkOutTime - checkInTime) / (1000 * 60 * 60);
                        totalHours += hoursWorked;
                    } else {
                        daysIncomplete++;
                    }
                }
            });

            return {
                totalRecords: records.length,
                daysPresent,
                daysIncomplete,
                totalHours: Math.round(totalHours * 100) / 100,
                averageHoursPerDay: daysPresent > 0 ? Math.round((totalHours / daysPresent) * 100) / 100 : 0
            };
        } catch (error) {
            console.error('Error getting user attendance summary:', error);
            throw error;
        }
    }

    // Get all attendance for a company on a specific date (for managers/owners)
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

            return allRecords;
        } catch (error) {
            console.error('Error getting company attendance:', error);
            throw error;
        }
    }

    // Get attendance records for date range (for managers)
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

    // Get company attendance summary
    static async getCompanyAttendanceSummary(companyId, date = null) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const targetDate = date || new Date().toISOString().split('T')[0];
            const records = await this.getCompanyAttendance(companyId, targetDate);

            const summary = {
                date: targetDate,
                totalEmployees: 0,
                checkedIn: 0,
                checkedOut: 0,
                notCheckedIn: 0,
                lateCheckIns: 0
            };

            // Get total employees count
            const employeesSnapshot = await db.collection('companies')
                .doc(companyId)
                .collection('employees')
                .where('status', '==', 'approved')
                .get();
            
            summary.totalEmployees = employeesSnapshot.size;

            // Count attendance statuses
            records.forEach(record => {
                if (record.checkIn) {
                    summary.checkedIn++;
                    
                    if (record.checkOut) {
                        summary.checkedOut++;
                    }
                }
            });

            summary.notCheckedIn = summary.totalEmployees - summary.checkedIn;

            return summary;
        } catch (error) {
            console.error('Error getting company attendance summary:', error);
            throw error;
        }
    }

    // Delete attendance record (managers only)
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

    // Update attendance record (managers only)
    static async updateAttendance(companyId, userId, date, updates) {
        try {
            if (!companyId || !userId || !date) {
                throw new Error('Company ID, User ID, and date are required');
            }

            // Validate updates
            const allowedFields = ['checkIn', 'checkOut', 'gps', 'checkOutGps', 'notes'];
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

    // Calculate work hours for a record
    static calculateWorkHours(record) {
        if (!record.checkIn || !record.checkOut) {
            return 0;
        }

        const checkInTime = record.checkIn.toDate ? record.checkIn.toDate() : new Date(record.checkIn);
        const checkOutTime = record.checkOut.toDate ? record.checkOut.toDate() : new Date(record.checkOut);
        
        const hours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
        return Math.round(hours * 100) / 100;
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

    // Get attendance statistics for a user
    static async getAttendanceStats(companyId, userId, options = {}) {
        try {
            if (!companyId || !userId) {
                throw new Error('Company ID and User ID are required');
            }

            const {
                startDate = null,
                endDate = null,
                period = 'month' // 'week', 'month', 'year', 'custom'
            } = options;

            // Calculate date range based on period
            let calculatedStartDate = startDate;
            let calculatedEndDate = endDate || new Date().toISOString().split('T')[0];

            if (!startDate) {
                const now = new Date();
                switch (period) {
                    case 'week':
                        const weekAgo = new Date(now);
                        weekAgo.setDate(now.getDate() - 7);
                        calculatedStartDate = weekAgo.toISOString().split('T')[0];
                        break;
                    case 'month':
                        const monthAgo = new Date(now);
                        monthAgo.setMonth(now.getMonth() - 1);
                        calculatedStartDate = monthAgo.toISOString().split('T')[0];
                        break;
                    case 'year':
                        const yearAgo = new Date(now);
                        yearAgo.setFullYear(now.getFullYear() - 1);
                        calculatedStartDate = yearAgo.toISOString().split('T')[0];
                        break;
                    default:
                        calculatedStartDate = null;
                }
            }

            // Get attendance records
            const records = await this.getUserAttendance(
                companyId, 
                userId, 
                calculatedStartDate, 
                calculatedEndDate, 
                1000
            );

            // Calculate statistics
            const stats = {
                period: {
                    start: calculatedStartDate,
                    end: calculatedEndDate,
                    type: period
                },
                totalRecords: records.length,
                totalDays: 0,
                presentDays: 0,
                absentDays: 0,
                incompleteDays: 0,
                lateCheckIns: 0,
                earlyCheckOuts: 0,
                totalHours: 0,
                averageHours: 0,
                overtimeHours: 0,
                undertimeHours: 0,
                longestDay: { date: null, hours: 0 },
                shortestDay: { date: null, hours: null },
                averageCheckInTime: null,
                averageCheckOutTime: null,
                onTimeRate: 0,
                completionRate: 0
            };

            // Calculate total working days in period
            if (calculatedStartDate && calculatedEndDate) {
                const start = new Date(calculatedStartDate);
                const end = new Date(calculatedEndDate);
                const diffTime = Math.abs(end - start);
                stats.totalDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            }

            let totalCheckInMinutes = 0;
            let totalCheckOutMinutes = 0;
            let checkInCount = 0;
            let checkOutCount = 0;
            let onTimeCount = 0;

            // Standard work hours (can be made configurable)
            const standardWorkHours = 8;
            const standardCheckInTime = 9 * 60; // 9:00 AM in minutes
            const lateThresholdMinutes = 15; // 15 minutes late threshold

            records.forEach(record => {
                if (record.checkIn) {
                    stats.presentDays++;

                    // Calculate check-in time
                    const checkInTime = record.checkIn.toDate ? 
                        record.checkIn.toDate() : new Date(record.checkIn);
                    const checkInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();
                    totalCheckInMinutes += checkInMinutes;
                    checkInCount++;

                    // Check if late
                    if (checkInMinutes > standardCheckInTime + lateThresholdMinutes) {
                        stats.lateCheckIns++;
                    } else {
                        onTimeCount++;
                    }

                    if (record.checkOut) {
                        // Calculate hours worked
                        const checkOutTime = record.checkOut.toDate ? 
                            record.checkOut.toDate() : new Date(record.checkOut);
                        const hoursWorked = (checkOutTime - checkInTime) / (1000 * 60 * 60);
                        stats.totalHours += hoursWorked;

                        // Calculate check-out time
                        const checkOutMinutes = checkOutTime.getHours() * 60 + checkOutTime.getMinutes();
                        totalCheckOutMinutes += checkOutMinutes;
                        checkOutCount++;

                        // Track longest/shortest day
                        if (hoursWorked > stats.longestDay.hours) {
                            stats.longestDay = {
                                date: record.date,
                                hours: Math.round(hoursWorked * 100) / 100
                            };
                        }
                        if (stats.shortestDay.hours === null || hoursWorked < stats.shortestDay.hours) {
                            stats.shortestDay = {
                                date: record.date,
                                hours: Math.round(hoursWorked * 100) / 100
                            };
                        }

                        // Calculate overtime/undertime
                        if (hoursWorked > standardWorkHours) {
                            stats.overtimeHours += (hoursWorked - standardWorkHours);
                        } else if (hoursWorked < standardWorkHours) {
                            stats.undertimeHours += (standardWorkHours - hoursWorked);
                        }
                    } else {
                        stats.incompleteDays++;
                    }
                }
            });

            // Calculate averages
            if (stats.presentDays > 0) {
                stats.averageHours = Math.round((stats.totalHours / (stats.presentDays - stats.incompleteDays)) * 100) / 100;
            }

            if (checkInCount > 0) {
                const avgCheckInMinutes = totalCheckInMinutes / checkInCount;
                const hours = Math.floor(avgCheckInMinutes / 60);
                const minutes = Math.round(avgCheckInMinutes % 60);
                stats.averageCheckInTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }

            if (checkOutCount > 0) {
                const avgCheckOutMinutes = totalCheckOutMinutes / checkOutCount;
                const hours = Math.floor(avgCheckOutMinutes / 60);
                const minutes = Math.round(avgCheckOutMinutes % 60);
                stats.averageCheckOutTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            }

            // Calculate rates
            if (stats.totalDays > 0) {
                stats.onTimeRate = Math.round((onTimeCount / stats.presentDays) * 100);
                stats.completionRate = Math.round(((stats.presentDays - stats.incompleteDays) / stats.presentDays) * 100);
                stats.absentDays = stats.totalDays - stats.presentDays;
            }

            // Round hours
            stats.totalHours = Math.round(stats.totalHours * 100) / 100;
            stats.overtimeHours = Math.round(stats.overtimeHours * 100) / 100;
            stats.undertimeHours = Math.round(stats.undertimeHours * 100) / 100;

            return stats;
        } catch (error) {
            console.error('Error getting attendance stats:', error);
            throw error;
        }
    }

    // Get company-wide attendance statistics
    static async getCompanyAttendanceStats(companyId, options = {}) {
        try {
            if (!companyId) {
                throw new Error('Company ID is required');
            }

            const {
                startDate = null,
                endDate = null,
                period = 'month'
            } = options;

            // Calculate date range based on period
            let calculatedStartDate = startDate;
            let calculatedEndDate = endDate || new Date().toISOString().split('T')[0];

            if (!startDate) {
                const now = new Date();
                switch (period) {
                    case 'week':
                        const weekAgo = new Date(now);
                        weekAgo.setDate(now.getDate() - 7);
                        calculatedStartDate = weekAgo.toISOString().split('T')[0];
                        break;
                    case 'month':
                        const monthAgo = new Date(now);
                        monthAgo.setMonth(now.getMonth() - 1);
                        calculatedStartDate = monthAgo.toISOString().split('T')[0];
                        break;
                    case 'year':
                        const yearAgo = new Date(now);
                        yearAgo.setFullYear(now.getFullYear() - 1);
                        calculatedStartDate = yearAgo.toISOString().split('T')[0];
                        break;
                    default:
                        calculatedStartDate = null;
                }
            }

            // Get all employees
            const employeesSnapshot = await db.collection('companies')
                .doc(companyId)
                .collection('employees')
                .where('status', '==', 'approved')
                .get();

            const totalEmployees = employeesSnapshot.size;

            // Get all attendance records
            const records = await this.getCompanyAttendanceRange(
                companyId,
                calculatedStartDate,
                calculatedEndDate
            );

            // Calculate company-wide statistics
            const stats = {
                period: {
                    start: calculatedStartDate,
                    end: calculatedEndDate,
                    type: period
                },
                totalEmployees: totalEmployees,
                totalRecords: records.length,
                averageAttendanceRate: 0,
                totalHoursWorked: 0,
                averageHoursPerEmployee: 0,
                totalLateCheckIns: 0,
                totalIncomplete: 0,
                topPerformers: [],
                attendanceTrend: {}
            };

            let totalHours = 0;
            let lateCount = 0;
            let incompleteCount = 0;
            const employeeStats = {};
            const dailyAttendance = {};

            // Standard check-in time
            const standardCheckInTime = 9 * 60; // 9:00 AM
            const lateThresholdMinutes = 15;

            records.forEach(record => {
                // Track per employee
                if (!employeeStats[record.userId]) {
                    employeeStats[record.userId] = {
                        userId: record.userId,
                        presentDays: 0,
                        totalHours: 0,
                        lateCount: 0,
                        incompleteCount: 0
                    };
                }

                const empStat = employeeStats[record.userId];
                empStat.presentDays++;

                // Track daily attendance
                if (!dailyAttendance[record.date]) {
                    dailyAttendance[record.date] = 0;
                }
                dailyAttendance[record.date]++;

                if (record.checkIn) {
                    const checkInTime = record.checkIn.toDate ? 
                        record.checkIn.toDate() : new Date(record.checkIn);
                    const checkInMinutes = checkInTime.getHours() * 60 + checkInTime.getMinutes();

                    if (checkInMinutes > standardCheckInTime + lateThresholdMinutes) {
                        lateCount++;
                        empStat.lateCount++;
                    }

                    if (record.checkOut) {
                        const checkOutTime = record.checkOut.toDate ? 
                            record.checkOut.toDate() : new Date(record.checkOut);
                        const hoursWorked = (checkOutTime - checkInTime) / (1000 * 60 * 60);
                        totalHours += hoursWorked;
                        empStat.totalHours += hoursWorked;
                    } else {
                        incompleteCount++;
                        empStat.incompleteCount++;
                    }
                }
            });

            stats.totalHoursWorked = Math.round(totalHours * 100) / 100;
            stats.averageHoursPerEmployee = totalEmployees > 0 ? 
                Math.round((totalHours / totalEmployees) * 100) / 100 : 0;
            stats.totalLateCheckIns = lateCount;
            stats.totalIncomplete = incompleteCount;

            // Calculate attendance rate
            if (calculatedStartDate && calculatedEndDate) {
                const start = new Date(calculatedStartDate);
                const end = new Date(calculatedEndDate);
                const totalDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
                const possibleAttendance = totalEmployees * totalDays;
                stats.averageAttendanceRate = possibleAttendance > 0 ? 
                    Math.round((records.length / possibleAttendance) * 100) : 0;
            }

            // Get top performers (by total hours)
            stats.topPerformers = Object.values(employeeStats)
                .sort((a, b) => b.totalHours - a.totalHours)
                .slice(0, 5)
                .map(emp => ({
                    userId: emp.userId,
                    presentDays: emp.presentDays,
                    totalHours: Math.round(emp.totalHours * 100) / 100,
                    averageHours: emp.presentDays > 0 ? 
                        Math.round((emp.totalHours / emp.presentDays) * 100) / 100 : 0,
                    lateCount: emp.lateCount,
                    incompleteCount: emp.incompleteCount
                }));

            // Attendance trend by date
            stats.attendanceTrend = dailyAttendance;

            return stats;
        } catch (error) {
            console.error('Error getting company attendance stats:', error);
            throw error;
        }
    }
}