# 🚀 A-In Deployment Guide

Complete step-by-step guide to deploy A-In (عين) to production.

## 📋 Prerequisites

- Firebase account (free tier works)
- Git installed
- Code editor (VS Code recommended)
- Modern web browser

---

## Step 1: Firebase Project Setup

### 1.1 Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project"
3. Enter project name: `a-in-attendance`
4. Disable Google Analytics (optional)
5. Click "Create project"

### 1.2 Enable Authentication

1. In Firebase Console, go to **Authentication**
2. Click "Get started"
3. Click "Email/Password" provider
4. Enable **Email/Password**
5. Click "Save"

### 1.3 Create Firestore Database

1. Go to **Firestore Database**
2. Click "Create database"
3. Choose **Start in production mode**
4. Select location (closest to users)
5. Click "Enable"

### 1.4 Enable Storage

1. Go to **Storage**
2. Click "Get started"
3. Click "Next" (keep default rules)
4. Select location (same as Firestore)
5. Click "Done"

### 1.5 Get Firebase Config

1. Go to **Project Settings** (gear icon)
2. Scroll to "Your apps"
3. Click **Web** icon (`</>`)
4. Register app: `A-In Web`
5. Copy the `firebaseConfig` object
6. Click "Continue to console"

---

## Step 2: Configure Your Project

### 2.1 Update Firebase Config

Edit `js/config.js` and replace with your config:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
};
```

### 2.2 Deploy Firestore Rules

1. In Firebase Console, go to **Firestore Database**
2. Click **Rules** tab
3. Copy content from `firestore.rules`
4. Paste and click **Publish**

### 2.3 Deploy Storage Rules

1. Go to **Storage**
2. Click **Rules** tab
3. Replace with:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /attendance-selfies/{companyId}/{userId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                     request.auth.uid == userId &&
                     request.resource.size < 5 * 1024 * 1024 && // 5MB max
                     request.resource.contentType.matches('image/.*');
    }
  }
}
```

4. Click **Publish**

---

## Step 3: Test Locally

### 3.1 Start Local Server

```bash
# Navigate to project folder
cd a-in

# Start server (choose one)
python -m http.server 8000
# or
npx http-server -p 8000
# or
php -S localhost:8000
```

### 3.2 Test Application

1. Open browser to `http://localhost:8000`
2. Test signup flow
3. Create a company
4. Test check-in with location
5. Test language switching
6. Check browser console for errors

---

## Step 4: Deploy to Production

Choose one deployment method:

### Option A: Firebase Hosting (Recommended)

#### 4.1 Install Firebase CLI

```bash
npm install -g firebase-tools
```

#### 4.2 Login to Firebase

```bash
firebase login
```

#### 4.3 Initialize Firebase Hosting

```bash
cd a-in
firebase init hosting
```

Select:
- Use existing project → Choose your project
- Public directory: `.` (current directory)
- Single-page app: **Yes**
- GitHub Actions: **No**

#### 4.4 Deploy

```bash
firebase deploy --only hosting
```

Your app will be live at: `https://your-project.firebaseapp.com`

---

### Option B: GitHub Pages

#### 4.1 Create GitHub Repository

