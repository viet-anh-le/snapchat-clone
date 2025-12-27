import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { authService } from "../lib/api/services/auth.service";
import {
  LogOut, ChevronRight, User, Key, X, CheckCircle,
  AlertCircle, Eye, EyeOff, Mail, ArrowRight, ArrowLeft, Loader2,Lock
} from "lucide-react";

// --- COMPONENT OTP INPUT (FIXED UI) ---
const OtpInput = ({ length = 6, value, onChange, disabled }) => {
  const inputRefs = useRef([]);

  const handleChange = (index, e) => {
    const val = e.target.value;
    if (isNaN(val)) return;
    const newOtp = value.split("");
    newOtp[index] = val.substring(val.length - 1);
    onChange(newOtp.join(""));
    if (val && index < length - 1 && inputRefs.current[index + 1]) {
      inputRefs.current[index + 1].focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === "Backspace" && !value[index] && index > 0 && inputRefs.current[index - 1]) {
      inputRefs.current[index - 1].focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").slice(0, length);
    if (!/^\d+$/.test(pastedData)) return;
    onChange(pastedData);
    if (inputRefs.current[Math.min(pastedData.length, length) - 1]) {
      inputRefs.current[Math.min(pastedData.length, length) - 1].focus();
    }
  };

  return (
    <div className="flex flex-nowrap gap-2 justify-center items-center my-6">
      {Array.from({ length }).map((_, index) => (
        <input
          key={index}
          ref={(ref) => (inputRefs.current[index] = ref)}
          type="text"
          inputMode="numeric"
          disabled={disabled}
          value={value[index] || ""}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={handlePaste}
          className={`
              !w-10 !h-12 sm:!w-12 sm:!h-14 
              shrink-0 
              text-center text-xl sm:text-2xl font-bold rounded-xl border-2 outline-none transition-all duration-200 p-0
              ${disabled ? "bg-slate-100 text-slate-400 border-slate-200" : "bg-white text-slate-800"}
              ${value[index] ? "border-indigo-500 shadow-lg shadow-indigo-100 scale-105 z-10" : "border-slate-200 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"}
            `}
        />
      ))}
    </div>
  );
};

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Modal & Step State
  const [isPassModalOpen, setIsPassModalOpen] = useState(false);
  const [step, setStep] = useState(1); // 1: Input New Pass, 2: Input OTP

  // Form Data
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // UI States
  const [countdown, setCountdown] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [passLoading, setPassLoading] = useState(false);
  const [passMessage, setPassMessage] = useState({ type: "", text: "" });
  const [strength, setStrength] = useState(0);

  if (!user) {
    navigate("/login");
    return null;
  }

  // Reset State khi mở Modal
  useEffect(() => {
    if (isPassModalOpen) {
      setStep(1);
      setOtp("");
      setNewPassword("");
      setConfirmPassword("");
      setPassMessage({ type: "", text: "" });
      setStrength(0);
      setShowPassword(false);
      setCountdown(0);
    }
  }, [isPassModalOpen]);

  // Countdown Timer
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((prev) => prev - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  // Password Strength Calc
  useEffect(() => {
    let s = 0;
    if (newPassword.length > 5) s += 1;
    if (newPassword.length > 8) s += 1;
    if (/[A-Z]/.test(newPassword)) s += 1;
    if (/[0-9]/.test(newPassword)) s += 1;
    setStrength(s);
  }, [newPassword]);

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

  // --- BƯỚC 1: Validate Pass & Gọi Service Gửi OTP ---
  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setPassMessage({ type: "", text: "" });

    if (newPassword.length < 6) {
      setPassMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPassMessage({ type: "error", text: "Passwords do not match." });
      return;
    }

    await executeSendOtp();
  };

  const executeSendOtp = async () => {
    setPassLoading(true);
    try {
      if (!user?.email) throw new Error("User email not found");

      // GỌI SERVICE (Tự động handle token)
      await authService.sendOtp(user.email);

      setStep(2);
      setCountdown(60);
      setPassMessage({ type: "success", text: `Code sent to ${user.email}` });

    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || "Failed to send verification code.";
      setPassMessage({ type: "error", text: msg });
    } finally {
      setPassLoading(false);
    }
  };

  // --- BƯỚC 2: Gọi Service Reset Password ---
  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setPassMessage({ type: "", text: "" });

    if (otp.length < 6) {
      setPassMessage({ type: "error", text: "Please enter full 6-digit code." });
      return;
    }

    setPassLoading(true);
    try {
      // GỌI SERVICE
      await authService.resetPassword({
        email: user.email,
        otp: otp,
        newPassword: newPassword
      });

      setPassMessage({ type: "success", text: "Password updated successfully!" });
      setTimeout(() => setIsPassModalOpen(false), 2000);

    } catch (error) {
      console.error(error);
      const msg = error.response?.data?.message || "Invalid Code or Error.";
      setPassMessage({ type: "error", text: msg });
    } finally {
      setPassLoading(false);
    }
  };

  // --- MENU CONFIG (Đã rút gọn) ---
  const menuItems = [
    { icon: <User size={20} />, label: "Edit Profile", path: "/edit-profile", color: "text-blue-600", bg: "bg-blue-100" },
    { icon: <Key size={20} />, label: "Change Password", action: () => setIsPassModalOpen(true), color: "text-pink-600", bg: "bg-pink-100" },
  ];

  const containerVariants = { hidden: { opacity: 0 }, show: { opacity: 1, transition: { staggerChildren: 0.1 } } };
  const itemVariants = { hidden: { opacity: 0, x: -20 }, show: { opacity: 1, x: 0 } };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-pink-50 text-slate-800 relative overflow-x-hidden">
      {/* Background Decor */}
      <div className="fixed top-[-10%] left-[-10%] w-96 h-96 bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />

      {/* Container */}
      <div className="max-w-2xl mx-auto px-4 pb-12 pt-6 space-y-8 relative z-10">

        {/* User Info Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 bg-white/60 backdrop-blur-md p-5 rounded-2xl border border-white shadow-lg"
        >
          <img src={user.photoURL || `https://ui-avatars.com/api/?name=${user.displayName}&background=random`} alt="avatar" className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-sm" />
          <div className="flex-1 min-w-0">
            <h2 className="font-bold text-lg text-slate-800 truncate">{user.displayName || "User"}</h2>
            <p className="text-slate-500 text-sm truncate">{user.email}</p>
          </div>
          <Link to="/edit-profile">
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} className="px-4 py-2 text-xs font-semibold bg-slate-900 text-white rounded-lg shadow-md">
              Edit
            </motion.button>
          </Link>
        </motion.div>

        {/* Menu Grid */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Account Settings</h3>
          <div className="bg-white/60 backdrop-blur-md rounded-2xl border border-white shadow-lg overflow-hidden divide-y divide-slate-100">
            {menuItems.map((item, i) => (
              <motion.div key={i} variants={itemVariants}>
                {item.path ? (
                  <Link to={item.path} className="flex items-center justify-between p-4 hover:bg-white/80 transition-colors group">
                    <MenuContent item={item} />
                  </Link>
                ) : (
                  <div onClick={item.action} className="flex items-center justify-between p-4 hover:bg-white/80 transition-colors group cursor-pointer">
                    <MenuContent item={item} />
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Logout */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="pt-4">
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={handleLogout} disabled={isLoggingOut} className="w-full flex items-center justify-center gap-2 bg-red-50 text-red-600 border border-red-100 py-4 rounded-2xl font-semibold hover:bg-red-100 hover:shadow-sm transition-all disabled:opacity-70">
            {isLoggingOut ? <Loader2 className="w-5 h-5 animate-spin" /> : <><LogOut className="w-5 h-5" /> <span>Log Out</span></>}
          </motion.button>
        </motion.div>
      </div>

      {/* --- PASSWORD MODAL --- */}
      <AnimatePresence>
        {isPassModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsPassModalOpen(false)}
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="w-full max-w-md bg-white rounded-[32px] shadow-2xl relative z-10 overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-br from-indigo-500 to-purple-600 opacity-10" />

              <div className="relative p-8">
                <div className="flex justify-between items-start mb-6">
                  <div className="bg-indigo-50 p-3 rounded-2xl text-indigo-600 shadow-sm border border-indigo-100">
                    <Key size={28} />
                  </div>
                  <button onClick={() => setIsPassModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="mb-6">
                  <h3 className="text-2xl font-bold text-slate-800">Change Password</h3>
                  <p className="text-slate-500 text-sm mt-1">
                    {step === 1 ? "Create a new strong password." : "We sent a code to your email."}
                  </p>
                </div>

                {/* STEP 1: NEW PASS */}
                {step === 1 && (
                  <form onSubmit={handleStep1Submit} className="space-y-5">
                    <div className="space-y-3">
                      <div className="relative group">
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input
                          type={showPassword ? "text" : "password"}
                          className="w-full pl-11 pr-11 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-slate-700 font-medium placeholder:text-slate-400"
                          placeholder="New Password (min 6 chars)"
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                        />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>

                      <div className="flex gap-1 h-1 px-1 opacity-80">
                        {[1, 2, 3, 4].map((level) => (
                          <div key={level} className={`flex-1 rounded-full transition-all duration-300 ${strength >= level ? (strength === 4 ? "bg-green-500" : strength >= 2 ? "bg-yellow-400" : "bg-red-400") : "bg-slate-200"}`} />
                        ))}
                      </div>

                      <div className="relative group">
                        <CheckCircle className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                        <input
                          type={showPassword ? "text" : "password"}
                          className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all outline-none text-slate-700 font-medium"
                          placeholder="Confirm Password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                        />
                      </div>
                    </div>

                    <AnimatePresence mode="wait">
                      {passMessage.text && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`p-3 rounded-xl flex items-start gap-2 text-sm font-medium ${passMessage.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                          <AlertCircle size={16} /> {passMessage.text}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <button type="submit" disabled={passLoading} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                      {passLoading ? <Loader2 className="animate-spin" /> : <>Send Verification Code <ArrowRight size={18} /></>}
                    </button>
                  </form>
                )}

                {/* STEP 2: OTP */}
                {step === 2 && (
                  <form onSubmit={handleStep2Submit} className="space-y-6">
                    <div className="text-center">
                      <div className="inline-flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full text-xs font-semibold mb-2">
                        <Mail size={14} /> Sent to {user.email}
                      </div>
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wide block">Verification Code</label>
                    </div>

                    <OtpInput length={6} value={otp} onChange={setOtp} disabled={passLoading} />

                    <AnimatePresence mode="wait">
                      {passMessage.text && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className={`p-3 rounded-xl flex items-start gap-2 text-sm font-medium ${passMessage.type === 'error' ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-green-50 text-green-600 border border-green-100'}`}>
                          <AlertCircle size={16} /> {passMessage.text}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="grid grid-cols-3 gap-3">
                      <button type="button" onClick={() => setStep(1)} className="col-span-1 py-3.5 rounded-xl font-semibold text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-1">
                        <ArrowLeft size={16} /> Back
                      </button>
                      <button type="submit" disabled={passLoading} className="col-span-2 bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-3.5 rounded-xl font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-70 flex items-center justify-center gap-2">
                        {passLoading ? <Loader2 className="animate-spin" /> : "Verify & Update"}
                      </button>
                    </div>

                    <div className="text-center">
                      <button type="button" disabled={countdown > 0 || passLoading} onClick={executeSendOtp} className={`text-xs font-semibold ${countdown > 0 ? 'text-slate-400 cursor-not-allowed' : 'text-indigo-600 hover:text-indigo-500'}`}>
                        {countdown > 0 ? `Resend code in ${countdown}s` : "Didn't receive code? Resend"}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

const MenuContent = ({ item }) => (
  <>
    <div className="flex items-center gap-4">
      <div className={`p-2.5 rounded-xl ${item.bg} ${item.color}`}>
        {item.icon}
      </div>
      <span className="font-medium text-slate-700 group-hover:text-slate-900 transition-colors">
        {item.label}
      </span>
    </div>
    <ChevronRight className="text-slate-300 w-5 h-5 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" />
  </>
);