import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { auth } from "../lib/firebase"; // Ensure this path matches your project structure
import { useAuth } from "../context/AuthContext"; // Ensure this path matches your project structure
import { sendPasswordResetEmail } from "firebase/auth";
import { 
  ArrowLeft, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  LogOut, 
  Sparkles 
} from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const navigate = useNavigate();
  
  // Destructure auth functions from your context
  const { user, loginWithEmail, loginWithGoogle, signOut } = useAuth(); 

  const handleBack = () => navigate("/");

  // Helper to handle errors gracefully with auto-dismiss
  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(""), 5000);
  };

  async function handleForgotPassword() {
    if (!email) {
      showError("Please enter your email address first.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent! Check your inbox.");
    } catch (err) {
      showError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate("/");
    } catch (err) {
      showError("Google login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSignIn(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loginWithEmail(email, password);
      navigate("/");
    } catch (err) {
      // Customize error messages based on Firebase error codes if needed
      showError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      
      {/* Decorative background blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative max-w-md w-full bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-6 sm:p-8 z-10"
      >
        {/* Back Button */}
        <button
          onClick={handleBack}
          className="absolute top-6 left-6 text-slate-400 hover:text-slate-700 transition flex items-center gap-1 text-sm font-medium group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Back
        </button>

        {/* Header Section */}
        <div className="mt-8 mb-8 text-center">
            <motion.div 
              initial={{ rotate: -10, scale: 0.8 }}
              animate={{ rotate: 3, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="mx-auto w-14 h-14 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 mb-4"
            >
              <Sparkles size={24} fill="currentColor" />
            </motion.div>
            <h1 className="text-2xl font-bold text-slate-800 tracking-tight">
              Welcome back
            </h1>
            <p className="text-slate-500 mt-1">
              Please enter your details to sign in
            </p>
        </div>

        {!user ? (
          <div className="space-y-6">
            {/* Google Button */}
            <motion.button
              whileHover={{ y: -1, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-xl font-medium shadow-sm hover:border-slate-300 transition-all disabled:opacity-70"
            >
              {loading ? (
                 <Loader2 className="animate-spin text-slate-400" size={20} />
              ) : (
                <>
                  <GoogleIcon />
                  <span>Sign in with Google</span>
                </>
              )}
            </motion.button>

            {/* Divider */}
            <div className="relative flex items-center gap-4">
              <div className="h-px bg-slate-200 flex-1" />
              <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Or</span>
              <div className="h-px bg-slate-200 flex-1" />
            </div>

            <form className="space-y-4" onSubmit={handleEmailSignIn}>
              {/* Email Input */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 ml-1">Email</label>
                <div className="relative group">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-slate-700 ml-1">Password</label>
                <div className="relative group">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 transition rounded-md"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {/* Error Message Animation */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100 flex items-center gap-2 mb-2">
                      <div className="min-w-[6px] h-[6px] rounded-full bg-red-500" />
                      {error}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-sm font-medium text-indigo-600 hover:text-indigo-700 hover:underline transition"
                  disabled={loading}
                >
                  Forgot password?
                </button>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-3 pt-2">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl px-4 py-3 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {loading ? <Loader2 className="animate-spin" /> : "Sign in"}
                </motion.button>
                
                <div className="text-center mt-2">
                  <span className="text-sm text-slate-500">Don't have an account? </span>
                  <button
                    onClick={(e) => { e.preventDefault(); navigate("/signup"); }}
                    className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 hover:underline"
                  >
                    Create account
                  </button>
                </div>
              </div>
            </form>
          </div>
        ) : (
          // Signed In View
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="py-6 flex flex-col items-center gap-6"
          >
            <div className="relative">
                <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-xl">
                    <img
                        src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=random`}
                        alt="avatar"
                        className="w-full h-full rounded-full object-cover border-4 border-white bg-white"
                    />
                </div>
                <div className="absolute bottom-1 right-1 w-6 h-6 bg-green-500 border-4 border-white rounded-full shadow-sm"></div>
            </div>
            
            <div className="text-center space-y-1">
              <h3 className="text-xl font-bold text-slate-800">
                {user.displayName || "Welcome User"}
              </h3>
              <p className="text-slate-500 font-medium">{user.email}</p>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => signOut(auth)}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-colors text-slate-600 font-medium w-full justify-center"
            >
              <LogOut size={18} />
              Sign out
            </motion.button>
          </motion.div>
        )}
      </motion.div>

      <div className="fixed bottom-6 text-xs font-medium text-slate-400 select-none">
        Secure Login System © 2024
      </div>
    </div>
  );
}

// Google SVG Icon Component
const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M533.5 278.4c0-18.8-1.6-37.1-4.7-54.7H272v103.6h146.9c-6.3 34.1-25 62.9-53.4 82v68.2h86.3c50.5-46.6 81.7-115.2 81.7-199z" />
      <path fill="#34A853" d="M272 544.3c72.9 0 134-24.1 178.7-65.4l-86.3-68.2c-24 16.1-54.6 25.6-92.4 25.6-71 0-131.3-47.8-152.8-112.1H34.2v70.8c44.8 88.7 138.4 149.3 237.8 149.3z" />
      <path fill="#FBBC05" d="M119.2 322.4c-10.6-31.6-10.6-65.7 0-97.3V154.3H34.2c-39.4 78.9-39.4 171 0 249.9l85-81.8z" />
      <path fill="#EA4335" d="M272 107.7c39.6 0 75.3 13.6 103.5 40.4l77.6-77.6C396.3 24.6 335.2 0 272 0 172.6 0 79 60.6 34.2 149.3l85 70.8C140.7 155.5 201 107.7 272 107.7z" />
    </svg>
);