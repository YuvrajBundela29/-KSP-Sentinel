"use client";

import { useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  FileText,
  Search,
  UserX,
  AlertTriangle,
  MapPin,
  Users,
  Brain,
  Clock,
  Radio,
  ShieldAlert,
  TrendingUp,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Fingerprint,
  RadioTower,
  Lock,
  Eye,
} from "lucide-react";
import { motion } from "framer-motion";
import { useAppStore } from "@/lib/store";
import { loadCrimeData } from "@/lib/data";
import {
  getIntelFeedItems,
  getInvestigationQueue,
  getAIRecommendations,
  getCrimeTrendByMonth,
} from "@/lib/intelligence";
import LoadingSpinner from "@/components/ksp/LoadingSpinner";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

// ─── Sparkline helper ────────────────────────────────────────────
function Sparkline({ data, color = "#22d3ee" }: { data: { month: string; count: number }[]; color?: string }) {
  if (data.length < 2) return null;
  const max = Math.max(...data.map((d) => d.count), 1);
  const w = 80, h = 24, pad = 2;
  const points = data
    .map((d, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2);
      const y = h - pad - (d.count / max) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="mt-2 opacity-50">
      <defs>
        <linearGradient id={`spark-grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="sparkline-path"
      />
    </svg>
  );
}

// ─── Severity Badge ──────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const config: Record<string, { color: string; bg: string; border: string }> = {
    critical: { color: "var(--critical)", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.15)" },
    high: { color: "var(--warning)", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.15)" },
    medium: { color: "var(--warning)", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.15)" },
    low: { color: "var(--success)", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.15)" },
  };
  const c = config[severity] || config.low;
  return (
    <span
      className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
      style={{ color: c.color, backgroundColor: c.bg, border: `1px solid ${c.border}` }}
    >
      {severity}
    </span>
  );
}

// ─── Premium Stat Card ───────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
  sparkData,
  gradientClass,
  accentColor,
  stagger,
  subtitle,
  delta,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  sparkData: { month: string; count: number }[];
  gradientClass: string;
  accentColor: string;
  stagger: string;
  subtitle?: string;
  delta?: number;
}) {
  return (
    <motion.div
      className={`glass-card p-4 ${stagger} animate-fade-in-up`}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* Gradient overlay */}
      <div className={`absolute inset-0 ${gradientClass} pointer-events-none`} style={{ borderRadius: "inherit" }} />

      {/* Top accent line */}
      <div
        className="absolute top-0 left-4 right-4 h-px"
        style={{ background: `linear-gradient(90deg, ${accentColor}30, transparent)` }}
      />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: `${accentColor}10`,
              border: `1px solid ${accentColor}15`,
            }}
          >
            <Icon className="w-3.5 h-3.5" style={{ color: accentColor }} />
          </div>
          {delta !== undefined && (
            <span
              className="inline-flex items-center gap-0.5 text-[10px] font-semibold rounded-full px-1.5 py-0.5"
              style={{
                color: delta >= 0 ? "#34d399" : "#f87171",
                backgroundColor: delta >= 0 ? "rgba(52,211,153,0.08)" : "rgba(248,113,113,0.08)",
              }}
            >
              {delta >= 0 ? <ArrowUpRight className="w-2.5 h-2.5" /> : <ArrowDownRight className="w-2.5 h-2.5" />}
              {Math.abs(delta)}%
            </span>
          )}
        </div>

        <p className="text-[26px] font-bold tracking-tight leading-none animate-count-up" style={{ color: "var(--text-primary)" }}>
          {value.toLocaleString()}
        </p>
        <p className="text-[11px] mt-1.5 uppercase tracking-widest font-medium" style={{ color: "var(--text-tertiary)" }}>
          {label}
        </p>
        {subtitle && (
          <p className="text-[10px] mt-0.5" style={{ color: "var(--text-muted)" }}>{subtitle}</p>
        )}
        <Sparkline data={sparkData} color={accentColor} />
      </div>
    </motion.div>
  );
}

// ─── Risk Bar ────────────────────────────────────────────────────
function RiskBar({ score }: { score: number }) {
  const color = score > 80 ? "#f87171" : score > 60 ? "#fbbf24" : "#34d399";
  return (
    <div className="flex items-center gap-2.5 min-w-[120px]">
      <div
        className="flex-1 h-1.5 rounded-full overflow-hidden"
        style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{
            backgroundColor: color,
            boxShadow: `0 0 8px ${color}40`,
          }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(score, 100)}%` }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
      <span className="text-[11px] font-mono w-7 text-right tabular-nums" style={{ color }}>{score}</span>
    </div>
  );
}

