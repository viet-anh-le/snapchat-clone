import { Phone, Video, PhoneMissed } from "lucide-react";
import { format } from "date-fns";

const CallMessage = ({ message, isOwner }) => {
  const isMissed =
    message.text.toLowerCase().includes("nhỡ") ||
    message.text.toLowerCase().includes("missed") ||
    message.text.toLowerCase().includes("từ chối");
  const isVideo = message.callType === "video";

  const getFormattedTime = (timestamp) => {
    if (!timestamp) return "";

    if (timestamp.toDate && typeof timestamp.toDate === "function") {
      return format(timestamp.toDate(), "HH:mm");
    }

    try {
      return format(new Date(timestamp), "HH:mm");
    } catch (e) {
      return "";
    }
  };

  const durationMatch = message.text.match(/(\d+s|\d+m \d+s)/);
  const durationDisplay = durationMatch ? durationMatch[0] : "";

  const bgColor = isMissed
    ? "bg-red-100 text-red-600 border border-red-200"
    : isOwner
    ? "bg-blue-600 text-white"
    : "bg-gray-800 text-gray-200 border border-gray-700";

  const iconColor = isMissed
    ? "text-red-500 bg-red-200"
    : isOwner
    ? "text-white"
    : "text-gray-300 bg-gray-700";

  return (
    <div
      className={`flex flex-col ${isOwner ? "items-end" : "items-start"} mb-2`}
    >
      <div
        className={`flex items-center gap-3 p-3 rounded-2xl max-w-[280px] shadow-sm ${bgColor}`}
      >
        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
            !isOwner ? iconColor : "bg-white/20"
          }`}
        >
          {isMissed ? (
            <PhoneMissed className="w-5 h-5" />
          ) : isVideo ? (
            <Video className="w-5 h-5" />
          ) : (
            <Phone className="w-5 h-5" />
          )}
        </div>

        <div className="flex flex-col">
          <span className="font-semibold text-sm">
            {isMissed ? "Cuộc gọi nhỡ" : isVideo ? "Video Chat" : "Audio Call"}
          </span>
          <span
            className={`text-xs ${
              isMissed
                ? "text-gray-400"
                : isOwner
                ? "text-blue-100"
                : "text-gray-400"
            }`}
          >
            {isMissed
              ? getFormattedTime(message.createdAt)
              : durationDisplay || "Kết thúc"}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CallMessage;
