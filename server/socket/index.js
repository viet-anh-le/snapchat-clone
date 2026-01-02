const authMiddleware = require("./middleware");
const { activeRooms, userSockets, onlineUsers } = require("./store");
const { db, FieldValue } = require("../functions/src/config/firebase");

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

    onlineUsers.set(userId, {
      socketId: socket.id,
      lastActive: Date.now(),
    });

    socket.on("req-online-users", () => {
      const activeUsersList = Array.from(onlineUsers.keys()).map((uid) => ({
        userId: uid,
        isOnline: true,
        lastActive: onlineUsers.get(uid).lastActive,
      }));

      socket.emit("get-users", activeUsersList);
    });

    await db
      .collection("users")
      .doc(userId)
      .set(
        {
          isOnline: true,
          lastLogin: FieldValue.serverTimestamp(),
        },
        { merge: true }
      )
      .catch((e) => console.error("Error update online:", e));

    // Join user's personal room for notifications
    socket.join(`user:${userId}`);

    registerUserHandlers(io, socket, userSockets, activeRooms, onlineUsers);
    registerChatHandlers(io, socket);
    registerCallHandlers(io, socket, activeRooms);
    registerWebRTCHandlers(io, socket, userSockets);
  });
};
