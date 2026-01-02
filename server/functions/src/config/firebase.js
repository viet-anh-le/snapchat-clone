const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");

if (!admin.apps.length) {
  try {
    const serviceAccount =
      process.env.GOOGLE_APPLICATION_CREDENTIALS || "./firebase-admin.json";
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: "snapchat-378cb.firebasestorage.app",
    });
  } catch (error) {
    console.warn("Firebase Admin may already be initialized:", error.message);
  }
}

const db = admin.firestore();

module.exports = { db, FieldValue, admin };
