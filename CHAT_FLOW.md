# 📨 Luồng Chat - Hệ thống Real-time Messaging

## 🎯 Tổng quan

Hệ thống chat sử dụng **WebSocket (Socket.IO)** cho real-time communication và **Firestore** để lưu trữ dữ liệu persistent.

**Kiến trúc chính:**

- ⚡ **WebSocket**: Broadcast tin nhắn ngay lập tức (không chờ Firestore)
- 🔄 **Firestore**: Cập nhật ở background (non-blocking) - source of truth
- 🚀 **Optimistic Updates**: UI cập nhật ngay lập tức cho last message và unread indicator

---

## 📂 Các File Quan Trọng

### **Client Side:**

1. **`client/src/pages/Chat.jsx`** - Component chính hiển thị chat
2. **`client/src/lib/websocket.js`** - Service quản lý WebSocket connection
3. **`client/src/components/pages/chat/sidebar/ChatList.jsx`** - Danh sách chat badges với optimistic updates
4. **`client/src/components/pages/chat/sidebar/User.jsx`** - Badge hiển thị từng chat

### **Server Side:**

1. **`server/index.js`** - Server xử lý WebSocket events và REST API

---

## 🔄 Luồng Gửi Tin Nhắn

### **1. User nhập tin nhắn và nhấn Enter**

**File:** `client/src/pages/Chat.jsx` (dòng 117-126)

```javascript
const handleSend = async () => {
  if (!text || !text.trim()) return;
  const messageText = text;
  setText(""); // Clear input

  // Gửi qua WebSocket - server sẽ broadcast ngay lập tức
  websocketService.sendMessage(selectedChatId, messageText);
};
```

### **2. WebSocket Service gửi event đến server**

**File:** `client/src/lib/websocket.js` (dòng 112-119)

```javascript
sendMessage(chatId, text, type = "text", img = null) {
  if (!this.socket?.connected) {
    console.warn("⚠️ Socket not connected, cannot send message");
    return;
  }
  console.log("📤 Emitting send-message:", { chatId, text, type, img });
  this.socket.emit("send-message", { chatId, text, type, img });
}
```

**Event:** `send-message` được emit với data:

- `chatId`: ID của chat
- `text`: Nội dung tin nhắn
- `type`: Loại tin nhắn ("text" hoặc "snap")
- `img`: URL ảnh (nếu là snap)

### **3. Server nhận và xử lý tin nhắn**

**File:** `server/index.js` (dòng 273-425)

**Điểm quan trọng:** Server chỉ kiểm tra room membership và broadcast ngay lập tức. Tất cả logic verify access và update Firestore đều chạy ở background.

**Bước 3.1: Kiểm tra room membership (nhanh)**

```javascript
socket.on("send-message", (data) => {
  const { chatId, text, type = "text", img } = data;

  // Chỉ kiểm tra xem user đã join room chưa (nhanh)
  const roomName = `chat:${chatId}`;
  if (!socket.rooms.has(roomName)) {
    console.warn(`⚠️ User ${userId} tried to send to ${chatId} without joining room.`);
    return;
  }
```

**Bước 3.2: Tạo message object**

```javascript
const message = {
  id: crypto.randomUUID(),
  senderId: userId,
  text: type === "snap" ? "Sent a Snap" : text,
  img: img || null,
  type: type,
  viewedBy: [],
  createdAt: new Date(),
};
```

**Bước 3.3: Broadcast tin nhắn NGAY LẬP TỨC (không chờ Firestore)**

```javascript
// Broadcast ngay lập tức - không chờ verify access hay update Firestore
io.to(roomName).emit("new-message", {
  chatId,
  message: message,
});
```

**Bước 3.4: Tất cả logic còn lại chạy ở background (non-blocking)**

