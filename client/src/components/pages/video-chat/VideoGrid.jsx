import { motion, AnimatePresence } from "framer-motion";
import { useSelector } from "react-redux";
import VideoTile from "./VideoTile";

const VideoGrid = ({ isCameraOff }) => {
  const { currentUser, participants, mainStream } = useSelector(
    (state) => state.userState
  );

  const allParticipants = [
    ...(currentUser
      ? Object.entries(currentUser).map(([id, data]) => ({
          id,
          ...data,
          isMe: true,
          stream: mainStream,
          isCameraOff: !data.video,
          name: data.displayName || "Anonymous",
          photoURL: data.photoURL,
        }))
      : []),
    ...Object.entries(participants).map(([id, data]) => {
      if (!data.stream) console.warn(`Participant ${id} missing stream!`);

      return {
        id,
        ...data,
        isMe: false,
        stream: data.stream,
        isCameraOff: !data.video,
        name: data.displayName || "Anonymous",
        photoURL: data.photoURL,
      };
    }),
  ];

  const getGridClass = () => {
    const count = allParticipants.length;
    if (count === 1) return "grid-cols-1";
    if (count === 2) return "grid-cols-1 md:grid-cols-2";
    if (count <= 4) return "grid-cols-2";
    if (count <= 6) return "grid-cols-2 md:grid-cols-3";
    return "grid-cols-2 md:grid-cols-3 lg:grid-cols-4";
  };

  return (
    <div className={`grid ${getGridClass()} gap-3 md:gap-4 h-full w-full`}>
      <AnimatePresence>
        {allParticipants.map((participant, index) => (
          <motion.div
            key={participant.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
          >
            <VideoTile
              participant={participant}
              isMe={participant.isMe}
              isCameraOff={
                participant.isMe ? isCameraOff : participant.isCameraOff
              }
            />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default VideoGrid;
