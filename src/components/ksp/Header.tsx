"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { Languages, Bell, X, Check, Wifi, Activity } from "lucide-react";

const VIEW_LABELS: Record<string, Record<string, string>> = {
  en: {
    dashboard: "Mission Control",
    chat: "AI Copilot",
    network: "Network Graph",
    map: "Crime Map",
    accused: "Accused Profile",
    timeline: "Investigation Timeline",
    report: "Report Generator",
    "dm-dashboard": "Data Management",
    "dm-fir": "FIR Management",
    "dm-evidence": "Evidence Management",
    "dm-criminals": "Criminals",
    "dm-victims": "Victims",
    "dm-vehicles": "Vehicles",
    "dm-financial": "Financial Records",
    "dm-import": "Import Center",
    "dm-audit": "Audit Logs",
    "dm-ai-queue": "AI Processing Queue",
    "dm-settings": "Settings",
    "dm-sociological": "Sociological Insights",
    "dm-forecasting": "Crime Forecasting",
    "dm-financial-network": "Financial Network",
  },
  kn: {
    dashboard: "ಮಿಷನ್ ಕಂಟ್ರೋಲ್",
    chat: "AI ಸಹಾಯಕ",
    network: "ನೆಟ್‌ವರ್ಕ್ ಗ್ರಾಫ್",
    map: "ಅಪರಾಧ ನಕ್ಷೆ",
    accused: "ಆರೋಪಿತ ಪ್ರೊಫೈಲ್",
    timeline: "ತನಿಖೆ ಟೈಮ್‌ಲೈನ್",
    report: "ವರದಿ ಜನರೇಟರ್",
    "dm-dashboard": "ದತ್ತಾಂಶ ನಿರ್ವಹಣೆ",
    "dm-fir": "ಎಫ್‌ಐಆರ್ ನಿರ್ವಹಣೆ",
    "dm-evidence": "ಪುರಾವೆ ನಿರ್ವಹಣೆ",
    "dm-criminals": "ಅಪರಾಧಿಗಳು",
    "dm-victims": "ಬಲಿಪಂಜುಗಳು",
    "dm-vehicles": "ವಾಹನಗಳು",
    "dm-financial": "ಹಣಕಾಸು ದಾಖಲೆಗಳು",
    "dm-import": "ಆಮದು ಕೇಂದ್ರ",
    "dm-audit": "ಆಡಿಟ್ ಲಾಗ್‌ಗಳು",
    "dm-ai-queue": "AI ಪ್ರಕ್ರಿಯೆ",
    "dm-settings": "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    "dm-sociological": "ಸಾಮಾಜಿಕ ಒಳನೋಟ",
    "dm-forecasting": "ಅಪರಾಧ ಮುನ್ಸೂಚನೆ",
    "dm-financial-network": "ಹಣಕಾಸು ನೆಟ್‌ವರ್ಕ್",
  },
};

const NOTIF_COLORS: Record<string, string> = {
  info: "#22d3ee",
  warning: "#fbbf24",
  error: "#f87171",
  success: "#34d399",
};

