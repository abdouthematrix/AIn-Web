# A-In (عين) - Attendance & Workforce Management System

## 🎯 Project Overview

A-In is a bilingual (English/Arabic) attendance and workforce management system built with vanilla JavaScript, Firebase, and designed for static deployment.

## 📦 Tech Stack

- **Frontend**: HTML5, Vanilla CSS, ES6 Modules
- **Backend**: Firebase (Authentication, Firestore, Storage)
- **Deployment**: Static hosting (GitHub Pages, Netlify, Vercel)
- **Architecture**: Single Page Application (SPA) with hash routing

## 🏗️ Project Structure

```
a-in/
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── app.js                    # Main application entry
│   ├── config.js                 # Firebase configuration
│   ├── services/
│   │   ├── auth.js              # Authentication service
│   │   ├── user.js              # User management
│   │   ├── company.js           # Company management
│   │   └── attendance.js        # Attendance operations
│   ├── utils/
│   │   ├── router.js            # SPA router
│   │   ├── i18n.js              # Internationalization
│   │   └── helpers.js           # Utility functions
│   └── components/
│       ├── login.js             # Login page
│       ├── signup.js            # Signup page
│       ├── dashboard.js         # Dashboard
│       ├── attendance-check.js  # Check-in/out page
│       ├── company-setup.js     # Company creation
│       ├── employee-list.js     # Employee management
│       ├── attendance-history.js # History view
│       └── profile.js           # User profile
├── locales/
│   ├── en.json                  # English translations
│   └── ar.json                  # Arabic translations
└── firestore.rules              # Security rules
```

## 🚀 Setup Instructions

### 1. Firebase Setup

1. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
2. Enable Authentication (Email/Password)
3. Create a Firestore database
4. Enable Firebase Storage
5. Copy your Firebase config

### 2. Configuration

Update `js/config.js` with your Firebase credentials:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### 3. Deploy Firestore Rules

Copy the content from `firestore.rules` and paste it in Firebase Console → Firestore → Rules

### 4. Local Development

```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server -p 8000

# Using PHP
php -S localhost:8000
```

Visit `http://localhost:8000`

### 5. Static Deployment

#### GitHub Pages
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin YOUR_REPO_URL
git push -u origin main
```

Then enable GitHub Pages in repository settings.

#### Netlify
```bash
# Install Netlify CLI
npm install -g netlify-cli

# Deploy
netlify deploy --prod
```

## 📊 Data Structure

### Firestore Collections

```
/users/{uid}
  - email: string
  - displayName: string
  - companyIds: array
  - status: "active" | "inactive"
  - createdAt: timestamp

/companies/{companyId}
  - name: string
  - ownerUid: string
  - createdAt: timestamp
  - settings: object

/companies/{companyId}/managers/{uid}
  - userId: string
  - status: "pending" | "approved"
  - addedAt: timestamp

/companies/{companyId}/employees/{uid}
  - userId: string
  - status: "pending" | "approved"
  - addedAt: timestamp

/companies/{companyId}/attendance/{attendanceId}
  - userId: string
  - date: string (YYYY-MM-DD)
  - checkIn: timestamp
  - checkOut: timestamp | null
  - gps: { lat: number, lng: number }
  - selfieUrl: string | null
  - biometricConfirmed: boolean
  - status: "pending" | "approved" | "rejected"
```

## 🔐 Security Rules Summary

- **Users**: Can only read/write their own document
- **Companies**: Owners have full control
- **Managers**: Can manage employees and view all attendance
- **Employees**: Can manage only their own attendance
- **Access Control**: Role-based with membership validation

## 🎨 Key Features

### 1. Authentication
- Email/password signup and login
- Password reset functionality
- Auto-redirect based on auth state

### 2. Company Management
- Create companies (becomes owner)
- Invite managers and employees
- Multi-company support per user

### 3. Attendance System
- GPS-based check-in/check-out
- Optional selfie verification
- Real-time location tracking
- Attendance history and statistics

### 4. Role-Based Access
- **Owner**: Full company management
- **Manager**: Employee management, view all attendance
- **Employee**: Personal attendance only

### 5. Bilingual Support
- English and Arabic
- RTL support for Arabic
- Dynamic language switching

## 🧭 User Flows

### Owner Flow
1. Sign up → Create company
2. Add managers/employees by email
3. View all attendance records
4. Approve/reject attendance

### Manager Flow
1. Sign up → Receive invitation
2. Accept invitation
3. Add employees
4. View and manage team attendance

### Employee Flow
1. Sign up → Receive invitation
2. Accept invitation
3. Check-in/out with GPS
4. View personal attendance history

## 🛠️ API Services

### AuthService
```javascript
// Sign up
await AuthService.signUp(email, password, displayName);

