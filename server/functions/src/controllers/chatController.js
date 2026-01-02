const { db, admin, FieldValue } = require("../config/firebase");
const { updateLastMessageBackground } = require("../helpers/updateLastMessage");

module.exports.createGroup = async (req, res) => {
  const { currentUserId, selectedUsers, groupName } = req.body;
  const io = req.app.get("socketio");

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

    if (io) {
      uniqueMemberIds.forEach((memberId) => {
        io.to(`user:${memberId}`).emit("update-sidebar", {
          chatId: newChatRef.id,
          lastMessage: "Nhóm đã được tạo",
          updatedAt: Date.now(),
          lastSenderId: currentUserId,
          isSeen: memberId === currentUserId,
          receiverId: newChatRef.id,
          type: "group",
          isGroup: true,
          groupName: groupName || "New Group",
          groupPhoto: "https://cdn-icons-png.flaticon.com/512/166/166258.png",
          members: uniqueMemberIds,
        });
      });
    }

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
    const { chatId, messageId, reaction, userDisplayName } = req.body;
    const userId = req.user.uid;
    const chatRef = db.collection("chats").doc(chatId);
    const messageRef = chatRef.collection("messages").doc(messageId);

    const result = await db.runTransaction(async (t) => {
      const doc = await t.get(messageRef);
      if (!doc.exists) {
        throw new Error("Tin nhắn không tồn tại");
      }

      const data = doc.data();
      const currentReactions = data.reactions || {};
      let action = "add";
      if (currentReactions[userId] === reaction) {
        delete currentReactions[userId];
        action = "remove";
      } else {
        currentReactions[userId] = reaction;
        action = "add";
      }
      t.update(messageRef, { reactions: currentReactions });
      return currentReactions;
    });
    const notificationText = `${userDisplayName} đã bày tỏ ${reaction} với tin nhắn của bạn`;
    console.log(notificationText);
    updateLastMessageBackground(chatId, notificationText, userId);
    return res.status(200).json({
      success: true,
      updatedReactions: result,
    });
  } catch (error) {
    console.error("Lỗi thả reaction:", error);
    const statusCode = error.message === "Tin nhắn không tồn tại" ? 404 : 500;
    return res.status(statusCode).json({ error: error.message });
  }
};

