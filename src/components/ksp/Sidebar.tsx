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
  UserSearch,
  Heart,
  BrainCircuit,
  Activity,
  ChevronRight,
  Radar,
  FileSearch,
  BadgeCheck,
  BookOpen,
} from "lucide-react";
import { useState, memo, useCallback, useEffect } from "react";
import type { ViewType } from "@/lib/types";
import { canAccessView } from "@/lib/permissions";

/* ═══════════════════════════════════════════════════════════════════════
   LABELS — EN / KN
   ═══════════════════════════════════════════════════════════════════════ */

const LABELS: Record<string, Record<string, string>> = {
  en: {
    dashboard: "Mission Control",
    chat: "AI Copilot",
    network: "Network Graph",
    map: "Crime Map",
    accused: "Accused Profile",
    timeline: "Investigation Timeline",
    report: "Generate Report",
    logout: "Sign Out",
    dataMgmt: "Data Management",
    dmDashboard: "Data Management Dashboard",
    dmFir: "FIR Management",
    dmEvidence: "Evidence Management",
    dmCriminals: "Criminals Database",
    dmVictims: "Victims Registry",
    dmVehicles: "Vehicle Records",
    dmFinancial: "Financial Records",
    dmImport: "Import Center",
    dmAudit: "Audit Logs",
    dmAiQueue: "AI Processing Queue",
    dmSettings: "Settings",
    dmSociological: "Sociological Insights",
    dmForecasting: "Crime Forecasting",
    dmFinancialNetwork: "Financial Network",
    intelligence: "Intelligence",
    analytics: "Analytics & AI",
    commandPalette: "Command Palette",
    helpGuide: "Help Guide",
  },
  kn: {
    dashboard: "ಮಿಷನ್ ಕಂಟ್ರೋಲ್",
    chat: "AI ಸಹಾಯಕ",
    network: "ನೆಟ್‌ವರ್ಕ್ ಗ್ರಾಫ್",
    map: "ಅಪರಾಧ ನಕ್ಷೆ",
    accused: "ಆರೋಪಿ ಪ್ರೊಫೈಲ್",
    timeline: "ತನಿಖಾ ಟೈಮ್‌ಲೈನ್",
    report: "ವರದಿ ರಚಿಸಿ",
    logout: "ಲಾಗ್ ಔಟ್",
    dataMgmt: "ದತ್ತಾಂಶ ನಿರ್ವಹಣೆ",
    dmDashboard: "ಡ್ಯಾಶ್‌ಬೋರ್ಡ್",
    dmFir: "ಎಫ್‌ಐಆರ್ ನಿರ್ವಹಣೆ",
    dmEvidence: "ಪುರಾವೆ ನಿರ್ವಹಣೆ",
    dmCriminals: "ಅಪರಾಧಿಗಳ ಡೇಟಾಬೇಸ್",
    dmVictims: "ಬಲಿಪಂಜುಗಳ ನೋಂದಣಿ",
    dmVehicles: "ವಾಹನ ದಾಖಲೆಗಳು",
    dmFinancial: "ಹಣಕಾಸು ದಾಖಲೆಗಳು",
    dmImport: "ಆಮದು ಕೇಂದ್ರ",
    dmAudit: "ಆಡಿಟ್ ಲಾಗ್‌ಗಳು",
    dmAiQueue: "AI ಪ್ರಕ್ರಿಯೆ",
    dmSettings: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
    dmSociological: "ಸಾಮಾಜಿಕ ಒಳನೋಟಗಳು",
    dmForecasting: "ಅಪರಾಧ ಮುನ್ಸೂಚನೆ",
    dmFinancialNetwork: "ಹಣಕಾಸು ನೆಟ್‌ವರ್ಕ್",
    intelligence: "ಗುಪ್ತಚರ",
    analytics: "ವಿಶ್ಲೇಷಣೆ & AI",
    commandPalette: "ಕಮಾಂಡ್ ಪ್ಯಾಲೆಟ್",
    helpGuide: "ಸಹಾಯ ಮಾರ್ಗದರ್ಶಿ",
  },
};

/* ═══════════════════════════════════════════════════════════════════════
   NAV STRUCTURE — Items with keyboard shortcuts & sections
   ═══════════════════════════════════════════════════════════════════════ */

