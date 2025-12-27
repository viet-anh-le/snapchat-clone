const { db } = require("../config/firebase");

const updateLastMessageBackground = async (chatId, text, senderId) => {
  if (!chatId) return;
  (async () => {
    try {
      const chatDoc = await db.collection("chats").doc(chatId).get();
      if (!chatDoc.exists) return;

      const chatData = chatDoc.data();
      let memberIds = [];

      if (chatData.type === "group") {
        memberIds = chatData.members || [];
      } else {
        const senderUserChatsRef = db.collection("userchats").doc(senderId);
        const senderUserChatsDoc = await senderUserChatsRef.get();
        if (senderUserChatsDoc.exists) {
          const senderChats = senderUserChatsDoc.data().chats || [];
          const chatEntry = senderChats.find((chat) => chat.chatId === chatId);
          if (chatEntry && chatEntry.receiverId) {
            memberIds = [senderId, chatEntry.receiverId];
          } else {
            memberIds = [senderId];
          }
        } else {
          memberIds = [senderId];
        }
      }

      memberIds.forEach((memberId) => {
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
                  lastMessage: text,
                  lastSenderId: senderId,
                  isSeen: memberId === senderId,
                  updatedAt: Date.now(),
                };

                await userChatsRef.update({ chats: updatedChats });
              }
            }
          } catch (error) {
            console.error(`Error updating userchats for ${memberId}:`, error);
          }
        })();
      });
    } catch (error) {
      console.error("Error in updateLastMessageBackground:", error);
    }
  })();
};

module.exports = { updateLastMessageBackground };
