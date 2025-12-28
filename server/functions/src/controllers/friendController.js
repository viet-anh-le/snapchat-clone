const { db, FieldValue } = require("../config/firebase");

// API 1: Gửi lời mời kết bạn
exports.sendFriendRequest = async (req, res) => {
  try {
    const senderUid = req.user.uid;
    const receiverUid = req.body.targetUid;

    if (!receiverUid) {
      return res.status(400).json({ error: "targetUid is required" });
    }

    const senderRef = db.collection("users").doc(senderUid);
    const receiverRef = db.collection("users").doc(receiverUid);

    const senderDoc = await db.collection("users").doc(senderUid).get();
    const receiverDoc = await db.collection("users").doc(receiverUid).get();

    if (!receiverDoc.exists) {
      return res.status(404).json({ error: "Người dùng không tồn tại." });
    }

    const senderData = senderDoc.data();
    const receiverData = receiverDoc.data();

    if (senderData.friends && senderData.friends.includes(receiverUid)) {
      return res.status(400).json({ error: "Đã là bạn bè rồi." });
    }

    if (
      senderData.sentRequests &&
      senderData.sentRequests.includes(receiverUid)
    ) {
      return res.status(400).json({ error: "Đã gửi lời mời rồi." });
    }

    const hasIncomingRequest = (senderData.friendRequests || []).some(
      (req) => req.uid === receiverUid
    );
    if (hasIncomingRequest) {
      return res.status(400).json({
        error: "Người này đã gửi lời mời cho bạn. Hãy kiểm tra tab Requests.",
      });
    }

    if (receiverData.blocked && receiverData.blocked.includes(senderUid)) {
      return res.status(403).json({ error: "Bạn không thể gửi lời mời." });
    }

    await db.runTransaction(async (transaction) => {
      transaction.update(receiverRef, {
        friendRequests: FieldValue.arrayUnion({
          uid: senderUid,
          displayName: senderData.displayName || "Unknown",
          email: senderData.email || "",
          photoURL: senderData.photoURL || "",
        }),
      });

      transaction.update(senderRef, {
        sentRequests: FieldValue.arrayUnion(receiverUid),
      });
    });

    return res.status(200).json({ message: "Success" });
  } catch (error) {
    console.error("Error sending friend request:", error);
    return res.status(500).json({ error: error.message });
  }
};

// API 2: Chấp nhận kết bạn
exports.acceptFriendRequest = async (req, res) => {
  try {
    const myUid = req.user.uid;
    const partnerUid = req.body.targetUid; // ID người gửi lời mời (người mình sắp accept)

    if (!partnerUid) {
      return res.status(400).json({ error: "targetUid is required" });
    }

    const myRef = db.collection("users").doc(myUid);
    const partnerRef = db.collection("users").doc(partnerUid);
    const myUserChatRef = db.collection("userchats").doc(myUid);
    const partnerUserChatRef = db.collection("userchats").doc(partnerUid);

    const myDoc = await db.collection("users").doc(myUid).get();
    const partnerDoc = await db.collection("users").doc(partnerUid).get();

    if (!myDoc.exists || !partnerDoc.exists) {
      return res.status(404).json({ error: "User không tồn tại" });
    }

    const myData = myDoc.data();

    // 1. TÌM OBJECT REQUEST CŨ ĐỂ XÓA
    const requestObject = (myData.friendRequests || []).find(
      (req) => req.uid === partnerUid
    );

    if (!requestObject) {
      return res.status(404).json({
        error: "Lời mời kết bạn không tồn tại hoặc đã bị hủy.",
      });
    }

    const chatRef = db.collection("chats").doc();

    await db.runTransaction(async (t) => {
      // 2. Tạo Chat Room mới
      t.set(chatRef, {
        createdAt: FieldValue.serverTimestamp(),
        messages: [],
      });

      // 3. Update UserChats cho MÌNH
      t.set(
        myUserChatRef,
        {
          chats: FieldValue.arrayUnion({
            chatId: chatRef.id,
            receiverId: partnerUid,
            updatedAt: Date.now(),
            lastMessage: "",
          }),
        },
        { merge: true }
      );

      // 4. Update UserChats cho ĐỐI PHƯƠNG
      t.set(
        partnerUserChatRef,
        {
          chats: FieldValue.arrayUnion({
            chatId: chatRef.id,
            receiverId: myUid,
            updatedAt: Date.now(),
            lastMessage: "",
          }),
        },
        { merge: true }
      );

      // 5. DỌN DẸP REQUEST
      t.update(myRef, {
        friendRequests: FieldValue.arrayRemove(requestObject),
      });

      t.update(partnerRef, {
        sentRequests: FieldValue.arrayRemove(myUid),
      });

      t.update(myRef, {
        friends: FieldValue.arrayUnion(partnerUid),
      });

      t.update(partnerRef, {
        friends: FieldValue.arrayUnion(myUid),
      });
    });

    return res.status(200).json({ success: true, chatId: chatRef.id });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    return res.status(500).json({ error: error.message });
  }
};

