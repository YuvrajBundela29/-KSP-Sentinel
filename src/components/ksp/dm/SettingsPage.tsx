"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Palette,
  Settings2,
  Lock,
  Unlock,
  Save,
  RotateCcw,
  Globe,
  Monitor,
  Bell,
  Volume2,
  PanelLeftClose,
  PanelLeftOpen,
  Brain,
  Cpu,
  ScanLine,
  HardDrive,
  Database,
  Info,
  CheckCircle2,
  Loader2,
  AlertCircle,
  Eye,
  Pencil,
  Trash2,
  Download,
  Upload,
  BarChart3,
  Users,
  Sparkles,
  FileSearch,
  Layers,
  type LucideIcon,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import type { RoleName, RolePermission } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import LoadingSpinner from "@/components/ksp/LoadingSpinner";
import { useToast } from "@/hooks/use-toast";

// ─── Role Definitions ───────────────────────────────────────────────
interface RoleDef {
  key: RoleName;
  label: string;
  description: string;
  locked?: boolean;
}

const ROLES: RoleDef[] = [
  { key: "super_admin", label: "Super Admin", description: "Full system access", locked: true },
  { key: "state_admin", label: "State Admin", description: "State-wide management" },
  { key: "district_admin", label: "District Admin", description: "District-level operations" },
  { key: "station_officer", label: "Station Officer", description: "Police station management" },
  { key: "investigator", label: "Investigator", description: "Case investigation access" },
  { key: "analyst", label: "Analyst", description: "Data analytics and AI tools" },
  { key: "auditor", label: "Auditor", description: "Audit log and compliance" },
  { key: "demo_user", label: "Demo User", description: "Limited read-only access" },
];

interface PermissionDef {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
}

const PERMISSIONS: PermissionDef[] = [
  { key: "create_fir", label: "Create FIR", description: "File new FIRs", icon: Pencil },
  { key: "edit_fir", label: "Edit FIR", description: "Modify existing FIRs", icon: Pencil },
  { key: "delete_fir", label: "Delete FIR", description: "Remove FIRs", icon: Trash2 },
  { key: "view_fir", label: "View FIR", description: "Read FIR records", icon: Eye },
  { key: "manage_evidence", label: "Manage Evidence", description: "Upload and manage evidence", icon: Layers },
  { key: "import_data", label: "Import Data", description: "Bulk data import", icon: Upload },
  { key: "export_data", label: "Export Data", description: "Download and export data", icon: Download },
  { key: "view_analytics", label: "View Analytics", description: "Access analytics dashboards", icon: BarChart3 },
  { key: "manage_users", label: "Manage Users", description: "User administration", icon: Users },
  { key: "run_ai", label: "Run AI Analysis", description: "Execute AI processing", icon: Sparkles },
  { key: "view_audit", label: "View Audit", description: "Access audit logs", icon: FileSearch },
  { key: "manage_settings", label: "Manage Settings", description: "System configuration", icon: Settings2 },
];

// Default permission matrix
function getDefaultPermissions(): Record<RoleName, Record<string, boolean>> {
  return {
    super_admin: Object.fromEntries(PERMISSIONS.map(p => [p.key, true])) as Record<string, boolean>,
    state_admin: {
      create_fir: true, edit_fir: true, delete_fir: true, view_fir: true,
      manage_evidence: true, import_data: true, export_data: true, view_analytics: true,
      manage_users: true, run_ai: true, view_audit: true, manage_settings: false,
    },
    district_admin: {
      create_fir: true, edit_fir: true, delete_fir: false, view_fir: true,
      manage_evidence: true, import_data: true, export_data: true, view_analytics: true,
      manage_users: false, run_ai: true, view_audit: true, manage_settings: false,
    },
    station_officer: {
      create_fir: true, edit_fir: true, delete_fir: false, view_fir: true,
      manage_evidence: true, import_data: false, export_data: true, view_analytics: true,
      manage_users: false, run_ai: true, view_audit: false, manage_settings: false,
    },
    investigator: {
      create_fir: true, edit_fir: true, delete_fir: false, view_fir: true,
      manage_evidence: true, import_data: false, export_data: true, view_analytics: true,
      manage_users: false, run_ai: true, view_audit: false, manage_settings: false,
    },
    analyst: {
      create_fir: false, edit_fir: false, delete_fir: false, view_fir: true,
      manage_evidence: false, import_data: true, export_data: true, view_analytics: true,
      manage_users: false, run_ai: true, view_audit: true, manage_settings: false,
    },
    auditor: {
      create_fir: false, edit_fir: false, delete_fir: false, view_fir: true,
      manage_evidence: false, import_data: false, export_data: true, view_analytics: true,
      manage_users: false, run_ai: false, view_audit: true, manage_settings: false,
    },
    demo_user: {
      create_fir: false, edit_fir: false, delete_fir: false, view_fir: true,
      manage_evidence: false, import_data: false, export_data: false, view_analytics: true,
      manage_users: false, run_ai: false, view_audit: false, manage_settings: false,
    },
  };
}

