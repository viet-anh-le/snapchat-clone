import { useNavigate } from "react-router-dom";
import { useState, useEffect, useContext } from "react";
import { Modal, Avatar, Tooltip } from "antd";
import {
  LeftOutlined,
  PhoneFilled,
  VideoCameraFilled,
  UserOutlined,
  UserAddOutlined,
  DeleteOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { doc, getDoc, onSnapshot } from "firebase/firestore";

import { websocketService } from "../../../../lib/websocket";
import { v4 as uuidv4 } from "uuid";

import { useAuth } from "../../../../context/AuthContext";
import { db } from "../../../../lib/firebase";
import { formatLastActive } from "../../../../lib/formatTime";
import AddMemberModal from "./AddMemberModal";
import RemoveMemberModal from "./RemoveMemberModal";
import { ChatContext } from "../../../../context/ChatContext";

export default function Header({ setClose, isInterrupted, receiver }) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [memberDetails, setMemberDetails] = useState({});
  const [memberIds, setMemberIds] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [targetToRemove, setTargetToRemove] = useState(null);
  const { getUserStatus } = useContext(ChatContext);

  let isOnline = false;
  let lastActive = null;

  if (receiver?.isGroup) {
    if (memberIds && Array.isArray(memberIds)) {
      isOnline = memberIds.some((uid) => {
        if (uid === user?.uid) return false;
        const status = getUserStatus(uid);
        return status?.isOnline === true;
      });
    }
  } else {
    const realtimeStatus = getUserStatus(receiver?.uid);
    isOnline = realtimeStatus
      ? realtimeStatus.isOnline
      : receiver?.isOnline || false;
    lastActive = realtimeStatus
      ? realtimeStatus.lastActive
      : receiver?.lastActive || null;
  }

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

  const fetchMemberDetails = async (uids) => {
    try {
      const details = {};
      const promises = uids.map(async (uid) => {
        const userSnap = await getDoc(doc(db, "users", uid));
        if (userSnap.exists()) {
          details[uid] = userSnap.data();
        }
      });
      await Promise.all(promises);

      setMemberDetails((prev) => ({ ...prev, ...details }));
    } catch (error) {
      console.error("Error fetching user details:", error);
    }
  };

  useEffect(() => {
    if (receiver?.isGroup && receiver?.chatId) {
      const chatRef = doc(db, "chats", receiver.chatId);
      const unsubscribe = onSnapshot(
        chatRef,
        (docSnapshot) => {
          if (docSnapshot.exists()) {
            const data = docSnapshot.data();
            const currentMembers = data.members || [];
            setMemberIds(currentMembers);
            fetchMemberDetails(currentMembers);
          }
        },
        (error) => {
          console.error("Lỗi lắng nghe thay đổi nhóm:", error);
        }
      );
      return () => {
        unsubscribe();
      };
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
        <div
          className="flex gap-3 items-center cursor-pointer"
          onClick={showMembersModal}
        >
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
            className="text-xl cursor-pointer hover:text-blue-400 mr-2 transition-colors"
            title="Thêm thành viên"
            onClick={() => setIsAddMemberOpen(true)}
          />
        )}
        <p className="text-lg font-medium mr-3">Call</p>
        <PhoneFilled
          style={{ fontSize: 18, cursor: "pointer" }}
          className="hover:text-green-400 transition-colors"
          title="Audio Call"
          onClick={(e) => {
            e.stopPropagation();
            callUser(user, receiver.uid, "audio", receiver?.chatId);
          }}
        />
        <VideoCameraFilled
          style={{ fontSize: 18, cursor: "pointer" }}
          className="hover:text-blue-400 transition-colors"
          title="Video Call"
          onClick={(e) => {
            e.stopPropagation();
            callUser(user, receiver.uid, "video", receiver?.chatId);
          }}
        />
      </div>

      <Modal
        title={
          <div className="text-lg font-bold border-b border-gray-700 pb-3 mb-2 text-white">
            Thành viên nhóm{" "}
            <span className="text-gray-400 text-sm font-normal">
              ({memberIds.length})
            </span>
          </div>
        }
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        footer={null}
        centered
        width={420}
        styles={{
          content: {
            backgroundColor: "#1f1f1f",
            padding: "20px",
            borderRadius: "16px",
            border: "1px solid #333",
          },
          header: {
            backgroundColor: "transparent",
            marginBottom: 0,
          },
          body: {
            paddingTop: "10px",
          },
          mask: {
            backdropFilter: "blur(4px)",
            backgroundColor: "rgba(0, 0, 0, 0.6)",
          },
        }}
        closeIcon={
          <span className="text-gray-400 hover:text-white text-lg">×</span>
        }
      >
        <div className="flex flex-col max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
          {memberIds.map((uid) => {
            const userDetail = memberDetails[uid];
            const isTargetMe = uid === user.uid;

            return (
              <div
                key={uid}
                className="group flex items-center justify-between p-3 rounded-lg hover:bg-[#2d2d2d] transition-all duration-200"
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    src={userDetail?.photoURL || "/default-avatar.png"}
                    size={40}
                    icon={<UserOutlined />}
                    className="border border-gray-600"
                  />
                  <div className="flex flex-col">
                    <span className="font-semibold text-gray-200">
                      {userDetail?.displayName || "Unknown User"}
                    </span>
                    {isTargetMe && (
                      <span className="text-xs text-blue-400 font-medium bg-blue-900/30 px-2 py-0.5 rounded w-fit">
                        Bạn
                      </span>
                    )}
                  </div>
                </div>

                {!isTargetMe && (
                  <Tooltip title="Mời ra khỏi nhóm">
                    <button
                      className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 hover:bg-red-900/20 p-2 rounded-full transition-all duration-200"
                      onClick={() =>
                        setTargetToRemove({
                          uid,
                          displayName: userDetail?.displayName,
                        })
                      }
                    >
                      <DeleteOutlined style={{ fontSize: "18px" }} />
                    </button>
                  </Tooltip>
                )}
              </div>
            );
          })}
        </div>

        <div className="mt-4 pt-3 border-t border-gray-700">
          <button
            className="w-full flex items-center justify-center gap-2 py-2.5 text-red-400 bg-red-900/10 hover:bg-red-900/30 rounded-lg font-medium transition-colors duration-200"
            onClick={() =>
              setTargetToRemove({ uid: user.uid, displayName: "Bạn" })
            }
          >
            <LogoutOutlined />
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