interface NavItemDef {
  key: string;
  icon: React.ElementType;
  view: ViewType;
  shortcut?: string;
  badge?: "pulse" | "new";
}

const INTELLIGENCE_ITEMS: NavItemDef[] = [
  { key: "dashboard", icon: LayoutDashboard, view: "dashboard", shortcut: "Alt+1" },
  { key: "chat", icon: Bot, view: "chat", shortcut: "Alt+2", badge: "pulse" },
  { key: "network", icon: Network, view: "network", shortcut: "Alt+3" },
  { key: "map", icon: MapPin, view: "map", shortcut: "Alt+4" },
  { key: "accused", icon: UserSearch, view: "accused", shortcut: "Alt+5" },
  { key: "timeline", icon: Clock, view: "timeline", shortcut: "Alt+6" },
  { key: "report", icon: FileText, view: "report", shortcut: "Alt+7" },
];

const ANALYTICS_ITEMS: NavItemDef[] = [
  { key: "dmForecasting", icon: TrendingUp, view: "dm-forecasting", badge: "new" },
  { key: "dmSociological", icon: BarChart3, view: "dm-sociological" },
  { key: "dmFinancialNetwork", icon: GitBranch, view: "dm-financial-network" },
  { key: "dmAiQueue", icon: BrainCircuit, view: "dm-ai-queue" },
];

const DATA_MGMT_ITEMS: NavItemDef[] = [
  { key: "dmDashboard", icon: Activity, view: "dm-dashboard" },
  { key: "dmFir", icon: FileSearch, view: "dm-fir" },
  { key: "dmEvidence", icon: Fingerprint, view: "dm-evidence" },
  { key: "dmCriminals", icon: BadgeCheck, view: "dm-criminals" },
  { key: "dmVictims", icon: Heart, view: "dm-victims" },
  { key: "dmVehicles", icon: Car, view: "dm-vehicles" },
  { key: "dmFinancial", icon: Landmark, view: "dm-financial" },
  { key: "dmImport", icon: Upload, view: "dm-import" },
  { key: "dmAudit", icon: ScrollText, view: "dm-audit" },
  { key: "dmSettings", icon: Settings, view: "dm-settings" },
];

/* ═══════════════════════════════════════════════════════════════════════
   SECTION HEADER — Collapsible section with label
   ═══════════════════════════════════════════════════════════════════════ */

const SectionHeader = memo(function SectionHeader({
  label,
  icon: Icon,
  color,
  open,
  onToggle,
}: {
  label: string;
  icon: React.ElementType;
  color: string;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className="w-full flex items-center gap-2 px-2 py-1.5 mt-3 mb-1 cursor-pointer rounded-md transition-all duration-200 group"
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "rgba(255,255,255,0.02)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
      <span
        className="flex-1 text-left text-[10px] font-semibold uppercase tracking-[0.12em]"
        style={{ color: "#5a657a" }}
      >
        {label}
      </span>
      <motion.div
        animate={{ rotate: open ? 0 : -90 }}
        transition={{ duration: 0.2 }}
        className="opacity-50 group-hover:opacity-100 transition-opacity"
      >
        <ChevronRight className="w-3 h-3" style={{ color: "#3d4659" }} />
      </motion.div>
    </button>
  );
});

/* ═══════════════════════════════════════════════════════════════════════
   NAV ITEM — Individual nav button with shortcut, badge, glow
   ═══════════════════════════════════════════════════════════════════════ */

