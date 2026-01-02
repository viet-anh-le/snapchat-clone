const { db } = require("../functions/src/config/firebase");

const blockCache = new Map();

module.exports = {
  loadUserBlockList: async (userId) => {
    if (blockCache.has(userId)) return;

    try {
      if (!userId || typeof userId !== "string") {
        console.warn("[BlockCache] Skipping load for invalid userId:", userId);
        return;
      }
      const userDoc = await db.collection("users").doc(userId).get();
      const blockedList = userDoc.data()?.blocked || [];
      blockCache.set(userId, new Set(blockedList));
      console.log(`[Cache] Loaded blocked list for offline user: ${userId}`);
    } catch (e) {
      console.error("Error loading block list", e);
      blockCache.set(userId, new Set());
    }
  },

  checkBlockedStatus: async (senderId, receiverId) => {
    if (!senderId || !receiverId) {
      return false;
    }
    if (!blockCache.has(senderId)) {
      await module.exports.loadUserBlockList(senderId);
    }
    if (!blockCache.has(receiverId)) {
      await module.exports.loadUserBlockList(receiverId);
    }

    const senderBlocked = blockCache.get(senderId);
    const receiverBlocked = blockCache.get(receiverId);

    if (receiverBlocked && receiverBlocked.has(senderId)) return true;

    if (senderBlocked && senderBlocked.has(receiverId)) return true;

    return false;
  },

  addBlock: (blockerId, blockedId) => {
    if (!blockCache.has(blockerId)) {
      blockCache.set(blockerId, new Set());
    }
    blockCache.get(blockerId).add(blockedId);
    console.log(`[Cache] Added block: ${blockerId} blocked ${blockedId}`);
  },

  removeBlock: (blockerId, blockedId) => {
    if (blockCache.has(blockerId)) {
      const blockedSet = blockCache.get(blockerId);
      if (blockedSet.has(blockedId)) {
        blockedSet.delete(blockedId);
        console.log(
          `[Cache] Removed block: ${blockerId} unblocked ${blockedId}`
        );
      }
    }
  },

  isBlockedSync: (senderId, receiverId) => {
    if (blockCache.has(receiverId) && blockCache.get(receiverId).has(senderId))
      return true;
    if (blockCache.has(senderId) && blockCache.get(senderId).has(receiverId))
      return true;
    return false;
  },

  clearUserCache: (userId) => {
    blockCache.delete(userId);
  },
};
