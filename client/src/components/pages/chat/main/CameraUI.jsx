import { useState, useRef } from "react";
import { useAuth } from "../../../../context/AuthContext";
import { CloseOutlined, SendOutlined } from "@ant-design/icons";
import {
  X,
  Zap,
  Cat,
  Glasses,
  Ghost,
  Smile,
  Megaphone,
  Eye,
  User,
  RefreshCw,
} from "lucide-react";

import ARView from "../camera/ARView";
import SendModal from "../camera/SendModal";

const FILTERS = [
  { id: "none", name: "Normal", icon: <X size={20} />, color: "bg-gray-600" },
  {
    id: "big_mouth",
    name: "Yapper",
    icon: <Megaphone size={20} />,
    color: "bg-orange-500",
  },
  {
    id: "bug_eyes",
    name: "Buggin",
    icon: <Eye size={20} />,
    color: "bg-purple-500",
  },
  {
    id: "schnoz",
    name: "Schnoz",
    icon: <User size={20} />,
    color: "bg-yellow-600",
  },
  {
    id: "wacky",
    name: "Wacky",
    icon: <Smile size={20} />,
    color: "bg-blue-500",
  },
  { id: "kitty", name: "Kitty", icon: <Cat size={20} />, color: "bg-pink-500" },
  {
    id: "boss",
    name: "Boss",
    icon: <Glasses size={20} />,
    color: "bg-yellow-500",
  },
  {
    id: "alien",
    name: "Alien",
    icon: <Ghost size={20} />,
    color: "bg-green-500",
  },
  { id: "cyber", name: "Cyber", icon: <Zap size={20} />, color: "bg-cyan-500" },
];

const CameraUI = () => {
  const { user } = useAuth();
  const arViewRef = useRef();

  const [isCameraActive, setIsCameraActive] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isFrontCamera, setIsFrontCamera] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [filter, setFilter] = useState("none");
  const [showSendModal, setShowSendModal] = useState(false);

  const handleCapture = () => {
    if (arViewRef.current) {
      const image = arViewRef.current.capture();
      setCapturedImage(image);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
  };

  const handleSentSuccess = () => {
    setCapturedImage(null);
    setShowSendModal(false);
    setIsCameraActive(false);
  };

  return (
    <div className="h-screen flex items-center justify-center relative w-full">
      <div className="blur-container relative overflow-hidden flex flex-col">
        {!isCameraActive && (
          <div className="w-full h-full flex flex-col items-center justify-center animate-fadeIn">
            <div
              className="flex flex-col items-center justify-center gap-6 cursor-pointer hover:scale-105 transition-transform"
              onClick={() => setIsCameraActive(true)}
            >
              <div className="w-32 h-32 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm border border-white/10 shadow-lg">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-16 h-16 text-white"
                >
                  <path d="M12 9a3.75 3.75 0 100 7.5A3.75 3.75 0 0012 9z" />
                  <path
                    fillRule="evenodd"
                    d="M9.344 3.071a49.52 49.52 0 015.312 0c.967.052 1.83.585 2.332 1.39l.821 1.317c.24.383.645.643 1.11.71.386.054.77.113 1.152.177 1.432.239 2.429 1.493 2.429 2.909V18a3 3 0 01-3 3h-15a3 3 0 01-3-3V9.574c0-1.416.997-2.67 2.429-2.909.382-.064.766-.123 1.151-.178a1.56 1.56 0 001.11-.71l.822-1.315a2.942 2.942 0 012.332-1.39zM6.75 12.75a5.25 5.25 0 1110.5 0 5.25 5.25 0 01-10.5 0zm12-1.5a.75.75 0 100-1.5.75.75 0 000 1.5z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <p className="text-center font-semibold text-white text-lg max-w-[200px] leading-snug drop-shadow-md select-none">
                Click the Camera to send Snaps
              </p>
            </div>
          </div>
        )}

        {isCameraActive && (
          <div className="w-full h-full relative">
            <div className="absolute inset-0 w-full h-full bg-black rounded-[20px] overflow-hidden">
              {!capturedImage ? (
                <ARView
                  ref={arViewRef}
                  isActive={isCameraActive}
                  isFrontCamera={isFrontCamera}
                  zoom={zoom}
                  filter={filter}
                />
              ) : (
                <img
                  src={capturedImage}
                  className="w-full h-full object-cover"
                  alt="snap"
                />
              )}

              <div className="absolute bottom-0 w-full p-6 flex flex-col items-center z-20 bg-linear-to-t from-black/60 to-transparent">
                {!capturedImage ? (
                  <>
                    <div className="flex gap-4 mb-4 overflow-x-auto w-full justify-start px-4 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                      {FILTERS.map((f) => (
                        <button
                          key={f.id}
                          onClick={() => setFilter(f.id)}
                          className={`flex flex-col items-center ${
                            filter === f.id ? "-translate-y-2" : "opacity-60"
                          }`}
                        >
                          <div
                            className={`w-12 h-12 rounded-full flex items-center justify-center border-2 backdrop-blur-md ${
                              filter === f.id
                                ? "border-yellow-400 text-yellow-400"
                                : "border-white/30 text-white"
                            }`}
                          >
                            {f.icon}
                          </div>
                          <span className="text-[10px] text-white font-bold">
                            {f.name}
                          </span>
                        </button>
                      ))}
                    </div>

                    <input
                      type="range"
                      min="1"
                      max="3"
                      step="0.1"
                      value={zoom}
                      onChange={(e) => setZoom(parseFloat(e.target.value))}
                      className="w-1/2 h-1 bg-white/30 rounded-lg mb-4 accent-yellow-400"
                    />

                    <div className="flex items-center gap-8">
                      <div className="w-10 h-10" />
                      <button
                        onClick={handleCapture}
                        className="w-20 h-20 rounded-full border-[6px] border-white hover:bg-white/20 active:scale-95 transition-all"
                      />
                      <button
                        onClick={() => setIsFrontCamera(!isFrontCamera)}
                        className="w-10 h-10 rounded-full bg-gray-800/50 flex items-center justify-center border border-white/30"
                      >
                        <RefreshCw className="text-white" />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex gap-4 pb-8">
                    <button
                      onClick={handleRetake}
                      className="px-6 py-3 bg-white/20 backdrop-blur-md rounded-full text-white font-bold border border-white/30"
                    >
                      Retake
                    </button>
                    <button
                      onClick={() => setShowSendModal(true)}
                      className="px-6 py-3 bg-yellow-400 rounded-full text-black font-bold shadow-lg flex items-center gap-2"
                    >
                      Send To <SendOutlined />
                    </button>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setIsCameraActive(false);
                setCapturedImage(null);
              }}
              className="absolute top-4 right-4 w-8 h-8 text-white p-2 bg-black/20 rounded-full backdrop-blur-md z-50"
            >
              <CloseOutlined />
            </button>

            <SendModal
              isOpen={showSendModal}
              onClose={() => setShowSendModal(false)}
              capturedImage={capturedImage}
              user={user}
              onSuccess={handleSentSuccess}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraUI;
