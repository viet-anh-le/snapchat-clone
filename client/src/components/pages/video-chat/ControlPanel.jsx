import { motion } from "framer-motion";
import { Mic, MicOff, Video, VideoOff, PhoneOff, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const ControlPanel = ({
  isMuted,
  toggleMic,
  isCameraOff,
  toggleCamera,
  isSidebarOpen,
  setIsSidebarOpen,
  participantCount,
  onLeave,
}) => {
  const { toast } = useToast();

  const handleEndCall = () => {
    if (onLeave) {
      onLeave();
    } else {
      toast({
        title: "Error",
        description: "Cannot end call right now.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="relative z-20 pb-6 px-4">
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl mx-auto"
      >
        <div className="bg-white/95 backdrop-blur-lg rounded-3xl shadow-2xl p-4 border-4 border-yellow-300">
          <div className="flex items-center justify-center gap-3 md:gap-4">
            {/* Mute/Unmute */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleMic}
              className={`w-14 h-14 md:w-16 md:h-16 rounded-full border-4 transition-all duration-300 ${
                isMuted
                  ? "bg-red-500 border-red-600 hover:bg-red-600 text-white"
                  : "bg-yellow-400 border-yellow-500 hover:bg-yellow-500 text-black"
              }`}
            >
              {isMuted ? (
                <MicOff className="w-6 h-6 md:w-7 md:h-7" />
              ) : (
                <Mic className="w-6 h-6 md:w-7 md:h-7" />
              )}
            </Button>

            {/* Camera On/Off */}
            <Button
              variant="outline"
              size="icon"
              onClick={toggleCamera}
              className={`w-14 h-14 md:w-16 md:h-16 rounded-full border-4 transition-all duration-300 ${
                isCameraOff
                  ? "bg-red-500 border-red-600 hover:bg-red-600 text-white"
                  : "bg-yellow-400 border-yellow-500 hover:bg-yellow-500 text-black"
              }`}
            >
              {isCameraOff ? (
                <VideoOff className="w-6 h-6 md:w-7 md:h-7" />
              ) : (
                <Video className="w-6 h-6 md:w-7 md:h-7" />
              )}
            </Button>

            {/* End Call */}
            <Button
              variant="outline"
              size="icon"
              onClick={handleEndCall}
              className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-red-500 border-4 border-red-600 hover:bg-red-600 text-white transition-all duration-300 scale-110"
            >
              <PhoneOff className="w-7 h-7 md:w-9 md:h-9" />
            </Button>

            {/* Participants Toggle */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className={`w-14 h-14 md:w-16 md:h-16 rounded-full border-4 transition-all duration-300 relative ${
                isSidebarOpen
                  ? "bg-blue-400 border-blue-500 hover:bg-blue-500 text-white"
                  : "bg-yellow-400 border-yellow-500 hover:bg-yellow-500 text-black"
              }`}
            >
              <Users className="w-6 h-6 md:w-7 md:h-7" />
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center border-2 border-white">
                {participantCount}
              </span>
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ControlPanel;
