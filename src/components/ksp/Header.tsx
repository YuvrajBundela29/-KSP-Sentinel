"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { Languages, Bell, X, Check, Wifi, Activity, ChevronDown } from "lucide-react";
import { LANGUAGES, getLabel, type LangCode } from "@/lib/translations";

export default function Header() {
  const currentView = useAppStore((s) => s.currentView);
  const lang = useAppStore((s) => s.lang);
  const setLang = useAppStore((s) => s.setLang);
  const notifications = useAppStore((s) => s.notifications);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const user = useAppStore((s) => s.user);
  const [clock, setClock] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);
  const langRef = useRef<HTMLDivElement>(null);

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
      if (langRef.current && !langRef.current.contains(e.target as Node)) {
        setLangOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const viewTitle = getLabel(lang, currentView);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const isDM = currentView.startsWith("dm-");
  const currentLangInfo = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];

  const formatTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return getLabel(lang, "justNow");
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  const breadcrumbs = isDM
    ? [{ label: getLabel(lang, "dataMgmt"), view: "dm-dashboard" as const }, { label: viewTitle }]
    : [{ label: viewTitle }];

  return (
    <header
      className="h-12 flex items-center justify-between px-5 sticky top-0 z-30 border-b flex-shrink-0"
      style={{
        background: "var(--bg-elevated-1)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid var(--border-subtle)",
      }}
    >
      {/* Left: Breadcrumbs */}
      <div className="flex items-center gap-2 lg:pl-0 pl-10 min-w-0">
        {breadcrumbs.map((crumb, i) => (
          <div key={i} className="flex items-center gap-2 min-w-0">
            {i > 0 && (
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>/</span>
            )}
            <h1 className="text-[13px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
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
            <span className="text-[10px] font-medium" style={{ color: "#34d399" }}>{getLabel(lang, "online")}</span>
          </div>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>|</span>
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3" style={{ color: "#22d3ee" }} />
            <span className="text-[10px] font-mono" style={{ color: "var(--text-tertiary)" }}>{clock}</span>
          </div>
        </div>

        {/* Language Dropdown */}
        <div className="relative" ref={langRef}>
          <button
            onClick={() => { setLangOpen(!langOpen); setNotifOpen(false); }}
            className="flex items-center justify-center gap-1 w-8 h-8 rounded-lg cursor-pointer transition-all duration-200"
            style={{ color: langOpen ? "var(--text-primary)" : "var(--text-tertiary)" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "var(--border-subtle)"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { if (!langOpen) e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
            title={currentLangInfo.label}
          >
            <Languages className="w-3.5 h-3.5" />
          </button>

          <AnimatePresence>
            {langOpen && (
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={{ duration: 0.15 }}
                className="absolute right-0 top-11 w-56 max-w-[calc(100vw-2rem)] rounded-xl overflow-hidden border-glow"
                style={{
                  background: "var(--bg-card)",
                  backdropFilter: "blur(32px)",
                  boxShadow: "0 24px 48px -8px rgba(0,0,0,0.5), 0 0 0 1px var(--border-subtle)",
                  zIndex: 100,
                }}
              >
                <div className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{getLabel(lang, "language")}</span>
                </div>
                <div className="max-h-72 overflow-y-auto py-1">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      onClick={() => { setLang(l.code); setLangOpen(false); }}
                      className="w-full flex items-center justify-between px-3 py-2 text-left cursor-pointer transition-colors"
                      style={{
                        background: lang === l.code ? "rgba(34,211,238,0.06)" : "transparent",
                      }}
                      onMouseEnter={(e) => { if (lang !== l.code) e.currentTarget.style.background = "var(--border-subtle)"; }}
                      onMouseLeave={(e) => { if (lang !== l.code) e.currentTarget.style.background = "transparent"; }}
                    >
                      <span className="text-xs font-medium" style={{ color: lang === l.code ? "var(--text-primary)" : "var(--text-secondary)" }}>
                        {l.label}
                      </span>
                      <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                        {l.labelEn}
                      </span>
                    </button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Notification Bell */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => { setNotifOpen(!notifOpen); setLangOpen(false); }}
            className="flex items-center justify-center w-8 h-8 rounded-lg cursor-pointer transition-all duration-200 relative"
            style={{ color: notifOpen ? "var(--text-primary)" : "var(--text-tertiary)" }}
            onMouseEnter={(e) => { if (!notifOpen) e.currentTarget.style.background = "var(--border-subtle)"; e.currentTarget.style.color = "var(--text-primary)"; }}
            onMouseLeave={(e) => { if (!notifOpen) e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "var(--text-tertiary)"; }}
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
                className="absolute right-0 top-11 w-80 max-w-[calc(100vw-2rem)] rounded-xl overflow-hidden border-glow"
                style={{
                  background: "var(--bg-card)",
                  backdropFilter: "blur(32px)",
                  boxShadow: "0 24px 48px -8px rgba(0,0,0,0.5), 0 0 0 1px var(--border-subtle)",
                  zIndex: 100,
                }}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                  <span className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{getLabel(lang, "notifications")}</span>
                  {notifications.some((n) => !n.read) && (
                    <button
                      onClick={() => notifications.forEach((n) => markNotificationRead(n.id))}
                      className="flex items-center gap-1 text-[10px] cursor-pointer transition-colors"
                      style={{ color: "#22d3ee" }}
                    >
                      <Check className="w-3 h-3" /> {getLabel(lang, "markAllRead")}
                    </button>
                  )}
                </div>

                {/* List */}
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center">
                      <Bell className="w-5 h-5 mx-auto mb-2" style={{ color: "var(--text-muted)" }} />
                      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>{getLabel(lang, "noNotifications")}</p>
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
                          borderBottom: "1px solid var(--border-subtle)",
                          background: !n.read ? "rgba(34,211,238,0.02)" : "transparent",
                        }}
                      >
                        <div className="flex items-start gap-2.5">
                          <div className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: NOTIF_COLORS[n.type] || "#5a657a" }} />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate" style={{ color: "var(--text-primary)" }}>{n.title}</p>
                            <p className="text-[11px] mt-0.5 line-clamp-2" style={{ color: "var(--text-tertiary)" }}>{n.message}</p>
                            <p className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>{formatTime(n.timestamp)}</p>
                          </div>
                          {!n.read && (
                            <button
                              onClick={(e) => { e.stopPropagation(); markNotificationRead(n.id); }}
                              className="cursor-pointer transition-colors flex-shrink-0"
                              style={{ color: "var(--text-muted)" }}
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

const NOTIF_COLORS: Record<string, string> = {
  info: "#22d3ee",
  warning: "#fbbf24",
  error: "#f87171",
  success: "#34d399",
};