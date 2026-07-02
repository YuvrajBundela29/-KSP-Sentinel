"use client";

import { useEffect, useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { getAccusedById, getFIRsByAccused } from "@/lib/data";
import type { Accused, FIR } from "@/lib/types";
import { generateInvestigationBrief, computeSimilarCrimes } from "@/lib/intelligence";
import type { InvestigationBrief, SimilarCrimeResult } from "@/lib/types";
import LoadingSpinner from "@/components/ksp/LoadingSpinner";
import {
  ArrowLeft,
  User,
  Shield,
  Clock,
  MapPin,
  Car,
  Users,
  FileText,
  Brain,
  Search,
} from "lucide-react";
import { motion } from "framer-motion";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease: [0.4, 0, 0.2, 1] },
  }),
};

function formatINR(amount: number): string {
  const str = Math.abs(amount).toString();
  let lastThree = str.substring(str.length - 3);
  const otherNumbers = str.substring(0, str.length - 3);
  if (otherNumbers !== "") {
    lastThree = "," + lastThree;
  }
  const formatted =
    otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ",") + lastThree;
  return "₹" + (amount < 0 ? "-" : "") + formatted;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function parseTimeHour(timeStr: string): number {
  const match = timeStr.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!match) return 12;
  let h = parseInt(match[1], 10);
  const m = match[2] ? parseInt(match[2], 10) : 0;
  const ampm = match[3];
  if (ampm) {
    if (ampm.toLowerCase() === "pm" && h !== 12) h += 12;
    if (ampm.toLowerCase() === "am" && h === 12) h = 0;
  }
  // If no am/pm and h <= 23, assume 24h format
  if (!ampm && h <= 23) {
    // already in 24h
  }
  return h;
}

