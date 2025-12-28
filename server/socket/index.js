const authMiddleware = require("./middleware");
const { activeRooms, userSockets } = require("./store");
const { db } = require("../functions/src/config/firebase");

const registerUserHandlers = require("./handlers/userHandler");
const registerChatHandlers = require("./handlers/chatHandler");
const registerCallHandlers = require("./handlers/callHandler");
const registerWebRTCHandlers = require("./handlers/webrtcHandler");

module.exports = (io) => {
  io.use(authMiddleware);

  io.on("connection", async (socket) => {
    const userId = socket.userId;
    console.log(`User connected: ${userId} (socket: ${socket.id})`);

    // Track user socket
    if (!userSockets.has(userId)) {
      userSockets.set(userId, new Set());
    }
    userSockets.get(userId).add(socket.id);

    socket.broadcast.emit("user-status", {
      userId,
      isOnline: true,
    });

    db.collection("users")
      .doc(userId)
      .update({
        isOnline: true,
      })
      .catch((e) => console.error("Error update online:", e));

    // Join user's personal room for notifications
    socket.join(`user:${userId}`);

    registerUserHandlers(io, socket, userSockets, activeRooms);
    registerChatHandlers(io, socket);
    registerCallHandlers(io, socket, activeRooms);
    registerWebRTCHandlers(io, socket, userSockets);
  });
};
