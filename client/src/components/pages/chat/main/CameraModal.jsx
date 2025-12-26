import { useRef, useEffect, useState } from "react";
import { X, RefreshCw, Send } from "lucide-react";

const FILTERS = [
  { name: "Normal", value: "none", class: "" },
  { name: "B&W", value: "grayscale(100%)", class: "grayscale" },
  { name: "Sepia", value: "sepia(100%)", class: "sepia" },
  {
    name: "Warm",
    value: "saturate(150%) sepia(20%)",
    class: "sepia-[.2] saturate-150",
  },
  {
    name: "Cool",
    value: "hue-rotate(180deg) opacity(0.8)",
    class: "hue-rotate-180 opacity-80",
  },
  {
    name: "Vintage",
    value: "contrast(120%) sepia(40%)",
    class: "contrast-125 sepia-[.4]",
  },
];

const CameraModal = ({ isOpen, onClose, onSendImage }) => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState(FILTERS[0]);
  const [isFrontCamera, setIsFrontCamera] = useState(true);

  useEffect(() => {
    let currentStream = null;

    const startCamera = async () => {
      if (isOpen && !capturedImage) {
        try {
          const constraints = {
            video: {
              facingMode: isFrontCamera ? "user" : "environment",
              width: { ideal: 720 },
              height: { ideal: 1280 },
            },
            audio: false,
          };
          currentStream = await navigator.mediaDevices.getUserMedia(
            constraints
          );
          setStream(currentStream);
          if (videoRef.current) {
            videoRef.current.srcObject = currentStream;
          }
        } catch (err) {
          console.error("Lỗi mở camera:", err);
        }
      }
    };

    startCamera();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isOpen, capturedImage, isFrontCamera]);

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      if (context.filter !== undefined) {
        context.filter = selectedFilter.value;
      }

      if (isFrontCamera) {
        context.translate(canvas.width, 0);
        context.scale(-1, 1);
      }

      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageUrl = canvas.toDataURL("image/png");
      setCapturedImage(imageUrl);

      if (stream) stream.getTracks().forEach((t) => t.stop());
    }
  };

  const handleSend = () => {
    if (capturedImage) {
      onSendImage(capturedImage);
      handleClose();
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleClose = () => {
    setCapturedImage(null);
    if (stream) stream.getTracks().forEach((t) => t.stop());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full h-full md:w-[440px] md:h-[90%] md:rounded-[3rem] bg-black border-4 border-gray-800 shadow-2xl overflow-hidden flex flex-col">
        <div className="absolute top-6 left-0 right-0 z-20 flex justify-between px-6">
          <button
            onClick={handleClose}
            className="p-2 bg-black/40 rounded-full text-white backdrop-blur-sm hover:bg-white/20"
          >
            <X size={24} />
          </button>
          {!capturedImage && (
            <button
              onClick={() => setIsFrontCamera(!isFrontCamera)}
              className="p-2 bg-black/40 rounded-full text-white backdrop-blur-sm hover:bg-white/20"
            >
              <RefreshCw size={24} />
            </button>
          )}
        </div>

        <div className="relative flex-1 bg-gray-900 overflow-hidden">
          {capturedImage ? (
            <img
              src={capturedImage}
              alt="Preview"
              className="w-full h-full object-cover"
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ filter: selectedFilter.value }} // Filter CSS cho preview mượt
              className={`w-full h-full object-cover transform ${
                isFrontCamera ? "scale-x-[-1]" : ""
              }`}
            />
          )}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="bg-black/90 backdrop-blur-lg pb-8 pt-4 px-4">
          {!capturedImage && (
            <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x">
              {FILTERS.map((f) => (
                <button
                  key={f.name}
                  onClick={() => setSelectedFilter(f)}
                  className={`flex flex-col items-center gap-1 min-w-[60px] snap-center transition-all ${
                    selectedFilter.name === f.name
                      ? "text-yellow-400 scale-110"
                      : "text-gray-400"
                  }`}
                >
                  <div
                    className={`w-12 h-12 rounded-full border-2 overflow-hidden ${
                      selectedFilter.name === f.name
                        ? "border-yellow-400"
                        : "border-transparent"
                    }`}
                    style={{
                      filter: f.value,
                      background:
                        "linear-gradient(45deg, #ff9a9e 0%, #fad0c4 99%, #fad0c4 100%)",
                    }}
                  ></div>
                  <span className="text-xs font-medium">{f.name}</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center justify-center gap-8 mt-2">
            {capturedImage ? (
              <>
                <button
                  onClick={handleRetake}
                  className="w-16 h-16 rounded-full bg-gray-800 text-white flex items-center justify-center hover:bg-gray-700 transition-colors"
                >
                  <RefreshCw size={28} />
                </button>
                <button
                  onClick={handleSend}
                  className="w-20 h-20 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/50 hover:scale-105 transition-transform"
                >
                  <Send size={32} className="ml-1" />
                </button>
              </>
            ) : (
              <button
                onClick={takePhoto}
                className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center hover:scale-105 active:scale-95 transition-all group"
              >
                <div className="w-16 h-16 bg-white rounded-full group-hover:bg-yellow-400 transition-colors" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CameraModal;
