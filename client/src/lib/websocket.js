import { io } from "socket.io-client";
import { auth } from "./firebase";

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
  }

  connect() {
    if (this.socket?.connected) {
      console.log("✅ Socket already connected, reusing connection");
      return Promise.resolve();
    }

    // If socket exists but not connected, disconnect it first
    if (this.socket) {
      console.log("🔄 Disconnecting existing socket before reconnecting");
      this.socket.disconnect();
      this.socket = null;
    }

    return new Promise(async (resolve, reject) => {
      try {
        const user = auth.currentUser;
        if (!user) {
          reject(new Error("User not authenticated"));
          return;
        }

        const token = await user.getIdToken();
        const serverUrl =
          import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

        this.socket = io(serverUrl, {
          auth: {
            token: token,
          },
          transports: ["websocket", "polling"],
        });

        this.socket.on("connect", () => {
          console.log("✅ WebSocket connected, socket ID:", this.socket.id);
          this.isConnected = true;
          resolve();
        });

        this.socket.on("disconnect", () => {
          console.log("❌ WebSocket disconnected");
          this.isConnected = false;
        });

        this.socket.on("connect_error", (error) => {
          console.error("WebSocket connection error:", error);
          reject(error);
        });

        // Re-authenticate on token refresh
        auth.onAuthStateChanged(async (user) => {
          if (user && this.socket) {
            const newToken = await user.getIdToken();
            this.socket.auth.token = newToken;
            this.socket.disconnect().connect();
          }
        });
      } catch (error) {
        console.error("Error connecting WebSocket:", error);
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
      this.isConnected = false;
    }
  }

  // ========== CHAT METHODS ==========

  joinChat(chatId) {
    if (!this.socket) {
      console.warn("⚠️ Socket not initialized, cannot join chat");
      return;
    }
    if (!this.socket.connected) {
      console.warn(
        "⚠️ Socket not connected, cannot join chat. Will retry when connected."
      );
      // Retry when socket connects
      this.socket.once("connect", () => {
        console.log(`📱 Socket connected, retrying join chat: ${chatId}`);
        this.socket.emit("join-chat", chatId);
      });
      return;
    }
    console.log(
      `📱 Emitting join-chat for room: ${chatId}, socket connected: ${this.socket.connected}, socket ID: ${this.socket.id}`
    );
    this.socket.emit("join-chat", chatId);
    console.log(`✅ join-chat event emitted for chat: ${chatId}`);
  }

  leaveChat(chatId) {
    if (!this.socket?.connected) return;
    this.socket.emit("leave-chat", chatId);
  }

  sendMessage(chatId, text, type = "text", img = null) {
    if (!this.socket?.connected) {
      console.warn("⚠️ Socket not connected, cannot send message");
      return;
    }
    console.log("📤 Emitting send-message:", { chatId, text, type, img });
    this.socket.emit("send-message", { chatId, text, type, img });
  }

  viewSnap(chatId, messageId) {
    if (!this.socket?.connected) return;
    this.socket.emit("view-snap", { chatId, messageId });
  }

  markChatAsSeen(chatId) {
    if (!this.socket?.connected) {
      console.warn("⚠️ Socket not connected, cannot mark chat as seen");
      return;
    }
    console.log(`👁️ Marking chat ${chatId} as seen`);
    this.socket.emit("mark-chat-seen", { chatId });
  }

  deleteMessage(chatId, messageId) {
    if (!this.socket?.connected) {
      console.warn("⚠️ Socket not connected, cannot delete message");
      return;
    }
    console.log("🗑️ Requesting delete-message", { chatId, messageId });
    this.socket.emit("delete-message", { chatId, messageId });
  }

  onNewMessage(callback) {
    // Set up listener immediately if socket exists and is connected
    if (this.socket && this.socket.connected) {
      console.log("✅ Setting up new-message listener (socket ready)");
      this.socket.on("new-message", callback);
      return () => {
        console.log("🗑️ Removing new-message listener");
        this.socket.off("new-message", callback);
      };
    }

    // If socket not ready, set up when it connects
    const setupListener = () => {
      if (this.socket) {
        console.log("✅ Setting up new-message listener (after connection)");
        this.socket.on("new-message", callback);
      }
    };

    // Try to set up immediately if socket exists
    if (this.socket) {
      // Socket exists but not connected, wait for connect
      this.socket.once("connect", setupListener);
    } else {
      // Wait for socket to be created
      const checkSocket = setInterval(() => {
        if (this.socket) {
          if (this.socket.connected) {
            setupListener();
          } else {
            this.socket.once("connect", setupListener);
          }
          clearInterval(checkSocket);
        }
      }, 100);

      // Cleanup after 10 seconds
      setTimeout(() => clearInterval(checkSocket), 10000);
    }

    return () => {
      if (this.socket) {
        console.log("🗑️ Removing new-message listener");
        this.socket.off("new-message", callback);
      }
    };
  }

  onSnapViewed(callback) {
    if (!this.socket) return () => {};
    this.socket.on("snap-viewed", callback);
    return () => this.socket.off("snap-viewed", callback);
  }

  onMessageDeleted(callback) {
    if (!this.socket) return () => {};
    this.socket.on("message-deleted", callback);
    return () => this.socket.off("message-deleted", callback);
  }

  onJoinedChat(callback) {
    if (!this.socket) return () => {};
    this.socket.on("joined-chat", callback);
    return () => this.socket.off("joined-chat", callback);
  }

  onError(callback) {
    if (!this.socket) return () => {};
    this.socket.on("error", callback);
    return () => this.socket.off("error", callback);
  }

  // ========== Typing ================
  sendTyping(chatId) {
    if (this.socket) {
      this.socket.emit("typing", { chatId });
    }
  }

  sendStopTyping(chatId) {
    if (this.socket) this.socket.emit("stop-typing", { chatId });
  }

  onTypingStatus(callback) {
    if (!this.socket) return () => {};

    const handleStart = (data) => {
      callback({ type: "start", ...data });
    };

    const handleStop = (data) => {
      callback({ type: "stop", ...data });
    };

    this.socket.on("user-typing", handleStart);
    this.socket.on("user-stop-typing", handleStop);

    return () => {
      this.socket?.off("user-typing", handleStart);
      this.socket?.off("user-stop-typing", handleStop);
    };
  }

  // ========== WEBRTC METHODS ==========

  joinVideoRoom(roomId, profile = {}) {
    if (!this.socket?.connected) return;
    // Send payload object (new format) while remaining compatible with legacy server handlers
    this.socket.emit("join-video-room", { roomId, profile });
  }

  leaveVideoRoom(roomId) {
    if (!this.socket?.connected) return;
    this.socket.emit("leave-video-room", roomId);
  }

  sendWebRTCOffer(offer, targetUserId, roomId) {
    if (!this.socket?.connected) return;
    this.socket.emit("webrtc-offer", { offer, targetUserId, roomId });
  }

  sendWebRTCAnswer(answer, targetUserId, roomId) {
    if (!this.socket?.connected) return;
    this.socket.emit("webrtc-answer", { answer, targetUserId, roomId });
  }

  sendICECandidate(candidate, targetUserId, roomId) {
    if (!this.socket?.connected) return;
    this.socket.emit("webrtc-ice-candidate", {
      candidate,
      targetUserId,
      roomId,
    });
  }

  updateMediaPreference(roomId, preference) {
    if (!this.socket?.connected) return;
    this.socket.emit("update-media-preference", { roomId, preference });
  }

  // Send incoming call notification
  sendIncomingCall(targetUserId, callData) {
    if (!this.socket?.connected) {
      console.warn("⚠️ Socket not connected, cannot send incoming call");
      return;
    }
    const payload = {
      targetUserId,
      ...callData,
    };
    console.log(
      `📞 [CLIENT] Sending incoming call to ${targetUserId}:`,
      payload
    );
    this.socket.emit("incoming-call", payload);
    console.log(`✅ [CLIENT] incoming-call event emitted`);
  }

  // Cancel outgoing call before it is answered
  sendCallCancel(targetUserId, roomId, chatId) {
    if (!this.socket?.connected) {
      console.warn("⚠️ Socket not connected, cannot cancel call");
      return;
    }
    const payload = { targetUserId, roomId, chatId };
    console.log("📞 [CLIENT] Cancelling call:", payload);
    this.socket.emit("cancel-call", payload);
  }

  // Callee declines the call
  sendCallDecline(targetUserId, roomId, chatId) {
    if (!this.socket?.connected) {
      console.warn("⚠️ Socket not connected, cannot decline call");
      return;
    }
    const payload = { targetUserId, roomId, chatId };
    console.log("📞 [CLIENT] Declining call:", payload);
    this.socket.emit("call-decline", payload);
  }

  // Listen for incoming calls
  onIncomingCall(callback) {
    if (!this.socket) {
      console.warn(
        "⚠️ Socket not initialized, cannot setup incoming call listener"
      );
      return () => {};
    }

    console.log("✅ [CLIENT] Setting up incoming-call listener");
    const handler = (data) => {
      console.log("📞 [CLIENT] Received incoming-call event:", data);
      callback(data);
    };
    this.socket.on("incoming-call", handler);

    return () => {
      console.log("🗑️ [CLIENT] Removing incoming-call listener");
      this.socket.off("incoming-call", handler);
    };
  }

  // Listen for caller cancellations
  onCallCancelled(callback) {
    if (!this.socket) {
      console.warn(
        "⚠️ Socket not initialized, cannot setup call-cancelled listener"
      );
      return () => {};
    }

    console.log("✅ [CLIENT] Setting up call-cancelled listener");
    const handler = (data) => {
      console.log("📞 [CLIENT] Received call-cancelled event:", data);
      callback(data);
    };
    this.socket.on("call-cancelled", handler);

    return () => {
      console.log("🗑️ [CLIENT] Removing call-cancelled listener");
      this.socket.off("call-cancelled", handler);
    };
  }

  // Listen for callee decline
  onCallDeclined(callback) {
    if (!this.socket) {
      console.warn(
        "⚠️ Socket not initialized, cannot setup call-declined listener"
      );
      return () => {};
    }

    console.log("✅ [CLIENT] Setting up call-declined listener");
    const handler = (data) => {
      console.log("📞 [CLIENT] Received call-declined event:", data);
      callback(data);
    };
    this.socket.on("call-declined", handler);

    return () => {
      console.log("🗑️ [CLIENT] Removing call-declined listener");
      this.socket.off("call-declined", handler);
    };
  }

  // Caller/callee ends the call while in room
  sendCallEnd(targetUserId, roomId, chatId, payload = {}) {
    if (!this.socket?.connected) {
      console.warn("⚠️ Socket not connected, cannot end call");
      return;
    }
    const data = { targetUserId, roomId, chatId, ...payload };
    console.log("📞 [CLIENT] Ending call:", data);
    this.socket.emit("call-ended", data);
  }

  onCallEnded(callback) {
    if (!this.socket) {
      console.warn(
        "⚠️ Socket not initialized, cannot setup call-ended listener"
      );
      return () => {};
    }

    console.log("✅ [CLIENT] Setting up call-ended listener");
    const handler = (data) => {
      console.log("📞 [CLIENT] Received call-ended event:", data);
      callback(data);
    };
    this.socket.on("call-ended", handler);

    return () => {
      console.log("🗑️ [CLIENT] Removing call-ended listener");
      this.socket.off("call-ended", handler);
    };
  }

  // WebRTC Event Listeners
  onUserJoined(callback) {
    if (!this.socket) return () => {};
    this.socket.on("user-joined", callback);
    return () => this.socket.off("user-joined", callback);
  }

  onUserLeft(callback) {
    if (!this.socket) return () => {};
    this.socket.on("user-left", callback);
    return () => this.socket.off("user-left", callback);
  }

  onRoomParticipants(callback) {
    if (!this.socket) return () => {};
    this.socket.on("room-participants", callback);
    return () => this.socket.off("room-participants", callback);
  }

  onWebRTCOffer(callback) {
    if (!this.socket) return () => {};
    this.socket.on("webrtc-offer", callback);
    return () => this.socket.off("webrtc-offer", callback);
  }

  onWebRTCAnswer(callback) {
    if (!this.socket) return () => {};
    this.socket.on("webrtc-answer", callback);
    return () => this.socket.off("webrtc-answer", callback);
  }

  onICECandidate(callback) {
    if (!this.socket) return () => {};
    this.socket.on("webrtc-ice-candidate", callback);
    return () => this.socket.off("webrtc-ice-candidate", callback);
  }

  onMediaPreferenceUpdated(callback) {
    if (!this.socket) return () => {};
    this.socket.on("media-preference-updated", callback);
    return () => this.socket.off("media-preference-updated", callback);
  }
}

// Export singleton instance
export const websocketService = new WebSocketService();
