"use client";

import { useEffect, useState, useRef } from "react";
import { useAppStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Languages, Bell, X, Check } from "lucide-react";

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
  },
};

const NOTIF_COLORS: Record<string, string> = {
  info: "bg-blue-500",
  warning: "bg-amber-500",
  error: "bg-red-500",
  success: "bg-emerald-500",
};

export default function Header() {
  const currentView = useAppStore((s) => s.currentView);
  const lang = useAppStore((s) => s.lang);
  const toggleLang = useAppStore((s) => s.toggleLang);
  const notifications = useAppStore((s) => s.notifications);
  const markNotificationRead = useAppStore((s) => s.markNotificationRead);
  const [clock, setClock] = useState("");
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => {
      setClock(
        new Date().toLocaleString("en-IN", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
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

  const formatTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    if (diff < 60000) return "Just now";
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  };

  return (
    <header className="h-14 bg-[#0d1326]/80 backdrop-blur-xl border-b border-[#2a3550] flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-3 lg:pl-0 pl-10">
        <h1 className="text-lg font-semibold text-[#e2e8f0]">{viewTitle}</h1>
        {currentView.startsWith("dm-") && (
          <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded-full font-medium border border-emerald-500/30">
            DATA MGMT
          </span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-xs text-[#94a3b8] hidden md:block font-mono">{clock}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleLang}
          className="text-[#94a3b8] hover:text-blue-400 hover:bg-blue-500/10"
        >
          <Languages className="w-4 h-4 mr-1" />
          <span className="hidden sm:inline">{lang === "en" ? "ಕನ್ನಡ" : "English"}</span>
        </Button>
        <div className="relative" ref={notifRef}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setNotifOpen(!notifOpen)}
            className="text-[#94a3b8] hover:text-blue-400 hover:bg-blue-500/10 relative"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold">
                {unreadCount}
              </span>
            )}
          </Button>
          {notifOpen && (
            <div className="absolute right-0 top-12 w-80 bg-[#0d1326] border border-[#2a3550] rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a3550]">
                <span className="text-sm font-semibold text-[#e2e8f0]">Notifications</span>
                <button
                  onClick={() => notifications.forEach((n) => markNotificationRead(n.id))}
                  className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                  <Check className="w-3 h-3" /> Mark all read
                </button>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#4a5568]">No notifications</div>
                ) : (
                  notifications.slice(0, 10).map((n) => (
                    <div
                      key={n.id}
                      onClick={() => markNotificationRead(n.id)}
                      className={`px-4 py-3 border-b border-[#2a3550]/50 hover:bg-[#1a2035] cursor-pointer transition-colors ${
                        !n.read ? "bg-blue-500/5" : ""
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${NOTIF_COLORS[n.type]}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#e2e8f0] truncate">{n.title}</p>
                          <p className="text-[11px] text-[#64748b] mt-0.5 line-clamp-2">{n.message}</p>
                          <p className="text-[10px] text-[#4a5568] mt-1">{formatTime(n.timestamp)}</p>
                        </div>
                        {!n.read && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              markNotificationRead(n.id);
                            }}
                            className="text-[#4a5568] hover:text-[#94a3b8] flex-shrink-0"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}