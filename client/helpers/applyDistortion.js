import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";
/* --- 4. DISTORTION ENGINE (The Magnifying Glass) --- */
export const applyDistortion = (
  ctx,
  video,
  landmarkIndex,
  scaleFactor,
  radiusMultiplier,
  landmarks,
  cropData
) => {
  const { videoWidth, videoHeight } = video;
  const lm = landmarks[landmarkIndex]; // The center point (e.g., nose tip)
  const { renderW, renderH, offsetX, offsetY } = cropData;

  // 1. Calculate Source Coordinates (Video)
  const srcX = (1 - lm.x) * videoWidth;
  const srcY = lm.y * videoHeight;

  // 2. Calculate Radius (Dynamic based on face size)
  // We use distance between eyes to determine how big the head is
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const faceWidthSrc = Math.hypot(
    (1 - rightEye.x) * videoWidth - (1 - leftEye.x) * videoWidth,
    rightEye.y * videoHeight - leftEye.y * videoHeight
  );
  const radius = faceWidthSrc * radiusMultiplier;

  // 3. Calculate Destination Coordinates (Canvas)
  const destX = ((srcX - offsetX) / renderW) * CANVAS_WIDTH;
  const destY = ((srcY - offsetY) / renderH) * CANVAS_HEIGHT;
  const destRadius = (radius / renderW) * CANVAS_WIDTH;

  // 4. Draw the Magnified Circle
  ctx.save();
  ctx.beginPath();
  ctx.arc(destX, destY, destRadius * scaleFactor, 0, Math.PI * 2); // Clip to circle
  ctx.clip();

  // Smooth edges of distortion
  ctx.shadowBlur = 20;
  ctx.shadowColor = "black";

  // Draw video magnified
  // We draw from the source (srcX - radius) to destination (destX - scaledRadius)
  ctx.translate(CANVAS_WIDTH, 0); // Handle mirroring
  ctx.scale(-1, 1);

  // Because we flipped context, we need to flip X coordinate math
  // It's easier to just re-calculate the drawImage call for the "Mirrored" context state

  // Let's rely on the coordinate mapping logic but keep it simple:
  // We want to grab [srcX-r, srcY-r, 2r, 2r] from video
  // And draw it at [destX-sr, destY-sr, 2sr, 2sr] on canvas

  // Un-mirror the destX for the drawing Context which is already flipped?
  // Actually, let's just use the non-flipped coordinates and draw normally,
  // but we need to remember the video source is NOT mirrored, but the canvas IS.

  // Easier approach: Just use standard drawImage logic but modify the source/dest rects
  // Since the outer context is NOT mirrored in this function (we restored it),
  // but the getCanvasCoords handles the flip.

  // Re-Flip for drawing:
  ctx.translate(CANVAS_WIDTH, 0);
  ctx.scale(-1, 1); // Back to normal

  // Wait, the easiest way to distort in a "mirrored" view is to act like we are drawing on the raw image
  // then the user sees the result.

  // Let's reset transform to Identity to draw specifically at the calculated pixels
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  ctx.drawImage(
    video,
    srcX - radius,
    srcY - radius,
    radius * 2,
    radius * 2, // Source Capture
    destX - destRadius * scaleFactor,
    destY - destRadius * scaleFactor,
    destRadius * 2 * scaleFactor,
    destRadius * 2 * scaleFactor // Dest Draw
  );

  ctx.restore();

  // Optional: Draw a border to hide the hard edge
  // ctx.beginPath();
  // ctx.arc(destX, destY, destRadius * scaleFactor, 0, Math.PI * 2);
  // ctx.strokeStyle = 'rgba(0,0,0,0.1)';
  // ctx.stroke();
};
