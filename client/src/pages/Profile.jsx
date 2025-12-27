import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext"; 
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { db } from "../lib/firebase"; 
import { Link, useNavigate } from "react-router-dom";
import { 
  ArrowLeft, 
  Camera, 
  Settings, 
  Users, 
  Flame, 
  Share2, 
  Plus, 
  Eye,
  Loader2,
  Calendar
} from "lucide-react";
import { motion } from "framer-motion";
import { Upload, message } from "antd";
import upload from "../lib/upload"; 
// import AddFriendModal from "./AddFriendModal"; // Adjusted path to be relative to this file if they are in same folder, or keep yours

export default function ProfilePage() {
  const { user, setUser } = useAuth();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const navigate = useNavigate();
  const [isAddFriendOpen, setIsAddFriendOpen] = useState(false);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: { duration: 0.5, staggerChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  useEffect(() => {
    if (!user) return;
    const fetchUserData = async () => {
      try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
          setUserData(snap.data());
        } else {
            // Fallback if firestore doc doesn't exist but Auth user does
            setUserData({
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                uid: user.uid
            });
        }
      } catch (error) {
        console.error("Error fetching user data:", error);
        message.error("Failed to load profile data");
      } finally {
        setLoading(false);
      }
    };
    fetchUserData();
  }, [user]);

  const handleChangeAvatar = async (file) => {
    if (!file) return;
    setUploading(true);
    try {
      const imgUrl = await upload(file);
      const userRef = doc(db, "users", user.uid);
      
      // Update both Firestore and Auth Profile
      await updateDoc(userRef, { photoURL: imgUrl });
      await updateProfile(user, { photoURL: imgUrl });
      
      setUserData((prev) => ({ ...prev, photoURL: imgUrl }));
      setUser((prev) => ({ ...prev, photoURL: imgUrl }));
      
      message.success("Avatar updated successfully!");
    } catch (err) {
      console.error("Upload avatar error:", err);
      message.error("Failed to update avatar");
    } finally {
      setUploading(false);
    }
  };

  const handleCopyProfileLink = async () => {
    // Fallback to local ID if username doesn't exist
    const uniqueId = userData?.username || user?.uid; 
    const link = `${window.location.origin}/user/${uniqueId}`;
    try {
      await navigator.clipboard.writeText(link);
      message.success("Profile link copied!");
    } catch (err) {
       message.error("Cannot copy profile link.");
    }
  };

  // --- RENDERING ---

  if (!user) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center">
            <p className="text-xl font-semibold text-slate-600">⚠️ You are not logged in.</p>
            <button onClick={() => navigate("/login")} className="mt-4 text-indigo-600 hover:underline">Go to Login</button>
        </div>
    </div>
  );

  if (loading || !userData) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-pink-50 relative overflow-x-hidden">
      
      {/* Background Decor */}
      <div className="fixed top-[-10%] left-[-10%] w-96 h-96 bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="sticky top-0 z-20 backdrop-blur-md bg-white/70 border-b border-white/20">
        <div className="max-w-xl mx-auto px-4 py-3 flex items-center justify-between">
           <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-white/50 hover:bg-white shadow-sm border border-slate-100 text-slate-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </motion.button>

          <span className="font-bold text-slate-800 tracking-tight">My Profile</span>

          <Link to="/settings">
            <motion.div
              whileHover={{ rotate: 90 }}
              transition={{ duration: 0.3 }}
              className="p-2 rounded-full bg-white/50 hover:bg-white shadow-sm border border-slate-100 text-slate-600 hover:text-indigo-600"
            >
              <Settings className="w-5 h-5" />
            </motion.div>
          </Link>
        </div>
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-xl mx-auto px-6 pb-20 pt-6"
      >
        
        {/* Glass Card Container */}
        <div className="bg-white/60 backdrop-blur-xl rounded-3xl shadow-xl border border-white p-8 relative overflow-hidden">
            
            {/* 1. Avatar Section */}
            <motion.div variants={itemVariants} className="flex flex-col items-center">
                <div className="relative group">
                    <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-full p-1 bg-gradient-to-tr from-yellow-400 to-purple-600 shadow-lg">
                        <div className="w-full h-full rounded-full border-4 border-white overflow-hidden bg-white relative">
                            <img
                                src={userData.photoURL || `https://ui-avatars.com/api/?name=${userData.displayName || 'User'}&background=random`}
                                alt="Avatar"
                                className={`w-full h-full object-cover transition-opacity duration-300 ${uploading ? 'opacity-50' : 'opacity-100'}`}
                            />
                            {uploading && (
                                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                                </div>
                            )}
                        </div>
                    </div>
                    
                    <Upload
                        accept="image/*"
                        showUploadList={false}
                        disabled={uploading}
                        beforeUpload={(file) => {
                            handleChangeAvatar(file);
                            return false;
                        }}
                    >
                        <motion.button 
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                            className="absolute bottom-1 right-1 bg-slate-900 text-white p-2.5 rounded-full shadow-lg border-2 border-white hover:bg-slate-800 transition cursor-pointer"
                        >
                            <Camera className="w-4 h-4" />
                        </motion.button>
                    </Upload>
                </div>

                {/* Name & Handle */}
                <div className="text-center mt-4 space-y-1">
                    <h2 className="text-2xl font-bold text-slate-900">
                        {userData.displayName || "Snap User"}
                    </h2>
                    <p className="text-slate-500 font-medium text-sm">
                        @{userData.username || userData.email?.split('@')[0] || "username"}
                    </p>
                    
                    {/* Bio (Optional Rendering) */}
                    {userData.bio && (
                        <p className="text-slate-600 text-sm mt-3 max-w-xs mx-auto leading-relaxed">
                            {userData.bio}
                        </p>
                    )}

                    {/* Join Date (Optional) */}
                    {userData.createdAt && (
                        <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mt-2">
                             <Calendar size={12} />
                             <span>Joined {new Date(userData.createdAt?.seconds * 1000).toLocaleDateString()}</span>
                        </div>
                    )}
                </div>
            </motion.div>

            {/* 2. Stats Grid */}
            <motion.div variants={itemVariants} className="grid grid-cols-2 gap-4 mt-8">
                <div className="bg-orange-50/50 border border-orange-100 rounded-2xl p-4 text-center hover:bg-orange-50 transition-colors group cursor-default">
                    <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                        <Flame size={20} fill="currentColor" className="opacity-90" />
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{userData.snapStreak || 0}</p>
                    <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Snap Streak</p>
                </div>

                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 text-center hover:bg-blue-50 transition-colors group cursor-default">
                    <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-2 group-hover:scale-110 transition-transform">
                        <Users size={20} fill="currentColor" className="opacity-90" />
                    </div>
                    <p className="text-2xl font-bold text-slate-800">{userData.friendsCount || userData.friends?.length || 0}</p>
                    <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Friends</p>
                </div>
            </motion.div>

            {/* 3. Action Buttons */}
            <motion.div variants={itemVariants} className="mt-8 space-y-3">
                <Link to="/settings" className="block">
                    <motion.button
                        whileHover={{ scale: 1.01 }}
                        whileTap={{ scale: 0.99 }}
                        className="w-full bg-slate-900 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-slate-200 flex items-center justify-center gap-2"
                    >
                        Edit Profile
                    </motion.button>
                </Link>

                <div className="grid grid-cols-2 gap-3">
                    <motion.button
                        whileHover={{ scale: 1.02, backgroundColor: "#f1f5f9" }}
                        whileTap={{ scale: 0.98 }}
                        onClick={handleCopyProfileLink}
                        className="bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:shadow-sm transition-all"
                    >
                        <Share2 size={18} />
                        Share
                    </motion.button>

                    <Link to="/stories/my-story" className="block w-full"> 
                        <motion.button
                            whileHover={{ scale: 1.02, backgroundColor: "#f1f5f9" }}
                            whileTap={{ scale: 0.98 }}
                            className="w-full bg-white border border-slate-200 text-slate-700 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:shadow-sm transition-all"
                        >
                            <Eye size={18} />
                            My Story
                        </motion.button>
                    </Link>
                </div>

            </motion.div>
        </div>
      </motion.div>

      </div>
);

}