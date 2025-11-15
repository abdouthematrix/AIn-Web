// Firebase Configuration and Initialization
const firebaseConfig = {
    apiKey: "AIzaSyAGcTL2ZiTmmpdpEAtcBG_yt28kZMTdJks",
    authDomain: "a-in-app.firebaseapp.com",
    projectId: "a-in-app",
    storageBucket: "a-in-app.firebasestorage.app",
    messagingSenderId: "1024747716547",
    appId: "1:1024747716547:web:3e859290d69f6d4c594776"
};



// Initialize Firebase
let app;
let auth;
let db;

try {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    //if (location.hostname === "localhost") {
    //    db.useEmulator("127.0.0.1", 8080);
    //    auth.useEmulator("http://127.0.0.1:9099");
    //}

    // Enable auth persistence (always local for static sites)
    auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL)
        .catch((err) => {
            console.warn('Auth persistence failed:', err);
        });

    // Enable Firestore offline persistence with multi-tab support
    db.enablePersistence({ synchronizeTabs: true })
        .then(() => {
            console.log('✓ Offline persistence enabled with multi-tab support');
        })
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                // Multiple tabs open, but synchronizeTabs should handle this
                console.warn('⚠ Persistence failed: Multiple tabs detected');
            } else if (err.code === 'unimplemented') {
                // Browser doesn't support persistence (unlikely in modern browsers)
                console.warn('⚠ Persistence not available in this browser');
            } else {
                console.error('Persistence error:', err);
            }
        });

    console.log('✓ Firebase initialized successfully');
} catch (error) {
    console.error('❌ Firebase initialization error:', error);
}

export { app, auth, db };