module.exports.addMemberToGroup = async (req, res) => {
  try {
    const { chatId, newMemberId } = req.body;
    const requesterId = req.user.uid;
    const io = req.app.get("socketio");

    const chatRef = db.collection("chats").doc(chatId);
    const memberRef = db.collection("users").doc(newMemberId);
    const userChatsRef = db.collection("userchats").doc(newMemberId);

    const systemMessageRef = chatRef.collection("messages").doc();
    const systemMsgId = systemMessageRef.id;

    await db.runTransaction(async (t) => {
      const chatDoc = await t.get(chatRef);
      const userChatsDoc = await t.get(userChatsRef);
      const memberDoc = await t.get(memberRef);

      if (!chatDoc.exists) {
        throw new Error("Nhóm không tồn tại");
      }

      const chatData = chatDoc.data();

      if (!chatData.members.includes(requesterId)) {
        throw new Error("Bạn không có quyền thêm thành viên");
      }

      if (chatData.members.includes(newMemberId)) {
        throw new Error("Người này đã ở trong nhóm");
      }

      const memberName = memberDoc.exists
        ? memberDoc.data().displayName || "Thành viên mới"
        : "Thành viên mới";

      t.update(chatRef, {
        members: FieldValue.arrayUnion(newMemberId),
        lastMessage: `đã thêm ${memberName} vào nhóm`,
        updatedAt: FieldValue.serverTimestamp(),
        lastSenderId: requesterId,
      });

      const systemText = `đã thêm ${memberName} vào nhóm.`;
      const systemMessage = {
        id: systemMsgId,
        text: systemText,
        senderId: requesterId,
        createdAt: Date.now(),
        type: "system",
        isSystem: true,
        viewedBy: [requesterId],
      };

      t.set(systemMessageRef, {
        ...systemMessage,
        createdAt: FieldValue.serverTimestamp(),
      });

      const newChatEntry = {
        chatId: chatId,
        lastMessage: "Bạn đã được thêm vào nhóm",
        lastSenderId: requesterId,
        isSeen: false,
        updatedAt: Date.now(),
        receiverId: null,
        type: "group",
        isGroup: true,
        groupName: chatData.groupName || "Group Chat",
        groupPhoto: chatData.groupPhoto || "",
        displayName: chatData.groupName || "Group Chat",
        photoURL: chatData.groupPhoto || "",
      };

      if (userChatsDoc.exists) {
        t.update(userChatsRef, {
          chats: FieldValue.arrayUnion(newChatEntry),
        });
      } else {
        t.set(userChatsRef, {
          chats: [newChatEntry],
        });
      }

      const roomName = `chat:${chatId}`;
      if (io) {
        io.to(roomName).emit("new-message", {
          chatId: chatId,
          message: systemMessage,
        });

        io.to(`user:${newMemberId}`).emit("update-sidebar", {
          chatId,
          lastMessage: "Bạn đã được thêm vào nhóm",
          updatedAt: Date.now(),
          lastSenderId: requesterId,
          isSeen: false,
          isGroup: true,
          groupName: chatData.groupName,
          groupPhoto: chatData.groupPhoto,
        });

        chatData.members.forEach((oldMemberId) => {
          io.to(`user:${oldMemberId}`).emit("update-sidebar", {
            chatId,
            lastMessage: systemText,
            updatedAt: Date.now(),
            lastSenderId: requesterId,
            isSeen: oldMemberId === requesterId,
            isGroup: true,
            groupName: chatData.groupName,
            groupPhoto: chatData.groupPhoto,
          });
        });
      }

      updateLastMessageBackground(chatId, systemText, requesterId).catch(
        (err) => console.error("Lỗi update lastMessage addMember:", err)
      );
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
    const io = req.app.get("socketio");

    const chatRef = db.collection("chats").doc(chatId);
    const memberRef = db.collection("users").doc(memberId);
    const userChatsRef = db.collection("userchats").doc(memberId);

    const systemMessageRef = chatRef.collection("messages").doc();
    const systemMsgId = systemMessageRef.id;

    let remainingMembers = [];

    await db.runTransaction(async (t) => {
      const chatDoc = await t.get(chatRef);
      const userChatsDoc = await t.get(userChatsRef);
      const memberDoc = await t.get(memberRef);

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

      const memberName = memberDoc.exists
        ? memberDoc.data().displayName || "Thành viên"
        : "Thành viên";

      const isSelf = requesterId === memberId;
      let systemText = "";
      if (isSelf) {
        systemText = `đã rời khỏi nhóm.`;
      } else {
        systemText = `đã mời ${memberName} ra khỏi nhóm.`;
      }

      remainingMembers = chatData.members.filter((uid) => uid !== memberId);
      t.update(chatRef, {
        members: FieldValue.arrayRemove(memberId),
        lastMessage: systemText,
        updatedAt: FieldValue.serverTimestamp(),
        lastSenderId: requesterId,
      });

      if (userChatsDoc.exists) {
        const userChatsData = userChatsDoc.data();
        const currentChats = userChatsData.chats || [];
        const updatedChats = currentChats.filter((c) => c.chatId !== chatId);
        t.update(userChatsRef, { chats: updatedChats });
      }

      const systemMessage = {
        id: systemMsgId,
        text: systemText,
        senderId: requesterId,
        createdAt: new Date(),
        type: "system",
        isSystem: true,
        viewedBy: remainingMembers,
      };

      t.set(systemMessageRef, {
        ...systemMessage,
        createdAt: FieldValue.serverTimestamp(),
      });

      if (io) {
        const roomName = `chat:${chatId}`;
        io.to(roomName).emit("new-message", {
          chatId: chatId,
          message: systemMessage,
        });

        if (!isSelf) {
          io.to(`user:${memberId}`).emit("kicked-from-group", {
            chatId,
            groupName: chatData.groupName,
          });
        } else {
          io.to(`user:${memberId}`).emit("chat-removed", {
            chatId,
          });
        }

        const sidebarData = {
          chatId,
          lastMessage: systemText,
          updatedAt: Date.now(),
          lastSenderId: requesterId,
          isSeen: false,
          isGroup: true,
          groupName: chatData.groupName,
          groupPhoto: chatData.groupPhoto,
        };

        remainingMembers.forEach((uid) => {
          io.to(`user:${uid}`).emit("update-sidebar", {
            ...sidebarData,
            isSeen: uid === requesterId,
          });
        });
      }

      if (remainingMembers.length > 0) {
        updateLastMessageBackground(chatId, systemText, requesterId).catch(
          (err) => console.error("Lỗi update lastMessage removeMember:", err)
        );
      }
    });

    return res
      .status(200)
      .json({ success: true, message: "Đã xóa thành viên" });
  } catch (error) {
    console.error("Error removing member:", error);
    return res.status(500).json({ error: error.message });
  }
};
