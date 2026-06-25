"use client";

import { useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
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
    <svg width={w} height={h} className="mt-2 opacity-40">
      <defs>
        <linearGradient id={`spark-grad-${color.replace('#','')}`} x1="0" y1="0" x2="0" y2="1">
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
    critical: { color: "#f87171", bg: "rgba(248,113,113,0.08)", border: "rgba(248,113,113,0.15)" },
    high: { color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.15)" },
    medium: { color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.15)" },
    low: { color: "#34d399", bg: "rgba(52,211,153,0.08)", border: "rgba(52,211,153,0.15)" },
  };
  const c = config[severity] || config.low;
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider capitalize"
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
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  sparkData: { month: string; count: number }[];
  gradientClass: string;
  accentColor: string;
  stagger: string;
}) {
  return (
    <motion.div
      className={`glass-card p-5 ${stagger}`}
      whileHover={{ y: -2, transition: { duration: 0.2 } }}
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* Gradient overlay */}
      <div className={`absolute inset-0 ${gradientClass} pointer-events-none`} style={{ borderRadius: "inherit" }} />

      <div className="relative z-10">
        <div className="flex items-start justify-between mb-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${accentColor}12`, border: `1px solid ${accentColor}18` }}>
            <Icon className="w-4.5 h-4.5" style={{ color: accentColor }} />
          </div>
          <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider" style={{ color: accentColor, backgroundColor: `${accentColor}08`, border: `1px solid ${accentColor}12` }}>
            {value > 0 ? "+" : ""}{value}
          </span>
        </div>
        <p className="text-2xl font-bold animate-count-up" style={{ color: "#f1f5f9" }}>{value}</p>
        <p className="text-[11px] mt-0.5 uppercase tracking-wider font-medium" style={{ color: "#5a657a" }}>{label}</p>
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
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color, width: `${Math.min(score, 100)}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(score, 100)}%` }}
          transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
        />
      </div>
      <span className="text-[11px] font-mono w-7 text-right" style={{ color: color }}>{score}</span>
    </div>
  );
}

