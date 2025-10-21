// Firebase Configuration and Initialization
const firebaseConfig = {
    apiKey: "AIzaSyANe2cgqBpm3lH8FdNa0Z27smMrOp9Wegk",
    authDomain: "ain-web.firebaseapp.com",
    projectId: "ain-web",
    storageBucket: "ain-web.firebasestorage.app",
    messagingSenderId: "463242204215",
    appId: "1:463242204215:web:723c2ead0c72ac660a5bb2"
};

// Initialize Firebase
let app;
let auth;
let db;

try {
    app = firebase.initializeApp(firebaseConfig);
    auth = firebase.auth();
    db = firebase.firestore();
    if (location.hostname === "localhost") {
        db.useEmulator("127.0.0.1", 8080);
        auth.useEmulator("http://127.0.0.1:9099");
    }
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
}

export { app, auth, db };