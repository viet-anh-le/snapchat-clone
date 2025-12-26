import { useState, useEffect, useContext } from "react";
import {
  UsergroupAddOutlined,
  CloseOutlined,
  CheckCircleFilled,
} from "@ant-design/icons";
import { Button, Input, Avatar, message } from "antd";
import { db } from "../../../../lib/firebase";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import { useAuth } from "../../../../context/AuthContext";
import { ChatContext } from "../../../../context/ChatContext";
import { apiService } from "../../../../lib/api";

const NewChatPanel = () => {
  const { user } = useAuth();
  const { setShowNewChat, setSelectedChatId, setReceiver, setClose } =
    useContext(ChatContext);

  const [friends, setFriends] = useState([]);
  const [chats, setChats] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [isGroupMode, setIsGroupMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [groupName, setGroupName] = useState("");

  const handleSelectUser = (targetUser) => {
    if (isGroupMode) {
      setSelectedUsers((prev) => {
        const isSelected = prev.some((u) => u.uid === targetUser.uid);
        if (isSelected) return prev.filter((u) => u.uid !== targetUser.uid);
        return [...prev, targetUser];
      });
    } else {
      handleCreateSingleChat(targetUser);
    }
  };

  // Tạo Chat 1-1
  const handleCreateSingleChat = (targetUser) => {
    const existingChat = chats.find(
      (chat) => chat?.receiverId === targetUser.uid
    );

    if (existingChat) {
      setSelectedChatId(existingChat.chatId);
      setReceiver({
        uid: targetUser.uid,
        displayName: targetUser.displayName,
        photoURL: targetUser.photoURL,
      });
      setShowNewChat(false);
      setClose(false);
    } else {
    }
  };

  const handleCreateGroup = async () => {
    if (selectedUsers.length === 0) return;
    if (!groupName.trim()) {
      message.warning("Vui lòng nhập tên nhóm!");
      return;
    }

    setLoading(true);
    try {
      const response = await apiService.createGroup(selectedUsers, groupName);
      const { chatId } = response;


      setSelectedChatId(chatId);
      setShowNewChat(false);
      setClose(false);
      message.success("Tạo nhóm thành công!");
    } catch (error) {
      console.error("Error creating group:", error);
      message.error(error.message || "Lỗi không xác định");
    } finally {
      setLoading(false);
    }
  };

  // Filter Search
  const filteredFriends = friends.filter((f) =>
    (f.displayName || "")
      .toLowerCase()
      .includes((searchTerm || "").toLowerCase())
  );

  useEffect(() => {
    const fetchFriends = async () => {
      if (!user?.uid) return;
      try {
        const currentUserRef = doc(db, "users", user.uid);
        const currentUserSnap = await getDoc(currentUserRef);

        if (currentUserSnap.exists()) {
          const userData = currentUserSnap.data();
          const friendIds = userData.friends || [];

          if (friendIds.length === 0) {
            setFriends([]);
            return;
          }

          const listFriendPromises = friendIds.map((friendUid) => {
            return getDoc(doc(db, "users", friendUid));
          });

          const friendSnapshots = await Promise.all(listFriendPromises);

          const friendList = friendSnapshots
            .map((snap) => {
              if (snap.exists()) {
                return snap.data();
              }
              return null;
            })
            .filter((item) => item !== null);
          setFriends(friendList);
        }
      } catch (err) {
        console.error("Lỗi fetch friends:", err);
      }
    };
    fetchFriends();
  }, [user]);

  useEffect(() => {
    if (!user?.uid) return;

    const unSub = onSnapshot(doc(db, "userchats", user.uid), async (res) => {
      if (!res.exists()) {
        setChats([]);
        return;
      }

      const items = res.data()?.chats || [];

      const promises = items.map(async (item) => {
        if (item.type === "group") {
          return {
            ...item,
            receiver: {
              uid: item.chatId,
              displayName: item.displayName || "Group",
              photoURL: item.photoURL,
            },
            isGroup: true,
          };
        } else {
          try {
            const userDocRef = doc(db, "users", item.receiverId);
            const userDocSnap = await getDoc(userDocRef);
            const receiver = userDocSnap.data();
            return { ...item, receiver, isGroup: false };
          } catch (err) {
            return {
              ...item,
              receiver: { displayName: "User Deleted" },
              isGroup: false,
            };
          }
        }
      });

      const chatData = await Promise.all(promises);
      setChats(chatData.sort((a, b) => b.updatedAt - a.updatedAt));
    });

    return () => {
      unSub();
    };
  }, [user.uid]);

  return (
    <div className="h-full bg-[#1e1e1e] border-r border-gray-700 flex flex-col w-[350px] animate-slideRight">
      {/* Header Panel */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-between">
        <h2 className="text-white text-lg font-bold">New Chat</h2>
        <Button
          type="text"
          icon={<CloseOutlined style={{ color: "white" }} />}
          onClick={() => setShowNewChat(false)}
        />
      </div>

      {/* Search & Group Toggle */}
      <div className="p-3 flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="bg-[#2c2c2c] flex items-center px-3 py-1 rounded-lg flex-1">
            <span className="text-gray-400 mr-2">To:</span>
            <input
              className="bg-transparent border-none outline-none text-white w-full"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Button
          className={`w-full flex items-center justify-center gap-2 border-none h-10 font-semibold transition-all
                ${
                  isGroupMode
                    ? "bg-blue-500 text-white"
                    : "bg-[#2c2c2c] text-white hover:bg-[#3a3a3a]"
                }`}
          onClick={() => {
            setIsGroupMode(!isGroupMode);
            setSelectedUsers([]);
          }}
        >
          <UsergroupAddOutlined />
          {isGroupMode ? "New Group Mode: ON" : "New Group"}
        </Button>
      </div>

      {/* List Friends */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <p className="px-4 py-2 text-xs text-gray-500 font-bold">RECENTS</p>

        {filteredFriends.map((friend) => {
          const isSelected = selectedUsers.some((u) => u.uid === friend.uid);
          return (
            <div
              key={friend.uid}
              onClick={() => handleSelectUser(friend)}
              className={`flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-[#2c2c2c] transition-colors
                        ${isSelected ? "bg-[#2c2c2c]" : ""}`}
            >
              <div className="flex items-center gap-3">
                <Avatar
                  src={friend.photoURL || "/default-avatar.png"}
                  size="large"
                  icon={!friend.photoURL && <UsergroupAddOutlined />}
                />
                <div className="flex flex-col">
                  <span className="text-white font-medium">
                    {friend.displayName}
                  </span>
                </div>
              </div>

              {isGroupMode && (
                <div
                  className={`w-6 h-6 rounded-full border border-gray-500 flex items-center justify-center
                            ${
                              isSelected
                                ? "bg-blue-500 border-none"
                                : "bg-transparent"
                            }`}
                >
                  {isSelected && <CheckCircleFilled className="text-white" />}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Button Create Group (Chỉ hiện khi Mode Group ON và đã chọn người) */}
      {isGroupMode && selectedUsers.length > 0 && (
        <div className="p-4 border-t border-gray-700 bg-[#1e1e1e] flex flex-col gap-3">
          <Input
            placeholder="Đặt tên nhóm (Bắt buộc)"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="bg-[#2c2c2c] border-gray-600 text-white placeholder-gray-400 focus:bg-[#2c2c2c] hover:bg-[#2c2c2c]"
            maxLength={30}
          />

          <Button
            type="primary"
            className="w-full h-10 rounded-full bg-blue-500 font-bold hover:bg-blue-600"
            loading={loading}
            onClick={handleCreateGroup}
          >
            Chat with Group ({selectedUsers.length})
          </Button>
        </div>
      )}
    </div>
  );
};

export default NewChatPanel;