function getTimeSlot(hour: number): "morning" | "evening" | "night" {
  if (hour >= 6 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "evening";
  return "night";
}

const severityColors: Record<string, string> = {
  critical: "bg-[#f87171]",
  high: "bg-[#fbbf24]",
  medium: "bg-[#fbbf24]",
  low: "bg-[#34d399]",
};

const severityBadgeStyles: Record<string, React.CSSProperties> = {
  critical: {
    background: "rgba(248, 113, 113, 0.08)",
    color: "var(--critical)",
    borderColor: "rgba(248, 113, 113, 0.2)",
  },
  high: {
    background: "rgba(251, 191, 36, 0.08)",
    color: "var(--warning)",
    borderColor: "rgba(251, 191, 36, 0.2)",
  },
  medium: {
    background: "rgba(251, 191, 36, 0.08)",
    color: "var(--warning)",
    borderColor: "rgba(251, 191, 36, 0.2)",
  },
  low: {
    background: "rgba(52, 211, 153, 0.08)",
    color: "var(--success)",
    borderColor: "rgba(52, 211, 153, 0.2)",
  },
};

const investigationStatusStyles: Record<string, React.CSSProperties> = {
  "Under Investigation": {
    background: "rgba(34, 211, 238, 0.08)",
    color: "var(--primary)",
    borderColor: "rgba(34, 211, 238, 0.2)",
  },
  "Charge Sheet Filed": {
    background: "rgba(52, 211, 153, 0.08)",
    color: "var(--success)",
    borderColor: "rgba(52, 211, 153, 0.2)",
  },
  Closed: {
    background: "rgba(100, 116, 139, 0.08)",
    color: "#94a3b8",
    borderColor: "rgba(100, 116, 139, 0.2)",
  },
  "Trial in Progress": {
    background: "rgba(251, 191, 36, 0.08)",
    color: "var(--warning)",
    borderColor: "rgba(251, 191, 36, 0.2)",
  },
  "Evidence Collection": {
    background: "rgba(129, 140, 248, 0.08)",
    color: "var(--secondary)",
    borderColor: "rgba(129, 140, 248, 0.2)",
  },
};

const defaultStatusStyle: React.CSSProperties = {
  background: "rgba(100, 116, 139, 0.08)",
  color: "#94a3b8",
  borderColor: "rgba(100, 116, 139, 0.2)",
};

function SeverityBadge({ severity }: { severity: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium capitalize"
      style={severityBadgeStyles[severity] ?? severityBadgeStyles.low}
    >
      {severity}
    </span>
  );
}

function GlassBadge({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm"
      style={{
        background: "rgba(255, 255, 255, 0.04)",
        color: "var(--text-primary)",
        borderColor: "rgba(255, 255, 255, 0.1)",
        ...style,
      }}
    >
      {children}
    </span>
  );
}

export default function AccusedProfile() {
  const crimeData = useAppStore((s) => s.crimeData);
  const selectedAccusedId = useAppStore((s) => s.selectedAccusedId);
  const setView = useAppStore((s) => s.setView);
  const accused: Accused | undefined = useMemo(() => {
    if (!crimeData || !selectedAccusedId) return undefined;
    return getAccusedById(crimeData, selectedAccusedId);
  }, [crimeData, selectedAccusedId]);

  const firs: FIR[] = useMemo(() => {
    if (!crimeData || !selectedAccusedId) return [];
    return getFIRsByAccused(crimeData, selectedAccusedId).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [crimeData, selectedAccusedId]);

  const gangName = useMemo(() => {
    if (!crimeData || !accused?.gang) return null;
    const gang = crimeData.gangs.find((g) => g.id === accused.gang);
    return gang?.name ?? null;
  }, [crimeData, accused]);

  // Time of crime analysis
  const timeAnalysis = useMemo(() => {
    const slots = { morning: 0, evening: 0, night: 0 };
    for (const fir of firs) {
      const hour = parseTimeHour(fir.time);
      const slot = getTimeSlot(hour);
      slots[slot]++;
    }
    const total = firs.length || 1;
    let maxSlot: "morning" | "evening" | "night" = "morning";
    if (slots.evening > slots[maxSlot]) maxSlot = "evening";
    if (slots.night > slots[maxSlot]) maxSlot = "night";
    return { slots, percentages: { morning: (slots.morning / total) * 100, evening: (slots.evening / total) * 100, night: (slots.night / total) * 100 }, preferred: maxSlot };
  }, [firs]);

  // Preferred crime type
  const preferredCrimeType = useMemo(() => {
    if (firs.length === 0) return null;
    const counts: Record<string, number> = {};
    for (const fir of firs) {
      counts[fir.crime_type] = (counts[fir.crime_type] || 0) + 1;
    }
    let max = 0;
    let preferred = "";
    for (const [type, count] of Object.entries(counts)) {
      if (count > max) {
        max = count;
        preferred = type;
      }
    }
    return preferred;
  }, [firs]);

  // Unique districts
  const activeDistricts = useMemo(() => {
    const districts = new Set(firs.map((f) => f.district));
    return Array.from(districts);
  }, [firs]);

  // Vehicles used
  const vehiclesUsed = useMemo(() => {
    const vehicleIds = new Set<string>();
    for (const fir of firs) {
      if (fir.vehicle_used) vehicleIds.add(fir.vehicle_used);
    }
    if (vehicleIds.size === 0 || !crimeData) return [];
    return crimeData.vehicles.filter((v) => vehicleIds.has(v.id));
  }, [firs, crimeData]);

  // Gang associates
  const gangAssociates = useMemo(() => {
    if (!crimeData || !accused?.gang) return [];
    const gang = crimeData.gangs.find((g) => g.id === accused.gang);
    if (!gang) return [];
    return gang.members
      .filter((m) => m !== accused.id)
      .map((m) => crimeData.accused.find((a) => a.id === m))
      .filter(Boolean) as Accused[];
  }, [crimeData, accused]);

  // Risk breakdown
  const riskBreakdown = useMemo(() => {
    const priorFIRsCount = firs.length;
    const priorFIRsScore = Math.min(priorFIRsCount * 5, 40);
    const gangMembership = accused?.gang ? "Yes" : "No";
    const gangScore = accused?.gang ? 20 : 0;
    const highCriticalCount = firs.filter(
      (f) => f.severity === "critical" || f.severity === "high"
    ).length;
    const severityScore = highCriticalCount * 10;
    const now = new Date();
    const twelveMonthsAgo = new Date(
      now.getFullYear(),
      now.getMonth() - 12,
      now.getDate()
    );
    const recentCrime = firs.some((f) => new Date(f.date) >= twelveMonthsAgo);
    const recencyScore = recentCrime ? 10 : 0;
    const total = priorFIRsScore + gangScore + severityScore + recencyScore;
    return {
      priorFIRsCount,
      priorFIRsScore,
      gangMembership,
      gangScore,
      highCriticalCount,
      severityScore,
      recentCrime,
      recencyScore,
      total,
    };
  }, [firs, accused]);

  // Financial transactions
  const financialTransactions = useMemo(() => {
    return firs
      .filter((f) => f.financial_transaction)
      .map((f) => ({
        firId: f.fir_id,
        transaction: f.financial_transaction!,
      }));
  }, [firs]);

  // AI Investigation Brief
  const brief = useMemo(() => {
    if (!crimeData || !selectedAccusedId) return null;
    return generateInvestigationBrief(crimeData, selectedAccusedId, "accused");
  }, [crimeData, selectedAccusedId]);

  // Similar Crimes (based on first FIR linked to accused)
  const similarCrimes = useMemo(() => {
    if (!crimeData || !selectedAccusedId) return [];
    const firstFir = crimeData.firs.find(f => f.accused.includes(selectedAccusedId));
    if (!firstFir) return [];
    return computeSimilarCrimes(crimeData, firstFir.fir_id, 4);
  }, [crimeData, selectedAccusedId]);

  // AI Analysis
  const [aiState, setAiState] = useState<{
    loading: boolean;
    error: boolean;
    text: string | null;
    accusedId: string | null;
  }>({ loading: false, error: false, text: null, accusedId: null });

  // Derive display state: show loading when accused changed but fetch hasn't completed yet
  const aiLoading =
    !!accused &&
    (aiState.accusedId !== accused.id || aiState.loading);
  const aiError =
    !aiLoading && aiState.error && aiState.accusedId === selectedAccusedId;
  const aiAnalysis =
    aiState.text && aiState.accusedId === selectedAccusedId
      ? aiState.text
      : null;

  useEffect(() => {
    if (!accused) return;

    const accusedId = accused.id;
    // Set loading state via fetch lifecycle only (in async callback)
    fetch("/api/chat?XTransformPort=3000", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: `Provide a 3-sentence behavioral analysis of ${accused.name} (ID: ${accused.id}). They have ${firs.length} FIRs. Cite specific FIR IDs.`,
        history: [],
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        const response = data?.response ?? data?.content ?? null;
        setAiState({ loading: false, error: !response, text: response, accusedId });
      })
      .catch(() => {
        setAiState({ loading: false, error: true, text: null, accusedId });
      });
  }, [accused, firs.length]);

  // Risk score display helpers
  const riskColor =
    (accused?.risk ?? 0) > 80
      ? "#f87171"
      : (accused?.risk ?? 0) > 60
        ? "#fbbf24"
        : "#34d399";
  const riskLabel =
    (accused?.risk ?? 0) > 80
      ? "HIGH RISK"
      : (accused?.risk ?? 0) > 60
        ? "MODERATE RISK"
        : "LOW RISK";

  // Loading state
  if (!crimeData) {
    return <LoadingSpinner />;
  }

  // No selection state
  if (!selectedAccusedId || !accused) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[60vh]"
        style={{ color: "var(--text-secondary)" }}
      >
        <button
          onClick={() => setView("dashboard")}
          className="flex items-center gap-2 mb-6 px-3 py-2 rounded-lg border transition-all duration-200"
          style={{
            background: "rgba(15, 21, 36, 0.45)",
            backdropFilter: "blur(24px)",
            borderColor: "rgba(255, 255, 255, 0.06)",
            color: "var(--text-secondary)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "rgba(34, 211, 238, 0.15)";
            e.currentTarget.style.color = "#f1f5f9";
            e.currentTarget.style.boxShadow = "0 0 20px rgba(34, 211, 238, 0.06)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)";
            e.currentTarget.style.color = "#8b97b0";
            e.currentTarget.style.boxShadow = "none";
          }}
        >
          <ArrowLeft className="size-4" />
          Back to Dashboard
        </button>
        <User className="size-16 mb-4 opacity-30" />
        <p className="text-lg">Select an accused to view their profile</p>
      </div>
    );
  }

  const circumference = 2 * Math.PI * 50;
  const riskStrokeDash = (accused.risk / 100) * circumference;

  return (
    <div
      className="h-full overflow-y-auto"
      style={{ background: "#050810" }}
    >
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        {/* ── Header Section ── */}
        <motion.div
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <div className="glass-card p-5 sm:p-6 relative overflow-hidden">
            {/* Gradient overlay */}
            <div
              className="absolute inset-0 pointer-events-none rounded-xl"
              style={{
                background: "linear-gradient(135deg, rgba(34, 211, 238, 0.04) 0%, transparent 40%, rgba(129, 140, 248, 0.03) 100%)",
              }}
            />

            <div className="relative flex items-start gap-4">
              {/* Back button */}
              <button
                onClick={() => setView("dashboard")}
                className="shrink-0 mt-1 w-9 h-9 flex items-center justify-center rounded-lg border transition-all duration-200"
                style={{
                  background: "rgba(15, 21, 36, 0.6)",
                  backdropFilter: "blur(16px)",
                  borderColor: "rgba(255, 255, 255, 0.06)",
                  color: "var(--text-secondary)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = "rgba(34, 211, 238, 0.2)";
                  e.currentTarget.style.color = "#22d3ee";
                  e.currentTarget.style.boxShadow = "0 0 24px rgba(34, 211, 238, 0.08)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.06)";
                  e.currentTarget.style.color = "#8b97b0";
                  e.currentTarget.style.boxShadow = "none";
                }}
              >
                <ArrowLeft className="size-4" />
              </button>

              <div className="flex-1 min-w-0">
                {/* Name row */}
                <div className="flex flex-wrap items-center gap-3 mb-4">
                  <h1
                    className="text-2xl sm:text-3xl font-bold tracking-tight"
                    style={{ color: "var(--text-primary)" }}
                  >
                    {accused.name}
                  </h1>
                  <GlassBadge>Age: {accused.age}</GlassBadge>
                  <GlassBadge>{accused.gender}</GlassBadge>
                  {gangName && (
                    <span
                      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-sm"
                      style={{
                        background: "rgba(129, 140, 248, 0.08)",
                        color: "var(--secondary)",
                        borderColor: "rgba(129, 140, 248, 0.2)",
                      }}
                    >
                      <Users className="size-3 mr-1" />
                      {gangName}
                    </span>
                  )}
                </div>

                {/* Risk Score Gauge with glow */}
                <div className="flex items-center gap-5">
                  <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0">
                    <svg
                      viewBox="0 0 120 120"
                      className="w-full h-full"
                      style={{ transform: "rotate(-90deg)" }}
                    >
                      <defs>
                        <filter id="riskGlow">
                          <feGaussianBlur stdDeviation="4" result="blur" />
                          <feComposite in="SourceGraphic" in2="blur" operator="over" />
                        </filter>
                      </defs>
                      {/* Background ring */}
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke="rgba(255, 255, 255, 0.04)"
                        strokeWidth="10"
                      />
                      {/* Progress ring with glow */}
                      <circle
                        cx="60"
                        cy="60"
                        r="50"
                        fill="none"
                        stroke={riskColor}
                        strokeWidth="10"
                        strokeLinecap="round"
                        strokeDasharray={`${riskStrokeDash} ${circumference}`}
                        style={{
                          transition: "stroke-dashoffset 1s ease-out",
                          filter: "url(#riskGlow)",
                        }}
                      />
                    </svg>
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center"
                      style={{ transform: "none" }}
                    >
                      <span
                        className="text-2xl sm:text-3xl font-bold"
                        style={{ color: riskColor }}
                      >
                        {accused.risk}
                      </span>
                      <span
                        className="uppercase tracking-wider"
                        style={{ fontSize: 10, color: "var(--text-secondary)" }}
                      >
                        Score
                      </span>
                    </div>
                  </div>
                  <div>
                    <p
                      className="text-lg font-bold tracking-wide"
                      style={{ color: riskColor }}
                    >
                      {riskLabel}
                    </p>
                    <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
                      Linked to {firs.length} FIR{firs.length !== 1 ? "s" : ""} •{" "}
                      {firs.filter((f) => f.investigation_status !== "Closed").length}{" "}
                      active case
                      {firs.filter((f) => f.investigation_status !== "Closed")
                        .length !== 1
                        ? "s"
                        : ""}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Section 1 — Criminal History Timeline ── */}
        <motion.div
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <div className="glass-card p-5 sm:p-6">
            <h2
              className="text-base font-semibold flex items-center gap-2 mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              <FileText className="size-5" style={{ color: "var(--text-secondary)" }} />
              Criminal History Timeline
            </h2>

            {firs.length === 0 ? (
              <p className="terminal-empty">
                <span className="terminal-empty-prompt">{">"}</span>NO FIR RECORDS FOUND FOR THIS ACCUSED_<span className="terminal-cursor" style={{ marginLeft: 0, height: 14, width: 7 }} />
              </p>
            ) : (
              <div className="relative pl-6 max-h-96 overflow-y-auto space-y-0">
                {/* Vertical timeline line */}
                <div
                  className="absolute left-[9px] top-2 bottom-2 w-[2px]"
                  style={{ background: "rgba(255, 255, 255, 0.06)" }}
                />

                {firs.map((fir) => (
                  <div key={fir.fir_id} className="relative pb-6 last:pb-0">
                    {/* Timeline dot */}
                    <div
                      className={`absolute -left-6 top-1.5 w-4 h-4 rounded-full border-2 ${severityColors[fir.severity] ?? "bg-gray-500"}`}
                      style={{ borderColor: "rgba(5, 8, 16, 0.8)" }}
                    />
                    <div
                      className="rounded-lg p-4"
                      style={{
                        background: "rgba(10, 15, 28, 0.6)",
                        border: "1px solid rgba(255, 255, 255, 0.06)",
                      }}
                    >
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                          {formatDate(fir.date)}
                        </span>
                        <GlassBadge>
                          {fir.crime_type}
                        </GlassBadge>
                        <SeverityBadge severity={fir.severity} />
                        <span
                          className="inline-flex items-center rounded-full border px-2 py-0.5 text-xs"
                          style={
                            investigationStatusStyles[fir.investigation_status] ??
                            defaultStatusStyle
                          }
                        >
                          {fir.investigation_status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <span className="font-mono" style={{ color: "var(--primary)" }}>
                          {fir.fir_id}
                        </span>
                        <span
                          className="flex items-center gap-1"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          <MapPin className="size-3" />
                          {fir.district}
                        </span>
                        <span
                          className="flex items-center gap-1"
                          style={{ color: "var(--text-secondary)" }}
                        >
                          <Clock className="size-3" />
                          {fir.time}
                        </span>
                        <span style={{ color: "var(--text-secondary)" }}>
                          {fir.police_station}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Section 2 — Behavioral Analysis ── */}
        <motion.div
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <div className="glass-card p-5 sm:p-6">
            <h2
              className="text-base font-semibold flex items-center gap-2 mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              <Shield className="size-5" style={{ color: "var(--text-secondary)" }} />
              Behavioral Analysis
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Preferred Time of Crime */}
              <div className="glass-card gradient-cyan p-4 relative overflow-hidden">
                <div
                  className="flex items-center gap-2 mb-3"
                >
                  <Clock className="size-4" style={{ color: "var(--primary)" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    Preferred Time of Crime
                  </span>
                </div>
                {firs.length === 0 ? (
                  <p className="terminal-empty">
                    <span className="terminal-empty-prompt">{">"}</span>NO DATA_<span className="terminal-cursor" style={{ marginLeft: 0, height: 14, width: 7 }} />
                  </p>
                ) : (
                  <div className="space-y-2">
                    {(
                      ["morning", "evening", "night"] as const
                    ).map((slot) => (
                      <div key={slot} className="flex items-center gap-2">
                        <span
                          className="capitalize w-16"
                          style={{ fontSize: 12, color: "var(--text-secondary)" }}
                        >
                          {slot === "morning"
                            ? "Morning"
                            : slot === "evening"
                              ? "Evening"
                              : "Night"}
                          <span
                            className="ml-0.5"
                            style={{ fontSize: 10, opacity: 0.6, color: "var(--text-secondary)" }}
                          >
                            {slot === "morning"
                              ? "6-12"
                              : slot === "evening"
                                ? "12-18"
                                : "18-6"}
                          </span>
                        </span>
                        <div
                          className="flex-1 h-2 rounded-full overflow-hidden"
                          style={{ background: "rgba(255, 255, 255, 0.04)" }}
                        >
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${timeAnalysis.percentages[slot]}%`,
                              background: timeAnalysis.preferred === slot ? "#22d3ee" : "rgba(255, 255, 255, 0.08)",
                              boxShadow: timeAnalysis.preferred === slot ? "0 0 12px rgba(34, 211, 238, 0.3)" : "none",
                            }}
                          />
                        </div>
                        <span
                          className="w-10 text-right"
                          style={{ fontSize: 12, color: "var(--text-secondary)" }}
                        >
                          {timeAnalysis.slots[slot] > 0
                            ? `${Math.round(timeAnalysis.percentages[slot])}%`
                            : "—"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Preferred Crime Type */}
              <div className="glass-card gradient-indigo p-4 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="size-4" style={{ color: "var(--secondary)" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    Preferred Crime Type
                  </span>
                </div>
                {preferredCrimeType ? (
                  <p className="text-sm font-medium" style={{ color: "var(--primary)" }}>
                    {preferredCrimeType}
                  </p>
                ) : (
                  <p className="terminal-empty">
                    <span className="terminal-empty-prompt">{">"}</span>NO DATA_<span className="terminal-cursor" style={{ marginLeft: 0, height: 14, width: 7 }} />
                  </p>
                )}
              </div>

              {/* Districts Active In */}
              <div className="glass-card gradient-emerald p-4 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="size-4" style={{ color: "var(--success)" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    Districts Active In
                  </span>
                </div>
                {activeDistricts.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {activeDistricts.map((d) => (
                      <span
                        key={d}
                        className="rounded-full border px-2 py-0.5 text-xs"
                        style={{
                          background: "rgba(255, 255, 255, 0.04)",
                          color: "var(--text-primary)",
                          borderColor: "rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        {d}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="terminal-empty">
                    <span className="terminal-empty-prompt">{">"}</span>NO DATA_<span className="terminal-cursor" style={{ marginLeft: 0, height: 14, width: 7 }} />
                  </p>
                )}
              </div>

              {/* Vehicles Used */}
              <div className="glass-card gradient-amber p-4 relative overflow-hidden">
                <div className="flex items-center gap-2 mb-3">
                  <Car className="size-4" style={{ color: "var(--warning)" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    Vehicles Used
                  </span>
                </div>
                {vehiclesUsed.length > 0 ? (
                  <div className="space-y-1.5">
                    {vehiclesUsed.map((v) => (
                      <div
                        key={v.id}
                        className="text-sm flex items-center gap-2"
                        style={{ color: "var(--text-primary)" }}
                      >
                        <span className="font-mono text-xs" style={{ color: "var(--primary)" }}>
                          {v.reg}
                        </span>
                        <span style={{ color: "var(--text-secondary)" }}>
                          {v.make} {v.type} ({v.color})
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="terminal-empty">
                    <span className="terminal-empty-prompt">{">"}</span>NO VEHICLES LINKED_<span className="terminal-cursor" style={{ marginLeft: 0, height: 14, width: 7 }} />
                  </p>
                )}
              </div>

              {/* Gang Associates */}
              <div className="glass-card gradient-rose p-4 relative overflow-hidden sm:col-span-2">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="size-4" style={{ color: "var(--critical)" }} />
                  <span className="text-sm font-medium" style={{ color: "var(--text-primary)" }}>
                    Gang Associates
                  </span>
                </div>
                {gangAssociates.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {gangAssociates.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-2 rounded-md px-3 py-1.5 border"
                        style={{
                          background: "rgba(15, 21, 36, 0.6)",
                          borderColor: "rgba(255, 255, 255, 0.06)",
                        }}
                      >
                        <User className="size-3.5" style={{ color: "var(--secondary)" }} />
                        <span className="text-sm" style={{ color: "var(--text-primary)" }}>{a.name}</span>
                        <span className="text-xs" style={{ color: "var(--text-secondary)" }}>
                          (Risk: {a.risk})
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="terminal-empty">
                    <span className="terminal-empty-prompt">{">"}</span>NO GANG AFFILIATION OR NO ASSOCIATES FOUND_<span className="terminal-cursor" style={{ marginLeft: 0, height: 14, width: 7 }} />
                  </p>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* ── Section 3 — Risk Scoring Breakdown ── */}
        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <div className="glass-card p-5 sm:p-6">
            <h2
              className="text-base font-semibold flex items-center gap-2 mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              <Shield className="size-5" style={{ color: "var(--text-secondary)" }} />
              Risk Scoring Breakdown
            </h2>

            <div className="overflow-x-auto rounded-lg" style={{ border: "1px solid rgba(255, 255, 255, 0.06)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid rgba(255, 255, 255, 0.06)",
                      background: "rgba(15, 21, 36, 0.3)",
                    }}
                  >
                    <th
                      className="text-left px-4 py-3 font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Factor
                    </th>
                    <th
                      className="text-left px-4 py-3 font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Value
                    </th>
                    <th
                      className="text-right px-4 py-3 font-medium"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Score
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(34, 211, 238, 0.04)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                      Prior FIRs Count
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                      {riskBreakdown.priorFIRsCount}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--text-primary)" }}>
                      {riskBreakdown.priorFIRsScore}
                      <span className="ml-1" style={{ fontSize: 12, color: "var(--text-secondary)" }}>
                        (max 40)
                      </span>
                    </td>
                  </tr>
                  <tr
                    style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(34, 211, 238, 0.04)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                      Gang Membership
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                      {riskBreakdown.gangMembership}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--text-primary)" }}>
                      {riskBreakdown.gangScore > 0 ? "+" : ""}
                      {riskBreakdown.gangScore}
                    </td>
                  </tr>
                  <tr
                    style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(34, 211, 238, 0.04)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                      Severity of Crimes
                    </td>
                    <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                      {riskBreakdown.highCriticalCount} high/critical
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--text-primary)" }}>
                      {riskBreakdown.severityScore}
                    </td>
                  </tr>
                  <tr
                    style={{ borderBottom: "1px solid rgba(255, 255, 255, 0.04)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(34, 211, 238, 0.04)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>Recency</td>
                    <td className="px-4 py-3" style={{ color: "var(--text-primary)" }}>
                      {riskBreakdown.recentCrime
                        ? "Crime in last 12 months"
                        : "No recent crime"}
                    </td>
                    <td className="px-4 py-3 text-right" style={{ color: "var(--text-primary)" }}>
                      {riskBreakdown.recencyScore > 0 ? "+" : ""}
                      {riskBreakdown.recencyScore}
                    </td>
                  </tr>
                  <tr>
                    <td
                      className="px-4 py-3 font-bold"
                      colSpan={2}
                      style={{ color: "var(--text-primary)" }}
                    >
                      Total
                    </td>
                    <td
                      className="px-4 py-3 text-right font-bold"
                      style={{ color: riskColor }}
                    >
                      {riskBreakdown.total}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        {/* ── Section 4 — Financial Connections ── */}
        <motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <div className="glass-card p-5 sm:p-6">
            <h2
              className="text-base font-semibold flex items-center gap-2 mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              <FileText className="size-5" style={{ color: "var(--text-secondary)" }} />
              Financial Connections
            </h2>

            {financialTransactions.length === 0 ? (
              <p className="terminal-empty">
                <span className="terminal-empty-prompt">{">"}</span>NO FINANCIAL TRANSACTIONS LINKED TO THIS ACCUSED_<span className="terminal-cursor" style={{ marginLeft: 0, height: 14, width: 7 }} />
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {financialTransactions.map(({ firId, transaction }) => {
                  const bankAccount = crimeData?.bank_accounts.find(
                    (ba) => ba.id === transaction.account
                  );
                  return (
                    <div
                      key={firId}
                      className="rounded-lg p-4 border flex flex-col sm:flex-row sm:items-center gap-3"
                      style={{
                        background: "rgba(10, 15, 28, 0.6)",
                        borderColor: "rgba(255, 255, 255, 0.06)",
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm" style={{ color: "var(--primary)" }}>
                            {firId}
                          </span>
                        </div>
                        {bankAccount && (
                          <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                            {bankAccount.bank} — {bankAccount.acc}
                          </p>
                        )}
                        {transaction.note && (
                          <p className="text-xs mt-1" style={{ color: "var(--text-secondary)" }}>
                            {transaction.note}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
                          {formatINR(transaction.amount_inr)}
                        </p>
                        <GlassBadge
                          style={{
                            fontSize: 12,
                            marginTop: 4,
                            display: "inline-flex",
                          }}
                        >
                          {transaction.mode}
                        </GlassBadge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Section 5 — AI Analysis ── */}
        <motion.div
          custom={5}
          variants={fadeUp}
          initial="hidden"
          animate="visible"
        >
          <div className="glass-card p-5 sm:p-6">
            <h2
              className="text-base font-semibold flex items-center gap-2 mb-4"
              style={{ color: "var(--text-primary)" }}
            >
              <Shield className="size-5" style={{ color: "var(--secondary)" }} />
              AI Analysis
            </h2>

            {aiLoading && (
              <div className="flex items-center gap-3 py-4">
                <div
                  className="size-5 rounded-full"
                  style={{
                    border: "2px solid rgba(129, 140, 248, 0.3)",
                    borderTopColor: "#818cf8",
                    animation: "spin 1s linear infinite",
                  }}
                />
                <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
                  Generating AI analysis...
                </span>
              </div>
            )}
            {aiError && !aiLoading && (
              <p className="text-sm py-2" style={{ color: "var(--text-secondary)" }}>
                AI analysis unavailable in demo mode.
              </p>
            )}
            {aiAnalysis && !aiLoading && (
              <p className="text-sm leading-relaxed py-2" style={{ color: "var(--text-primary)" }}>
                {aiAnalysis}
              </p>
            )}
          </div>
        </motion.div>

        {/* ── Section 6 — AI Investigation Brief ── */}
        {brief && (
          <motion.div
            custom={6}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h2
                className="text-lg font-bold flex items-center gap-2"
                style={{ color: "var(--text-primary)" }}
              >
                <Brain className="w-5 h-5" style={{ color: "var(--primary)" }} /> AI Investigation Brief
              </h2>
              {/* Confidence Score Ring */}
              <div className="flex items-center gap-2">
                <svg width="44" height="44" className="confidence-ring">
                  <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="3" />
                  <circle cx="22" cy="22" r="18" fill="none"
                    stroke={brief.confidenceScore >= 80 ? "#34d399" : brief.confidenceScore >= 60 ? "#fbbf24" : "#f87171"}
                    strokeWidth="3" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 18}
                    strokeDashoffset={2 * Math.PI * 18 - (brief.confidenceScore / 100) * 2 * Math.PI * 18}
                    className="confidence-ring-circle"
                    style={{
                      filter: "drop-shadow(0 0 6px " + (brief.confidenceScore >= 80 ? "rgba(52,211,153,0.4)" : brief.confidenceScore >= 60 ? "rgba(251,191,36,0.4)" : "rgba(248,113,113,0.4)") + ")",
                    }}
                  />
                  <text x="22" y="22" textAnchor="middle" dominantBaseline="central" fill="#f1f5f9" fontSize="10" fontWeight="bold" style={{transform: "rotate(90deg)", transformOrigin: "center"}}>{brief.confidenceScore}%</text>
                </svg>
                <span className="text-xs" style={{ color: "var(--text-secondary)" }}>Confidence</span>
              </div>
            </div>

            {/* Executive Summary */}
            <div className="glass-card p-4">
              <h3
                className="text-xs font-semibold uppercase tracking-wider mb-2"
                style={{ color: "var(--text-tertiary)" }}
              >
                Executive Summary
              </h3>
              <p className="text-sm leading-relaxed" style={{ color: "var(--text-primary)" }}>{brief.executiveSummary}</p>
            </div>

            {/* Related Cases */}
            {brief.relatedCases.length > 0 && (
              <div className="glass-card p-4">
                <h3
                  className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Related Cases ({brief.relatedCases.length})
                </h3>
                <div className="space-y-2">
                  {brief.relatedCases.map((c, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-1.5 last:border-0"
                      style={{
                        borderBottom: i < brief.relatedCases.length - 1 ? "1px solid rgba(255, 255, 255, 0.04)" : "none",
                      }}
                    >
                      <div>
                        <span className="text-xs font-mono" style={{ color: "var(--primary)" }}>{c.firId}</span>
                        <span className="text-xs ml-2" style={{ color: "var(--text-secondary)" }}>{c.crimeType}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px]" style={{ color: "var(--text-secondary)" }}>{c.date}</span>
                        <span
                          className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full"
                          style={
                            c.status === "Arrested"
                              ? { background: "rgba(52, 211, 153, 0.08)", color: "var(--success)" }
                              : c.status === "Under Investigation"
                                ? { background: "rgba(251, 191, 36, 0.08)", color: "var(--warning)" }
                                : { background: "rgba(100, 116, 139, 0.08)", color: "#94a3b8" }
                          }
                        >
                          {c.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Likely Associates */}
            {brief.likelyAssociates.length > 0 && (
              <div className="glass-card p-4">
                <h3
                  className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Likely Associates
                </h3>
                <div className="space-y-2">
                  {brief.likelyAssociates.map((a, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between py-1.5 last:border-0"
                      style={{
                        borderBottom: i < brief.likelyAssociates.length - 1 ? "1px solid rgba(255, 255, 255, 0.04)" : "none",
                      }}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full"
                          style={{
                            background:
                              a.strength === "strong" ? "#f87171" :
                              a.strength === "moderate" ? "#fbbf24" : "#34d399",
                            boxShadow:
                              a.strength === "strong" ? "0 0 8px rgba(248,113,113,0.4)" :
                              a.strength === "moderate" ? "0 0 8px rgba(251,191,36,0.4)" : "0 0 8px rgba(52,211,153,0.4)",
                          }}
                        />
                        <span className="text-sm" style={{ color: "var(--text-primary)" }}>{a.name}</span>
                        <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>({a.id})</span>
                      </div>
                      <span
                        className="text-[10px] px-1.5 py-0.5 rounded-full"
                        style={
                          a.strength === "strong"
                            ? { background: "rgba(248, 113, 113, 0.08)", color: "var(--critical)" }
                            : a.strength === "moderate"
                              ? { background: "rgba(251, 191, 36, 0.08)", color: "var(--warning)" }
                              : { background: "rgba(52, 211, 153, 0.08)", color: "var(--success)" }
                        }
                      >
                        {a.strength}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Behavioral Analysis + Missing Evidence side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="glass-card p-4">
                <h3
                  className="text-xs font-semibold uppercase tracking-wider mb-3"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  Behavioral Analysis
                </h3>
                <div className="space-y-3">
                  {brief.behavioralAnalysis.map((b, i) => (
                    <div key={i}>
                      <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{b.pattern}</p>
                      <p className="mt-0.5 leading-relaxed" style={{ fontSize: 11, color: "var(--text-secondary)" }}>{b.description}</p>
                      <p className="mt-0.5" style={{ fontSize: 10, color: "var(--text-tertiary)" }}>{b.frequency}</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="glass-card p-4">
                  <h3
                    className="text-xs font-semibold uppercase tracking-wider mb-3"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Missing Evidence
                  </h3>
                  <div className="space-y-2">
                    {brief.missingEvidence.map((m, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <div
                          className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                          style={{
                            background:
                              m.priority === "high" ? "#f87171" :
                              m.priority === "medium" ? "#fbbf24" : "#22d3ee",
                            boxShadow:
                              m.priority === "high" ? "0 0 6px rgba(248,113,113,0.4)" :
                              m.priority === "medium" ? "0 0 6px rgba(251,191,36,0.4)" : "0 0 6px rgba(34,211,238,0.4)",
                          }}
                        />
                        <div>
                          <p className="text-xs font-semibold" style={{ color: "var(--text-primary)" }}>{m.type}</p>
                          <p style={{ fontSize: 11, color: "var(--text-secondary)" }}>{m.description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {brief.financialLinks.length > 0 && (
                  <div className="glass-card p-4">
                    <h3
                      className="text-xs font-semibold uppercase tracking-wider mb-3"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Financial Links
                    </h3>
                    {brief.financialLinks.map((f, i) => (
                      <div key={i} className="mb-2 last:mb-0">
                        <p className="text-xs" style={{ color: "var(--text-primary)" }}>{f.bank} — {f.holder}</p>
                        <p style={{ fontSize: 10, color: "var(--text-secondary)" }}>A/C: {f.account.slice(-4)} | Total: ₹{f.totalAmount.toLocaleString("en-IN")} | {f.transactions} txns</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Suggested Actions */}
            <div className="glass-card p-4">
              <h3
                className="text-xs font-semibold uppercase tracking-wider mb-3"
                style={{ color: "var(--text-tertiary)" }}
              >
                Suggested Investigative Actions
              </h3>
              <div className="space-y-2">
                {brief.suggestedActions.map((a, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 py-2 last:border-0"
                    style={{
                      borderBottom: i < brief.suggestedActions.length - 1 ? "1px solid rgba(255, 255, 255, 0.04)" : "none",
                    }}
                  >
                    <span
                      className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold flex-shrink-0 mt-0.5"
                      style={
                        a.priority === "immediate"
                          ? { background: "rgba(248, 113, 113, 0.08)", color: "var(--critical)" }
                          : a.priority === "short_term"
                            ? { background: "rgba(251, 191, 36, 0.08)", color: "var(--warning)" }
                            : { background: "rgba(34, 211, 238, 0.08)", color: "var(--primary)" }
                      }
                    >
                      {a.priority === "immediate" ? "IMMEDIATE" : a.priority === "short_term" ? "SHORT-TERM" : "LONG-TERM"}
                    </span>
                    <div>
                      <p className="text-sm" style={{ color: "var(--text-primary)" }}>{a.action}</p>
                      <p className="mt-0.5" style={{ fontSize: 11, color: "var(--text-secondary)" }}>{a.rationale}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Section 7 — Similar Crimes Engine ── */}
        {similarCrimes.length > 0 && (
          <motion.div
            custom={7}
            variants={fadeUp}
            initial="hidden"
            animate="visible"
            className="space-y-4"
          >
            <h2
              className="text-lg font-bold flex items-center gap-2"
              style={{ color: "var(--text-primary)" }}
            >
              <Search className="w-5 h-5" style={{ color: "var(--primary)" }} /> Similar Crimes Engine
            </h2>
            <div className="space-y-3">
              {similarCrimes.map((sc, i) => (
                <div key={i} className="glass-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono font-bold" style={{ color: "var(--primary)" }}>{sc.fir.fir_id}</span>
                      <SeverityBadge severity={sc.fir.severity} />
                    </div>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-24 h-2 rounded-full overflow-hidden"
                        style={{ background: "rgba(255, 255, 255, 0.04)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${sc.similarityScore}%`,
                            backgroundColor: sc.similarityScore >= 70 ? "#34d399" : sc.similarityScore >= 40 ? "#fbbf24" : "#f87171",
                            boxShadow: sc.similarityScore >= 70 ? "0 0 8px rgba(52,211,153,0.4)" : sc.similarityScore >= 40 ? "0 0 8px rgba(251,191,36,0.4)" : "0 0 8px rgba(248,113,113,0.4)",
                          }}
                        />
                      </div>
                      <span
                        className="text-sm font-bold"
                        style={{
                          color: sc.similarityScore >= 70 ? "#34d399" : sc.similarityScore >= 40 ? "#fbbf24" : "#f87171",
                        }}
                      >
                        {sc.similarityScore}%
                      </span>
                    </div>
                  </div>
                  <p className="text-xs mb-1" style={{ color: "var(--text-primary)" }}>{sc.fir.crime_type} — {sc.fir.district} — {sc.fir.date}</p>
                  <p className="leading-relaxed mb-2" style={{ fontSize: 11, color: "var(--text-secondary)" }}>{sc.explanation}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {sc.matchedFactors.filter(f => f.matched).map((f, j) => (
                      <span
                        key={j}
                        className="text-[10px] px-2 py-0.5 rounded-full border"
                        style={{
                          background: "rgba(52, 211, 153, 0.06)",
                          color: "var(--success)",
                          borderColor: "rgba(52, 211, 153, 0.15)",
                        }}
                      >
                        {f.factor}
                      </span>
                    ))}
                    {sc.matchedFactors.filter(f => !f.matched).map((f, j) => (
                      <span
                        key={j}
                        className="text-[10px] px-2 py-0.5 rounded-full border"
                        style={{
                          background: "rgba(248, 113, 113, 0.06)",
                          color: "rgba(248, 113, 113, 0.6)",
                          borderColor: "rgba(248, 113, 113, 0.1)",
                        }}
                      >
                        {f.factor}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}