import React, { useRef, useState } from "react";

const SnapshotVideo = ({ canvasRef }) => {
  const [recording, setRecording] = useState(false);
  const mediaRecorder = useRef(null);
  const recordedChunks = useRef([]);

  const takeSnapshot = () => {
    if (!canvasRef.current) return;
    const dataURL = canvasRef.current.toDataURL("image/png");
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "snap.png";
    link.click();
  };

  const startRecording = () => {
    if (!canvasRef.current) return;
    recordedChunks.current = [];
    try {
        const stream = canvasRef.current.captureStream(30); 
        mediaRecorder.current = new MediaRecorder(stream, { mimeType: "video/webm" });
        
        mediaRecorder.current.ondataavailable = (e) => {
          if (e.data.size > 0) recordedChunks.current.push(e.data);
        };
        
        mediaRecorder.current.onstop = () => {
          const blob = new Blob(recordedChunks.current, { type: "video/webm" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = "video.webm";
          a.click();
        };

        mediaRecorder.current.start();
        setRecording(true);
    } catch (error) {
        console.error("Error starting video recording:", error);
        alert("Could not start recording. Browser might not support MediaRecorder or captureStream.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop();
    }
    setRecording(false);
  };

  // Tailwind Class Definitions
  const baseButtonClasses = "px-4 py-2 font-semibold rounded-lg shadow-md transition duration-200 ease-in-out disabled:opacity-50";
  const snapshotButtonClasses = `${baseButtonClasses} bg-green-500 text-white hover:bg-green-600 focus:ring-green-500`;
  const startButtonClasses = `${baseButtonClasses} bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500`;
  const stopButtonClasses = `${baseButtonClasses} bg-red-600 text-white hover:bg-red-700 shadow-red-500/50 animate-pulse`; 

  return (
    <div className="mt-5 p-4 flex gap-4 items-center bg-gray-100 border border-gray-200 rounded-xl shadow-lg w-full max-w-xl">
      <button onClick={takeSnapshot} className={snapshotButtonClasses}>
        📸 Take Snapshot
      </button>

      {!recording ? (
        <button onClick={startRecording} className={startButtonClasses}>
          ▶️ Start Video
        </button>
      ) : (
        <button onClick={stopRecording} className={stopButtonClasses}>
          🔴 Stop Video (Recording...)
        </button>
      )}
    </div>
  );
};

export default SnapshotVideo;