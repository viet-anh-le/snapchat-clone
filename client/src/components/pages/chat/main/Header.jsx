import { useNavigate } from "react-router-dom";
import {
  LeftOutlined,
  PhoneFilled,
  VideoCameraFilled,
} from "@ant-design/icons";

import { websocketService } from "../../../../lib/websocket";
import { v4 as uuidv4 } from "uuid";

import { useAuth } from "../../../../context/AuthContext";

export default function Header({ setClose, receiver }) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const callUser = async (
    currentUser,
    targetUserId,
    callType = "video",
    chatId = null
  ) => {
    const newRoomId = uuidv4();

    const callPayload = {
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
      } else {
      }

      await new Promise((resolve) => setTimeout(resolve, 200));

      websocketService.sendIncomingCall(targetUserId, callPayload);

      await new Promise((resolve) => setTimeout(resolve, 300));

      const url = new URL(window.location.origin);
      url.pathname = "/video-chat";
      url.searchParams.set("id", newRoomId);
      url.searchParams.set("target", targetUserId);
      url.searchParams.set("mode", callType);
      if (chatId) url.searchParams.set("chatId", chatId);
      navigate(url.pathname + url.search);
    } catch (error) {
      alert("Không thể kết nối tới người dùng này.");
    }
  };
  return (
    <div className="w-full flex justify-between p-3 gap-3 max-h-[61px] h-1/6">
      <div className="flex gap-3">
        <button
          className="bg-[#292929] w-9 h-9 rounded-full hover:bg-[#424242]"
          onClick={() => setClose(true)}
        >
          <LeftOutlined style={{ color: "white" }} />
        </button>
        <div className="flex gap-3 items-center">
          <div className="w-9 h-9 rounded-full bg-amber-200 overflow-hidden">
            <img
              src={receiver?.photoURL || "/default-avatar.png"}
              alt="avatar"
              className="object-cover"
            />
          </div>
          <p className="text-white font-semibold">{receiver?.displayName}</p>
        </div>
      </div>
      <div className="bg-[#292929] flex gap-4 p-4 rounded-4xl text-white items-center">
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
    </div>
  );
}
