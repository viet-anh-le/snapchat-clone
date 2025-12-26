import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getStorage } from "firebase/storage";
// Realtime Database no longer used - using WebSocket instead
// import { getDatabase } from "firebase/database";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

// Cấu hình Firebase
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE || "",
};

// Check if Firebase config is valid
const isFirebaseConfigured =
  firebaseConfig.projectId &&
  firebaseConfig.apiKey &&
  firebaseConfig.authDomain;

let app, db, rtdb, auth, googleProvider, storage, functions;

if (!isFirebaseConfigured) {
  console.warn(
    "⚠️ Firebase is not configured. Please set up .env file with Firebase credentials."
  );
  console.warn(
    "📝 Copy .env.example to .env and fill in your Firebase project details."
  );
  // Create dummy exports for development
  auth = null;
  googleProvider = null;
  db = null;
  storage = null;
  rtdb = null;
  functions = null;
} else {
  try {
    // Khởi tạo Firebase
    app = initializeApp(firebaseConfig);

    // Khởi tạo Firestore
    db = getFirestore(app);

    // Realtime Database no longer used - using WebSocket instead
    // rtdb = getDatabase(app);
    rtdb = null;

    // Khởi tạo Auth
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    storage = getStorage(app);

    functions = getFunctions(app);

    if (window.location.hostname === "localhost") {
      connectFunctionsEmulator(functions, "127.0.0.1", 5001);
      // connectFirestoreEmulator(db, "127.0.0.1", 8080);
    }

    // Analytics (chỉ chạy khi môi trường hỗ trợ)
    isSupported().then((supported) => {
      if (supported) {
        getAnalytics(app);
      }
    });

  } catch (error) {
    console.error("❌ Error initializing Firebase:", error);
    auth = null;
    googleProvider = null;
    db = null;
    storage = null;
    rtdb = null;
    functions = null;
  }
}

export { auth, googleProvider, db, storage, rtdb, functions };