const NavItem = memo(function NavItem({
  item,
  isActive,
  labels,
  collapsed,
  accentColor,
  onClick,
}: {
  item: NavItemDef;
  isActive: boolean;
  labels: Record<string, string>;
  collapsed: boolean;
  accentColor: string;
  onClick: () => void;
}) {
  const Icon = item.icon;
  const glowColor = accentColor === "#22d3ee"
    ? "rgba(34,211,238,0.08)"
    : accentColor === "#818cf8"
      ? "rgba(129,140,248,0.08)"
      : accentColor === "#34d399"
        ? "rgba(52,211,153,0.08)"
        : "rgba(251,191,36,0.08)";

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: collapsed ? 0 : 2 }}
      transition={{ duration: 0.15 }}
      title={collapsed ? `${labels[item.key]}${item.shortcut ? ` (${item.shortcut})` : ""}` : undefined}
      className="w-full group relative flex items-center gap-2.5 rounded-lg text-[13px] cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/30"
      style={{
        padding: collapsed ? "9px" : "7px 10px",
        justifyContent: collapsed ? "center" : "flex-start",
        color: isActive ? accentColor : "var(--text-secondary)",
        background: isActive ? glowColor : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "var(--border-subtle)";
          e.currentTarget.style.color = "var(--text-primary)";
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.background = "transparent";
          e.currentTarget.style.color = "var(--text-secondary)";
        }
      }}
    >
      {/* Active left indicator */}
      {isActive && (
        <motion.div
          layoutId={`nav-active-${item.view}`}
          className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[55%] rounded-r-full"
          style={{
            backgroundColor: accentColor,
            boxShadow: `0 0 12px ${accentColor}60`,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}

      {/* Icon */}
      <div className="relative flex-shrink-0">
        <Icon
          className="w-[17px] h-[17px] transition-all duration-200"
          style={isActive ? { filter: `drop-shadow(0 0 6px ${accentColor}50)` } : {}}
        />
        {/* Badge: pulse dot for AI Copilot */}
        {item.badge === "pulse" && (
          <span
            className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full"
            style={{
              backgroundColor: accentColor,
              boxShadow: `0 0 6px ${accentColor}`,
              animation: "status-pulse 2s ease-in-out infinite",
            }}
          />
        )}
        {/* Badge: NEW tag */}
        {item.badge === "new" && !collapsed && (
          <span
            className="absolute -top-1 -right-3 text-[7px] font-bold uppercase tracking-wider px-1 rounded-sm"
            style={{
              backgroundColor: "rgba(52,211,153,0.15)",
              color: "#34d399",
              border: "1px solid rgba(52,211,153,0.2)",
            }}
          >
            NEW
          </span>
        )}
      </div>

      {/* Label + Shortcut */}
      {!collapsed && (
        <div className="flex-1 flex items-center justify-between min-w-0 gap-1">
          <span className="truncate font-medium text-[13px]">{labels[item.key]}</span>
          {item.shortcut && (
            <kbd
              className="flex-shrink-0 text-[9px] font-mono px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              style={{
                background: "var(--border-subtle)",
                color: "var(--text-muted)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              {item.shortcut}
            </kbd>
          )}
        </div>
      )}
    </motion.button>
  );
});

