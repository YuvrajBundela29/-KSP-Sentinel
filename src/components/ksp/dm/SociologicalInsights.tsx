"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users,
  TrendingUp,
  ShieldAlert,
  Activity,
  MapPin,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { loadCrimeData } from "@/lib/data";
import { analyzeSociologicalPatterns } from "@/lib/intelligence";
import type { DemographicInsight } from "@/lib/intelligence";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip as ShadTooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ui/tooltip";
import LoadingSpinner from "@/components/ksp/LoadingSpinner";

// ─── Constants ──────────────────────────────────────────────────
const TAB_LABELS: Record<string, string> = {
  "Victim Age Distribution": "Age Analysis",
  "Gender Analysis": "Gender Analysis",
  "Occupation Profile": "Occupation Profile",
  "Offender Demographics": "Offender Demographics",
  "District Profile": "District Profile",
};

const SEVERITY_COLORS = {
  high: { border: "border-l-red-500", bg: "bg-[#f87171]/10", text: "text-[#f87171]", badge: "bg-[#f87171]/20 text-red-300" },
  medium: { border: "border-l-amber-500", bg: "bg-[#fbbf24]/10", text: "text-[#fbbf24]", badge: "bg-[#fbbf24]/20 text-amber-300" },
  low: { border: "border-l-emerald-500", bg: "bg-[#34d399]/10", text: "text-[#34d399]", badge: "bg-[#34d399]/20 text-emerald-300" },
} as const;

const STRENGTH_COLORS = {
  strong: "bg-[#f87171]/20 text-red-300 border-[rgba(248,113,113,0.15)]",
  moderate: "bg-[#fbbf24]/20 text-amber-300 border-[rgba(251,191,36,0.15)]",
  weak: "bg-[#34d399]/20 text-emerald-300 border-[rgba(52,211,153,0.15)]",
} as const;

const BAR_COLORS = ["#22d3ee", "#818cf8", "#818cf8", "#06b6d4", "#22d3ee", "#34d399", "#fbbf24", "#f87171", "#ec4899", "#84cc16"];

// ─── Sub-components ─────────────────────────────────────────────