export default function Header() {
  const currentView = useAppStore((s) => s.currentView);
  const lang = useAppStore((s) => s.lang);
  const toggleLang = useAppStore((s) => s.toggleLang);
  const notifications = useAppStore((s) => s.notifications);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const user = useAppStore((s) => s.user);
  const [clock, setClock] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      setClock(
        new Date().toLocaleString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        })
      );
    };
    update();
    const iv = setInterval(update, 1000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const labels = VIEW_LABELS[lang];
  const viewTitle = labels[currentView] || currentView;
  const unreadCount = notifications.filter((n) => !n.read).length;
  const isDM = currentView.startsWith("dm-");

  const formatTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  // Breadcrumb segments
  const breadcrumbs = isDM
    ? [{ label: "Data Management", view: "dm-dashboard" as const }, { label: viewTitle }]
    : [{ label: viewTitle }];

  return (
    <header
      className="h-12 flex items-center justify-between px-5 sticky top-0 z-30 border-b flex-shrink-0"
      style={{
        background: "rgba(5,8,16,0.8)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.04)",
      }}
    >
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-2 lg:pl-0 pl-10 min-w-0">
        {breadcrumbs.map((crumb, i) => (
          <div key={i} className="flex items-center gap-2 min-w-0">
            {i > 0 && (
              <span className="text-[10px]" style={{ color: "#3d4659" }}>/</span>
            )}
            <h1 className="text-[13px] font-semibold truncate" style={{ color: "#f1f5f9" }}>
              {crumb.label}
            </h1>
          </div>
        ))}
        {isDM && (
          <span className="hidden sm:inline-flex items-center text-[9px] px-2 py-0.5 rounded-full font-semibold tracking-wider uppercase flex-shrink-0"
            style={{ background: "rgba(129,140,248,0.08)", color: "#818cf8", border: "1px solid rgba(129,140,248,0.12)" }}>
            Data Mgmt
          </span>
        )}
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-1.5">
        {/* System Status */}
        <div className="hidden md:flex items-center gap-2 mr-2 px-2.5 py-1 rounded-lg" style={{ background: "rgba(52,211,153,0.05)" }}>
          <div className="flex items-center gap-1">
            <Wifi className="w-3 h-3" style={{ color: "#34d399" }} />
            <span className="text-[10px] font-medium" style={{ color: "#34d399" }}>Online</span>
          </div>
          <span className="text-[10px]" style={{ color: "#3d4659" }}>|</span>
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3" style={{ color: "#22d3ee" }} />
            <span className="text-[10px] font-mono" style={{ color: "#5a657a" }}>{clock}</span>
          </div>
        </div>

        {/* Language Toggle */}
        <button
          onClick={toggleLang}
          className="flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer transition-all duration-200"
          style={{ color: "#5a657a" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#c8d0e0"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#5a657a"; }}
          title={lang === "en" ? "Switch to Kannada" : "Switch to English"}
        >
          <Languages className="w-3.5 h-3.5" />
        </button>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer transition-all duration-200 relative"
            style={{ color: notifOpen ? "#c8d0e0" : "#5a657a" }}
            onMouseEnter={(e) => { if (!notifOpen) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#c8d0e0"; }}
            onMouseLeave={(e) => { if (!notifOpen) e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#5a657a"; }}
          >
            <Bell className="w-3.5 h-3.5" />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold"
                style={{ background: "#f87171", color: "#050810" }}
              >
                {unreadCount}
              </motion.span>
            )}
          </button>

          <AnimatePresence>
            {notifOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-11 w-80 rounded-xl overflow-hidden border-glow"
                style={{
                  background: "rgba(15,21,36,0.95)",
                  backdropFilter: "blur(32px)",
                  boxShadow: "0 24px 48px -8px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
                  zIndex: 100,
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                  <span className="text-xs font-semibold" style={{ color: "#f1f5f9" }}>Notifications</span>
                  {notifications.some((n) => !n.read) && (
                    <button
                      onClick={() => notifications.forEach((n) => markNotificationRead(n.id))}
                      className="flex items-center gap-1 text-[10px] cursor-pointer transition-colors"
                      style={{ color: "#22d3ee" }}
                    >
                      <Check className="w-3 h-3" /> Mark all read
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <Bell className="w-5 h-5 mx-auto mb-2" style={{ color: "#3d4659" }} />
                      <p className="text-[11px]" style={{ color: "#3d4659" }}>No notifications</p>
                    </div>
                  ) : (
                    notifications.slice(0, 10).map((n) => (
                      <motion.div
                        key={n.id}
                        initial={false}
                        whileHover={{ background: "rgba(255,255,255,0.02)" }}
                        onClick={() => markNotificationRead(n.id)}
                        className="px-4 py-3 cursor-pointer transition-colors"
                        style={{
                          borderBottom: "1px solid rgba(255,255,255,0.03)",
                          background: !n.read ? "rgba(34,211,238,0.02)" : "transparent",
                        }}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: NOTIF_COLORS[n.type] || "#5a657a" }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: "#c8d0e0" }}>{n.title}</p>
                            <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: "#5a657a" }}>{n.message}</p>
                            <p className="text-[10px] mt-1" style={{ color: "#3d4659" }}>{formatTime(n.timestamp)}</p>
                          </div>
                          {!n.read && (
                            <button
                              onClick={(e) => { e.stopPropagation(); markNotificationRead(n.id); }}
                              className="cursor-pointer transition-colors flex-shrink-0"
                              style={{ color: "#3d4659" }}
                            >
                              <X className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </motion.div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* User Avatar */}
        {user && (
          <div className="hidden sm:flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer transition-all duration-200"
            style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.12), rgba(129,140,248,0.08))", border: "1px solid rgba(34,211,238,0.1)" }}
            title={`${user.username} (${user.role})`}
          >
            <span className="text-[10px] font-bold" style={{ color: "#22d3ee" }}>
              {user.username.slice(0, 2).toUpperCase()}
            </span>
          </div>
        )}
      </div>
    </header>
  );
}