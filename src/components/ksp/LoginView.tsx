"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Eye, EyeOff, ArrowRight, Lock, User } from "lucide-react";

const USERS = [
  { username: "investigator", password: "ksp123", role: "Investigator" },
  { username: "analyst", password: "ksp123", role: "Analyst" },
  { username: "admin", password: "ksp123", role: "Admin" },
];

export default function LoginView() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const login = useAppStore((s) => s.login);

  const handleLogin = () => {
    setIsLoading(true);
    // Simulate brief auth delay for polish
    setTimeout(() => {
      const user = USERS.find(
        (u) => u.username === username && u.password === password
      );
      if (user) {
        login(user.username, user.role);
        setError("");
      } else {
        setError("Invalid credentials. Try investigator/ksp123");
      }
      setIsLoading(false);
    }, 400);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ backgroundColor: "#050810" }}>
      {/* Ambient background effects */}
      <div className="absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] rounded-full opacity-30" style={{ background: "radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)" }} />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] rounded-full opacity-30" style={{ background: "radial-gradient(circle, rgba(129,140,248,0.04) 0%, transparent 70%)" }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-[0.015]" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)", backgroundSize: "64px 64px" }} />
      </div>

      {/* Floating particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <motion.div
            key={i}
            className="absolute w-1 h-1 rounded-full"
            style={{ backgroundColor: i % 2 === 0 ? "rgba(34,211,238,0.3)" : "rgba(129,140,248,0.2)" }}
            animate={{
              y: [0, -100, 0],
              opacity: [0, 0.6, 0],
            }}
            transition={{
              duration: 4 + i * 1.5,
              repeat: Infinity,
              delay: i * 0.8,
              ease: "easeInOut",
            }}
            initial={{
              left: `${15 + i * 14}%`,
              top: `${60 + (i % 3) * 12}%`,
            }}
          />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-10 w-full max-w-[420px] px-6"
      >
        {/* Logo / Brand */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.6 }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-5 relative" style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.12), rgba(129,140,248,0.08))", border: "1px solid rgba(34,211,238,0.15)" }}>
            <Shield className="w-8 h-8" style={{ color: "#22d3ee" }} />
            <div className="absolute inset-0 rounded-2xl" style={{ boxShadow: "0 0 40px rgba(34,211,238,0.08)" }} />
          </div>
          <h1 className="text-2xl font-bold tracking-[0.15em] uppercase" style={{ color: "#f1f5f9" }}>
            KSP Sentinel
          </h1>
          <p className="text-xs mt-2 tracking-widest uppercase" style={{ color: "#5a657a" }}>
            Crime Intelligence Platform
          </p>
          <div className="inline-flex items-center gap-1.5 mt-3 px-3 py-1 rounded-full text-[10px] font-medium tracking-wider uppercase" style={{ background: "rgba(251,191,36,0.08)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.15)" }}>
            <span className="w-1.5 h-1.5 rounded-full status-pulse" style={{ backgroundColor: "#fbbf24" }} />
            Demo Mode — Synthetic Data
          </div>
        </motion.div>

        {/* Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="relative rounded-2xl p-8 border-glow"
          style={{ backgroundColor: "rgba(15, 21, 36, 0.6)", backdropFilter: "blur(32px)" }}
        >
          {/* Subtle top glow line */}
          <div className="absolute top-0 left-8 right-8 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(34,211,238,0.2), transparent)" }} />

          <h2 className="text-base font-semibold text-center mb-6" style={{ color: "#f1f5f9" }}>
            Authenticate
          </h2>

          <div className="space-y-5">
            {/* Username */}
            <div className="space-y-2">
              <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#5a657a" }}>
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#3d4659" }} />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter username"
                  autoFocus
                  className="w-full h-11 pl-11 pr-4 rounded-xl text-sm outline-none transition-all duration-200 placeholder:text-[#3d4659]"
                  style={{ backgroundColor: "rgba(10, 15, 28, 0.8)", border: "1px solid rgba(255,255,255,0.06)", color: "#f1f5f9" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(34,211,238,0.3)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(34,211,238,0.06)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.boxShadow = "none"; }}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label className="text-[11px] font-medium uppercase tracking-wider" style={{ color: "#5a657a" }}>
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "#3d4659" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter password"
                  className="w-full h-11 pl-11 pr-12 rounded-xl text-sm outline-none transition-all duration-200 placeholder:text-[#3d4659]"
                  style={{ backgroundColor: "rgba(10, 15, 28, 0.8)", border: "1px solid rgba(255,255,255,0.06)", color: "#f1f5f9" }}
                  onFocus={(e) => { e.currentTarget.style.borderColor = "rgba(34,211,238,0.3)"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(34,211,238,0.06)"; }}
                  onBlur={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.boxShadow = "none"; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
                  style={{ color: "#3d4659" }}
                  onMouseEnter={(e) => { e.currentTarget.style.color = "#8b97b0"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.color = "#3d4659"; }}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="text-xs text-center"
                  style={{ color: "#f87171" }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>

            {/* Submit */}
            <motion.button
              onClick={handleLogin}
              disabled={isLoading}
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              className="w-full h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #22d3ee, #06b6d4)", color: "#050810", boxShadow: isLoading ? "none" : "0 0 24px rgba(34,211,238,0.2)" }}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-[#050810]/30 border-t-[#050810] rounded-full animate-spin" />
              ) : (
                <>
                  Sign In
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </div>

          {/* Demo credentials */}
          <div className="mt-6 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
            <p className="text-[10px] text-center tracking-wide" style={{ color: "#3d4659" }}>
              Demo: <span style={{ color: "#5a657a" }}>investigator</span> / <span style={{ color: "#5a657a" }}>analyst</span> / <span style={{ color: "#5a657a" }}>admin</span> — ksp123
            </p>
          </div>
        </motion.div>

        {/* Bottom branding */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-center text-[10px] mt-6 tracking-wider uppercase"
          style={{ color: "#3d4659" }}
        >
          Karnataka State Police — Confidential
        </motion.p>
      </motion.div>
    </div>
  );
}