// Sign in
await AuthService.signIn(email, password);

// Sign out
await AuthService.signOut();

// Get user role
const role = await AuthService.getUserRole(companyId);

// Check access
const hasAccess = await AuthService.hasCompanyAccess(companyId);
```

### CompanyService
```javascript
// Create company
const companyId = await CompanyService.createCompany(ownerUid, {
  name: "Company Name",
  settings: {}
});

// Add employee
await CompanyService.addEmployee(companyId, userId);

// Invite by email
await CompanyService.inviteUserByEmail(companyId, email, 'employee');
```

### AttendanceService
```javascript
// Check in
await AttendanceService.checkIn(companyId, userId, gpsCoords, selfieBlob);

// Check out
await AttendanceService.checkOut(companyId, userId, gpsCoords);

// Get history
const history = await AttendanceService.getUserAttendanceHistory(
  companyId, userId, startDate, endDate
);

// Get statistics
const stats = await AttendanceService.getAttendanceStats(
  companyId, userId, month, year
);
```

## 🎨 Customization

### Styling
All styles are in `css/style.css`. Key CSS variables:

```css
:root {
  --primary-color: #4f46e5;
  --secondary-color: #64748b;
  --success-color: #10b981;
  --danger-color: #ef4444;
  --warning-color: #f59e0b;
}
```

### Translations
Add/modify translations in `locales/en.json` and `locales/ar.json`

### Routes
Add new routes in `js/app.js`:

```javascript
this.router.register('/new-page', renderNewPage, {
  requireAuth: true,
  roles: ['owner', 'manager'],
  title: 'New Page'
});
```

## 🐛 Troubleshooting

### Firebase Connection Issues
- Check Firebase config in `js/config.js`
- Verify Firebase project is active
- Check browser console for errors

### Authentication Issues
- Ensure Email/Password is enabled in Firebase Console
- Check Firestore rules are deployed
- Verify user document is created after signup

### Location Services
- Grant location permission in browser
- Use HTTPS for production (required for geolocation)
- Check browser compatibility

### RTL Issues
- Verify `dir` attribute is set correctly
- Check CSS `[dir="rtl"]` selectors
- Test language switch functionality

## 📱 Browser Compatibility

- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅
- Mobile browsers (iOS Safari, Chrome Mobile) ✅

## 🔒 Security Best Practices

### Firestore Rules
- Never allow public write access
- Always validate user ownership
- Use security rules for role validation
- Test rules in Firebase Console simulator

### Authentication
- Use strong password requirements
- Implement password reset flow
- Never store passwords in code
- Use HTTPS in production

### Data Privacy
- Store minimal user data
- Encrypt sensitive information
- Comply with GDPR/local laws
- Allow users to delete their data

## 🚀 Performance Optimization

### Bundle Size
- No external dependencies (except Firebase)
- Minimal CSS (~15KB)
- Modular JavaScript loading

### Firestore Optimization
- Use indexed queries
- Implement pagination for large datasets
- Cache frequently accessed data
- Use compound queries efficiently

### Image Optimization
- Compress selfies before upload
- Use WebP format when possible
- Implement lazy loading
- Set maximum file sizes

## 📊 Analytics & Monitoring

### Recommended Tools
- Firebase Analytics
- Google Analytics
- Sentry for error tracking
- Firebase Performance Monitoring

### Key Metrics to Track
- Daily active users
- Average check-in time
- Attendance completion rate
- User retention
- Error rates

## 🧪 Testing

### Manual Testing Checklist
- [ ] Sign up new user
- [ ] Create company
- [ ] Invite employee/manager
- [ ] Accept invitation
- [ ] Check-in with GPS
- [ ] Check-out
- [ ] View attendance history
- [ ] Switch language
- [ ] Switch company
- [ ] Test on mobile

### Security Testing
- [ ] Test Firestore rules
- [ ] Verify role-based access
- [ ] Check data isolation
- [ ] Test authentication flows

## 🎯 Future Enhancements

### Phase 2 Features
- [ ] Push notifications
- [ ] Shift scheduling
- [ ] Leave management
- [ ] Overtime tracking
- [ ] Reports and exports (PDF/Excel)

### Phase 3 Features
- [ ] Facial recognition
- [ ] QR code check-in
- [ ] Geofencing
- [ ] Mobile app (React Native)
- [ ] Payroll integration

### Technical Improvements
- [ ] Service Worker for offline support
- [ ] Progressive Web App (PWA)
- [ ] Advanced caching strategies
- [ ] WebSocket for real-time updates
- [ ] CI/CD pipeline

## 📖 API Documentation

### Router API

```javascript
// Register route
router.register(path, handler, options);

