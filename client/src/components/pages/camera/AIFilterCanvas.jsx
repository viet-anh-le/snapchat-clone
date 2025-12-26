import React, { useEffect, useRef, forwardRef } from "react";

const AIFilterCanvas = forwardRef(
  ({ videoRef, filter, stickers, brightness, contrast, blending }, ref) => {
    const stickerImages = useRef({});
    const particles = useRef([]);

    // We use a ref to store the latest props.
    // This allows the animation loop (onResults) to access the latest slider values
    // without needing to re-run the main useEffect and restart the camera.
    const propsRef = useRef({
      filter,
      stickers,
      brightness,
      contrast,
      blending,
    });

    useEffect(() => {
      propsRef.current = { filter, stickers, brightness, contrast, blending };
    }, [filter, stickers, brightness, contrast, blending]);

    // Load sticker images
    useEffect(() => {
      stickers.forEach((s) => {
        if (!stickerImages.current[s.src]) {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.src = s.src;
          stickerImages.current[s.src] = img;
        }
      });
    }, [stickers]);

    useEffect(() => {
      // Wait until video element is ready
      if (!videoRef.current || !ref.current) return;

      let camera = null;
      let faceMesh = null;

      const loadScript = (src) => {
        return new Promise((resolve, reject) => {
          if (document.querySelector(`script[src="${src}"]`)) {
            resolve();
            return;
          }
          const script = document.createElement("script");
          script.src = src;
          script.crossOrigin = "anonymous";
          script.onload = resolve;
          script.onerror = reject;
          document.body.appendChild(script);
        });
      };

      const initMediaPipe = async () => {
        try {
          // Load MediaPipe scripts dynamically to avoid build errors
          await Promise.all([
            loadScript(
              "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js"
            ),
            loadScript(
              "https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js"
            ),
          ]);

          const video = videoRef.current;
          const canvas = ref.current;
          const ctx = canvas.getContext("2d");

          canvas.width = video.videoWidth || 640;
          canvas.height = video.videoHeight || 480;

          // Init particle array (only once)
          if (particles.current.length === 0) {
            particles.current = Array.from({ length: 50 }, () => ({
              x: Math.random() * canvas.width,
              y: Math.random() * canvas.height,
              size: 3 + Math.random() * 5,
              speedY: 1 + Math.random(),
              color: `hsl(${Math.random() * 360}, 100%, 60%)`,
            }));
          }

          // Initialize FaceMesh using the global window object
          faceMesh = new window.FaceMesh({
            locateFile: (file) =>
              `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
          });

          faceMesh.setOptions({
            maxNumFaces: 2,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });

          const drawParticles = (nose) => {
            particles.current.forEach((p) => {
              p.y -= p.speedY;

              if (p.y < 0) {
                p.y = nose.y * canvas.height + 10;
                p.x = nose.x * canvas.width + (Math.random() - 0.5) * 50;
              }

              ctx.fillStyle = p.color;
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
              ctx.fill();
            });
          };

          faceMesh.onResults((results) => {
            // Destructure the LATEST values from the ref
            const { filter, stickers, brightness, contrast, blending } =
              propsRef.current;

            // --- Blending / Trail Logic ---
            if (blending < 1.0) {
              ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
            } else {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
            }

            // --- Apply Filters ---
            const baseFilter = filter === "none" ? "" : filter;
            ctx.filter =
              `${baseFilter} brightness(${brightness}%) contrast(${contrast}%)`.trim();

            // --- Draw Video ---
            ctx.globalAlpha = blending;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            ctx.globalAlpha = 1.0;
            ctx.filter = "none";

            // --- Face Mesh & Stickers ---
            if (results.multiFaceLandmarks) {
              results.multiFaceLandmarks.forEach((landmarks) => {
                const leftEyeInner = landmarks[33];
                const rightEyeInner = landmarks[263];
                const centerForehead = landmarks[10];

                const dx = (rightEyeInner.x - leftEyeInner.x) * canvas.width;
                const dy = (rightEyeInner.y - leftEyeInner.y) * canvas.height;
                const faceScale = Math.sqrt(dx * dx + dy * dy);

                stickers.forEach((st) => {
                  const img = stickerImages.current[st.src];
                  if (img && img.complete) {
                    const stickerWidth = faceScale * 1.5;
                    const stickerHeight = stickerWidth * (100 / 100);

                    const stickerX =
                      centerForehead.x * canvas.width - stickerWidth / 2;
                    const stickerY =
                      centerForehead.y * canvas.height - stickerHeight / 2;

                    ctx.drawImage(
                      img,
                      stickerX,
                      stickerY,
                      stickerWidth,
                      stickerHeight
                    );
                  }
                });

                const nose = landmarks[1];
                drawParticles(nose);
              });
            } else {
              drawParticles({ x: 0.5, y: 0.5 });
            }
          });

          // Initialize Camera using the global window object
          camera = new window.Camera(video, {
            onFrame: async () => await faceMesh.send({ image: video }),
            width: 640,
            height: 480,
          });

          camera.start();
        } catch (error) {
          console.error("Error initializing MediaPipe:", error);
        }
      };

      initMediaPipe();

      return () => {
        if (camera) camera.stop();
        if (faceMesh) faceMesh.close();
      };

      // Only restart the whole pipeline if videoRef/ref change.
      // Slider changes are handled via propsRef inside the loop.
    }, [videoRef, ref]);

    return (
      <div className="flex justify-center w-full mt-4 mb-4 grow">
        <canvas
          ref={ref}
          className="rounded-xl shadow-2xl border-4 border-indigo-300 bg-gray-900 object-contain w-full max-w-xl h-auto"
        />
      </div>
    );
  }
);

export default AIFilterCanvas;
