import { io } from "socket.io-client";
import { auth } from "./firebase";

class WebSocketService {
  constructor() {
    this.socket = null;
    this.isConnected = false;
    this.listeners = new Map();
    this.isConnecting = false;
  }

  async connect() {
    if (this.isConnecting) return Promise.resolve();

    if (this.socket?.connected) {
      return Promise.resolve();
    }

    this.isConnecting = true;

    if (this.socket) {
      this.socket.connect();
      return new Promise((resolve, reject) => {
        const onConnect = () => {
          cleanup();
          resolve();
        };
        const onError = (err) => {
          cleanup();
          this.isConnecting = false;
          reject(err);
        };
        const cleanup = () => {
          this.socket.off("connect", onConnect);
          this.socket.off("connect_error", onError);
        };
        this.socket.once("connect", onConnect);
        this.socket.once("connect_error", onError);
      });
    }

    return new Promise(async (resolve, reject) => {
      try {
        const user = auth.currentUser;
        if (!user) {
          this.isConnecting = false;
          return;
        }

        const token = await user.getIdToken();
        const serverUrl =
          import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

        this.socket = io(serverUrl, {
          auth: { token },
          transports: ["websocket", "polling"],
          reconnection: true,
          reconnectionAttempts: 5,
        });

        if (this.authUnsubscribe) {
          this.authUnsubscribe();
          this.authUnsubscribe = null;
        }

        if (!this.authUnsubscribe) {
          this.authUnsubscribe = auth.onAuthStateChanged(async (u) => {
            if (u && this.socket) {
              try {
                const newToken = await u.getIdToken();
                if (this.socket.auth && this.socket.auth.token === newToken) {
                  return;
                }
                console.log("Token changed, updating socket auth...");
                this.socket.auth.token = newToken;
              } catch (e) {
                console.error("Token refresh error", e);
              }
            }
          });
        }

        this.socket.on("connect", () => {
          console.log("Socket Connected ID:", this.socket.id);
          this.isConnected = true;
          this.isConnecting = false;
          resolve();
        });

        this.socket.on("disconnect", (reason) => {
          console.log("Socket Disconnected:", reason);
          this.isConnected = false;
        });

        this.socket.on("connect_error", (error) => {
          console.error("Socket Connection Error:", error.message);
          this.isConnecting = false;
          reject(error);
        });
      } catch (error) {
        console.error("Error setup WebSocket:", error);
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  disconnect() {
    if (this.authUnsubscribe) {
      this.authUnsubscribe();
      this.authUnsubscribe = null;
    }

    if (this.socket) {
      this.socket.disconnect();
      if (this.socket.auth) this.socket.auth.token = null;
      this.socket = null;
      this.isConnected = false;
      this.isConnecting = false;
      console.log("[WebSocket] Disconnected completely.");
    }
  }
  _waitForConnection(callback) {
    if (this.socket?.connected) {
      callback();
      return;
    }
    if (this.socket) {
      const onConnect = () => {
        cleanup();
        callback();
      };

      const onError = (err) => {
        cleanup();
      };

      const cleanup = () => {
        this.socket.off("connect", onConnect);
        this.socket.off("connect_error", onError);
      };

      this.socket.once("connect", onConnect);
      this.socket.once("connect_error", onError);
      return;
    }

    const checkInterval = setInterval(() => {
      if (this.socket) {
        clearInterval(checkInterval);
        this._waitForConnection(callback);
      }
    }, 100);

    setTimeout(() => {
      if (!this.socket) {
        clearInterval(checkInterval);
      }
    }, 5000);
  }
  // ========== CHAT METHODS ==========

  joinChat(chatId) {
    this._waitForConnection(() => {
      this.socket.emit("join-chat", chatId);
    });
  }

  leaveChat(chatId) {
    if (!this.socket?.connected) return;
    this.socket.emit("leave-chat", chatId);
  }

  sendMessage(
    chatId,
    text,
    type = "text",
    img = null,
    receiverId,
    members = []
  ) {
    this._waitForConnection(() => {
      this.socket.emit("send-message", {
        chatId,
        text,
        type,
        img,
        receiverId,
        members,
      });
    });
  }

  viewSnap(chatId, messageId) {
    this._waitForConnection(() => {
      this.socket.emit("view-snap", { chatId, messageId });
    });
  }

  markChatAsSeen(chatId) {
    this._waitForConnection(() => {
      this.socket.emit("mark-chat-seen", { chatId });
    });
  }

  deleteMessage(chatId, messageId, userDisplayName, receiverId, members = []) {
    this._waitForConnection(() => {
      this.socket.emit("delete-message", {
        chatId,
        messageId,
        userDisplayName,
        receiverId,
        members,
      });
    });
  }

  onMessageDeleted(callback) {
    const handler = (data) => callback(data);
    this._waitForConnection(() => {
      this.socket.on("message-deleted", handler);
    });
    return () => this.socket?.off("message-deleted", handler);
  }

  onNewMessage(callback) {
    const handler = (data) => callback(data);
    this._waitForConnection(() => {
      this.socket.on("new-message", handler);
    });
    return () => this.socket?.off("new-message", handler);
  }

  onUpdateSidebar(callback) {
    const handler = (data) => callback(data);
    this._waitForConnection(() => {
      this.socket.on("update-sidebar", handler);
    });
    return () => this.socket?.off("update-sidebar", handler);
  }
  onUserStatus(callback) {
    const handler = (data) => callback(data);
    this._waitForConnection(() => {
      this.socket.on("user-status", handler);
    });

    return () => this.socket?.off("user-status", handler);
  }

  requestOnlineUsers() {
    this._waitForConnection(() => {
      this.socket.emit("req-online-users");
    });
  }

  onGetOnlineUsers(callback) {
    const handler = (data) => callback(data);
    this._waitForConnection(() => {
      this.socket.on("get-users", handler);
    });
    return () => this.socket?.off("get-users", handler);
  }

  onSnapViewed(callback) {
    if (!this.socket) return () => {};
    const handler = (data) => callback(data);
    this._waitForConnection(() => {
      this.socket.on("snap-viewed", handler);
    });
    return () => this.socket.off("snap-viewed", handler);
  }

  onMessageUpdated(callback) {
    const handler = (data) => callback(data);
    this._waitForConnection(() => {
      this.socket?.on("message-updated", handler);
    });
    return () => this.socket?.off("message-updated", handler);
  }

  onJoinedChat(callback) {
    if (!this.socket) return () => {};
    const handler = (data) => callback(data);
    this._waitForConnection(() => {
      this.socket.on("joined-chat", handler);
    });
    return () => this.socket.off("joined-chat", handler);
  }

  onError(callback) {
    if (!this.socket) return () => {};
    this.socket.on("error", callback);
    return () => this.socket.off("error", callback);
  }

  // ========= Archived Message ==========
  archiveChat(chatId) {
    this._waitForConnection(() => {
      this.socket.emit("archive-chat", { chatId });
    });
  }

  unarchiveChat(chatId) {
    this._waitForConnection(() => {
      this.socket.emit("unarchive-chat", { chatId });
    });
  }

  onChatArchived(callback) {
    const handler = (data) => callback(data);
    this._waitForConnection(() => {
      this.socket.on("chat-archived-success", handler);
    });
    return () => this.socket?.off("chat-archived-success", handler);
  }

  onChatUnarchived(callback) {
    const handler = (data) => callback(data);
    this._waitForConnection(() => {
      this.socket.on("chat-unarchived-success", handler);
    });
    return () => this.socket?.off("chat-unarchived-success", handler);
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

  // ========== Group ===============
  onChatRemoved(callback) {
    const handler = (data) => callback(data);
    this._waitForConnection(() => {
      this.socket.on("kicked-from-group", handler);
      this.socket.on("chat-removed", handler);
    });
    return () => {
      this.socket?.off("kicked-from-group", handler);
      this.socket?.off("chat-removed", handler);
    };
  }

  // ========== React ===============
  sendReactionUpdate(chatId, messageId, reactionData) {
    this._waitForConnection(() => {
      this.socket.emit("send-reaction-update", {
        chatId,
        messageId,
        ...reactionData,
      });
    });
  }

  onReactionUpdated(callback) {
    if (!this.socket) return () => {};
    const handler = (data) => callback(data);
    this._waitForConnection(() => {
      this.socket.on("receive-reaction-update", handler);
    });
    return () => this.socket.off("receive-reaction-update", handler);
  }

  // ========== Relationship ===========
  onRelationShipUdate(callback) {
    if (!this.socket) return () => {};
    const handler = (data) => callback(data);
    this._waitForConnection(() => {
      this.socket.on("relationship-updated", handler);
    });
    return () => this.socket.off("relationship-updated", handler);
  }

  // ========== WEBRTC METHODS ==========

  joinVideoRoom(roomId, profile = {}) {
    if (!this.socket?.connected) return;
    this.socket.emit("join-video-room", { roomId, profile });
  }

  leaveVideoRoom(roomId, logData = {}) {
    if (!this.socket?.connected) return;
    const payload = {
      roomId,
      ...(logData || {}),
    };
    this.socket.emit("leave-video-room", payload);
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
      console.warn("Socket not connected, cannot send incoming call");
      return;
    }
    const payload = {
      targetUserId,
      ...callData,
    };
    this.socket.emit("incoming-call", payload);
  }

  // Cancel outgoing call before it is answered
  sendCallCancel(targetUserId, roomId, chatId, callType = "video") {
    if (!this.socket?.connected) {
      console.warn("Socket not connected, cannot cancel call");
      return;
    }
    const payload = { targetUserId, roomId, chatId, callType };
    this.socket.emit("cancel-call", payload);
  }

  // Callee declines the call
  sendCallDecline(targetUserId, roomId, chatId) {
    if (!this.socket?.connected) {
      console.warn("Socket not connected, cannot decline call");
      return;
    }
    const payload = { targetUserId, roomId, chatId };
    this.socket.emit("call-decline", payload);
  }

  // Listen for incoming calls
  onIncomingCall(callback) {
    const handler = (data) => callback(data);
    this._waitForConnection(() => {
      this.socket.on("incoming-call", handler);
    });
    return () => this.socket?.off("incoming-call", handler);
  }

  // Listen for caller cancellations
  onCallCancelled(callback) {
    const handler = (data) => {
      callback(data);
    };
    this._waitForConnection(() => {
      this.socket.on("call-cancelled", handler);
    });
    return () => {
      this.socket.off("call-cancelled", handler);
    };
  }

  // Listen for callee decline
  onCallDeclined(callback) {
    if (!this.socket) {
      console.warn(
        "Socket not initialized, cannot setup call-declined listener"
      );
      return () => {};
    }

    const handler = (data) => {
      callback(data);
    };
    this._waitForConnection(() => {
      this.socket.on("call-declined", handler);
    });
    return () => {
      this.socket.off("call-declined", handler);
    };
  }

  // Caller/callee ends the call while in room
  sendCallEnd(targetUserId, roomId, chatId, payload = {}) {
    if (!this.socket?.connected) {
      console.warn("Socket not connected, cannot end call");
      return;
    }
    const data = { targetUserId, roomId, chatId, ...payload };
    this.socket.emit("call-ended", data);
  }

  onCallEnded(callback) {
    if (!this.socket) {
      console.warn("Socket not initialized, cannot setup call-ended listener");
      return () => {};
    }

    const handler = (data) => {
      callback(data);
    };
    this._waitForConnection(() => {
      this.socket.on("call-ended", handler);
    });

    return () => {
      this.socket.off("call-ended", handler);
    };
  }

  // WebRTC Event Listeners
  onUserJoined(callback) {
    if (!this.socket) return () => {};
    const handler = (data) => {
      callback(data);
    };
    this._waitForConnection(() => {
      this.socket.on("user-joined", handler);
    });
    return () => this.socket.off("user-joined", handler);
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