/* ═══════════════════════════════════════════════════════════════════════
   MAIN SIDEBAR COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

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
  const setShowOnboarding = useAppStore((s) => s.setShowOnboarding);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dmOpen, setDmOpen] = useState(true);
  const [analyticsOpen, setAnalyticsOpen] = useState(true);
  const labels = LABELS[lang];
  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleNav = useCallback(
    (view: ViewType) => {
      setView(view);
      setMobileOpen(false);
    },
    [setView]
  );

  /* ── Keyboard Shortcuts (Alt+1..7) ─────────────────────────────── */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key >= "1" && e.key <= "7") {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        const item = INTELLIGENCE_ITEMS[idx];
        if (item && canAccessView(user?.role || "demo_user", item.view)) {
          handleNav(item.view);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [user, handleNav]);

  /* ── Separator ─────────────────────────────────────────────────── */
  const Separator = () => (
    <div
      className="my-2 mx-2"
      style={{
        height: "1px",
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)",
      }}
    />
  );

  /* ── Nav Content (shared between desktop + mobile) ──────────────── */
  const navContent = (
    <div className="flex flex-col h-full">
      {/* ── Logo Bar ──────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-4 h-14 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2.5 overflow-hidden">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(129,140,248,0.08))",
              border: "1px solid rgba(34,211,238,0.12)",
              boxShadow: "0 0 16px rgba(34,211,238,0.08)",
            }}
          >
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
                <span
                  className="text-xs font-bold tracking-[0.14em] uppercase"
                  style={{
                    color: "#22d3ee",
                    textShadow: "0 0 20px rgba(34,211,238,0.3)",
                  }}
                >
                  Sentinel
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Collapse toggle — desktop only */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="hidden lg:flex items-center justify-center w-6 h-6 rounded-md transition-colors cursor-pointer"
          style={{ color: "var(--text-muted)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--border-subtle)";
            e.currentTarget.style.color = "var(--text-secondary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-muted)";
          }}
        >
          <motion.div
            animate={{ rotate: sidebarCollapsed ? 0 : -90 }}
            transition={{ duration: 0.2 }}
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </motion.div>
        </button>
        {/* Close button — mobile only */}
        <button
          onClick={() => setMobileOpen(false)}
          className="lg:hidden flex items-center justify-center w-6 h-6 rounded-md cursor-pointer"
          style={{ color: "var(--text-tertiary)" }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Scrollable Navigation ─────────────────────────────────── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2.5 py-2 space-y-0">
        {/* INTELLIGENCE Section — always visible */}
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2 px-2 py-1.5 mb-1">
            <Radar className="w-3 h-3" style={{ color: "#22d3ee" }} />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.12em]"
              style={{ color: "var(--text-tertiary)" }}
            >
              {labels.intelligence}
            </span>
          </div>
        )}
        {INTELLIGENCE_ITEMS.map((item) => {
          const isActive = currentView === item.view;
          const accessible = canAccessView(
            user?.role || "demo_user",
            item.view
          );
          if (!accessible) return null;
          return (
            <NavItem
              key={item.key}
              item={item}
              isActive={isActive}
              labels={labels}
              collapsed={sidebarCollapsed}
              accentColor="#22d3ee"
              onClick={() => handleNav(item.view)}
            />
          );
        })}

        <Separator />

        {/* ANALYTICS & AI Section */}
        {!sidebarCollapsed ? (
          <SectionHeader
            label={labels.analytics}
            icon={BrainCircuit}
            color="#34d399"
            open={analyticsOpen}
            onToggle={() => setAnalyticsOpen(!analyticsOpen)}
          />
        ) : (
          <div className="flex justify-center py-1">
            <div
              className="w-6 h-px"
              style={{ background: "rgba(255,255,255,0.06)" }}
            />
          </div>
        )}

        <AnimatePresence initial={false}>
          {(analyticsOpen || sidebarCollapsed) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              {ANALYTICS_ITEMS.map((item) => {
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
                    accentColor="#34d399"
                    onClick={() => handleNav(item.view)}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        <Separator />

        {/* DATA MANAGEMENT Section */}
        {!sidebarCollapsed ? (
          <SectionHeader
            label={labels.dataMgmt}
            icon={Database}
            color="#818cf8"
            open={dmOpen}
            onToggle={() => setDmOpen(!dmOpen)}
          />
        ) : (
          <div className="flex justify-center py-1">
            <div
              className="w-6 h-px"
              style={{ background: "rgba(255,255,255,0.06)" }}
            />
          </div>
        )}

        <AnimatePresence initial={false}>
          {(dmOpen || sidebarCollapsed) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
              className="overflow-hidden"
            >
              {DATA_MGMT_ITEMS.map((item) => {
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
                    accentColor="#818cf8"
                    onClick={() => handleNav(item.view)}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bottom spacer for scroll */}
        <div className="h-4" />
      </nav>

      {/* ── Bottom Section ───────────────────────────────────────── */}
      <div
        className="px-2.5 pb-3 space-y-1 flex-shrink-0"
        style={{ borderTop: "1px solid var(--border-subtle)" }}
      >
        {/* Command Palette — desktop, expanded only */}
        {!sidebarCollapsed && (
          <motion.button
            onClick={() => setCommandPaletteOpen(true)}
            whileHover={{ scale: 1.01 }}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] cursor-pointer transition-colors"
            style={{
              color: "var(--text-muted)",
              border: "1px dashed var(--border-subtle)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-default)";
              e.currentTarget.style.color = "var(--text-tertiary)";
              e.currentTarget.style.background = "var(--border-subtle)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
              e.currentTarget.style.color = "var(--text-muted)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <Command className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">{labels.commandPalette}</span>
            <kbd
              className="text-[9px] px-1.5 py-0.5 rounded font-mono"
              style={{
                background: "var(--border-subtle)",
                color: "var(--text-muted)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              Ctrl+K
            </kbd>
          </motion.button>
        )}

        {/* Help Guide button — desktop, expanded only */}
        {!sidebarCollapsed && (
          <button
            onClick={() => setShowOnboarding(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[11px] cursor-pointer transition-all duration-200"
            style={{
              color: "var(--text-muted)",
              border: "1px dashed var(--border-subtle)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--border-default)";
              e.currentTarget.style.color = "var(--text-tertiary)";
              e.currentTarget.style.background = "var(--border-subtle)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
              e.currentTarget.style.color = "var(--text-muted)";
              e.currentTarget.style.background = "transparent";
            }}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">{labels.helpGuide || "Help Guide"}</span>
          </button>
        )}

        {/* Collapsed help guide — icon only */}
        {sidebarCollapsed && (
          <button
            onClick={() => setShowOnboarding(true)}
            className="w-full flex items-center justify-center py-2 rounded-lg cursor-pointer transition-all duration-200"
            style={{ color: "var(--text-muted)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--border-subtle)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--text-muted)";
            }}
            title="Help Guide"
          >
            <BookOpen className="w-4 h-4" />
          </button>
        )}

        {/* User Info — desktop, expanded only */}
        {user && !sidebarCollapsed && (
          <div className="flex items-center gap-3 px-3 py-2">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
              style={{
                background: "linear-gradient(135deg, rgba(34,211,238,0.1), rgba(129,140,248,0.08))",
                color: "#22d3ee",
                border: "1px solid rgba(34,211,238,0.1)",
              }}
            >
              {user.username.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-[12px] font-semibold truncate"
                style={{ color: "var(--text-primary)" }}
              >
                {user.username}
              </p>
              <p className="text-[10px] capitalize" style={{ color: "var(--text-muted)" }}>
                {user.role.replace(/_/g, " ")}
              </p>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-[12px] cursor-pointer transition-all duration-200"
          style={{
            justifyContent: sidebarCollapsed ? "center" : "flex-start",
            color: "var(--text-tertiary)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "rgba(248,113,113,0.06)";
            e.currentTarget.style.color = "#f87171";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-tertiary)";
          }}
        >
          <LogOut className="w-4 h-4 flex-shrink-0" />
          {!sidebarCollapsed && <span>{labels.logout}</span>}
        </button>
      </div>
    </div>
  );

  /* ── Render ─────────────────────────────────────────────────────── */
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
            style={{
              background: "rgba(0,0,0,0.6)",
              backdropFilter: "blur(4px)",
            }}
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Mobile hamburger trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="fixed top-3 left-3 z-50 lg:hidden w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200"
        style={{
          background: "rgba(15,21,36,0.85)",
          border: "1px solid rgba(255,255,255,0.06)",
          backdropFilter: "blur(16px)",
        }}
      >
        <Shield className="w-4 h-4" style={{ color: "#22d3ee" }} />
        {unreadCount > 0 && (
          <span
            className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
            style={{ background: "#f87171", color: "#050810" }}
          >
            {unreadCount}
          </span>
        )}
      </button>

      {/* Desktop Sidebar — always visible on lg+ screens */}
      <aside
        className="hidden lg:flex flex-col h-full flex-shrink-0 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]"
        style={{
          width: sidebarCollapsed ? 60 : 256,
          minWidth: sidebarCollapsed ? 60 : 256,
          background: "var(--bg-sidebar)",
          backdropFilter: "blur(32px)",
          borderRight: "1px solid var(--border-subtle)",
          boxShadow: sidebarCollapsed
            ? "none"
            : "4px 0 24px -4px rgba(0,0,0,0.3)",
        }}
      >
        {navContent}
      </aside>

      {/* Mobile Sidebar — slide in overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.aside
            initial={{ x: -280, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: -280, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="fixed inset-y-0 left-0 z-50 w-[280px] max-w-[85vw] flex flex-col lg:hidden"
            style={{
              background: "var(--bg-sidebar)",
              backdropFilter: "blur(32px)",
              borderRight: "1px solid var(--border-default)",
              boxShadow: "4px 0 32px rgba(0,0,0,0.5)",
            }}
          >
            {navContent}
          </motion.aside>
        )}
      </AnimatePresence>
    </>
  );
}