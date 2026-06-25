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
  Database,
  ChevronDown,
  ChevronRight,
  Sheet,
  Fingerprint,
  Users,
  Car,
  Landmark,
  Upload,
  ScrollText,
  Cpu,
  Settings,
  X,
} from "lucide-react";
import { useState } from "react";
import type { ViewType } from "@/lib/types";

const LABELS: Record<string, Record<string, string>> = {
  en: {
    dashboard: "Mission Control",
    chat: "AI Copilot",
    network: "Network Graph",
    map: "Crime Map",
    timeline: "Timeline",
    report: "Reports",
    logout: "Logout",
    dataMgmt: "Data Management",
    dmDashboard: "Dashboard",
    dmFir: "FIR Management",
    dmEvidence: "Evidence",
    dmCriminals: "Criminals",
    dmVictims: "Victims",
    dmVehicles: "Vehicles",
    dmFinancial: "Financial Records",
    dmImport: "Import Center",
    dmAudit: "Audit Logs",
    dmAiQueue: "AI Processing",
    dmSettings: "Settings",
  },
  kn: {
    dashboard: "ಮಿಷನ್ ಕಂಟ್ರೋಲ್",
    chat: "AI ಸಹಾಯಕ",
    network: "ನೆಟ್‌ವರ್ಕ್ ಗ್ರಾಫ್",
    map: "ಅಪರಾಧ ನಕ್ಷೆ",
    timeline: "ಟೈಮ್‌ಲೈನ್",
    report: "ವರದಿಗಳು",
    logout: "ಲಾಗ್ ಔಟ್",
    dataMgmt: "ದತ್ತಾಂಶ ನಿರ್ವಹಣೆ",
    dmDashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    dmFir: "ಎಫ್‌ಐಆರ್ ನಿರ್ವಹಣೆ",
    dmEvidence: "ಪುರಾವೆ",
    dmCriminals: "ಅಪರಾಧಿಗಳು",
    dmVictims: "ಬಲಿಪಂಜುಗಳು",
    dmVehicles: "ವಾಹನಗಳು",
    dmFinancial: "ಹಣಕಾಸು ದಾಖಲೆಗಳು",
    dmImport: "ಆಮದು ಕೇಂದ್ರ",
    dmAudit: "ಆಡಿಟ್ ಲಾಗ್‌ಗಳು",
    dmAiQueue: "AI ಪ್ರಕ್ರಿಯೆ",
    dmSettings: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
  },
};

const NAV_ITEMS = [
  { key: "dashboard", icon: LayoutDashboard, view: "dashboard" as ViewType },
  { key: "chat", icon: Bot, view: "chat" as ViewType },
  { key: "network", icon: Network, view: "network" as ViewType },
  { key: "map", icon: MapPin, view: "map" as ViewType },
  { key: "timeline", icon: Clock, view: "timeline" as ViewType },
  { key: "report", icon: FileText, view: "report" as ViewType },
];

const DM_ITEMS = [
  { key: "dmDashboard", icon: LayoutDashboard, view: "dm-dashboard" as ViewType },
  { key: "dmFir", icon: Sheet, view: "dm-fir" as ViewType },
  { key: "dmEvidence", icon: Fingerprint, view: "dm-evidence" as ViewType },
  { key: "dmCriminals", icon: Users, view: "dm-criminals" as ViewType },
  { key: "dmVictims", icon: Users, view: "dm-victims" as ViewType },
  { key: "dmVehicles", icon: Car, view: "dm-vehicles" as ViewType },
  { key: "dmFinancial", icon: Landmark, view: "dm-financial" as ViewType },
  { key: "dmImport", icon: Upload, view: "dm-import" as ViewType },
  { key: "dmAudit", icon: ScrollText, view: "dm-audit" as ViewType },
  { key: "dmAiQueue", icon: Cpu, view: "dm-ai-queue" as ViewType },
  { key: "dmSettings", icon: Settings, view: "dm-settings" as ViewType },
];

