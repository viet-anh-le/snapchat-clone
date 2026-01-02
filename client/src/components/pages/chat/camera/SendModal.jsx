import { useEffect, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import {
  doc,
  onSnapshot,
  getDoc,
  updateDoc,
  arrayUnion,
} from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../../../lib/firebase";
import { websocketService } from "../../../../lib/websocket";
import {
  SearchOutlined,
  CloseOutlined,
  SendOutlined,
  LoadingOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";
import { message } from "antd";

const SendModal = ({ isOpen, onClose, capturedImage, user, onSuccess }) => {
  const [friends, setFriends] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [sending, setSending] = useState(false);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (!user?.uid || !isOpen) return;
    const unsub = onSnapshot(doc(db, "userchats", user.uid), async (res) => {
      const data = res.data();
      const chatsArray = data.chats || [];

      if (chatsArray.length > 0) {
        const promises = chatsArray.map(async (chatItem) => {
          if (chatItem.type === "group") {
            try {
              const chatRoomSnap = await getDoc(
                doc(db, "chats", chatItem.chatId)
              );
              const chatRoomData = chatRoomSnap.exists()
                ? chatRoomSnap.data()
                : {};

              return {
                uid: chatItem.chatId,
                chatId: chatItem.chatId,
                displayName: chatItem.displayName || "Group",
                photoURL: chatItem.photoURL,
                isGroup: true,
                members: chatRoomData.members || [],
              };
            } catch (e) {
              return null;
            }
          } else {
            try {
              const userDoc = await getDoc(
                doc(db, "users", chatItem.receiverId)
              );
              if (userDoc.exists()) {
                return {
                  uid: chatItem.receiverId,
                  chatId: chatItem.chatId,
                  ...userDoc.data(),
                  isGroup: false,
                };
              }
            } catch (e) {
              console.error("User fetch error", e);
            }
            return null;
          }
        });

        const resolvedFriends = await Promise.all(promises);
        setFriends(resolvedFriends.filter((f) => f !== null));
      }
    });
    return () => unsub();
  }, [user, isOpen]);

  const handleSend = async () => {
    if (selectedUsers.length === 0) return;
    setSending(true);
    try {
      const imageId = uuidv4();
      const storageRef = ref(storage, `snaps/${imageId}.png`);
      await uploadString(storageRef, capturedImage, "data_url");
      const downloadURL = await getDownloadURL(storageRef);

      const sendPromises = selectedUsers.map(async (receiver) => {
        const selectedChatId = receiver.chatId;

        let groupMembers = [];
        if (receiver.isGroup) {
          groupMembers = receiver.members || [];
        }

        websocketService.sendMessage(
          selectedChatId,
          "Sent a Snap",
          "snap",
          downloadURL,
          receiver.uid,
          groupMembers
        );
        return Promise.resolve();
      });

      await Promise.all(sendPromises);

      message.success("Sent Snap!");
      onSuccess();
    } catch (error) {
      console.error(error);
      message.error("Failed to send.");
    } finally {
      setSending(false);
    }
  };
  const handleToggleSelect = (friend) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.uid === friend.uid)
        ? prev.filter((u) => u.uid !== friend.uid)
        : [...prev, friend]
    );
  };

  const filteredFriends = friends.filter((f) =>
    (f.displayName || "")
      .toLowerCase()
      .includes((searchText || "").toLowerCase())
  );

  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-30 bg-[#121212] flex flex-col animate-slideUp">
      <div className="flex items-center justify-between p-4 border-b border-gray-800">
        <div className="flex bg-[#2c2c2c] rounded-full px-4 py-2 flex-1 mr-4">
          <SearchOutlined className="text-gray-400 mr-2" />
          <input
            className="bg-transparent text-white w-full outline-none"
            placeholder="Search..."
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <button onClick={onClose} className="text-white">
          <CloseOutlined />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        <h3 className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2 px-2 mt-2">
          Friends
        </h3>

        {filteredFriends.length === 0 ? (
          <div className="text-center mt-10 text-gray-500">
            <p>No friends found.</p>
            <p className="text-xs">Go to "Add User" to connect.</p>
          </div>
        ) : (
          filteredFriends.map((friend) => {
            const isSelected = selectedUsers.some((u) => u.uid === friend.uid);
            return (
              <div
                key={friend.uid}
                onClick={() => handleToggleSelect(friend)}
                className={`flex items-center justify-between p-3 mb-1 rounded-xl cursor-pointer transition-all ${
                  isSelected
                    ? "bg-blue-500/20 border border-blue-500/50"
                    : "hover:bg-[#2c2c2c] border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <img
                    src={friend.photoURL || "/default-avatar.png"}
                    alt="avatar"
                    className="w-12 h-12 rounded-full object-cover bg-gray-700 shrink-0"
                  />
                  <div className="flex flex-col overflow-hidden">
                    <span
                      className={`font-semibold text-sm truncate ${
                        isSelected ? "text-blue-400" : "text-white"
                      }`}
                    >
                      {friend.displayName}
                    </span>
                    <span className="text-xs text-gray-500 truncate">
                      Tap to send
                    </span>
                  </div>
                </div>

                <div
                  className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-blue-500 border-blue-500"
                      : "border-gray-500"
                  }`}
                >
                  {isSelected && (
                    <CheckCircleFilled className="text-white text-sm" />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="p-4 border-t border-gray-800">
        <button
          onClick={handleSend}
          disabled={sending}
          className="w-full py-4 bg-blue-500 text-white font-bold rounded-full"
        >
          {sending ? <LoadingOutlined /> : <SendOutlined />} Send
        </button>
      </div>
    </div>
  );
};

export default SendModal;
