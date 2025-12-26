import "./chat.css";

import { useContext, useEffect, useState, useRef } from "react";
import { ChatContext } from "../context/ChatContext";
import EmojiPicker from "emoji-picker-react";
import {
  CameraFilled,
  SmileOutlined,
  FileImageOutlined,
} from "@ant-design/icons";
import { Input, Image, Avatar, Popover, Button } from "antd";

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
import { useAuth } from "../context/AuthContext";

export default function Chat() {
  const { close, setClose, selectedChatId, receiver, setReceiver } =
    useContext(ChatContext);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [viewingSnap, setViewingSnap] = useState(null);
  const [chatMetadata, setChatMetadata] = useState(null);
  const [memberDetails, setMemberDetails] = useState({});
  const [openDeleteId, setOpenDeleteId] = useState(null);

  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  const { user } = useAuth();

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

  const handleSendImage = async (imageBase64) => {
    try {
      console.log("Đang upload ảnh...");
      const imageId = uuidv4();
      const storageRef = ref(storage, `snaps/${imageId}.png`);

      await uploadString(storageRef, imageBase64, "data_url");

      const downloadURL = await getDownloadURL(storageRef);

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

  const handleEmojiClick = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
  };

  const handleSend = async () => {
    if (!text || !text.trim()) return;
    const messageText = text;
    inputRef.current.input.value = "";
    setText("");
    setShowEmojiPicker(false);

    websocketService.sendMessage(selectedChatId, messageText);
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
      console.log("📩 New message received:", data);
      if (data.chatId === currentChatId) {
        console.log("✅ Adding message to state:", data.message);
        setMessages((prev) => {
          const exists = prev.some((msg) => msg.id === data.message.id);
          if (exists) {
            console.log("⚠️ Message already exists, skipping");
            return prev;
          }

          return [...prev, data.message];
        });

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
      } else {
        console.log(
          `⚠️ Message for different chat (${data.chatId} vs ${currentChatId}), ignoring`
        );
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
      if (error.message === "Access denied" && currentChatId) {
        console.warn(`⚠️ Access denied for chat ${currentChatId}, will retry`);
      }
    });

    const unsubscribeJoinedChat = websocketService.onJoinedChat((data) => {
      console.log("✅ Joined chat room:", data);
      if (data.chatId === currentChatId) {
        console.log(`✅ Successfully joined chat room: ${currentChatId}`);
      }
    });

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

        console.log("✅ joinChat called, waiting for server confirmation...");
      } catch (error) {
        console.error("❌ Failed to setup WebSocket:", error);
        setTimeout(() => {
          setupWebSocket();
        }, 2000);
      }
    };

    setupWebSocket();

    return () => {
      console.log(`🧹 Cleaning up chat ${currentChatId}`);
      unsubscribeNewMessage();
      if (unsubscribeMessageDeleted) unsubscribeMessageDeleted();
      unsubscribeSnapViewed();
      unsubscribeError();
      unsubscribeJoinedChat();
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
            if (userDoc.exists()) {
              details[uid] = userDoc.data();
            }
          } catch (error) {
            console.error("Error fetching member:", uid);
          }
        });

        await Promise.all(promises);
      } else {
        try {
          const currentUserDoc = await getDoc(doc(db, "users", user.uid));
          if (currentUserDoc.exists()) {
            details[user.uid] = currentUserDoc.data();
          }

          const userChatsRef = doc(db, "userchats", user.uid);
          const userChatsDoc = await getDoc(userChatsRef);

          if (userChatsDoc.exists()) {
            const userChats = userChatsDoc.data().chats || [];
            const chatEntry = userChats.find(
              (chat) => chat.chatId === selectedChatId
            );

            if (chatEntry?.receiverId) {
              const receiverDoc = await getDoc(
                doc(db, "users", chatEntry.receiverId)
              );
              if (receiverDoc.exists()) {
                details[chatEntry.receiverId] = receiverDoc.data();
              }
            }
          }
        } catch (error) {
          console.error("Error fetching 1-1 chat members:", error);
        }
      }

      setMemberDetails(details);
    };

    fetchMembers();
  }, [chatMetadata, selectedChatId, user.uid]);

  useEffect(() => {
    if (!selectedChatId || !chatMetadata) return;

    if (chatMetadata.type === "group") return;

    if (!receiver?.uid || !receiver?.displayName || !receiver?.photoURL) {
      const fetchReceiverInfo = async () => {
        try {
          const userChatsRef = doc(db, "userchats", user.uid);
          const userChatsDoc = await getDoc(userChatsRef);

          if (userChatsDoc.exists()) {
            const userChats = userChatsDoc.data().chats || [];
            const chatEntry = userChats.find(
              (chat) => chat.chatId === selectedChatId
            );

            if (chatEntry?.receiverId) {
              const receiverDoc = await getDoc(
                doc(db, "users", chatEntry.receiverId)
              );
              if (receiverDoc.exists()) {
                const receiverData = receiverDoc.data();
                if (setReceiver) {
                  setReceiver({
                    uid: chatEntry.receiverId,
                    displayName: receiverData.displayName || "Unknown",
                    photoURL: receiverData.photoURL || "/default-avatar.png",
                  });
                }
                setMemberDetails((prev) => ({
                  ...prev,
                  [chatEntry.receiverId]: receiverData,
                }));
              }
            }
          }
        } catch (error) {
          console.error("Error fetching receiver info:", error);
        }
      };

      fetchReceiverInfo();
    }
  }, [selectedChatId, chatMetadata, receiver, user.uid]);

  return (
    <>
      {close ? (
        <div className="h-screen flex items-center justify-center relative w-full">
          <CameraUI />
          <AddUser />
        </div>
      ) : (
        <div className="h-screen relative flex flex-col">
          <AddUser />
          <div className="p-2 bg-[#121212] flex-1 flex flex-col min-h-0">
            <Header
              setClose={setClose}
              receiver={{ ...currentChatInfo, chatId: selectedChatId }}
            />
            <div className="p-3 border-gray-700 rounded-2xl bg-[#1E1E1E] flex-1 flex flex-col min-h-0">
              <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto min-h-0"
              >
                {!selectedChatId ? (
                  <div className="text-center text-gray-400 mt-8">
                    Select a chat to start messaging
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 p-2">
                    {messages.length === 0 ? (
                      <div className="text-gray-400">No messages yet</div>
                    ) : (
                      messages.map((m, i) => {
                        const isOwner = m.senderId === user.uid;
                        const senderInfo = memberDetails[m.senderId];
                        const isViewedByMe =
                          m.viewedBy && m.viewedBy.includes(user.uid);
                        return (
                          <div
                            key={m.id || i}
                            className={`flex gap-2 max-w-[80%] ${
                              isOwner
                                ? "self-end flex-row-reverse"
                                : "self-start"
                            } relative`}
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
                                className={`p-2 rounded-xl ${
                                  isOwner
                                    ? "bg-blue-600 text-white"
                                    : "bg-gray-700 text-white"
                                }`}
                              >
                                {m.type === "snap" ? (
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
                                  <div className="text-sm">{m.text}</div>
                                )}
                              </div>
                              <div className="text-xs text-gray-300 mt-1">
                                {m.createdAt?.toDate?.().toLocaleString?.() ||
                                  ""}
                              </div>
                            </div>

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
                                placement={isOwner ? "left" : "right"}
                              >
                                <button
                                  className="absolute -top-2 text-gray-400 hover:text-white text-xs"
                                  style={isOwner ? { left: -20 } : { right: -20 }}
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
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-[1fr_20fr_1fr_1fr] place-content-center gap-3 mt-4 relative shrink-0">
                {showEmojiPicker && (
                  <div className="absolute bottom-12 right-0 z-50 shadow-lg">
                    <EmojiPicker
                      onEmojiClick={handleEmojiClick}
                      theme="dark"
                      width={400}
                      height={400}
                    />
                  </div>
                )}
                <div
                  className="w-9 h-9 border border-gray-700 rounded-full grid place-content-center bg-[#292929] cursor-pointer"
                  onClick={() => setIsCameraOpen(true)}
                >
                  <CameraFilled style={{ color: "#7E7E7E", fontSize: 18 }} />
                </div>

                <div id="custom-input">
                  <Input
                    className="input"
                    placeholder="Send a chat"
                    ref={inputRef}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    onPressEnter={handleSend}
                    onFocus={async () => {
                      if (selectedChatId) {
                        if (window.__markChatAsSeenOptimistic) {
                          window.__markChatAsSeenOptimistic(selectedChatId);
                        }

                        if (!websocketService.isConnected) {
                          await websocketService.connect();
                        }
                        websocketService.markChatAsSeen(selectedChatId);
                      }
                    }}
                  />
                </div>

                <div
                  className="w-9 h-9 border border-gray-700 rounded-full grid place-content-center bg-[#292929] cursor-pointer"
                  onClick={() => setShowEmojiPicker((prev) => !prev)}
                >
                  <SmileOutlined style={{ color: "#7E7E7E", fontSize: 18 }} />
                </div>

                <div className="w-9 h-9 border border-gray-700 rounded-full grid place-content-center bg-[#292929]">
                  <FileImageOutlined
                    style={{ color: "#7E7E7E", fontSize: 18 }}
                  />
                </div>
              </div>
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
        onSendImage={handleSendImage}
      />
    </>
  );
}
