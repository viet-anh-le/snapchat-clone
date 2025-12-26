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

const ARView = forwardRef(({ isFrontCamera, zoom, filter, isActive }, ref) => {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const latestLandmarksRef = useRef(null);

  const videoConstraints = {
    width: 720,
    height: 1280,
    facingMode: isFrontCamera ? "user" : "environment",
  };

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    const video = webcamRef.current?.video;

    if (canvas && video && video.readyState === 4) {
      const ctx = canvas.getContext("2d");
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;

      ctx.clearRect(0, 0, canvasWidth, canvasHeight);

      const videoAspect = videoWidth / videoHeight;
      const canvasAspect = canvasWidth / canvasHeight;

      let drawWidth, drawHeight, drawX, drawY;

      if (videoAspect > canvasAspect) {
        drawHeight = canvasHeight;
        drawWidth = drawHeight * videoAspect;
        drawX = (canvasWidth - drawWidth) / 2;
        drawY = 0;
      } else {
        drawWidth = canvasWidth;
        drawHeight = drawWidth / videoAspect;
        drawX = 0;
        drawY = (canvasHeight - drawHeight) / 2;
      }

      ctx.save();
      if (isFrontCamera) {
        ctx.scale(-1, 1);
        ctx.drawImage(video, -drawX - drawWidth, drawY, drawWidth, drawHeight);
      } else {
        ctx.drawImage(video, drawX, drawY, drawWidth, drawHeight);
      }
      ctx.restore();

      if (latestLandmarksRef.current) {
        const landmarks = latestLandmarksRef.current;
        const scaleX = drawWidth / videoWidth;
        const scaleY = drawHeight / videoHeight;
        const offsetX = drawX;
        const offsetY = drawY;

        drawFilter(
          ctx,
          landmarks,
          filter,
          canvasWidth,
          canvasHeight,
          isFrontCamera,
          {
            scaleX,
            scaleY,
            offsetX,
            offsetY,
            videoWidth,
            videoHeight,
          }
        );
      }
    }

    if (isActive) requestAnimationFrame(drawScene);
  }, [filter, isFrontCamera, isActive]);

  const drawFilter = (
    ctx,
    landmarks,
    type,
    width,
    height,
    isFront,
    transform = null
  ) => {
    if (type === "none") return;

    const getX = (val) => {
      if (transform) {
        const videoX = val * transform.videoWidth;
        const canvasX = videoX * transform.scaleX + transform.offsetX;
        return isFront ? width - canvasX : canvasX;
      }
      return isFront ? (1 - val) * width : val * width;
    };

    const getY = (val) => {
      if (transform) {
        const videoY = val * transform.videoHeight;
        return videoY * transform.scaleY + transform.offsetY;
      }
      return val * height;
    };

    if (type === "mesh") {
      ctx.fillStyle = "#00FF00";
      landmarks.forEach((pt) => ctx.fillRect(getX(pt.x), getY(pt.y), 2, 2));
    } else if (type === "clown") {
      const nose = landmarks[1];
      let noseRadius = 10;

      if (landmarks.length > 33 && landmarks.length > 263) {
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        const eyeDistance = Math.sqrt(
          Math.pow(getX(rightEye.x) - getX(leftEye.x), 2) +
            Math.pow(getY(rightEye.y) - getY(leftEye.y), 2)
        );

        noseRadius = eyeDistance * 0.2;
      }

      ctx.beginPath();
      ctx.arc(getX(nose.x), getY(nose.y), noseRadius, 0, 2 * Math.PI);

      const gradient = ctx.createRadialGradient(
        getX(nose.x) - noseRadius / 3,
        getY(nose.y) - noseRadius / 3,
        noseRadius / 5,
        getX(nose.x),
        getY(nose.y),
        noseRadius
      );
      gradient.addColorStop(0, "#ffcccc");
      gradient.addColorStop(1, "red");

      ctx.fillStyle = gradient;
      ctx.fill();
    }
  };

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