// ─── Settings State Types ────────────────────────────────────────────
interface UIPrefs {
  theme: "dark" | "light";
  language: "en" | "kn";
  pageSize: number;
  autoRefresh: number;
  compactMode: boolean;
  animations: boolean;
  notificationSound: boolean;
  sidebarDefault: "expanded" | "collapsed";
}

interface SysConfig {
  aiModel: string;
  aiConfidence: number;
  duplicateThreshold: number;
  ocrLanguage: string;
  maxUploadSize: number;
  dbHost: string;
  dbPort: string;
  dbName: string;
  dbUser: string;
}

const DEFAULT_UI_PREFS: UIPrefs = {
  theme: "dark",
  language: "en",
  pageSize: 25,
  autoRefresh: 60,
  compactMode: false,
  animations: true,
  notificationSound: true,
  sidebarDefault: "expanded",
};

const DEFAULT_SYS_CONFIG: SysConfig = {
  aiModel: "claude-sonnet-4-6",
  aiConfidence: 75,
  duplicateThreshold: 85,
  ocrLanguage: "eng+kan",
  maxUploadSize: 50,
  dbHost: "ksp-db.internal.karnataka.gov.in",
  dbPort: "5432",
  dbName: "ksp_sentinel_prod",
  dbUser: "ksp_app_user",
};

