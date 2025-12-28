const { admin } = require("../functions/src/config/firebase");

const authMiddleWare = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("Authentication error: No token provided"));
    }

    const decodedToken = await admin.auth().verifyIdToken(token);
    socket.userId = decodedToken.uid;
    socket.user = decodedToken;

    next();
  } catch (error) {
    console.error("Socket authentication error:", error);
    next(new Error("Authentication error"));
  }
};

module.exports = authMiddleWare;
