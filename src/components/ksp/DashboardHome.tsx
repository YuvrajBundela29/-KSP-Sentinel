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
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { loadCrimeData } from "@/lib/data";
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

// ─── Severity badge helper ─────────────────────────────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
    medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
    low: "bg-green-500/20 text-green-400 border-green-500/30",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        map[severity] ?? map.low
      }`}
    >
      {severity}
    </span>
  );
}

// ─── Stat card ──────────────────────────────────────────────────────
function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-[#1a2035] border border-[#2a3550] rounded-lg p-4 flex items-center justify-between">
      <div>
        <p className="text-xs text-[#94a3b8] uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-bold text-[#e2e8f0] mt-1">{value}</p>
      </div>
      <div className="h-10 w-10 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-[#3b82f6]" />
      </div>
    </div>
  );
}

// ─── Risk bar ───────────────────────────────────────────────────────
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

// ─── Custom tooltip for the chart ───────────────────────────────────
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
      <p className="text-sm font-semibold text-[#e2e8f0]">{payload[0].value} FIRs</p>
    </div>
  );
}

// ─── Main component ─────────────────────────────────────────────────
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

    // Accused who appear in cases with investigation_status "Arrested"
    const arrestedAccusedIds = new Set<string>();
    firs
      .filter((f) => f.investigation_status === "Arrested")
      .forEach((f) => f.accused.forEach((id) => arrestedAccusedIds.add(id)));
    const arrestedCount = arrestedAccusedIds.size;

    const highRiskCount = accused.filter((a) => a.risk > 80).length;

    const districtCount = districts.length;

    const gangCount = gangs.length;

    return { totalFIRs, activeCases, arrestedCount, highRiskCount, districtCount, gangCount };
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

  // ─── Loading state ──────────────────────────────────────────────
  if (!crimeData || !stats) {
    return <LoadingSpinner message="Loading crime intelligence data..." />;
  }

  return (
    <div className="space-y-6">
      {/* ── Stat Cards ──────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard icon={FileText} label="Total FIRs" value={stats.totalFIRs} />
        <StatCard icon={Search} label="Active Cases" value={stats.activeCases} />
        <StatCard icon={UserX} label="Arrested Accused" value={stats.arrestedCount} />
        <StatCard icon={AlertTriangle} label="High Risk Offenders" value={stats.highRiskCount} />
        <StatCard icon={MapPin} label="Districts Covered" value={stats.districtCount} />
        <StatCard icon={Users} label="Gang Networks" value={stats.gangCount} />
      </div>

      {/* ── Chart + Recent FIRs ─────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Bar Chart */}
        <div className="bg-[#1a2035] border border-[#2a3550] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4">
            FIRs by Crime Type
          </h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
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
                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#3b82f610" }} />
                <Bar
                  dataKey="count"
                  fill="#3b82f6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={40}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent FIRs */}
        <div className="bg-[#1a2035] border border-[#2a3550] rounded-lg p-4">
          <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4">Recent FIRs</h3>
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
                <p className="text-sm text-[#e2e8f0] font-medium">{fir.crime_type}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-[#94a3b8]">
                  <span>{fir.date}</span>
                  <span>•</span>
                  <span>{fir.district}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── High Risk Accused Table ──────────────────────────────── */}
      <div className="bg-[#1a2035] border border-[#2a3550] rounded-lg p-4">
        <h3 className="text-sm font-semibold text-[#e2e8f0] mb-4">
          High Risk Accused
        </h3>
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
                <TableCell className="text-[#94a3b8]">{a.prior_firs}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}