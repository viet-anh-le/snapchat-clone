/**
 * Legacy API Service - Re-exported from new API structure
 * This file maintains backward compatibility while using the new axios-based API
 */

// Import services directly to avoid circular dependency
import { chatService } from "./api/services/chat.service";
import { friendService } from "./api/services/friend.service";
import { apiClient, ApiClient } from "./api/apiClient";
import axiosInstance from "./api/axios.config";

// Export services directly (not from ./api to avoid circular dependency)
export { chatService, friendService };

// Export API client and axios instance
export { apiClient, ApiClient, axiosInstance };

/**
 * Legacy API Service (for backward compatibility)
 * This maintains the old ApiService interface while using axios under the hood
 */
class ApiService {
  // Chat APIs
  async createGroup(selectedUsers, groupName) {
    return chatService.createGroup(selectedUsers, groupName);
  }

  // Friend APIs
  async sendFriendRequest(targetUid) {
    return friendService.sendFriendRequest(targetUid);
  }

  async acceptFriendRequest(targetUid) {
    return friendService.acceptFriendRequest(targetUid);
  }

  async rejectFriendRequest(targetUid) {
    return friendService.rejectFriendRequest(targetUid);
  }

  async blockUser(targetUid) {
    return friendService.blockUser(targetUid);
  }
}

export const apiService = new ApiService();
