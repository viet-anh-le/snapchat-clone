import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Video } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { websocketService } from "../../../lib/websocket";

const IncomingCallDialog = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [callData, setCallData] = useState(null);

  useEffect(() => {
    if (!user?.uid) {
      console.log("⚠️ [IncomingCallDialog] No user, skipping setup");
      return;
    }

    console.log(`✅ [IncomingCallDialog] Setting up for user ${user.uid}`);

    const setupIncomingCall = async () => {
      try {
        if (!websocketService.isConnected) {
          console.log(
            `🔄 [IncomingCallDialog] Checking WebSocket connection...`
          );
          console.log(
            `🔄 [IncomingCallDialog] WebSocket not connected, connecting...`
          );
          await websocketService.connect();
        } else {
          console.log(`✅ [IncomingCallDialog] WebSocket connected`);
        }
        console.log(`✅ [IncomingCallDialog] WebSocket already connected`);

        console.log(
          `👂 [IncomingCallDialog] Setting up incoming-call listener`
        );
        const unsubscribeIncomingCall = websocketService.onIncomingCall(
          (data) => {
            setCallData({
              callerId: data.callerId,
              callerName: data.callerName,
              callerPhoto: data.callerPhoto,
              roomId: data.roomId,
              timestamp: data.timestamp,
              callType: data.callType || "video",
              chatId: data.chatId,
            });
          }
        );

        const unsubscribeCallCancelled = websocketService.onCallCancelled(
          (data) => {
            setCallData((prev) => {
              if (!prev) return prev;
              const matchByRoom =
                data?.roomId && prev.roomId && data.roomId === prev.roomId;
              const matchByCaller =
                data?.callerId &&
                prev.callerId &&
                data.callerId === prev.callerId;
              return matchByRoom || matchByCaller ? null : prev;
            });
          }
        );

        console.log(`✅ [IncomingCallDialog] Listener setup complete`);
        return () => {
          if (unsubscribeIncomingCall) unsubscribeIncomingCall();
          if (unsubscribeCallCancelled) unsubscribeCallCancelled();
        };
      } catch (error) {
        return () => {};
      }
    };

    let cleanup = null;
    setupIncomingCall().then((unsub) => {
      cleanup = unsub;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, [user]);

  const handleAccept = async () => {
    if (!callData || !user?.uid) return;

    const roomId = callData.roomId;
    const mode = callData.callType || "video";
    const chatId = callData.chatId;
    setCallData(null);

    const url = new URL(window.location.origin);
    url.pathname = "/video-chat";
    url.searchParams.set("id", roomId);
    url.searchParams.set("mode", mode);
    if (chatId) url.searchParams.set("chatId", chatId);
    navigate(url.pathname + url.search);
  };

  const handleDecline = async () => {
    if (!user?.uid || !callData) return;

    websocketService.sendCallDecline(
      callData.callerId,
      callData.roomId,
      callData.chatId
    );
    if (callData.chatId) {
      websocketService.sendMessage(
        callData.chatId,
        "Đã từ chối cuộc gọi",
        "call"
      );
    }
    setCallData(null);
  };

  // Debug: log callData changes
  useEffect(() => {
    console.log("🔍 [IncomingCallDialog] callData state:", callData);
  }, [callData]);

  return (
    <AnimatePresence>
      {callData && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          className="fixed top-4 right-4 z-50 w-full max-w-sm"
          style={{ zIndex: 9999 }}
        >
          <div className="bg-white/90 backdrop-blur-md border-2 border-yellow-400 rounded-2xl shadow-2xl p-4 overflow-hidden">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <Avatar className="h-16 w-16 border-4 border-blue-200">
                  <AvatarImage src={callData.callerPhoto} />
                  <AvatarFallback>{callData.callerName?.[0]}</AvatarFallback>
                </Avatar>
                <span className="absolute -inset-1 rounded-full border-2 border-green-500 animate-ping"></span>
              </div>

              <div>
                <h3 className="font-bold text-lg text-gray-800">
                  {callData.callerName}
                </h3>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  {callData.callType === "audio" ? (
                    <>
                      <Phone className="w-3 h-3" /> Incoming Audio Call...
                    </>
                  ) : (
                    <>
                      <Video className="w-3 h-3" /> Incoming Video Call...
                    </>
                  )}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleDecline}
                className="flex-1 bg-red-100 hover:bg-red-200 text-red-600 font-semibold py-2 px-4 rounded-xl flex items-center justify-center gap-2 transition-colors"
              >
                <PhoneOff className="w-5 h-5" />
                Decline
              </button>

              <button
                onClick={handleAccept}
                className="flex-1 bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-green-500/30 transition-all"
              >
                <Phone className="w-5 h-5 animate-pulse" />
                Answer
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IncomingCallDialog;
