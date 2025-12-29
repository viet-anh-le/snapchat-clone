import "./chat.css";

import { useContext, useEffect, useState, useRef } from "react";
import { ChatContext } from "../context/ChatContext";
import { Avatar, Popover, Button, Image, message } from "antd";

import { storage, db } from "../lib/firebase";
import { doc, getDoc } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { v4 as uuidv4 } from "uuid";
import { websocketService } from "../lib/websocket";

import Header from "../components/pages/chat/main/Header";
import AddUser from "../components/pages/chat/sidebar/AddUser";
import CameraModal from "../components/pages/chat/main/CameraModal";
import SnapViewer from "../components/pages/chat/main/SnapViewer";
import CameraUI from "../components/pages/chat/main/CameraUI";
import TypingIndicator from "../components/pages/chat/main/TypingIndicator";
import CallMessage from "../components/pages/chat/main/CallMessage";
import ChatInput from "../components/pages/chat/ChatInput";
import MessageBubble from "../components/pages/chat/main/MessageBubble";
import { friendService } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const formatMessageTime = (timestamp) => {
  if (!timestamp?.toDate) return "";
  return timestamp.toDate().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

export default function Chat() {
  const { close, setClose, selectedChatId, receiver, setReceiver } =
    useContext(ChatContext);
  const { user } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();
  const [messages, setMessages] = useState([]);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [viewingSnap, setViewingSnap] = useState(null);
  const [chatMetadata, setChatMetadata] = useState(null);
  const [memberDetails, setMemberDetails] = useState({});
  const [openDeleteId, setOpenDeleteId] = useState(null);
  const [typingUsers, setTypingUsers] = useState(new Set());
  const [isSocketReady, setIsSocketReady] = useState(false);
  const typingTimeoutRef = useRef(null);

  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const isBlockedByMe = user?.blocked?.includes(receiver?.uid);
  const isBlockedByThem = receiver?.blocked?.includes(user?.uid);
  const isInterrupted = isBlockedByMe || isBlockedByThem;

  const getChatInfo = () => {
    if (chatMetadata?.type === "group") {
      return {
        displayName: chatMetadata.groupName || "Unnamed Group",
        photoURL: chatMetadata.groupPhoto || "/default-avatar.png",
        uid: selectedChatId,
        isGroup: true,
      };
    }
    return receiver;
  };

  const currentChatInfo = getChatInfo();

  const handleOpenSnap = (message) => {
    const isViewedByMe =
      message.viewedBy && message.viewedBy.includes(user.uid);
    if (isViewedByMe) return;

    setViewingSnap(message);
  };

  const handleCloseSnap = async () => {
    if (!viewingSnap) return;

    const messageToBurn = viewingSnap;
    setViewingSnap(null);

    websocketService.viewSnap(selectedChatId, messageToBurn.id);
  };

  const handleSendMessage = (text) => {
    websocketService.sendMessage(
      selectedChatId,
      text,
      "text",
      null,
      receiver?.uid
    );
  };

  const sendSnapMessage = (url) => {
    websocketService.sendMessage(selectedChatId, "Sent a Snap", "snap", url);
  };

  const handleSendImageFromCamera = async (imageBase64) => {
    try {
      console.log("Đang upload ảnh từ Camera...");
      const imageId = uuidv4();
      const storageRef = ref(storage, `snaps/${imageId}.png`);

      await uploadString(storageRef, imageBase64, "data_url");
      const downloadURL = await getDownloadURL(storageRef);

      sendSnapMessage(downloadURL);
      console.log("Đã gửi Snap từ Camera thành công!");
    } catch (error) {
      console.error("Lỗi gửi ảnh camera:", error);
    }
  };

  const handleSendFile = (downloadURL) => {
    if (!selectedChatId || !downloadURL) return;
    websocketService.sendMessage(
      selectedChatId,
      downloadURL,
      "file",
      downloadURL
    );
  };

  const handleTyping = () => {
    if (websocketService.isConnected) {
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);

      websocketService.sendTyping(selectedChatId);

      typingTimeoutRef.current = setTimeout(() => {
        websocketService.sendStopTyping(selectedChatId);
      }, 2000);
    }
  };

  const handleInputFocus = async () => {
    if (selectedChatId) {
      if (window.__markChatAsSeenOptimistic) {
        window.__markChatAsSeenOptimistic(selectedChatId);
      }

      if (!websocketService.isConnected) {
        await websocketService.connect();
      }
      websocketService.markChatAsSeen(selectedChatId);
    }
  };

  const handleUnblock = async () => {
    try {
      await friendService.unblockUser(receiver.uid);
      messageApi.success("Đã bỏ chặn người dùng.");
    } catch (error) {
      console.error(error);
      messageApi.error("Bỏ chặn thất bại: " + error.message);
    }
  };

  useEffect(() => {
    if (!selectedChatId) return;

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
    const currentChatId = selectedChatId;

    const unsubscribeNewMessage = websocketService.onNewMessage((data) => {
      if (data.chatId === currentChatId) {
        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === data.message.id);
          if (exists) return prev;
          return [...prev, data.message];
        });
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      }
    });

    const unsubscribeMessageDeleted = websocketService.onMessageDeleted(
      (data) => {
        if (data.chatId === currentChatId) {
          setMessages((prev) =>
            prev.filter((msg) => msg.id !== data.messageId)
          );
        }
      }
    );

    const unsubscribeSnapViewed = websocketService.onSnapViewed((data) => {
      if (data.chatId === currentChatId) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === data.messageId
              ? { ...msg, viewedBy: data.viewedBy }
              : msg
          )
        );
      }
    });

    const unsubscribeError = websocketService.onError((error) => {
      console.error("WebSocket error:", error);
    });

    const unsubscribeReaction = websocketService.onReactionUpdated((data) => {
      console.log(data);
      if (data.chatId === selectedChatId) {
        setMessages((prevMessages) => {
          return prevMessages.map((msg) => {
            if (msg.id === data.messageId) {
              return { ...msg, reactions: data.updatedReactions };
            }
            return msg;
          });
        });
      }
    });

    const setupWebSocket = async () => {
      try {
        if (!websocketService.isConnected) {
          await websocketService.connect();
        }
        setIsSocketReady(true);
        websocketService.joinChat(currentChatId);
      } catch (error) {
        console.error("Failed to setup WebSocket:", error);
      }
    };

    setupWebSocket();

    return () => {
      unsubscribeNewMessage();
      if (unsubscribeMessageDeleted) unsubscribeMessageDeleted();
      unsubscribeSnapViewed();
      unsubscribeError();
      unsubscribeReaction();
      if (currentChatId) {
        websocketService.leaveChat(currentChatId);
      }
    };
  }, [selectedChatId]);

  useEffect(() => {
    if (selectedChatId) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 300);
    }
  }, [selectedChatId]);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
      }, 200);
    }
  }, [messages.length]);

  useEffect(() => {
    if (!chatMetadata || !selectedChatId) return;
    const fetchMembers = async () => {
      const details = {};
      if (chatMetadata.type === "group") {
        if (!chatMetadata.members) return;
        const promises = chatMetadata.members.map(async (uid) => {
          try {
            const userDoc = await getDoc(doc(db, "users", uid));
            if (userDoc.exists()) details[uid] = userDoc.data();
          } catch (error) {}
        });
        await Promise.all(promises);
      } else {
        try {
          const currentUserDoc = await getDoc(doc(db, "users", user.uid));
          if (currentUserDoc.exists())
            details[user.uid] = currentUserDoc.data();

          const userChatsRef = doc(db, "userchats", user.uid);
          const userChatsDoc = await getDoc(userChatsRef);
          if (userChatsDoc.exists()) {
            const chatEntry = userChatsDoc
              .data()
              .chats?.find((c) => c.chatId === selectedChatId);
            if (chatEntry?.receiverId) {
              const receiverDoc = await getDoc(
                doc(db, "users", chatEntry.receiverId)
              );
              if (receiverDoc.exists())
                details[chatEntry.receiverId] = receiverDoc.data();
            }
          }
        } catch (e) {
          console.error(e);
        }
      }
      setMemberDetails(details);
    };
    fetchMembers();
  }, [chatMetadata, selectedChatId, user.uid]);

  // UseEffect fetch receiver info
  useEffect(() => {
    if (!selectedChatId || !chatMetadata || chatMetadata.type === "group")
      return;
    if (!receiver?.uid) {
    }
  }, [selectedChatId, chatMetadata, receiver, user.uid]);

  // UseEffect typing status
  useEffect(() => {
    if (!isSocketReady || !selectedChatId) return;
    const cleanupTyping = websocketService.onTypingStatus((data) => {
      if (data.chatId !== selectedChatId) return;
      setTypingUsers((prev) => {
        const newSet = new Set(prev);
        if (data.type === "start") newSet.add(data.userId);
        else newSet.delete(data.userId);
        return newSet;
      });
    });
    return () => cleanupTyping();
  }, [selectedChatId, isSocketReady]);

  return (
    <>
      {contextHolder}
      {close ? (
        <div className="h-screen flex items-center justify-center relative w-full">
          <CameraUI />
          <AddUser />
        </div>
      ) : (
        <div className="h-screen relative flex flex-col">
          <AddUser />
          <div className="p-2 sm:p-3 bg-[#121212] flex-1 flex flex-col min-h-0">
            <Header
              setClose={setClose}
              isInterrupted={isInterrupted}
              receiver={{ ...currentChatInfo, chatId: selectedChatId }}
            />
            <div className="p-2 sm:p-3 border-gray-700 rounded-2xl bg-[#1E1E1E] flex-1 flex flex-col min-h-0">
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto min-h-0 no-scrollbar"
              >
                {!selectedChatId ? (
                  <div className="text-center text-gray-400 mt-8">
                    Select a chat to start messaging
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 p-1 sm:p-2">
                    {messages.length === 0 ? (
                      <div className="text-gray-400">No messages yet</div>
                    ) : (
                      messages.map((m, i) => {
                        if (m.type === "system") {
                          const isMe = m.senderId === user.uid;
                          const senderName = isMe
                            ? "Bạn"
                            : memberDetails[m.senderId]?.displayName || "Ai đó";

                          return (
                            <div
                              key={m.id || i}
                              className="flex justify-center my-3 w-full"
                            >
                              <div className="bg-gray-800/60 border border-gray-700/50 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs text-gray-400 shadow-sm text-center max-w-[85%]">
                                <span className="font-bold text-gray-300">
                                  {senderName}
                                </span>{" "}
                                <span>{m.text}</span>
                              </div>
                            </div>
                          );
                        }
                        const isOwner = m.senderId === user.uid;
                        const senderInfo = memberDetails[m.senderId];
                        const isViewedByMe =
                          m.viewedBy && m.viewedBy.includes(user.uid);
                        const isCallMessage = m.type === "call";

                        return (
                          <div
                            key={m.id || i}
                            className={`flex gap-2 max-w-full sm:max-w-[80%] items-center ${
                              isOwner
                                ? "self-end flex-row-reverse"
                                : "self-start"
                            } relative group`}
                          >
                            <Avatar
                              src={
                                senderInfo?.photoURL || "/default-avatar.png"
                              }
                              size={32}
                              className="shrink-0"
                            />
                            <div
                              className={`flex flex-col ${
                                isOwner ? "items-end" : "items-start"
                              }`}
                            >
                              {!isOwner && (
                                <span className="text-gray-400 text-[10px] ml-1 mb-1 font-semibold">
                                  {senderInfo?.displayName || "Member"}
                                </span>
                              )}

                              <div
                                className={`${
                                  isCallMessage
                                    ? "bg-transparent p-0"
                                    : `p-2 rounded-xl ${
                                        isOwner
                                          ? "bg-blue-600 text-white"
                                          : "bg-gray-700 text-white"
                                      }`
                                }`}
                              >
                                {m.type === "call" || m.type === "call_log" ? (
                                  <CallMessage
                                    key={m.id || i}
                                    message={m}
                                    isOwner={isOwner}
                                  />
                                ) : m.type === "file" ? (
                                  <a
                                    href={m.img || m.text}
                                    target="_blank"
                                    rel="noreferrer"
                                    download
                                    className="flex items-center gap-2 px-3 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                                  >
                                    <span className="text-sm font-semibold truncate max-w-[200px]">
                                      {(m.img || m.text || "")
                                        .split("/")
                                        .pop() || "File"}
                                    </span>
                                    <span className="text-xs text-blue-600 underline">
                                      Download
                                    </span>
                                  </a>
                                ) : m.type === "snap" ? (
                                  <div className="flex flex-col gap-1">
                                    {isViewedByMe ? (
                                      <div
                                        className={`flex items-center gap-2 px-3 py-2 rounded border ${
                                          isOwner
                                            ? "border-blue-500/30 bg-blue-900/20"
                                            : "border-gray-600 bg-gray-800"
                                        }`}
                                      >
                                        <span className="text-lg">🔥</span>
                                        <span className="text-gray-400 text-sm italic">
                                          {isOwner ? "Opened" : "Expired"}
                                        </span>
                                      </div>
                                    ) : (
                                      <>
                                        {isOwner ? (
                                          <div className="bg-blue-600/20 p-2 rounded-lg border border-blue-500/50">
                                            <Image
                                              width={150}
                                              src={m.img}
                                              className="rounded-lg object-cover"
                                              alt="My Snap"
                                            />
                                            <div className="text-right text-[10px] text-blue-300 mt-1 font-bold uppercase tracking-wider">
                                              Snap Delivered
                                            </div>
                                          </div>
                                        ) : (
                                          <div
                                            onClick={() => handleOpenSnap(m)}
                                            className="cursor-pointer font-bold py-2 px-4 rounded transition-all flex items-center gap-2 shadow-lg bg-linear-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white animate-pulse"
                                          >
                                            <span>📸</span>
                                            <span>Tap to View Snap</span>
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </div>
                                ) : (
                                  <MessageBubble
                                    chatId={selectedChatId}
                                    message={m}
                                    currentUserId={user?.uid}
                                    isOwner={isOwner}
                                  />
                                )}
                              </div>
                              <div className="text-xs text-gray-300 mt-1">
                                {formatMessageTime(m.createdAt) || ""}
                              </div>
                            </div>

                            {/* NÚT XÓA */}
                            {isOwner && m.id && (
                              <Popover
                                content={
                                  <Button
                                    type="text"
                                    danger
                                    size="small"
                                    onClick={() => {
                                      websocketService.deleteMessage(
                                        selectedChatId,
                                        m.id
                                      );
                                      setOpenDeleteId(null);
                                    }}
                                  >
                                    Xóa
                                  </Button>
                                }
                                trigger="click"
                                open={openDeleteId === m.id}
                                onOpenChange={(open) =>
                                  setOpenDeleteId(open ? m.id : null)
                                }
                                placement="top"
                              >
                                <button
                                  className={`
                                    text-gray-400 hover:text-white text-xs p-2 
                                    transition-opacity opacity-0 group-hover:opacity-100 
                                    ${
                                      openDeleteId === m.id ? "opacity-100" : ""
                                    }
                                    mr-6
                                  `}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenDeleteId(
                                      openDeleteId === m.id ? null : m.id
                                    );
                                  }}
                                >
                                  ⋯
                                </button>
                              </Popover>
                            )}
                          </div>
                        );
                      })
                    )}
                    {Array.from(typingUsers).map((userId) => {
                      const userInfo = memberDetails[userId] || {
                        photoURL: "/default-avatar.png",
                        displayName: "Someone",
                      };
                      return (
                        <TypingIndicator
                          key={userId}
                          userPhoto={userInfo.photoURL}
                          userName={userInfo.displayName}
                        />
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {isInterrupted ? (
                <div className="p-4 bg-gray-900 border-t border-gray-800 text-center">
                  {isBlockedByMe ? (
                    <div className="flex flex-col gap-2 items-center">
                      <span className="text-gray-400 text-sm">
                        Bạn đã chặn người dùng này.
                      </span>
                      <button
                        onClick={() => handleUnblock(receiver.uid)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-full text-sm font-medium hover:bg-blue-700"
                      >
                        Bỏ chặn
                      </button>
                    </div>
                  ) : (
                    <span className="text-gray-500 text-sm italic">
                      Bạn không thể trả lời cuộc trò chuyện này.
                    </span>
                  )}
                </div>
              ) : (
                <ChatInput
                  onSendMessage={handleSendMessage}
                  onSendImageSuccess={handleSendFile}
                  onTyping={handleTyping}
                  onFocus={handleInputFocus}
                  openCamera={() => setIsCameraOpen(true)}
                />
              )}
            </div>
          </div>
        </div>
      )}
      {viewingSnap && (
        <SnapViewer imageSrc={viewingSnap.img} onClose={handleCloseSnap} />
      )}
      <CameraModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onSendImage={handleSendImageFromCamera}
      />
    </>
  );
}
