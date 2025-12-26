import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

const ChatPanel = ({ isOpen, onClose, messages }) => {
  const [messageInput, setMessageInput] = useState("");
  const { toast } = useToast();

  const handleSendMessage = () => {
    if (messageInput.trim()) {
      toast({
        title: "🚧 Feature Not Implemented",
      });
      setMessageInput("");
    }
  };

  const handleEmojiClick = () => {
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

          {/* Chat Panel */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed left-0 top-0 bottom-0 w-full sm:w-96 bg-white shadow-2xl z-50 flex flex-col"
          >
            {/* Header */}
            <div className="bg-linear-to-r from-blue-400 to-yellow-400 p-6 border-b-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-black">Chat</h2>
                  <p className="text-black/70 text-sm mt-1">
                    {messages.length} messages
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

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-linear-to-r from-yellow-50 to-blue-50 rounded-2xl p-4 border-2 border-yellow-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-linear-to-br from-yellow-400 to-blue-400 flex items-center justify-center text-white font-bold text-sm">
                      {message.sender
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-black text-sm">
                          {message.sender}
                        </span>
                        <span className="text-xs text-black/50">
                          {message.timestamp}
                        </span>
                      </div>
                      <p className="text-black mt-1">{message.text}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t-4 border-yellow-300 bg-linear-to-r from-yellow-50 to-blue-50">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleEmojiClick}
                  className="hover:bg-yellow-200 rounded-full"
                >
                  <Smile className="w-5 h-5 text-black" />
                </Button>
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 px-4 py-3 rounded-full border-2 border-yellow-300 focus:border-yellow-500 focus:outline-none bg-white text-black placeholder:text-black/50"
                />
                <Button
                  onClick={handleSendMessage}
                  className="bg-linear-to-r from-yellow-400 to-blue-400 hover:from-yellow-500 hover:to-blue-500 text-black rounded-full w-12 h-12 p-0 border-2 border-yellow-500"
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChatPanel;
