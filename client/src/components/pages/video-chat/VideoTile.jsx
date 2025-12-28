import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { MicOff, VideoOff } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const VideoTile = ({ participant, isMe, isCameraOff }) => {
  const videoRef = useRef(null);
  const audioRef = useRef(null);

  const getInitials = (name) => {
    return (name || "Anonymous")
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
    if (audioRef.current && participant.stream) {
      audioRef.current.srcObject = participant.stream;
    }
  }, [participant.stream, isCameraOff]);

  return (
    <motion.div
      className="relative w-full h-full min-h-[200px] rounded-2xl overflow-hidden shadow-2xl border-4 border-white"
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      {/* Video Layer */}
      <div className="absolute inset-0 bg-linear-to-br from-gray-800 to-gray-900">
        {isCameraOff ? (
          // Fallback Avatar View
          <div className="flex items-center justify-center h-full">
            <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-white">
              <AvatarImage src={participant.photoURL} />
              <AvatarFallback className="bg-linear-to-br from-yellow-500 to-blue-500 text-white text-3xl md:text-4xl font-bold">
                {getInitials(participant.displayName || participant.name)}
              </AvatarFallback>
            </Avatar>
          </div>
        ) : (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted={isMe}
            className={`w-full h-full object-cover ${
              isMe ? "scale-x-[-1]" : ""
            }`}
          />
        )}
        <audio
          ref={audioRef}
          autoPlay
          playsInline
          muted={isMe}
          className="hidden"
        />
      </div>

      <div className="absolute inset-0 bg-linear-to-t from-black/60 via-transparent to-transparent"></div>

      {/* User Info */}
      <div className="absolute bottom-0 left-0 right-0 p-3 md:p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-white font-bold text-sm md:text-base drop-shadow-lg">
              {participant.displayName || participant.name || "Anonymous"}
            </span>
            {isMe && (
              <span className="bg-yellow-400 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                YOU
              </span>
            )}
          </div>

          {/* Mute Indicator */}
          {participant.isMuted && (
            <div className="bg-red-500 p-1.5 rounded-full">
              <MicOff className="w-3 h-3 md:w-4 md:h-4 text-white" />
            </div>
          )}
        </div>
      </div>

      {/* Camera Off Indicator */}
      {isCameraOff && (
        <div className="absolute top-3 right-3 bg-black/50 backdrop-blur-sm p-2 rounded-full">
          <VideoOff className="w-4 h-4 md:w-5 md:h-5 text-white" />
        </div>
      )}

      {/* Active Speaker Indicator */}
      {participant.isActive && !participant.isMuted && (
        <motion.div
          className="absolute inset-0 border-4 border-green-400 rounded-2xl pointer-events-none"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
      )}
    </motion.div>
  );
};

export default VideoTile;
