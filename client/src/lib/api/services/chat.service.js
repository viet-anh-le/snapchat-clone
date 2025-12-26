import { apiClient } from "../apiClient";
import { auth } from "../../firebase";

/**
 * Chat Service
 * Handles all chat-related API calls
 */
class ChatService {
  /**
   * Create a new group chat
   * @param {Array<string>} selectedUsers - Array of user IDs to add to the group
   * @param {string} groupName - Name of the group
   * @returns {Promise<Object>} Created chat data
   */
  async createGroup(selectedUsers, groupName) {
    const user = auth.currentUser;
    if (!user) {
      throw new Error("User not authenticated");
    }

    return apiClient.post("/api/chat/create-group", {
      currentUserId: user.uid,
      selectedUsers,
      groupName,
    });
  }

  /**
   * Get chat by ID
   * @param {string} chatId - Chat ID
   * @returns {Promise<Object>} Chat data
   */
  async getChat(chatId) {
    return apiClient.get(`/api/chat/${chatId}`);
  }

  /**
   * Get all chats for current user
   * @returns {Promise<Array>} Array of chats
   */
  async getUserChats() {
    return apiClient.get("/api/chat/user-chats");
  }
}

// Export singleton instance
export const chatService = new ChatService();

// Export class for creating new instances if needed
export { ChatService };

