import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { 
  UserPlus, 
  Mail, 
  Lock, 
  Eye, 
  EyeOff, 
  Loader2, 
  ArrowRight,
  CheckCircle2
} from "lucide-react";

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  // Visibility states for passwords
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const { signupWithEmail } = useAuth(); // Assuming you have Google auth in context too
  const navigate = useNavigate();

  // Helper to handle errors nicely
  const showError = (msg) => {
    setError(msg);
    setTimeout(() => setError(""), 5000);
  };

  async function handleGoogleSignup() {
    setError("");
    setLoading(true);
    try {
      // await signInWithPopup(auth, googleProvider); // Uncomment when ready
      // navigate("/"); // Redirect after success
      setSuccess("Successfully signed up with Google!");
    } catch (err) {
      console.error(err);
      showError(err.message || "Google signup failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleEmailSignup(e) {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      showError("Passwords do not match.");
      return;
    }

    if (password.length < 6) {
        showError("Password should be at least 6 characters.");
        return;
    }

    setLoading(true);
    try {
      await signupWithEmail(email, password);
      setSuccess("Account created successfully!");
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      // Optional: Navigate to login or home after delay
      setTimeout(() => navigate("/"), 1500); 
    } catch (err) {
      console.error(err);
      showError(err.message || "Signup failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      
      {/* Background Decor (Matches Login Page) */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-purple-200/30 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-indigo-200/30 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative max-w-md w-full bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/50 p-6 sm:p-8 z-10"
      >
        {/* Header */}
        <div className="text-center mb-8">
            <motion.div 
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
              className="mx-auto w-14 h-14 bg-gradient-to-tr from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 mb-4"
            >
              <UserPlus size={24} />
            </motion.div>
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Create an Account</h2>
            <p className="text-slate-500 mt-1">Join us to get started</p>
        </div>

        {/* Google Signup */}
        <motion.button
            whileHover={{ y: -1, boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
            whileTap={{ scale: 0.98 }}
            onClick={handleGoogleSignup}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-slate-200 text-slate-700 px-4 py-3 rounded-xl font-medium shadow-sm hover:border-slate-300 transition-all disabled:opacity-70 mb-6"
        >
            {loading ? (
                <Loader2 className="animate-spin text-slate-400" size={20} />
            ) : (
                <>
                <GoogleIcon />
                <span>Sign up with Google</span>
                </>
            )}
        </motion.button>

        <div className="relative flex items-center gap-4 mb-6">
            <div className="h-px bg-slate-200 flex-1" />
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Or register with email</span>
            <div className="h-px bg-slate-200 flex-1" />
        </div>

        <form onSubmit={handleEmailSignup} className="space-y-4">
          {/* Email */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 ml-1">Email</label>
            <div className="relative group">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                placeholder="you@gmail.com"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 ml-1">Password</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                placeholder="At least 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 transition"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-700 ml-1">Confirm Password</label>
            <div className="relative group">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input
                type={showConfirmPassword ? "text" : "password"}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                placeholder="Repeat password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-indigo-600 transition"
              >
                {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {/* Messages */}
          <AnimatePresence mode="wait">
            {error && (
                <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg border border-red-100 flex items-center gap-2"
                >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                {error}
                </motion.div>
            )}
            {success && (
                <motion.div
                initial={{ opacity: 0, y: -10, height: 0 }}
                animate={{ opacity: 1, y: 0, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="text-sm text-green-600 bg-green-50 px-3 py-2 rounded-lg border border-green-100 flex items-center gap-2"
                >
                <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                {success}
                </motion.div>
            )}
           </AnimatePresence>

          {/* Submit Button */}
          <div className="pt-2">
            <motion.button
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl px-4 py-3 shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:brightness-110 transition-all flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
                {loading ? <Loader2 className="animate-spin" /> : (
                    <>
                        Create Account <ArrowRight size={18} />
                    </>
                )}
            </motion.button>
          </div>
        </form>

        <p className="mt-6 text-sm text-center text-slate-500">
          Already have an account?{" "}
          <Link to="/login" className="text-indigo-600 font-semibold hover:text-indigo-700 hover:underline">
            Log in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}

// Keep the same Google Icon component
const GoogleIcon = () => (
    <svg width="20" height="20" viewBox="0 0 533.5 544.3" xmlns="http://www.w3.org/2000/svg">
      <path fill="#4285F4" d="M533.5 278.4c0-18.8-1.6-37.1-4.7-54.7H272v103.6h146.9c-6.3 34.1-25 62.9-53.4 82v68.2h86.3c50.5-46.6 81.7-115.2 81.7-199z" />
      <path fill="#34A853" d="M272 544.3c72.9 0 134-24.1 178.7-65.4l-86.3-68.2c-24 16.1-54.6 25.6-92.4 25.6-71 0-131.3-47.8-152.8-112.1H34.2v70.8c44.8 88.7 138.4 149.3 237.8 149.3z" />
      <path fill="#FBBC05" d="M119.2 322.4c-10.6-31.6-10.6-65.7 0-97.3V154.3H34.2c-39.4 78.9-39.4 171 0 249.9l85-81.8z" />
      <path fill="#EA4335" d="M272 107.7c39.6 0 75.3 13.6 103.5 40.4l77.6-77.6C396.3 24.6 335.2 0 272 0 172.6 0 79 60.6 34.2 149.3l85 70.8C140.7 155.5 201 107.7 272 107.7z" />
    </svg>
);
