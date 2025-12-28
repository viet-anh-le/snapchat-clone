import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { Helmet } from "react-helmet";
import VideoGrid from "@/components/pages/video-chat/VideoGrid";
import ControlPanel from "@/components/pages/video-chat/ControlPanel";
import ParticipantsSidebar from "@/components/pages/video-chat/ParticipantsSidebar";
import ChatPanel from "@/components/pages/video-chat/ChatPanel";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/components/ui/use-toast";
import {
  setMainStream,
  setUser,
  addParticipant,
  removeParticipant,
  updateParticipant,
  updateUser,
} from "@/store/actioncreator";
import { websocketService } from "@/lib/websocket";
import { useAuth } from "@/context/AuthContext";

export default function VideoChat() {
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("id");
  const targetUserId = searchParams.get("target");
  const mode = searchParams.get("mode") || "video";
  const isAudioOnly = mode === "audio";
  const chatId = searchParams.get("chatId");
  const typeParam = searchParams.get("type");
  const navigate = useNavigate();
  const streamRef = useRef(null);
  const cancelSentRef = useRef(false);
  const callEndedSentRef = useRef(false);
  const participantsRef = useRef({});
  const endingRef = useRef(false);
  const startTimeRef = useRef(Date.now());
  const otherUserIdRef = useRef(null);
  const otherJoinedRef = useRef(false);
  const callEndLoggedRef = useRef(false);
  const callLoggedRef = useRef(false);
  const isCallCompletedRef = useRef(false);
  const leaveCallTriggeredRef = useRef(false);

  const dispatch = useDispatch();
  const { user } = useAuth();
  const { participants, mainStream } = useSelector((state) => state.userState);
  const { toast, toasts } = useToast();

  const [messages] = useState([]);

  const sendCancelIfNeeded = () => {
    if (cancelSentRef.current) return;
    if (isCallCompletedRef.current) return;
    if (otherJoinedRef.current) return;
    if (targetUserId && roomId) {
      const currentCallType = isAudioOnly ? "audio" : "video";
      websocketService.sendCallCancel(
        targetUserId,
        roomId,
        chatId,
        currentCallType
      );
      cancelSentRef.current = true;
    }
  };

  const sendCallEnd = (durationSec) => {
    if (callEndedSentRef.current) return;
    callEndedSentRef.current = true;
    const target = otherUserIdRef.current || targetUserId;
    const currentCallType = isAudioOnly ? "audio" : "video";
    if (target && roomId) {
      websocketService.sendCallEnd(target, roomId, chatId, {
        durationSec,
        callType: currentCallType,
      });
    }
  };

  // Lắng nghe thay đổi media (audio/video) từ các user khác
  useEffect(() => {
    const unsubscribe = websocketService.onMediaPreferenceUpdated((data) => {
      if (!data?.userId || !data.preference) return;

      if (data.userId === user?.uid) {
        dispatch(updateUser({ [data.userId]: data.preference }));
      } else {
        dispatch(updateParticipant({ [data.userId]: data.preference }));
      }
    });

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [dispatch, user?.uid]);

  const toggleMic = () => {
    if (mainStream) {
      const audioTrack = mainStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setIsMuted(!audioTrack.enabled);
        // Notify other participants via WebSocket
        if (roomId && user?.uid) {
          websocketService.updateMediaPreference(roomId, {
            audio: audioTrack.enabled,
          });
        }
      }
    }
  };

  const toggleCamera = () => {
    if (isAudioOnly) return; // audio call không có camera
    if (mainStream) {
      const videoTrack = mainStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setIsCameraOff(!videoTrack.enabled);
        // Notify other participants via WebSocket
        if (roomId && user?.uid) {
          websocketService.updateMediaPreference(roomId, {
            video: videoTrack.enabled,
          });
        }
      }
    }
  };

  // Keep latest participants in a ref for timeout checks
  useEffect(() => {
    participantsRef.current = participants || {};
  }, [participants]);

  // Auto-cancel if callee does not join within 10 seconds
  useEffect(() => {
    if (!targetUserId || !roomId) return;

    const timeoutId = setTimeout(() => {
      const hasTarget = !!participantsRef.current[targetUserId];
      if (!hasTarget) {
        sendCancelIfNeeded();
        endCall("Cuộc gọi không được trả lời", true, 0);
      }
    }, 10000);

    return () => clearTimeout(timeoutId);
  }, [targetUserId, roomId, navigate]);

  // Nếu là audio-only thì tắt camera UI state
  useEffect(() => {
    if (isAudioOnly) {
      setIsCameraOff(true);
    }
  }, [isAudioOnly]);

  const performCleanup = async () => {
    sendCancelIfNeeded();

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }

    // if (roomId) {
    //   websocketService.leaveVideoRoom(roomId);
    // }

    // reset refs for next call
    otherUserIdRef.current = null;
    otherJoinedRef.current = false;
    callEndLoggedRef.current = false;
    callLoggedRef.current = false;
    callEndedSentRef.current = false;
    cancelSentRef.current = false;
    startTimeRef.current = Date.now();
  };

  const clearToasts = useCallback(() => {
    (toasts || []).forEach((t) => t?.dismiss?.());
  }, [toasts]);

  const endCall = async (message, reload = false, delayMs = 0) => {
    if (endingRef.current) return;
    endingRef.current = true;
    if (message) {
      toast({ title: message });
    }
    await performCleanup();
    const doNavigate = () => {
      clearToasts();
      navigate("/chat", { replace: true });
      if (reload) {
        window.location.reload();
      }
    };
    if (delayMs > 0) {
      setTimeout(doNavigate, delayMs);
    } else {
      doNavigate();
    }
  };

  // Clear stale toasts on unmount
  useEffect(() => {
    return () => clearToasts();
  }, [clearToasts]);

  const handleLeaveCall = async () => {
    leaveCallTriggeredRef.current = true;
    const durationSec = Math.max(
      1,
      Math.round((Date.now() - startTimeRef.current) / 1000)
    );
    if (typeParam === "group") {
      const currentCallType = isAudioOnly ? "audio" : "video";
      websocketService.leaveVideoRoom(roomId, {
        chatId: chatId,
        durationSec: durationSec,
        callType: currentCallType,
      });
      await performCleanup();
      navigate("/chat");
    } else {
      isCallCompletedRef.current = true;
      sendCallEnd(durationSec);
      await endCall(null, true, 0);
    }
  };

  // Khởi tạo video call khi component mount
  useEffect(() => {
    if (!roomId) {
      navigate("/");
      return;
    }

    const initVideoCall = async () => {
      if (!user?.uid) return;

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: !isAudioOnly,
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            sampleRate: 48000,
          },
        });
        // Lưu vào Ref để dùng cho cleanup sau này
        streamRef.current = stream;

        dispatch(setMainStream(stream));

        const userId = user.uid;
        const displayName = user.displayName || "Anonymous";
        const photoURL = user.photoURL || "/default-avatar.png";
        const userPayload = {
          [userId]: {
            displayName,
            photoURL,
            video: !isAudioOnly,
            audio: true,
          },
        };

        // Connect WebSocket
        await websocketService.connect();

        // Dispatch SetUser kèm RoomID để khởi tạo listener offer/answer
        dispatch(setUser(userPayload, roomId));

        // Set up WebSocket listeners for participants BEFORE joining room
        const unsubscribeUserJoined = websocketService.onUserJoined((data) => {
          if (data.userId !== userId) {
            otherUserIdRef.current = data.userId;
            otherJoinedRef.current = true;
            dispatch(
              addParticipant(
                {
                  [data.userId]: {
                    displayName: data.displayName || "Anonymous",
                    photoURL: data.photoURL || "/default-avatar.png",
                    video: !isAudioOnly,
                    audio: true,
                  },
                },
                roomId
              )
            );
          }
        });

        const unsubscribeUserLeft = websocketService.onUserLeft((data) => {
          if (data.userId !== userId) {
            dispatch(removeParticipant(data.userId));
          }
        });

        const unsubscribeRoomParticipants = websocketService.onRoomParticipants(
          (data) => {
            // Handle initial participants list
            data.participants.forEach((participant) => {
              if (participant.userId !== userId) {
                otherUserIdRef.current = participant.userId;
                otherJoinedRef.current = true;
                dispatch(
                  addParticipant(
                    {
                      [participant.userId]: {
                        displayName: participant.displayName || "Anonymous",
                        photoURL: participant.photoURL || "/default-avatar.png",
                        video: !isAudioOnly,
                        audio: true,
                      },
                    },
                    roomId
                  )
                );
              }
            });
          }
        );

        // Listen for callee decline to end call for caller
        const unsubscribeCallDeclined = websocketService.onCallDeclined(
          (data) => {
            if (data?.roomId && data.roomId !== roomId) return;
            isCallCompletedRef.current = true;
            endCall("Cuộc gọi đã bị từ chối", false, 1200);
          }
        );

        const unsubscribeCallCancelled = websocketService.onCallCancelled(
          (data) => {
            if (data?.roomId && data.roomId !== roomId) return;
            isCallCompletedRef.current = true;
            endCall("Cuộc gọi nhỡ", false, 500);
          }
        );

        const unsubscribeCallEnded = websocketService.onCallEnded((data) => {
          if (data?.roomId && data.roomId !== roomId) return;
          isCallCompletedRef.current = true;
          endCall("Cuộc gọi đã kết thúc", false, 500);
        });

        // Now join video room (profile included so peers get display info)
        websocketService.joinVideoRoom(roomId, { displayName, photoURL });

        const handleBeforeUnload = (e) => {
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((t) => t.stop());
          }
        };
        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
          window.removeEventListener("beforeunload", handleBeforeUnload);
          unsubscribeUserJoined();
          unsubscribeUserLeft();
          unsubscribeRoomParticipants();
          if (unsubscribeCallDeclined) unsubscribeCallDeclined();
          if (unsubscribeCallEnded) unsubscribeCallEnded();
          if (unsubscribeCallCancelled) unsubscribeCallCancelled();
          sendCancelIfNeeded();
          if (streamRef.current) {
            streamRef.current.getTracks().forEach((track) => track.stop());
          }
          if (!leaveCallTriggeredRef.current) {
            websocketService.leaveVideoRoom(roomId);
          }
        };
      } catch (error) {
        console.error("Error initializing video call:", error);
      }
    };

    initVideoCall();
  }, [user?.uid, roomId, dispatch, navigate]);

  return (
    <>
      <Helmet>
        <title>Group Video Chat - Connect with Friends</title>
        <meta
          name="description"
          content="Join group video chats with friends and colleagues using our modern, Snapchat-style video chat interface with real-time communication features."
        />
      </Helmet>

      <div className="min-h-screen bg-linear-to-br from-yellow-300 via-yellow-200 to-blue-200 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-0 w-96 h-96 bg-yellow-400 rounded-full filter blur-3xl"></div>
          <div className="absolute bottom-0 right-0 w-96 h-96 bg-blue-400 rounded-full filter blur-3xl"></div>
        </div>

        <div className="relative z-10 h-screen flex flex-col">
          <div className="flex-1 p-4 md:p-6 overflow-hidden">
            <VideoGrid isCameraOff={isCameraOff} />
          </div>

          {/* Control Panel */}
          <ControlPanel
            isMuted={isMuted}
            toggleMic={toggleMic}
            isCameraOff={isCameraOff}
            toggleCamera={toggleCamera}
            isSidebarOpen={isSidebarOpen}
            setIsSidebarOpen={setIsSidebarOpen}
            participantCount={Object.keys(participants).length + 1}
            onLeave={handleLeaveCall}
          />
        </div>

        {/* Participants Sidebar */}
        <ParticipantsSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          participants={Object.values(participants)}
        />

        {/* Chat Panel */}
        <ChatPanel
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          messages={messages}
        />

        <Toaster />
      </div>
    </>
  );
}