function HorizontalBarChart({ data }: { data: DemographicInsight["breakdown"] }) {
  return (
    <div className="space-y-3">
      {data.map((item, i) => (
        <ShadTooltip key={item.label}>
          <TooltipTrigger asChild>
            <div className="group cursor-pointer">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-[#f1f5f9] font-medium">{item.label}</span>
                <span className="text-sm text-[#8b97b0] tabular-nums">{item.count} <span className="text-[#5a657a]">({item.percentage}%)</span></span>
              </div>
              <div className="h-7 bg-white/5 rounded-md overflow-hidden">
                <motion.div
                  className="h-full rounded-md"
                  style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                  initial={{ width: 0 }}
                  animate={{ width: `${item.percentage}%` }}
                  transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                />
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="right" className="!bg-[rgba(15,21,36,0.95)] !border-[rgba(255,255,255,0.06)] !p-0">
            <div className="p-3 min-w-[180px]">
              <p className="text-sm font-semibold text-[#f1f5f9]">{item.label}</p>
              <p className="text-xs text-[#8b97b0] mt-1">
                Count: <span className="text-[#f1f5f9] font-medium">{item.count}</span> ({item.percentage}%)
              </p>
              {item.crimeTypes.length > 0 && (
                <div className="mt-2 border-t border-white/[0.06] pt-2">
                  <p className="text-[10px] uppercase tracking-wider text-[#5a657a] mb-1">Top Crime Types</p>
                  {item.crimeTypes.map((ct, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-xs text-[#8b97b0]">
                      <span className="w-1 h-1 rounded-full bg-blue-400" />
                      {ct}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TooltipContent>
        </ShadTooltip>
      ))}
    </div>
  );
}

function RiskFactorCard({ factor, index }: { factor: DemographicInsight["riskFactors"][0]; index: number }) {
  const colors = SEVERITY_COLORS[factor.severity];
  return (
    <motion.div
      className={`border-l-2 ${colors.border} bg-white/[0.03] backdrop-blur-sm rounded-xl p-4 border border-white/[0.06]`}
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.08 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <h4 className="text-sm font-semibold text-[#f1f5f9]">{factor.factor}</h4>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${colors.badge} border-current/20`}>
              {factor.severity}
            </Badge>
          </div>
          <p className="text-xs text-[#8b97b0] leading-relaxed">{factor.description}</p>
        </div>
      </div>
      {factor.supportingData && (
        <div className="mt-3 pt-2.5 border-t border-white/[0.05]">
          <p className="text-[11px] text-[#5a657a]">
            <span className="text-[#8b97b0] font-medium">Supporting Data: </span>
            {factor.supportingData}
          </p>
        </div>
      )}
    </motion.div>
  );
}

function SocialCorrelationCard({ correlation }: { correlation: DemographicInsight["socialCorrelations"][0] }) {
  const isPositive = correlation.correlation.toLowerCase().includes("positive");
  const strengthClass = STRENGTH_COLORS[correlation.strength];
  return (
    <div className="bg-white/[0.03] rounded-xl p-4 border border-white/[0.06]">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-[#f1f5f9]">{correlation.indicator}</span>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${strengthClass} border-current/20`}>
            {correlation.strength}
          </Badge>
          <span className={`flex items-center gap-0.5 text-xs font-medium ${isPositive ? "text-[#f87171]" : "text-[#34d399]"}`}>
            {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            {correlation.correlation}
          </span>
        </div>
      </div>
      <p className="text-xs text-[#8b97b0] leading-relaxed">{correlation.description}</p>
    </div>
  );
}

function InsightTabContent({ insight }: { insight: DemographicInsight }) {
  return (
    <div className="space-y-6">
      {/* Horizontal Bar Chart */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4 tracking-wide flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#22d3ee]" />
          Distribution Breakdown
        </h3>
        <HorizontalBarChart data={insight.breakdown} />
      </div>

      {/* Risk Factors */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4 tracking-wide flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-[#fbbf24]" />
          Risk Factors
        </h3>
        <div className="grid gap-3">
          <AnimatePresence>
            {insight.riskFactors.map((rf, i) => (
              <RiskFactorCard key={rf.factor} factor={rf} index={i} />
            ))}
          </AnimatePresence>
          {insight.riskFactors.length === 0 && (
            <p className="text-sm text-[#5a657a] italic">No risk factors identified for this category.</p>
          )}
        </div>
      </div>

      {/* Social Correlations */}
      <div className="glass-card p-5">
        <h3 className="text-sm font-semibold text-[#f1f5f9] mb-4 tracking-wide flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-[#34d399]" />
          Social Correlations
        </h3>
        <div className="grid gap-3 md:grid-cols-2">
          {insight.socialCorrelations.map((sc) => (
            <SocialCorrelationCard key={sc.indicator} correlation={sc} />
          ))}
          {insight.socialCorrelations.length === 0 && (
            <p className="text-sm text-[#5a657a] italic col-span-2">No social correlations identified for this category.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export default function SociologicalInsights() {
  const { crimeData, setCrimeData, dataLoading, setDataLoading } = useAppStore();
  const [insights, setInsights] = useState<DemographicInsight[]>([]);
  const [activeTab, setActiveTab] = useState("0");
  const [localLoading, setLocalLoading] = useState(true);

  // Load data if needed
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

  // Analyze patterns when data is available
  useEffect(() => {
    if (!crimeData) return;
    const result = analyzeSociologicalPatterns(crimeData);
    setInsights(result);
  }, [crimeData]);

  // Compute summary stats from insights
  const summaryStats = useMemo(() => {
    if (insights.length === 0) return null;

    // Total victims analyzed
    const ageInsight = insights.find((i) => i.category === "Victim Age Distribution");
    const totalVictims = ageInsight ? ageInsight.breakdown.reduce((s, b) => s + b.count, 0) : 0;

    // Most vulnerable age group
    const topAge = ageInsight?.breakdown.sort((a, b) => b.count - a.count)[0]?.label ?? "N/A";

    // Gender split
    const genderInsight = insights.find((i) => i.category === "Gender Analysis");
    const malePct = genderInsight?.breakdown.find((b) => b.label.toLowerCase().includes("male"))?.percentage ?? 0;
    const femalePct = genderInsight?.breakdown.find((b) => b.label.toLowerCase().includes("female"))?.percentage ?? 0;
    const genderSplit = malePct > 0 || femalePct > 0 ? `${malePct}%M / ${femalePct}%F` : "N/A";

    // Top targeted occupation
    const occInsight = insights.find((i) => i.category === "Occupation Profile");
    const topOcc = occInsight?.breakdown.sort((a, b) => b.count - a.count)[0]?.label ?? "N/A";

    // Highest crime district
    const distInsight = insights.find((i) => i.category === "District Profile");
    const topDist = distInsight?.breakdown.sort((a, b) => b.count - a.count)[0]?.label ?? "N/A";

    return { totalVictims, topAge, genderSplit, topOcc, topDist };
  }, [insights]);

  const isLoading = dataLoading || localLoading;

  if (isLoading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-8 h-8 rounded-lg bg-[#22d3ee]/20 flex items-center justify-center">
            <Users className="w-4 h-4 text-[#22d3ee]" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-[#f1f5f9]">Sociological Insights</h2>
            <p className="text-xs text-[#5a657a]">Demographic analysis of crime patterns</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-white/[0.03]" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-xl bg-white/[0.03]" />
      </div>
    );
  }

  if (!crimeData || insights.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
          <Users className="w-8 h-8 text-[#3d4659]" />
        </div>
        <div className="text-center">
          <h3 className="text-lg font-semibold text-[#8b97b0]">No Sociological Data Available</h3>
          <p className="text-sm text-[#5a657a] mt-1">Import crime data to generate sociological insights</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#22d3ee]/20 flex items-center justify-center">
          <Users className="w-4 h-4 text-[#22d3ee]" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-[#f1f5f9]">Sociological Insights</h2>
          <p className="text-xs text-[#5a657a]">Demographic analysis of crime patterns across Karnataka</p>
        </div>
      </div>

      {/* Summary Stat Cards */}
      {summaryStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[
            { label: "Total Victims Analyzed", value: summaryStats.totalVictims.toLocaleString(), icon: Users, color: "text-[#22d3ee]", bg: "bg-[#22d3ee]/10" },
            { label: "Most Vulnerable Age", value: summaryStats.topAge, icon: ShieldAlert, color: "text-[#f87171]", bg: "bg-[#f87171]/10" },
            { label: "Gender Split", value: summaryStats.genderSplit, icon: Activity, color: "text-[#818cf8]", bg: "bg-[#818cf8]/10" },
            { label: "Top Targeted Occupation", value: summaryStats.topOcc, icon: TrendingUp, color: "text-[#fbbf24]", bg: "bg-[#fbbf24]/10" },
            { label: "Highest Crime District", value: summaryStats.topDist, icon: MapPin, color: "text-[#34d399]", bg: "bg-[#34d399]/10" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              className="glass-card p-4 flex items-center gap-3"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
            >
              <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center shrink-0`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-[11px] text-[#5a657a] uppercase tracking-wider font-medium truncate">{stat.label}</p>
                <p className="text-sm font-bold text-[#f1f5f9] truncate mt-0.5">{stat.value}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Tabbed Insight Panels */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/5 border border-white/10 rounded-xl p-1 h-auto flex-wrap gap-1">
          {insights.map((insight, i) => (
            <TabsTrigger
              key={insight.category}
              value={String(i)}
              className="data-[state=active]:bg-[#22d3ee]/20 data-[state=active]:text-cyan-300 data-[state=active]:border-[rgba(34,211,238,0.15)] text-[#8b97b0] rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            >
              {TAB_LABELS[insight.category] || insight.category}
            </TabsTrigger>
          ))}
        </TabsList>

        {insights.map((insight, i) => (
          <TabsContent key={insight.category} value={String(i)} className="mt-4">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
            >
              <InsightTabContent insight={insight} />
            </motion.div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}