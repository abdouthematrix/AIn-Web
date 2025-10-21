// Firebase Configuration and Initialization
const firebaseConfig = {
    apiKey: "AIzaSyANe2cgqBpm3lH8FdNa0Z27smMrOp9Wegk",
    authDomain: "ain-web.firebaseapp.com",
    projectId: "ain-web",
    storageBucket: "ain-web.firebasestorage.app",
    messagingSenderId: "463242204215",
    appId: "1:463242204215:web:723c2ead0c72ac660a5bb2"
};

// Initialize Firebase (loaded via CDN in index.html)
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Export for use in other modules
export { auth, db };