```javascript
  // Tất cả logic verify access và update Firestore chạy ở background
  (async () => {
    try {
      // 1. Verify access
      const chatDoc = await db.collection("chats").doc(chatId).get();
      if (!chatDoc.exists) {
        socket.emit("error", { message: "Chat not found" });
        return;
      }

      const chatData = chatDoc.data();

      // 2. Check access based on chat type
      let hasAccess = false;
      if (chatData.type === "group") {
        hasAccess = chatData.members && chatData.members.includes(userId);
      } else {
        const userChatsRef = db.collection("userchats").doc(userId);
        const userChatsDoc = await userChatsRef.get();
        if (userChatsDoc.exists) {
          const userChats = userChatsDoc.data().chats || [];
          hasAccess = userChats.some((chat) => chat.chatId === chatId);
        }
      }

      if (!hasAccess) {
        socket.emit("error", { message: "Access denied" });
        return;
      }

      // 3. Get member IDs
      let memberIds = [];
      if (chatData.type === "group") {
        memberIds = chatData.members || [];
      } else {
        // 1-1 chat: get receiver from sender's userchats
        const senderUserChatsRef = db.collection("userchats").doc(userId);
        const senderUserChatsDoc = await senderUserChatsRef.get();
        if (senderUserChatsDoc.exists) {
          const senderChats = senderUserChatsDoc.data().chats || [];
          const chatEntry = senderChats.find((chat) => chat.chatId === chatId);
          if (chatEntry && chatEntry.receiverId) {
            memberIds = [userId, chatEntry.receiverId];
          }
        }
      }

      // 4. Update userchats in parallel (non-blocking)
      memberIds.forEach((memberId) => {
        (async () => {
          try {
            const userChatsRef = db.collection("userchats").doc(memberId);
            const userChatsDoc = await userChatsRef.get();

            if (userChatsDoc.exists) {
              const userChatsData = userChatsDoc.data();
              const chats = userChatsData.chats || [];
              const chatIndex = chats.findIndex((c) => c.chatId === chatId);

              if (chatIndex !== -1) {
                const updatedChats = [...chats];
                updatedChats[chatIndex] = {
                  ...updatedChats[chatIndex],
                  lastMessage: type === "snap" ? "📷 Sent a photo" : text,
                  lastSenderId: userId,
                  isSeen: memberId === userId, // Seen if sender, unread if receiver
                  updatedAt: Date.now(),
                };

                await userChatsRef.update({ chats: updatedChats });
              }
            }
          } catch (error) {
            console.error(`Error updating userchats for ${memberId}:`, error);
          }
        })();
      });

      // 5. Update Firestore messages (non-blocking)
      db.collection("chats")
        .doc(chatId)
        .update({
          messages: FieldValue.arrayUnion(message),
        })
        .catch((error) => {
          console.error("Error updating Firestore messages:", error);
        });
    } catch (error) {
      console.error("Error broadcasting message:", error);
    }
  })();
});
```

### **4. Client nhận tin nhắn qua WebSocket**

**File:** `client/src/pages/Chat.jsx` (dòng 140-182)

```javascript
const unsubscribeNewMessage = websocketService.onNewMessage((data) => {
  console.log("📩 New message received:", data);

  // Kiểm tra xem tin nhắn có thuộc chat hiện tại không
  if (data.chatId === currentChatId) {
    console.log("✅ Adding message to state:", data.message);
    setMessages((prev) => {
      // Tránh duplicate messages
      const exists = prev.some((msg) => msg.id === data.message.id);
      if (exists) {
        console.log("⚠️ Message already exists, skipping");
        return prev;
      }

      // Thêm tin nhắn mới vào state
      return [...prev, data.message];
    });

    // Auto-scroll xuống cuối khi có tin nhắn mới
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  } else {
    console.log(
      `⚠️ Message for different chat (${data.chatId} vs ${currentChatId}), ignoring`
    );
  }
});
```

**File:** `client/src/lib/websocket.js` (dòng 135-181)

```javascript
onNewMessage(callback) {
  // Set up listener cho event "new-message"
  if (this.socket && this.socket.connected) {
    this.socket.on("new-message", callback);
    return () => this.socket.off("new-message", callback);
  }

  // Nếu socket chưa sẵn sàng, đợi khi connect
  const setupListener = () => {
    if (this.socket) {
      this.socket.on("new-message", callback);
    }
  };

  if (this.socket) {
    this.socket.once("connect", setupListener);
  }

  return () => {
    if (this.socket) {
      this.socket.off("new-message", callback);
    }
  };
}
```

### **5. Optimistic Update cho Chat Badge (Last Message)**

**File:** `client/src/components/pages/chat/sidebar/ChatList.jsx` (dòng 120-162)

