# A-In (عين) - Attendance & Workforce Management System

[![Live Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://abdouthematrix.github.io/AIn-Web/)
[![Firebase](https://img.shields.io/badge/Firebase-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-yellow?logo=javascript)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)

A comprehensive bilingual (English/Arabic) attendance and workforce management system built with vanilla JavaScript, Firebase, and designed for static deployment.

## 🎯 Overview

A-In is a modern, role-based attendance tracking system that supports:
- **GPS-based check-in/check-out** with location validation
- **Selfie verification** for biometric authentication
- **Multi-company support** with role-based access control
- **Real-time attendance tracking** and statistics
- **Bilingual interface** (English/Arabic) with RTL support
- **Progressive enhancement** with dark/light themes

---

## 📋 Table of Contents

- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [Data Architecture](#-data-architecture)
- [User Roles & Permissions](#-user-roles--permissions)
- [API Documentation](#-api-documentation)
- [Deployment](#-deployment)
- [Security](#-security)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)

---

## ✨ Features

### Authentication & User Management
- ✅ Email/password authentication
- ✅ Password reset functionality
- ✅ User profile management
- ✅ Multi-company membership

### Company Management
- ✅ Create and manage companies
- ✅ Invitation code system (8-character codes)
- ✅ Role-based access (Owner, Manager, Employee)
- ✅ Company settings and configuration
- ✅ GPS validation with configurable radius
- ✅ Work hours configuration

### Attendance System
- ✅ GPS-based check-in/check-out
- ✅ Optional selfie verification
- ✅ Real-time location tracking
- ✅ Attendance history and reports
- ✅ Monthly statistics and analytics
- ✅ Late days tracking
- ✅ Work hours calculation
- ✅ Manager approval workflow

### User Interface
- ✅ Responsive design (mobile-first)
- ✅ Dark/Light theme support
- ✅ Bilingual (English/Arabic)
- ✅ RTL support for Arabic
- ✅ Interactive maps (Google Maps)
- ✅ Toast notifications
- ✅ Loading states

---

## 🛠 Tech Stack

### Frontend
- **Language**: Vanilla JavaScript (ES6+ Modules)
- **Styling**: Pure CSS3 with CSS Grid & Flexbox
- **Architecture**: Single Page Application (SPA)
- **Routing**: Hash-based client-side routing
- **i18n**: Custom internationalization system

### Backend (Firebase)
- **Authentication**: Firebase Auth
- **Database**: Cloud Firestore
- **Storage**: Firebase Storage (for selfies)
- **Hosting**: Firebase Hosting / Static hosting

### APIs & Services
- **Geolocation API**: GPS tracking
- **MediaDevices API**: Camera access for selfies
- **Google Maps**: Location visualization

---

## 📁 Project Structure

```
a-in/
├── index.html                    # Main HTML file
├── css/
│   └── style.css                # Global styles
├── js/
│   ├── app.js                   # Application entry point
│   ├── config.js                # Firebase configuration
│   ├── services/
│   │   ├── auth.js             # Authentication service
│   │   ├── user.js             # User management
│   │   ├── company.js          # Company operations
│   │   └── attendance.js       # Attendance tracking
│   ├── utils/
│   │   ├── router.js           # SPA routing
│   │   ├── i18n.js             # Internationalization
│   │   ├── theme-manager.js    # Theme switching
│   │   └── helpers.js          # Utility functions
│   └── components/
│       ├── login.js            # Login page
│       ├── signup.js           # Registration page
│       ├── dashboard.js        # Main dashboard
│       ├── attendance-check.js # Check-in/out interface
│       ├── company-setup.js    # Company creation/editing
│       ├── join-company.js     # Join with invite code
│       ├── employee-list.js    # Employee management
│       ├── attendance-history.js # History viewer
│       └── profile.js          # User profile
├── locales/
│   ├── en.json                 # English translations
│   └── ar.json                 # Arabic translations
├── firestore.rules             # Security rules
└── README.md                   # This file
```

---

## 🚀 Installation

### Prerequisites
- Modern web browser (Chrome 90+, Firefox 88+, Safari 14+)
- Firebase account
- Text editor (VS Code recommended)
- Local server (Python, Node.js, or PHP)

### Step 1: Clone Repository
```bash
git clone https://github.com/abdouthematrix/AIn-Web.git
cd AIn-Web
```

### Step 2: Firebase Setup

1. **Create Firebase Project**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Click "Add project"
   - Follow the setup wizard

2. **Enable Authentication**
   - Go to Authentication → Sign-in method
   - Enable "Email/Password"

3. **Create Firestore Database**
   - Go to Firestore Database
   - Click "Create database"
   - Start in **production mode**
   - Choose location closest to users

4. **Get Firebase Config**
   - Go to Project Settings → General
   - Scroll to "Your apps" → Web app
   - Copy the configuration object

### Step 3: Configuration

Edit `js/config.js`:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

export const auth = firebase.auth();
export const db = firebase.firestore();
```

### Step 4: Deploy Firestore Rules

Copy and paste the security rules from `firestore.rules` into:
Firebase Console → Firestore → Rules

### Step 5: Run Locally

**Using Python:**
```bash
python -m http.server 8000
```

**Using Node.js:**
```bash
npx http-server -p 8000
```

**Using PHP:**
```bash
php -S localhost:8000
```

Visit: `http://localhost:8000`

---

## ⚙️ Configuration

### Company Settings

When creating/editing a company, configure:

```javascript
{
  name: "Company Name",
  settings: {
    // GPS Validation
    gpsRequired: true,              // Require GPS validation
    officeLocation: {
      lat: 30.0444,                 // Office latitude
      lng: 31.2357                  // Office longitude
    },
    gpsRadius: 100,                 // Allowed radius in meters
    
    // Work Hours
    workHours: {
      start: "09:00",               // Work start time
      end: "17:00"                  // Work end time
    },
    
    // Biometric
    requireSelfie: false,           // Require selfie for check-in
    
    // Other
    industry: "technology",
    timezone: "Africa/Cairo"
  }
}
```

### Theme Configuration

Themes are automatically saved to localStorage:

```javascript
// Get current theme
const theme = window.app.getTheme(); // 'light' or 'dark'

// Set theme programmatically
window.app.setTheme('dark');

// Check theme state
if (window.app.isDarkMode()) {
  // Dark mode specific logic
}
```

### Language Configuration

```javascript
// Switch language
await window.app.i18n.switchLanguage('ar');

// Get current language
const lang = window.app.getCurrentLanguage(); // 'en' or 'ar'

// Check if RTL
if (window.app.i18n.isRTL()) {
  // RTL specific logic
}
```

---

## 🗄️ Data Architecture

### Firestore Collections

#### `/users/{uid}`
```javascript
{
  email: "user@example.com",
  displayName: "John Doe",
  companyIds: ["companyId1", "companyId2"], // Array of company IDs
  lastCompanyId: "companyId1",              // Last selected company
  status: "active",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `/companies/{companyId}`
```javascript
{
  name: "Acme Corp",
  ownerUid: "userId123",
  settings: {
    gpsRequired: true,
    officeLocation: { lat: 30.0444, lng: 31.2357 },
    gpsRadius: 100,
    requireSelfie: false,
    workHours: { start: "09:00", end: "17:00" },
    industry: "technology",
    timezone: "UTC"
  },
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `/companies/{companyId}/managers/{userId}`
```javascript
{
  userId: "userId123",
  userName: "Jane Smith",
  userEmail: "jane@example.com",
  addedAt: timestamp,
  joinedViaCode: "ABC12345",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `/companies/{companyId}/employees/{userId}`
```javascript
{
  userId: "userId456",
  userName: "Bob Johnson",
  userEmail: "bob@example.com",
  addedAt: timestamp,
  joinedViaCode: "XYZ67890",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `/companies/{companyId}/invitations/{inviteCode}`
```javascript
{
  code: "ABC12345",
  role: "employee", // or "manager"
  createdAt: timestamp,
  expiresAt: timestamp // 7 days from creation
}
```

#### `/companies/{companyId}/attendance/{date}/records/{userId}`
```javascript
{
  userId: "userId123",
  userName: "John Doe",
  userEmail: "john@example.com",
  date: "2025-01-15",              // YYYY-MM-DD
  checkIn: timestamp,
  checkOut: timestamp | null,
  gps: { lat: 30.0444, lng: 31.2357 },
  checkOutGps: { lat: 30.0445, lng: 31.2358 } | null,
  selfieData: "base64String" | null,
  biometricConfirmed: false,
  status: "pending",               // pending | approved | rejected
  reviewedAt: timestamp | null,
  reviewedBy: "reviewerUid" | null,
  reviewerName: "Reviewer Name" | null,
  lastModifiedBy: "modifierUid" | null,
  lastModifierName: "Modifier Name" | null,
  notes: "Optional notes",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Data Hierarchy

```
Root
├── users/
│   └── {uid}/
├── companies/
│   └── {companyId}/
│       ├── (company data)
│       ├── managers/
│       │   └── {userId}/
│       ├── employees/
│       │   └── {userId}/
│       ├── invitations/
│       │   └── {inviteCode}/
│       └── attendance/
│           └── {date}/
│               ├── (date metadata)
│               └── records/
│                   └── {userId}/
```

---

## 👥 User Roles & Permissions

### Owner (Company Creator)
**Can:**
- ✅ Create and edit company
- ✅ Generate manager and employee invitation codes
- ✅ View all managers and employees
- ✅ Remove managers and employees
- ✅ View all attendance records
- ✅ Approve/reject attendance
- ✅ Edit attendance records
- ✅ Delete attendance records
- ✅ View company statistics

**Cannot:**
- ❌ Be removed from own company
- ❌ Transfer ownership (not implemented)

### Manager
**Can:**
- ✅ Generate employee invitation codes
- ✅ View all employees
- ✅ Remove employees
- ✅ View all employee attendance
- ✅ Approve/reject employee attendance
- ✅ Edit employee attendance
- ✅ Delete employee attendance
- ✅ Check in/out (as employee)

**Cannot:**
- ❌ Edit company settings
- ❌ Manage other managers
- ❌ Generate manager invitation codes
- ❌ Remove themselves

### Employee
**Can:**
- ✅ Check in/out
- ✅ View personal attendance history
- ✅ View personal statistics
- ✅ Join companies with invitation codes
- ✅ Switch between companies

**Cannot:**
- ❌ View other employees' attendance
- ❌ Approve/reject attendance
- ❌ Edit company settings
- ❌ Generate invitation codes
- ❌ Manage other users

---

## 📚 API Documentation

### AuthService

```javascript
import { AuthService } from './services/auth.js';

// Sign up new user
await AuthService.signUp(email, password, displayName);

// Sign in
await AuthService.signIn(email, password);

// Sign out
await AuthService.signOut();

// Get current user
const user = AuthService.getCurrentUser();

// Check authentication
const isAuth = AuthService.isAuthenticated();

// Get user role in company
const role = await AuthService.getUserRole(companyId);
// Returns: 'owner' | 'manager' | 'employee' | null

// Check company access
const hasAccess = await AuthService.hasCompanyAccess(companyId);

// Check management permissions
const canManage = await AuthService.canManageCompany(companyId);

// Set current company
await AuthService.setCurrentCompany(companyId);

// Switch company
await AuthService.switchCompany(companyId);

// Reset password
await AuthService.resetPassword(email);

// Listen to auth state changes
AuthService.onAuthStateChanged((user) => {
  if (user) {
    // User signed in
  } else {
    // User signed out
  }
});
```

### CompanyService

```javascript
import { CompanyService } from './services/company.js';

// Create company
const companyId = await CompanyService.createCompany(ownerUid, {
  name: "Company Name",
  settings: {
    gpsRequired: true,
    officeLocation: { lat: 30.0, lng: 31.0 },
    gpsRadius: 100,
    requireSelfie: false,
    workHours: { start: "09:00", end: "17:00" }
  }
});

// Get company
const company = await CompanyService.getCompany(companyId);

// Update company
await CompanyService.updateCompany(companyId, updates);

// Get user's companies
const companies = await CompanyService.getUserCompanies(userDoc);

// Generate invitation code
const inviteCode = await CompanyService.createInvitationCode(
  companyId, 
  'employee' // or 'manager'
);

// Join with invitation code
const companyId = await CompanyService.joinWithInvitationCode(
  userId, 
  inviteCode
);

// Delete invitation code
await CompanyService.deleteInvitationCode(companyId, inviteCode);

// Get invitation codes
const codes = await CompanyService.getInvitationCodes(companyId);

// Get employees
const employees = await CompanyService.getEmployees(companyId);

// Get managers
const managers = await CompanyService.getManagers(companyId);

// Remove employee
await CompanyService.removeEmployee(companyId, userId);

// Remove manager
await CompanyService.removeManager(companyId, userId);
```

### AttendanceService

```javascript
import { AttendanceService } from './services/attendance.js';

// Check in
await AttendanceService.checkIn(
  companyId,
  user,
  gpsCoords,      // { latitude, longitude, accuracy }
  selfieBlob      // Optional Blob object
);

// Check out
await AttendanceService.checkOut(companyId, userId, gpsCoords);

// Get today's attendance
const today = await AttendanceService.getTodayAttendance(
  companyId, 
  userId
);

// Get attendance by date
const record = await AttendanceService.getAttendanceByDate(
  companyId,
  userId,
  "2025-01-15"
);

// Get user attendance history
const history = await AttendanceService.getUserAttendanceHistory(
  companyId,
  userId,
  startDate,    // "2025-01-01"
  endDate,      // "2025-01-31"
  limit         // 100
);

// Get company attendance range
const records = await AttendanceService.getCompanyAttendanceRange(
  companyId,
  startDate,
  endDate
);

// Update attendance status (approve/reject)
await AttendanceService.updateAttendanceStatus(
  companyId,
  userId,
  date,
  'approved',   // 'pending' | 'approved' | 'rejected'
  reviewerUid,
  reviewerName
);

// Update attendance record
await AttendanceService.updateAttendance(
  companyId,
  userId,
  date,
  {
    checkIn: timestamp,
    checkOut: timestamp,
    status: 'approved',
    notes: 'Adjusted for overtime'
  },
  updaterUid,
  updaterName
);

// Delete attendance
await AttendanceService.deleteAttendance(companyId, userId, date);

// Get attendance statistics
const stats = await AttendanceService.getAttendanceStats(
  companyId,
  userId,
  month,        // 1-12
  year          // 2025
);
// Returns: {
//   month, year, presentDays, totalDays, incompleteDays,
//   totalHours, lateDays, avgHoursPerDay, avgCheckInTime,
//   onTimeRate, completionRate
// }

// Calculate work hours
const hours = AttendanceService.calculateWorkHours(
  checkInTimestamp,
  checkOutTimestamp
);

// Get current location
const location = await AttendanceService.getCurrentLocation();
// Returns: { latitude, longitude, accuracy }

// Capture selfie
const blob = await AttendanceService.captureSelfie();

// Calculate distance (meters)
const distance = AttendanceService.calculateDistance(
  gps1,  // { lat, lng }
  gps2   // { lat, lng }
);

// Convert blob to base64
const base64 = await AttendanceService.blobToBase64(blob);

// Convert base64 to data URL
const dataUrl = AttendanceService.base64ToDataUrl(base64);
```

### Router

```javascript
import { Router } from './utils/router.js';

const router = new Router();

// Register route
router.register('/path', handlerFunction, {
  requireAuth: true,
  roles: ['owner', 'manager'],
  title: 'Page Title'
});

// Navigate
router.navigate('/dashboard');

// Get current path
const path = router.getCurrentPath();

// Get query params
const params = router.getQueryParams();
// Returns: { key: 'value', ... }
```

### I18n

```javascript
import { I18n } from './utils/i18n.js';

const i18n = new I18n();

// Initialize
await i18n.init();

// Get translation
const text = i18n.t('key', { param: 'value' });

// Switch language
await i18n.switchLanguage('ar');

// Get current language
const lang = i18n.getCurrentLang(); // 'en' | 'ar'

// Check RTL
const isRTL = i18n.isRTL();

// Update page text
i18n.updatePageText();
```

### Helper Functions

```javascript
import {
  formatDate,
  formatTime,
  formatDateTime,
  showLoading,
  hideLoading,
  showToast,
  showConfirm,
  debounce,
  isValidEmail,
  generateId,
  calculateDistance,
  formatFileSize,
  sanitizeHTML,
  deepClone,
  isMobile,
  formatDuration
} from './utils/helpers.js';

// Examples
formatDate(date, 'en-US');
formatTime(timestamp);
showToast('message-key', 'success', 3000);
showConfirm('Are you sure?', onConfirm, onCancel);
const isValid = isValidEmail('test@example.com');
```

---

## 🌐 Deployment

### Option 1: Firebase Hosting

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login
firebase login

# Initialize
firebase init hosting

# Select options:
# - Use existing project
# - Public directory: .
# - Single-page app: Yes
# - GitHub actions: No

# Deploy
firebase deploy --only hosting
```

### Option 2: GitHub Pages

```bash
# Push to GitHub
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin YOUR_REPO_URL
git push -u origin main

# Enable GitHub Pages
# Go to: Repository → Settings → Pages
# Source: main branch
# Folder: / (root)
```

### Option 3: Netlify

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login
netlify login

# Deploy
netlify deploy --prod --dir=.
```

### Option 4: Vercel

```bash
# Install Vercel CLI
npm install -g vercel

# Deploy
vercel --prod
```

### Pre-Deployment Checklist

- [ ] Update Firebase config in `js/config.js`
- [ ] Deploy Firestore security rules
- [ ] Enable Firebase Authentication
- [ ] Test all user flows
- [ ] Test on mobile devices
- [ ] Enable HTTPS (required for geolocation)
- [ ] Set up error monitoring
- [ ] Configure Firebase project billing (if needed)
- [ ] Test with real GPS coordinates
- [ ] Verify map embeds work
- [ ] Test selfie capture
- [ ] Check translation files
- [ ] Test theme switching
- [ ] Verify all routes work

---

## 🔒 Security

### Firestore Security Rules

The app uses comprehensive security rules to protect data:

**Key Principles:**
- Users can only access companies they belong to
- Owners have full control over their companies
- Managers can manage employees and attendance
- Employees can only manage their own attendance
- Invitation codes have rate limiting (5 attempts per 15 minutes)

### Authentication Security

```javascript
// Never store passwords in code
// Use strong password requirements
if (password.length < 6) {
  throw new Error('Password must be at least 6 characters');
}

// Implement password reset
await AuthService.resetPassword(email);

// Always use HTTPS in production
// Check: window.location.protocol === 'https:'
```

### Data Privacy

- Minimal user data collection
- GPS coordinates stored only when checking in/out
- Selfies stored as base64 in Firestore (not public)
- Users can delete their attendance records
- Company data isolated by security rules

### XSS Prevention

```javascript
import { sanitizeHTML } from './utils/helpers.js';

// Sanitize user input before displaying
const clean = sanitizeHTML(userInput);
element.innerHTML = clean;
```

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Check-in Not Working

**Symptoms:** "Unable to get location" error

**Solutions:**
- Enable location services in browser
- Use HTTPS (geolocation requires secure context)
- Check browser permissions
- Test on different device/browser

```javascript
// Debug location
navigator.geolocation.getCurrentPosition(
  (pos) => console.log('GPS:', pos.coords),
  (err) => console.error('GPS Error:', err)
);
```

#### 2. Firebase Connection Issues

**Symptoms:** "Firebase: Error (auth/...)"

**Solutions:**
- Verify Firebase config in `js/config.js`
- Check Firebase project is active
- Verify domain is authorized in Firebase Console
- Check browser console for CORS errors

#### 3. Authentication Fails

**Symptoms:** Can't login/signup

**Solutions:**
- Enable Email/Password in Firebase Console
- Check Firestore rules are deployed
- Verify user document creation
- Check network tab for API errors

#### 4. Invitation Codes Don't Work

**Symptoms:** "Invalid invitation code"

**Solutions:**
- Check code expiry (7 days)
- Verify invitation document exists
- Check rate limiting (max 5 attempts)
- Test with fresh incognito window

#### 5. Maps Don't Load

**Symptoms:** Blank iframe where map should be

**Solutions:**
- Check internet connection
- Verify GPS coordinates are valid
- Test embed URL directly
- Check browser console for errors

#### 6. Theme/Language Not Persisting

**Symptoms:** Settings reset on page reload

**Solutions:**
- Check localStorage is enabled
- Clear browser cache
- Check for localStorage errors
- Verify localStorage quota

#### 7. Selfie Capture Fails

**Symptoms:** Camera permission denied

**Solutions:**
- Grant camera permission
- Use HTTPS (camera requires secure context)
- Check device has camera
- Test on different browser

### Debug Mode

Enable debug logging:

```javascript
// Add to config.js
window.DEBUG = true;

// Use in code
if (window.DEBUG) {
  console.log('Debug info:', data);
}
```

### Browser Console Commands

```javascript
// Check current user
AuthService.getCurrentUser();

// Check current company
AuthService.currentCompanyId;

// Check user role
await AuthService.getUserRole(AuthService.currentCompanyId);

// Test GPS
await AttendanceService.getCurrentLocation();

// Get theme
window.app.getTheme();

// Get language
window.app.getCurrentLanguage();
```

---

## 🤝 Contributing

### Code Style

- Use ES6+ features
- Use `const` by default, `let` when reassignment needed
- Use arrow functions for callbacks
- Use template literals for strings
- Use async/await for promises
- Add JSDoc comments for functions
- Keep functions small and focused
- Use meaningful variable names

### Example Function

```javascript
/**
 * Calculate work hours between check-in and check-out
 * @param {Timestamp} checkIn - Check-in timestamp
 * @param {Timestamp} checkOut - Check-out timestamp
 * @returns {number} Hours worked (rounded to 2 decimals)
 */
static calculateWorkHours(checkIn, checkOut) {
  if (!checkIn || !checkOut) return 0;
  
  const checkInTime = checkIn.toDate();
  const checkOutTime = checkOut.toDate();
  const diffMs = checkOutTime - checkInTime;
  const diffHours = diffMs / (1000 * 60 * 60);
  
  return Math.round(diffHours * 100) / 100;
}
```

### Commit Messages

Use conventional commits:

```
feat: add new feature
fix: fix bug
docs: update documentation
style: formatting changes
refactor: code refactoring
test: add tests
chore: maintenance tasks
perf: performance improvement
```

### Pull Request Process

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Make changes
4. Test thoroughly
5. Commit changes (`git commit -m 'feat: add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open Pull Request

---

## 📄 License

This project is provided as-is for educational and commercial use.

---

## 🙏 Acknowledgments

- Firebase for backend infrastructure
- Google Maps for location services
- Font Awesome for icons
- The open-source community

---

## 📞 Support

### Documentation
- [Firebase Docs](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)

### Issues
For bugs and feature requests, please [create an issue](https://github.com/abdouthematrix/AIn-Web/issues)

### Contact
- GitHub: [@abdouthematrix](https://github.com/abdouthematrix)
- Project: [A-In Web](https://github.com/abdouthematrix/AIn-Web)

---

## 🎓 Learning Resources

### JavaScript
- [MDN Web Docs](https://developer.mozilla.org/)
- [JavaScript.info](https://javascript.info/)
- [ES6 Features](https://github.com/lukehoban/es6features)

### Firebase
- [Firebase Fundamentals](https://firebase.google.com/docs/web/setup)
- [Firestore Data Model](https://firebase.google.com/docs/firestore/data-model)
- [Firebase Authentication](https://firebase.google.com/docs/auth/web/start)

### CSS
- [CSS Grid Guide](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [CSS Flexbox Guide](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [RTL Styling](https://rtlstyling.com/)

---

## 🚀 Roadmap

### Version 1.1 (Planned)
- [ ] Export attendance to PDF/Excel
- [ ] Advanced filtering and search
- [ ] Bulk operations for managers
- [ ] Email notifications
- [ ] Push notifications
- [ ] Offline mode (PWA)

### Version 2.0 (Future)
- [ ] Shift scheduling
- [ ] Leave management
- [ ] Overtime tracking
- [ ] Payroll integration
- [ ] QR code check-in
- [ ] Facial recognition
- [ ] Mobile app (React Native)
- [ ] Team chat
- [ ] Task management
- [ ] Performance reviews

---

**Built with ❤️ by [Abdou](https://github.com/abdouthematrix)**

**Star ⭐ this repo if you find it useful!**