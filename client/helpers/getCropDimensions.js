import { CANVAS_WIDTH, CANVAS_HEIGHT } from "./constants";

export const getCropDimensions = (videoWidth, videoHeight) => {
  const videoAspect = videoWidth / videoHeight;
  const canvasAspect = CANVAS_WIDTH / CANVAS_HEIGHT;
  let renderW, renderH, offsetX, offsetY;

  if (videoAspect > canvasAspect) {
    renderH = videoHeight;
    renderW = videoHeight * canvasAspect;
    offsetX = (videoWidth - renderW) / 2;
    offsetY = 0;
  } else {
    renderW = videoWidth;
    renderH = videoWidth / canvasAspect;
    offsetX = 0;
    offsetY = (videoHeight - renderH) / 2;
  }
  return { renderW, renderH, offsetX, offsetY };
};
