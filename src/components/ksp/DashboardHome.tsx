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
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";

// ─── Sparkline helper ────────────────────────────────────────────
function Sparkline({
  data,
  color = "#3b82f6",
}: {
  data: { month: string; count: number }[];
  color?: string;
}) {
  if (data.length < 2) return null;
  const max = Math.max(...data.map((d) => d.count), 1);
  const w = 80,
    h = 24,
    pad = 2;
  const points = data
    .map((d, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2);
      const y = h - pad - (d.count / max) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");
  return (
    <svg width={w} height={h} className="mt-2 opacity-50">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        className="sparkline-path"
      />
    </svg>
  );
}

// ─── Severity badge helper ───────────────────────────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-green-500/20 text-green-400 border-green-500/30",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize ${
        map[severity] ?? map.low
      }`}
    >
      {severity}
    </span>
  );
}

// ─── Sparkline Stat Card ─────────────────────────────────────────
function SparklineStatCard({
  icon: Icon,
  label,
  value,
  sparkData,
  stagger,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  sparkData: { month: string; count: number }[];
  stagger: string;
}) {
  return (
    <motion.div
      className={`glass-card p-4 flex items-center justify-between animate-fade-in-up ${stagger}`}
      whileHover={{ scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      <div className="flex-1">
        <p className="text-xs text-[#94a3b8] uppercase tracking-wider">
          {label}
        </p>
        <p className="text-2xl font-bold text-[#e2e8f0] mt-1">{value}</p>
        <Sparkline data={sparkData} />
      </div>
      <div className="h-10 w-10 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center ml-3 shrink-0">
        <Icon className="h-5 w-5 text-[#3b82f6]" />
      </div>
    </motion.div>
  );
}

// ─── Risk bar ────────────────────────────────────────────────────
function RiskBar({ score }: { score: number }) {
  const color =
    score > 80 ? "bg-red-500" : score > 60 ? "bg-orange-500" : "bg-green-500";

  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 rounded-full bg-[#2a3550] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${color}`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className="text-xs font-mono text-[#94a3b8] w-8 text-right">
        {score}
      </span>
    </div>
  );
}

// ─── Custom tooltip for the chart ────────────────────────────────
function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-[#1a2035] border border-[#2a3550] rounded-md px-3 py-2 shadow-lg">
      <p className="text-xs text-[#94a3b8]">{label}</p>
      <p className="text-sm font-semibold text-[#e2e8f0]">
        {payload[0].value} FIRs
      </p>
    </div>
  );
}

// ─── Relative timestamp helper ───────────────────────────────────
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

// ─── Priority badge ──────────────────────────────────────────────
function PriorityBadge({ score }: { score: number }) {
  if (score > 90)
    return (
      <span className="inline-flex items-center rounded-full bg-red-500/20 text-red-400 px-2 py-0.5 text-xs font-bold">
        {score}
      </span>
    );
  if (score > 70)
    return (
      <span className="inline-flex items-center rounded-full bg-orange-500/20 text-orange-400 px-2 py-0.5 text-xs font-bold">
        {score}
      </span>
    );
  return (
    <span className="inline-flex items-center rounded-full bg-yellow-500/20 text-yellow-400 px-2 py-0.5 text-xs font-bold">
      {score}
    </span>
  );
}

