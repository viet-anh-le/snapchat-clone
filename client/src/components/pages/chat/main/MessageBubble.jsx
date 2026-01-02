import { useState, useEffect } from "react";
import { chatService } from "../../../../lib/api";
import { useAuth } from "../../../../context/AuthContext";
import { websocketService } from "../../../../lib/websocket";

const REACTION_ICONS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

const MessageBubble = ({ message, isOwner, chatId }) => {
  const { user } = useAuth();
  const currentUserId = user?.uid;
  const [showPicker, setShowPicker] = useState(false);
  const [optimisticReactions, setOptimisticReactions] = useState(
    message?.reactions || {}
  );
  useEffect(() => {
    setOptimisticReactions(message?.reactions || {});
  }, [message?.reactions]);

  const reactionCounts = Object.values(optimisticReactions).reduce(
    (acc, icon) => {
      acc[icon] = (acc[icon] || 0) + 1;
      return acc;
    },
    {}
  );

  const handleReact = async (emoji) => {
    setShowPicker(false);
    const newReactions = { ...optimisticReactions };
    let action = "add";
    if (newReactions[currentUserId] === emoji) {
      delete newReactions[currentUserId];
      action = "remove";
    } else {
      newReactions[currentUserId] = emoji;
      action = "add";
    }
    setOptimisticReactions(newReactions);
    let notificationText = null;
    if (action === "add" && message.senderId !== currentUserId) {
      notificationText = `${user.displayName} đã bày tỏ ${emoji} vào tin nhắn của bạn`;
    }

    websocketService.sendReactionUpdate(chatId, message.id, {
      updatedReactions: newReactions,
      notificationText: notificationText,
      receiverId: message.senderId,
      lastSenderId: currentUserId,
      isReaction: true,
    });

    try {
      await chatService.reactToMessage(
        chatId,
        message.id,
        emoji,
        user?.displayName
      );
    } catch (err) {
      console.error("Lỗi lưu DB:", err);
    }
  };

  return (
    <div className="relative group min-w-[60px]">
      <div className="wrap-break-words">{message.text}</div>
      {Object.keys(reactionCounts).length > 0 && (
        <div
          className="absolute -bottom-4 right-0 bg-white/90 dark:bg-gray-800/90 border border-gray-200 dark:border-gray-600 rounded-full px-1.5 py-0.5 text-[10px] shadow-sm flex gap-0.5 items-center z-10 cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            setShowPicker(!showPicker);
          }}
        >
          {Object.entries(reactionCounts).map(([icon, count]) => (
            <span key={icon} className="leading-none">
              {icon}{" "}
              {count > 1 && (
                <span className="text-gray-500 font-bold ml-0.5">{count}</span>
              )}
            </span>
          ))}
        </div>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowPicker(!showPicker);
        }}
        className={`
          opacity-0 group-hover:opacity-100 transition-opacity 
          absolute top-1/2 -translate-y-1/2 
          p-2 rounded-full hover:bg-gray-500/20
          text-2xl text-gray-400 hover:text-white
          ${showPicker ? "opacity-100" : ""}
          ${isOwner ? "-left-12" : "-right-12"} 
        `}
      >
        ☺
      </button>

      {showPicker && (
        <div
          className={`
            absolute bottom-[calc(100%+8px)] 
            bg-gray-800 shadow-xl border border-gray-700 
            rounded-full px-3 py-2 flex gap-2 z-50 
            animate-bounce-short 
            w-max  
            ${isOwner ? "right-0" : "left-0"}
        `}
        >
          {REACTION_ICONS.map((icon) => (
            <button
              key={icon}
              onClick={(e) => {
                e.stopPropagation();
                handleReact(icon);
              }}
              className={`p-1.5 text-lg hover:scale-125 transition-transform leading-none ${
                optimisticReactions[currentUserId] === icon
                  ? "bg-blue-100 dark:bg-blue-900 rounded-full"
                  : ""
              }`}
            >
              {icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default MessageBubble;
