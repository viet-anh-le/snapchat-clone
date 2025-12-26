import React, { useRef, useState } from "react";
import CameraStream from "../components/pages/camera/CameraStream";
import AIFilterCanvas from "../components/pages/camera/AIFilterCanvas";
import FilterSelector from "../components/pages/camera/FilterSelector";
import StickerSelector from "../components/pages/camera/StickerSelector";
import SnapshotVideo from "../components/pages/camera/SnapshotVideo";
import AdjustmentControls from "../components/pages/camera/AdjustmentControl";

const Home = () => {
  const videoRef = useRef(null);
  const canvasRef = useRef(null); 
  const [filter, setFilter] = useState("none");
  const [stickers, setStickers] = useState([]);
  
  // New State variables
  const [brightness, setBrightness] = useState(100); // 100% is neutral
  const [contrast, setContrast] = useState(100);   // 100% is neutral
  const [blending, setBlending] = useState(1.0);    // 1.0 (100%) is no trail / full opacity

  return (
    <div className="flex flex-col p-5 items-center bg-gray-50 min-h-screen">

      {/* Hidden camera stream */}
      <CameraStream videoRef={videoRef} />

      {/* Main Content Area: Canvas and Controls */}
      <div className="flex flex-col lg:flex-row gap-8 w-full max-w-6xl">

        {/* 1. Canvas and Snapshot Controls */}
        <div className="flex-grow flex flex-col items-center">
          <AIFilterCanvas
            videoRef={videoRef}
            filter={filter}
            stickers={stickers}
            // Pass the new adjustment state down to the canvas
            brightness={brightness}
            contrast={contrast}
            blending={blending}
            ref={canvasRef} 
          />
          <SnapshotVideo canvasRef={canvasRef} />
        </div>

        {/* 2. Side Panel/Control Selectors */}
        <div className="flex flex-col gap-6 w-full lg:w-80">
          <FilterSelector setFilter={setFilter} currentFilter={filter} />
          
          <AdjustmentControls
            brightness={brightness}
            setBrightness={setBrightness}
            contrast={contrast}
            setContrast={setContrast}
            blending={blending}
            setBlending={setBlending}
          />
          
          <StickerSelector setStickers={setStickers} />
        </div>
      </div>
    </div>
  );
};

export default Home;


