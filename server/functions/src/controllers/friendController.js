const { db, FieldValue } = require("../config/firebase");
const BlockCache = require("../../../cache/BlockCache");

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
    const partnerUid = req.body.targetUid;
    const io = req.app.get("socketio");

    if (!partnerUid) {
      return res.status(400).json({ error: "targetUid is required" });
    }

    const myRef = db.collection("users").doc(myUid);
    const partnerRef = db.collection("users").doc(partnerUid);
    const myUserChatRef = db.collection("userchats").doc(myUid);
    const partnerUserChatRef = db.collection("userchats").doc(partnerUid);
    let socketPayload = null;

    await db.runTransaction(async (t) => {
      const myDoc = await t.get(myRef);
      const partnerDoc = await t.get(partnerRef);
      const myUserChatDoc = await t.get(myUserChatRef);
      const partnerUserChatDoc = await t.get(partnerUserChatRef);

      if (!myDoc.exists || !partnerDoc.exists) {
        throw new Error("User không tồn tại");
      }

      const myData = myDoc.data();
      const partnerData = partnerDoc.data();

      const requestObject = (myData.friendRequests || []).find(
        (req) => req.uid === partnerUid
      );

      if (!requestObject) {
        throw new Error("Lời mời kết bạn không tồn tại hoặc đã bị hủy.");
      }

      let finalChatId = null;
      let isNewChat = false;

      const myChats = myUserChatDoc.exists
        ? myUserChatDoc.data().chats || []
        : [];
      const partnerChats = partnerUserChatDoc.exists
        ? partnerUserChatDoc.data().chats || []
        : [];

      const existingChat = myChats.find((c) => c.receiverId === partnerUid);

      if (existingChat) {
        finalChatId = existingChat.chatId;
      } else {
        const newChatRef = db.collection("chats").doc();
        finalChatId = newChatRef.id;
        isNewChat = true;

        t.set(newChatRef, {
          createdAt: FieldValue.serverTimestamp(),
          messages: [],
        });
      }

      if (!existingChat) {
        t.set(
          myUserChatRef,
          {
            chats: FieldValue.arrayUnion({
              chatId: finalChatId,
              receiverId: partnerUid,
              updatedAt: Date.now(),
              lastMessage: "",
            }),
          },
          { merge: true }
        );
      }

      const partnerExistingChat = partnerChats.find(
        (c) => c.receiverId === myUid
      );
      if (!partnerExistingChat) {
        t.set(
          partnerUserChatRef,
          {
            chats: FieldValue.arrayUnion({
              chatId: finalChatId,
              receiverId: myUid,
              updatedAt: Date.now(),
              lastMessage: "",
            }),
          },
          { merge: true }
        );
      }

      t.update(myRef, {
        friendRequests: FieldValue.arrayRemove(requestObject),
        friends: FieldValue.arrayUnion(partnerUid),
      });

      t.update(partnerRef, {
        sentRequests: FieldValue.arrayRemove(myUid),
        friends: FieldValue.arrayUnion(myUid),
      });

      socketPayload = {
        chatId: finalChatId,
        lastMessage: "",
        updatedAt: Date.now(),
        senderId: myUid,
        senderInfo: {
          displayName: myData.displayName,
          photoURL: myData.photoURL,
        },
        partnerInfo: {
          displayName: partnerData.displayName,
          photoURL: partnerData.photoURL,
        },
      };
    });

    if (io && socketPayload) {
      io.to(`user:${myUid}`).emit("update-sidebar", {
        ...socketPayload,
        receiverId: partnerUid,
        displayName: socketPayload.partnerInfo.displayName,
        photoURL: socketPayload.partnerInfo.photoURL,
        isSeen: true,
      });

      // Gửi cho người kia
      io.to(`user:${partnerUid}`).emit("update-sidebar", {
        ...socketPayload,
        isSeen: false,
        receiverId: myUid,
        displayName: socketPayload.senderInfo.displayName,
        photoURL: socketPayload.senderInfo.photoURL,
      });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Error accepting friend request:", error);
    const statusCode = error.message.includes("không tồn tại") ? 404 : 500;
    return res.status(statusCode).json({ error: error.message });
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
    const io = req.app.get("socketio");

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
    BlockCache.addBlock(myUid, targetUid);
    io.to(`user:${targetUid}`).emit("relationship-updated", {
      type: "blocked",
      byUser: myUid,
    });

    io.to(`user:${myUid}`).emit("relationship-updated", {
      type: "block_sent",
      toUser: targetUid,
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
    const io = req.app.get("socketio");

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
    BlockCache.removeBlock(myUid, targetUid);
    io.to(`user:${targetUid}`).emit("relationship-updated", {
      type: "unblocked",
      byUser: myUid,
    });

    return res
      .status(200)
      .json({ success: true, message: "Unblocked successfully" });
  } catch (error) {
    console.error("Error unblocking user:", error);
    return res.status(500).json({ error: error.message });
  }
};