// API 3: Từ chối lời mời kết bạn
exports.rejectFriendRequest = async (req, res) => {
  try {
    const myUid = req.user.uid;
    const partnerUid = req.body.targetUid;

    if (!partnerUid) {
      return res.status(400).json({ error: "targetUid is required" });
    }

    const myRef = db.collection("users").doc(myUid);
    const partnerRef = db.collection("users").doc(partnerUid);

    const myDoc = await db.collection("users").doc(myUid).get();
    if (!myDoc.exists) {
      return res.status(404).json({ error: "User không tồn tại" });
    }

    const myData = myDoc.data();
    const requestObject = (myData.friendRequests || []).find(
      (req) => req.uid === partnerUid
    );

    if (!requestObject) {
      return res.status(200).json({ success: true });
    }

    await db.runTransaction(async (t) => {
      t.update(myRef, {
        friendRequests: FieldValue.arrayRemove(requestObject),
      });

      t.update(partnerRef, {
        sentRequests: FieldValue.arrayRemove(myUid),
      });
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error rejecting friend request:", error);
    return res.status(500).json({ error: error.message });
  }
};

// --- API 4: Block User ---
exports.blockUser = async (req, res) => {
  try {
    const myUid = req.user.uid;
    const targetUid = req.body.targetUid;

    if (!targetUid) {
      return res.status(400).json({ error: "targetUid is required" });
    }

    const myRef = db.collection("users").doc(myUid);
    const targetRef = db.collection("users").doc(targetUid);

    const myDoc = await myRef.get();
    const targetDoc = await targetRef.get();

    if (!myDoc.exists || !targetDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    const myData = myDoc.data();
    const requestObject = (myData.friendRequests || []).find(
      (req) => req.uid === targetUid
    );

    await db.runTransaction(async (t) => {
      t.update(myRef, {
        blocked: FieldValue.arrayUnion(targetUid),
        friends: FieldValue.arrayRemove(targetUid),
        sentRequests: FieldValue.arrayRemove(targetUid),
      });

      if (requestObject) {
        t.update(myRef, {
          friendRequests: FieldValue.arrayRemove(requestObject),
        });
      }

      t.update(targetRef, {
        friends: FieldValue.arrayRemove(myUid),
        sentRequests: FieldValue.arrayRemove(myUid),
      });
    });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error blocking user:", error);
    return res.status(500).json({ error: error.message });
  }
};

// --- API 5: Unblock User ---
exports.unblockUser = async (req, res) => {
  try {
    const myUid = req.user.uid;
    const targetUid = req.body.targetUid;

    if (!targetUid) {
      return res.status(400).json({ error: "targetUid is required" });
    }

    const myRef = db.collection("users").doc(myUid);

    const myDoc = await myRef.get();
    if (!myDoc.exists) {
      return res.status(404).json({ error: "User not found" });
    }

    await myRef.update({
      blocked: FieldValue.arrayRemove(targetUid),
    });

    return res
      .status(200)
      .json({ success: true, message: "Unblocked successfully" });
  } catch (error) {
    console.error("Error unblocking user:", error);
    return res.status(500).json({ error: error.message });
  }
};
