import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Modal, List, Avatar, Tooltip } from "antd";
import {
  LeftOutlined,
  PhoneFilled,
  VideoCameraFilled,
  UserOutlined,
  UserAddOutlined,
  DeleteOutlined,
  ExclamationCircleFilled,
} from "@ant-design/icons";
import { doc, getDoc } from "firebase/firestore";

import { websocketService } from "../../../../lib/websocket";
import { v4 as uuidv4 } from "uuid";

import { useAuth } from "../../../../context/AuthContext";
import { db } from "../../../../lib/firebase";
import { formatLastActive } from "../../../../lib/formatTime";
import AddMemberModal from "./AddMemberModal";
import RemoveMemberModal from "./RemoveMemberModal";

export default function Header({ setClose, isInterrupted, receiver }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(receiver?.isOnline || false);
  const [lastActive, setLastActive] = useState(receiver?.lastActive || null);
  const [memberDetails, setMemberDetails] = useState({});
  const [memberIds, setMemberIds] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [targetToRemove, setTargetToRemove] = useState(null);

  const showMembersModal = () => {
    setIsModalOpen(receiver?.isGroup);
  };

  const callUser = async (
    currentUser,
    targetUserId,
    callType = "video",
    chatId = null
  ) => {
    if (isInterrupted) {
      alert("Không thể thực hiện cuộc gọi.");
      return;
    }
    const newRoomId = uuidv4();
    const isGroup = receiver?.isGroup || false;

    let finalPayload = {
      callerId: currentUser.uid,
      callerName: currentUser.displayName || "Anonymous",
      callerPhoto: currentUser.photoURL || "/default-avatar.png",
      roomId: newRoomId,
      timestamp: Date.now(),
      callType,
      chatId,
    };

    try {
      if (!websocketService.isConnected) {
        await websocketService.connect();
        await new Promise((resolve) => setTimeout(resolve, 200));
      }

      if (isGroup) {
        let membersToCall = [];

        if (chatId) {
          const chatRef = doc(db, "chats", chatId);
          const chatDoc = await getDoc(chatRef);

          if (!chatDoc.exists()) {
            console.error(`Chat ${chatId} not found`);
            return;
          }
          const chatData = chatDoc.data();
          membersToCall = (chatData?.members || []).filter(
            (id) => id !== currentUser.uid
          );
        }

        finalPayload = {
          ...finalPayload,
          members: membersToCall,
          type: "group",
          targetUserId: null,
        };

        websocketService.sendIncomingCall(null, finalPayload);
      } else {
        websocketService.sendIncomingCall(targetUserId, finalPayload);
      }

      await new Promise((resolve) => setTimeout(resolve, 300));

      const url = new URL(window.location.origin);
      url.pathname = "/video-chat";
      url.searchParams.set("id", newRoomId);
      url.searchParams.set("mode", callType);

      if (isGroup) {
        url.searchParams.set("type", "group");
      } else {
        url.searchParams.set("target", targetUserId);
      }

      if (chatId) url.searchParams.set("chatId", chatId);

      navigate(url.pathname + url.search);
    } catch (error) {
      console.error("Lỗi khi gọi điện:", error);
      alert(`Không thể kết nối: ${error.message}`);
    }
  };

  const handleMemberAddedSuccess = () => {
    setRefreshKey((prev) => prev + 1);
    setIsAddMemberOpen(false);
  };

  const handleRemoveSuccess = (isSelf) => {
    if (isSelf) {
      setClose(true);
    } else {
      setRefreshKey((prev) => prev + 1);
    }
    setTargetToRemove(null);
  };

  useEffect(() => {
    setIsOnline(receiver?.isOnline);
    setLastActive(receiver?.lastActive);

    const handleStatusUpdate = (data) => {
      if (data.userId === receiver.uid) {
        setIsOnline(data.isOnline);
        if (data.lastActive) {
          setLastActive(data.lastActive);
        }
      }
    };

    websocketService.socket.on("user-status", handleStatusUpdate);

    return () => {
      websocketService.socket.off("user-status", handleStatusUpdate);
    };
  }, [receiver.uid]);

  useEffect(() => {
    if (receiver?.isGroup && receiver?.chatId) {
      const fetchMembersDetail = async () => {
        try {
          const chatRef = doc(db, "chats", receiver.chatId);
          const chatDoc = await getDoc(chatRef);
          if (!chatDoc.exists()) return;
          const memberIdList = chatDoc.data()?.members || [];
          setMemberIds(memberIdList);
          const details = {};
          const promises = memberIdList.map(async (uid) => {
            const userSnap = await getDoc(doc(db, "users", uid));
            if (userSnap.exists()) {
              details[uid] = userSnap.data();
            }
          });
          await Promise.all(promises);
          setMemberDetails(details);
        } catch (error) {
          console.error("Error fetching members:", error);
        }
      };
      fetchMembersDetail();
    }
  }, [receiver.uid, receiver?.isGroup, refreshKey]);
  return (
    <div className="w-full flex justify-between p-3 gap-3 max-h-[61px] h-1/6">
      <div className="flex gap-3">
        <button
          className="bg-[#292929] w-9 h-9 rounded-full hover:bg-[#424242]"
          onClick={() => setClose(true)}
        >
          <LeftOutlined style={{ color: "white" }} />
        </button>
        <div className="flex gap-3 items-center" onClick={showMembersModal}>
          <div className="relative">
            {receiver?.isGroup ? (
              <Avatar.Group
                max={{
                  count: 3,
                  style: { color: "#f56a00", backgroundColor: "#fde3cf" },
                }}
                size="large"
              >
                {memberIds.map((uid) => {
                  const userDetail = memberDetails[uid];
                  return (
                    <Tooltip
                      title={userDetail?.displayName || "Loading"}
                      key={uid}
                    >
                      <Avatar
                        src={userDetail?.photoURL || "/default-avatar.png"}
                        icon={<UserOutlined />}
                      />
                    </Tooltip>
                  );
                })}
              </Avatar.Group>
            ) : (
              <img
                src={receiver.photoURL || "/default-avatar.png"}
                className="w-10 h-10 rounded-full object-cover bg-amber-200"
              />
            )}
            {isOnline && (
              <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-[#1E1E1E]"></div>
            )}
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-white">{receiver.displayName}</span>
            <span className="text-xs text-gray-400">
              {isOnline ? (
                <span className="text-green-400 font-medium">
                  Đang hoạt động
                </span>
              ) : (
                <span>{formatLastActive(lastActive)}</span>
              )}
            </span>
          </div>
        </div>
      </div>
      <div className="bg-[#292929] flex gap-4 p-4 rounded-4xl text-white items-center">
        {receiver?.isGroup && (
          <UserAddOutlined
            className="text-xl cursor-pointer hover:text-blue-400 mr-2"
            title="Thêm thành viên"
            onClick={() => setIsAddMemberOpen(true)}
          />
        )}
        <p className="text-lg font-medium mr-3">Call</p>
        <PhoneFilled
          style={{ fontSize: 18, cursor: "pointer" }}
          title="Audio Call"
          onClick={(e) => {
            e.stopPropagation();
            callUser(user, receiver.uid, "audio", receiver?.chatId);
          }}
        />
        <VideoCameraFilled
          style={{ fontSize: 18, cursor: "pointer" }}
          title="Video Call"
          onClick={(e) => {
            e.stopPropagation();
            callUser(user, receiver.uid, "video", receiver?.chatId);
          }}
        />
      </div>
      <Modal
        title={
          <div className="text-center font-bold">
            Thành viên nhóm ({memberIds.length})
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        centered
        styles={{ maxHeight: "400px", overflowY: "auto" }}
      >
        <List
          itemLayout="horizontal"
          dataSource={memberIds}
          renderItem={(uid) => {
            const userDetail = memberDetails[uid];
            const isTargetMe = uid === user.uid;
            return (
              <List.Item
                actions={[
                  !isTargetMe && (
                    <button
                      key="delete"
                      className="text-red-500 hover:bg-red-100 p-2 rounded-full transition"
                      onClick={() =>
                        setTargetToRemove({
                          uid,
                          displayName: userDetail?.displayName,
                        })
                      }
                      title="Mời ra khỏi nhóm"
                    >
                      <DeleteOutlined />
                    </button>
                  ),
                ]}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      src={userDetail?.photoURL || "/default-avatar.png"}
                      size="large"
                      icon={<UserOutlined />}
                    />
                  }
                  title={
                    <span className="font-semibold">
                      {userDetail?.displayName || "Unknown User"}
                      {isTargetMe && (
                        <span className="text-gray-400 text-xs ml-1">
                          (Bạn)
                        </span>
                      )}
                    </span>
                  }
                />
              </List.Item>
            );
          }}
        />
        <div className="mt-4 text-center border-t pt-2">
          <button
            className="text-red-600 font-semibold hover:underline"
            onClick={() =>
              setTargetToRemove({ uid: user.uid, displayName: "Bạn" })
            }
          >
            Rời khỏi nhóm
          </button>
        </div>
      </Modal>
      {receiver?.isGroup && (
        <AddMemberModal
          isOpen={isAddMemberOpen}
          onClose={() => setIsAddMemberOpen(false)}
          chatId={receiver.chatId}
          currentMembers={memberIds || []}
          onSuccess={handleMemberAddedSuccess}
        />
      )}
      {receiver?.isGroup && (
        <RemoveMemberModal
          isOpen={!!targetToRemove}
          onClose={() => setTargetToRemove(null)}
          chatId={receiver.chatId}
          targetUser={targetToRemove}
          onSuccess={handleRemoveSuccess}
        />
      )}
    </div>
  );
}