// Navigate to route
router.navigate('/dashboard');

// Get current path
const path = router.getCurrentPath();

// Get query parameters
const params = router.getQueryParams();
```

### I18n API

```javascript
// Switch language
await i18n.switchLanguage('ar');

// Get translation
const text = i18n.t('key', { param: 'value' });

// Get current language
const lang = i18n.getCurrentLang();

// Check if RTL
const isRTL = i18n.isRTL();
```

### Helper Functions

```javascript
// Format date
formatDate(date, locale);

// Format time
formatTime(date, locale);

// Show toast notification
showToast(message, type, duration);

// Show confirmation dialog
showConfirm(message, onConfirm, onCancel);

// Calculate distance
calculateDistance(lat1, lng1, lat2, lng2);

// Validate email
isValidEmail(email);
```

## 🤝 Contributing

### Code Style
- Use ES6+ features
- Follow consistent naming conventions
- Add comments for complex logic
- Keep functions small and focused

### Commit Messages
```
feat: add new feature
fix: fix bug
docs: update documentation
style: formatting changes
refactor: code refactoring
test: add tests
chore: maintenance tasks
```

### Pull Request Process
1. Fork the repository
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit pull request

## 📄 License

This project is provided as-is for educational and commercial use.

## 🆘 Support

### Common Issues

**Q: Check-in not working?**
A: Enable location services in browser and ensure HTTPS in production.

**Q: Can't see employees?**
A: Check Firestore rules and verify role permissions.

**Q: Language not switching?**
A: Clear browser cache and check locale files exist.

**Q: Images not uploading?**
A: Verify Firebase Storage is enabled and rules allow uploads.

### Contact

For issues and questions:
- Create GitHub issue
- Check Firebase Console logs
- Review browser console errors
- Test Firestore rules in simulator

## 🎓 Learning Resources

### Firebase
- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase Authentication](https://firebase.google.com/docs/auth)

### JavaScript
- [MDN Web Docs](https://developer.mozilla.org/)
- [ES6 Modules](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
- [Geolocation API](https://developer.mozilla.org/en-US/docs/Web/API/Geolocation_API)

### CSS
- [CSS Grid](https://css-tricks.com/snippets/css/complete-guide-grid/)
- [CSS Flexbox](https://css-tricks.com/snippets/css/a-guide-to-flexbox/)
- [RTL CSS](https://rtlstyling.com/)

## 🎉 Credits

Built with ❤️ for modern workforce management.

**Technologies Used:**
- Firebase (Backend as a Service)
- Vanilla JavaScript (No frameworks)
- CSS Grid & Flexbox (Modern layouts)
- HTML5 APIs (Geolocation, Camera)

## 📝 Changelog

### Version 1.0.0 (Initial Release)
- ✅ User authentication
- ✅ Company management
- ✅ Employee/Manager roles
- ✅ GPS-based attendance
- ✅ Selfie verification
- ✅ Attendance history
- ✅ Bilingual support (EN/AR)
- ✅ Responsive design
- ✅ Static deployment ready

---

## 🚀 Quick Start Commands

```bash
# Clone repository
git clone YOUR_REPO_URL
cd a-in

# Configure Firebase
# Edit js/config.js with your credentials

# Run locally
python -m http.server 8000
# or
npx http-server -p 8000

# Deploy to Firebase Hosting
firebase init hosting
firebase deploy

# Deploy to Netlify
netlify deploy --prod

# Deploy to GitHub Pages
git push origin main
# Enable Pages in repo settings
```

## 📋 Deployment Checklist

Before deploying to production:

- [ ] Update Firebase config in `js/config.js`
- [ ] Deploy Firestore security rules
- [ ] Enable Firebase Authentication
- [ ] Configure Firebase Storage
- [ ] Test all user flows
- [ ] Test on mobile devices
- [ ] Enable HTTPS
- [ ] Set up error monitoring
- [ ] Configure analytics
- [ ] Test language switching
- [ ] Verify Firestore indexes
- [ ] Set up backup strategy
- [ ] Document admin credentials
- [ ] Configure rate limiting
- [ ] Test payment integration (if applicable)

---

**Happy Building! 🎊**

Need help? Create an issue or check the documentation above.