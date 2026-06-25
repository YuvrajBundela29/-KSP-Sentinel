"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Activity,
  CheckCircle2,
  XCircle,
  Clock,
  Search,
  Download,
  FileJson,
  FileSpreadsheet,
  Printer,
  ChevronLeft,
  ChevronRight,
  Filter,
  Eye,
  RefreshCw,
  Zap,
  Users,
  AlertTriangle,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { exportToCSV, exportToJSON, exportToPrint, generateId } from "@/lib/export-utils";
import type { AuditLogEntry } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import LoadingSpinner from "@/components/ksp/LoadingSpinner";

// ─── Constants ──────────────────────────────────────────────────────
const ACTIONS = [
  "CREATE_FIR", "UPDATE_FIR", "DELETE_FIR", "VIEW_FIR",
  "LOGIN", "LOGOUT", "EXPORT_DATA", "IMPORT_DATA",
  "RUN_AI_ANALYSIS", "UPDATE_EVIDENCE", "CHANGE_ROLE", "VIEW_ACCUSED",
] as const;

const ENTITIES = ["FIR", "Accused", "Evidence", "User", "Report", "Vehicle"] as const;

const STATUSES: Array<AuditLogEntry["status"]> = ["success", "failure", "pending"];

const USERS = [
  { name: "ISP Ravi Kumar", role: "ISP" },
  { name: "DSP Lakshmi", role: "DSP" },
  { name: "SI Mohan", role: "SI" },
  { name: "ACP Priya", role: "ACP" },
  { name: "ASP Venkatesh", role: "ASP" },
];

const IPS = [
  "192.168.1.45", "192.168.1.72", "10.0.5.33", "172.16.0.18",
  "192.168.2.101", "10.0.8.55", "192.168.1.88", "172.16.1.22",
];

const OLD_NEW_MAPS: Record<string, Array<{ old: string; new: string }>> = {
  CREATE_FIR: [
    { old: "—", new: "FIR-2024-KA-0142 created: Theft under IPC 379, Bengaluru Urban" },
    { old: "—", new: "FIR-2024-KA-0143 created: Robbery under IPC 392, Mysuru" },
    { old: "—", new: "FIR-2024-KA-0144 created: Burglary under IPC 380, Hubballi" },
  ],
  UPDATE_FIR: [
    { old: "status: Under Investigation", new: "status: Charge Sheet Filed" },
    { old: "severity: medium", new: "severity: high" },
    { old: "officer_id: OFF-004", new: "officer_id: OFF-012" },
    { old: "investigation_status: pending", new: "investigation_status: in_progress" },
    { old: "gang_id: null", new: "gang_id: GANG-007" },
  ],
  DELETE_FIR: [
    { old: "FIR-2024-KA-0098 (Duplicate)", new: "— (Deleted)" },
    { old: "FIR-2024-KA-0101 (Test Record)", new: "— (Deleted)" },
  ],
  VIEW_FIR: [
    { old: "—", new: "Accessed FIR-2024-KA-0042: Kidnapping case details" },
    { old: "—", new: "Accessed FIR-2024-KA-0055: Financial fraud report" },
  ],
  LOGIN: [
    { old: "—", new: "Session started: IP 192.168.1.45, Chrome/120" },
    { old: "—", new: "Session started: IP 10.0.5.33, Firefox/121" },
  ],
  LOGOUT: [
    { old: "Session active: 4h 23m", new: "Session ended" },
    { old: "Session active: 1h 05m", new: "Session ended" },
  ],
  EXPORT_DATA: [
    { old: "—", new: "Exported 247 FIRs as CSV (2.4 MB)" },
    { old: "—", new: "Exported crime analytics report as PDF" },
    { old: "—", new: "Exported 89 accused records as Excel" },
  ],
  IMPORT_DATA: [
    { old: "0 records", new: "1,247 FIRs imported from crime_jan_2024.csv" },
    { old: "0 records", new: "523 accused records imported from accused_master.xlsx" },
  ],
  RUN_AI_ANALYSIS: [
    { old: "Queue: 12 items", new: "Processing batch of 12 FIRs through AI pipeline" },
    { old: "Confidence: 82%", new: "Confidence: 91% after retraining" },
  ],
  UPDATE_EVIDENCE: [
    { old: "status: processing", new: "status: ready, AI Summary: CCTV footage shows 3 suspects" },
    { old: "tags: [cctv]", new: "tags: [cctv, facial_match, timestamp_2230]" },
    { old: "status: ready", new: "status: archived, linked to 3 FIRs" },
  ],
  CHANGE_ROLE: [
    { old: "SI Mohan: role=investigator", new: "SI Mohan: role=analyst" },
    { old: "ACP Priya: permissions=12", new: "ACP Priya: permissions=15" },
  ],
  VIEW_ACCUSED: [
    { old: "—", new: "Viewed profile: A005 — Ramesh Kumar (Risk: 8.7)" },
    { old: "—", new: "Viewed profile: A012 — Suresh (Risk: 6.2, Prior FIRs: 5)" },
  ],
};

