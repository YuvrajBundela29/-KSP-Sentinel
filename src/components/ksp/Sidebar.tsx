"use client";

import { useAppStore } from "@/lib/store";
import {
  LayoutDashboard,
  Bot,
  Network,
  MapPin,
  LogOut,
  Shield,
  Clock,
  FileText,
} from "lucide-react";

const LABELS: Record<string, Record<string, string>> = {
  en: {
    dashboard: "Mission Control",
    chat: "AI Copilot",
    network: "Network Graph",
    map: "Crime Map",
    timeline: "Timeline",
    report: "Reports",
    logout: "Logout",
  },
  kn: {
    dashboard: "ಮಿಷನ್ ಕಂಟ್ರೋಲ್",
    chat: "AI ಸಹಾಯಕ",
    network: "ನೆಟ್‌ವರ್ಕ್ ಗ್ರಾಫ್",
    map: "ಅಪರಾಧ ನಕ್ಷೆ",
    timeline: "ಟೈಮ್‌ಲೈನ್",
    report: "ವರದಿಗಳು",
    logout: "ಲಾಗ್ ಔಟ್",
  },
};

const NAV_ITEMS = [
  { key: "dashboard", icon: LayoutDashboard, view: "dashboard" as const },
  { key: "chat", icon: Bot, view: "chat" as const },
  { key: "network", icon: Network, view: "network" as const },
  { key: "map", icon: MapPin, view: "map" as const },
  { key: "timeline", icon: Clock, view: "timeline" as const },
  { key: "report", icon: FileText, view: "report" as const },
];

export default function Sidebar() {
  const user = useAppStore((s) => s.user);
  const currentView = useAppStore((s) => s.currentView);
  const lang = useAppStore((s) => s.lang);
  const setView = useAppStore((s) => s.setView);
  const logout = useAppStore((s) => s.logout);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const labels = LABELS[lang];

  return (
    <aside className="w-64 min-h-screen bg-[#0d1326] border-r border-[#2a3550] flex flex-col">
      {/* Logo */}
      <div className="p-4 border-b border-[#2a3550]">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-500" />
          <span className="text-blue-500 font-bold text-sm tracking-wide">
            KSP SENTINEL
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.key}
              onClick={() => setView(item.view)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                isActive
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                  : "text-[#94a3b8] hover:bg-[#1a2035] hover:text-[#e2e8f0]"
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span>{labels[item.key]}</span>
            </button>
          );
        })}
      </nav>

      {/* User info and logout */}
      <div className="p-4 border-t border-[#2a3550]">
        {user && (
          <div className="mb-3">
            <p className="text-sm font-medium text-[#e2e8f0]">
              {user.username}
            </p>
            <p className="text-xs text-[#4a5568]">{user.role}</p>
          </div>
        )}
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#64748b] hover:bg-[#1a2035] hover:text-[#94a3b8] transition-colors mb-2 border border-dashed border-[#2a3550]"
        >
          <kbd className="font-mono text-[10px] bg-[#2a3550] px-1 rounded">Ctrl+K</kbd>
          <span>Command Palette</span>
        </button>
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>{labels.logout}</span>
        </button>
      </div>
    </aside>
  );
}