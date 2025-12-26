import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Crown,
  MoreVertical,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/components/ui/use-toast";

const ParticipantsSidebar = ({ isOpen, onClose, participants }) => {
  const { toast } = useToast();

  const getInitials = (name) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase();
  };

  const handleMoreOptions = () => {
    toast({
      title: "🚧 Feature Not Implemented",
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="bg-linear-to-r from-yellow-400 to-blue-400 p-6 border-b-4 border-yellow-500">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-black">
                    Participants
                  </h2>
                  <p className="text-black/70 text-sm mt-1">
                    {participants.length} in call
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onClose}
                  className="bg-white/20 hover:bg-white/30 text-black rounded-full"
                >
                  <X className="w-6 h-6" />
                </Button>
              </div>
            </div>

            {/* Participants List */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {participants.map((participant, index) => (
                  <motion.div
                    key={participant.id}
                    initial={{ opacity: 0, x: 50 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="bg-linear-to-r from-yellow-50 to-blue-50 rounded-2xl p-4 border-2 border-yellow-200 hover:border-yellow-400 transition-all duration-300"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="w-12 h-12 border-2 border-yellow-400">
                        <AvatarFallback className="bg-linear-to-br from-yellow-400 to-blue-400 text-white font-bold">
                          {getInitials(participant.name)}
                        </AvatarFallback>
                      </Avatar>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-black truncate">
                            {participant.name}
                          </span>
                          {participant.id === 1 && (
                            <Crown className="w-4 h-4 text-yellow-500 shrink-0" />
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          {participant.isMuted ? (
                            <MicOff className="w-3 h-3 text-red-500" />
                          ) : (
                            <Mic className="w-3 h-3 text-green-500" />
                          )}
                          {participant.isCameraOff ? (
                            <VideoOff className="w-3 h-3 text-red-500" />
                          ) : (
                            <Video className="w-3 h-3 text-green-500" />
                          )}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleMoreOptions}
                        className="hover:bg-yellow-200 rounded-full"
                      >
                        <MoreVertical className="w-5 h-5 text-black" />
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ParticipantsSidebar;
