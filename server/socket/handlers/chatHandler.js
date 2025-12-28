const crypto = require("crypto");
const { db, FieldValue } = require("../../functions/src/config/firebase");

module.exports = (io, socket) => {
  const userId = socket.userId;
  // Join chat room
  socket.on("join-chat", async (chatId) => {
    try {
      // Verify user has access to this chat
      const chatDoc = await db.collection("chats").doc(chatId).get();
      if (!chatDoc.exists) {
        console.error(`Chat ${chatId} not found`);
        socket.emit("error", { message: "Chat not found" });
        return;
      }

      const chatData = chatDoc.data();

      if (chatData.type === "group") {
        if (!chatData.members || !chatData.members.includes(userId)) {
          console.error(
            `User ${userId} not in members array:`,
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
            `User ${userId} doesn't have access to 1-1 chat ${chatId}`
          );
          socket.emit("error", { message: "Access denied" });
          return;
        }
      }

      socket.join(`chat:${chatId}`);

      const room = io.sockets.adapter.rooms.get(`chat:${chatId}`);
      const socketCount = room ? room.size : 0;
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

    try {
      const userChatsRef = db.collection("userchats").doc(userId);
      const userChatsDoc = await userChatsRef.get();

      if (!userChatsDoc.exists) {
        console.error(`[SERVER] Userchats document not found for ${userId}`);
        return;
      }

      const userChatsData = userChatsDoc.data();
      const chats = userChatsData.chats || [];
      const chatIndex = chats.findIndex((c) => c.chatId === chatId);

      if (chatIndex === -1) {
        return;
      }

      const updatedChats = [...chats];
      const currentChat = updatedChats[chatIndex];

      // Mark as seen regardless of who sent the last message (user wants to mark it as seen)
      updatedChats[chatIndex] = {
        ...currentChat,
        isSeen: true,
      };

      await userChatsRef.update({ chats: updatedChats });
    } catch (error) {
      console.error("[SERVER] Error marking chat as seen:", error);
    }
  });

  // Send message
  socket.on("send-message", (data) => {
    try {
      const { chatId, text, type = "text", img, receiverId } = data;

      if (!chatId || !text) {
        console.error("Missing chatId or text in send-message");
        socket.emit("error", { message: "Missing chatId or text" });
        return;
      }

      const roomName = `chat:${chatId}`;

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
        //Check block user
        if (receiverId) {
          try {
            const [senderDoc, receiverDoc] = await Promise.all([
              db.collection("users").doc(userId).get(),
              db.collection("users").doc(receiverId).get(),
            ]);

            const senderData = senderDoc.data();
            const receiverData = receiverDoc.data();

            if (senderData?.blockedUsers?.includes(receiverId)) {
              socket.emit("error", { message: "Bạn đã chặn người dùng này." });
              return;
            }

            if (receiverData?.blockedUsers?.includes(senderId)) {
              socket.emit("error", { message: "Không thể gửi tin nhắn." });
              return;
            }
          } catch (err) {
            console.error("Check block error:", err);
          }
        }

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
                `User ${userId} not in group members:`,
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
                `User ${userId} doesn't have access to 1-1 chat ${chatId}`
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

  socket.on("send-reaction-update", (data) => {
    const { chatId, messageId, updatedReactions } = data;
    const roomName = `chat:${chatId}`;

    io.to(roomName).emit("receive-reaction-update", {
      chatId,
      messageId,
      updatedReactions,
    });
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

  //Delete Message
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
};