Khi nhận tin nhắn mới qua WebSocket, ChatList tự động cập nhật last message và unread indicator ngay lập tức:

```javascript
useEffect(() => {
  const unsubscribeNewMessage = websocketService.onNewMessage((data) => {
    const { chatId, message } = data;

    // Update optimistic state
    const currentOptimistic = optimisticUpdatesRef.current.get(chatId) || {};
    optimisticUpdatesRef.current.set(chatId, {
      ...currentOptimistic,
      lastMessage: message.type === "snap" ? "📷 Sent a photo" : message.text,
      lastSenderId: message.senderId,
      isSeen: message.senderId === user?.uid ? true : false, // Seen if I sent, unread if others sent
      updatedAt: Date.now(),
    });

    // Update chats state immediately (optimistic update)
    setChats((prevChats) => {
      const updatedChats = prevChats.map((chat) => {
        if (chat.chatId === chatId) {
          return {
            ...chat,
            lastMessage:
              message.type === "snap" ? "📷 Sent a photo" : message.text,
            lastSenderId: message.senderId,
            isSeen: message.senderId === user?.uid ? true : false,
            updatedAt: Date.now(),
          };
        }
        return chat;
      });

      // Sort by updatedAt (most recent first)
      return updatedChats.sort((a, b) => {
        const timeA = a.updatedAt || a.updateAt || 0;
        const timeB = b.updatedAt || b.updateAt || 0;
        return timeB - timeA;
      });
    });
  });

  return () => {
    unsubscribeNewMessage();
  };
}, [user?.uid]);
```

**Kết quả:**

- ✅ Last message hiển thị ngay lập tức trên badge
- ✅ Chấm xanh (unread indicator) xuất hiện ngay nếu tin nhắn từ người khác
- ✅ Badge tự động sắp xếp lại theo thứ tự mới nhất
- ✅ Firestore sync sau và sẽ override optimistic update nếu cần

### **6. UI tự động cập nhật**

React state `messages` được cập nhật → Component re-render → Tin nhắn hiển thị ngay lập tức trong chat screen.

---

## 🔌 Luồng Kết Nối WebSocket

### **1. Khi mở Chat Screen**

**File:** `client/src/pages/Chat.jsx` (dòng 129-264)

```javascript
useEffect(() => {
  if (!selectedChatId) return;

  // 1. Load initial data từ Firestore
  const loadChatData = async () => {
    try {
      const chatDocRef = doc(db, "chats", selectedChatId);
      const chatSnap = await getDoc(chatDocRef);

      if (chatSnap.exists()) {
        const data = chatSnap.data();
        setMessages(data.messages || []);
        setChatMetadata(data);
      } else {
        setMessages([]);
        setChatMetadata(null);
      }
    } catch (error) {
      console.error("Error loading chat data:", error);
    }
  };

  loadChatData();

  // 2. Set up WebSocket listeners
  const currentChatId = selectedChatId;

  const unsubscribeNewMessage = websocketService.onNewMessage((data) => {
    // Handle new messages
  });

  // 3. Connect và join chat room
  const setupWebSocket = async () => {
    try {
      if (!websocketService.isConnected) {
        console.log("🔄 Connecting WebSocket...");
        await websocketService.connect();
      }

      if (!websocketService.isConnected) {
        console.error("❌ WebSocket still not connected after connect()");
        setTimeout(() => setupWebSocket(), 1000);
        return;
      }

      console.log("✅ WebSocket ready, joining chat:", currentChatId);
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (!websocketService.isConnected) {
        console.error("❌ Socket disconnected before join, retrying...");
        setTimeout(() => setupWebSocket(), 1000);
        return;
      }

      console.log("📤 Calling joinChat for:", currentChatId);
      websocketService.joinChat(currentChatId);
    } catch (error) {
      console.error("❌ Failed to setup WebSocket:", error);
      setTimeout(() => {
        setupWebSocket();
      }, 2000);
    }
  };

  setupWebSocket();

  // Cleanup khi unmount
  return () => {
    console.log(`🧹 Cleaning up chat ${currentChatId}`);
    unsubscribeNewMessage();
    if (currentChatId) {
      websocketService.leaveChat(currentChatId);
    }
  };
}, [selectedChatId]);
```

### **2. WebSocket Connection**