1. Go to [GitHub](https://github.com)
2. Click "New repository"
3. Name: `a-in-attendance`
4. Public/Private: Choose
5. Click "Create repository"

#### 4.2 Push Code

```bash
cd a-in
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/a-in-attendance.git
git push -u origin main
```

#### 4.3 Enable GitHub Pages

1. Go to repository **Settings**
2. Click **Pages** (left sidebar)
3. Source: Deploy from branch
4. Branch: `main`, Folder: `/ (root)`
5. Click **Save**

Your app will be live at: `https://YOUR_USERNAME.github.io/a-in-attendance/`

---

### Option C: Netlify

#### 4.1 Install Netlify CLI

```bash
npm install -g netlify-cli
```

#### 4.2 Deploy

```bash
cd a-in
netlify deploy
```

Follow prompts:
- Create & configure new site: **Yes**
- Team: Choose your team
- Site name: `a-in-attendance`
- Publish directory: `.` (press Enter)

#### 4.3 Deploy to Production

```bash
netlify deploy --prod
```

Your app will be live at: `https://a-in-attendance.netlify.app`

---

### Option D: Vercel

#### 4.1 Install Vercel CLI

```bash
npm install -g vercel
```

#### 4.2 Deploy

```bash
cd a-in
vercel
```

Follow prompts and your app will be live!

---

## Step 5: Post-Deployment Configuration

### 5.1 Update Firebase Authorized Domains

1. Go to **Authentication** → **Settings** → **Authorized domains**
2. Add your deployment domain:
   - `your-project.firebaseapp.com` (Firebase)
   - `YOUR_USERNAME.github.io` (GitHub Pages)
   - `a-in-attendance.netlify.app` (Netlify)
   - `a-in-attendance.vercel.app` (Vercel)

### 5.2 Configure CORS for Storage

1. Create `cors.json`:

```json
[
  {
    "origin": ["https://your-domain.com"],
    "method": ["GET", "POST", "PUT"],
    "maxAgeSeconds": 3600
  }
]
```

2. Apply CORS:

```bash
gsutil cors set cors.json gs://your-project.appspot.com
```

### 5.3 Set Up Custom Domain (Optional)

#### For Firebase Hosting:

```bash
firebase hosting:channel:deploy custom-domain
```

#### For GitHub Pages:

1. Go to repository **Settings** → **Pages**
2. Add custom domain
3. Add DNS records:
   - `A` record: `185.199.108.153`
   - `CNAME`: `YOUR_USERNAME.github.io`

---

## Step 6: Security Hardening

### 6.1 Enable App Check (Recommended)

1. Go to **App Check** in Firebase Console
2. Click "Get started"
3. Enable reCAPTCHA v3
4. Register your domain
5. Add to `index.html`:

```html
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-app-check-compat.js"></script>
```

Add to `js/config.js`:

```javascript
const appCheck = firebase.appCheck();
appCheck.activate('YOUR_RECAPTCHA_SITE_KEY', true);
```

### 6.2 Set Rate Limits

In Firestore rules, add:

```javascript
function rateLimited() {
  return request.time > resource.data.lastUpdate + duration.value(1, 's');
}
```

### 6.3 Enable Security Monitoring

1. Enable **Firebase Performance Monitoring**
2. Enable **Crashlytics** (for mobile apps)
3. Set up error tracking (Sentry recommended)

---

## Step 7: Monitoring & Analytics

### 7.1 Enable Firebase Analytics

1. Go to **Analytics** in Firebase Console
2. Click "Enable Google Analytics"
3. Select or create GA4 property

### 7.2 Add Analytics to Code

```javascript
// Add to js/config.js
firebase.analytics();
```

### 7.3 Set Up Performance Monitoring

```html
<!-- Add to index.html -->
<script src="https://www.gstatic.com/firebasejs/9.22.0/firebase-performance-compat.js"></script>
```

```javascript
// Add to js/config.js
const perf = firebase.performance();
```

---

## Step 8: Testing Production

### 8.1 Test Checklist

- [ ] Sign up new user
- [ ] Email verification works
- [ ] Login with credentials
- [ ] Create company
- [ ] Invite employee by email
- [ ] Accept invitation
- [ ] Check-in with GPS (allow location)
- [ ] Take selfie (allow camera)
- [ ] Check-out
- [ ] View attendance history
- [ ] Switch language (EN ↔ AR)
- [ ] Test on mobile device
- [ ] Test RTL layout (Arabic)
- [ ] Logout and login again

### 8.2 Performance Testing

1. Open Chrome DevTools
2. Go to **Lighthouse** tab
3. Run audit
4. Aim for scores:
   - Performance: 90+
   - Accessibility: 95+
   - Best Practices: 90+
   - SEO: 90+

---

## Step 9: Maintenance

### 9.1 Regular Backups

Set up automatic Firestore backups:

```bash
firebase firestore:backups:schedules:create
```

### 9.2 Monitor Usage

Check Firebase Console daily/weekly:
- **Authentication** → Active users
- **Firestore** → Read/Write counts
- **Storage** → Storage used
- **Hosting** → Bandwidth

### 9.3 Update Dependencies

Check for Firebase SDK updates monthly:

```html
<!-- Update version numbers -->
<script src="https://www.gstatic.com/firebasejs/10.x.x/firebase-app-compat.js"></script>
```

---

## 🆘 Troubleshooting

### Issue: "Permission denied" on Firestore

**Solution**: Check and republish Firestore rules

### Issue: Location not working

**Solution**: 
- Ensure HTTPS in production
- Check browser location permissions
- Verify domain in Firebase authorized domains

### Issue: Images not uploading

**Solution**:
- Check Storage rules
- Verify CORS configuration
- Check file size (<5MB)

### Issue: Language not switching

**Solution**:
- Check locale files exist at `/locales/`
- Clear browser cache
- Check browser console for 404 errors

---

## 📞 Support

If you encounter issues:

1. Check browser console for errors
2. Check Firebase Console logs
3. Test Firestore rules in simulator
4. Review this deployment guide
5. Create GitHub issue with details

---

## 🎉 Success!

Your A-In attendance system is now live! 

**Next Steps:**
- Share the URL with your team
- Create your first company
- Invite employees
- Start tracking attendance

**Production URL Examples:**
- Firebase: `https://a-in-attendance.firebaseapp.com`
- GitHub Pages: `https://yourusername.github.io/a-in-attendance/`
- Netlify: `https://a-in-attendance.netlify.app`
- Vercel: `https://a-in-attendance.vercel.app`

---

**Need help? Check the main README.md for detailed documentation.**