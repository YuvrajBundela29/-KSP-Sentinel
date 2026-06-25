"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  ShieldAlert,
  Sun,
  CloudRain,
  Cloud,
  Leaf,
  Activity,
  Zap,
  Clock,
  MapPin,
  CheckCircle2,
  FileText,
  Filter,
  BarChart3,
  Calendar,
  Target,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { loadCrimeData } from "@/lib/data";
import {
  generateForecasts,
  generateEarlyWarnings,
  analyzeSeasonalTrends,
} from "@/lib/intelligence";
import type { ForecastResult, EarlyWarningAlert, SeasonalTrend } from "@/lib/intelligence";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import LoadingSpinner from "@/components/ksp/LoadingSpinner";

// ─── Constants ──────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SEASON_ICONS: Record<string, React.ComponentType<any>> = {
  Winter: Cloud,
  Summer: Sun,
  Monsoon: CloudRain,
  "Post-Monsoon": Leaf,
};

const SEASON_COLORS: Record<string, string> = {
  Winter: "#60a5fa",
  Summer: "#fbbf24",
  Monsoon: "#6366f1",
  "Post-Monsoon": "#34d399",
};

const TYPE_FILTERS: Array<{ key: EarlyWarningAlert["type"]; label: string }> = [
  { key: "repeat_crime", label: "Repeat Crime" },
  { key: "gang_activity", label: "Gang Activity" },
  { key: "emerging_hotspot", label: "Emerging Hotspot" },
  { key: "escalation", label: "Escalation" },
  { key: "financial_anomaly", label: "Financial Anomaly" },
  { key: "pattern_shift", label: "Pattern Shift" },
];

const SEVERITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

// ─── Helpers ────────────────────────────────────────────────────

function formatTime(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
  } catch {
    return iso;
  }
}

function trendIcon(trend: ForecastResult["trend"]) {
  if (trend === "rising") return <TrendingUp className="w-4 h-4 text-[#fbbf24]" />;
  if (trend === "declining") return <TrendingDown className="w-4 h-4 text-[#22d3ee]" />;
  return <Minus className="w-4 h-4 text-[#3d4659]" />;
}

function trendColor(trend: ForecastResult["trend"]): string {
  if (trend === "rising") return "text-[#fbbf24]";
  if (trend === "declining") return "text-[#22d3ee]";
  return "text-[#34d399]";
}

function severityBadge(severity: EarlyWarningAlert["severity"]) {
  const styles: Record<string, string> = {
    critical: "bg-[#f87171]/20 text-red-300 border-[rgba(248,113,113,0.15)] animate-pulse",
    high: "bg-[#fbbf24]/20 text-amber-300 border-[rgba(251,191,36,0.15)]",
    medium: "bg-[#22d3ee]/20 text-blue-300 border-[rgba(34,211,238,0.15)]",
    low: "bg-[#3d4659]/20 text-[#8b97b0] border-[#3d4659]/30",
  };
  return styles[severity] || styles.low;
}

// ─── Sub-components ─────────────────────────────────────────────

