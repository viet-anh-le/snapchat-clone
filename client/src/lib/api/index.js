/**
 * API Module - Main Export
 * Exports all API services and utilities
 */

// Export services
export { chatService, ChatService } from "./services/chat.service";
export { friendService, FriendService } from "./services/friend.service";

// Export API client
export { apiClient, ApiClient } from "./apiClient";

// Export axios instance for advanced usage
export { default as axiosInstance } from "./axios.config";
