import { useContext, useState } from "react";
import { ChatContext } from "../../../../context/ChatContext";
import { useAuth } from "../../../../context/AuthContext";
import { websocketService } from "../../../../lib/websocket";
import { Popover, Button } from "antd";
import {
  MoreOutlined,
  FolderAddOutlined,
  FolderOpenOutlined,
} from "@ant-design/icons";

const formatTime = (timestamp) => {
  if (!timestamp) return "";
  const now = new Date();
  const time = new Date(timestamp);
  const diffMs = now - time;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return time.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
};

export default function UserChat({ receiver, chat, isGroup, isArchived }) {
  const {
    setClose,
    setSelectedChatId,
    setReceiver,
    isMobile,
    setSidebarOpen,
    getUserStatus,
  } = useContext(ChatContext);
  const { user } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);

  const lastMessage = chat?.lastMessage || "No messages yet";
  const lastSenderId = chat?.lastSenderId;
  const isLastMessageFromMe = lastSenderId === user?.uid;

  const isSeen = chat?.isSeen === false ? false : true;
  const hasUnreadMessage = !isLastMessageFromMe && !isSeen;
  let isOnline = false;

  if (isGroup) {
    if (chat?.members && Array.isArray(chat.members)) {
      isOnline = chat.members.some((memberId) => {
        if (memberId === user?.uid) return false;
        const status = getUserStatus(memberId);
        return status?.isOnline === true;
      });
    }
  } else {
    const realtimeStatus = getUserStatus(receiver?.uid);
    isOnline = realtimeStatus
      ? realtimeStatus.isOnline
      : receiver?.isOnline || false;
  }
  const timestamp = chat?.updatedAt || chat?.updateAt;
  const formattedTime = formatTime(timestamp);

  const handleArchive = (e) => {
    e.stopPropagation();
    websocketService.archiveChat(chat.chatId);
    setMenuOpen(false);
  };

  const handleUnarchive = (e) => {
    e.stopPropagation();
    websocketService.unarchiveChat(chat.chatId);
    setMenuOpen(false);
  };

  const menuContent = (
    <div className="flex flex-col gap-1 min-w-40">
      {isArchived ? (
        <Button
          type="text"
          icon={<FolderOpenOutlined />}
          className="text-left w-full justify-start"
          onClick={handleUnarchive}
        >
          Khôi phục hội thoại
        </Button>
      ) : (
        <Button
          type="text"
          icon={<FolderAddOutlined />}
          className="text-left w-full justify-start"
          onClick={handleArchive}
        >
          Ẩn hội thoại
        </Button>
      )}
    </div>
  );

  return (
    <div
      className="group flex justify-between bg-[#272727] p-4 rounded-lg hover:cursor-pointer hover:bg-[#333] transition-colors relative"
      onClick={async () => {
        setSelectedChatId(chat?.chatId);
        setReceiver(receiver);
        setClose(false);
        if (isMobile && setSidebarOpen) {
          setSidebarOpen(false);
        }

        if (hasUnreadMessage) {
          if (window.__markChatAsSeenOptimistic) {
            window.__markChatAsSeenOptimistic(chat?.chatId);
          }
          websocketService.markChatAsSeen(chat?.chatId);
        }
      }}
    >
      <div title={lastMessage} className="flex gap-3 flex-1 min-w-0 mr-2">
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-amber-200 overflow-hidden">
            <img
              src={receiver?.photoURL || "/default-avatar.png"}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          </div>

          {isOnline && (
            <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-[#272727] rounded-full"></div>
          )}
        </div>

        <div className="text-white flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p
              className={`text-base font-semibold truncate ${
                hasUnreadMessage ? "font-bold" : ""
              }`}
            >
              {receiver?.displayName}
            </p>
            {hasUnreadMessage && (
              <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0"></div>
            )}
          </div>
          <div className="text-xs text-gray-400 flex items-center gap-1 truncate">
            {isLastMessageFromMe && (
              <span className="shrink-0 text-gray-500">You: </span>
            )}
            <span
              className={`truncate ${
                hasUnreadMessage ? "text-white font-medium" : ""
              }`}
            >
              {lastMessage}
            </span>
            {formattedTime && (
              <>
                <span>·</span>
                <span className="shrink-0">{formattedTime}</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div
        className={`
          flex items-center justify-center shrink-0
          opacity-0 group-hover:opacity-100 transition-opacity
          ${menuOpen ? "opacity-100" : ""}
          ${isMobile ? "opacity-100" : ""} /* Mobile luôn hiện để dễ bấm */
        `}
        onClick={(e) => e.stopPropagation()}
      >
        <Popover
          content={menuContent}
          trigger="click"
          placement="bottomRight"
          open={menuOpen}
          onOpenChange={setMenuOpen}
          overlayInnerStyle={{ padding: 4 }}
        >
          <button className="p-2 rounded-full hover:bg-gray-600 text-gray-400 hover:text-white transition-colors">
            <MoreOutlined style={{ fontSize: "20px" }} />
          </button>
        </Popover>
      </div>
    </div>
  );
}
