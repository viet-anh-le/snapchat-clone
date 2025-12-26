import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./constants";
import { getCropDimensions } from "./getCropDimensions";
import { getCanvasCoords } from "./getCanvasCoords";
import { applyDistortion } from "./applyDistortion";
import { getFaceGeometry } from "./getFaceGeometry";

export const drawSceneHelper = (filter, canvas, video, latestLandmarksRef) => {
  if (canvas && video && video.readyState === 4) {
    const ctx = canvas.getContext("2d");
    const { videoWidth, videoHeight } = video;
    const cropData = getCropDimensions(videoWidth, videoHeight);
    const { renderW, renderH, offsetX, offsetY } = cropData;

    // A. DRAW BASE VIDEO
    ctx.save();
    ctx.translate(CANVAS_WIDTH, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(
      video,
      offsetX,
      offsetY,
      renderW,
      renderH,
      0,
      0,
      CANVAS_WIDTH,
      CANVAS_HEIGHT
    );
    ctx.restore();

    if (latestLandmarksRef.current) {
      const landmarks = latestLandmarksRef.current;
      const getCoords = (lm) => getCanvasCoords(lm, videoWidth, videoHeight);
      const geo = getFaceGeometry(landmarks, getCoords);

      // B. APPLY DISTORTIONS (Funny Filters)

      // --- FILTER: BIG MOUTH ---
      if (filter === "big_mouth" || filter === "wacky") {
        // Landmark 13 is upper lip, 14 is lower. 13 is good center.
        applyDistortion(ctx, video, 13, 2.5, 0.45, landmarks, cropData);
      }

      // --- FILTER: BUG EYES ---
      if (filter === "bug_eyes" || filter === "wacky") {
        // Left Eye (33), Right Eye (263)
        applyDistortion(ctx, video, 33, 1.8, 0.25, landmarks, cropData);
        applyDistortion(ctx, video, 263, 1.8, 0.25, landmarks, cropData);
      }

      // --- FILTER: SCHNOZ ---
      if (filter === "schnoz") {
        // Nose tip (1)
        applyDistortion(ctx, video, 1, 2.5, 0.35, landmarks, cropData);
      }

      // C. APPLY AR OVERLAYS

      // --- FILTER: KITTY ---
      if (filter === "kitty") {
        ctx.save();
        ctx.translate(geo.cx, geo.cy);
        ctx.rotate(geo.angle);

        // Ears
        ctx.fillStyle = "rgba(255, 180, 200, 0.9)";
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 4;

        ctx.beginPath();
        ctx.moveTo(-geo.width * 0.7, -geo.width);
        ctx.quadraticCurveTo(
          -geo.width * 0.9,
          -geo.width * 1.8,
          -geo.width * 0.2,
          -geo.width * 1.2
        );
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(geo.width * 0.7, -geo.width);
        ctx.quadraticCurveTo(
          geo.width * 0.9,
          -geo.width * 1.8,
          geo.width * 0.2,
          -geo.width * 1.2
        );
        ctx.fill();
        ctx.stroke();

        // Whiskers
        ctx.strokeStyle = "rgba(255, 255, 255, 0.6)";
        ctx.lineWidth = 2;
        [-1, 1].forEach((side) => {
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(side * 30, 40);
            ctx.lineTo(side * (100 + i * 10), 30 + i * 15);
            ctx.stroke();
          }
        });
        ctx.restore();

        // Nose
        const nose = getCoords(landmarks[1]);
        ctx.fillStyle = "pink";
        ctx.beginPath();
        ctx.arc(nose.x, nose.y, geo.width * 0.15, 0, Math.PI * 2);
        ctx.fill();
      }

      // --- FILTER: BOSS ---
      if (filter === "boss") {
        ctx.save();
        ctx.translate(geo.cx, geo.cy);
        ctx.rotate(geo.angle);
        const gWidth = geo.width * 2.2;
        const gHeight = geo.width * 0.5;
        ctx.fillStyle = "#111";
        ctx.fillRect(-gWidth / 2, -gHeight / 2, gWidth / 2.2, gHeight);
        ctx.fillRect(
          gWidth / 2 - gWidth / 2.2,
          -gHeight / 2,
          gWidth / 2.2,
          gHeight
        );
        ctx.fillRect(-gWidth / 10, -gHeight / 2, gWidth / 5, gHeight / 5);
        ctx.fillStyle = "rgba(255,255,255,0.3)";
        ctx.fillRect(-gWidth / 2.5, -gHeight / 2.5, gWidth / 10, gHeight / 10);
        ctx.fillRect(gWidth / 3.5, -gHeight / 2.5, gWidth / 10, gHeight / 10);
        ctx.restore();
      }

      // --- FILTER: ALIEN ---
      if (filter === "alien") {
        // Draw Giant Eyes
        const leftEye = getCoords(landmarks[159]);
        const rightEye = getCoords(landmarks[386]);
        ctx.fillStyle = "black";
        [leftEye, rightEye].forEach((eye) => {
          ctx.save();
          ctx.translate(eye.x, eye.y);
          ctx.rotate(geo.angle + (eye === leftEye ? -0.2 : 0.2));
          ctx.beginPath();
          ctx.ellipse(
            0,
            0,
            geo.width * 0.25,
            geo.width * 0.35,
            0,
            0,
            2 * Math.PI
          );
          ctx.fill();
          ctx.fillStyle = "white";
          ctx.beginPath();
          ctx.ellipse(
            geo.width * 0.05,
            -geo.width * 0.1,
            geo.width * 0.05,
            geo.width * 0.08,
            0,
            0,
            2 * Math.PI
          );
          ctx.fill();
          ctx.fillStyle = "black";
          ctx.restore();
        });
      }

      // --- FILTER: CYBER ---
      if (filter === "cyber") {
        ctx.strokeStyle = "#00ffcc";
        ctx.lineWidth = 2;
        ctx.shadowBlur = 10;
        ctx.shadowColor = "#00ffcc";
        const top = getCoords(landmarks[10]);
        const bottom = getCoords(landmarks[152]);
        const left = getCoords(landmarks[234]);
        const right = getCoords(landmarks[454]);
        const margin = 40;
        ctx.beginPath();
        ctx.moveTo(left.x - margin, top.y);
        ctx.lineTo(left.x - margin, top.y - margin);
        ctx.lineTo(left.x, top.y - margin);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(right.x + margin, bottom.y);
        ctx.lineTo(right.x + margin, bottom.y + margin);
        ctx.lineTo(right.x, bottom.y + margin);
        ctx.stroke();
        const yScan = (Date.now() / 5) % CANVAS_HEIGHT;
        ctx.fillStyle = "rgba(0, 255, 204, 0.1)";
        ctx.fillRect(0, yScan, CANVAS_WIDTH, 10);
        ctx.shadowBlur = 0;
      }
    }

    // D. GLOBAL COLOR TINT
    if (filter === "alien") {
      ctx.fillStyle = "rgba(0, 255, 50, 0.15)";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    }
  }
};
