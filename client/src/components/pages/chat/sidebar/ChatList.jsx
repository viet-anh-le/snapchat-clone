import { useEffect, useState, useRef } from "react";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import UserChat from "./User";
import { useAuth } from "../../../../context/AuthContext";
import { websocketService } from "../../../../lib/websocket";

export default function ChatList() {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const userCacheRef = useRef(new Map()); // Cache user data to avoid refetching
  // Optimistic updates: { chatId: { lastMessage?, lastSenderId?, isSeen?, updatedAt? } }
  const optimisticUpdatesRef = useRef(new Map());

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
      updatedAt:
        optimistic.updatedAt ?? chatItem.updatedAt ?? chatItem.updateAt,
    };
  };

  useEffect(() => {
    const unSub = onSnapshot(
      doc(db, "userchats", user?.uid),
      async (res) => {
        if (!res.exists()) {
          setChats([]);
          return;
        }

        const items = res.data().chats || [];

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
            return timeB - timeA;
          })
        );
      },
      { includeMetadataChanges: false }
    );
    return () => {
      unSub();
    };
  }, [user.uid]);

  // Listen for new messages to update lastMessage optimistically
  useEffect(() => {
    const unsubscribeNewMessage = websocketService.onNewMessage((data) => {
      const { chatId, message } = data;

      // Update optimistic state
      const currentOptimistic = optimisticUpdatesRef.current.get(chatId) || {};
      optimisticUpdatesRef.current.set(chatId, {
        ...currentOptimistic,
        lastMessage: message.type === "snap" ? "📷 Sent a photo" : message.text,
        lastSenderId: message.senderId,
        isSeen: message.senderId === user?.uid ? true : false, // Seen if I sent it, unread if others sent
        updatedAt: Date.now(),
      });

      // Update chats state immediately
      setChats((prevChats) => {
        const chatExists = prevChats.some((chat) => chat.chatId === chatId);

        if (!chatExists) {
          return prevChats;
        }

        const updatedChats = prevChats.map((chat) => {
          if (chat.chatId === chatId) {
            const updatedChat = {
              ...chat,
              lastMessage:
                message.type === "snap" ? "📷 Sent a photo" : message.text,
              lastSenderId: message.senderId,
              isSeen: message.senderId === user?.uid ? true : false,
              updatedAt: Date.now(),
            };
            return updatedChat;
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

  // Listen for mark-as-seen to update isSeen optimistically
  useEffect(() => {
    // Create a custom event listener for mark-as-seen
    // We'll trigger this when markChatAsSeen is called
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
              isSeen: true,
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

  return (
    <>
      <div className="flex flex-col gap-3">
        {chats?.map((chat, idx) => (
          <UserChat
            key={idx}
            receiver={chat?.receiver}
            chat={chat}
            isGroup={chat.isGroup}
          />
        ))}
      </div>
    </>
  );
}
