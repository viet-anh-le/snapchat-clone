const { db } = require("../../functions/src/config/firebase");

module.exports = (io, socket, userSockets, activeRooms) => {
  const userId = socket.userId;
  // User bắt đầu gõ
  socket.on("typing", (data) => {
    const { chatId } = data;
    socket.to(`chat:${chatId}`).emit("user-typing", {
      userId: socket.userId,
      chatId,
    });
  });

  // User ngừng gõ
  socket.on("stop-typing", (data) => {
    const { chatId } = data;
    socket.to(`chat:${chatId}`).emit("user-stop-typing", {
      userId: socket.userId,
      chatId,
    });
  });

  // Disconnect handler
  socket.on("disconnect", async () => {
    // Remove from user sockets
    if (userSockets.has(userId)) {
      userSockets.get(userId).delete(socket.id);
      if (userSockets.get(userId).size === 0) {
        userSockets.delete(userId);
      }
    }

    const lastActive = Date.now();
    socket.broadcast.emit("user-status", {
      userId,
      isOnline: false,
      lastActive,
    });

    await db
      .collection("users")
      .doc(userId)
      .update({
        isOnline: false,
        lastActive: lastActive,
      })
      .catch((e) => console.error("Error update offline:", e));

    // Remove from active rooms
    activeRooms.forEach((sockets, roomId) => {
      if (sockets.has(socket.id)) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          activeRooms.delete(roomId);
        } else {
          // Notify others
          io.to(`video-room:${roomId}`).emit("user-left", {
            userId,
            socketId: socket.id,
          });
        }
      }
    });
  });
};
