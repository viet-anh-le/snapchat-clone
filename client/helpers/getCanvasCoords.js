import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./constants";
import { getCropDimensions } from "./getCropDimensions";
/* --- 2. COORDINATE MAPPER --- */
export const getCanvasCoords = (landmark, videoWidth, videoHeight) => {
  if (!videoWidth || !videoHeight) return { x: 0, y: 0 };
  const { renderW, renderH, offsetX, offsetY } = getCropDimensions(
    videoWidth,
    videoHeight
  );

  // MediaPipe uses 0-1, we need to map to the video source pixels first
  const sourceX = (1 - landmark.x) * videoWidth;
  const sourceY = landmark.y * videoHeight;

  // Then map those source pixels to the cropped canvas
  const x = ((sourceX - offsetX) / renderW) * CANVAS_WIDTH;
  const y = ((sourceY - offsetY) / renderH) * CANVAS_HEIGHT;
  return { x, y };
};
