const crypto = require("crypto");
const {
  admin,
  db,
  FieldValue,
} = require("../../functions/src/config/firebase");
const BlockCache = require("../../cache/BlockCache");

const deleteImageFromStorage = async (fileUrl) => {
  if (!fileUrl) return;
  try {
    const urlObj = new URL(fileUrl);
    const pathName = urlObj.pathname;
    const indexOfO = pathName.indexOf("/o/");
    if (indexOfO === -1) return;
    const encodedPath = pathName.substring(indexOfO + 3);
    const filePath = decodeURIComponent(encodedPath);

    await admin.storage().bucket().file(filePath).delete();
    console.log(`[Storage] Deleted snap: ${filePath}`);
  } catch (error) {
    console.error("[Storage] Error deleting file:", error.message);
  }
};

module.exports = (io, socket) => {
  const userId = socket.userId;
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
        console.log(chatData);
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
  socket.on("send-message", async (data) => {
    try {
      const { chatId, text, type = "text", img, receiverId, members } = data;
      const senderId = socket.userId;
      const isBlocked = await BlockCache.checkBlockedStatus(
        senderId,
        receiverId
      );

      if (isBlocked) {
        socket.emit("error", { message: "Không thể gửi tin nhắn (bị chặn)." });
        return;
      }
      if (!chatId || !text) {
        console.error("Missing chatId or text in send-message");
        socket.emit("error", { message: "Missing chatId or text" });
        return;
      }

      const roomName = `chat:${chatId}`;
      const messageId = crypto.randomUUID();

      const message = {
        id: messageId,
        senderId: userId,
        text: type === "snap" ? "Sent a Snap" : text,
        img: img || null,
        type: type,
        viewedBy: [senderId],
        createdAt: Date.now(),
        reactions: {},
      };

      io.to(roomName).emit("new-message", {
        chatId,
        message: message,
      });

      const sidebarData = {
        chatId,
        lastMessage: type === "snap" ? "📷 Sent a photo" : text,
        updatedAt: Date.now(),
        lastSenderId: userId,
        isSeen: false,
        receiverId: receiverId,
      };

      io.to(`user:${userId}`).emit("update-sidebar", {
        ...sidebarData,
        isSeen: true,
      });

      if (members && Array.isArray(members) && members.length > 0) {
        members.forEach((memberId) => {
          if (memberId !== userId) {
            io.to(`user:${memberId}`).emit("update-sidebar", {
              ...sidebarData,
              isGroup: true,
            });
          }
        });
      } else if (receiverId) {
        io.to(`user:${receiverId}`).emit("update-sidebar", sidebarData);
      }

      (async () => {
        if (receiverId) {
          try {
            const [senderDoc, receiverDoc] = await Promise.all([
              db.collection("users").doc(userId).get(),
              db.collection("users").doc(receiverId).get(),
            ]);

            const senderData = senderDoc.data();
            const receiverData = receiverDoc.data();

            if (senderData?.blockedUsers?.includes(receiverId)) {
              console.warn(`User ${userId} blocked ${receiverId}`);
              return;
            }

            if (receiverData?.blockedUsers?.includes(userId)) {
              console.warn(`User ${receiverId} blocked ${userId}`);
              return;
            }
          } catch (err) {
            console.error("Check block error:", err);
          }
        }

        try {
          const chatRef = db.collection("chats").doc(chatId);
          const chatDoc = await chatRef.get();

          if (!chatDoc.exists) {
            socket.emit("error", { message: "Chat not found" });
            return;
          }

          const chatData = chatDoc.data();
          let hasAccess = false;
          let memberIds = [];

          if (chatData.type === "group") {
            hasAccess = chatData.members && chatData.members.includes(userId);
            memberIds = chatData.members || [];
          } else {
            const userChatsRef = db.collection("userchats").doc(userId);
            const userChatsDoc = await userChatsRef.get();
            if (userChatsDoc.exists) {
              const userChats = userChatsDoc.data().chats || [];
              const chatEntry = userChats.find((c) => c.chatId === chatId);
              hasAccess = !!chatEntry;
              if (chatEntry && chatEntry.receiverId) {
                memberIds = [userId, chatEntry.receiverId];
              }
            }
            if (!memberIds.length) memberIds = [userId];
          }

          if (!hasAccess) {
            socket.emit("error", { message: "Access denied" });
            return;
          }

          await chatRef
            .collection("messages")
            .doc(messageId)
            .set({
              ...message,
              createdAt: FieldValue.serverTimestamp(),
            });

          await chatRef.update({
            lastMessage: type === "snap" ? "📷 Sent a photo" : text,
            updatedAt: FieldValue.serverTimestamp(),
            lastSenderId: userId,
          });

          const updatePromises = memberIds.map(async (memberId) => {
            const userChatsRef = db.collection("userchats").doc(memberId);

            try {
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
            } catch (err) {
              console.error(`Error updating userchat for ${memberId}`, err);
            }
          });

          await Promise.all(updatePromises);
        } catch (error) {
          console.error("Error processing message DB:", error);
        }
      })();
    } catch (error) {
      console.error("Error sending message:", error);
      socket.emit("error", { message: "Failed to send message" });
    }
  });

  socket.on("send-reaction-update", (data) => {
    const {
      chatId,
      messageId,
      updatedReactions,
      notificationText,
      receiverId,
      lastSenderId,
    } = data;
    const roomName = `chat:${chatId}`;
    io.to(roomName).emit("receive-reaction-update", {
      chatId,
      messageId,
      updatedReactions,
    });
    if (notificationText && receiverId) {
      const sidebarData = {
        chatId,
        lastMessage: notificationText,
        updatedAt: Date.now(),
        lastSenderId: lastSenderId,
        isSeen: false,
        isReaction: true,
      };
      io.to(`user:${receiverId}`).emit("update-sidebar", sidebarData);
    }
  });

  // Mark snap as viewed
  socket.on("view-snap", async (data) => {
    try {
      const { chatId, messageId } = data;
      if (!chatId || !messageId) return;

      const chatRef = db.collection("chats").doc(chatId);
      const messageRef = chatRef.collection("messages").doc(messageId);

      await db.runTransaction(async (t) => {
        const chatDoc = await t.get(chatRef);
        const messageDoc = await t.get(messageRef);

        if (!chatDoc.exists || !messageDoc.exists) return;

        const chatData = chatDoc.data();
        const messageData = messageDoc.data();
        const viewedBy = messageData.viewedBy || [];

        if (viewedBy.includes(userId)) return;
        const newViewedBy = [...viewedBy, userId];
        const groupMembers = chatData.members || [];

        const isEveryoneViewed = groupMembers.every((memberId) =>
          newViewedBy.includes(memberId)
        );

        if (isEveryoneViewed) {
          console.log(`[Snap] Message ${messageId} viewed by all. Deleting...`);
          deleteImageFromStorage(messageData.img);
          t.update(messageRef, {
            viewedBy: newViewedBy,
            type: "expired",
            img: null,
            file: null,
          });

          io.to(`chat:${chatId}`).emit("message-updated", {
            chatId,
            messageId,
            updatedMessage: {
              ...messageData,
              viewedBy: newViewedBy,
              type: "expired",
              img: null,
            },
          });
        } else {
          t.update(messageRef, {
            viewedBy: newViewedBy,
          });

          io.to(`chat:${chatId}`).emit("snap-viewed", {
            chatId,
            messageId,
            viewedBy: newViewedBy,
          });
        }
      });
    } catch (error) {
      console.error("Error viewing snap:", error);
      socket.emit("error", { message: "Failed to mark snap as viewed" });
    }
  });

  //Delete Message
  socket.on("delete-message", (data) => {
    try {
      const userId = socket.userId;
      const { chatId, messageId, userDisplayName, receiverId, members } =
        data || {};
      if (!chatId || !messageId) {
        socket.emit("error", { message: "Missing chatId or messageId" });
        return;
      }
      io.to(`chat:${chatId}`).emit("message-deleted", {
        chatId,
        messageId,
        updatedMessage: {
          id: messageId,
          text: `Tin nhắn đã được thu hồi`,
          type: "unsent",
          img: null,
          reactions: {},
          updatedAt: Date.now(),
        },
      });

      const sidebarData = {
        chatId,
        lastMessage: `${userDisplayName || "Ai đó"} đã thu hồi một tin nhắn`,
        updatedAt: Date.now(),
        lastSenderId: userId,
        isSeen: false,
      };

      io.to(`user:${userId}`).emit("update-sidebar", {
        ...sidebarData,
        isSeen: true,
      });

      if (members && Array.isArray(members) && members.length > 0) {
        members.forEach((memberId) => {
          if (memberId !== userId) {
            io.to(`user:${memberId}`).emit("update-sidebar", {
              ...sidebarData,
              isGroup: true,
            });
          }
        });
      } else if (receiverId) {
        io.to(`user:${receiverId}`).emit("update-sidebar", sidebarData);
      }

      (async () => {
        try {
          const chatRef = db.collection("chats").doc(chatId);
          const messageRef = chatRef.collection("messages").doc(messageId);

          const [chatDoc, messageDoc] = await Promise.all([
            chatRef.get(),
            messageRef.get(),
          ]);

          if (!chatDoc.exists || !messageDoc.exists) {
            socket.emit("error", { message: "Chat or Message not found" });
            return;
          }

          const messageData = messageDoc.data();
          const chatData = chatDoc.data();

          if (messageData.senderId !== userId) {
            socket.emit("error", { message: "Permission denied" });
            return;
          }

          let memberIds = [];
          if (chatData.type === "group") {
            memberIds = chatData.members || [];
          } else {
            if (chatData.members) {
              memberIds = chatData.members;
            } else {
              if (receiverId) memberIds = [userId, receiverId];
              else memberIds = [userId];
            }
          }

          await messageRef.update({
            text: "Tin nhắn đã được thu hồi",
            type: "unsent",
            img: null,
            file: null,
            reactions: {},
            updatedAt: FieldValue.serverTimestamp(),
          });

          await chatRef.update({
            lastMessage: `${
              userDisplayName || "Ai đó"
            } đã thu hồi một tin nhắn`,
            updatedAt: FieldValue.serverTimestamp(),
            lastSenderId: userId,
          });

          const updatePromises = memberIds.map(async (memberId) => {
            const isMe = memberId === userId;
            const userChatsRef = db.collection("userchats").doc(memberId);
            try {
              const userChatsDoc = await userChatsRef.get();
              if (userChatsDoc.exists) {
                const userChatsData = userChatsDoc.data();
                const chats = userChatsData.chats || [];
                const chatIndex = chats.findIndex((c) => c.chatId === chatId);

                if (chatIndex !== -1) {
                  const updatedChats = [...chats];
                  updatedChats[chatIndex] = {
                    ...updatedChats[chatIndex],
                    lastMessage: `${
                      userDisplayName || "Ai đó"
                    } đã thu hồi một tin nhắn`,
                    lastSenderId: userId,
                    isSeen: isMe,
                    updatedAt: Date.now(),
                  };
                  await userChatsRef.update({ chats: updatedChats });
                }
              }
            } catch (err) {
              console.error(`Error updating userchat for ${memberId}`, err);
            }
          });
          await Promise.all(updatePromises);
        } catch (error) {
          console.error("Error processing recall DB:", error);
        }
      })();
    } catch (error) {
      console.error("Error deleting message:", error);
      socket.emit("error", { message: "Failed to delete message" });
    }
  });

  // archive message
  socket.on("archive-chat", async (data) => {
    try {
      const userId = socket.userId;
      const { chatId } = data;

      const userChatsRef = db.collection("userchats").doc(userId);
      const userChatsDoc = await userChatsRef.get();

      if (userChatsDoc.exists) {
        const userChatsData = userChatsDoc.data();
        const chats = userChatsData.chats || [];

        const chatIndex = chats.findIndex((c) => c.chatId === chatId);

        if (chatIndex !== -1) {
          chats[chatIndex].isArchived = true;
          chats[chatIndex].archivedAt = Date.now();
          await userChatsRef.update({ chats });
          socket.emit("chat-archived-success", { chatId });
        }
      }
    } catch (error) {
      console.error("Error archiving chat:", error);
      socket.emit("error", { message: "Failed to archive chat" });
    }
  });

  socket.on("unarchive-chat", async (data) => {
    try {
      const userId = socket.userId;
      const { chatId } = data;

      const userChatsRef = db.collection("userchats").doc(userId);
      const userChatsDoc = await userChatsRef.get();

      if (userChatsDoc.exists) {
        const userChatsData = userChatsDoc.data();
        const chats = userChatsData.chats || [];

        const chatIndex = chats.findIndex((c) => c.chatId === chatId);

        if (chatIndex !== -1) {
          delete chats[chatIndex].isArchived;
          delete chats[chatIndex].archivedAt;
          await userChatsRef.update({ chats });
          socket.emit("chat-unarchived-success", { chatId });
        }
      }
    } catch (error) {
      console.error("Error unarchiving chat:", error);
      socket.emit("error", { message: "Failed to unarchive chat" });
    }
  });
};
