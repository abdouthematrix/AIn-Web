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
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
}

export { app, auth, db };