export default function Sidebar() {
  const user = useAppStore((s) => s.user);
  const currentView = useAppStore((s) => s.currentView);
  const lang = useAppStore((s) => s.lang);
  const setView = useAppStore((s) => s.setView);
  const logout = useAppStore((s) => s.logout);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed);
  const setSidebarCollapsed = useAppStore((s) => s.setSidebarCollapsed);
  const notifications = useAppStore((s) => s.notifications);
  const [dmOpen, setDmOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const labels = LABELS[lang];

  const isDMView = currentView.startsWith("dm-");
  const unreadCount = notifications.filter((n) => !n.read).length;

  const navContent = (
    <>
      {/* Logo */}
      <div className="p-4 border-b border-[#2a3550] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-6 h-6 text-blue-500 flex-shrink-0" />
          {!sidebarCollapsed && (
            <span className="text-blue-500 font-bold text-sm tracking-wide">
              KSP SENTINEL
            </span>
          )}
        </div>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex items-center justify-center w-6 h-6 rounded hover:bg-[#1a2035] text-[#4a5568] hover:text-[#94a3b8] transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight className="w-3 h-3" /> : <ChevronDown className="w-3 h-3 rotate-[-90deg]" />}
        </button>
        <button onClick={() => setMobileOpen(false)} className="lg:hidden text-[#4a5568]">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {!sidebarCollapsed && (
          <p className="text-[10px] uppercase tracking-widest text-[#4a5568] px-3 py-1 font-semibold">
            {lang === "en" ? "Intelligence" : "ಗುಪ್ತಚರ"}
          </p>
        )}
        {NAV_ITEMS.map((item) => {
          const isActive = currentView === item.view;
          return (
            <button
              key={item.key}
              onClick={() => {
                setView(item.view);
                setMobileOpen(false);
              }}
              title={sidebarCollapsed ? labels[item.key] : undefined}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group ${
                isActive
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-500/5"
                  : "text-[#94a3b8] hover:bg-[#1a2035] hover:text-[#e2e8f0]"
              }`}
            >
              <item.icon className={`w-5 h-5 flex-shrink-0 ${isActive ? "text-blue-400" : "text-[#64748b] group-hover:text-[#94a3b8]"}`} />
              {!sidebarCollapsed && <span>{labels[item.key]}</span>}
            </button>
          );
        })}

        {/* Separator */}
        <div className="pt-2 pb-1">
          <div className="border-t border-[#2a3550]/50" />
        </div>

        {/* Data Management Section */}
        {!sidebarCollapsed && (
          <button
            onClick={() => setDmOpen(!dmOpen)}
            className="w-full flex items-center gap-3 px-3 py-1.5 text-[10px] uppercase tracking-widest text-[#4a5568] font-semibold hover:text-[#94a3b8] transition-colors"
          >
            <Database className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">{labels.dataMgmt}</span>
            {dmOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
          </button>
        )}

        {(dmOpen || sidebarCollapsed) && (
          <div className="space-y-0.5">
            {DM_ITEMS.map((item) => {
              const isActive = currentView === item.view;
              return (
                <button
                  key={item.key}
                  onClick={() => {
                    setView(item.view);
                    setMobileOpen(false);
                  }}
                  title={sidebarCollapsed ? labels[item.key] : undefined}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] transition-all duration-200 group ${
                    isActive
                      ? "bg-emerald-600/15 text-emerald-400 border border-emerald-500/30 shadow-lg shadow-emerald-500/5"
                      : "text-[#94a3b8] hover:bg-[#1a2035] hover:text-[#e2e8f0]"
                  }`}
                >
                  <item.icon className={`w-4 h-4 flex-shrink-0 ${isActive ? "text-emerald-400" : "text-[#64748b] group-hover:text-[#94a3b8]"}`} />
                  {!sidebarCollapsed && <span>{labels[item.key]}</span>}
                </button>
              );
            })}
          </div>
        )}
      </nav>

      {/* User info and logout */}
      <div className="p-4 border-t border-[#2a3550]">
        {user && !sidebarCollapsed && (
          <div className="mb-3">
            <p className="text-sm font-medium text-[#e2e8f0] truncate">{user.username}</p>
            <p className="text-xs text-[#4a5568] capitalize">{user.role.replace(/_/g, " ")}</p>
          </div>
        )}
        {!sidebarCollapsed && (
          <button
            onClick={() => setCommandPaletteOpen(true)}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-[#64748b] hover:bg-[#1a2035] hover:text-[#94a3b8] transition-colors mb-2 border border-dashed border-[#2a3550]"
          >
            <kbd className="font-mono text-[10px] bg-[#2a3550] px-1 rounded">Ctrl+K</kbd>
            <span>Command Palette</span>
          </button>
        )}
        <button
          onClick={logout}
          className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors ${sidebarCollapsed ? "justify-center" : ""}`}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!sidebarCollapsed && <span>{labels.logout}</span>}
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 lg:hidden bg-[#0d1326] border border-[#2a3550] rounded-lg p-2 text-[#94a3b8]"
      >
        <Shield className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Desktop sidebar */}
      <aside
        className={`hidden lg:flex flex-col min-h-screen bg-[#0d1326] border-r border-[#2a3550] transition-all duration-300 ${
          sidebarCollapsed ? "w-16" : "w-64"
        }`}
      >
        {navContent}
      </aside>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <aside className="fixed inset-y-0 left-0 z-50 w-72 bg-[#0d1326] border-r border-[#2a3550] flex flex-col lg:hidden">
          {navContent}
        </aside>
      )}
    </>
  );
}