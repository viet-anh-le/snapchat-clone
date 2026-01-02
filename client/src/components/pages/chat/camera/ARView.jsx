import {
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import Webcam from "react-webcam";
import { FaceMesh } from "@mediapipe/face_mesh";
import { drawSceneHelper } from "../../../../../helpers/drawScene";

const ARView = forwardRef(({ isFrontCamera, zoom, filter, isActive }, ref) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const latestLandmarksRef = useRef(null);
  const faceMeshRef = useRef(null);
  const isProcessingRef = useRef(false);

  const videoConstraints = {
    width: 720,
    height: 1280,
    facingMode: isFrontCamera ? "user" : "environment",
    frameRate: { ideal: 30, max: 60 },
  };

  useEffect(() => {
    const faceMesh = new FaceMesh({
      locateFile: (file) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.5,
    });

    faceMesh.onResults((results) => {
      isProcessingRef.current = false;

      if (results.multiFaceLandmarks?.length > 0) {
        latestLandmarksRef.current = results.multiFaceLandmarks[0];
      } else {
        latestLandmarksRef.current = null;
      }
    });

    faceMeshRef.current = faceMesh;

    return () => {
      faceMesh.close();
      faceMeshRef.current = null;
    };
  }, []);

  const drawScene = useCallback(async () => {
    if (!isActive) return;

    const video = webcamRef.current?.video;
    const canvas = canvasRef.current;

    drawSceneHelper(filter, canvas, video, latestLandmarksRef);

    if (
      video &&
      video.readyState === 4 &&
      faceMeshRef.current &&
      !isProcessingRef.current
    ) {
      isProcessingRef.current = true;
      try {
        await faceMeshRef.current.send({ image: video });
      } catch (error) {
        console.error("Mediapipe send error:", error);
        isProcessingRef.current = false;
      }
    }
    requestAnimationFrame(drawScene);
  }, [filter, isActive]);

  useEffect(() => {
    let animationId;
    if (isActive) {
      animationId = requestAnimationFrame(drawScene);
    }
    return () => cancelAnimationFrame(animationId);
  }, [isActive, drawScene]);

  useImperativeHandle(ref, () => ({
    capture: () => {
      if (canvasRef.current) {
        return canvasRef.current.toDataURL("image/png");
      }
      return null;
    },
  }));

  if (!isActive) return null;

  return (
    <div className="absolute inset-0 w-full h-full bg-black rounded-[20px] overflow-hidden">
      <Webcam
        ref={webcamRef}
        audio={false}
        width={720}
        height={1280}
        screenshotFormat="image/jpeg"
        videoConstraints={videoConstraints}
        style={{ position: "absolute", opacity: 0, zIndex: -1 }}
        onUserMedia={() => console.log("Webcam onUserMedia fired!")}
        onUserMediaError={(err) => console.error("Webcam Error:", err)}
      />
      <canvas
        ref={canvasRef}
        width={720}
        height={1280}
        className="w-full h-full object-cover"
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: "center center",
          transition: "transform 0.1s linear",
        }}
      />
    </div>
  );
});

export default ARView;