**File:** `client/src/lib/websocket.js` (dòng 11-72)

```javascript
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
      const serverUrl = import.meta.env.VITE_SERVER_URL || "http://localhost:3000";

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
    } catch (error) {
      console.error("Error connecting WebSocket:", error);
      reject(error);
    }
  });
}
```

### **3. Join Chat Room**

**File:** `client/src/lib/websocket.js` (dòng 84-105)

```javascript
joinChat(chatId) {
  if (!this.socket) {
    console.warn("⚠️ Socket not initialized, cannot join chat");
    return;
  }
  if (!this.socket.connected) {
    console.warn("⚠️ Socket not connected, cannot join chat. Will retry when connected.");
    // Retry when socket connects
    this.socket.once("connect", () => {
      console.log(`📱 Socket connected, retrying join chat: ${chatId}`);
      this.socket.emit("join-chat", chatId);
    });
    return;
  }
  console.log(`📱 Emitting join-chat for room: ${chatId}`);
  this.socket.emit("join-chat", chatId);
}
```

**Server xử lý:** `server/index.js` (dòng 118-220)

```javascript
socket.on("join-chat", async (chatId) => {
  console.log(`🔍 User ${userId} attempting to join chat ${chatId}`);

  // 1. Verify user has access
  const chatDoc = await db.collection("chats").doc(chatId).get();
  if (!chatDoc.exists) {
    console.error(`❌ Chat ${chatId} not found`);
    socket.emit("error", { message: "Chat not found" });
    return;
  }

  const chatData = chatDoc.data();

  // 2. Check access (group: members array, 1-1: userchats)
  if (chatData.type === "group") {
    if (!chatData.members || !chatData.members.includes(userId)) {
      console.error(
        `❌ User ${userId} not in members array:`,
        chatData.members
      );
      socket.emit("error", { message: "Access denied" });
      return;
    }
  } else {
    const userChatsRef = db.collection("userchats").doc(userId);
    const userChatsDoc = await userChatsRef.get();
    let hasAccess = false;

    if (userChatsDoc.exists) {
      const userChats = userChatsDoc.data().chats || [];
      hasAccess = userChats.some((chat) => chat.chatId === chatId);
    }

    if (!hasAccess) {
      console.error(
        `❌ User ${userId} doesn't have access to 1-1 chat ${chatId}`
      );
      socket.emit("error", { message: "Access denied" });
      return;
    }
  }

  // 3. Join room
  socket.join(`chat:${chatId}`);

  const room = io.sockets.adapter.rooms.get(`chat:${chatId}`);
  const socketCount = room ? room.size : 0;
  console.log(
    `📱 User ${userId} joined chat ${chatId} (sockets in room: ${socketCount})`
  );

  // 4. Mark chat as seen when user joins (opens the chat)
  try {
    const userChatsRef = db.collection("userchats").doc(userId);
    const userChatsDoc = await userChatsRef.get();

    if (userChatsDoc.exists) {
      const userChatsData = userChatsDoc.data();
      const chatIndex = userChatsData.chats?.findIndex(
        (c) => c.chatId === chatId
      );

      if (chatIndex !== undefined && chatIndex !== -1) {
        const updatedChats = [...userChatsData.chats];
        // Only mark as seen if last message was not from current user
        if (updatedChats[chatIndex].lastSenderId !== userId) {
          updatedChats[chatIndex] = {
            ...updatedChats[chatIndex],
            isSeen: true,
          };

          await userChatsRef.update({ chats: updatedChats });
          console.log(`✅ Marked chat ${chatId} as seen for user ${userId}`);
        }
      }
    }
  } catch (error) {
    console.error("Error marking chat as seen:", error);
  }

  // 5. Confirm join
  socket.emit("joined-chat", { chatId });
});
```

---

## 📋 Luồng Hiển Thị Chat List (Sidebar)

### **1. Load danh sách chats từ Firestore**

**File:** `client/src/components/pages/chat/sidebar/ChatList.jsx` (dòng 40-118)

```javascript
useEffect(() => {
  const unSub = onSnapshot(
    doc(db, "userchats", user?.uid),
    async (res) => {
      if (!res.exists()) {
        setChats([]);
        return;
      }

      const items = res.data().chats || [];
      console.log(
        `📋 [ChatList] Received ${items.length} chats from Firestore`
      );

      // Process chats in parallel, using cache when possible
      const promises = items.map(async (item) => {
        if (item.type === "group") {
          return {
            ...item,
            receiver: {
              uid: item.chatId,
              displayName: item.displayName || "Unknown Group",
              photoURL: item.photoURL || "/default-avatar.png",
            },
            isGroup: true,
          };
        } else {
          // Check cache first
          const cachedUser = userCacheRef.current.get(item.receiverId);
          if (cachedUser) {
            return {
              ...item,
              receiver: cachedUser,
              isGroup: false,
            };
          }

          // Fetch if not in cache
          try {
            const userDocRef = doc(db, "users", item.receiverId);
            const userDocSnap = await getDoc(userDocRef);
            const userData = userDocSnap.data() || {};

            // Cache user data
            userCacheRef.current.set(item.receiverId, userData);

            return {
              ...item,
              receiver: userData,
              isGroup: false,
            };
          } catch (err) {
            console.error("Error fetching user:", err);
            return {
              ...item,
              receiver: { displayName: "User Deleted" },
              isGroup: false,
            };
          }
        }
      });

      const chatData = await Promise.all(promises);
      // Merge with optimistic updates before setting state
      const mergedChats = chatData.map(mergeWithOptimistic);
      setChats(
        mergedChats.sort((a, b) => {
          const timeA = a.updatedAt || a.updateAt || 0;
          const timeB = b.updatedAt || b.updateAt || 0;
          return timeB - timeA; // Descending order (newest first)
        })
      );
    },
    { includeMetadataChanges: false } // Chỉ trigger khi data thực sự thay đổi
  );
  return () => {
    unSub();
  };
}, [user.uid]);
```

### **2. Merge Logic với Optimistic Updates**

**File:** `client/src/components/pages/chat/sidebar/ChatList.jsx` (dòng 15-38)

```javascript
// Helper: Merge Firestore data with optimistic updates
// Only use optimistic if it's newer than Firestore data
const mergeWithOptimistic = (chatItem) => {
  const optimistic = optimisticUpdatesRef.current.get(chatItem.chatId);
  if (!optimistic) return chatItem;

  const firestoreUpdatedAt = chatItem.updatedAt || chatItem.updateAt || 0;
  const optimisticUpdatedAt = optimistic.updatedAt || 0;

  // If Firestore data is newer, clear optimistic update (Firestore is source of truth)
  if (firestoreUpdatedAt > optimisticUpdatedAt) {
    optimisticUpdatesRef.current.delete(chatItem.chatId);
    return chatItem;
  }

  // Otherwise, merge optimistic with Firestore
  return {
    ...chatItem,
    lastMessage: optimistic.lastMessage ?? chatItem.lastMessage,
    lastSenderId: optimistic.lastSenderId ?? chatItem.lastSenderId,
    isSeen:
      optimistic.isSeen !== undefined ? optimistic.isSeen : chatItem.isSeen,
    updatedAt: optimistic.updatedAt ?? chatItem.updatedAt ?? chatItem.updateAt,
  };
};
```

**Logic:**

- ✅ Nếu Firestore `updatedAt` > optimistic `updatedAt` → Dùng Firestore (source of truth)
- ✅ Nếu optimistic mới hơn → Merge optimistic với Firestore data
- ✅ Tự động clear optimistic khi Firestore sync về

### **3. Hiển thị chat badge**

**File:** `client/src/components/pages/chat/sidebar/User.jsx`

- Hiển thị avatar, tên, lastMessage, thời gian
- Phân biệt "You: " nếu last message là của mình (`lastSenderId === currentUserId`)
- Hiển thị unread indicator (chấm xanh, bold) nếu `!isSeen && lastSenderId !== currentUserId`
- Khi click badge → Optimistic update `isSeen = true` ngay → Gọi `websocketService.markChatAsSeen(chatId)`

---

## 👁️ Luồng Mark as Seen với Optimistic Update

### **1. User click vào badge hoặc focus input**

**File:** `client/src/components/pages/chat/sidebar/User.jsx` (dòng 55-66)

```javascript
onClick={async () => {
  setSelectedChatId(chat?.chatId);
  setReceiver(receiver);
  setClose(false);

  if (hasUnreadMessage) {
    // Optimistic update: mark as seen immediately
    if (window.__markChatAsSeenOptimistic) {
      window.__markChatAsSeenOptimistic(chat?.chatId);
    }

    // Then send to server
    if (!websocketService.isConnected) {
      await websocketService.connect();
    }
    websocketService.markChatAsSeen(chat?.chatId);
  }
}}
```

**File:** `client/src/pages/Chat.jsx` (dòng 503-515)

```javascript
onFocus={async () => {
  if (selectedChatId) {
    // Optimistic update: mark as seen immediately
    if (window.__markChatAsSeenOptimistic) {
      window.__markChatAsSeenOptimistic(selectedChatId);
    }

    // Then send to server
    if (!websocketService.isConnected) {
      await websocketService.connect();
    }
    websocketService.markChatAsSeen(selectedChatId);
  }
}}
```

### **2. Optimistic Update ngay lập tức**

**File:** `client/src/components/pages/chat/sidebar/ChatList.jsx` (dòng 164-196)

```javascript
useEffect(() => {
  // Create a custom event listener for mark-as-seen
  const handleMarkAsSeen = (chatId) => {
    // Update optimistic state
    const currentOptimistic = optimisticUpdatesRef.current.get(chatId) || {};
    optimisticUpdatesRef.current.set(chatId, {
      ...currentOptimistic,
      isSeen: true,
    });

    // Update chats state immediately
    setChats((prevChats) => {
      return prevChats.map((chat) => {
        if (chat.chatId === chatId) {
          return {
            ...chat,
            isSeen: true, // Chấm xanh biến mất ngay lập tức
          };
        }
        return chat;
      });
    });
  };

  // Store handler in ref so User component can call it
  window.__markChatAsSeenOptimistic = handleMarkAsSeen;

  return () => {
    delete window.__markChatAsSeenOptimistic;
  };
}, []);
```

**Kết quả:**

- ✅ Chấm xanh (unread indicator) biến mất ngay lập tức
- ✅ Text không còn bold
- ✅ Không cần chờ server response

### **3. Server xử lý mark as seen**

**File:** `server/index.js` (dòng 221-271)

```javascript
socket.on("mark-chat-seen", async (data) => {
  const { chatId } = data;
  console.log(`👁️ [SERVER] Marking chat ${chatId} as seen for user ${userId}`);

  try {
    const userChatsRef = db.collection("userchats").doc(userId);
    const userChatsDoc = await userChatsRef.get();

    if (!userChatsDoc.exists) {
      console.error(`❌ [SERVER] Userchats document not found for ${userId}`);
      return;
    }

    const userChatsData = userChatsDoc.data();
    const chats = userChatsData.chats || [];
    const chatIndex = chats.findIndex((c) => c.chatId === chatId);

    if (chatIndex === -1) {
      console.error(
        `❌ [SERVER] Chat ${chatId} not found in userchats for ${userId}`
      );
      return;
    }

    const updatedChats = [...chats];
    const currentChat = updatedChats[chatIndex];

    // Mark as seen regardless of who sent the last message (user wants to mark it as seen)
    updatedChats[chatIndex] = {
      ...currentChat,
      isSeen: true,
    };

    await userChatsRef.update({ chats: updatedChats });
    console.log(
      `✅ [SERVER] Successfully marked chat ${chatId} as seen for user ${userId}`
    );
  } catch (error) {
    console.error("❌ [SERVER] Error marking chat as seen:", error);
  }
});
```

### **4. Firestore update → onSnapshot trigger → UI update**

Khi Firestore update về, `onSnapshot` sẽ trigger và merge với optimistic update. Nếu Firestore `updatedAt` > optimistic `updatedAt`, Firestore data sẽ override optimistic (source of truth).

---

## 📸 Luồng Gửi Snap

### **1. User chụp ảnh và gửi**

**File:** `client/src/pages/Chat.jsx` (dòng 90-111)

```javascript
const handleSendImage = async (imageBase64) => {
  try {
    console.log("Đang upload ảnh...");
    const imageId = uuidv4();
    const storageRef = ref(storage, `snaps/${imageId}.png`);

    await uploadString(storageRef, imageBase64, "data_url");
    const downloadURL = await getDownloadURL(storageRef);

    // Use WebSocket to send snap - server will broadcast to all (including sender)
    websocketService.sendMessage(
      selectedChatId,
      "Sent a Snap",
      "snap",
      downloadURL
    );
    console.log("Đã gửi Snap thành công!");
  } catch (error) {
    console.error("Lỗi gửi ảnh:", error);
  }
};
```

### **2. Server xử lý tương tự text message**

- Tạo message với `type: "snap"`, `img: downloadURL`
- Broadcast ngay lập tức qua WebSocket
- Update Firestore ở background

### **3. Client hiển thị snap**

**File:** `client/src/pages/Chat.jsx` (dòng 468-512)

- Nếu chưa xem: Hiển thị "Tap to View Snap" button
- Nếu đã xem: Hiển thị "Opened" (sender) hoặc "Expired" (receiver)

### **4. User xem snap**

**File:** `client/src/pages/Chat.jsx` (dòng 80-88)

```javascript
const handleCloseSnap = async () => {
  if (!viewingSnap) return;

  const messageToBurn = viewingSnap;
  setViewingSnap(null);

  // Use WebSocket to mark snap as viewed
  websocketService.viewSnap(selectedChatId, messageToBurn.id);
};
```

**Server:** `server/index.js` (dòng 427-470)

```javascript
socket.on("view-snap", async (data) => {
  try {
    const { chatId, messageId } = data;

    const chatDoc = await db.collection("chats").doc(chatId).get();
    if (!chatDoc.exists) {
      socket.emit("error", { message: "Chat not found" });
      return;
    }

    const chatData = chatDoc.data();
    const messages = chatData.messages || [];
    const messageIndex = messages.findIndex((m) => m.id === messageId);

    if (messageIndex === -1) {
      socket.emit("error", { message: "Message not found" });
      return;
    }

    const message = messages[messageIndex];
    const viewedBy = message.viewedBy || [];

    if (!viewedBy.includes(userId)) {
      messages[messageIndex] = {
        ...message,
        viewedBy: [...viewedBy, userId],
      };

      await db.collection("chats").doc(chatId).update({ messages });

      // Broadcast update
      io.to(`chat:${chatId}`).emit("snap-viewed", {
        chatId,
        messageId,
        viewedBy: messages[messageIndex].viewedBy,
      });
    }
  } catch (error) {
    console.error("Error viewing snap:", error);
    socket.emit("error", { message: "Failed to mark snap as viewed" });
  }
});
```

---

## 🎯 Điểm Quan Trọng

### **1. Real-time Performance**

- ✅ **Broadcast ngay lập tức**: Server chỉ kiểm tra room membership và broadcast message ngay, không chờ verify access hay update Firestore
- ✅ **Background processing**: Tất cả logic verify access và update Firestore chạy ở background (non-blocking)
- ✅ **Optimistic updates**: UI cập nhật ngay lập tức cho last message và unread indicator
- ✅ **Đồng bộ hoàn hảo**: Cả sender và receiver nhận cùng một broadcast → thấy tin nhắn cùng lúc

### **2. Data Consistency**

- **Firestore là source of truth**: Persistent data luôn được lưu trong Firestore
- **WebSocket chỉ dùng cho real-time delivery**: Không phải source of truth
- **Optimistic updates**: Chỉ là temporary UI state, sẽ được override khi Firestore sync về
- **Merge logic**: Tự động merge optimistic với Firestore, ưu tiên Firestore nếu data mới hơn

### **3. Room Management**

- Mỗi chat có room: `chat:${chatId}`
- User join room khi mở chat (verify access trước khi join)
- Server broadcast đến room → tất cả members trong room nhận được
- Chỉ kiểm tra room membership khi send message (nhanh), không verify access (chạy background)

### **4. Unread Messages**

- `isSeen: false` → Unread (hiển thị chấm xanh, bold)
- `isSeen: true` → Read
- `lastSenderId` → Phân biệt tin nhắn cuối là của ai
- **Optimistic update**: Chấm xanh biến mất ngay khi click badge hoặc focus input
- Mark as seen khi: click badge, focus input, join chat room

### **5. Optimistic Updates**

**Last Message:**

- Khi nhận `new-message` → Update `lastMessage`, `lastSenderId`, `isSeen`, `updatedAt` ngay
- Badge tự động sắp xếp lại theo `updatedAt`
- Firestore sync sau và sẽ override nếu cần

**Mark as Seen:**

- Khi click badge/focus input → Update `isSeen = true` ngay
- Chấm xanh biến mất ngay lập tức
- Server update Firestore ở background

**Merge Logic:**

- So sánh `updatedAt` giữa optimistic và Firestore
- Nếu Firestore mới hơn → Dùng Firestore (source of truth)
- Nếu optimistic mới hơn → Merge với Firestore data

### **6. Caching & Optimization**

- User data được cache trong `userCacheRef` (ChatList) để tránh refetch
- `includeMetadataChanges: false` → Chỉ trigger khi data thực sự thay đổi
- Parallel Firestore updates cho userchats (không await)
- Background processing cho tất cả Firestore operations

---

## 📊 Sơ Đồ Luồng

### **Luồng Gửi Tin Nhắn:**

```
User nhập tin nhắn
    ↓
