import { apiClient } from "../apiClient";

/**
 * Friend Service
 * Handles all friend-related API calls
 */
class FriendService {
  /**
   * Send a friend request
   * @param {string} targetUid - Target user ID
   * @returns {Promise<Object>} Response data
   */
  async sendFriendRequest(targetUid) {
    return apiClient.post("/api/friends/send-request", {
      targetUid,
    });
  }

  /**
   * Accept a friend request
   * @param {string} targetUid - Target user ID
   * @returns {Promise<Object>} Response data
   */
  async acceptFriendRequest(targetUid) {
    return apiClient.post("/api/friends/accept-request", {
      targetUid,
    });
  }

  /**
   * Reject a friend request
   * @param {string} targetUid - Target user ID
   * @returns {Promise<Object>} Response data
   */
  async rejectFriendRequest(targetUid) {
    return apiClient.post("/api/friends/reject-request", {
      targetUid,
    });
  }

  /**
   * Block a user
   * @param {string} targetUid - Target user ID
   * @returns {Promise<Object>} Response data
   */
  async blockUser(targetUid) {
    return apiClient.post("/api/friends/block", {
      targetUid,
    });
  }

  /**
   * Unblock a user
   * @param {string} targetUid - Target user ID
   * @returns {Promise<Object>} Response data
   */
  async unblockUser(targetUid) {
    return apiClient.post("/api/friends/unblock", {
      targetUid,
    });
  }

  /**
   * Get friend list
   * @returns {Promise<Array>} Array of friends
   */
  async getFriends() {
    return apiClient.get("/api/friends/list");
  }

  /**
   * Get pending friend requests
   * @returns {Promise<Object>} Object with sent and received requests
   */
  async getPendingRequests() {
    return apiClient.get("/api/friends/pending");
  }
}

// Export singleton instance
export const friendService = new FriendService();

// Export class for creating new instances if needed
export { FriendService };

