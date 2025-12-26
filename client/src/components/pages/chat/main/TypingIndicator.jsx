import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

const TypingIndicator = ({ userPhoto, userName }) => {
  return (
    <div className="flex items-center gap-2 mt-2 ml-1">
      {/* Avatar người đang gõ */}
      <Avatar className="w-6 h-6 border border-gray-200">
        <AvatarImage src={userPhoto || "/default-avatar.png"} />
        <AvatarFallback className="text-[10px]">{userName?.[0]}</AvatarFallback>
      </Avatar>

      {/* Bubble chứa 3 chấm */}
      <div className="bg-gray-200 dark:bg-gray-700 rounded-2xl px-3 py-2 flex items-center gap-1 h-8">
        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
        <span className="w-1.5 h-1.5 bg-gray-500 rounded-full animate-bounce"></span>
      </div>
    </div>
  );
};

export default TypingIndicator;
