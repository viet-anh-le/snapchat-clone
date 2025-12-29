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

module.exports.addMemberToGroup = async (req, res) => {
  try {
    const { chatId, newMemberId } = req.body;
    const requesterId = req.user.uid;

    const chatRef = db.collection("chats").doc(chatId);
    const chatDoc = await chatRef.get();

    if (!chatDoc.exists) {
      return res.status(404).json({ error: "Nhóm không tồn tại" });
    }

    const chatData = chatDoc.data();

    if (!chatData.members.includes(requesterId)) {
      return res
        .status(403)
        .json({ error: "Bạn không có quyền thêm thành viên" });
    }

    if (chatData.members.includes(newMemberId)) {
      return res.status(400).json({ error: "Người này đã ở trong nhóm" });
    }

    const userChatsRef = db.collection("userchats").doc(newMemberId);

    await db.runTransaction(async (t) => {
      const userChatsDoc = await t.get(userChatsRef);

      t.update(chatRef, {
        members: admin.firestore.FieldValue.arrayUnion(newMemberId),
      });

      const newChatEntry = {
        chatId: chatId,
        lastMessage: "Bạn đã được thêm vào nhóm",
        lastSenderId: requesterId,
        isSeen: false,
        updatedAt: Date.now(),
        receiverId: null,
        isGroup: true,
        groupName: chatData.groupName || "Group Chat",
        groupPhoto: chatData.groupPhoto || "",
      };

      if (userChatsDoc.exists) {
        t.update(userChatsRef, {
          chats: admin.firestore.FieldValue.arrayUnion(newChatEntry),
        });
      } else {
        t.set(userChatsRef, {
          chats: [newChatEntry],
        });
      }

      const systemMsgId = admin.firestore().collection("_").doc().id;
      const systemMessage = {
        id: systemMsgId,
        text: "đã thêm một thành viên mới vào nhóm.",
        senderId: requesterId,
        createdAt: new Date(),
        type: "system",
        isSystem: true,
        viewedBy: [requesterId],
      };

      t.update(chatRef, {
        messages: admin.firestore.FieldValue.arrayUnion(systemMessage),
      });
    });

    return res
      .status(200)
      .json({ success: true, message: "Đã thêm thành viên thành công" });
  } catch (error) {
    console.error("Error adding member:", error);
    return res.status(500).json({ error: error.message });
  }
};

module.exports.removeMember = async (req, res) => {
  try {
    const { chatId, memberId } = req.body;
    const requesterId = req.user.uid;

    const chatRef = db.collection("chats").doc(chatId);

    await db.runTransaction(async (t) => {
      const chatDoc = await t.get(chatRef);
      if (!chatDoc.exists) throw new Error("Nhóm không tồn tại");

      const chatData = chatDoc.data();

      if (!chatData.members.includes(requesterId)) {
        throw new Error(
          "Bạn không phải thành viên nhóm này, không thể thao tác."
        );
      }

      if (!chatData.members.includes(memberId)) {
        throw new Error("Người này không còn trong nhóm.");
      }
      const userChatsRef = db.collection("userchats").doc(memberId);
      const userChatsDoc = await t.get(userChatsRef);

      t.update(chatRef, {
        members: admin.firestore.FieldValue.arrayRemove(memberId),
      });

      if (userChatsDoc.exists) {
        const userChatsData = userChatsDoc.data();
        const currentChats = userChatsData.chats || [];
        const updatedChats = currentChats.filter((c) => c.chatId !== chatId);

        t.update(userChatsRef, { chats: updatedChats });
      }

      const isSelf = requesterId === memberId;
      let systemText = "";

      if (isSelf) {
        systemText = "đã rời khỏi nhóm.";
      } else {
        systemText = "đã mời một thành viên ra khỏi nhóm.";
      }

      const systemMessage = {
        id: admin.firestore().collection("_").doc().id,
        text: systemText,
        senderId: requesterId,
        createdAt: new Date(),
        type: "system",
        isSystem: true,
        viewedBy: chatData.members.filter((uid) => uid !== memberId),
      };

      t.update(chatRef, {
        messages: admin.firestore.FieldValue.arrayUnion(systemMessage),
      });
    });

    return res
      .status(200)
      .json({ success: true, message: "Đã xóa thành viên" });
  } catch (error) {
    console.error("Error removing member:", error);
    return res.status(500).json({ error: error.message });
  }
};
