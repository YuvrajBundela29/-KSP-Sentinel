"use client";

import { motion } from "framer-motion";
import { Shield } from "lucide-react";

export default function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="relative">
        <motion.div
          className="w-10 h-10 rounded-full"
          style={{ border: "2px solid rgba(34,211,238,0.12)", borderTopColor: "#22d3ee" }}
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
        <Shield className="absolute inset-0 m-auto w-4 h-4" style={{ color: "#22d3ee", opacity: 0.5 }} />
      </div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="text-xs tracking-wide"
        style={{ color: "#5a657a" }}
      >
        {message}
      </motion.p>
    </div>
  );
}