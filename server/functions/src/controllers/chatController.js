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
      groupPhoto: "https://cdn-icons-png.flaticon.com/512/166/166258.png", // Thêm ảnh mặc định
    });

    // Tạo data tóm tắt cho userchats
    const groupChatSummary = {
      chatId: newChatRef.id,
      displayName: groupName || "New Group",
      photoURL: "https://cdn-icons-png.flaticon.com/512/166/166258.png",
      lastMessage: "Nhóm đã được tạo",
      updatedAt: Date.now(), // Dùng Date.now() để sort ở frontend dễ hơn
      isSeen: false,
      type: "group", // QUAN TRỌNG: Frontend dựa vào cái này để render
    };

    // Update cho từng thành viên
    uniqueMemberIds.forEach((memberId) => {
      const userChatRef = db.collection("userchats").doc(memberId);

      // Dùng update để thêm vào mảng.
      // Nếu user chưa có userchats doc thì cần set trước (thường user đã có rồi)
      batch.update(userChatRef, {
        chats: FieldValue.arrayUnion({
          ...groupChatSummary,
          isSeen: memberId === currentUserId, // Người tạo thì coi như đã xem
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
