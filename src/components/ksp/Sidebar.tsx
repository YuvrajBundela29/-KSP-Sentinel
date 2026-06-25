"use client";

import { useAppStore } from "@/lib/store";
import {
  LayoutDashboard,
  Bot,
  Network,
  MapPin,
  LogOut,
  Shield,
} from "lucide-react";

const LABELS: Record<string, Record<string, string>> = {
  en: {
    dashboard: "Dashboard",
    chat: "AI Copilot",
    network: "Network Graph",
    map: "Crime Map",
    logout: "Logout",
  },
  kn: {
    dashboard: "ಮುಖಪುಟ",
    chat: "AI ಸಹಾಯಕ",
    network: "ನೆಟ್‌ವರ್ಕ್ ಗ್ರಾಫ್",
    map: "ಅಪರಾಧ ನಕ್ಷೆ",
    logout: "ಲಾಗ್ ಔಟ್",
  },
};

const NAV_ITEMS = [
  { key: "dashboard", icon: LayoutDashboard, view: "dashboard" as const },
  { key: "chat", icon: Bot, view: "chat" as const },
  { key: "network", icon: Network, view: "network" as const },
  { key: "map", icon: MapPin, view: "map" as const },
];

export default function Sidebar() {
  const user = useAppStore((s) => s.user);
  const currentView = useAppStore((s) => s.currentView);
  const lang = useAppStore((s) => s.lang);
  const setView = useAppStore((s) => s.setView);
  const logout = useAppStore((s) => s.logout);
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