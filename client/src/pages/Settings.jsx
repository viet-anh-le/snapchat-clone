import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  LogOut,
  ChevronRight,
  User,
  Bell,
  Lock,
  Shield,
  HelpCircle,
  ArrowLeft,
  Moon,
  Loader2
} from "lucide-react";

export default function SettingsPage() {
  const { user, logout } = useAuth(); // Assuming 'logout' is exposed in your context
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Redirect if not logged in
  if (!user) {
    navigate("/login"); 
    return null;
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Logout failed", error);
      setIsLoggingOut(false);
    }
  };

  const menuItems = [
    { 
        icon: <User size={20} />, 
        label: "Edit Profile", 
        path: "/edit-profile",
        color: "text-blue-600",
        bg: "bg-blue-100" 
    },
    { 
        icon: <Bell size={20} />, 
        label: "Notifications", 
        path: "/notifications",
        color: "text-orange-600",
        bg: "bg-orange-100" 
    },
    { 
        icon: <Moon size={20} />, 
        label: "Appearance", 
        path: "/appearance",
        color: "text-purple-600",
        bg: "bg-purple-100" 
    },
    { 
        icon: <Lock size={20} />, 
        label: "Privacy", 
        path: "/privacy",
        color: "text-green-600",
        bg: "bg-green-100" 
    },
    { 
        icon: <Shield size={20} />, 
        label: "Security", 
        path: "/security",
        color: "text-indigo-600",
        bg: "bg-indigo-100" 
    },
    { 
        icon: <HelpCircle size={20} />, 
        label: "Help Center", 
        path: "/help",
        color: "text-teal-600",
        bg: "bg-teal-100" 
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-pink-50 text-slate-800 relative overflow-x-hidden">
      
      {/* Background Decor */}
      <div className="fixed top-[-10%] left-[-10%] w-96 h-96 bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
 

      <div className="max-w-2xl mx-auto px-4 pb-12 pt-6 space-y-8">
        
        {/* User Info Card */}
        <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-4 bg-white/60 backdrop-blur-md p-5 rounded-2xl border border-white shadow-lg"
        >
            <img
            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`}
            alt="avatar"
            className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-sm"
            />
            <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg text-slate-800 truncate">{user.displayName || "User"}</h2>
            <p className="text-slate-500 text-sm truncate">{user.email}</p>
            </div>
            <Link to="/edit-profile">
                <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg shadow-md"
                >
                    Edit
                </motion.button>
            </Link>
        </motion.div>

        {/* Menu Items */}
        <motion.div 
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-3"
        >
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Preferences</h3>
            
            <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white shadow-lg overflow-hidden divide-y divide-slate-100">
                {menuItems.map((item, i) => (
                <motion.div key={i} variants={itemVariants}>
                    <Link
                        to={item.path}
                        className="flex items-center justify-between p-4 hover:bg-white/80 transition-colors group"
                    >
                        <div className="flex items-center gap-4">
                            <div className={`p-2.5 rounded-xl ${item.bg} ${item.color}`}>
                                {item.icon}
                            </div>
                            <span className="font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
                                {item.label}
                            </span>
                        </div>
                        <ChevronRight className="text-slate-300 w-5 h-5 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
                    </Link>
                </motion.div>
                ))}
            </div>
        </motion.div>

        {/* Logout Section */}
        <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="pt-4"
        >
            <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-100 py-4 rounded-2xl font-semibold hover:bg-red-100 hover:shadow-sm transition-all disabled:opacity-70"
            >
            {isLoggingOut ? (
                <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
                <>
                    <LogOut className="w-5 h-5" /> 
                    <span>Log Out</span>
                </>
            )}
            </motion.button>
            <p className="text-center text-xs text-slate-400 mt-6">
                App Version 1.0.2 • Build 240
            </p>
        </motion.div>

      </div>
    </div>
  );
}