const admin = require("firebase-admin");
const { FieldValue } = require("firebase-admin/firestore");

if (!admin.apps.length) {
  try {
    const serviceAccount = require("../../../firebase-admin.json");
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.warn("Firebase Admin may already be initialized:", error.message);
  }
}

const db = admin.firestore();

module.exports = { db, FieldValue, admin };
