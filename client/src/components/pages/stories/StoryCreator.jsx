import React, { useRef, useEffect, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { FaceMesh } from "@mediapipe/face_mesh";
import { Camera } from "@mediapipe/camera_utils";
import {
  X, Zap, Camera as CameraIcon, Cat, Glasses, Ghost, Smile,
  Loader2, Megaphone, Eye, User, Globe, Users, Lock,
  Send, Trash2, Download, Search, Check, ChevronLeft
} from "lucide-react";
import { v4 as uuidv4 } from "uuid";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp, doc, getDoc } from "firebase/firestore"; // Thêm doc, getDoc
import { db, storage } from "../../../lib/firebase";

/* --- CONSTANTS --- */
const VIDEO_CONSTRAINTS = {
  width: { ideal: 1280 },
  height: { ideal: 720 },
  facingMode: "user",
};

const CANVAS_WIDTH = 720;
const CANVAS_HEIGHT = 1280;

const PRIVACY_OPTIONS = [
  { id: "public", label: "Public", icon: <Globe size={16} />, desc: "Everyone can see" },
  { id: "friends", label: "Friends", icon: <Users size={16} />, desc: "Custom list" },
  { id: "private", label: "Private", icon: <Lock size={16} />, desc: "Only you" },
];

const FILTERS = [
  { id: "none", name: "Normal", icon: <X size={20} />, color: "bg-gray-600" },
  { id: "big_mouth", name: "Yapper", icon: <Megaphone size={20} />, color: "bg-orange-500" },
  { id: "bug_eyes", name: "Buggin", icon: <Eye size={20} />, color: "bg-purple-500" },
  { id: "schnoz", name: "Schnoz", icon: <User size={20} />, color: "bg-yellow-600" },
  { id: "wacky", name: "Wacky", icon: <Smile size={20} />, color: "bg-blue-500" },
  { id: "kitty", name: "Kitty", icon: <Cat size={20} />, color: "bg-pink-500" },
  { id: "boss", name: "Boss", icon: <Glasses size={20} />, color: "bg-yellow-500" },
  { id: "alien", name: "Alien", icon: <Ghost size={20} />, color: "bg-green-500" },
  { id: "cyber", name: "Cyber", icon: <Zap size={20} />, color: "bg-cyan-500" },
];

