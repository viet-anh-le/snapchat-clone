const functions = require("firebase-functions");
const express = require("express");
const cors = require("cors");
const { validateFirebaseIdToken } = require("./src/middleware/auth.middleware");

const app = express();
const route = require("./src/routes/index.route");

app.use(cors({ origin: true }));
app.use(validateFirebaseIdToken);

route(app);

// Export as Firebase Function (for deployment if needed)
exports.api = functions.https.onRequest(app);