handleSend() → websocketService.sendMessage()
    ↓
Socket.IO emit("send-message")
    ↓
Server: socket.on("send-message")
    ├─ ⚡ Kiểm tra room membership (nhanh)
    ├─ ⚡ Tạo message object
    ├─ ⚡ BROADCAST ngay lập tức: io.to(`chat:${chatId}`).emit("new-message")
    └─ 🔄 Background processing (non-blocking):
         ├─ Verify access
         ├─ Get member IDs
         ├─ Update chats/{chatId}/messages
         └─ Update userchats/{userId}/chats (parallel)
    ↓
Client: websocketService.onNewMessage()
    ├─ Chat.jsx: setMessages([...prev, newMessage]) → Hiển thị tin nhắn
    └─ ChatList.jsx: Optimistic update → Update lastMessage, isSeen, updatedAt
    ↓
UI re-render → Tin nhắn hiển thị + Badge cập nhật ngay lập tức
    ↓
Firestore sync về → onSnapshot trigger → Merge với optimistic → UI cập nhật (nếu cần)
```

### **Luồng Mark as Seen:**

```
User click badge / focus input
    ↓
Optimistic update: isSeen = true (ngay lập tức)
    ├─ Chấm xanh biến mất
    └─ Text không còn bold
    ↓
websocketService.markChatAsSeen(chatId)
    ↓
