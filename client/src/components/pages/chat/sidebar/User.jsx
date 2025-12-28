import { useContext, useState, useEffect } from "react";
import { ChatContext } from "../../../../context/ChatContext";
import { useAuth } from "../../../../context/AuthContext";
import { websocketService } from "../../../../lib/websocket";

// Format time for display
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

export default function UserChat({ receiver, chat, isGroup }) {
  const { setClose, setSelectedChatId, setReceiver, isMobile, setSidebarOpen } =
    useContext(ChatContext);
  const { user } = useAuth();
  const [isOnline, setIsOnline] = useState(receiver?.isOnline || false);

  const lastMessage = chat?.lastMessage || "No messages yet";
  const lastSenderId = chat?.lastSenderId;
  const isLastMessageFromMe = lastSenderId === user?.uid;

  const isSeen = chat?.isSeen === false ? false : true;
  const hasUnreadMessage = !isLastMessageFromMe && !isSeen;

  if (chat?.chatId && hasUnreadMessage) {
    console.log(
      `🔵 [Badge ${chat.chatId}] Unread: isSeen=${chat.isSeen}, isLastMessageFromMe=${isLastMessageFromMe}, hasUnreadMessage=${hasUnreadMessage}`
    );
  }
  const timestamp = chat?.updatedAt || chat?.updateAt;
  const formattedTime = formatTime(timestamp);

  useEffect(() => {
    if (isGroup || !receiver?.uid) return;
    setIsOnline(receiver?.isOnline || false);
    const handleStatusUpdate = (data) => {
      if (data.userId === receiver.uid) {
        setIsOnline(data.isOnline);
      }
    };
    websocketService.socket.on("user-status", handleStatusUpdate);
    return () => {
      websocketService.socket.off("user-status", handleStatusUpdate);
    };
  }, [receiver, isGroup]);

  return (
    <div
      className="flex justify-between bg-[#272727] p-4 rounded-lg hover:cursor-pointer"
      onClick={async () => {
        setSelectedChatId(chat?.chatId);
        setReceiver(receiver);
        setClose(false);
        if (isMobile && setSidebarOpen) {
          setSidebarOpen(false);
        }

        if (hasUnreadMessage) {
          // Optimistic update: mark as seen immediately
          if (window.__markChatAsSeenOptimistic) {
            window.__markChatAsSeenOptimistic(chat?.chatId);
          }

          // Then send to server
          if (!websocketService.isConnected) {
            await websocketService.connect();
          }
          websocketService.markChatAsSeen(chat?.chatId);
        }
      }}
    >
      <div className="flex gap-3 flex-1 min-w-0">
        <div className="relative shrink-0">
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-amber-200 overflow-hidden">
            <img
              src={receiver?.photoURL || "/default-avatar.png"}
              alt="avatar"
              className="w-full h-full object-cover"
            />
          </div>

          {!isGroup && isOnline && (
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
    </div>
  );
}