// ─── Chart Tooltip ───────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      className="rounded-lg px-3.5 py-2.5"
      style={{
        background: "rgba(15,21,36,0.95)",
        border: "1px solid var(--border-subtle)",
        backdropFilter: "blur(16px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
      }}
    >
      <p className="text-[10px] uppercase tracking-wider mb-1" style={{ color: "var(--text-tertiary)" }}>{label}</p>
      <p className="text-[13px] font-bold" style={{ color: "var(--text-primary)" }}>
        {payload[0].value} <span className="font-normal text-[11px]" style={{ color: "var(--text-secondary)" }}>FIRs filed</span>
      </p>
    </div>
  );
}

// ─── Relative timestamp ──────────────────────────────────────────
function relativeTime(isoStr: string): string {
  const diff = Date.now() - new Date(isoStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Priority Badge ──────────────────────────────────────────────
function PriorityBadge({ score }: { score: number }) {
  if (score > 90)
    return (
      <span
        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tabular-nums"
        style={{
          backgroundColor: "rgba(248,113,113,0.1)",
          color: "var(--critical)",
          border: "1px solid rgba(248,113,113,0.15)",
        }}
      >
        {score}
      </span>
    );
  if (score > 70)
    return (
      <span
        className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tabular-nums"
        style={{
          backgroundColor: "rgba(251,191,36,0.1)",
          color: "var(--warning)",
          border: "1px solid rgba(251,191,36,0.15)",
        }}
      >
        {score}
      </span>
    );
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold tabular-nums"
      style={{
        backgroundColor: "rgba(52,211,153,0.1)",
        color: "var(--success)",
        border: "1px solid rgba(52,211,153,0.15)",
      }}
    >
      {score}
    </span>
  );
}

// ─── Intel type icon ─────────────────────────────────────────────
function IntelTypeIcon({ type }: { type: string }) {
  const config: Record<string, { icon: React.ElementType; color: string }> = {
    alert: { icon: AlertTriangle, color: "var(--critical)" },
    update: { icon: Activity, color: "var(--primary)" },
    arrest: { icon: Lock, color: "var(--success)" },
    pattern: { icon: Fingerprint, color: "var(--secondary)" },
    intelligence: { icon: Eye, color: "var(--warning)" },
  };
  const c = config[type] || { icon: Radio, color: "var(--primary)" };
  const Icon = c.icon;
  return (
    <div
      className="w-6 h-6 rounded-md flex items-center justify-center shrink-0"
      style={{
        background: `${c.color}10`,
        border: `1px solid ${c.color}15`,
      }}
    >
      <Icon className="w-3 h-3" style={{ color: c.color }} />
    </div>
  );
}

// ─── Section Header ──────────────────────────────────────────────
function SectionHeader({
  accentColor,
  icon: Icon,
  title,
  count,
  trailing,
}: {
  accentColor: string;
  icon: React.ElementType;
  title: string;
  count?: number;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-2.5 mb-4">
      <div className="flex items-center gap-2">
        <div className="w-1 h-4 rounded-full" style={{ backgroundColor: accentColor }} />
        <Icon className="w-3.5 h-3.5" style={{ color: accentColor }} />
        <h3 className="text-[11px] font-semibold tracking-[0.1em] uppercase" style={{ color: "var(--text-primary)" }}>
          {title}
        </h3>
        {count !== undefined && (
          <span
            className="text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-md"
            style={{
              color: accentColor,
              backgroundColor: `${accentColor}10`,
              border: `1px solid ${accentColor}15`,
            }}
          >
            {count}
          </span>
        )}
      </div>
      {trailing && <div className="ml-auto">{trailing}</div>}
    </div>
  );
}

// ─── Main Dashboard ──────────────────────────────────────────────
export default function DashboardHome() {
  const crimeData = useAppStore((s) => s.crimeData);
  const setCrimeData = useAppStore((s) => s.setCrimeData);
  const setDataLoading = useAppStore((s) => s.setDataLoading);
  const dataLoading = useAppStore((s) => s.dataLoading);
  const setView = useAppStore((s) => s.setView);
  const setSelectedAccusedId = useAppStore((s) => s.setSelectedAccusedId);

  useEffect(() => {
    if (!crimeData && !dataLoading) {
      setDataLoading(true);
      loadCrimeData()
        .then((data) => setCrimeData(data))
        .catch((err) => console.error("Failed to load crime data:", err))
        .finally(() => setDataLoading(false));
    }
  }, [crimeData, dataLoading, setCrimeData, setDataLoading]);

  const stats = useMemo(() => {
    if (!crimeData) return null;
    const { firs, accused, gangs, districts } = crimeData;
    const totalFIRs = firs.length;
    const activeCases = firs.filter((f) => f.investigation_status === "Under Investigation").length;
    const arrestedAccusedIds = new Set<string>();
    firs.filter((f) => f.investigation_status === "Arrested").forEach((f) => f.accused.forEach((id) => arrestedAccusedIds.add(id)));
    const arrestedCount = arrestedAccusedIds.size;
    const highRiskCount = accused.filter((a) => a.risk > 80).length;
    const closedCases = firs.filter((f) => f.investigation_status === "Closed" || f.investigation_status === "Arrested").length;
    const closureRate = totalFIRs > 0 ? Math.round((closedCases / totalFIRs) * 100) : 0;
    return { totalFIRs, activeCases, arrestedCount, highRiskCount, districtCount: districts.length, gangCount: gangs.length, closureRate };
  }, [crimeData]);

  const chartData = useMemo(() => {
    if (!crimeData) return [];
    const map: Record<string, number> = {};
    crimeData.firs.forEach((f) => {
      map[f.crime_type] = (map[f.crime_type] ?? 0) + 1;
    });
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [crimeData]);

  const recentFIRs = useMemo(() => {
    if (!crimeData) return [];
    return [...crimeData.firs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 6);
  }, [crimeData]);

  const highRiskAccused = useMemo(() => {
    if (!crimeData) return [];
    return crimeData.accused.filter((a) => a.risk > 60).sort((a, b) => b.risk - a.risk);
  }, [crimeData]);

  const crimeTrend = useMemo(() => {
    if (!crimeData) return [];
    return getCrimeTrendByMonth(crimeData);
  }, [crimeData]);
  const intelFeed = useMemo(() => {
    if (!crimeData) return [];
    return getIntelFeedItems(crimeData);
  }, [crimeData]);
  const recommendations = useMemo(() => {
    if (!crimeData) return [];
    return getAIRecommendations(crimeData);
  }, [crimeData]);
  const investigationQueue = useMemo(() => {
    if (!crimeData) return [];
    return getInvestigationQueue(crimeData);
  }, [crimeData]);

  const riskAlerts = useMemo(() => {
    if (!crimeData) return [];
    return crimeData.accused
      .filter((a) => {
        if (a.risk < 80) return false;
        return crimeData.firs.some((f) => f.accused.includes(a.id) && f.investigation_status === "Under Investigation");
      })
      .map((a) => ({
        ...a,
        activeCases: crimeData.firs.filter((f) => f.accused.includes(a.id) && f.investigation_status === "Under Investigation").length,
      }))
      .sort((a, b) => b.risk - a.risk);
  }, [crimeData]);

  if (!crimeData || !stats) return <LoadingSpinner message="Loading crime intelligence data..." />;

  const statCards = [
    { icon: FileText, label: "Total FIRs", value: stats.totalFIRs, gradientClass: "gradient-cyan", accentColor: "#22d3ee", subtitle: `${stats.districtCount} districts`, delta: 12 },
    { icon: Search, label: "Active Cases", value: stats.activeCases, gradientClass: "gradient-indigo", accentColor: "#818cf8", subtitle: "Under investigation", delta: 3 },
    { icon: UserX, label: "Arrested", value: stats.arrestedCount, gradientClass: "gradient-emerald", accentColor: "#34d399", subtitle: `${stats.closureRate}% closure rate`, delta: 8 },
    { icon: AlertTriangle, label: "High Risk", value: stats.highRiskCount, gradientClass: "gradient-rose", accentColor: "#f87171", subtitle: "Score above 80", delta: -5 },
    { icon: MapPin, label: "Districts", value: stats.districtCount, gradientClass: "gradient-amber", accentColor: "#fbbf24", subtitle: "Active coverage" },
    { icon: Users, label: "Gang Networks", value: stats.gangCount, gradientClass: "gradient-indigo", accentColor: "#818cf8", subtitle: `${crimeData.accused.filter(a => a.gang).length} identified members` },
  ];

  const staggerClasses = ["stagger-1", "stagger-2", "stagger-3", "stagger-4", "stagger-5", "stagger-6"];

  return (
    <div className="space-y-5 p-3 sm:p-5">
      {/* ═══ Mission Header ═══════════════════════════════════════ */}
      <div className="animate-fade-in-up stagger-1 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.15)" }}>
              <RadioTower className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
            </div>
            <h1 className="text-[16px] font-bold tracking-tight" style={{ color: "var(--text-primary)" }}>
              Operational Overview
            </h1>
          </div>
          <p className="text-[11px] ml-[38px]" style={{ color: "var(--text-tertiary)" }}>
            Karnataka State Police — Real-time crime intelligence dashboard
          </p>
        </div>
        <div className="flex items-center gap-4 ml-[38px] sm:ml-0">
          <div className="flex items-center gap-2">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "#34d399" }} />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: "#34d399" }} />
            </span>
            <span className="text-[10px] uppercase tracking-widest font-medium" style={{ color: "var(--success)" }}>Systems Online</span>
          </div>
          <div className="h-3 w-px" style={{ backgroundColor: "var(--border-default)" }} />
          <span className="text-[10px] font-mono tabular-nums" style={{ color: "var(--text-muted)" }}>
            {new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} · {new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}
          </span>
        </div>
      </div>

      {/* ═══ Divider ══════════════════════════════════════════════ */}
      <div className="h-px animate-fade-in" style={{ background: "linear-gradient(90deg, rgba(34,211,238,0.2), rgba(129,140,248,0.1), transparent)" }} />

      {/* ═══ Row 1: Premium Stat Cards ════════════════════════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {statCards.map((card, i) => (
          <StatCard
            key={card.label}
            icon={card.icon}
            label={card.label}
            value={card.value}
            sparkData={crimeTrend}
            gradientClass={card.gradientClass}
            accentColor={card.accentColor}
            stagger={staggerClasses[i]}
            subtitle={card.subtitle}
            delta={card.delta}
          />
        ))}
      </div>

      {/* ═══ Row 2: Chart + Recent FIRs ══════════════════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Bar Chart */}
        <motion.div
          className="glass-card p-5 lg:col-span-3 animate-fade-in-up stagger-3"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <SectionHeader
            accentColor="#22d3ee"
            icon={TrendingUp}
            title="FIRs by Crime Type"
            count={chartData.length}
          />
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: -16, bottom: 48 }}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.03)"
                  vertical={false}
                />
                <XAxis
                  dataKey="name"
                  tick={{ fill: "#5a657a", fontSize: 10 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                  tickLine={false}
                  angle={-35}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis
                  tick={{ fill: "#5a657a", fontSize: 10 }}
                  axisLine={{ stroke: "rgba(255,255,255,0.06)" }}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(34,211,238,0.04)" }} />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
                    <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.5" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.2" />
                  </linearGradient>
                </defs>
                <Bar dataKey="count" fill="url(#barGrad)" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Recent FIRs */}
        <motion.div
          className="glass-card p-5 lg:col-span-2 animate-fade-in-up stagger-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.4 }}
        >
          <SectionHeader
            accentColor="#818cf8"
            icon={FileText}
            title="Recent FIRs"
            count={recentFIRs.length}
            trailing={
              <span
                className="text-[10px] cursor-pointer font-medium px-2 py-1 rounded-md transition-colors duration-200"
                style={{ color: "var(--primary)", backgroundColor: "rgba(34,211,238,0.06)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(34,211,238,0.12)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(34,211,238,0.06)"; }}
                onClick={() => setView("dm-fir")}
              >
                View all
              </span>
            }
          />
          <div className="space-y-2 max-h-[280px] overflow-y-auto pr-1">
            {recentFIRs.map((fir, idx) => (
              <motion.div
                key={fir.fir_id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 + idx * 0.05, duration: 0.25 }}
                whileHover={{ x: 3 }}
                className="rounded-lg p-3 cursor-pointer transition-all duration-200 group"
                style={{
                  backgroundColor: "rgba(255,255,255,0.015)",
                  border: "1px solid var(--border-subtle)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.035)";
                  e.currentTarget.style.borderColor = "var(--border-default)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.015)";
                  e.currentTarget.style.borderColor = "var(--border-subtle)";
                }}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-mono font-bold tracking-wide" style={{ color: "var(--primary)" }}>
                    {fir.fir_id}
                  </span>
                  <SeverityBadge severity={fir.severity} />
                </div>
                <p className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>
                  {fir.crime_type}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[10px] font-medium px-1.5 py-0.5 rounded" style={{ color: "var(--text-secondary)", backgroundColor: "rgba(255,255,255,0.03)" }}>
                    {fir.district}
                  </span>
                  <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>{fir.date}</span>
                  <span className="ml-auto">
                    <span
                      className="text-[9px] font-medium px-1.5 py-0.5 rounded-full"
                      style={{
                        color: fir.investigation_status === "Under Investigation" ? "#fbbf24" : fir.investigation_status === "Arrested" ? "#34d399" : "#8b97b0",
                        backgroundColor: fir.investigation_status === "Under Investigation" ? "rgba(251,191,36,0.08)" : fir.investigation_status === "Arrested" ? "rgba(52,211,153,0.08)" : "rgba(139,151,176,0.08)",
                      }}
                    >
                      {fir.investigation_status}
                    </span>
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* ═══ Row 3: Intel Feed + AI Recommendations ═══════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Live Intelligence Feed */}
        <motion.div className="glass-card p-5 lg:col-span-2 animate-fade-in-up stagger-4">
          <SectionHeader
            accentColor="#f87171"
            icon={Radio}
            title="Live Intelligence"
            count={intelFeed.length}
            trailing={
              <div className="flex items-center gap-1.5">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "#f87171" }} />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: "#f87171" }} />
                </span>
                <span className="text-[10px] font-medium" style={{ color: "var(--critical)" }}>LIVE</span>
              </div>
            }
          />
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {intelFeed.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + idx * 0.04, duration: 0.25 }}
                className="rounded-lg p-3 group cursor-pointer transition-all duration-200"
                style={{
                  backgroundColor: item.severity === "critical" ? "rgba(248,113,113,0.03)" : "rgba(255,255,255,0.015)",
                  border: `1px solid ${item.severity === "critical" ? "rgba(248,113,113,0.08)" : "var(--border-subtle)"}`,
                  borderLeft: item.severity === "critical" ? "2px solid rgba(248,113,113,0.4)" : "2px solid transparent",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.borderColor = item.severity === "critical" ? "rgba(248,113,113,0.15)" : "var(--border-default)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = item.severity === "critical" ? "rgba(248,113,113,0.03)" : "rgba(255,255,255,0.015)";
                  e.currentTarget.style.borderColor = item.severity === "critical" ? "rgba(248,113,113,0.08)" : "var(--border-subtle)";
                }}
              >
                <div className="flex items-start gap-2.5">
                  <IntelTypeIcon type={item.type} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <SeverityBadge severity={item.severity} />
                      <span className="text-[9px] uppercase tracking-wider font-medium" style={{ color: "var(--text-muted)" }}>
                        {item.type}
                      </span>
                      <span className="ml-auto text-[9px] font-mono tabular-nums shrink-0" style={{ color: "var(--text-muted)" }}>
                        {relativeTime(item.timestamp)}
                      </span>
                    </div>
                    <p className="text-[12px] font-medium leading-snug" style={{ color: "var(--text-primary)" }}>
                      {item.title}
                    </p>
                    <p className="text-[11px] mt-1 line-clamp-2 leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                      {item.description}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* AI Recommendations */}
        <motion.div
          className="glass-card p-5 lg:col-span-3 animate-fade-in-up stagger-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <SectionHeader
            accentColor="#22d3ee"
            icon={Brain}
            title="AI Recommendations"
            count={recommendations.length}
            trailing={
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3" style={{ color: "var(--primary)" }} />
                <span className="text-[10px] font-medium" style={{ color: "var(--primary)" }}>AI Powered</span>
              </div>
            }
          />
          <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
            {recommendations.slice(0, 5).map((rec, idx) => {
              const isHigh = rec.priority === "high";
              const accentCol = isHigh ? "#f87171" : "#fbbf24";
              return (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.07, duration: 0.25 }}
                  className="rounded-lg p-3.5 cursor-pointer transition-all duration-200 group"
                  style={{
                    backgroundColor: isHigh ? `${accentCol}05` : "rgba(255,255,255,0.015)",
                    border: `1px solid ${isHigh ? `${accentCol}10` : "var(--border-subtle)"}`,
                    borderLeft: `2px solid ${accentCol}50`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = isHigh ? `${accentCol}08` : "rgba(255,255,255,0.03)";
                    e.currentTarget.style.borderColor = isHigh ? `${accentCol}18` : "var(--border-default)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = isHigh ? `${accentCol}05` : "rgba(255,255,255,0.015)";
                    e.currentTarget.style.borderColor = isHigh ? `${accentCol}10` : "var(--border-subtle)";
                  }}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold"
                      style={{
                        color: accentCol,
                        backgroundColor: `${accentCol}10`,
                        border: `1px solid ${accentCol}15`,
                      }}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span
                          className="text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider"
                          style={{
                            color: accentCol,
                            backgroundColor: `${accentCol}08`,
                            border: `1px solid ${accentCol}12`,
                          }}
                        >
                          {rec.priority}
                        </span>
                        <p className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>
                          {rec.title}
                        </p>
                      </div>
                      <p className="text-[11px] leading-relaxed" style={{ color: "var(--text-tertiary)" }}>
                        {rec.description}
                      </p>
                      <div
                        className="flex items-center gap-1.5 mt-2 text-[10px] font-medium cursor-pointer"
                        style={{ color: "var(--primary)" }}
                      >
                        <ArrowUpRight className="w-3 h-3" />
                        <span>{rec.action}</span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* ═══ Row 4: Investigation Queue + Risk Alerts ════════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
        {/* Investigation Queue */}
        <motion.div
          className="glass-card p-5 lg:col-span-3 animate-fade-in-up stagger-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.4 }}
        >
          <SectionHeader
            accentColor="#818cf8"
            icon={Clock}
            title="Investigation Queue"
            count={investigationQueue.length}
            trailing={
              <span
                className="text-[10px] cursor-pointer font-medium px-2 py-1 rounded-md transition-colors duration-200"
                style={{ color: "var(--primary)", backgroundColor: "rgba(34,211,238,0.06)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(34,211,238,0.12)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(34,211,238,0.06)"; }}
              >
                Sort by priority
              </span>
            }
          />
          <div className="max-h-[340px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow style={{ borderBottom: "1px solid var(--border-default)" }}>
                  <TableHead className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--text-tertiary)" }}>FIR ID</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--text-tertiary)" }}>Crime Type</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-semibold hidden md:table-cell" style={{ color: "var(--text-tertiary)" }}>District</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-center" style={{ color: "var(--text-tertiary)" }}>Days</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-right" style={{ color: "var(--text-tertiary)" }}>Priority</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investigationQueue.slice(0, 10).map((item, idx) => {
                  const isOverdue = item.daysOpen > 90;
                  return (
                    <TableRow
                      key={item.firId}
                      className="cursor-pointer transition-colors duration-150"
                      style={{ borderBottom: "1px solid var(--border-subtle)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <TableCell className="text-[11px] font-mono font-bold" style={{ color: "var(--primary)" }}>
                        {item.firId}
                      </TableCell>
                      <TableCell className="text-[12px]" style={{ color: "var(--text-primary)" }}>
                        {item.crimeType}
                      </TableCell>
                      <TableCell className="text-[11px] hidden md:table-cell" style={{ color: "var(--text-secondary)" }}>
                        {item.district}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className="text-[11px] font-mono tabular-nums font-medium px-1.5 py-0.5 rounded"
                          style={{
                            color: isOverdue ? "#f87171" : item.daysOpen > 60 ? "#fbbf24" : "#8b97b0",
                            backgroundColor: isOverdue ? "rgba(248,113,113,0.06)" : item.daysOpen > 60 ? "rgba(251,191,36,0.06)" : "transparent",
                          }}
                        >
                          {item.daysOpen}d
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <PriorityBadge score={item.priority} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </motion.div>

        {/* Risk Alerts */}
        <motion.div
          className="glass-card p-5 lg:col-span-2 animate-fade-in-up stagger-6"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7, duration: 0.4 }}
        >
          <SectionHeader
            accentColor="#f87171"
            icon={ShieldAlert}
            title="Risk Alerts"
            count={riskAlerts.length}
            trailing={
              <span
                className="text-[10px] cursor-pointer font-medium px-2 py-1 rounded-md transition-colors duration-200"
                style={{ color: "var(--critical)", backgroundColor: "rgba(248,113,113,0.06)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(248,113,113,0.12)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(248,113,113,0.06)"; }}
                onClick={() => setView("accused")}
              >
                View all
              </span>
            }
          />
          <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
            {riskAlerts.map((alert, idx) => (
              <motion.div
                key={alert.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.7 + idx * 0.05, duration: 0.25 }}
                whileHover={{ x: 3 }}
                className="rounded-lg p-3 cursor-pointer transition-all duration-200"
                style={{
                  backgroundColor: alert.risk >= 90 ? "rgba(248,113,113,0.04)" : "rgba(251,191,36,0.03)",
                  border: `1px solid ${alert.risk >= 90 ? "rgba(248,113,113,0.10)" : "rgba(251,191,36,0.08)"}`,
                  borderLeft: `2px solid ${alert.risk >= 90 ? "#f87171" : "#fbbf24"}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = alert.risk >= 90 ? "rgba(248,113,113,0.2)" : "rgba(251,191,36,0.15)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = alert.risk >= 90 ? "rgba(248,113,113,0.10)" : "rgba(251,191,36,0.08)";
                }}
              >
                <div className="flex items-center gap-2.5">
                  {/* Avatar circle */}
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[11px] font-bold"
                    style={{
                      color: alert.risk >= 90 ? "#f87171" : "#fbbf24",
                      backgroundColor: alert.risk >= 90 ? "rgba(248,113,113,0.08)" : "rgba(251,191,36,0.08)",
                      border: `1px solid ${alert.risk >= 90 ? "rgba(248,113,113,0.15)" : "rgba(251,191,36,0.12)"}`,
                    }}
                  >
                    {alert.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {alert.risk >= 90 && (
                        <span className="relative flex h-1.5 w-1.5 shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "#f87171" }} />
                          <span className="relative inline-flex rounded-full h-1.5 w-1.5" style={{ backgroundColor: "#f87171" }} />
                        </span>
                      )}
                      <p className="text-[12px] font-medium truncate" style={{ color: "var(--text-primary)" }}>
                        {alert.name}
                      </p>
                      <span
                        className="ml-auto text-[12px] font-mono font-bold shrink-0 tabular-nums"
                        style={{ color: alert.risk >= 90 ? "#f87171" : "#fbbf24" }}
                      >
                        {alert.risk}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-1 text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                      <span>{alert.activeCases} active case{alert.activeCases > 1 ? "s" : ""}</span>
                      <span style={{ color: "var(--text-muted)" }}>·</span>
                      <span>{alert.prior_firs} prior FIRs</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
            {riskAlerts.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <ShieldAlert className="w-6 h-6" style={{ color: "var(--text-muted)" }} />
                <p className="text-[11px] text-center" style={{ color: "var(--text-muted)" }}>No critical risk alerts at this time</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ═══ Row 5: High Risk Accused Table ══════════════════════ */}
      <motion.div
        className="glass-card p-5 animate-fade-in-up stagger-6"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8, duration: 0.4 }}
      >
        <SectionHeader
          accentColor="#fbbf24"
          icon={AlertTriangle}
          title="High Risk Accused"
          count={highRiskAccused.length}
          trailing={
            <span
              className="text-[10px] cursor-pointer font-medium px-2 py-1 rounded-md transition-colors duration-200"
              style={{ color: "var(--primary)", backgroundColor: "rgba(34,211,238,0.06)" }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(34,211,238,0.12)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(34,211,238,0.06)"; }}
            >
              Full database
            </span>
          }
        />
        <div className="max-h-96 overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow style={{ borderBottom: "1px solid var(--border-default)" }}>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--text-tertiary)" }}>Name</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold hidden sm:table-cell" style={{ color: "var(--text-tertiary)" }}>Age</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold hidden md:table-cell" style={{ color: "var(--text-tertiary)" }}>Gang</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "var(--text-tertiary)" }}>Risk Score</TableHead>
                <TableHead className="text-[10px] uppercase tracking-wider font-semibold hidden sm:table-cell" style={{ color: "var(--text-tertiary)" }}>Prior FIRs</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {highRiskAccused.map((a) => (
                <TableRow
                  key={a.id}
                  className="cursor-pointer transition-colors duration-150"
                  style={{ borderBottom: "1px solid var(--border-subtle)" }}
                  onClick={() => {
                    setSelectedAccusedId(a.id);
                    setView("accused");
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-[10px] font-bold"
                        style={{
                          color: a.risk > 80 ? "#f87171" : "#fbbf24",
                          backgroundColor: a.risk > 80 ? "rgba(248,113,113,0.06)" : "rgba(251,191,36,0.06)",
                          border: `1px solid ${a.risk > 80 ? "rgba(248,113,113,0.1)" : "rgba(251,191,36,0.1)"}`,
                        }}
                      >
                        {a.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
                      </div>
                      <span className="text-[12px] font-medium" style={{ color: "var(--text-primary)" }}>{a.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-[12px] hidden sm:table-cell" style={{ color: "var(--text-secondary)" }}>{a.age}</TableCell>
                  <TableCell className="hidden md:table-cell">
                    {a.gang ? (
                      <span
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{
                          color: "var(--secondary)",
                          backgroundColor: "rgba(129,140,248,0.08)",
                          border: "1px solid rgba(129,140,248,0.12)",
                        }}
                      >
                        {a.gang}
                      </span>
                    ) : (
                      <span className="text-[11px] italic" style={{ color: "var(--text-muted)" }}>Unknown</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <RiskBar score={a.risk} />
                  </TableCell>
                  <TableCell className="text-[12px] hidden sm:table-cell">
                    <span
                      className="text-[11px] font-mono tabular-nums font-medium px-1.5 py-0.5 rounded"
                      style={{
                        color: a.prior_firs > 3 ? "#f87171" : "#8b97b0",
                        backgroundColor: a.prior_firs > 3 ? "rgba(248,113,113,0.06)" : "transparent",
                      }}
                    >
                      {a.prior_firs}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </motion.div>
    </div>
  );
}