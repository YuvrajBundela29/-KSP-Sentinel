"use client";

import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  FileText,
  CalendarCheck,
  Brain,
  Camera,
  Copy,
  ScanLine,
  Upload,
  HeartPulse,
  Sparkles,
  Plus,
  FileUp,
  Play,
  BarChart3,
  TrendingUp,
  TrendingDown,
  Activity,
  Database,
  HardDrive,
  Clock,
  Shield,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Info,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { loadCrimeData } from "@/lib/data";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import LoadingSpinner from "@/components/ksp/LoadingSpinner";

// ─── Animated Counter Hook ─────────────────────────────────────────
function useAnimatedCounter(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

// ─── Stat Card ─────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  trend: number; // positive = up, negative = down
  gradientColor: string;
  delay: number;
  isPercent?: boolean;
}

function StatCard({
  icon,
  label,
  value,
  suffix = "",
  trend,
  gradientColor,
  delay,
  isPercent = false,
}: StatCardProps) {
  const animatedValue = useAnimatedCounter(value, 1400);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.08 }}
      whileHover={{
        scale: 1.03,
        boxShadow: `0 0 30px ${gradientColor}20`,
      }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300"
      style={{
        borderLeft: `3px solid ${gradientColor}`,
      }}
    >
      {/* Subtle gradient accent glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{
          background: `linear-gradient(135deg, ${gradientColor}08 0%, transparent 60%)`,
        }}
      />

      <div className="relative flex items-start justify-between p-5">
        <div className="flex-1">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[#64748b] text-xs font-medium uppercase tracking-wider">
              {label}
            </span>
          </div>
          <div className="flex items-baseline gap-1.5">
            <span className="text-[#e2e8f0] text-3xl font-bold tabular-nums">
              {isPercent ? `${animatedValue}%` : animatedValue.toLocaleString("en-IN")}
            </span>
            {suffix && (
              <span className="text-[#64748b] text-sm">{suffix}</span>
            )}
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {trend >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-red-400" />
            )}
            <span
              className={`text-xs font-medium ${
                trend >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              {trend >= 0 ? "+" : ""}
              {trend}%
            </span>
            <span className="text-[#4a5568] text-xs">vs last month</span>
          </div>
        </div>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{
            backgroundColor: `${gradientColor}15`,
            color: gradientColor,
          }}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Activity Timeline Item ────────────────────────────────────────
interface ActivityItem {
  id: string;
  icon: React.ReactNode;
  action: string;
  detail: string;
  time: string;
  status: "success" | "warning" | "error" | "info";
}

function ActivityTimeline({ items }: { items: ActivityItem[] }) {
  const statusColor: Record<string, string> = {
    success: "bg-emerald-500",
    warning: "bg-amber-500",
    error: "bg-red-500",
    info: "bg-blue-500",
  };

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <motion.div
          key={item.id}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: idx * 0.1 }}
          className="flex items-start gap-3"
        >
          <div className="relative mt-1">
            <div
              className={`h-2.5 w-2.5 rounded-full ${
                statusColor[item.status]
              } ring-4 ring-[#0a0f1e]`}
            />
            {idx < items.length - 1 && (
              <div className="absolute left-1 top-3.5 h-full w-px bg-white/10" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[#e2e8f0] text-sm font-medium truncate">
                {item.action}
              </span>
              <span className="text-[#4a5568] text-xs shrink-0">{item.time}</span>
            </div>
            <p className="text-[#64748b] text-xs mt-0.5 truncate">{item.detail}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}

// ─── Main Dashboard Component ──────────────────────────────────────
export default function DataManagementDashboard() {
  const { crimeData, setCrimeData, evidenceItems, importJobs, aiQueue, auditLogs } =
    useAppStore();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      if (!crimeData) {
        try {
          const data = await loadCrimeData();
          setCrimeData(data);
        } catch (err) {
          console.error("Failed to load crime data:", err);
        }
      }
      setLoading(false);
    }
    init();
  }, [crimeData, setCrimeData]);

  // ── Compute Stats ──
  const stats = useMemo(() => {
    const totalFirs = crimeData?.firs.length ?? 0;
    const today = new Date().toISOString().slice(0, 10);
    const todayFirs = crimeData?.firs.filter((f) => f.date === today).length ?? 0;
    const pendingAI = aiQueue.filter(
      (q) => q.stage !== "completed" && q.stage !== "failed"
    ).length;
    const totalEvidence = evidenceItems.length;
    const duplicateCases = 7; // Mock
    const ocrQueue = aiQueue.filter((q) => q.stage === "ocr").length;
    const totalImportJobs = importJobs.length;
    const dbHealth = 96; // Mock %
    const aiConfidence = 89; // Mock %

    return {
      totalFirs,
      todayFirs,
      pendingAI,
      totalEvidence,
      duplicateCases,
      ocrQueue,
      totalImportJobs,
      dbHealth,
      aiConfidence,
    };
  }, [crimeData, evidenceItems, aiQueue, importJobs]);

  // ── Mock Activity ──
  const activityItems: ActivityItem[] = useMemo(() => {
    if (auditLogs.length >= 5) {
      return auditLogs.slice(0, 5).map((log) => ({
        id: log.id,
        icon:
          log.status === "success" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          ) : log.status === "failure" ? (
            <XCircle className="h-4 w-4 text-red-400" />
          ) : (
            <AlertCircle className="h-4 w-4 text-amber-400" />
          ),
        action: `${log.action} — ${log.entity}`,
        detail: `by ${log.user} (${log.role})`,
        time: new Date(log.timestamp).toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        status: log.status === "failure" ? "error" : log.status === "pending" ? "warning" : log.status as ActivityItem["status"],
      }));
    }
    // Mock data
    return [
      {
        id: "a1",
        icon: <CheckCircle2 className="h-4 w-4 text-emerald-400" />,
        action: "FIR-2024-KA-0042 processed by AI",
        detail: "Entity extraction completed with 94% confidence",
        time: "2 min ago",
        status: "success" as const,
      },
      {
        id: "a2",
        icon: <AlertCircle className="h-4 w-4 text-amber-400" />,
        action: "Duplicate case detected",
        detail: "FIR-2024-KA-0038 matches FIR-2024-KA-0015 (87%)",
        time: "8 min ago",
        status: "warning" as const,
      },
      {
        id: "a3",
        icon: <Info className="h-4 w-4 text-blue-400" />,
        action: "Import job completed",
        detail: "crime_data_jan.csv — 1,247 rows processed",
        time: "23 min ago",
        status: "info" as const,
      },
      {
        id: "a4",
        icon: <Upload className="h-4 w-4 text-blue-400" />,
        action: "Evidence uploaded",
        detail: "cctv_footage.mp4 (248 MB) linked to FIR-2024-KA-0040",
        time: "1 hr ago",
        status: "info" as const,
      },
      {
        id: "a5",
        icon: <XCircle className="h-4 w-4 text-red-400" />,
        action: "AI processing failed",
        detail: "OCR timeout on scanned_document_023.pdf",
        time: "2 hr ago",
        status: "error" as const,
      },
    ];
  }, [auditLogs]);

  // ── Storage mock values ──
  const storageUsed = 34.7; // GB
  const storageTotal = 100; // GB
  const storagePercent = Math.round((storageUsed / storageTotal) * 100);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-[#e2e8f0] text-2xl font-bold tracking-tight">
            Data Management
          </h1>
          <p className="text-[#64748b] text-sm mt-1">
            Executive overview of crime data pipeline, AI processing, and system health
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-4 py-2 backdrop-blur-xl">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[#94a3b8] text-xs">System Online</span>
          </div>
        </div>
      </motion.div>

      {/* ── 9 Stat Cards ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          label="Total FIRs"
          value={stats.totalFirs}
          trend={12.5}
          gradientColor="#3b82f6"
          delay={0}
        />
        <StatCard
          icon={<CalendarCheck className="h-5 w-5" />}
          label="Today's FIRs"
          value={stats.todayFirs}
          trend={-8.3}
          gradientColor="#10b981"
          delay={1}
        />
        <StatCard
          icon={<Brain className="h-5 w-5" />}
          label="Pending AI Processing"
          value={stats.pendingAI}
          trend={23.1}
          gradientColor="#8b5cf6"
          delay={2}
        />
        <StatCard
          icon={<Camera className="h-5 w-5" />}
          label="Uploaded Evidence"
          value={stats.totalEvidence}
          suffix="items"
          trend={15.7}
          gradientColor="#f59e0b"
          delay={3}
        />
        <StatCard
          icon={<Copy className="h-5 w-5" />}
          label="Duplicate Cases"
          value={stats.duplicateCases}
          trend={-12.0}
          gradientColor="#ef4444"
          delay={4}
        />
        <StatCard
          icon={<ScanLine className="h-5 w-5" />}
          label="OCR Queue"
          value={stats.ocrQueue}
          trend={5.4}
          gradientColor="#06b6d4"
          delay={5}
        />
        <StatCard
          icon={<Upload className="h-5 w-5" />}
          label="Import Jobs"
          value={stats.totalImportJobs}
          trend={0}
          gradientColor="#ec4899"
          delay={6}
        />
        <StatCard
          icon={<HeartPulse className="h-5 w-5" />}
          label="Database Health"
          value={stats.dbHealth}
          trend={1.2}
          gradientColor="#10b981"
          delay={7}
          isPercent
        />
        <StatCard
          icon={<Sparkles className="h-5 w-5" />}
          label="AI Confidence"
          value={stats.aiConfidence}
          trend={3.8}
          gradientColor="#3b82f6"
          delay={8}
          isPercent
        />
      </div>

      {/* ── Quick Actions ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5"
      >
        <h2 className="text-[#e2e8f0] text-sm font-semibold uppercase tracking-wider mb-4">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button
            onClick={() => useAppStore.getState().setView("dm-fir")}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0 rounded-xl px-5"
          >
            <Plus className="h-4 w-4" />
            New FIR
          </Button>
          <Button
            onClick={() => useAppStore.getState().setView("dm-import")}
            variant="outline"
            className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-[#e2e8f0] rounded-xl px-5"
          >
            <FileUp className="h-4 w-4" />
            Import Data
          </Button>
          <Button
            onClick={() => useAppStore.getState().setView("dm-ai-queue")}
            variant="outline"
            className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-[#e2e8f0] rounded-xl px-5"
          >
            <Play className="h-4 w-4" />
            Run AI Analysis
          </Button>
          <Button
            onClick={() => useAppStore.getState().setView("report")}
            variant="outline"
            className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-[#e2e8f0] rounded-xl px-5"
          >
            <BarChart3 className="h-4 w-4" />
            View Reports
          </Button>
        </div>
      </motion.div>

      {/* ── Bottom Row: Activity Timeline + Storage ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5"
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[#e2e8f0] text-sm font-semibold uppercase tracking-wider">
              Recent Activity
            </h2>
            <Button
              onClick={() => useAppStore.getState().setView("dm-audit")}
              variant="ghost"
              size="sm"
              className="text-[#64748b] hover:text-[#e2e8f0] gap-1 text-xs"
            >
              View All
              <ArrowRight className="h-3 w-3" />
            </Button>
          </div>
          <ActivityTimeline items={activityItems} />
        </motion.div>

        {/* Storage & Health */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65 }}
          className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5"
        >
          <h2 className="text-[#e2e8f0] text-sm font-semibold uppercase tracking-wider mb-5">
            Storage & Health
          </h2>
          <div className="space-y-6">
            {/* Database Health */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-emerald-400" />
                  <span className="text-[#94a3b8] text-sm">Database Health</span>
                </div>
                <span className="text-[#e2e8f0] text-sm font-semibold tabular-nums">
                  {stats.dbHealth}%
                </span>
              </div>
              <Progress
                value={stats.dbHealth}
                className="h-2.5 bg-white/5 [&>div]:bg-emerald-500 [&>div]:rounded-full"
              />
              <div className="flex justify-between text-[#4a5568] text-xs">
                <span>Connected</span>
                <span>Latency: 12ms</span>
              </div>
            </div>

            {/* Storage Usage */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <HardDrive className="h-4 w-4 text-blue-400" />
                  <span className="text-[#94a3b8] text-sm">Storage Usage</span>
                </div>
                <span className="text-[#e2e8f0] text-sm font-semibold tabular-nums">
                  {storageUsed} / {storageTotal} GB
                </span>
              </div>
              <Progress
                value={storagePercent}
                className="h-2.5 bg-white/5 [&>div]:bg-blue-500 [&>div]:rounded-full"
              />
              <div className="flex justify-between text-[#4a5568] text-xs">
                <span>{storagePercent}% used</span>
                <span>{(storageTotal - storageUsed).toFixed(1)} GB available</span>
              </div>
            </div>

            {/* AI Pipeline */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-violet-400" />
                  <span className="text-[#94a3b8] text-sm">AI Pipeline</span>
                </div>
                <span className="text-[#e2e8f0] text-sm font-semibold tabular-nums">
                  {stats.aiConfidence}%
                </span>
              </div>
              <Progress
                value={stats.aiConfidence}
                className="h-2.5 bg-white/5 [&>div]:bg-violet-500 [&>div]:rounded-full"
              />
              <div className="flex justify-between text-[#4a5568] text-xs">
                <span>{stats.pendingAI} items in queue</span>
                <span>Avg confidence: {stats.aiConfidence}%</span>
              </div>
            </div>

            {/* System Uptime */}
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 p-3.5">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-emerald-400" />
                <span className="text-[#94a3b8] text-sm">System Uptime</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-emerald-400 text-sm font-semibold">99.97%</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}