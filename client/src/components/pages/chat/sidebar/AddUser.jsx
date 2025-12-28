import { useContext, useState, useEffect } from "react";
import "./styles.css";
import { Input, Space, Badge, Button, Tabs, message } from "antd";
import {
  UserAddOutlined,
  CheckOutlined,
  StopOutlined,
  CloseOutlined,
  LoadingOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  UnlockOutlined,
} from "@ant-design/icons";

import { db } from "../../../../lib/firebase";
import { apiService } from "../../../../lib/api";
import { friendService } from "../../../../lib/api";

import {
  collection,
  query,
  where,
  getDocs,
  limit,
  doc,
  updateDoc,
  onSnapshot,
  arrayRemove,
} from "firebase/firestore";

import { ChatContext } from "../../../../context/ChatContext";
import { useAuth } from "../../../../context/AuthContext";

export default function AddUser() {
  const { toggleAddUser } = useContext(ChatContext);
  const { user } = useAuth();
  const [messageApi, contextHolder] = message.useMessage();

  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);

  const [addingStatus, setAddingStatus] = useState({});
  const [processingId, setProcessingId] = useState(null);

  const [friendIds, setFriendIds] = useState(new Set());
  const [blockedIds, setBlockedIds] = useState(new Set());
  const [sentRequests, setSentRequests] = useState(new Set());
  const [friendRequests, setFriendRequests] = useState([]);

  const handleSearch = async (value) => {
    setSearch(value);
    if (value.trim() === "") {
      setResults([]);
      return;
    }
    const usersRef = collection(db, "users");
    const q1 = query(
      usersRef,
      where("displayName", ">=", value),
      where("displayName", "<=", value + "\uf8ff"),
      limit(10)
    );
    const q2 = query(
      usersRef,
      where("email", ">=", value),
      where("email", "<=", value + "\uf8ff"),
      limit(10)
    );

    try {
      const [snap1, snap2] = await Promise.all([getDocs(q1), getDocs(q2)]);
      const temp = [];
      snap1.forEach((doc) => temp.push(doc.data()));
      snap2.forEach((doc) => temp.push(doc.data()));

      const unique = Array.from(
        new Map(temp.map((u) => [u.uid, u])).values()
      ).filter((u) => u.uid !== user.uid);

      setResults(unique);
    } catch (error) {}
  };

  const handleSendRequest = async (userTarget) => {
    setAddingStatus((prev) => ({ ...prev, [userTarget.uid]: "loading" }));

    try {
      await apiService.sendFriendRequest(userTarget.uid);
      messageApi.success("Friend request sent!");
    } catch (error) {
      console.error("Lỗi:", error.message);
      messageApi.error(error.message || "Failed to send request.");
    } finally {
      setAddingStatus((prev) => ({ ...prev, [userTarget.uid]: "idle" }));
    }
  };

  const handleCancelRequest = async (receiverUid) => {
    try {
      await updateDoc(doc(db, "users", user.uid), {
        sentRequests: arrayRemove(receiverUid),
      });
      messageApi.info("Request canceled");
    } catch (e) {
      messageApi.error("Error");
    }
  };

  const handleAcceptRequest = async (requestUser) => {
    if (processingId) return;
    setProcessingId(requestUser.uid);
    try {
      await apiService.acceptFriendRequest(requestUser.uid);
      messageApi.success(`You and ${requestUser.displayName} are now friends!`);
    } catch (error) {
      messageApi.error(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectRequest = async (requestUser) => {
    if (processingId) return;
    setProcessingId(requestUser.uid);
    try {
      await apiService.rejectFriendRequest(requestUser.uid);
      messageApi.info("Request removed.");
    } catch (error) {
      messageApi.error(error.message);
    } finally {
      setProcessingId(null);
    }
  };

  const handleBlock = async (targetUid) => {
    try {
      await apiService.blockUser(targetUid);
      messageApi.success("User blocked successfully");
    } catch (err) {
      console.error(err);
      messageApi.error(err.message || "Failed to block user");
    }
  };

  const handleUnblock = async (targetUid) => {
    try {
      await friendService.unblockUser(targetUid);
      messageApi.success("Đã bỏ chặn người dùng.");
    } catch (err) {
      console.error(err);
      messageApi.error(err.message || "Failed to unblock user");
    }
  };

  useEffect(() => {
    if (!user?.uid) return;
    // Lấy Friends, Block, SentRequests, FriendRequests
    const unSubUser = onSnapshot(doc(db, "users", user.uid), (res) => {
      const data = res.data();
      if (data) {
        setFriendIds(new Set(data.friends || []));
        setBlockedIds(new Set(data.blocked || []));
        setFriendRequests(data.friendRequests || []);

        setSentRequests(new Set(data.sentRequests || []));
      }
    });

    return () => {
      unSubUser();
    };
  }, [user.uid]);

  const tabItems = [
    {
      key: "1",
      label: (
        <Badge count={friendRequests.length} offset={[10, 0]} size="small">
          <span className="text-white font-semibold">Find friends</span>
        </Badge>
      ),
      children: (
        <>
          <Space.Compact className="my-4 w-full">
            <Input
              placeholder="Search..."
              className="input"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </Space.Compact>
          <div className="bg-[#292929] text-white text-sm min-h-40 max-h-[400px] overflow-y-auto rounded-3xl p-3 scrollbar-hide">
            {results.length === 0 && search && (
              <p className="text-center text-gray-500 mt-4">No user found</p>
            )}

            {results.map((u) => {
              const status = addingStatus[u.uid] || "idle";
              const isFriend = friendIds.has(u.uid);
              const isBlocked = blockedIds.has(u.uid);

              const isSent = sentRequests.has(u.uid);

              const hasIncomingRequest = friendRequests.some(
                (req) => req.uid === u.uid
              );

              return (
                <div
                  key={u.uid}
                  className="flex justify-between items-center mb-3 p-1 hover:bg-[#333] rounded-xl transition"
                >
                  <div className="flex items-center gap-3 min-w-0 cursor-pointer flex-1">
                    <img
                      src={u.photoURL || "/default-avatar.png"}
                      alt=""
                      className="h-10 w-10 rounded-full object-cover shrink-0"
                    />
                    <div className="overflow-hidden">
                      <p className="font-semibold truncate text-white">
                        {u.displayName}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {u.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2 items-center shrink-0">
                    {!isBlocked && (
                      <button
                        onClick={() => handleBlock(u.uid)}
                        className="bg-red-500/10 text-red-500 p-2 rounded-full hover:bg-red-500/30 transition w-8 h-8 flex justify-center items-center"
                      >
                        <StopOutlined />
                      </button>
                    )}

                    <div className="w-24 flex justify-end">
                      {isBlocked ? (
                        <button
                          onClick={() => handleUnblock(u.uid)}
                          className="w-full h-8 flex items-center justify-center bg-gray-700 text-gray-300 border border-gray-600 rounded-3xl text-xs font-medium hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all group"
                        >
                          <UnlockOutlined className="mr-1" /> Unblock
                        </button>
                      ) : isFriend ? (
                        <div className="w-full py-1 rounded-3xl bg-green-600/20 text-green-500 border border-green-600/50 text-[10px] font-semibold flex items-center justify-center gap-1">
                          <CheckOutlined /> Friend
                        </div>
                      ) : hasIncomingRequest ? (
                        <div
                          className="w-full py-1 rounded-3xl bg-blue-600/20 text-blue-400 border border-blue-600/50 text-[10px] font-semibold flex items-center justify-center gap-1 cursor-default"
                          title="Check Requests tab"
                        >
                          <ExclamationCircleOutlined /> Respond
                        </div>
                      ) : isSent ? (
                        <button
                          className="w-full h-8 flex items-center justify-center bg-orange-600/20 text-orange-500 border border-orange-600/50 rounded-3xl text-xs font-medium hover:bg-red-600 hover:text-white hover:border-red-600 transition-all group"
                          onClick={() => handleCancelRequest(u.uid)}
                        >
                          <span className="group-hover:hidden flex items-center">
                            <ClockCircleOutlined className="mr-1" /> Sent
                          </span>
                          <span className="hidden group-hover:flex items-center">
                            <CloseOutlined className="mr-1" /> Cancel
                          </span>
                        </button>
                      ) : (
                        <button
                          className="w-full h-8 flex items-center justify-center bg-[#424242] text-white hover:bg-blue-600 rounded-3xl text-xs font-medium transition-all"
                          disabled={status === "loading"}
                          onClick={() => handleSendRequest(u)}
                        >
                          {status === "loading" ? (
                            <LoadingOutlined />
                          ) : (
                            <>
                              <UserAddOutlined className="mr-1" /> Add
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ),
    },
    {
      key: "2",
      label: (
        <Badge count={friendRequests.length} offset={[10, 0]} size="small">
          <span className="text-white font-semibold">Requests</span>
        </Badge>
      ),
      children: (
        <div className="bg-[#292929] text-white text-sm h-[400px] overflow-y-auto rounded-3xl p-3 mt-4 scrollbar-hide">
          {friendRequests.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
              <UserAddOutlined style={{ fontSize: 24, marginBottom: 8 }} />
              <p>No new requests</p>
            </div>
          ) : (
            friendRequests.map((req) => (
              <div
                key={req.uid}
                className="flex justify-between items-center mb-3 p-2 bg-[#333] rounded-xl hover:bg-[#3a3a3a] transition"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0 mr-2">
                  <img
                    src={req.photoURL || "/default-avatar.png"}
                    className="h-10 w-10 rounded-full object-cover shrink-0"
                  />
                  <div className="overflow-hidden">
                    <p className="font-semibold truncate text-white">
                      {req.displayName}
                    </p>
                    <span className="text-[10px] text-gray-400">
                      Wants to connect
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button
                    size="small"
                    type="primary"
                    className="bg-blue-600 hover:bg-blue-500 border-none"
                    loading={processingId === req.uid}
                    onClick={() => handleAcceptRequest(req)}
                  >
                    Confirm
                  </Button>
                  <Button
                    size="small"
                    type="text"
                    className="bg-[#424242] text-gray-300 hover:text-white hover:bg-red-500/80"
                    disabled={processingId === req.uid}
                    onClick={() => handleRejectRequest(req)}
                  >
                    <CloseOutlined />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      {contextHolder}
      {toggleAddUser && (
        <div className="w-[400px] bg-[#121212] custom-add-user p-3 rounded-3xl">
          <Tabs
            defaultActiveKey="1"
            items={tabItems}
            centered
            className="custom-tabs"
          />
        </div>
      )}
    </>
  );
}
