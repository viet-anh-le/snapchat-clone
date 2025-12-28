module.exports = (io, socket, userSockets) => {
  const userId = socket.userId;
  // WebRTC Offer
  socket.on("webrtc-offer", (data) => {
    const { offer, targetUserId, roomId } = data;
    // Forward offer to target user
    const targetSockets = userSockets.get(targetUserId);
    if (targetSockets) {
      targetSockets.forEach((sid) => {
        io.to(sid).emit("webrtc-offer", {
          offer,
          fromUserId: userId,
          roomId,
        });
      });
    }
  });

  // WebRTC Answer
  socket.on("webrtc-answer", (data) => {
    const { answer, targetUserId, roomId } = data;
    // Forward answer to target user
    const targetSockets = userSockets.get(targetUserId);
    if (targetSockets) {
      targetSockets.forEach((sid) => {
        io.to(sid).emit("webrtc-answer", {
          answer,
          fromUserId: userId,
          roomId,
        });
      });
    }
  });

  // ICE Candidate
  socket.on("webrtc-ice-candidate", (data) => {
    const { candidate, targetUserId, roomId } = data;

    // Forward ICE candidate to target user
    const targetSockets = userSockets.get(targetUserId);
    if (targetSockets) {
      targetSockets.forEach((sid) => {
        io.to(sid).emit("webrtc-ice-candidate", {
          candidate,
          fromUserId: userId,
          roomId,
        });
      });
    }
  });

  // Update media preferences (audio/video toggle)
  socket.on("update-media-preference", (data) => {
    const { roomId, preference } = data;
    socket.to(`video-room:${roomId}`).emit("media-preference-updated", {
      userId,
      preference,
    });
  });
};
