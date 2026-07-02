"use client";

import { useState, memo, useCallback, useEffect } from "react";
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
  Fingerprint,
  Users,
  Car,
  Landmark,
  Upload,
  ScrollText,
  Cpu,
  Settings,
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
  PanelLeftClose,
  PanelLeft,
} from "lucide-react";
import type { ViewType } from "@/lib/types";
import { canAccessView } from "@/lib/permissions";
import { getLabel } from "@/lib/translations";

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
      className="w-full flex items-center gap-2 px-2 py-1.5 mt-3 mb-1 cursor-pointer transition-all duration-200 group"
      style={{ fontFamily: "var(--font-ibm-plex-mono), monospace" }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--border-subtle)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <Icon className="w-3 h-3 flex-shrink-0" style={{ color }} />
      <span
        className="flex-1 text-left text-[10px] font-bold uppercase tracking-[0.16em]"
        style={{ color: "var(--text-tertiary)" }}
      >
        {label}
      </span>
      <motion.div
        animate={{ rotate: open ? 0 : -90 }}
        transition={{ duration: 0.2 }}
        className="opacity-50 group-hover:opacity-100 transition-opacity"
      >
        <ChevronRight className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
      </motion.div>
    </button>
  );
});

const NavItem = memo(function NavItem({
  item,
  isActive,
  getLabelFn,
  collapsed,
  accentColor,
  onClick,
}: {
  item: NavItemDef;
  isActive: boolean;
  getLabelFn: (key: string) => string;
  collapsed: boolean;
  accentColor: string;
  onClick: () => void;
}) {
  const Icon = item.icon;
  return (
    <motion.button
      onClick={onClick}
      whileHover={{ x: collapsed ? 0 : 2 }}
      transition={{ duration: 0.15 }}
      title={collapsed ? `${getLabelFn(item.key)}${item.shortcut ? ` (${item.shortcut})` : ""}` : undefined}
      className="w-full group relative flex items-center gap-2.5 text-[13px] cursor-pointer outline-none"
      style={{
        padding: collapsed ? "9px" : "7px 10px",
        justifyContent: collapsed ? "center" : "flex-start",
        color: isActive ? accentColor : "var(--text-secondary)",
        background: "transparent",
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
      {/* Phase 2: 2px left-border active indicator */}
      {isActive && (
        <motion.div
          layoutId={`nav-active-${item.view}`}
          className="absolute left-0 top-[15%] w-[2px] h-[70%]"
          style={{
            backgroundColor: accentColor,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        />
      )}
      <div className="relative flex-shrink-0">
        {/* Phase 2: Smaller icons (3.5 = 14px) */}
        <Icon
          className="w-3.5 h-3.5 transition-all duration-200"
          style={isActive ? { filter: `drop-shadow(0 0 6px ${accentColor})` } : {}}
        />
        {/* Badge: pulse dot for AI Copilot */}
        {item.badge === "pulse" && (
          <span
            className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
            style={{
              backgroundColor: accentColor,
              boxShadow: `0 0 4px ${accentColor}`,
              animation: "status-pulse 2s ease-in-out infinite",
            }}
          />
        )}
        {/* Badge: NEW tag — bracket style */}
        {item.badge === "new" && !collapsed && (
          <span
            className="absolute -top-1 -right-3 text-[7px] font-bold uppercase tracking-wider px-1 bracket-badge"
            style={{ color: "var(--success)" }}
          >
            NEW
          </span>
        )}
      </div>

      {/* Label + Shortcut */}
      {!collapsed && (
        <div className="flex-1 flex items-center justify-between min-w-0 gap-1">
          <span className="truncate font-medium text-[12px]">{getLabelFn(item.key)}</span>
          {item.shortcut && (
            <kbd
              className="flex-shrink-0 text-[9px] px-1.5 py-0.5 rounded font-mono"
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
  const getLabelFn = useCallback((key: string) => getLabel(lang, key), [lang]);
  const unreadCount = notifications.filter((n) => !n.read).length;

  // Guard: don't render until user is authenticated (client-side auto-login)
  if (!user) return null;

  const handleNav = useCallback(
    (view: ViewType) => {
      setView(view);
      setMobileOpen(false);
    },
    [setView]
  );

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

  const Separator = () => (
    <div
      className="my-2 mx-2"
      style={{
        height: "1px",
        background: "linear-gradient(90deg, transparent, var(--border-default), transparent)",
      }}
    />
  );

  const CollapseIcon = sidebarCollapsed ? PanelLeft : PanelLeftClose;

  return (
    <div
      className="scanline-overlay flex flex-col h-full"
      style={{
        width: sidebarCollapsed ? "52px" : "220px",
        minWidth: sidebarCollapsed ? "52px" : "220px",
        background: "var(--bg-sidebar)",
        borderRight: "1px solid var(--border-subtle)",
        transition: "width 0.2s ease, min-width 0.2s ease",
      }}
    >
      {/* Logo Bar */}
      <div
        className="flex items-center justify-between px-3 h-12 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2 overflow-hidden">
          <div
            className="w-7 h-7 rounded flex items-center justify-center flex-shrink-0"
            style={{
              background: "var(--primary-glow-strong)",
              border: "1px solid var(--border-accent)",
            }}
          >
            <Shield className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
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
                  className="text-[11px] font-bold tracking-[0.16em] uppercase"
                  style={{
                    color: "var(--primary)",
                    fontFamily: "var(--font-ibm-plex-mono), monospace",
                  }}
                >
                  Sentinel
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Collapse toggle */}
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="w-6 h-6 flex items-center justify-center rounded cursor-pointer transition-all duration-200"
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
          <CollapseIcon className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Scrollable Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-1.5 space-y-0 relative" style={{ zIndex: 2 }}>
        {/* Intelligence section label */}
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2 px-2 py-1.5 mb-0.5">
            <Radar className="w-3 h-3" style={{ color: "var(--primary)" }} />
            <span
              className="text-[10px] font-bold uppercase tracking-[0.16em] label-tracked"
              style={{ color: "var(--text-tertiary)", fontFamily: "var(--font-ibm-plex-mono), monospace" }}
            >
              {getLabel(lang, "intelligence")}
            </span>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="flex justify-center py-1">
            <div className="w-4 h-px" style={{ background: "rgba(0, 255, 102, 0.1)" }} />
          </div>
        )}
        {INTELLIGENCE_ITEMS.map((item) => {
          const isActive = currentView === item.view;
          const accessible = canAccessView(user?.role || "demo_user", item.view);
          if (!accessible) return null;
          return (
            <NavItem
              key={item.key}
              item={item}
              isActive={isActive}
              getLabelFn={getLabelFn}
              collapsed={sidebarCollapsed}
              accentColor="var(--primary)"
              onClick={() => handleNav(item.view)}
            />
          );
        })}
        <Separator />
        {/* Analytics section */}
        {!sidebarCollapsed ? (
          <SectionHeader
            label={getLabel(lang, "analytics")}
            icon={BrainCircuit}
            color="var(--success)"
            open={analyticsOpen}
            onToggle={() => setAnalyticsOpen(!analyticsOpen)}
          />
        ) : (
          <div className="flex justify-center py-1">
            <div className="w-4 h-px" style={{ background: "rgba(0, 204, 82, 0.1)" }} />
          </div>
        )}
        <AnimatePresence initial={false}>
          {analyticsOpen && (
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
                    getLabelFn={getLabelFn}
                    collapsed={sidebarCollapsed}
                    accentColor="var(--success)"
                    onClick={() => handleNav(item.view)}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
        <Separator />
        {/* Data Management section */}
        {!sidebarCollapsed ? (
          <SectionHeader
            label={getLabel(lang, "dataMgmt")}
            icon={Database}
            color="var(--text-muted)"
            open={dmOpen}
            onToggle={() => setDmOpen(!dmOpen)}
          />
        ) : (
          <div className="flex justify-center py-1">
            <div className="w-4 h-px" style={{ background: "rgba(255,255,255,0.06)" }} />
          </div>
        )}
        <AnimatePresence initial={false}>
          {dmOpen && (
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
                    getLabelFn={getLabelFn}
                    collapsed={sidebarCollapsed}
                    accentColor="var(--text-secondary)"
                    onClick={() => handleNav(item.view)}
                  />
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Bottom section: User info + Logout */}
      <div className="flex-shrink-0" style={{ borderTop: "1px solid var(--border-subtle)", position: "relative", zIndex: 2 }}>
        {/* User Info */}
        <div className="flex items-center gap-2.5 px-3 py-2">
          <div
            className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 text-[10px] font-bold"
            style={{
              background: "var(--primary-glow-strong)",
              color: "var(--primary)",
              border: "1px solid var(--border-accent)",
            }}
          >
            {user?.username.charAt(0).toUpperCase()}
          </div>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold truncate" style={{ color: "var(--text-primary)" }}>
                {user?.username}
              </p>
              <p className="text-[9px] capitalize" style={{ color: "var(--text-muted)" }}>
                {user.role.replace(/_/g, " ")}
              </p>
            </div>
          )}
        </div>
        {/* Logout */}
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[11px] cursor-pointer transition-all duration-200"
          style={{
            justifyContent: sidebarCollapsed ? "center" : "flex-start",
            color: "var(--text-tertiary)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--critical-glow)";
            e.currentTarget.style.color = "var(--critical)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.color = "var(--text-tertiary)";
          }}
        >
          <LogOut className="w-3.5 h-3.5 flex-shrink-0" />
          {!sidebarCollapsed && <span>{getLabel(lang, "logout")}</span>}
        </button>
      </div>
    </div>
  );
}