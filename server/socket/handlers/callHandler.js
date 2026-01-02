const crypto = require("crypto");
const { db, FieldValue } = require("../../functions/src/config/firebase");
const {
  updateLastMessageBackground,
} = require("../../functions/src/helpers/updateLastMessage");

module.exports = (io, socket, activeRooms) => {
  const userId = socket.userId;
  // Handle incoming call notification
  socket.on("incoming-call", (data) => {
    const { targetUserId, roomId, members } = data;

    console.log(`[SERVER] Received incoming-call event`);
    console.log(`[SERVER] Call data:`, data);

    let recipients = [];

    if (members && Array.isArray(members) && members.length > 0) {
      recipients = members;
      console.log(
        `[SERVER] Group Call Detected. Ringing ${recipients.length} members:`,
        recipients
      );
    } else if (targetUserId) {
      recipients = [targetUserId];
      console.log(
        `[SERVER] Private Call Detected. Ringing target: ${targetUserId}`
      );
    } else {
      console.warn(
        "[SERVER] Invalid call data: No targetUserId and no members provided."
      );
      return;
    }

    recipients.forEach((recipientId) => {
      if (recipientId === socket.userId) return;

      const roomName = `user:${recipientId}`;

      const room = io.sockets.adapter.rooms.get(roomName);
      const isOnline = room && room.size > 0;

      console.log(
        `[SERVER] Emitting to ${recipientId} (${
          isOnline ? "Online" : "Offline"
        })`
      );

      io.to(roomName).emit("incoming-call", {
        ...data,
        targetUserId: recipientId,
      });
    });

    console.log(`[SERVER] Call distribution completed.`);
  });

  // Join video call room
  socket.on("join-video-room", async (payload, legacyProfile) => {
    // Support both: emit("join-video-room", roomId) and emit("join-video-room", {roomId, profile})
    const isStringPayload = typeof payload === "string";
    const roomId = isStringPayload ? payload : payload?.roomId;
    const profile =
      (!isStringPayload && payload?.profile) ||
      (legacyProfile && typeof legacyProfile === "object"
        ? legacyProfile
        : {}) ||
      {};
    if (!roomId) {
      console.warn("[SERVER] join-video-room missing roomId");
      return;
    }
    try {
      socket.join(`video-room:${roomId}`);

      if (!activeRooms.has(roomId)) {
        activeRooms.set(roomId, new Map());
      }
      activeRooms.get(roomId).set(socket.id, {
        userId,
        socketId: socket.id,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
      });

      // Notify others in the room
      socket.to(`video-room:${roomId}`).emit("user-joined", {
        userId,
        socketId: socket.id,
        displayName: profile.displayName,
        photoURL: profile.photoURL,
      });

      // Get list of participants
      const participants = Array.from(activeRooms.get(roomId).values());

      socket.emit("room-participants", { participants });
    } catch (error) {
      console.error("Error joining video room:", error);
      socket.emit("error", { message: "Failed to join video room" });
    }
  });

  socket.on("leave-video-room", (payload) => {
    const isString = typeof payload === "string";
    const roomId = isString ? payload : payload?.roomId;
    const {
      chatId,
      durationSec,
      callType = "video",
    } = !isString ? payload : {};
    if (!roomId) return;
    socket.leave(`video-room:${roomId}`);
    if (activeRooms.has(roomId)) {
      const roomParticipants = activeRooms.get(roomId);
      if (roomParticipants.has(socket.id)) roomParticipants.delete(socket.id);
      if (roomParticipants.size === 0) activeRooms.delete(roomId);
    }

    socket.to(`video-room:${roomId}`).emit("user-left", {
      userId,
      socketId: socket.id,
    });
    if (chatId) {
      const durationText = `${durationSec}s`;
      const messageText =
        callType === "audio"
          ? `Đã rời cuộc gọi thoại • ${durationText}`
          : `Đã rời cuộc gọi video • ${durationText}`;

      (async () => {
        try {
          const chatRef = db.collection("chats").doc(chatId);
          const messageRef = chatRef.collection("messages").doc();
          const messageId = messageRef.id;

          const systemMessage = {
            id: messageId,
            senderId: userId,
            text: messageText,
            type: "call",
            callType: callType,
            isGroupLog: true,
            duration: durationSec,
            createdAt: Date.now(),
            viewedBy: [userId],
          };
          await messageRef.set({
            ...systemMessage,
            createdAt: FieldValue.serverTimestamp(),
          });
          await chatRef.update({
            lastMessage: messageText,
            updatedAt: FieldValue.serverTimestamp(),
            lastSenderId: userId,
          });
          io.to(`chat:${chatId}`).emit("new-message", {
            chatId,
            message: systemMessage,
          });
          io.to(`user:${userId}`).emit("update-sidebar", {
            chatId,
            lastMessage: messageText,
            updatedAt: Date.now(),
            lastSenderId: userId,
            isSeen: true,
            isGroup: true,
          });
        } catch (error) {
          console.error("Error saving group call log:", error);
        }
      })();
      updateLastMessageBackground(chatId, messageText, userId);
    }
  });

  // Cancel call
  socket.on("cancel-call", async (data) => {
    const { targetUserId, roomId, chatId, callType = "video" } = data || {};
    if (!targetUserId) return;

    io.to(`user:${targetUserId}`).emit("call-cancelled", {
      callerId: userId,
      roomId,
    });

    if (chatId) {
      const messageText = "Cuộc gọi nhỡ";
      (async () => {
        try {
          const chatRef = db.collection("chats").doc(chatId);
          const messageRef = chatRef.collection("messages").doc();
          const messageId = messageRef.id;

          const missedCallMessage = {
            id: messageId,
            senderId: userId,
            text: messageText,
            type: "call",
            callType: callType,
            callId: roomId,
            createdAt: Date.now(),
            viewedBy: [userId],
          };

          await messageRef.set({
            ...missedCallMessage,
            createdAt: FieldValue.serverTimestamp(),
          });

          await chatRef.update({
            lastMessage: messageText,
            updatedAt: FieldValue.serverTimestamp(),
            lastSenderId: userId,
          });

          io.to(`chat:${chatId}`).emit("new-message", {
            chatId,
            message: missedCallMessage,
          });

          const sidebarData = {
            chatId,
            lastMessage: `${messageText}`,
            updatedAt: Date.now(),
            lastSenderId: userId,
            receiverId: userId,
          };
          io.to(`user:${userId}`).emit("update-sidebar", {
            ...sidebarData,
            isSeen: true,
          });
          io.to(`user:${targetUserId}`).emit("update-sidebar", {
            ...sidebarData,
            isSeen: false,
          });
        } catch (error) {
          console.error("Error saving missed call log:", error);
        }
      })();

      updateLastMessageBackground(chatId, messageText, userId);
    }
  });

  // Handle callee decline
  socket.on("call-decline", (data) => {
    const { targetUserId, roomId, chatId } = data || {};
    if (!targetUserId) {
      console.warn("[SERVER] call-decline missing targetUserId");
      return;
    }
    console.log(
      `[SERVER] Call declined by ${userId}, notifying ${targetUserId} (room ${roomId})`
    );
    io.to(`user:${targetUserId}`).emit("call-declined", {
      callerId: userId,
      roomId,
      chatId,
    });

    if (chatId) {
      const messageText = "Đã từ chối cuộc gọi";

      (async () => {
        try {
          const chatRef = db.collection("chats").doc(chatId);
          const messageRef = chatRef.collection("messages").doc();
          const messageId = messageRef.id;

          const declinedMessage = {
            id: messageId,
            senderId: userId,
            text: messageText,
            type: "call",
            callType: callType,
            callId: roomId,
            createdAt: Date.now(),
            viewedBy: [userId],
          };

          await messageRef.set({
            ...declinedMessage,
            createdAt: FieldValue.serverTimestamp(),
          });

          await chatRef.update({
            lastMessage: messageText,
            updatedAt: FieldValue.serverTimestamp(),
            lastSenderId: userId,
          });

          io.to(`chat:${chatId}`).emit("new-message", {
            chatId,
            message: declinedMessage,
          });

          const sidebarData = {
            chatId,
            lastMessage: `${messageText}`,
            updatedAt: Date.now(),
            lastSenderId: userId,
          };

          io.to(`user:${userId}`).emit("update-sidebar", {
            ...sidebarData,
            isSeen: true,
          });

          io.to(`user:${targetUserId}`).emit("update-sidebar", {
            ...sidebarData,
            isSeen: false,
          });
        } catch (error) {
          console.error("Error saving declined call log:", error);
        }
      })();

      // Background update cho chắc chắn
      updateLastMessageBackground(chatId, messageText, userId);
    }
  });

  // Handle call ended (while both in room)
  socket.on("call-ended", async (data = {}) => {
    const {
      targetUserId,
      roomId,
      chatId,
      durationSec,
      callType = "video",
    } = data;
    if (!targetUserId) return;

    io.to(`user:${targetUserId}`).emit("call-ended", {
      callerId: userId,
      roomId,
      chatId,
      durationSec,
      callType,
    });

    if (chatId) {
      const messageText = `Cuộc gọi kết thúc • ${durationSec}s`;
      (async () => {
        try {
          const chatRef = db.collection("chats").doc(chatId);
          const messageRef = chatRef.collection("messages").doc();
          const messageId = messageRef.id;

          const systemMessage = {
            id: messageId,
            senderId: userId,
            text: messageText,
            type: "call",
            callType: callType,
            createdAt: Date.now(),
            viewedBy: [userId],
          };
          await messageRef.set({
            ...systemMessage,
            createdAt: FieldValue.serverTimestamp(),
          });
          await chatRef.update({
            lastMessage: messageText,
            updatedAt: FieldValue.serverTimestamp(),
            lastSenderId: userId,
          });
          io.to(`chat:${chatId}`).emit("new-message", {
            chatId,
            message: systemMessage,
          });
          const sidebarData = {
            chatId,
            lastMessage: messageText,
            updatedAt: Date.now(),
            lastSenderId: userId,
          };

          io.to(`user:${userId}`).emit("update-sidebar", {
            ...sidebarData,
            receiverId: targetUserId,
            isSeen: true,
          });
          io.to(`user:${targetUserId}`).emit("update-sidebar", {
            ...sidebarData,
            isSeen: false,
            receiverId: userId,
          });
        } catch (err) {
          console.error("Error saving system message:", err);
        }
      })();

      updateLastMessageBackground(chatId, messageText, userId);
    }
  });
};