export default function StoryCreator({ onClose, currentUser }) {
  const webcamRef = useRef(null);
  const canvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const latestLandmarksRef = useRef(null);
  const pressTimer = useRef(null);
  const requestRef = useRef(null);

  // --- STATES ---
  const [capturedMedia, setCapturedMedia] = useState(null);
  const [privacy, setPrivacy] = useState("public");
  const [selectedFilter, setSelectedFilter] = useState("none");
  const [isUploading, setIsUploading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [cameraReady, setCameraReady] = useState(false);
  const [flash, setFlash] = useState(false);

  // --- FRIEND SELECTION STATES ---
  const [showFriendSelector, setShowFriendSelector] = useState(false);
  const [friendsList, setFriendsList] = useState([]); // Chứa object user đầy đủ
  const [selectedFriendIds, setSelectedFriendIds] = useState([]); // Chứa UIDs
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoadingFriends, setIsLoadingFriends] = useState(false);

  /* --- NEW: FETCH FRIENDS FROM FIRESTORE --- */
  useEffect(() => {
    const fetchFriendsData = async () => {
      // Kiểm tra xem currentUser có mảng friends không
      if (!currentUser?.friends || currentUser.friends.length === 0) {
        setFriendsList([]);
        return;
      }

      setIsLoadingFriends(true);
      try {
        // Tạo một mảng các Promise để lấy từng user document
        const friendPromises = currentUser.friends.map(async (friendId) => {
          const docRef = doc(db, "users", friendId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            return { id: docSnap.id, ...docSnap.data() };
          }
          return null;
        });

        // Chạy song song tất cả request
        const results = await Promise.all(friendPromises);
        
        // Lọc bỏ những kết quả null (nếu có user id bị lỗi hoặc đã xóa)
        const validFriends = results.filter((f) => f !== null);
        setFriendsList(validFriends);
      } catch (error) {
        console.error("Error fetching friends:", error);
      } finally {
        setIsLoadingFriends(false);
      }
    };

    fetchFriendsData();
  }, [currentUser]);

  /* --- UTILS: STOP CAMERA --- */
  const stopCamera = useCallback(() => {
    if (webcamRef.current && webcamRef.current.video && webcamRef.current.video.srcObject) {
      const tracks = webcamRef.current.video.srcObject.getTracks();
      tracks.forEach((track) => track.stop());
    }
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
  }, []);

  /* --- MEDIAPIPE & DRAWING LOGIC (Giữ nguyên) --- */
  const getCropDimensions = (videoWidth, videoHeight) => {
    const videoAspect = videoWidth / videoHeight;
    const canvasAspect = CANVAS_WIDTH / CANVAS_HEIGHT;
    let renderW, renderH, offsetX, offsetY;
    if (videoAspect > canvasAspect) {
      renderH = videoHeight; renderW = videoHeight * canvasAspect;
      offsetX = (videoWidth - renderW) / 2; offsetY = 0;
    } else {
      renderW = videoWidth; renderH = videoWidth / canvasAspect;
      offsetX = 0; offsetY = (videoHeight - renderH) / 2;
    }
    return { renderW, renderH, offsetX, offsetY };
  };

  const getCanvasCoords = (landmark, videoWidth, videoHeight) => {
    if (!videoWidth || !videoHeight) return { x: 0, y: 0 };
    const { renderW, renderH, offsetX, offsetY } = getCropDimensions(videoWidth, videoHeight);
    const sourceX = (1 - landmark.x) * videoWidth;
    const sourceY = landmark.y * videoHeight;
    const x = ((sourceX - offsetX) / renderW) * CANVAS_WIDTH;
    const y = ((sourceY - offsetY) / renderH) * CANVAS_HEIGHT;
    return { x, y };
  };

  const getFaceGeometry = (landmarks, getCoords) => {
    const leftEye = getCoords(landmarks[33]);
    const rightEye = getCoords(landmarks[263]);
    const width = Math.hypot(rightEye.x - leftEye.x, rightEye.y - leftEye.y);
    const angle = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);
    const cx = (leftEye.x + rightEye.x) / 2; const cy = (leftEye.y + rightEye.y) / 2;
    return { angle, width, cx, cy };
  };

  const applyDistortion = (ctx, video, landmarkIndex, scaleFactor, radiusMultiplier, landmarks, cropData) => {
    const { videoWidth, videoHeight } = video;
    const lm = landmarks[landmarkIndex];
    const { renderW, renderH, offsetX, offsetY } = cropData;
    const srcX = (1 - lm.x) * videoWidth; const srcY = lm.y * videoHeight;
    const leftEye = landmarks[33]; const rightEye = landmarks[263];
    const faceWidthSrc = Math.hypot((1 - rightEye.x) * videoWidth - (1 - leftEye.x) * videoWidth, rightEye.y * videoHeight - leftEye.y * videoHeight);
    const radius = faceWidthSrc * radiusMultiplier;
    const destX = ((srcX - offsetX) / renderW) * CANVAS_WIDTH;
    const destY = ((srcY - offsetY) / renderH) * CANVAS_HEIGHT;
    const destRadius = (radius / renderW) * CANVAS_WIDTH;
    ctx.save(); ctx.beginPath(); ctx.arc(destX, destY, destRadius * scaleFactor, 0, Math.PI * 2); ctx.clip();
    ctx.shadowBlur = 20; ctx.shadowColor = "black";
    ctx.translate(CANVAS_WIDTH, 0); ctx.scale(-1, 1); ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(video, srcX - radius, srcY - radius, radius * 2, radius * 2, destX - destRadius * scaleFactor, destY - destRadius * scaleFactor, destRadius * 2 * scaleFactor, destRadius * 2 * scaleFactor);
    ctx.restore();
  };

  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    const video = webcamRef.current?.video;
    if (canvas && video && video.readyState === 4 && !capturedMedia) {
      const ctx = canvas.getContext("2d");
      const { videoWidth, videoHeight } = video;
      const cropData = getCropDimensions(videoWidth, videoHeight);
      const { renderW, renderH, offsetX, offsetY } = cropData;
      ctx.save(); ctx.translate(CANVAS_WIDTH, 0); ctx.scale(-1, 1);
      ctx.drawImage(video, offsetX, offsetY, renderW, renderH, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.restore();

      if (latestLandmarksRef.current) {
        const landmarks = latestLandmarksRef.current;
        const getCoords = (lm) => getCanvasCoords(lm, videoWidth, videoHeight);
        const geo = getFaceGeometry(landmarks, getCoords);
        if (selectedFilter === "big_mouth" || selectedFilter === "wacky") applyDistortion(ctx, video, 13, 2.5, 0.45, landmarks, cropData);
        if (selectedFilter === "bug_eyes" || selectedFilter === "wacky") { applyDistortion(ctx, video, 33, 1.8, 0.25, landmarks, cropData); applyDistortion(ctx, video, 263, 1.8, 0.25, landmarks, cropData); }
        if (selectedFilter === "schnoz") applyDistortion(ctx, video, 1, 2.5, 0.35, landmarks, cropData);
        if (selectedFilter === "kitty") {
            ctx.save(); ctx.translate(geo.cx, geo.cy); ctx.rotate(geo.angle + Math.PI);
            ctx.fillStyle = "rgba(255, 180, 200, 0.9)"; ctx.strokeStyle = "#fff"; ctx.lineWidth = 4;
            ctx.beginPath(); ctx.moveTo(-geo.width * 0.7, -geo.width); ctx.quadraticCurveTo(-geo.width * 0.9, -geo.width * 1.8, -geo.width * 0.2, -geo.width * 1.2); ctx.fill(); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(geo.width * 0.7, -geo.width); ctx.quadraticCurveTo(geo.width * 0.9, -geo.width * 1.8, geo.width * 0.2, -geo.width * 1.2); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = "rgba(255, 255, 255, 0.6)"; ctx.lineWidth = 2;
            [-1, 1].forEach((side) => { for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(side * 30, 40); ctx.lineTo(side * (100 + i * 10), 30 + i * 15); ctx.stroke(); }});
            ctx.restore();
            const nose = getCoords(landmarks[1]); ctx.fillStyle = "pink"; ctx.beginPath(); ctx.arc(nose.x, nose.y, geo.width * 0.15, 0, Math.PI * 2); ctx.fill();
        }
        if (selectedFilter === "boss") {
             ctx.save(); ctx.translate(geo.cx, geo.cy); ctx.rotate(geo.angle + Math.PI);
             const gWidth = geo.width * 2.2; const gHeight = geo.width * 0.5;
             ctx.fillStyle = "#111"; ctx.fillRect(-gWidth / 2, -gHeight / 2, gWidth / 2.2, gHeight); ctx.fillRect(gWidth / 2 - gWidth / 2.2, -gHeight / 2, gWidth / 2.2, gHeight); ctx.fillRect(-gWidth / 10, -gHeight / 2, gWidth / 5, gHeight / 5);
             ctx.fillStyle = "rgba(255,255,255,0.3)"; ctx.fillRect(-gWidth / 2.5, -gHeight / 2.5, gWidth / 10, gHeight / 10); ctx.fillRect(gWidth / 3.5, -gHeight / 2.5, gWidth / 10, gHeight / 10); ctx.restore();
        }
        if (selectedFilter === "alien") {
            const leftEye = getCoords(landmarks[159]); const rightEye = getCoords(landmarks[386]);
            ctx.fillStyle = "black";
            [leftEye, rightEye].forEach((eye) => { ctx.save(); ctx.translate(eye.x, eye.y); ctx.rotate(geo.angle + (eye === leftEye ? -0.2 : 0.2) + Math.PI); ctx.beginPath(); ctx.ellipse(0, 0, geo.width * 0.25, geo.width * 0.35, 0, 0, 2 * Math.PI); ctx.fill(); ctx.fillStyle = "white"; ctx.beginPath(); ctx.ellipse(geo.width * 0.05, -geo.width * 0.1, geo.width * 0.05, geo.width * 0.08, 0, 0, 2 * Math.PI); ctx.fill(); ctx.fillStyle = "black"; ctx.restore(); });
        }
        if (selectedFilter === "cyber") {
            ctx.strokeStyle = "#00ffcc"; ctx.lineWidth = 2; ctx.shadowBlur = 10; ctx.shadowColor = "#00ffcc";
            const top = getCoords(landmarks[10]); const bottom = getCoords(landmarks[152]); const left = getCoords(landmarks[234]); const right = getCoords(landmarks[454]);
            const margin = 40; ctx.beginPath(); ctx.moveTo(left.x - margin, top.y); ctx.lineTo(left.x - margin, top.y - margin); ctx.lineTo(left.x, top.y - margin); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(right.x + margin, bottom.y); ctx.lineTo(right.x + margin, bottom.y + margin); ctx.lineTo(right.x, bottom.y + margin); ctx.stroke();
            const yScan = (Date.now() / 5) % CANVAS_HEIGHT; ctx.fillStyle = "rgba(0, 255, 204, 0.1)"; ctx.fillRect(0, yScan, CANVAS_WIDTH, 10); ctx.shadowBlur = 0;
        }
      }
      if (selectedFilter === "alien") { ctx.fillStyle = "rgba(0, 255, 50, 0.15)"; ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT); }
    }
    if (!capturedMedia) requestRef.current = requestAnimationFrame(drawScene);
  }, [selectedFilter, capturedMedia]);

  const onResults = useCallback((results) => {
    if (results.multiFaceLandmarks?.length > 0) latestLandmarksRef.current = results.multiFaceLandmarks[0];
    else latestLandmarksRef.current = null;
  }, []);

  useEffect(() => {
    const faceMesh = new FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
    faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5 });
    faceMesh.onResults(onResults);
    let camera = null;
    if (webcamRef.current && webcamRef.current.video) {
      camera = new Camera(webcamRef.current.video, {
        onFrame: async () => { if (webcamRef.current && webcamRef.current.video) await faceMesh.send({ image: webcamRef.current.video }); },
        width: 1280, height: 720,
      });
      camera.start().then(() => { setCameraReady(true); requestRef.current = requestAnimationFrame(drawScene); });
    }
    return () => { if (camera) camera.stop(); if (requestRef.current) cancelAnimationFrame(requestRef.current); stopCamera(); };
  }, [onResults, drawScene, stopCamera]);

  /* --- HANDLERS --- */
  const handleCapture = (blob, type) => {
    const url = URL.createObjectURL(blob);
    setCapturedMedia({ blob, url, type });
  };
  const takePhoto = async () => { setFlash(true); setTimeout(() => setFlash(false), 200); canvasRef.current.toBlob((blob) => handleCapture(blob, "image"), "image/jpeg", 0.95); };
  const startRecording = () => { setIsRecording(true); chunksRef.current = []; const stream = canvasRef.current.captureStream(30); const mimeType = MediaRecorder.isTypeSupported("video/webm; codecs=vp9") ? "video/webm; codecs=vp9" : "video/webm"; const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 3000000 }); recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); }; recorder.start(); mediaRecorderRef.current = recorder; };
  const stopRecording = () => { if (mediaRecorderRef.current && isRecording) { mediaRecorderRef.current.stop(); setIsRecording(false); setRecordingProgress(0); setTimeout(() => { const blob = new Blob(chunksRef.current, { type: "video/webm" }); handleCapture(blob, "video"); }, 500); } };
  const handleRetake = () => { if (capturedMedia?.url) URL.revokeObjectURL(capturedMedia.url); setCapturedMedia(null); requestRef.current = requestAnimationFrame(drawScene); };
  const handleClose = () => { stopCamera(); onClose(); };
  const handlePointerDown = () => { if (!cameraReady || isUploading || capturedMedia) return; pressTimer.current = setTimeout(() => startRecording(), 400); };
  const handlePointerUp = () => { if (pressTimer.current) clearTimeout(pressTimer.current); if (isRecording) stopRecording(); else takePhoto(); };
  useEffect(() => { let interval; if (isRecording) { interval = setInterval(() => { setRecordingProgress((p) => (p >= 100 ? (stopRecording(), 100) : p + 0.5)); }, 50); } return () => clearInterval(interval); }, [isRecording]);

  // --- FRIEND LOGIC ---
  const toggleFriend = (id) => {
    setSelectedFriendIds((prev) => 
      prev.includes(id) ? prev.filter(fid => fid !== id) : [...prev, id]
    );
  };
  
  const handlePrivacyChange = (newPrivacy) => {
      setPrivacy(newPrivacy);
      if (newPrivacy === 'friends') {
          setShowFriendSelector(true);
      }
  };

  const handlePost = async () => {
    if (isUploading || !capturedMedia) return;
    
    if (privacy === 'friends' && selectedFriendIds.length === 0) {
        setShowFriendSelector(true);
        return;
    }

    setIsUploading(true);
    try {
      const ext = capturedMedia.type === "video" ? "webm" : "jpg";
      const fileName = `${uuidv4()}.${ext}`;
      const storageRef = ref(storage, `stories/${currentUser.uid}/${fileName}`);
      await uploadBytes(storageRef, capturedMedia.blob);
      const downloadURL = await getDownloadURL(storageRef);

      await addDoc(collection(db, "stories"), {
        uid: currentUser.uid,
        username: currentUser.displayName || "User",
        avatar: currentUser.photoURL || "",
        media: downloadURL,
        type: capturedMedia.type,
        duration: 5000,
        timestamp: serverTimestamp(),
        views: 0,
        privacy: privacy,
        authorizedViewers: privacy === 'friends' ? selectedFriendIds : [], 
      });
      stopCamera(); 
      onClose();
    } catch (error) {
      console.error(error);
      setIsUploading(false);
    }
  };

  // Filter friends based on Search Query
  const filteredFriends = friendsList.filter(f => 
    (f.username || f.displayName || "User").toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-60 bg-black font-sans text-white overflow-hidden flex items-center justify-center">
      <div className="absolute inset-0 bg-gray-900">
        <div className="absolute inset-0 bg-linear-to-br from-purple-900/20 to-blue-900/20" />
      </div>

      <div className="relative w-full h-full md:w-[450px] md:h-[90vh] md:rounded-3xl overflow-hidden bg-black shadow-2xl ring-4 ring-gray-800">
        
        {/* --- CAMERA LAYERS --- */}
        <Webcam ref={webcamRef} audio={false} width={1280} height={720} videoConstraints={VIDEO_CONSTRAINTS} className="absolute opacity-0 pointer-events-none" />
        <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className={`absolute inset-0 w-full h-full object-cover ${capturedMedia ? 'hidden' : 'block'}`} />
        <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-200 ${flash ? "opacity-100" : "opacity-0"}`} />

        {/* --- PREVIEW LAYER --- */}
        {capturedMedia && (
            <div className="absolute inset-0 z-30 bg-black flex flex-col">
                <div className="relative flex-1 bg-gray-900 overflow-hidden">
                    {capturedMedia.type === 'video' ? (
                        <video src={capturedMedia.url} autoPlay loop playsInline className="w-full h-full object-cover" />
                    ) : (
                        <img src={capturedMedia.url} alt="Preview" className="w-full h-full object-cover" />
                    )}
                    
                    {/* PRIVACY SELECTOR */}
                    <div className="absolute bottom-0 w-full bg-linear-to-t from-black via-black/60 to-transparent p-6 pb-24">
                        <h3 className="text-center font-bold text-lg mb-4 text-white drop-shadow-md">Who can see this?</h3>
                        <div className="flex justify-center gap-2 mb-4">
                            {PRIVACY_OPTIONS.map((opt) => (
                                <button
                                    key={opt.id}
                                    onClick={() => handlePrivacyChange(opt.id)}
                                    className={`relative flex flex-col items-center justify-center w-24 h-20 rounded-2xl border transition-all duration-200 ${
                                        privacy === opt.id
                                            ? "bg-white text-black border-white shadow-lg scale-105"
                                            : "bg-black/40 text-gray-300 border-white/20 hover:bg-white/10"
                                    }`}
                                >
                                    {opt.icon}
                                    <span className="text-xs font-bold mt-2">{opt.label}</span>
                                    {/* Badge count */}
                                    {opt.id === 'friends' && selectedFriendIds.length > 0 && (
                                        <span className={`absolute -top-2 -right-2 bg-blue-600 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full border-2 border-black ${privacy === 'friends' ? 'block' : 'hidden'}`}>
                                            {selectedFriendIds.length}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ACTIONS */}
                <div className="absolute bottom-6 w-full px-6 flex justify-between items-center z-40">
                    <button onClick={handleRetake} className="p-4 bg-gray-800/80 rounded-full text-white hover:bg-gray-700 backdrop-blur-md"><Trash2 size={24} /></button>
                    <button onClick={handlePost} disabled={isUploading} className="flex items-center gap-3 px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-full text-white font-bold shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95">{isUploading ? <Loader2 className="animate-spin" /> : <>Post Story <Send size={20} /></>}</button>
                    <a href={capturedMedia.url} download={`story_${Date.now()}`} className="p-4 bg-gray-800/80 rounded-full text-white hover:bg-gray-700 backdrop-blur-md"><Download size={24} /></a>
                </div>
                
                {/* --- FRIEND SELECTOR OVERLAY --- */}
                {showFriendSelector && (
                    <div className="absolute inset-0 z-50 bg-black/95 flex flex-col animate-in slide-in-from-bottom-10 fade-in duration-200">
                        <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                            <button onClick={() => setShowFriendSelector(false)} className="p-2 hover:bg-gray-800 rounded-full"><ChevronLeft size={24} /></button>
                            <span className="font-bold text-lg">Select Friends</span>
                            <button 
                                onClick={() => {
                                    if (selectedFriendIds.length === friendsList.length) setSelectedFriendIds([]);
                                    else setSelectedFriendIds(friendsList.map(f => f.id));
                                }}
                                className="text-blue-500 text-sm font-semibold"
                            >
                                {selectedFriendIds.length === friendsList.length && friendsList.length > 0 ? "Deselect All" : "Select All"}
                            </button>
                        </div>
                        
                        <div className="p-4">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input 
                                    type="text" 
                                    placeholder="Search friends..." 
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full bg-gray-800 rounded-xl py-3 pl-10 pr-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600"
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto px-4 pb-24">
                            {isLoadingFriends ? (
                                <div className="flex justify-center mt-10"><Loader2 className="animate-spin text-blue-500" /></div>
                            ) : filteredFriends.length === 0 ? (
                                <p className="text-center text-gray-500 mt-10">No friends found.</p>
                            ) : (
                                filteredFriends.map((friend) => {
                                    const isSelected = selectedFriendIds.includes(friend.id);
                                    return (
                                        <div 
                                            key={friend.id} 
                                            onClick={() => toggleFriend(friend.id)}
                                            className="flex items-center gap-4 py-3 border-b border-gray-800 cursor-pointer active:bg-gray-800/50 transition-colors"
                                        >
                                            <img 
                                                src={friend.photoURL || friend.avatar || "https://i.pravatar.cc/150"} 
                                                alt={friend.displayName} 
                                                className="w-12 h-12 rounded-full object-cover bg-gray-700" 
                                            />
                                            <div className="flex-1">
                                                <p className="font-semibold">{friend.displayName || friend.username || "Unknown User"}</p>
                                            </div>
                                            <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-gray-500'}`}>
                                                {isSelected && <Check size={14} className="text-white" />}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        <div className="absolute bottom-0 w-full p-4 bg-gradient-to-t from-black via-black/90 to-transparent">
                            <button 
                                onClick={() => setShowFriendSelector(false)}
                                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-4 rounded-xl shadow-lg active:scale-95 transition-transform"
                            >
                                Done ({selectedFriendIds.length})
                            </button>
                        </div>
                    </div>
                )}
            </div>
        )}

        {/* --- CAMERA CONTROLS --- */}
        {!capturedMedia && (
          <>
            <div className="absolute top-0 left-0 right-0 p-5 flex justify-between items-start z-20 bg-linear-to-b from-black/60 to-transparent pb-12">
              <button onClick={handleClose} className="p-2.5 bg-white/10 backdrop-blur-md rounded-full hover:bg-white/20"><X size={24} /></button>
              {isRecording && (<div className="flex items-center gap-2 bg-red-500/90 px-3 py-1 rounded-full animate-pulse"><div className="w-2 h-2 bg-white rounded-full" /><span className="text-xs font-bold">REC</span></div>)}
            </div>
            {(isUploading || !cameraReady) && (
              <div className="absolute inset-0 bg-black/80 backdrop-blur-xl flex flex-col items-center justify-center z-50">
                <Loader2 className="w-12 h-12 text-blue-500 animate-spin mb-4" /><p className="font-semibold tracking-wide">{!cameraReady ? "Loading AR Engine..." : "Processing..."}</p>
              </div>
            )}
            <div className="absolute bottom-0 w-full z-20 pb-8 pt-12 bg-linear-to-t from-black/90 via-black/50 to-transparent flex flex-col items-center">
              <div className="w-full overflow-x-auto scrollbar-hide mb-6 px-4 snap-x">
                <div className="flex gap-4 items-center justify-center min-w-max px-4">
                  {FILTERS.map((f) => (
                    <button key={f.id} onClick={() => setSelectedFilter(f.id)} className={`flex flex-col items-center gap-2 transition-all duration-300 ${selectedFilter === f.id ? "-translate-y-2" : "opacity-60 scale-90"}`}>
                      <div className={`w-14 h-14 rounded-full flex items-center justify-center border-2 backdrop-blur-md shadow-lg ${selectedFilter === f.id ? `${f.color} border-white text-white` : "bg-black/30 border-white/30 text-white"}`}>{f.icon}</div>
                      <span className={`text-[10px] font-bold uppercase tracking-wider ${selectedFilter === f.id ? "opacity-100" : "opacity-0"}`}>{f.name}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative mb-2">
                <svg className="w-20 h-20 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-90 pointer-events-none">
                  <circle cx="40" cy="40" r="38" stroke="white" strokeWidth="4" fill="transparent" className="opacity-30" />
                  {isRecording && (<circle cx="40" cy="40" r="38" stroke="#ef4444" strokeWidth="4" fill="transparent" strokeDasharray="238" strokeDashoffset={238 - (238 * recordingProgress) / 100} strokeLinecap="round" className="transition-all duration-100 linear" />)}
                </svg>
                <button onMouseDown={handlePointerDown} onMouseUp={handlePointerUp} onMouseLeave={handlePointerUp} onTouchStart={handlePointerDown} onTouchEnd={handlePointerUp} className={`w-16 h-16 rounded-full border-4 border-transparent bg-white shadow-2xl transition-all duration-200 ${isRecording ? "scale-75 bg-red-500" : "hover:scale-105 active:scale-95"}`} />
              </div>
              <p className="text-[10px] text-white/50 font-medium tracking-widest uppercase">{isRecording ? "Recording..." : "Tap Photo • Hold Video"}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}