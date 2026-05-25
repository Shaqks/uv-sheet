import { initializeApp } from 'firebase/app';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// TODO: Replace with your actual Firebase project config
// Since this is a template/world-class starting point, we provide placeholders
// To test locally without setting up Firebase, we'd normally use an emulator,
// but for the sake of this prompt, we assume the user will inject their config.
// IMPORTANT: The user MUST provide their own Firebase config here for the app to function.
const firebaseConfig = {
  apiKey: "AIzaSyDJsJVO0hf4f4i4Q8SWLTVCX6O3WKn-_BY",
  authDomain: "uv-sheet-shaqks-2026.firebaseapp.com",
  projectId: "uv-sheet-shaqks-2026",
  storageBucket: "uv-sheet-shaqks-2026.firebasestorage.app",
  messagingSenderId: "441256581199",
  appId: "1:441256581199:web:f6b683863fb3d96fd0723a"
};

// Initialize Firebase
let app = null;
let db = null;
let auth = null;

try {
  if (firebaseConfig.apiKey === "AIzaSy_YOUR_API_KEY") {
    console.warn("Using dummy Firebase config. Running in local fallback mode.");
  } else {
    app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);

    // Enable offline persistence for geographic reliability
    enableIndexedDbPersistence(db)
      .catch((err) => {
        if (err.code == 'failed-precondition') {
          console.warn('Firebase persistence failed: Multiple tabs open');
        } else if (err.code == 'unimplemented') {
          console.warn('Firebase persistence failed: Browser not supported');
        }
      });
  }
} catch (error) {
  console.error("Firebase initialization error. Did you add your config?", error);
  // We don't crash here so the UI can at least render and show an error toast later
}

export { app, db, auth };
