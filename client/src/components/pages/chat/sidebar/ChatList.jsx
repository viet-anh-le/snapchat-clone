import { useEffect, useState, useRef, useContext } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../../../../lib/firebase";
import UserChat from "./User";
import { useAuth } from "../../../../context/AuthContext";
import { websocketService } from "../../../../lib/websocket";
import { ChatContext } from "../../../../context/ChatContext";

import ArchivedChats from "./ArchivedChats";

export default function ChatList() {
  const { user } = useAuth();
  const [chats, setChats] = useState([]);
  const { setTotalUnread } = useContext(ChatContext);
  const [showArchivedList, setShowArchivedList] = useState(false);
  const userCacheRef = useRef(new Map());
  const optimisticUpdatesRef = useRef(new Map());
  const fetchingRef = useRef(new Set());

  const toMillis = (time) => {
    if (!time) return 0;
    if (typeof time === "number") return time;
    if (typeof time.toMillis === "function") return time.toMillis();
    if (time.seconds) return time.seconds * 1000;
    if (time instanceof Date || typeof time === "string") {
      return new Date(time).getTime();
    }
    return 0;
  };

  const mergeWithOptimistic = (chatItem) => {
    const optimistic = optimisticUpdatesRef.current.get(chatItem.chatId);
    if (!optimistic) return chatItem;
    const firestoreTime = toMillis(chatItem.updatedAt);
    const optimisticTime = toMillis(optimistic.updatedAt);
    if (firestoreTime >= optimisticTime) {
      if (chatItem.lastMessage && chatItem.lastMessage !== "No messages yet") {
        optimisticUpdatesRef.current.delete(chatItem.chatId);
        return chatItem;
      }

      return {
        ...chatItem,
        lastMessage: optimistic.lastMessage || chatItem.lastMessage,
        lastSenderId: optimistic.lastSenderId || chatItem.lastSenderId,
        isSeen: chatItem.isSeen,
        updatedAt: firestoreTime,
      };
    }
    return {
      ...chatItem,
      lastMessage: optimistic.lastMessage,
      lastSenderId: optimistic.lastSenderId,
      isSeen: optimistic.isSeen,
      updatedAt: optimisticTime,
    };
  };

  const fetchSingleChatData = async (chatId, receiverId, isGroup) => {
    try {
      if (isGroup) {
        const chatDoc = await getDoc(doc(db, "chats", chatId));
        if (chatDoc.exists()) {
          const data = chatDoc.data();
          return {
            receiver: {
              uid: chatId,
              displayName: data.groupName || "Group Chat",
              photoURL: data.groupPhoto || "/default-avatar.png",
            },
            isGroup: true,
            members: data.members || [],
          };
        }
      } else if (receiverId) {
        if (userCacheRef.current.has(receiverId)) {
          return {
            receiver: userCacheRef.current.get(receiverId),
            isGroup: false,
          };
        }

        const userDoc = await getDoc(doc(db, "users", receiverId));
        const userData = userDoc.exists()
          ? userDoc.data()
          : { displayName: "User Deleted" };

        userCacheRef.current.set(receiverId, userData);

        return {
          receiver: userData,
          isGroup: false,
        };
      }
      return null;
    } catch (error) {
      console.error("Lỗi fetch single chat:", error);
      return null;
    }
  };

  useEffect(() => {
    if (!user?.uid) return;
    const fetchChats = async () => {
      try {
        const userChatsRef = doc(db, "userchats", user.uid);
        const docSnap = await getDoc(userChatsRef);

        if (!docSnap.exists()) {
          setChats([]);
          return;
        }
        const items = docSnap.data().chats || [];
        const promises = items.map(async (item) => {
          const itemWithTime = {
            ...item,
            updatedAt: toMillis(item.updatedAt),
          };

          if (item.type === "group") {
            let groupData = {};
            try {
              const groupDocSnap = await getDoc(doc(db, "chats", item.chatId));
              if (groupDocSnap.exists()) {
                groupData = groupDocSnap.data();
              }
            } catch (e) {
              console.error("Error fetching group details", e);
            }
            return {
              ...itemWithTime,
              members: groupData.members || [],
              receiver: {
                uid: item.chatId,
                displayName: item.displayName || item.groupName || "Group Chat",
                photoURL:
                  item.photoURL || item.groupPhoto || "/default-avatar.png",
              },
              isGroup: true,
            };
          } else {
            const cachedUser = userCacheRef.current.get(item.receiverId);
            if (cachedUser) {
              return {
                ...itemWithTime,
                receiver: cachedUser,
                isGroup: false,
              };
            }

            try {
              const userDocRef = doc(db, "users", item.receiverId);
              const userDocSnap = await getDoc(userDocRef);
              const userData = userDocSnap.data() || {
                displayName: "User Deleted",
              };

              userCacheRef.current.set(item.receiverId, userData);

              return {
                ...itemWithTime,
                receiver: userData,
                isGroup: false,
              };
            } catch (err) {
              console.error("Error fetching user details:", err);
              return {
                ...itemWithTime,
                receiver: { displayName: "Unknown User" },
                isGroup: false,
              };
            }
          }
        });

        const chatData = await Promise.all(promises);
        const fetchedChats = chatData.map(mergeWithOptimistic);
        setChats((currentChats) => {
          const chatMap = new Map();
          fetchedChats.forEach((chat) => chatMap.set(chat.chatId, chat));
          currentChats.forEach((currentChat) => {
            const apiChat = chatMap.get(currentChat.chatId);
            if (!apiChat) {
              chatMap.set(currentChat.chatId, currentChat);
            } else if (currentChat.updatedAt > apiChat.updatedAt) {
              chatMap.set(currentChat.chatId, {
                ...apiChat,
                lastMessage: currentChat.lastMessage,
                lastSenderId: currentChat.lastSenderId,
                updatedAt: currentChat.updatedAt,
                isSeen: currentChat.isSeen,
              });
            }
          });
          return Array.from(chatMap.values()).sort(
            (a, b) => b.updatedAt - a.updatedAt
          );
        });
      } catch (error) {
        console.error("Lỗi fetchChats:", error);
      }
    };

    fetchChats();
  }, [user?.uid]);

  useEffect(() => {
    const unsubscribeSidebar = websocketService.onUpdateSidebar(
      async (data) => {
        const { chatId, lastMessage, lastSenderId, isSeen, updatedAt } = data;
        const timeMillis =
          typeof updatedAt === "number" ? updatedAt : toMillis(updatedAt);
        setChats((prevChats) => {
          const chatIndex = prevChats.findIndex(
            (chat) => chat.chatId === chatId
          );
          if (chatIndex !== -1) {
            const updatedChats = [...prevChats];
            updatedChats[chatIndex] = {
              ...updatedChats[chatIndex],
              lastMessage,
              lastSenderId,
              isSeen,
              updatedAt: timeMillis,
            };
            return updatedChats.sort((a, b) => b.updatedAt - a.updatedAt);
          }
          handleNewChatFetch(data);
          return prevChats;
        });
      }
    );

    const handleNewChatFetch = async (socketData) => {
      const {
        chatId,
        lastMessage,
        lastSenderId,
        isSeen,
        updatedAt,
        receiverId,
        isGroup,
        groupName,
        groupPhoto,
      } = socketData;
      if (fetchingRef.current.has(chatId)) {
        console.warn(`Đang fetch dở chatId ${chatId}, bỏ qua request trùng.`);
        return;
      }
      fetchingRef.current.add(chatId);
      const timeMillis =
        typeof updatedAt === "number" ? updatedAt : toMillis(updatedAt);
      try {
        let details = await fetchSingleChatData(chatId, receiverId, isGroup);
        if (!details) {
          if (isGroup) {
            details = {
              receiver: {
                uid: chatId,
                displayName: groupName || "Group Chat",
                photoURL: groupPhoto || "/default-avatar.png",
              },
              isGroup: true,
            };
          } else {
            details = {
              receiver: {
                uid: receiverId || "unknown",
                displayName: "Loading...",
                photoURL: "/default-avatar.png",
              },
              isGroup: false,
            };
          }
        }
        const newRealChat = {
          chatId,
          lastMessage,
          lastSenderId,
          isSeen,
          updatedAt: timeMillis,
          receiverId,
          type: isGroup ? "group" : "private",
          ...details,
        };
        setChats((prev) => {
          const exists = prev.some((c) => c.chatId === chatId);
          if (exists) {
            return prev.map((c) =>
              c.chatId === chatId ? { ...c, ...newRealChat } : c
            );
          }
          return [newRealChat, ...prev];
        });
      } finally {
        fetchingRef.current.delete(chatId);
      }
    };
    return () => unsubscribeSidebar();
  }, [user?.uid]);

  useEffect(() => {
    const handleMarkAsSeen = (chatId) => {
      const currentOptimistic = optimisticUpdatesRef.current.get(chatId) || {};
      optimisticUpdatesRef.current.set(chatId, {
        ...currentOptimistic,
        isSeen: true,
      });

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

    window.__markChatAsSeenOptimistic = handleMarkAsSeen;

    return () => {
      delete window.__markChatAsSeenOptimistic;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = websocketService.onChatRemoved((data) => {
      setChats((prev) => prev.filter((c) => c.chatId !== data.chatId));
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubArchive = websocketService.onChatArchived(({ chatId }) => {
      setChats((prev) =>
        prev.map((c) => (c.chatId === chatId ? { ...c, isArchived: true } : c))
      );
    });
    return () => {
      unsubArchive();
    };
  }, []);

  useEffect(() => {
    const unsubUnarchived = websocketService.onChatUnarchived(({ chatId }) => {
      setChats((prev) =>
        prev.map((c) => (c.chatId === chatId ? { ...c, isArchived: false } : c))
      );
    });
    return () => {
      unsubUnarchived();
    };
  }, []);

  useEffect(() => {
    if (!user?.uid || !chats) return;
    const unreadCount = chats.filter(
      (chat) => !chat.isSeen && chat.lastSenderId !== user.uid
    ).length;

    setTotalUnread(unreadCount);
  }, [chats, user?.uid, setTotalUnread]);

  if (showArchivedList) {
    return (
      <ArchivedChats
        allChats={chats}
        onBack={() => setShowArchivedList(false)}
      />
    );
  }

  const visibleChats = chats.filter((chat) => !chat.isArchived);
  const archivedCount = chats.filter((chat) => chat.isArchived).length;
  return (
    <>
      {archivedCount > 0 && (
        <div className="px-2 py-1 mb-2">
          <button
            onClick={() => setShowArchivedList(true)}
            className="w-full text-left px-4 py-3 bg-[#1e1e1e] hover:bg-[#252525] rounded-lg flex items-center gap-3 transition-colors group"
          >
            <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center group-hover:bg-gray-700">
              <span className="text-lg">📂</span>
            </div>
            <div className="flex flex-col">
              <span className="text-white font-semibold text-sm">
                Kho lưu trữ
              </span>
              <span className="text-gray-500 text-xs">
                {archivedCount} hội thoại
              </span>
            </div>
          </button>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {visibleChats.length === 0 && archivedCount === 0 ? (
          <div className="text-center text-gray-500 mt-10 text-sm">
            Chưa có tin nhắn nào
          </div>
        ) : (
          visibleChats.map((chat) => (
            <UserChat
              key={chat.chatId}
              receiver={chat?.receiver}
              chat={chat}
              isGroup={chat.isGroup}
              isArchived={false}
            />
          ))
        )}
      </div>
    </>
  );
}