Server: socket.on("mark-chat-seen")
    └─ Update Firestore: userchats/{userId}/chats[chatIndex].isSeen = true
    ↓
Firestore update → onSnapshot trigger → Merge với optimistic
    └─ Nếu Firestore updatedAt > optimistic updatedAt → Override optimistic
```

---

## 🔍 Debug Tips

1. **Kiểm tra WebSocket connection:**

   - Console log: `websocketService.isConnected`
   - Server log: `✅ User connected: ${userId} (socket: ${socket.id})`

2. **Kiểm tra room join:**

   - Server log: `📱 User ${userId} joined chat ${chatId} (sockets in room: ${socketCount})`
   - Client log: `✅ Joined chat room: ${chatId}`

3. **Kiểm tra message broadcast:**

   - Server log: `📨 Received send-message from ${userId}:`
   - Server log: `✅ Message broadcasted immediately to ${socketCount} socket(s)`
   - Client log: `📩 New message received:`

4. **Kiểm tra optimistic updates:**

   - Client log: `📋 [ChatList] Received X chats from Firestore`
   - Badge cập nhật ngay khi nhận `new-message`
   - Chấm xanh biến mất ngay khi click badge

5. **Kiểm tra Firestore updates:**

   - Firestore Console → Collections → `chats`, `userchats`
   - Xem `messages` array và `updatedAt` timestamp
   - Verify `isSeen` và `lastSenderId` trong `userchats`

6. **Kiểm tra merge logic:**
   - Optimistic `updatedAt` vs Firestore `updatedAt`
   - Firestore là source of truth nếu `updatedAt` mới hơn

---

## 📚 Tài Liệu Tham Khảo

- **Socket.IO Docs:** https://socket.io/docs/v4/
- **Firestore Docs:** https://firebase.google.com/docs/firestore
- **React Hooks:** https://react.dev/reference/react
- **Optimistic UI Updates:** https://react.dev/learn/queueing-a-series-of-state-updates
