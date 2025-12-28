const { db, admin, FieldValue } = require("../config/firebase");

module.exports.createGroup = async (req, res) => {
  const { currentUserId, selectedUsers, groupName } = req.body;

  if (!selectedUsers || selectedUsers.length === 0) {
    return res.status(400).json({ error: "Cần ít nhất 1 thành viên" });
  }

  try {
    const batch = db.batch();
    const newChatRef = db.collection("chats").doc();

    const memberIds = selectedUsers.map((u) => u.uid || u);
    const allMemberIds = [currentUserId, ...memberIds];
    const uniqueMemberIds = [...new Set(allMemberIds)];

    // Tạo doc chat
    batch.set(newChatRef, {
      chatId: newChatRef.id,
      createdAt: FieldValue.serverTimestamp(),
      messages: [],
      type: "group",
      groupName: groupName || "New Group",
      members: uniqueMemberIds,
      groupAdmin: currentUserId,
      groupPhoto: "https://cdn-icons-png.flaticon.com/512/166/166258.png",
    });

    // Tạo data tóm tắt cho userchats
    const groupChatSummary = {
      chatId: newChatRef.id,
      displayName: groupName || "New Group",
      photoURL: "https://cdn-icons-png.flaticon.com/512/166/166258.png",
      lastMessage: "Nhóm đã được tạo",
      updatedAt: Date.now(),
      isSeen: false,
      type: "group",
    };

    // Update cho từng thành viên
    uniqueMemberIds.forEach((memberId) => {
      const userChatRef = db.collection("userchats").doc(memberId);

      // Dùng update để thêm vào mảng.
      batch.update(userChatRef, {
        chats: FieldValue.arrayUnion({
          ...groupChatSummary,
          isSeen: memberId === currentUserId,
        }),
      });
    });

    await batch.commit();

    return res.status(200).json({
      success: true,
      chatId: newChatRef.id,
      message: "Group created successfully",
    });
  } catch (error) {
    console.error("Error:", error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports.reactToMessage = async (req, res) => {
  try {
    const { chatId, messageId, reaction } = req.body;
    const userId = req.user.uid;

    const chatRef = db.collection("chats").doc(chatId);

    await db.runTransaction(async (t) => {
      const doc = await t.get(chatRef);
      if (!doc.exists) throw new Error("Chat không tồn tại");

      const data = doc.data();
      const messages = data.messages || [];

      const messageIndex = messages.findIndex((m) => m.id === messageId);

      if (messageIndex === -1) {
        throw new Error("Tin nhắn không tồn tại trong đoạn chat này");
      }

      const targetMessage = messages[messageIndex];
      const currentReactions = targetMessage.reactions || {};

      if (currentReactions[userId] === reaction) {
        delete currentReactions[userId];
      } else {
        currentReactions[userId] = reaction;
      }
      console.log(targetMessage);

      targetMessage.reactions = currentReactions;
      messages[messageIndex] = targetMessage;

      t.update(chatRef, { messages: messages });
      return res.status(200).json({
        success: true,
        updatedReactions: currentReactions,
      });
    });
  } catch (error) {
    console.error("Lỗi thả reaction:", error);
    return res.status(500).json({ error: error.message });
  }
};