// ─── Mock Data Generator ────────────────────────────────────────────
function generateMockAuditLogs(count: number): AuditLogEntry[] {
  const logs: AuditLogEntry[] = [];
  const now = Date.now();

  for (let i = 0; i < count; i++) {
    const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
    const entity = ENTITIES[Math.floor(Math.random() * ENTITIES.length)];
    const user = USERS[Math.floor(Math.random() * USERS.length)];
    const status = STATUSES[Math.random() < 0.82 ? 0 : Math.random() < 0.7 ? 1 : 2];
    const pairs = OLD_NEW_MAPS[action] || OLD_NEW_MAPS.VIEW_FIR;
    const pair = pairs[Math.floor(Math.random() * pairs.length)];

    const entityPrefixes: Record<string, string> = {
      FIR: "FIR-2024-KA-",
      Accused: "A",
      Evidence: "EVD-",
      User: "USR-",
      Report: "RPT-",
      Vehicle: "KA-",
    };

    logs.push({
      id: generateId("AL"),
      timestamp: new Date(now - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
      user: user.name,
      role: user.role,
      action,
      entity,
      entityId: `${entityPrefixes[entity] || "ENT-"}${String(Math.floor(Math.random() * 200)).padStart(4, "0")}`,
      oldValue: status === "failure" && Math.random() > 0.5 ? `Error: ${pair.old}` : pair.old,
      newValue: status === "failure" ? `Failed: ${pair.new.slice(0, 40)}...` : pair.new,
      ip: IPS[Math.floor(Math.random() * IPS.length)],
      status,
    });
  }

  return logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

function generateSingleAuditLog(): Omit<AuditLogEntry, "id" | "timestamp" | "ip"> {
  const action = ACTIONS[Math.floor(Math.random() * ACTIONS.length)];
  const entity = ENTITIES[Math.floor(Math.random() * ENTITIES.length)];
  const user = USERS[Math.floor(Math.random() * USERS.length)];
  const status = STATUSES[Math.random() < 0.85 ? 0 : Math.random() < 0.65 ? 1 : 2];
  const pairs = OLD_NEW_MAPS[action] || OLD_NEW_MAPS.VIEW_FIR;
  const pair = pairs[Math.floor(Math.random() * pairs.length)];
  const entityPrefixes: Record<string, string> = {
    FIR: "FIR-2024-KA-", Accused: "A", Evidence: "EVD-", User: "USR-", Report: "RPT-", Vehicle: "KA-",
  };

  return {
    user: user.name,
    role: user.role,
    action,
    entity,
    entityId: `${entityPrefixes[entity] || "ENT-"}${String(Math.floor(Math.random() * 200)).padStart(4, "0")}`,
    oldValue: pair.old,
    newValue: pair.new,
    status,
  };
}

// ─── Animated Counter Hook ──────────────────────────────────────────
function useAnimatedCounter(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else { setCount(Math.floor(start)); }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

// ─── Relative Time ──────────────────────────────────────────────────
function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatTimestamp(dateStr: string): string {
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

// ─── Status Badge ───────────────────────────────────────────────────
function StatusBadge({ status }: { status: AuditLogEntry["status"] }) {
  const config = {
    success: { bg: "bg-[#34d399]/15 text-[#34d399] border-[rgba(52,211,153,0.15)]", icon: <CheckCircle2 className="h-3 w-3" /> },
    failure: { bg: "bg-[#f87171]/15 text-[#f87171] border-[rgba(248,113,113,0.15)]", icon: <XCircle className="h-3 w-3" /> },
    pending: { bg: "bg-[#fbbf24]/15 text-[#fbbf24] border-[rgba(251,191,36,0.15)]", icon: <Clock className="h-3 w-3" /> },
  };
  const c = config[status];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${c.bg}`}>
      {c.icon}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function AuditLogs() {
  const { addAuditLog, auditLogs: storeLogs } = useAppStore();
  const [localLogs, setLocalLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterUser, setFilterUser] = useState("all");
  const [filterAction, setFilterAction] = useState("all");
  const [filterEntity, setFilterEntity] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [page, setPage] = useState(1);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const PER_PAGE = 25;

  // Initialize logs
  useEffect(() => {
    const timer = setTimeout(() => {
      const mock = generateMockAuditLogs(55);
      setLocalLogs(mock);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  // Live update: add new log every 8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const entry = generateSingleAuditLog();
      addAuditLog(entry);
      setLocalLogs((prev) => {
        const now = new Date().toISOString();
        const ip = IPS[Math.floor(Math.random() * IPS.length)];
        const newLog: AuditLogEntry = {
          ...entry, id: generateId("AL"), timestamp: now, ip,
        };
        return [newLog, ...prev].slice(0, 200);
      });
    }, 8000);
    return () => clearInterval(interval);
  }, [addAuditLog]);

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return localLogs.filter((log) => {
      if (search && !Object.values(log).some((v) => String(v).toLowerCase().includes(search.toLowerCase()))) return false;
      if (filterUser !== "all" && log.user !== filterUser) return false;
      if (filterAction !== "all" && log.action !== filterAction) return false;
      if (filterEntity !== "all" && log.entity !== filterEntity) return false;
      if (filterStatus !== "all" && log.status !== filterStatus) return false;
      if (filterFrom) {
        const from = new Date(filterFrom);
        if (new Date(log.timestamp) < from) return false;
      }
      if (filterTo) {
        const to = new Date(filterTo);
        to.setHours(23, 59, 59, 999);
        if (new Date(log.timestamp) > to) return false;
      }
      return true;
    });
  }, [localLogs, search, filterUser, filterAction, filterEntity, filterStatus, filterFrom, filterTo]);

  // Stats
  const stats = useMemo(() => {
    const total = localLogs.length;
    const successCount = localLogs.filter((l) => l.status === "success").length;
    const failCount = localLogs.filter((l) => l.status === "failure").length;
    const uniqueUsers = new Set(localLogs.map((l) => l.user)).size;
    return {
      total, successRate: total ? Math.round((successCount / total) * 100) : 0,
      failed: failCount, activeUsers: uniqueUsers,
    };
  }, [localLogs]);

  const animTotal = useAnimatedCounter(stats.total);
  const animRate = useAnimatedCounter(stats.successRate);
  const animFailed = useAnimatedCounter(stats.failed);
  const animUsers = useAnimatedCounter(stats.activeUsers);

  // Pagination
  const totalPages = Math.ceil(filteredLogs.length / PER_PAGE);
  const paginatedLogs = filteredLogs.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  // Reset page on filter change
  useEffect(() => { setPage(1); }, [search, filterUser, filterAction, filterEntity, filterStatus, filterFrom, filterTo]);

  // Export handlers
  const handleExportCSV = () => {
    exportToCSV(
      filteredLogs.map((l) => ({ Timestamp: l.timestamp, User: l.user, Role: l.role, Action: l.action, Entity: l.entity, EntityID: l.entityId, OldValue: l.oldValue, NewValue: l.newValue, IP: l.ip, Status: l.status })),
      "audit_logs",
    );
  };

  const handleExportJSON = () => { exportToJSON(filteredLogs, "audit_logs"); };
  const handlePrint = () => { exportToPrint("audit-log-table"); };

  const openDetail = (log: AuditLogEntry) => { setSelectedLog(log); setShowDetail(true); };

  const statCards = [
    { label: "Total Actions", value: animTotal, icon: <Activity className="h-5 w-5" />, color: "#22d3ee", delay: 0 },
    { label: "Success Rate", value: animRate, suffix: "%", icon: <CheckCircle2 className="h-5 w-5" />, color: "#34d399", delay: 1 },
    { label: "Failed Actions", value: animFailed, icon: <XCircle className="h-5 w-5" />, color: "#f87171", delay: 2 },
    { label: "Active Users", value: animUsers, icon: <Users className="h-5 w-5" />, color: "#fbbf24", delay: 3 },
  ];

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
          <h1 className="text-[#f1f5f9] text-2xl font-bold tracking-tight">Audit Logs</h1>
          <p className="text-[#5a657a] text-sm mt-1">Complete activity trail with real-time monitoring</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-[rgba(52,211,153,0.15)] bg-[#34d399]/10 px-4 py-2">
            <div className="h-2 w-2 rounded-full bg-[#34d399] animate-pulse" />
            <span className="text-[#34d399] text-xs font-medium">Live</span>
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((sc) => (
          <motion.div
            key={sc.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: sc.delay * 0.08 }}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02]"
            style={{ borderLeft: `3px solid ${sc.color}` }}
          >
            <div className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 hover:opacity-100"
              style={{ background: `linear-gradient(135deg, ${sc.color}08 0%, transparent 60%)` }} />
            <div className="relative flex items-start justify-between p-5">
              <div>
                <span className="text-[#5a657a] text-xs font-medium uppercase tracking-wider">{sc.label}</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-[#f1f5f9] text-3xl font-bold tabular-nums">{sc.value}</span>
                  {sc.suffix && <span className="text-[#5a657a] text-sm">{sc.suffix}</span>}
                </div>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-xl" style={{ backgroundColor: `${sc.color}15`, color: sc.color }}>
                {sc.icon}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-[#5a657a]" />
          <span className="text-[#f1f5f9] text-sm font-semibold">Filters</span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
          {/* Search */}
          <div className="relative xl:col-span-2">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5a657a]" />
            <Input
              placeholder="Search all fields..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white/5 border-white/10 text-[#f1f5f9] placeholder:text-[#3d4659] h-9"
            />
          </div>
          {/* Date From */}
          <Input
            type="date"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
            className="bg-white/5 border-white/10 text-[#f1f5f9] h-9"
          />
          {/* Date To */}
          <Input
            type="date"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
            className="bg-white/5 border-white/10 text-[#f1f5f9] h-9"
          />
          {/* User */}
          <Select value={filterUser} onValueChange={setFilterUser}>
            <SelectTrigger className="w-full bg-white/5 border-white/10 text-[#f1f5f9] h-9">
              <SelectValue placeholder="All Users" />
            </SelectTrigger>
            <SelectContent className="bg-[rgba(15,21,36,0.95)] border-[rgba(255,255,255,0.06)]">
              <SelectItem value="all">All Users</SelectItem>
              {USERS.map((u) => (
                <SelectItem key={u.name} value={u.name}>{u.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Action */}
          <Select value={filterAction} onValueChange={setFilterAction}>
            <SelectTrigger className="w-full bg-white/5 border-white/10 text-[#f1f5f9] h-9">
              <SelectValue placeholder="All Actions" />
            </SelectTrigger>
            <SelectContent className="bg-[rgba(15,21,36,0.95)] border-[rgba(255,255,255,0.06)]">
              <SelectItem value="all">All Actions</SelectItem>
              {ACTIONS.map((a) => (
                <SelectItem key={a} value={a}>{a.replace(/_/g, " ")}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {/* Status */}
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full bg-white/5 border-white/10 text-[#f1f5f9] h-9">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent className="bg-[rgba(15,21,36,0.95)] border-[rgba(255,255,255,0.06)]">
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="success">Success</SelectItem>
              <SelectItem value="failure">Failure</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {/* Entity filter as separate row on small screens */}
        <div className="mt-3 flex gap-3">
          <Select value={filterEntity} onValueChange={setFilterEntity}>
            <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/10 text-[#f1f5f9] h-9">
              <SelectValue placeholder="All Entities" />
            </SelectTrigger>
            <SelectContent className="bg-[rgba(15,21,36,0.95)] border-[rgba(255,255,255,0.06)]">
              <SelectItem value="all">All Entities</SelectItem>
              {ENTITIES.map((e) => (
                <SelectItem key={e} value={e}>{e}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(filterUser !== "all" || filterAction !== "all" || filterEntity !== "all" || filterStatus !== "all" || filterFrom || filterTo || search) && (
            <Button
              variant="ghost"
              size="sm"
              className="text-[#5a657a] hover:text-[#f1f5f9] gap-1"
              onClick={() => { setFilterUser("all"); setFilterAction("all"); setFilterEntity("all"); setFilterStatus("all"); setFilterFrom(""); setFilterTo(""); setSearch(""); }}
            >
              <RefreshCw className="h-3 w-3" /> Clear Filters
            </Button>
          )}
        </div>
      </motion.div>

      {/* Export Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="flex items-center gap-2"
      >
        <span className="text-[#5a657a] text-xs mr-2">Export:</span>
        <Button variant="outline" size="sm" className="gap-1.5 border-white/10 bg-white/5 hover:bg-white/10 text-[#8b97b0] hover:text-[#f1f5f9] text-xs rounded-lg" onClick={handleExportCSV}>
          <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 border-white/10 bg-white/5 hover:bg-white/10 text-[#8b97b0] hover:text-[#f1f5f9] text-xs rounded-lg" onClick={handleExportJSON}>
          <FileJson className="h-3.5 w-3.5" /> JSON
        </Button>
        <Button variant="outline" size="sm" className="gap-1.5 border-white/10 bg-white/5 hover:bg-white/10 text-[#8b97b0] hover:text-[#f1f5f9] text-xs rounded-lg" onClick={handlePrint}>
          <Printer className="h-3.5 w-3.5" /> Print
        </Button>
        <span className="text-[#3d4659] text-xs ml-2">
          Showing {filteredLogs.length} of {localLogs.length} entries
        </span>
      </motion.div>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 }}
        className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden"
      >
        <div id="audit-log-table">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-[#5a657a] text-xs font-semibold uppercase tracking-wider">Timestamp</TableHead>
                <TableHead className="text-[#5a657a] text-xs font-semibold uppercase tracking-wider">User</TableHead>
                <TableHead className="text-[#5a657a] text-xs font-semibold uppercase tracking-wider">Role</TableHead>
                <TableHead className="text-[#5a657a] text-xs font-semibold uppercase tracking-wider">Action</TableHead>
                <TableHead className="text-[#5a657a] text-xs font-semibold uppercase tracking-wider">Entity</TableHead>
                <TableHead className="text-[#5a657a] text-xs font-semibold uppercase tracking-wider">Entity ID</TableHead>
                <TableHead className="text-[#5a657a] text-xs font-semibold uppercase tracking-wider">Old Value</TableHead>
                <TableHead className="text-[#5a657a] text-xs font-semibold uppercase tracking-wider">New Value</TableHead>
                <TableHead className="text-[#5a657a] text-xs font-semibold uppercase tracking-wider">IP</TableHead>
                <TableHead className="text-[#5a657a] text-xs font-semibold uppercase tracking-wider">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedLogs.length === 0 ? (
                <TableRow className="border-white/5">
                  <TableCell colSpan={10} className="text-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <Shield className="h-10 w-10 text-[#3d4659]" />
                      <p className="text-[#5a657a] text-sm">No audit logs match your filters</p>
                      <Button variant="ghost" size="sm" className="text-[#5a657a] hover:text-[#f1f5f9]"
                        onClick={() => { setFilterUser("all"); setFilterAction("all"); setFilterEntity("all"); setFilterStatus("all"); setFilterFrom(""); setFilterTo(""); setSearch(""); }}>
                        Clear all filters
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                <AnimatePresence mode="popLayout">
                  {paginatedLogs.map((log, idx) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ duration: 0.2, delay: idx * 0.01 }}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                      onClick={() => openDetail(log)}
                    >
                      <TableCell className="text-[#8b97b0] text-xs py-2.5">
                        <div>
                          <div className="text-[#f1f5f9] text-xs">{relativeTime(log.timestamp)}</div>
                          <div className="text-[#3d4659] text-[10px] mt-0.5">{formatTimestamp(log.timestamp)}</div>
                        </div>
                      </TableCell>
                      <TableCell className="text-[#f1f5f9] text-xs font-medium py-2.5">{log.user}</TableCell>
                      <TableCell className="py-2.5">
                        <span className="text-[#5a657a] text-xs bg-white/5 px-2 py-0.5 rounded-md">{log.role}</span>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <span className="text-[#22d3ee] text-xs font-medium">{log.action.replace(/_/g, " ")}</span>
                      </TableCell>
                      <TableCell className="text-[#8b97b0] text-xs py-2.5">{log.entity}</TableCell>
                      <TableCell className="text-[#8b97b0] text-xs font-mono py-2.5">{log.entityId}</TableCell>
                      <TableCell className="text-[#5a657a] text-xs py-2.5 max-w-[140px] truncate" title={log.oldValue}>
                        {log.oldValue.length > 30 ? log.oldValue.slice(0, 30) + "..." : log.oldValue}
                      </TableCell>
                      <TableCell className="text-[#5a657a] text-xs py-2.5 max-w-[140px] truncate" title={log.newValue}>
                        {log.newValue.length > 30 ? log.newValue.slice(0, 30) + "..." : log.newValue}
                      </TableCell>
                      <TableCell className="text-[#3d4659] text-xs font-mono py-2.5">{log.ip}</TableCell>
                      <TableCell className="py-2.5">
                        <StatusBadge status={log.status} />
                      </TableCell>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-white/10">
            <span className="text-[#5a657a] text-xs">
              Page {page} of {totalPages} &middot; {PER_PAGE} per page
            </span>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="text-[#5a657a] hover:text-[#f1f5f9] h-8 w-8 p-0"
                disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <Button key={pageNum} variant={page === pageNum ? "default" : "ghost"} size="sm"
                    className={`h-8 w-8 p-0 text-xs ${page === pageNum ? "bg-[#34d399] hover:bg-[#34d399] text-white" : "text-[#5a657a] hover:text-[#f1f5f9]"}`}
                    onClick={() => setPage(pageNum)}>
                    {pageNum}
                  </Button>
                );
              })}
              <Button variant="ghost" size="sm" className="text-[#5a657a] hover:text-[#f1f5f9] h-8 w-8 p-0"
                disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </motion.div>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="bg-[rgba(15,21,36,0.95)] border-[rgba(255,255,255,0.06)] max-w-2xl max-h-[85vh] overflow-hidden">
          {selectedLog && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#f1f5f9]">Audit Log Detail</DialogTitle>
                <DialogDescription className="text-[#5a657a]">
                  Full details for action {selectedLog.action} on {selectedLog.entity}
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4 pr-4">
                  {/* Metadata */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: "Timestamp", value: formatTimestamp(selectedLog.timestamp) },
                      { label: "User", value: selectedLog.user },
                      { label: "Role", value: selectedLog.role },
                      { label: "Action", value: selectedLog.action.replace(/_/g, " ") },
                      { label: "Entity", value: selectedLog.entity },
                      { label: "Entity ID", value: selectedLog.entityId },
                      { label: "IP Address", value: selectedLog.ip },
                      { label: "Status", value: selectedLog.status.charAt(0).toUpperCase() + selectedLog.status.slice(1) },
                    ].map((item) => (
                      <div key={item.label} className="rounded-xl border border-white/10 bg-white/5 p-3">
                        <span className="text-[#5a657a] text-xs block mb-1">{item.label}</span>
                        {item.label === "Status" ? (
                          <StatusBadge status={selectedLog.status} />
                        ) : (
                          <span className="text-[#f1f5f9] text-sm font-medium">{item.value}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Diff View */}
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <AlertTriangle className="h-4 w-4 text-[#fbbf24]" />
                      <span className="text-[#f1f5f9] text-sm font-semibold">Value Change</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg border border-red-500/20 bg-[#f87171]/5 p-3">
                        <span className="text-[#f87171] text-xs font-semibold block mb-2">Old Value</span>
                        <pre className="text-[#8b97b0] text-xs whitespace-pre-wrap break-words font-mono">
                          {selectedLog.oldValue || "—"}
                        </pre>
                      </div>
                      <div className="rounded-lg border border-[rgba(52,211,153,0.12)] bg-[#34d399]/5 p-3">
                        <span className="text-[#34d399] text-xs font-semibold block mb-2">New Value</span>
                        <pre className="text-[#8b97b0] text-xs whitespace-pre-wrap break-words font-mono">
                          {selectedLog.newValue || "—"}
                        </pre>
                      </div>
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}