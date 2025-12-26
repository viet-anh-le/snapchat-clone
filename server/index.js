const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const admin = require("firebase-admin");
const path = require("path");
const crypto = require("crypto");

try {
  const serviceAccount = require("./firebase-admin.json");
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log("✅ Firebase Admin initialized");
} catch (error) {
  console.error("❌ Error initializing Firebase Admin:", error.message);
  process.exit(1);
}

const db = admin.firestore();
const FieldValue = admin.firestore.FieldValue;

const app = express();
const server = http.createServer(app);

// CORS configuration
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Middleware
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));
app.use(express.json());

// Socket.io authentication middleware
io.use(async (socket, next) => {
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
});

// Store active connections
const activeRooms = new Map();
const userSockets = new Map();

// Socket.io connection handler
io.on("connection", (socket) => {
  const userId = socket.userId;
  console.log(`✅ User connected: ${userId} (socket: ${socket.id})`);

  // Track user socket
  if (!userSockets.has(userId)) {
    userSockets.set(userId, new Set());
  }
  userSockets.get(userId).add(socket.id);

  // Join user's personal room for notifications
  socket.join(`user:${userId}`);
  console.log(`✅ [SERVER] User ${userId} joined personal room user:${userId}`);

  // Verify room exists
  const userRoom = io.sockets.adapter.rooms.get(`user:${userId}`);
  console.log(
    `📊 [SERVER] Room user:${userId} has ${
      userRoom ? userRoom.size : 0
    } socket(s)`
  );

  // ========== INCOMING CALL EVENTS ==========

  // Handle incoming call notification
  socket.on("incoming-call", (data) => {
    const { targetUserId, ...callData } = data;
    console.log(
      `📞 [SERVER] Received incoming-call event from ${userId} to ${targetUserId}`
    );
    console.log(`📞 [SERVER] Call data:`, callData);

    // Check if target user is online
    const targetRoom = io.sockets.adapter.rooms.get(`user:${targetUserId}`);
    const targetSocketCount = targetRoom ? targetRoom.size : 0;
    console.log(
      `📊 [SERVER] Target user ${targetUserId} room has ${targetSocketCount} socket(s)`
    );

    // Send to target user's personal room
    const payload = {
      ...callData,
      callerId: userId,
    };
    console.log(
      `📤 [SERVER] Emitting incoming-call to room user:${targetUserId}:`,
      payload
    );
    io.to(`user:${targetUserId}`).emit("incoming-call", payload);
    console.log(
      `✅ [SERVER] incoming-call event emitted to user:${targetUserId}`
    );
  });

  // Handle call cancellation before it is answered
  socket.on("cancel-call", (data) => {
    const { targetUserId, roomId } = data || {};
    if (!targetUserId) {
      console.warn("⚠️ [SERVER] cancel-call missing targetUserId");
      return;
    }

    console.log(
      `📞 [SERVER] Cancel-call from ${userId} to ${targetUserId} for room ${roomId}`
    );
    io.to(`user:${targetUserId}`).emit("call-cancelled", {
      callerId: userId,
      roomId,
    });
  });

  // Handle callee decline
  socket.on("call-decline", (data) => {
    const { targetUserId, roomId, chatId } = data || {};
    if (!targetUserId) {
      console.warn("⚠️ [SERVER] call-decline missing targetUserId");
      return;
    }
    console.log(
      `📞 [SERVER] Call declined by ${userId}, notifying ${targetUserId} (room ${roomId})`
    );
    io.to(`user:${targetUserId}`).emit("call-declined", {
      callerId: userId,
      roomId,
      chatId,
    });
  });

  // Handle call ended (while both in room)
  socket.on("call-ended", (data = {}) => {
    const { targetUserId, roomId, chatId, reason, durationSec } = data;
    if (!targetUserId) {
      console.warn("⚠️ [SERVER] call-ended missing targetUserId");
      return;
    }
    console.log(
      `📞 [SERVER] Call ended by ${userId}, notifying ${targetUserId} (room ${roomId})`
    );
    io.to(`user:${targetUserId}`).emit("call-ended", {
      callerId: userId,
      roomId,
      chatId,
      reason,
      durationSec,
    });
  });

  // ========== CHAT EVENTS ==========

  // Join chat room
  socket.on("join-chat", async (chatId) => {
    console.log(
      `🔍 [JOIN-CHAT] Received join-chat event from ${userId} for chat ${chatId}`
    );
    try {
      console.log(`🔍 User ${userId} attempting to join chat ${chatId}`);
      // Verify user has access to this chat
      const chatDoc = await db.collection("chats").doc(chatId).get();
      if (!chatDoc.exists) {
        console.error(`❌ Chat ${chatId} not found`);
        socket.emit("error", { message: "Chat not found" });
        return;
      }

      const chatData = chatDoc.data();
      console.log(`📋 Chat data:`, {
        type: chatData.type,
        members: chatData.members,
        userId: userId,
      });

      if (chatData.type === "group") {
        if (!chatData.members || !chatData.members.includes(userId)) {
          console.error(
            `❌ User ${userId} not in members array:`,
            chatData.members
          );
          socket.emit("error", { message: "Access denied" });
          return;
        }
      } else {
        const userChatsRef = db.collection("userchats").doc(userId);
        const userChatsDoc = await userChatsRef.get();
        let hasAccess = false;

        if (userChatsDoc.exists) {
          const userChats = userChatsDoc.data().chats || [];
          hasAccess = userChats.some((chat) => chat.chatId === chatId);
        }

        if (!hasAccess) {
          console.error(
            `❌ User ${userId} doesn't have access to 1-1 chat ${chatId}`
          );
          socket.emit("error", { message: "Access denied" });
          return;
        }

        console.log(`✅ 1-1 chat access verified for user ${userId}`);
      }

      socket.join(`chat:${chatId}`);

      const room = io.sockets.adapter.rooms.get(`chat:${chatId}`);
      const socketCount = room ? room.size : 0;
      console.log(
        `📱 User ${userId} joined chat ${chatId} (sockets in room: ${socketCount})`
      );

      socket.emit("joined-chat", { chatId });

      // Mark chat as seen when user joins (opens the chat)
      try {
        const userChatsRef = db.collection("userchats").doc(userId);
        const userChatsDoc = await userChatsRef.get();

        if (userChatsDoc.exists) {
          const userChatsData = userChatsDoc.data();
          const chatIndex = userChatsData.chats?.findIndex(
            (c) => c.chatId === chatId
          );

          if (chatIndex !== undefined && chatIndex !== -1) {
            const updatedChats = [...userChatsData.chats];
            // Only mark as seen if last message was not from current user
            if (updatedChats[chatIndex].lastSenderId !== userId) {
              updatedChats[chatIndex] = {
                ...updatedChats[chatIndex],
                isSeen: true,
              };

              await userChatsRef.update({ chats: updatedChats });
              console.log(
                `✅ Marked chat ${chatId} as seen for user ${userId}`
              );
            }
          }
        }
      } catch (error) {
        console.error("Error marking chat as seen:", error);
      }
    } catch (error) {
      console.error("Error joining chat:", error);
      socket.emit("error", { message: "Failed to join chat" });
    }
  });

  // Leave chat room
  socket.on("leave-chat", (chatId) => {
    socket.leave(`chat:${chatId}`);
  });

  // Mark chat as seen
  socket.on("mark-chat-seen", async (data) => {
    const { chatId } = data;
    console.log(
      `👁️ [SERVER] Marking chat ${chatId} as seen for user ${userId}`
    );

    try {
      const userChatsRef = db.collection("userchats").doc(userId);
      const userChatsDoc = await userChatsRef.get();

      if (!userChatsDoc.exists) {
        console.error(`❌ [SERVER] Userchats document not found for ${userId}`);
        return;
      }

      const userChatsData = userChatsDoc.data();
      const chats = userChatsData.chats || [];
      const chatIndex = chats.findIndex((c) => c.chatId === chatId);

      if (chatIndex === -1) {
        console.error(
          `❌ [SERVER] Chat ${chatId} not found in userchats for ${userId}`
        );
        return;
      }

      const updatedChats = [...chats];
      const currentChat = updatedChats[chatIndex];

      console.log(`📋 [SERVER] Current chat state:`, {
        chatId,
        lastSenderId: currentChat.lastSenderId,
        currentIsSeen: currentChat.isSeen,
        userId,
      });

      // Mark as seen regardless of who sent the last message (user wants to mark it as seen)
      updatedChats[chatIndex] = {
        ...currentChat,
        isSeen: true,
      };

      await userChatsRef.update({ chats: updatedChats });
      console.log(
        `✅ [SERVER] Successfully marked chat ${chatId} as seen for user ${userId}`
      );
    } catch (error) {
      console.error("❌ [SERVER] Error marking chat as seen:", error);
    }
  });

  // Send message
  socket.on("send-message", (data) => {
    console.log(`📨 Received send-message from ${userId}:`, data);
    try {
      const { chatId, text, type = "text", img } = data;

      if (!chatId || !text) {
        console.error("❌ Missing chatId or text in send-message");
        socket.emit("error", { message: "Missing chatId or text" });
        return;
      }

      const roomName = `chat:${chatId}`;
      if (!socket.rooms.has(roomName)) {
        console.warn(
          `⚠️ User ${userId} tried to send to ${chatId} without joining room.`
        );
        return;
      }

      const message = {
        id: crypto.randomUUID(),
        senderId: userId,
        text: type === "snap" ? "Sent a Snap" : text,
        img: img || null,
        type: type,
        viewedBy: [],
        createdAt: new Date(),
      };

      io.to(roomName).emit("new-message", {
        chatId,
        message: message,
      });

      (async () => {
        try {
          // Verify access
          const chatDoc = await db.collection("chats").doc(chatId).get();
          if (!chatDoc.exists) {
            socket.emit("error", { message: "Chat not found" });
            return;
          }

          const chatData = chatDoc.data();
          // Check access based on chat type
          let hasAccess = false;
          if (chatData.type === "group") {
            // Group chat: check members array
            hasAccess = chatData.members && chatData.members.includes(userId);
            if (!hasAccess) {
              console.error(
                `❌ User ${userId} not in group members:`,
                chatData.members
              );
            }
          } else {
            // 1-1 chat: check if user has this chat in their userchats
            const userChatsRef = db.collection("userchats").doc(userId);
            const userChatsDoc = await userChatsRef.get();
            if (userChatsDoc.exists) {
              const userChats = userChatsDoc.data().chats || [];
              hasAccess = userChats.some((chat) => chat.chatId === chatId);
            }
            if (!hasAccess) {
              console.error(
                `❌ User ${userId} doesn't have access to 1-1 chat ${chatId}`
              );
            }
          }

          if (!hasAccess) {
            socket.emit("error", { message: "Access denied" });
            return;
          }
          // Get member IDs efficiently (BEFORE Firestore updates)
          let memberIds = [];
          if (chatData.type === "group") {
            // Group chat: use members array (already in memory)
            memberIds = chatData.members || [];
          } else {
            // 1-1 chat: get receiver from sender's userchats (only 1 query instead of all)
            const senderUserChatsRef = db.collection("userchats").doc(userId);
            const senderUserChatsDoc = await senderUserChatsRef.get();

            if (senderUserChatsDoc.exists) {
              const senderChats = senderUserChatsDoc.data().chats || [];
              const chatEntry = senderChats.find(
                (chat) => chat.chatId === chatId
              );
              if (chatEntry && chatEntry.receiverId) {
                memberIds = [userId, chatEntry.receiverId];
              } else {
                // Fallback: just use sender for now
                memberIds = [userId];
              }
            } else {
              memberIds = [userId];
            }
          }
          // Update userchats in parallel (start immediately after broadcast)
          // Use individual updates for better performance (Firestore handles parallel writes well)
          memberIds.forEach((memberId) => {
            // Don't await - start all updates in parallel immediately
            (async () => {
              try {
                const userChatsRef = db.collection("userchats").doc(memberId);
                const userChatsDoc = await userChatsRef.get();

                if (userChatsDoc.exists) {
                  const userChatsData = userChatsDoc.data();
                  const chats = userChatsData.chats || [];
                  const chatIndex = chats.findIndex((c) => c.chatId === chatId);

                  if (chatIndex !== -1) {
                    const updatedChats = [...chats];
                    updatedChats[chatIndex] = {
                      ...updatedChats[chatIndex],
                      lastMessage: type === "snap" ? "📷 Sent a photo" : text,
                      lastSenderId: userId,
                      isSeen: memberId === userId,
                      updatedAt: Date.now(),
                    };

                    await userChatsRef.update({ chats: updatedChats });
                  }
                }
              } catch (error) {
                console.error(
                  `Error updating userchats for ${memberId}:`,
                  error
                );
              }
            })();
          });
          // Update Firestore messages in background (non-blocking)
          db.collection("chats")
            .doc(chatId)
            .update({
              messages: FieldValue.arrayUnion(message),
            })
            .catch((error) => {
              console.error("Error updating Firestore messages:", error);
            });
        } catch (error) {
          console.error("Error broadcasting message:", error);
        }
      })();
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  // Mark snap as viewed
  socket.on("view-snap", async (data) => {
    try {
      const { chatId, messageId } = data;

      const chatDoc = await db.collection("chats").doc(chatId).get();
      if (!chatDoc.exists) {
        socket.emit("error", { message: "Chat not found" });
        return;
      }

      const chatData = chatDoc.data();
      const messages = chatData.messages || [];
      const messageIndex = messages.findIndex((m) => m.id === messageId);

      if (messageIndex === -1) {
        socket.emit("error", { message: "Message not found" });
        return;
      }

      const message = messages[messageIndex];
      const viewedBy = message.viewedBy || [];

      if (!viewedBy.includes(userId)) {
        messages[messageIndex] = {
          ...message,
          viewedBy: [...viewedBy, userId],
        };

        await db.collection("chats").doc(chatId).update({ messages });

        // Broadcast update
        io.to(`chat:${chatId}`).emit("snap-viewed", {
          chatId,
          messageId,
          viewedBy: messages[messageIndex].viewedBy,
        });
      }
    } catch (error) {
      console.error("Error viewing snap:", error);
      socket.emit("error", { message: "Failed to mark snap as viewed" });
    }
  });

  // Delete message
  socket.on("delete-message", async (data) => {
    try {
      const { chatId, messageId } = data || {};
      if (!chatId || !messageId) {
        socket.emit("error", { message: "Missing chatId or messageId" });
        return;
      }

      const chatDoc = await db.collection("chats").doc(chatId).get();
      if (!chatDoc.exists) {
        socket.emit("error", { message: "Chat not found" });
        return;
      }

      const chatData = chatDoc.data();
      const messages = chatData.messages || [];
      const messageIndex = messages.findIndex((m) => m.id === messageId);

      if (messageIndex === -1) {
        socket.emit("error", { message: "Message not found" });
        return;
      }

      messages.splice(messageIndex, 1);
      await db.collection("chats").doc(chatId).update({ messages });

      io.to(`chat:${chatId}`).emit("message-deleted", {
        chatId,
        messageId,
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      socket.emit("error", { message: "Failed to delete message" });
    }
  });

  // ========== WEBRTC SIGNALING EVENTS ==========

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
      console.warn("⚠️ [SERVER] join-video-room missing roomId");
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

  // Leave video call room
  socket.on("leave-video-room", (roomId) => {
    socket.leave(`video-room:${roomId}`);

    if (activeRooms.has(roomId)) {
      const room = activeRooms.get(roomId);
      room.delete(socket.id);
      if (room.size === 0) {
        activeRooms.delete(roomId);
      }
    }

    socket.to(`video-room:${roomId}`).emit("user-left", {
      userId,
      socketId: socket.id,
    });
  });

  // WebRTC Offer
  socket.on("webrtc-offer", (data) => {
    const { offer, targetUserId, roomId } = data;
    console.log(`📤 Offer from ${userId} to ${targetUserId} in room ${roomId}`);

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
    console.log(
      `📥 Answer from ${userId} to ${targetUserId} in room ${roomId}`
    );

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

  // Disconnect handler
  socket.on("disconnect", () => {
    console.log(`❌ User disconnected: ${userId} (socket: ${socket.id})`);
    // Remove from user sockets
    if (userSockets.has(userId)) {
      userSockets.get(userId).delete(socket.id);
      if (userSockets.get(userId).size === 0) {
        userSockets.delete(userId);
      }
    }

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
});

// ========== REST API ROUTES ==========

// Health check (no auth required)
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Import routes and middleware
const {
  validateFirebaseIdToken,
} = require("./functions/src/middleware/auth.middleware");
const indexRoutes = require("./functions/src/routes/index.route");

// Apply auth middleware to all API routes
app.use("/api", validateFirebaseIdToken);

indexRoutes(app);

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📡 WebSocket server ready`);
});

module.exports = { app, server, io };
