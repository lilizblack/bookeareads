import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Check for runtime env vars (Docker/Cloud Run) or build-time vars (Vite/Dev)
const env = window.env || {};

const firebaseConfig = {
    apiKey: env.VITE_FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: env.VITE_FIREBASE_APP_ID || import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase defensively: with a missing/invalid config, getAuth()
// throws at module load, which would white-screen the entire app. Exporting
// null services instead lets AuthContext's `if (!auth)` guards kick in and
// the app degrade gracefully to guest (localStorage) mode.
let app = null;
let auth = null;
let googleProvider = null;
let db = null;
let storage = null;

if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.warn('Missing Firebase configuration. Check .env file. Running in guest mode.');
} else {
    try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        googleProvider = new GoogleAuthProvider();
        db = getFirestore(app);
        storage = getStorage(app);
    } catch (error) {
        console.error('Firebase initialization failed. Running in guest mode.', error);
        app = auth = googleProvider = db = storage = null;
    }
}

export { auth, googleProvider, db, storage };

// Export app for other uses
export default app;
