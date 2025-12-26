export const getFaceGeometry = (landmarks, getCoords) => {
  const leftEye = getCoords(landmarks[33]);
  const rightEye = getCoords(landmarks[263]);
  const width = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
  const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
  const cx = (leftEye.x + rightEye.x) / 2;
  const cy = (leftEye.y + rightEye.y) / 2;
  return { angle, width, cx, cy };
};
