"use client";

import { useAppStore } from "@/lib/store";
import { motion, AnimatePresence } from "framer-motion";
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
  BarChart3,
  TrendingUp,
  GitBranch,
  Command,
} from "lucide-react";
import { useState, memo } from "react";
import type { ViewType } from "@/lib/types";
import { canAccessView } from "@/lib/permissions";

const LABELS: Record<string, Record<string, string>> = {
  en: {
    dashboard: "Mission Control",
    chat: "AI Copilot",
    network: "Network Graph",
    map: "Crime Map",
    timeline: "Timeline",
    report: "Reports",
    logout: "Sign Out",
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
    dmSociological: "Sociological",
    dmForecasting: "Forecasting",
    dmFinancialNetwork: "Financial Network",
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
    dmSociological: "ಸಾಮಾಜಿಕ",
    dmForecasting: "ಮುನ್ಸೂಚನೆ",
    dmFinancialNetwork: "ಹಣಕಾಸು ನೆಟ್‌ವರ್ಕ್",
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
  { key: "dmSociological", icon: BarChart3, view: "dm-sociological" as ViewType },
  { key: "dmForecasting", icon: TrendingUp, view: "dm-forecasting" as ViewType },
  { key: "dmFinancialNetwork", icon: GitBranch, view: "dm-financial-network" as ViewType },
];

/* ── Sidebar Nav Item ──────────────────────────────────────────────── */
const NavItem = memo(function NavItem({
  item,
  isActive,
  labels,
  collapsed,
  isDM,
  onClick,
}: {
  item: { key: string; icon: React.ElementType; view: ViewType };
  isActive: boolean;
  labels: Record<string, string>;
  collapsed: boolean;
  isDM: boolean;
  onClick: () => void;
}) {
  const Icon = item.icon;
  const accentColor = isDM ? "#818cf8" : "#22d3ee";
  const glowColor = isDM ? "rgba(129,140,248,0.08)" : "rgba(34,211,238,0.08)";

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: collapsed ? 0 : 2 }}
      transition={{ duration: 0.15 }}
      title={collapsed ? labels[item.key] : undefined}
      className="w-full group relative flex items-center gap-3 rounded-lg text-[13px] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30"
      style={{
        padding: collapsed ? "10px" : "9px 12px",
        justifyContent: collapsed ? "center" : "flex-start",
        color: isActive ? accentColor : "#8b97b0",
        background: isActive ? glowColor : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "rgba(255,255,255,0.03)";
          e.currentTarget.style.color = "#c8d0e0";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "#8b97b0";
        }
      }}
    >
      {/* Active indicator */}
      {isActive && (
        <motion.div
          layoutId={isDM ? "dm-active" : "nav-active"}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full"
          style={{ backgroundColor: accentColor, boxShadow: `0 0 12px ${accentColor}60` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}

      {/* Hover glow */}
      {!isActive && (
        <div className="absolute inset-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
          style={{ boxShadow: `inset 0 0 24px ${glowColor}` }}
        />
      )}

      <Icon className="w-[18px] h-[18px] flex-shrink-0 transition-colors duration-200" />
      {!collapsed && (
        <motion.span
          initial={false}
          animate={{ opacity: collapsed ? 0 : 1 }}
          className="truncate font-medium"
          style={{ fontSize: "13px" }}
        >
          {labels[item.key]}
        </motion.span>
      )}
    </motion.button>
  );
});

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
  const [dmOpen, setDmOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const labels = LABELS[lang];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNav = (view: ViewType) => {
    setView(view);
    setMobileOpen(false);
  };

  const navContent = (
    <>
      {/* Logo */}
      <div className="flex items-center justify-between px-4 h-14" style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(34,211,238,0.05))", border: "1px solid rgba(34,211,238,0.12)" }}>
            <Shield className="w-4 h-4" style={{ color: "#22d3ee" }} />
          </div>
          <AnimatePresence>
            {!sidebarCollapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="overflow-hidden whitespace-nowrap"
              >
                <span className="text-xs font-bold tracking-[0.12em] uppercase" style={{ color: "#22d3ee" }}>
                  Sentinel
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md transition-colors cursor-pointer"
          style={{ color: "#3d4659" }}
          onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.color = "#8b97b0"; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#3d4659"; }}
        >
          <motion.div animate={{ rotate: sidebarCollapsed ? 0 : -90 }} transition={{ duration: 0.2 }}>
            <ChevronDown className="w-3.5 h-3.5" />
          </motion.div>
        </button>
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden flex items-center justify-center w-6 h-6 rounded-md cursor-pointer"
          style={{ color: "#3d4659" }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
        {/* Intelligence Section */}
        {!sidebarCollapsed && (
          <p className="text-[10px] uppercase tracking-[0.1em] font-semibold px-2.5 py-2" style={{ color: "#3d4659" }}>
            Intelligence
          </p>
        )}
        {NAV_ITEMS.map((item) => {
          const isActive = currentView === item.view;
          const accessible = canAccessView(user?.role || "demo_user", item.view);
          if (!accessible) return null;
          return (
            <NavItem
              key={item.key}
              item={item}
              isActive={isActive}
              labels={labels}
              collapsed={sidebarCollapsed}
              isDM={false}
              onClick={() => handleNav(item.view)}
            />
          );
        })}

        {/* Separator */}
        <div className="my-3" style={{ height: "1px", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)" }} />

        {/* Data Management Section */}
        {!sidebarCollapsed && (
          <button
            onClick={() => setDmOpen(!dmOpen)}
            className="w-full flex items-center gap-2.5 px-2.5 py-2 text-[10px] uppercase tracking-[0.1em] font-semibold transition-colors cursor-pointer rounded-md"
            style={{ color: "#3d4659" }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#5a657a"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#3d4659"; }}
          >
            <Database className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">{labels.dataMgmt}</span>
            <motion.div animate={{ rotate: dmOpen ? 0 : -90 }} transition={{ duration: 0.2 }}>
              <ChevronDown className="w-3 h-3" />
            </motion.div>
          </button>
        )}

        <AnimatePresence>
          {(dmOpen || sidebarCollapsed) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="space-y-0.5 overflow-hidden"
            >
              {DM_ITEMS.map((item) => {
                const isActive = currentView === item.view;
                const accessible = canAccessView(user?.role || "demo_user", item.view);
                if (!accessible) return null;
                return (
                  <NavItem
                    key={item.key}
                    item={item}
                    isActive={isActive}
                    labels={labels}
                    collapsed={sidebarCollapsed}
                    isDM={true}
                    onClick={() => handleNav(item.view)}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Bottom Section */}
      <div className="px-3 pb-3 space-y-1">
        {/* Command Palette Hint */}
        {!sidebarCollapsed && (
          <motion.button
            onClick={() => setCommandPaletteOpen(true)}
            whileHover={{ scale: 1.01 }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] cursor-pointer transition-colors"
            style={{ color: "#3d4659", border: "1px dashed rgba(255,255,255,0.06)" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.color = "#5a657a"; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.color = "#3d4659"; }}
          >
            <Command className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">Command Palette</span>
            <kbd className="text-[9px] px-1.5 py-0.5 rounded font-mono" style={{ background: "rgba(255,255,255,0.04)", color: "#3d4659" }}>
              Ctrl+K
            </kbd>
          </motion.button>
        )}

        {/* User Info + Logout */}
        <div className="pt-2 mt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          {user && !sidebarCollapsed && (
            <div className="px-2.5 mb-2">
              <p className="text-[13px] font-medium truncate" style={{ color: "#c8d0e0" }}>{user.username}</p>
              <p className="text-[11px] capitalize" style={{ color: "#3d4659" }}>{user.role.replace(/_/g, " ")}</p>
            </div>
          )}
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] cursor-pointer transition-all duration-200"
            style={{
              justifyContent: sidebarCollapsed ? "center" : "flex-start",
              color: "#5a657a",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.06)"; e.currentTarget.style.color = "#f87171"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#5a657a"; }}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!sidebarCollapsed && <span>{labels.logout}</span>}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-40 lg:hidden"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile hamburger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 lg:hidden w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200"
        style={{ background: "rgba(15,21,36,0.8)", border: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(16px)" }}
      >
        <Shield className="w-4 h-4" style={{ color: "#22d3ee" }} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
            style={{ background: "#f87171", color: "#050810" }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Desktop Sidebar */}
      <aside
        className="hidden lg:flex flex-col h-screen border-glow transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] flex-shrink-0"
        style={{
          width: sidebarCollapsed ? 64 : 240,
          background: "rgba(7,10,20,0.85)",
          backdropFilter: "blur(24px)",
          borderRight: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        {navContent}
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-y-0 left-0 z-50 w-[272px] flex flex-col lg:hidden border-glow"
            style={{
              background: "rgba(7,10,20,0.95)",
              backdropFilter: "blur(32px)",
              borderRight: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            {navContent}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}