import { useEffect } from "react";

const CameraStream = ({ videoRef }) => {
  useEffect(() => {
    if (navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ video: { width: 640, height: 480 } })
        .then((stream) => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        })
        .catch((err) => console.error("Error accessing camera: ", err));
    }

    return () => {
      const stream = videoRef.current?.srcObject;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [videoRef]);

  return (
    <video
      ref={videoRef}
      autoPlay
      playsInline
      className="hidden"
      width="640"
      height="480"
    ></video>
  );
};

export default CameraStream;
