import React, { useEffect, useState } from "react";
import { X, Clock } from "lucide-react";

const SnapViewer = ({ imageSrc, onClose }) => {
  const [timeLeft, setTimeLeft] = useState(10);
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-1000 bg-black flex items-center justify-center animate-in fade-in duration-300">
      <div className="absolute top-0 left-0 h-1 bg-gray-800 w-full">
        <div
          className="h-full bg-white transition-all duration-1000 ease-linear"
          style={{ width: `${(timeLeft / 10) * 100}%` }}
        />
      </div>

      <div className="relative w-full h-full max-w-lg mx-auto flex flex-col justify-center">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-50 p-2 bg-black/50 rounded-full text-white hover:bg-white/20 transition-colors"
        >
          <X size={32} />
        </button>

        <img
          src={imageSrc}
          alt="Snap"
          className="w-full h-auto max-h-screen object-contain"
          onClick={(e) => e.stopPropagation()}
        />

        <div className="absolute bottom-10 w-full text-center text-white/50 text-sm">
          Tap X or wait {timeLeft}s to close
        </div>
      </div>
    </div>
  );
};

export default SnapViewer;