// ─── Main component ──────────────────────────────────────────────
export default function DashboardHome() {
  const crimeData = useAppStore((s) => s.crimeData);
  const setCrimeData = useAppStore((s) => s.setCrimeData);
  const setDataLoading = useAppStore((s) => s.setDataLoading);
  const dataLoading = useAppStore((s) => s.dataLoading);
  const setView = useAppStore((s) => s.setView);
  const setSelectedAccusedId = useAppStore((s) => s.setSelectedAccusedId);

  // Load data on mount
  useEffect(() => {
    if (!crimeData && !dataLoading) {
      setDataLoading(true);
      loadCrimeData()
        .then((data) => setCrimeData(data))
        .catch((err) => console.error("Failed to load crime data:", err))
        .finally(() => setDataLoading(false));
    }
  }, [crimeData, dataLoading, setCrimeData, setDataLoading]);

  // ─── Derived stats ──────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!crimeData) return null;

    const { firs, accused, gangs, districts } = crimeData;

    const totalFIRs = firs.length;

    const activeCases = firs.filter(
      (f) => f.investigation_status === "Under Investigation"
    ).length;

    const arrestedAccusedIds = new Set<string>();
    firs
      .filter((f) => f.investigation_status === "Arrested")
      .forEach((f) => f.accused.forEach((id) => arrestedAccusedIds.add(id)));
    const arrestedCount = arrestedAccusedIds.size;

    const highRiskCount = accused.filter((a) => a.risk > 80).length;

    const districtCount = districts.length;

    const gangCount = gangs.length;

    return {
      totalFIRs,
      activeCases,
      arrestedCount,
      highRiskCount,
      districtCount,
      gangCount,
    };
  }, [crimeData]);

  // ─── Chart data: FIRs by crime type ─────────────────────────────
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

  // ─── Recent 5 FIRs sorted by date ───────────────────────────────
  const recentFIRs = useMemo(() => {
    if (!crimeData) return [];
    return [...crimeData.firs]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [crimeData]);

  // ─── High risk accused (risk > 60) sorted descending ───────────
  const highRiskAccused = useMemo(() => {
    if (!crimeData) return [];
    return crimeData.accused
      .filter((a) => a.risk > 60)
      .sort((a, b) => b.risk - a.risk);
  }, [crimeData]);

  // ─── Crime trend by month (for sparklines) ─────────────────────
  const crimeTrend = useMemo(() => {
    if (!crimeData) return [];
    return getCrimeTrendByMonth(crimeData);
  }, [crimeData]);

  // ─── Intel feed items ───────────────────────────────────────────
  const intelFeed = useMemo(() => {
    if (!crimeData) return [];
    return getIntelFeedItems(crimeData);
  }, [crimeData]);

  // ─── AI Recommendations ─────────────────────────────────────────
  const recommendations = useMemo(() => {
    if (!crimeData) return [];
    return getAIRecommendations(crimeData);
  }, [crimeData]);

  // ─── Investigation Queue ────────────────────────────────────────
  const investigationQueue = useMemo(() => {
    if (!crimeData) return [];
    return getInvestigationQueue(crimeData);
  }, [crimeData]);

  // ─── Risk Alerts (high-risk with active cases) ──────────────────
  const riskAlerts = useMemo(() => {
    if (!crimeData) return [];
    return crimeData.accused
      .filter((a) => {
        if (a.risk < 80) return false;
        const activeFirs = crimeData.firs.filter(
          (f) =>
            f.accused.includes(a.id) &&
            f.investigation_status === "Under Investigation"
        );
        return activeFirs.length > 0;
      })
      .map((a) => ({
        ...a,
        activeCases: crimeData.firs.filter(
          (f) =>
            f.accused.includes(a.id) &&
            f.investigation_status === "Under Investigation"
        ).length,
      }))
      .sort((a, b) => b.risk - a.risk);
  }, [crimeData]);

  // ─── Loading state ──────────────────────────────────────────────
  if (!crimeData || !stats) {
    return <LoadingSpinner message="Loading crime intelligence data..." />;
  }

  // Stat card config
  const statCards = [
    { icon: FileText, label: "Total FIRs", value: stats.totalFIRs },
    { icon: Search, label: "Active Cases", value: stats.activeCases },
    { icon: UserX, label: "Arrested Accused", value: stats.arrestedCount },
    {
      icon: AlertTriangle,
      label: "High Risk Offenders",
      value: stats.highRiskCount,
    },
    { icon: MapPin, label: "Districts Covered", value: stats.districtCount },
    { icon: Users, label: "Gang Networks", value: stats.gangCount },
  ];

  const staggerClasses = [
    "stagger-1",
    "stagger-2",
    "stagger-3",
    "stagger-4",
    "stagger-5",
    "stagger-6",
  ];

  return (
    <div className="ambient-bg relative z-10">
      <div className="space-y-6 relative z-10">
        {/* ═══ Row 1: Sparkline Stat Cards ═════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {statCards.map((card, i) => (
            <SparklineStatCard
              key={card.label}
              icon={card.icon}
              label={card.label}
              value={card.value}
              sparkData={crimeTrend}
              stagger={staggerClasses[i]}
            />
          ))}
        </div>

        {/* ═══ Row 2: Chart (60%) + Recent FIRs (40%) ═════════════ */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Bar Chart */}
          <motion.div
            className="glass-card p-4 md:col-span-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
          >
            <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4 tracking-wide">
              FIRs by Crime Type
            </h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={chartData}
                  margin={{ top: 0, right: 0, left: -20, bottom: 40 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={{ stroke: "#2a3550" }}
                    tickLine={false}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis
                    tick={{ fill: "#94a3b8", fontSize: 11 }}
                    axisLine={{ stroke: "#2a3550" }}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip
                    content={<ChartTooltip />}
                    cursor={{ fill: "#3b82f610" }}
                  />
                  <Bar
                    dataKey="count"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Recent FIRs */}
          <motion.div
            className="glass-card p-4 md:col-span-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
          >
            <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4 tracking-wide">
              Recent FIRs
            </h3>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {recentFIRs.map((fir) => (
                <div
                  key={fir.fir_id}
                  className="bg-[#0d1424] border border-[#2a3550]/60 rounded-lg p-3"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-mono text-[#3b82f6]">
                      {fir.fir_id}
                    </span>
                    <SeverityBadge severity={fir.severity} />
                  </div>
                  <p className="text-sm text-[#e2e8f0] font-medium">
                    {fir.crime_type}
                  </p>
                  <div className="flex items-center gap-3 mt-1 text-xs text-[#94a3b8]">
                    <span>{fir.date}</span>
                    <span>•</span>
                    <span>{fir.district}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ═══ Row 3: Intel Feed (40%) + AI Recommendations (60%) ══ */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Live Intelligence Feed */}
          <motion.div
            className="glass-card p-4 md:col-span-2 animate-fade-in-up stagger-3"
          >
            <div className="flex items-center gap-2 mb-4">
              <Radio className="h-4 w-4 text-[#3b82f6]" />
              <h3 className="text-sm font-semibold text-[#e2e8f0] tracking-wider">
                LIVE INTELLIGENCE FEED
              </h3>
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
              </span>
            </div>
            <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
              {intelFeed.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#0d1424] border border-[#2a3550]/40 rounded-lg p-3"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <SeverityBadge severity={item.severity} />
                    <span className="text-[10px] text-[#475569] uppercase tracking-wider">
                      {item.type}
                    </span>
                    <span className="ml-auto text-[10px] text-[#64748b]">
                      {relativeTime(item.timestamp)}
                    </span>
                  </div>
                  <p className="text-sm text-[#e2e8f0] font-medium leading-snug">
                    {item.title}
                  </p>
                  <p className="text-xs text-[#94a3b8] mt-1 line-clamp-2">
                    {item.description}
                  </p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* AI Recommendations */}
          <motion.div
            className="glass-card p-4 md:col-span-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Brain className="h-4 w-4 text-[#3b82f6]" />
              <h3 className="text-sm font-semibold text-[#e2e8f0] tracking-wider">
                AI RECOMMENDATIONS
              </h3>
            </div>
            <div className="space-y-3">
              {recommendations.slice(0, 4).map((rec, idx) => (
                <motion.div
                  key={idx}
                  className={`bg-[#0d1424] rounded-lg p-3 border-l-2 ${
                    rec.priority === "high"
                      ? "border-l-pink-500"
                      : "border-l-yellow-500"
                  }`}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.5 + idx * 0.1, duration: 0.3 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Badge
                      variant="outline"
                      className={
                        rec.priority === "high"
                          ? "border-pink-500/40 text-pink-400 text-[10px] px-1.5 py-0"
                          : "border-yellow-500/40 text-yellow-400 text-[10px] px-1.5 py-0"
                      }
                    >
                      {rec.priority}
                    </Badge>
                    <p className="text-sm text-[#e2e8f0] font-medium">
                      {rec.title}
                    </p>
                  </div>
                  <p className="text-xs text-[#94a3b8] leading-relaxed">
                    {rec.description}
                  </p>
                  <p className="text-[10px] text-[#3b82f6] mt-1.5 font-medium">
                    → {rec.action}
                  </p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* ═══ Row 4: Investigation Queue (60%) + Risk Alerts (40%) */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Investigation Queue */}
          <motion.div
            className="glass-card p-4 md:col-span-3"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <Clock className="h-4 w-4 text-[#3b82f6]" />
              <h3 className="text-sm font-semibold text-[#e2e8f0] tracking-wider">
                INVESTIGATION QUEUE
              </h3>
            </div>
            <div className="max-h-[320px] overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-[#2a3550] hover:bg-transparent">
                    <TableHead className="text-[#94a3b8] text-xs">
                      FIR ID
                    </TableHead>
                    <TableHead className="text-[#94a3b8] text-xs">
                      Crime Type
                    </TableHead>
                    <TableHead className="text-[#94a3b8] text-xs">
                      District
                    </TableHead>
                    <TableHead className="text-[#94a3b8] text-xs text-center">
                      Days
                    </TableHead>
                    <TableHead className="text-[#94a3b8] text-xs text-right">
                      Priority
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {investigationQueue.slice(0, 10).map((item) => (
                    <TableRow
                      key={item.firId}
                      className="border-[#2a3550]/50 hover:bg-[#0d1424]"
                    >
                      <TableCell className="text-[#3b82f6] font-mono text-xs">
                        {item.firId}
                      </TableCell>
                      <TableCell className="text-[#e2e8f0] text-xs">
                        {item.crimeType}
                      </TableCell>
                      <TableCell className="text-[#94a3b8] text-xs">
                        {item.district}
                      </TableCell>
                      <TableCell className="text-[#e2e8f0] text-xs text-center">
                        {item.daysOpen}
                      </TableCell>
                      <TableCell className="text-right">
                        <PriorityBadge score={item.priority} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </motion.div>

          {/* Risk Alerts */}
          <motion.div
            className="glass-card p-4 md:col-span-2"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7, duration: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <ShieldAlert className="h-4 w-4 text-red-400" />
              <h3 className="text-sm font-semibold text-[#e2e8f0] tracking-wider">
                RISK ALERTS
              </h3>
            </div>
            <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
              {riskAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`rounded-lg p-3 border-l-2 ${
                    alert.risk >= 90
                      ? "bg-red-500/5 border-l-red-500"
                      : "bg-[#0d1424] border-l-orange-500/60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {alert.risk >= 90 && (
                      <span className="relative flex h-2 w-2 shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
                      </span>
                    )}
                    <p className="text-sm text-[#e2e8f0] font-medium truncate">
                      {alert.name}
                    </p>
                    <span className="ml-auto text-xs font-mono font-bold text-red-400 shrink-0">
                      {alert.risk}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-[#94a3b8]">
                    <span>{alert.activeCases} active case{alert.activeCases > 1 ? "s" : ""}</span>
                    <span className="text-[#475569]">•</span>
                    <span>{alert.prior_firs} prior FIRs</span>
                  </div>
                </div>
              ))}
              {riskAlerts.length === 0 && (
                <p className="text-xs text-[#64748b] text-center py-6">
                  No critical risk alerts at this time
                </p>
              )}
            </div>
          </motion.div>
        </div>

        {/* ═══ Row 5: High Risk Accused Table ═════════════════════ */}
        <motion.div
          className="glass-card p-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
        >
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4 tracking-wide">
            High Risk Accused
          </h3>
          <div className="max-h-96 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-[#2a3550] hover:bg-transparent">
                  <TableHead className="text-[#94a3b8]">Name</TableHead>
                  <TableHead className="text-[#94a3b8]">Age</TableHead>
                  <TableHead className="text-[#94a3b8]">Gang</TableHead>
                  <TableHead className="text-[#94a3b8]">Risk Score</TableHead>
                  <TableHead className="text-[#94a3b8]">Prior FIRs</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {highRiskAccused.map((a) => (
                  <TableRow
                    key={a.id}
                    className="border-[#2a3550] hover:bg-[#0d1424] cursor-pointer"
                    onClick={() => {
                      setSelectedAccusedId(a.id);
                      setView("accused");
                    }}
                  >
                    <TableCell className="text-[#e2e8f0] font-medium text-[#3b82f6] hover:underline">
                      {a.name}
                    </TableCell>
                    <TableCell className="text-[#94a3b8]">{a.age}</TableCell>
                    <TableCell className="text-[#94a3b8]">
                      {a.gang ?? (
                        <span className="text-[#475569] italic">Unknown</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <RiskBar score={a.risk} />
                    </TableCell>
                    <TableCell className="text-[#94a3b8]">
                      {a.prior_firs}
                    </TableCell>
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