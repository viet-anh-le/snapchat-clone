import {
  useRef,
  useEffect,
  useCallback,
  useImperativeHandle,
  forwardRef,
} from "react";
import Webcam from "react-webcam";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import { drawSceneHelper } from "../../../../../helpers/drawScene";

const ARView = forwardRef(({ isFrontCamera, zoom, filter, isActive }, ref) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const latestLandmarksRef = useRef(null);

  const videoConstraints = {
    width: 720,
    height: 1280,
    facingMode: isFrontCamera ? "user" : "environment",
  };

  /* --- 5. RENDER LOOP --- */
  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    const video = webcamRef.current?.video;
    drawSceneHelper(filter, canvas, video, latestLandmarksRef);
    if (isActive) {
      requestAnimationFrame(drawScene);
    }
  }, [filter, isActive]);

  useEffect(() => {
    if (!isActive) return;

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
      if (results.multiFaceLandmarks?.length > 0) {
        latestLandmarksRef.current = results.multiFaceLandmarks[0];
      } else {
        latestLandmarksRef.current = null;
      }
    });

    let camera;
    let setupTimeout;

    if (webcamRef.current && webcamRef.current.video) {
      const setupCamera = () => {
        const video = webcamRef.current?.video;
        if (!video || video.readyState < 2) {
          setupTimeout = setTimeout(setupCamera, 100);
          return;
        }

        const videoWidth = video.videoWidth || 720;
        const videoHeight = video.videoHeight || 1280;

        camera = new Camera(webcamRef.current.video, {
          onFrame: async () => {
            if (webcamRef.current?.video) {
              await faceMesh.send({ image: webcamRef.current.video });
            }
          },
          width: videoWidth,
          height: videoHeight,
        });
        camera.start();
        requestAnimationFrame(drawScene);
      };

      setupCamera();
    }

    return () => {
      if (setupTimeout) clearTimeout(setupTimeout);
      if (camera) camera.stop();
      faceMesh.close();
    };
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
        videoConstraints={videoConstraints}
        className="hidden"
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
