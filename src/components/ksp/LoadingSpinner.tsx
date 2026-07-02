"use client";

import { motion } from "framer-motion";

export default function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div
        className="scanning-loader w-48 h-28 rounded-lg border flex items-end justify-center pb-2"
        style={{
          borderColor: "rgba(0, 255, 102, 0.15)",
          background: "var(--card, #0D1117)",
        }}
      >
        {/* Faux terminal lines for visual texture */}
        <div className="w-full px-3 space-y-1.5 pt-3 opacity-30">
          <div className="h-[2px] w-3/4 rounded" style={{ background: "rgba(0, 255, 102, 0.2)" }} />
          <div className="h-[2px] w-1/2 rounded" style={{ background: "rgba(0, 255, 102, 0.15)" }} />
          <div className="h-[2px] w-2/3 rounded" style={{ background: "rgba(0, 255, 102, 0.1)" }} />
          <div className="h-[2px] w-1/3 rounded" style={{ background: "rgba(0, 255, 102, 0.08)" }} />
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <span className="bracket-badge" style={{ color: "var(--primary, #00FF66)" }}>
          SCANNING
        </span>
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xs font-mono tracking-wider"
        style={{ color: "var(--text-tertiary, #5a657a)" }}
      >
        {message}
      </motion.p>
    </div>
  );
}