// ─── Chart Tooltip ───────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg px-3.5 py-2.5" style={{ background: "rgba(15,21,36,0.95)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(16px)", boxShadow: "0 8px 32px rgba(0,0,0,0.4)" }}>
      <p className="text-[10px] uppercase tracking-wider" style={{ color: "#5a657a" }}>{label}</p>
      <p className="text-sm font-bold mt-0.5" style={{ color: "#f1f5f9" }}>{payload[0].value} FIRs</p>
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
  if (score > 90) return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: "rgba(248,113,113,0.1)", color: "#f87171", border: "1px solid rgba(248,113,113,0.15)" }}>{score}</span>;
  if (score > 70) return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.15)" }}>{score}</span>;
  return <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold" style={{ backgroundColor: "rgba(52,211,153,0.1)", color: "#34d399", border: "1px solid rgba(52,211,153,0.15)" }}>{score}</span>;
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
    return { totalFIRs, activeCases, arrestedCount, highRiskCount, districtCount: districts.length, gangCount: gangs.length };
  }, [crimeData]);

  const chartData = useMemo(() => {
    if (!crimeData) return [];
    const map: Record<string, number> = {};
    crimeData.firs.forEach((f) => { map[f.crime_type] = (map[f.crime_type] ?? 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [crimeData]);

  const recentFIRs = useMemo(() => {
    if (!crimeData) return [];
    return [...crimeData.firs].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
  }, [crimeData]);

  const highRiskAccused = useMemo(() => {
    if (!crimeData) return [];
    return crimeData.accused.filter((a) => a.risk > 60).sort((a, b) => b.risk - a.risk);
  }, [crimeData]);

  const crimeTrend = useMemo(() => { if (!crimeData) return []; return getCrimeTrendByMonth(crimeData); }, [crimeData]);
  const intelFeed = useMemo(() => { if (!crimeData) return []; return getIntelFeedItems(crimeData); }, [crimeData]);
  const recommendations = useMemo(() => { if (!crimeData) return []; return getAIRecommendations(crimeData); }, [crimeData]);
  const investigationQueue = useMemo(() => { if (!crimeData) return []; return getInvestigationQueue(crimeData); }, [crimeData]);

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
    { icon: FileText, label: "Total FIRs", value: stats.totalFIRs, gradientClass: "gradient-cyan", accentColor: "#22d3ee" },
    { icon: Search, label: "Active Cases", value: stats.activeCases, gradientClass: "gradient-indigo", accentColor: "#818cf8" },
    { icon: UserX, label: "Arrested", value: stats.arrestedCount, gradientClass: "gradient-emerald", accentColor: "#34d399" },
    { icon: AlertTriangle, label: "High Risk", value: stats.highRiskCount, gradientClass: "gradient-rose", accentColor: "#f87171" },
    { icon: MapPin, label: "Districts", value: stats.districtCount, gradientClass: "gradient-amber", accentColor: "#fbbf24" },
    { icon: Users, label: "Gang Networks", value: stats.gangCount, gradientClass: "gradient-indigo", accentColor: "#818cf8" },
  ];

  const staggerClasses = ["stagger-1", "stagger-2", "stagger-3", "stagger-4", "stagger-5", "stagger-6"];

  return (
    <div className="ambient-bg relative z-10">
      <div className="space-y-5 relative z-10 p-5">
        {/* ═══ Row 1: Premium Stat Cards ════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
            />
          ))}
        </div>

        {/* ═══ Row 2: Chart + Recent FIRs ══════════════════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Bar Chart */}
          <motion.div
            className="glass-card p-5 md:col-span-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: "#22d3ee" }} />
              <h3 className="text-[13px] font-semibold tracking-wide" style={{ color: "#f1f5f9" }}>FIRs by Crime Type</h3>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
                  <XAxis dataKey="name" tick={{ fill: "#5a657a", fontSize: 10 }} axisLine={{ stroke: "rgba(255,255,255,0.06)" }} tickLine={false} angle={-35} textAnchor="end" interval={0} />
                  <YAxis tick={{ fill: "#5a657a", fontSize: 10 }} axisLine={{ stroke: "rgba(255,255,255,0.06)" }} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(34,211,238,0.04)" }} />
                  <defs>
                    <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.3" />
                    </linearGradient>
                  </defs>
                  <Bar dataKey="count" fill="url(#barGrad)" radius={[6, 6, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Recent FIRs */}
          <motion.div
            className="glass-card p-5 md:col-span-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-5">
              <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: "#818cf8" }} />
              <h3 className="text-[13px] font-semibold tracking-wide" style={{ color: "#f1f5f9" }}>Recent FIRs</h3>
            </div>
            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {recentFIRs.map((fir) => (
                <motion.div
                  key={fir.fir_id}
                  whileHover={{ x: 2 }}
                  className="rounded-lg p-3.5 cursor-pointer transition-all duration-200"
                  style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.04)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.04)"; }}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[11px] font-mono font-bold" style={{ color: "#22d3ee" }}>{fir.fir_id}</span>
                    <SeverityBadge severity={fir.severity} />
                  </div>
                  <p className="text-[13px] font-medium" style={{ color: "#e8edf5" }}>{fir.crime_type}</p>
                  <div className="flex items-center gap-2.5 mt-1.5 text-[11px]" style={{ color: "#5a657a" }}>
                    <span>{fir.date}</span>
                    <span style={{ color: "#3d4659" }}>·</span>
                    <span>{fir.district}</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ═══ Row 3: Intel Feed + AI Recommendations ═══════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Live Intelligence Feed */}
          <motion.div className="glass-card p-5 md:col-span-2 animate-fade-in-up stagger-3">
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: "#f87171" }} />
              <Radio className="w-4 h-4" style={{ color: "#f87171" }} />
              <h3 className="text-[13px] font-semibold tracking-wider" style={{ color: "#f1f5f9" }}>LIVE INTELLIGENCE</h3>
              <span className="relative flex h-2 w-2 ml-auto">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "#f87171" }} />
                <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "#f87171" }} />
              </span>
            </div>
            <div className="space-y-2.5 max-h-[280px] overflow-y-auto pr-1">
              {intelFeed.map((item) => (
                <div key={item.id} className="rounded-lg p-3.5" style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <SeverityBadge severity={item.severity} />
                    <span className="text-[9px] uppercase tracking-wider" style={{ color: "#3d4659" }}>{item.type}</span>
                    <span className="ml-auto text-[10px]" style={{ color: "#3d4659" }}>{relativeTime(item.timestamp)}</span>
                  </div>
                  <p className="text-[12px] font-medium leading-snug" style={{ color: "#e8edf5" }}>{item.title}</p>
                  <p className="text-[11px] mt-1 line-clamp-2" style={{ color: "#8b97b0" }}>{item.description}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* AI Recommendations */}
          <motion.div
            className="glass-card p-5 md:col-span-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: "#22d3ee" }} />
              <Brain className="w-4 h-4" style={{ color: "#22d3ee" }} />
              <h3 className="text-[13px] font-semibold tracking-wider" style={{ color: "#f1f5f9" }}>AI RECOMMENDATIONS</h3>
            </div>
            <div className="space-y-2.5">
              {recommendations.slice(0, 4).map((rec, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1, duration: 0.3 }}
                  className="rounded-lg p-3.5"
                  style={{ backgroundColor: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)", borderLeft: `3px solid ${rec.priority === "high" ? "#f87171" : "#fbbf24"}` }}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span
                      className="text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider"
                      style={{
                        color: rec.priority === "high" ? "#f87171" : "#fbbf24",
                        backgroundColor: rec.priority === "high" ? "rgba(248,113,113,0.08)" : "rgba(251,191,36,0.08)",
                        border: `1px solid ${rec.priority === "high" ? "rgba(248,113,113,0.15)" : "rgba(251,191,36,0.15)"}`,
                      }}
                    >
                      {rec.priority}
                    </span>
                    <p className="text-[12px] font-medium" style={{ color: "#e8edf5" }}>{rec.title}</p>
                  </div>
                  <p className="text-[11px] leading-relaxed" style={{ color: "#8b97b0" }}>{rec.description}</p>
                  <p className="text-[11px] mt-2 font-medium flex items-center gap-1" style={{ color: "#22d3ee" }}>
                    → {rec.action}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ═══ Row 4: Investigation Queue + Risk Alerts ════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Investigation Queue */}
          <motion.div
            className="glass-card p-5 md:col-span-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: "#818cf8" }} />
              <Clock className="w-4 h-4" style={{ color: "#818cf8" }} />
              <h3 className="text-[13px] font-semibold tracking-wider" style={{ color: "#f1f5f9" }}>INVESTIGATION QUEUE</h3>
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#5a657a" }}>FIR ID</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#5a657a" }}>Crime Type</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#5a657a" }}>District</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-center" style={{ color: "#5a657a" }}>Days</TableHead>
                    <TableHead className="text-[10px] uppercase tracking-wider font-semibold text-right" style={{ color: "#5a657a" }}>Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investigationQueue.slice(0, 10).map((item) => (
                    <TableRow
                      key={item.firId}
                      className="cursor-pointer transition-colors duration-150"
                      style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                    >
                      <TableCell className="text-[11px] font-mono font-bold" style={{ color: "#22d3ee" }}>{item.firId}</TableCell>
                      <TableCell className="text-[12px]" style={{ color: "#e8edf5" }}>{item.crimeType}</TableCell>
                      <TableCell className="text-[11px]" style={{ color: "#8b97b0" }}>{item.district}</TableCell>
                      <TableCell className="text-[12px] text-center" style={{ color: "#e8edf5" }}>{item.daysOpen}</TableCell>
                      <TableCell className="text-right"><PriorityBadge score={item.priority} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </motion.div>

          {/* Risk Alerts */}
          <motion.div
            className="glass-card p-5 md:col-span-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.4 }}
          >
            <div className="flex items-center gap-2.5 mb-5">
              <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: "#f87171" }} />
              <ShieldAlert className="w-4 h-4" style={{ color: "#f87171" }} />
              <h3 className="text-[13px] font-semibold tracking-wider" style={{ color: "#f1f5f9" }}>RISK ALERTS</h3>
            </div>
            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {riskAlerts.map((alert) => (
                <motion.div
                  key={alert.id}
                  whileHover={{ x: 2 }}
                  className="rounded-lg p-3.5 cursor-pointer transition-all duration-200"
                  style={{
                    backgroundColor: alert.risk >= 90 ? "rgba(248,113,113,0.04)" : "rgba(255,255,255,0.02)",
                    border: `1px solid ${alert.risk >= 90 ? "rgba(248,113,113,0.12)" : "rgba(255,255,255,0.04)"}`,
                    borderLeft: `3px solid ${alert.risk >= 90 ? "#f87171" : "#fbbf24"}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    {alert.risk >= 90 && (
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: "#f87171" }} />
                        <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: "#f87171" }} />
                      </span>
                    )}
                    <p className="text-[12px] font-medium truncate" style={{ color: "#e8edf5" }}>{alert.name}</p>
                    <span className="ml-auto text-[11px] font-mono font-bold shrink-0" style={{ color: alert.risk >= 90 ? "#f87171" : "#fbbf24" }}>{alert.risk}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px]" style={{ color: "#5a657a" }}>
                    <span>{alert.activeCases} active case{alert.activeCases > 1 ? "s" : ""}</span>
                    <span style={{ color: "#3d4659" }}>·</span>
                    <span>{alert.prior_firs} prior FIRs</span>
                  </div>
                </motion.div>
              ))}
              {riskAlerts.length === 0 && (
                <p className="text-[11px] text-center py-8" style={{ color: "#3d4659" }}>No critical risk alerts at this time</p>
              )}
            </div>
          </motion.div>
        </div>

        {/* ═══ Row 5: High Risk Accused Table ══════════════════════ */}
        <motion.div
          className="glass-card p-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          <div className="flex items-center gap-2.5 mb-5">
            <div className="w-1.5 h-4 rounded-full" style={{ backgroundColor: "#fbbf24" }} />
            <h3 className="text-[13px] font-semibold tracking-wide" style={{ color: "#f1f5f9" }}>High Risk Accused</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <TableHead className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#5a657a" }}>Name</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#5a657a" }}>Age</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#5a657a" }}>Gang</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#5a657a" }}>Risk Score</TableHead>
                  <TableHead className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: "#5a657a" }}>Prior FIRs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {highRiskAccused.map((a) => (
                  <TableRow
                    key={a.id}
                    className="cursor-pointer transition-colors duration-150"
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
                    onClick={() => { setSelectedAccusedId(a.id); setView("accused"); }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <TableCell className="text-[12px] font-bold cursor-pointer" style={{ color: "#22d3ee" }}>{a.name}</TableCell>
                    <TableCell className="text-[12px]" style={{ color: "#8b97b0" }}>{a.age}</TableCell>
                    <TableCell className="text-[12px]" style={{ color: a.gang ? "#8b97b0" : "#3d4659" }}>{a.gang ?? <span className="italic">Unknown</span>}</TableCell>
                    <TableCell><RiskBar score={a.risk} /></TableCell>
                    <TableCell className="text-[12px]" style={{ color: "#8b97b0" }}>{a.prior_firs}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      </div>
    </div>
  );
}