function ForecastCard({ forecast, index }: { forecast: ForecastResult; index: number }) {
  return (
    <motion.div
      className="glass-card p-4 flex flex-col gap-3"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            forecast.trend === "rising" ? "bg-[#fbbf24]/15" :
            forecast.trend === "declining" ? "bg-[#22d3ee]/15" : "bg-[#34d399]/15"
          }`}>
            {trendIcon(forecast.trend)}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#f1f5f9]">{forecast.metric}</h4>
            <p className="text-[11px] text-[#5a657a]">{forecast.timeframe}</p>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className={`text-lg font-bold tabular-nums ${trendColor(forecast.trend)}`}>
            {forecast.changePercent >= 0 ? "+" : ""}{forecast.changePercent.toFixed(1)}%
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs">
        <div>
          <span className="text-[#5a657a]">Current: </span>
          <span className="text-[#f1f5f9] font-medium tabular-nums">{forecast.current}</span>
        </div>
        <div>
          <span className="text-[#5a657a]">Predicted: </span>
          <span className={`font-medium tabular-nums ${trendColor(forecast.trend)}`}>{forecast.predicted}</span>
        </div>
      </div>

      {/* Confidence Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-[#5a657a]">Confidence</span>
          <span className="text-[11px] text-[#8b97b0] tabular-nums">{forecast.confidence}%</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <motion.div
            className="h-full rounded-full"
            style={{
              backgroundColor: forecast.confidence >= 80 ? "#34d399" : forecast.confidence >= 60 ? "#fbbf24" : "#f87171",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${forecast.confidence}%` }}
            transition={{ duration: 0.5, delay: index * 0.04 }}
          />
        </div>
      </div>

      {/* Contributing Factors */}
      {forecast.factors.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {forecast.factors.map((f, i) => (
            <Badge
              key={i}
              variant="outline"
              className="text-[10px] px-2 py-0 bg-white/[0.03] text-[#8b97b0] border-white/10 font-normal"
            >
              {f}
            </Badge>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function EarlyWarningCard({ alert, index }: { alert: EarlyWarningAlert; index: number }) {
  const [actionsChecked, setActionsChecked] = useState<Record<number, boolean>>({});

  const toggleAction = (idx: number) => {
    setActionsChecked((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <motion.div
      className={`glass-card p-5 border-l-2 ${
        alert.severity === "critical" ? "border-l-red-500" :
        alert.severity === "high" ? "border-l-amber-500" :
        alert.severity === "medium" ? "border-l-blue-500" : "border-l-[#3d4659]"
      }`}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            alert.severity === "critical" ? "bg-[#f87171]/15" :
            alert.severity === "high" ? "bg-[#fbbf24]/15" : "bg-[#22d3ee]/15"
          }`}>
            {alert.severity === "critical" ? (
              <Zap className="w-4 h-4 text-[#f87171]" />
            ) : (
              <AlertTriangle className={`w-4 h-4 ${
                alert.severity === "high" ? "text-[#fbbf24]" : "text-[#22d3ee]"
              }`} />
            )}
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#f1f5f9]">{alert.title}</h4>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant="outline" className={`text-[10px] px-1.5 py-0 border-current/20 ${severityBadge(alert.severity)}`}>
                {alert.severity}
              </Badge>
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/[0.03] text-[#8b97b0] border-white/10">
                {alert.type.replace(/_/g, " ")}
              </Badge>
            </div>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-[#5a657a]">Confidence</p>
          <p className="text-sm font-bold text-[#f1f5f9] tabular-nums">{alert.confidence}%</p>
        </div>
      </div>

      {/* Description & Location */}
      <p className="text-xs text-[#8b97b0] leading-relaxed mb-3">{alert.description}</p>
      <div className="flex flex-wrap items-center gap-3 mb-3 text-xs">
        <span className="flex items-center gap-1 text-[#8b97b0]">
          <MapPin className="w-3 h-3 text-[#5a657a]" /> {alert.location}
        </span>
        <span className="flex items-center gap-1 text-[#8b97b0]">
          <Clock className="w-3 h-3 text-[#5a657a]" /> {formatTime(alert.detectedAt)}
        </span>
      </div>

      {/* Predicted Impact */}
      <div className="bg-white/[0.03] rounded-lg p-3 mb-3 border border-white/[0.05]">
        <p className="text-[10px] uppercase tracking-wider text-[#5a657a] mb-1">Predicted Impact</p>
        <p className="text-xs text-[#f1f5f9]">{alert.predictedImpact}</p>
      </div>

      {/* Recommended Actions Checklist */}
      {alert.recommendedActions.length > 0 && (
        <div className="mb-3">
          <p className="text-[10px] uppercase tracking-wider text-[#5a657a] mb-2">Recommended Actions</p>
          <div className="space-y-1.5">
            {alert.recommendedActions.map((action, idx) => (
              <label
                key={idx}
                className="flex items-start gap-2.5 cursor-pointer group"
                onClick={() => toggleAction(idx)}
              >
                <Checkbox
                  checked={!!actionsChecked[idx]}
                  className="mt-0.5 data-[state=checked]:bg-[#34d399] data-[state=checked]:border-emerald-500"
                />
                <span className={`text-xs leading-relaxed transition-colors ${
                  actionsChecked[idx] ? "text-[#3d4659] line-through" : "text-[#8b97b0] group-hover:text-[#f1f5f9]"
                }`}>
                  {action}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Supporting FIRs */}
      {alert.supportingFIRs.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <FileText className="w-3 h-3 text-[#5a657a]" />
          {alert.supportingFIRs.map((fir) => (
            <button
              key={fir}
              className="text-[10px] px-2 py-0.5 rounded-md bg-[#22d3ee]/10 text-blue-300 border border-blue-500/20 hover:bg-[#22d3ee]/20 transition-colors"
              onClick={() => {
                const store = useAppStore.getState();
                store.setSelectedFirId(fir);
                store.setView("dm-fir");
              }}
            >
              {fir}
            </button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

function SeasonCard({ trend }: { trend: SeasonalTrend }) {
  const IconComponent = SEASON_ICONS[trend.season] || BarChart3;
  const color = SEASON_COLORS[trend.season] || "#22d3ee";
  const maxCrimeCount = Math.max(...trend.topCrimeTypes.map((c) => c.count), 1);

  return (
    <motion.div
      className="glass-card p-5 flex flex-col"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
    >
      {/* Season Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${color}15` }}>
            <IconComponent className="w-[18px] h-[18px]" style={{ color }} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-[#f1f5f9]">{trend.season}</h4>
            <p className="text-[10px] text-[#5a657a]">{trend.months.join(", ")}</p>
          </div>
        </div>
        {trend.anomaly && (
          <Badge className="bg-[#f87171]/20 text-red-300 text-[10px] animate-pulse gap-1">
            <AlertTriangle className="w-3 h-3" /> Anomaly
          </Badge>
        )}
      </div>

      {/* Total Crimes */}
      <div className="mb-4">
        <p className="text-2xl font-bold tabular-nums" style={{ color }}>{trend.totalCrimes}</p>
        <p className="text-[11px] text-[#5a657a]">Total Crimes</p>
      </div>

      {/* Top Crime Types Mini Bar Chart */}
      <div className="space-y-2.5 mb-4">
        {trend.topCrimeTypes.slice(0, 3).map((ct, i) => (
          <div key={ct.type}>
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[11px] text-[#8b97b0] truncate mr-2">{ct.type}</span>
              <span className="text-[11px] text-[#f1f5f9] font-medium tabular-nums shrink-0">{ct.count}</span>
            </div>
            <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ backgroundColor: color, opacity: 1 - i * 0.25 }}
                initial={{ width: 0 }}
                animate={{ width: `${(ct.count / maxCrimeCount) * 100}%` }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* Anomaly Description */}
      {trend.anomaly && trend.anomalyDescription && (
        <div className="mt-auto pt-3 border-t border-white/[0.05]">
          <p className="text-[11px] text-amber-300/80 leading-relaxed">
            <AlertTriangle className="w-3 h-3 inline mr-1" />
            {trend.anomalyDescription}
          </p>
        </div>
      )}

      {/* Year-over-Year */}
      {trend.yearOverYear.length > 1 && (
        <div className="mt-auto pt-3 border-t border-white/[0.05]">
          <p className="text-[10px] uppercase tracking-wider text-[#5a657a] mb-1.5">Year-over-Year</p>
          <div className="flex items-center gap-2">
            {trend.yearOverYear.map((yoy) => (
              <div key={yoy.year} className="flex-1 bg-white/[0.03] rounded-lg p-2 text-center">
                <p className="text-[10px] text-[#5a657a]">{yoy.year}</p>
                <p className="text-xs font-semibold text-[#f1f5f9] tabular-nums">{yoy.count}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export default function CrimeForecasting() {
  const { crimeData, setCrimeData, dataLoading, setDataLoading } = useAppStore();
  const [forecasts, setForecasts] = useState<ForecastResult[]>([]);
  const [warnings, setWarnings] = useState<EarlyWarningAlert[]>([]);
  const [seasonal, setSeasonal] = useState<SeasonalTrend[]>([]);
  const [localLoading, setLocalLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set());

  // Load data
  useEffect(() => {
    if (crimeData) {
      setLocalLoading(false);
      return;
    }
    let cancelled = false;
    setDataLoading(true);
    loadCrimeData()
      .then((data) => {
        if (!cancelled) {
          setCrimeData(data);
          setLocalLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLocalLoading(false);
      })
      .finally(() => {
        if (!cancelled) setDataLoading(false);
      });
    return () => { cancelled = true; };
  }, [crimeData, setCrimeData, setDataLoading]);

  // Run intelligence functions
  useEffect(() => {
    if (!crimeData) return;
    setForecasts(generateForecasts(crimeData));
    setWarnings(generateEarlyWarnings(crimeData));
    setSeasonal(analyzeSeasonalTrends(crimeData));
  }, [crimeData]);

  // Compute stats
  const stats = useMemo(() => {
    const criticalCount = warnings.filter((w) => w.severity === "critical").length;
    const highCount = warnings.filter((w) => w.severity === "high").length;
    const mediumCount = warnings.filter((w) => w.severity === "medium").length;
    const risingCount = forecasts.filter((f) => f.trend === "rising").length;
    const avgConfidence = forecasts.length > 0
      ? Math.round(forecasts.reduce((s, f) => s + f.confidence, 0) / forecasts.length)
      : 0;
    return {
      activeWarnings: { critical: criticalCount, high: highCount, medium: mediumCount },
      forecastAccuracy: avgConfidence,
      seasonsAnalyzed: seasonal.length,
      trendingUp: risingCount,
    };
  }, [forecasts, warnings, seasonal]);

  // Sort forecasts by severity (rising > stable > declining)
  const sortedForecasts = useMemo(() => {
    return [...forecasts].sort((a, b) => {
      const order = { rising: 0, stable: 1, declining: 2 };
      return order[a.trend] - order[b.trend];
    });
  }, [forecasts]);

  // Filter and sort warnings
  const filteredWarnings = useMemo(() => {
    let result = warnings;
    if (typeFilter.size > 0) {
      result = result.filter((w) => typeFilter.has(w.type));
    }
    return [...result].sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }, [warnings, typeFilter]);

  const toggleTypeFilter = (type: string) => {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const isLoading = dataLoading || localLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-[#22d3ee]/20 flex items-center justify-center">
            <BarChart3 className="w-4 h-4 text-[#22d3ee]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#f1f5f9]">Crime Forecasting</h2>
            <p className="text-xs text-[#5a657a]">AI-powered predictions and early warning system</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-white/[0.03]" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-xl bg-white/[0.03]" />
      </div>
    );
  }

  if (!crimeData) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
          <BarChart3 className="w-8 h-8 text-[#3d4659]" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-[#8b97b0]">No Forecasting Data</h3>
          <p className="text-sm text-[#5a657a] mt-1">Import crime data to generate forecasts and early warnings</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#22d3ee]/20 flex items-center justify-center">
          <BarChart3 className="w-4 h-4 text-[#22d3ee]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#f1f5f9]">Crime Forecasting</h2>
          <p className="text-xs text-[#5a657a]">AI-powered predictions and early warning system</p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Active Warnings */}
        <motion.div
          className="glass-card p-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-[#f87171]" />
            <p className="text-[11px] text-[#5a657a] uppercase tracking-wider font-medium">Active Warnings</p>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-[#f1f5f9] tabular-nums">{warnings.length}</span>
          </div>
          <div className="flex gap-2 mt-2">
            {stats.activeWarnings.critical > 0 && (
              <Badge className="bg-[#f87171]/20 text-red-300 text-[10px]">{stats.activeWarnings.critical} critical</Badge>
            )}
            {stats.activeWarnings.high > 0 && (
              <Badge className="bg-[#fbbf24]/20 text-amber-300 text-[10px]">{stats.activeWarnings.high} high</Badge>
            )}
            {stats.activeWarnings.medium > 0 && (
              <Badge className="bg-[#22d3ee]/20 text-blue-300 text-[10px]">{stats.activeWarnings.medium} medium</Badge>
            )}
          </div>
        </motion.div>

        {/* Forecast Accuracy */}
        <motion.div
          className="glass-card p-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.06 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-4 h-4 text-[#34d399]" />
            <p className="text-[11px] text-[#5a657a] uppercase tracking-wider font-medium">Forecast Accuracy</p>
          </div>
          <span className="text-2xl font-bold text-[#34d399] tabular-nums">{stats.forecastAccuracy}%</span>
          <div className="mt-2 h-1.5 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-[#34d399]"
              initial={{ width: 0 }}
              animate={{ width: `${stats.forecastAccuracy}%` }}
              transition={{ duration: 0.8, delay: 0.2 }}
            />
          </div>
        </motion.div>

        {/* Seasons Analyzed */}
        <motion.div
          className="glass-card p-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-4 h-4 text-[#22d3ee]" />
            <p className="text-[11px] text-[#5a657a] uppercase tracking-wider font-medium">Seasons Analyzed</p>
          </div>
          <span className="text-2xl font-bold text-[#22d3ee] tabular-nums">{stats.seasonsAnalyzed}</span>
          <p className="text-[11px] text-[#5a657a] mt-1">of 4 seasons</p>
        </motion.div>

        {/* Trending Up */}
        <motion.div
          className="glass-card p-4"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18 }}
        >
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="w-4 h-4 text-[#fbbf24]" />
            <p className="text-[11px] text-[#5a657a] uppercase tracking-wider font-medium">Trending Up</p>
          </div>
          <span className="text-2xl font-bold text-[#fbbf24] tabular-nums">{stats.trendingUp}</span>
          <p className="text-[11px] text-[#5a657a] mt-1">of {forecasts.length} metrics</p>
        </motion.div>
      </div>

      {/* Section 1: Crime Forecasts */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-1 h-5 rounded-full bg-[#22d3ee]" />
          <h3 className="text-sm font-semibold text-[#f1f5f9] tracking-wide">Crime Forecasts</h3>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/[0.03] text-[#8b97b0] border-white/10">
            {forecasts.length} metrics
          </Badge>
        </div>
        {sortedForecasts.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {sortedForecasts.map((f, i) => (
              <ForecastCard key={f.metric} forecast={f} index={i} />
            ))}
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <Activity className="w-8 h-8 text-[#3d4659] mx-auto mb-2" />
            <p className="text-sm text-[#5a657a]">Insufficient data to generate forecasts</p>
          </div>
        )}
      </div>

      {/* Section 2: Early Warning Alerts */}
      <div>
        <div className="flex items-center gap-2.5 mb-4 flex-wrap">
          <div className="w-1 h-5 rounded-full bg-[#f87171]" />
          <h3 className="text-sm font-semibold text-[#f1f5f9] tracking-wide">Early Warning Alerts</h3>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/[0.03] text-[#8b97b0] border-white/10">
            {filteredWarnings.length} alerts
          </Badge>

          {/* Type Filters */}
          <div className="flex items-center gap-1.5 ml-auto flex-wrap">
            <Filter className="w-3.5 h-3.5 text-[#5a657a]" />
            {TYPE_FILTERS.map((tf) => (
              <button
                key={tf.key}
                onClick={() => toggleTypeFilter(tf.key)}
                className={`text-[10px] px-2 py-0.5 rounded-md border transition-colors ${
                  typeFilter.has(tf.key)
                    ? "bg-[#22d3ee]/20 text-blue-300 border-[rgba(34,211,238,0.15)]"
                    : "bg-white/[0.03] text-[#5a657a] border-white/10 hover:text-[#8b97b0]"
                }`}
              >
                {tf.label}
              </button>
            ))}
            {typeFilter.size > 0 && (
              <button
                onClick={() => setTypeFilter(new Set())}
                className="text-[10px] text-[#22d3ee] hover:text-blue-300 ml-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        {filteredWarnings.length > 0 ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredWarnings.map((w, i) => (
              <EarlyWarningCard key={w.id} alert={w} index={i} />
            ))}
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <ShieldAlert className="w-8 h-8 text-[#3d4659] mx-auto mb-2" />
            <p className="text-sm text-[#5a657a]">
              {typeFilter.size > 0 ? "No warnings match the selected filters" : "No early warning alerts detected"}
            </p>
          </div>
        )}
      </div>

      {/* Section 3: Seasonal Trends */}
      <div>
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-1 h-5 rounded-full bg-[#34d399]" />
          <h3 className="text-sm font-semibold text-[#f1f5f9] tracking-wide">Seasonal Trends</h3>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-white/[0.03] text-[#8b97b0] border-white/10">
            {seasonal.length} seasons
          </Badge>
        </div>
        {seasonal.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {seasonal.map((trend) => (
              <SeasonCard key={trend.season} trend={trend} />
            ))}
          </div>
        ) : (
          <div className="glass-card p-8 text-center">
            <Calendar className="w-8 h-8 text-[#3d4659] mx-auto mb-2" />
            <p className="text-sm text-[#5a657a]">Insufficient temporal data for seasonal analysis</p>
          </div>
        )}
      </div>
    </div>
  );
}