// ─── Main Component ─────────────────────────────────────────────────
export default function SettingsPage() {
  const { user, toggleLang, addNotification } = useAppStore();
  const theme = useAppStore((s) => s.theme);
  const setTheme = useAppStore((s) => s.setTheme);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingConn, setTestingConn] = useState(false);
  const [connStatus, setConnStatus] = useState<"idle" | "testing" | "success" | "failure">("idle");

  // Role permissions state
  const [permissions, setPermissions] = useState<Record<RoleName, Record<string, boolean>>>(getDefaultPermissions());

  // UI Preferences state
  const [uiPrefs, setUiPrefs] = useState<UIPrefs>(DEFAULT_UI_PREFS);

  // System Config state
  const [sysConfig, setSysConfig] = useState<SysConfig>(DEFAULT_SYS_CONFIG);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  // Toggle a permission
  const togglePermission = (role: RoleName, permKey: string) => {
    const roleDef = ROLES.find(r => r.key === role);
    if (roleDef?.locked) return;
    setPermissions(prev => ({
      ...prev,
      [role]: { ...prev[role], [permKey]: !prev[role][permKey] },
    }));
  };

  // Save role permissions
  const savePermissions = useCallback(() => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({ title: "Permissions Saved", description: "Role permissions have been updated successfully.", variant: "default" });
      addNotification({ title: "Permissions Updated", message: "Role permission matrix was modified.", type: "success", read: false });
    }, 1000);
  }, [toast, addNotification]);

  // Reset UI prefs
  const resetUIPrefs = useCallback(() => {
    setUiPrefs(DEFAULT_UI_PREFS);
    toast({ title: "Reset Complete", description: "UI preferences reset to defaults.", variant: "default" });
  }, [toast]);

  // Save UI prefs
  const saveUIPrefs = useCallback(() => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({ title: "Preferences Saved", description: "UI preferences have been updated.", variant: "default" });
    }, 800);
  }, [toast]);

  // Save system config
  const saveSysConfig = useCallback(() => {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      toast({ title: "Configuration Saved", description: "System configuration has been updated.", variant: "default" });
      addNotification({ title: "System Config Updated", message: "AI and system settings modified.", type: "info", read: false });
    }, 1000);
  }, [toast, addNotification]);

  // Test connection
  const testConnection = useCallback(() => {
    setTestingConn(true);
    setConnStatus("testing");
    setTimeout(() => {
      setTestingConn(false);
      setConnStatus("success");
      toast({ title: "Connection Successful", description: "Database connection test passed. Latency: 12ms", variant: "default" });
      setTimeout(() => setConnStatus("idle"), 3000);
    }, 2000);
  }, [toast]);

  // Current user role
  const currentUserRole = (user?.role ?? "demo_user") as RoleName;

  // System info
  const systemInfo = useMemo(() => ({
    version: "2.4.1",
    build: "2024.12.28-a3f7b2c",
    uptime: "14d 6h 23m",
    activeSessions: 23,
  }), []);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-[#f1f5f9] text-2xl font-bold tracking-tight">Settings</h1>
          <p className="text-[#5a657a] text-sm mt-1">Role permissions, UI preferences, and system configuration</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-xl">
            <Settings2 className="h-4 w-4 text-[#5a657a]" />
            <span className="text-[#8b97b0] text-xs">System Configuration</span>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <Tabs defaultValue="permissions" className="space-y-6">
        <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1">
          <TabsTrigger value="permissions" className="gap-2 rounded-lg text-[#8b97b0] data-[state=active]:bg-white/10 data-[state=active]:text-[#f1f5f9] data-[state=active]:shadow-sm px-5">
            <Shield className="h-4 w-4" /> Role Permissions
          </TabsTrigger>
          <TabsTrigger value="preferences" className="gap-2 rounded-lg text-[#8b97b0] data-[state=active]:bg-white/10 data-[state=active]:text-[#f1f5f9] data-[state=active]:shadow-sm px-5">
            <Palette className="h-4 w-4" /> UI Preferences
          </TabsTrigger>
          <TabsTrigger value="system" className="gap-2 rounded-lg text-[#8b97b0] data-[state=active]:bg-white/10 data-[state=active]:text-[#f1f5f9] data-[state=active]:shadow-sm px-5">
            <Settings2 className="h-4 w-4" /> System Configuration
          </TabsTrigger>
        </TabsList>

        {/* ─── Tab 1: Role Permissions ─── */}
        <TabsContent value="permissions">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Legend */}
            <div className="flex items-center gap-4 text-xs text-[#5a657a]">
              <div className="flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-[#fbbf24]" />
                <span>Super Admin — all permissions locked</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="h-3.5 w-3.5 rounded bg-[#22d3ee]/20 border border-[rgba(34,211,238,0.2)]" />
                <span>Your current role is highlighted</span>
              </div>
            </div>

            {/* Permissions Grid */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10">
                      <th className="text-left text-[#5a657a] text-xs font-semibold uppercase tracking-wider p-4 min-w-[200px]">
                        Permission
                      </th>
                      {ROLES.map(role => (
                        <th key={role.key} className="text-center p-4 min-w-[100px]">
                          <div className="flex flex-col items-center gap-1">
                            <span className={`text-xs font-semibold px-2 py-1 rounded-lg ${
                              role.key === currentUserRole
                                ? "bg-[#22d3ee]/15 text-[#22d3ee] border border-[rgba(34,211,238,0.15)]"
                                : role.locked
                                  ? "bg-[#fbbf24]/10 text-[#fbbf24] border border-amber-500/20"
                                  : "text-[#8b97b0]"
                            }`}>
                              {role.locked && <Lock className="h-3 w-3 inline mr-1" />}
                              {role.label}
                            </span>
                            <span className="text-[10px] text-[#3d4659]">{role.description}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {PERMISSIONS.map((perm, permIdx) => {
                      const Icon = perm.icon;
                      return (
                        <motion.tr
                          key={perm.key}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: permIdx * 0.03 }}
                          className="border-b border-white/5 hover:bg-white/5 transition-colors"
                        >
                          <td className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-[#5a657a]">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="text-[#f1f5f9] text-sm font-medium">{perm.label}</div>
                                <div className="text-[#3d4659] text-xs">{perm.description}</div>
                              </div>
                            </div>
                          </td>
                          {ROLES.map(role => {
                            const isOn = permissions[role.key]?.[perm.key] ?? false;
                            const isLocked = role.locked;
                            return (
                              <td key={role.key} className="p-4 text-center">
                                <div className="flex justify-center">
                                  <Switch
                                    checked={isOn}
                                    disabled={isLocked}
                                    onCheckedChange={() => togglePermission(role.key, perm.key)}
                                    className={isOn ? "data-[state=checked]:bg-[#34d399]" : ""}
                                  />
                                </div>
                              </td>
                            );
                          })}
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-end border-t border-white/10 p-4">
                <Button
                  onClick={savePermissions}
                  disabled={saving}
                  className="gap-2 bg-[#34d399] hover:bg-[#2bc48a] text-white border-0 rounded-xl px-6"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {saving ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </div>
          </motion.div>
        </TabsContent>

        {/* ─── Tab 2: UI Preferences ─── */}
        <TabsContent value="preferences">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-1 gap-6 lg:grid-cols-2"
          >
            {/* Theme */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#818cf8]/15 text-[#818cf8]">
                  <Monitor className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[#f1f5f9] text-sm font-semibold">Appearance</h3>
                  <p className="text-[#3d4659] text-xs">Customize the look and feel</p>
                </div>
              </div>

              <Separator className="bg-white/10" />

              {/* Theme Selection */}
              <div className="space-y-2.5">
                <Label className="text-[#8b97b0] text-xs font-medium">Theme</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div
                    className={`flex items-center gap-3 rounded-xl border-2 p-3.5 cursor-pointer transition-all ${
                      theme === "dark"
                        ? "border-blue-500 bg-[#22d3ee]/10 ring-2 ring-blue-500/30"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                    onClick={() => setTheme("dark")}
                  >
                    <div className="h-8 w-8 rounded-lg bg-[rgba(10,15,28,0.6)] border border-white/20 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-blue-400" />
                    </div>
                    <div>
                      <span className="text-[#f1f5f9] text-sm font-medium block">Dark</span>
                      <span className="text-[#3d4659] text-[10px]">Active</span>
                    </div>
                  </div>
                  <div
                    className={`flex items-center gap-3 rounded-xl border-2 p-3.5 cursor-pointer transition-all ${
                      theme === "light"
                        ? "border-blue-500 bg-[#22d3ee]/10 ring-2 ring-blue-500/30"
                        : "border-white/10 bg-white/5 hover:border-white/20"
                    }`}
                    onClick={() => setTheme("light")}
                  >
                    <div className="h-8 w-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center">
                      <div className="h-2 w-2 rounded-full bg-gray-400" />
                    </div>
                    <div>
                      <span className="text-[#f1f5f9] text-sm font-medium block">Light</span>
                      <span className="text-[#3d4659] text-[10px]">Active</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Language */}
              <div className="space-y-2.5">
                <Label className="text-[#8b97b0] text-xs font-medium">Language</Label>
                <Select value={uiPrefs.language} onValueChange={(v) => {
                  setUiPrefs(p => ({ ...p, language: v as "en" | "kn" }));
                  if (v !== uiPrefs.language) toggleLang();
                }}>
                  <SelectTrigger className="w-full bg-white/5 border-white/10 text-[#f1f5f9]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[rgba(15,21,36,0.45)] border-[rgba(255,255,255,0.08)]">
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="kn">ಕನ್ನಡ (Kannada)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Compact Mode */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-[#f1f5f9] text-sm">Compact Mode</Label>
                  <p className="text-[#3d4659] text-xs">Reduce spacing for more content</p>
                </div>
                <Switch checked={uiPrefs.compactMode} onCheckedChange={(v) => setUiPrefs(p => ({ ...p, compactMode: v }))} />
              </div>

              {/* Animations */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-[#f1f5f9] text-sm">Animations</Label>
                  <p className="text-[#3d4659] text-xs">Enable UI motion and transitions</p>
                </div>
                <Switch checked={uiPrefs.animations} onCheckedChange={(v) => setUiPrefs(p => ({ ...p, animations: v }))} />
              </div>
            </div>

            {/* Data & Notifications */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#34d399]/15 text-[#34d399]">
                  <Settings2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[#f1f5f9] text-sm font-semibold">Data & Notifications</h3>
                  <p className="text-[#3d4659] text-xs">Pagination, refresh, and alert settings</p>
                </div>
              </div>

              <Separator className="bg-white/10" />

              {/* Page Size */}
              <div className="space-y-2.5">
                <Label className="text-[#8b97b0] text-xs font-medium">Default Page Size</Label>
                <Select value={String(uiPrefs.pageSize)} onValueChange={(v) => setUiPrefs(p => ({ ...p, pageSize: Number(v) }))}>
                  <SelectTrigger className="w-full bg-white/5 border-white/10 text-[#f1f5f9]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[rgba(15,21,36,0.45)] border-[rgba(255,255,255,0.08)]">
                    <SelectItem value="10">10 rows</SelectItem>
                    <SelectItem value="25">25 rows</SelectItem>
                    <SelectItem value="50">50 rows</SelectItem>
                    <SelectItem value="100">100 rows</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Auto Refresh */}
              <div className="space-y-2.5">
                <Label className="text-[#8b97b0] text-xs font-medium">Auto-Refresh Interval</Label>
                <Select value={String(uiPrefs.autoRefresh)} onValueChange={(v) => setUiPrefs(p => ({ ...p, autoRefresh: Number(v) }))}>
                  <SelectTrigger className="w-full bg-white/5 border-white/10 text-[#f1f5f9]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[rgba(15,21,36,0.45)] border-[rgba(255,255,255,0.08)]">
                    <SelectItem value="0">Off</SelectItem>
                    <SelectItem value="30">Every 30 seconds</SelectItem>
                    <SelectItem value="60">Every 60 seconds</SelectItem>
                    <SelectItem value="120">Every 2 minutes</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notification Sound */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5 flex items-center gap-2">
                  <Volume2 className="h-4 w-4 text-[#5a657a]" />
                  <div>
                    <Label className="text-[#f1f5f9] text-sm">Notification Sound</Label>
                    <p className="text-[#3d4659] text-xs">Play audio for alerts</p>
                  </div>
                </div>
                <Switch checked={uiPrefs.notificationSound} onCheckedChange={(v) => setUiPrefs(p => ({ ...p, notificationSound: v }))} />
              </div>

              {/* Sidebar Default */}
              <div className="space-y-2.5">
                <Label className="text-[#8b97b0] text-xs font-medium">Sidebar Default State</Label>
                <Select value={uiPrefs.sidebarDefault} onValueChange={(v) => setUiPrefs(p => ({ ...p, sidebarDefault: v as "expanded" | "collapsed" }))}>
                  <SelectTrigger className="w-full bg-white/5 border-white/10 text-[#f1f5f9]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[rgba(15,21,36,0.45)] border-[rgba(255,255,255,0.08)]">
                    <SelectItem value="expanded">Expanded</SelectItem>
                    <SelectItem value="collapsed">Collapsed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="lg:col-span-2 flex items-center justify-end gap-3">
              <Button
                variant="outline"
                onClick={resetUIPrefs}
                className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-[#8b97b0] hover:text-[#f1f5f9] rounded-xl px-5"
              >
                <RotateCcw className="h-4 w-4" /> Reset to Defaults
              </Button>
              <Button
                onClick={saveUIPrefs}
                disabled={saving}
                className="gap-2 bg-[#34d399] hover:bg-[#2bc48a] text-white border-0 rounded-xl px-6"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : "Save Preferences"}
              </Button>
            </div>
          </motion.div>
        </TabsContent>

        {/* ─── Tab 3: System Configuration ─── */}
        <TabsContent value="system">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* AI Configuration */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 space-y-5">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#818cf8]/15 text-[#818cf8]">
                  <Brain className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[#f1f5f9] text-sm font-semibold">AI Configuration</h3>
                  <p className="text-[#3d4659] text-xs">Model selection and confidence thresholds</p>
                </div>
              </div>

              <Separator className="bg-white/10" />

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* AI Model */}
                <div className="space-y-2.5">
                  <Label className="text-[#8b97b0] text-xs font-medium">AI Model</Label>
                  <Select value={sysConfig.aiModel} onValueChange={(v) => setSysConfig(c => ({ ...c, aiModel: v }))}>
                    <SelectTrigger className="w-full bg-white/5 border-white/10 text-[#f1f5f9]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[rgba(15,21,36,0.45)] border-[rgba(255,255,255,0.08)]">
                      <SelectItem value="claude-sonnet-4-6">Claude Sonnet 4.6</SelectItem>
                      <SelectItem value="claude-opus-4">Claude Opus 4</SelectItem>
                      <SelectItem value="claude-haiku-3-5">Claude Haiku 3.5</SelectItem>
                      <SelectItem value="claude-sonnet-3-5">Claude Sonnet 3.5</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[#3d4659] text-[10px]">Claude Sonnet 4.6 is recommended for optimal speed/quality balance</p>
                </div>

                {/* OCR Language */}
                <div className="space-y-2.5">
                  <Label className="text-[#8b97b0] text-xs font-medium">OCR Language</Label>
                  <Select value={sysConfig.ocrLanguage} onValueChange={(v) => setSysConfig(c => ({ ...c, ocrLanguage: v }))}>
                    <SelectTrigger className="w-full bg-white/5 border-white/10 text-[#f1f5f9]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[rgba(15,21,36,0.45)] border-[rgba(255,255,255,0.08)]">
                      <SelectItem value="eng+kan">English + Kannada</SelectItem>
                      <SelectItem value="eng">English Only</SelectItem>
                      <SelectItem value="kan">Kannada Only</SelectItem>
                      <SelectItem value="eng+hin">English + Hindi</SelectItem>
                      <SelectItem value="eng+kan+hin">English + Kannada + Hindi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* AI Confidence Threshold */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[#8b97b0] text-xs font-medium">AI Confidence Threshold</Label>
                    <span className="text-[#22d3ee] text-sm font-bold tabular-nums">{sysConfig.aiConfidence}%</span>
                  </div>
                  <Slider
                    value={[sysConfig.aiConfidence]}
                    onValueChange={([v]) => setSysConfig(c => ({ ...c, aiConfidence: v }))}
                    min={0}
                    max={100}
                    step={1}
                    className="[&>div>div]:bg-[#22d3ee]"
                  />
                  <div className="flex justify-between text-[#3d4659] text-[10px]">
                    <span>0% — Accept all</span>
                    <span>100% — Only high confidence</span>
                  </div>
                </div>

                {/* Duplicate Detection Threshold */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[#8b97b0] text-xs font-medium">Duplicate Detection Threshold</Label>
                    <span className="text-[#fbbf24] text-sm font-bold tabular-nums">{sysConfig.duplicateThreshold}%</span>
                  </div>
                  <Slider
                    value={[sysConfig.duplicateThreshold]}
                    onValueChange={([v]) => setSysConfig(c => ({ ...c, duplicateThreshold: v }))}
                    min={0}
                    max={100}
                    step={1}
                    className="[&>div>div]:bg-[#fbbf24]"
                  />
                  <div className="flex justify-between text-[#3d4659] text-[10px]">
                    <span>0% — No detection</span>
                    <span>100% — Exact matches only</span>
                  </div>
                </div>
              </div>
            </div>

            {/* File Upload & Database */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {/* File Upload */}
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 space-y-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#22d3ee]/15 text-[#22d3ee]">
                    <HardDrive className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-[#f1f5f9] text-sm font-semibold">File Upload</h3>
                    <p className="text-[#3d4659] text-xs">Upload limits and storage</p>
                  </div>
                </div>
                <Separator className="bg-white/10" />
                <div className="space-y-2.5">
                  <Label className="text-[#8b97b0] text-xs font-medium">Max File Upload Size (MB)</Label>
                  <Input
                    type="number"
                    value={sysConfig.maxUploadSize}
                    onChange={(e) => setSysConfig(c => ({ ...c, maxUploadSize: Number(e.target.value) }))}
                    className="bg-white/5 border-white/10 text-[#f1f5f9]"
                    min={1}
                    max={500}
                  />
                  <p className="text-[#3d4659] text-[10px]">Maximum size per file upload. Recommended: 50MB</p>
                </div>
              </div>

              {/* Database Connection */}
              <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#34d399]/15 text-[#34d399]">
                      <Database className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-[#f1f5f9] text-sm font-semibold">Database Connection</h3>
                      <p className="text-[#3d4659] text-xs">Read-only connection details</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={testConnection}
                    disabled={testingConn}
                    className={`gap-1.5 border-white/10 text-xs rounded-lg px-3 h-8 ${
                      connStatus === "success" ? "border-[rgba(52,211,153,0.15)] text-[#34d399] bg-[#34d399]/10" :
                      connStatus === "failure" ? "border-[rgba(248,113,113,0.15)] text-[#f87171] bg-[#f87171]/10" :
                      "bg-white/5 text-[#8b97b0] hover:bg-white/10"
                    }`}
                  >
                    {testingConn ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : connStatus === "success" ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : connStatus === "failure" ? (
                      <AlertCircle className="h-3.5 w-3.5" />
                    ) : (
                      <Cpu className="h-3.5 w-3.5" />
                    )}
                    {testingConn ? "Testing..." : connStatus === "success" ? "Connected" : "Test Connection"}
                  </Button>
                </div>
                <Separator className="bg-white/10" />
                <div className="space-y-3">
                  {[
                    { label: "Host", value: sysConfig.dbHost },
                    { label: "Port", value: sysConfig.dbPort },
                    { label: "Database", value: sysConfig.dbName },
                    { label: "User", value: sysConfig.dbUser },
                  ].map(field => (
                    <div key={field.label} className="flex items-center justify-between">
                      <span className="text-[#5a657a] text-xs">{field.label}</span>
                      <span className="text-[#f1f5f9] text-xs font-mono bg-white/5 px-2 py-1 rounded-md">{field.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* System Info */}
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#22d3ee]/15 text-[#22d3ee]">
                  <Info className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-[#f1f5f9] text-sm font-semibold">System Information</h3>
                  <p className="text-[#3d4659] text-xs">Runtime and version details</p>
                </div>
              </div>
              <Separator className="bg-white/10" />
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                  { label: "Version", value: systemInfo.version, color: "text-[#22d3ee]" },
                  { label: "Build", value: systemInfo.build, color: "text-[#818cf8]" },
                  { label: "Uptime", value: systemInfo.uptime, color: "text-[#34d399]" },
                  { label: "Active Sessions", value: String(systemInfo.activeSessions), color: "text-[#fbbf24]" },
                ].map(info => (
                  <div key={info.label} className="rounded-xl border border-white/10 bg-white/5 p-3.5">
                    <span className="text-[#5a657a] text-xs block mb-1">{info.label}</span>
                    <span className={`${info.color} text-sm font-semibold font-mono`}>{info.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Save Configuration */}
            <div className="flex items-center justify-end gap-3">
              <Button
                onClick={saveSysConfig}
                disabled={saving}
                className="gap-2 bg-[#34d399] hover:bg-[#2bc48a] text-white border-0 rounded-xl px-6"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                {saving ? "Saving..." : "Save Configuration"}
              </Button>
            </div>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  );
}