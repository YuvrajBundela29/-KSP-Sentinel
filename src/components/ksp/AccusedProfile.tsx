"use client";

import { useEffect, useState, useMemo } from "react";
import { useAppStore } from "@/lib/store";
import { getAccusedById, getFIRsByAccused } from "@/lib/data";
import type { Accused, FIR } from "@/lib/types";
import LoadingSpinner from "@/components/ksp/LoadingSpinner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  User,
  Shield,
  Clock,
  MapPin,
  Car,
  Users,
  FileText,
} from "lucide-react";

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
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

const severityBadgeColors: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-green-500/20 text-green-400 border-green-500/30",
};

const investigationStatusColors: Record<string, string> = {
  "Under Investigation": "bg-blue-500/20 text-blue-400 border-blue-500/30",
  "Charge Sheet Filed": "bg-green-500/20 text-green-400 border-green-500/30",
  Closed: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  "Trial in Progress": "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  "Evidence Collection": "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

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
      ? "#ef4444"
      : (accused?.risk ?? 0) > 60
        ? "#f97316"
        : "#10b981";
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-[#94a3b8]">
        <Button
          variant="ghost"
          onClick={() => setView("dashboard")}
          className="text-[#94a3b8] hover:text-[#e2e8f0] mb-6"
        >
          <ArrowLeft className="size-4 mr-2" />
          Back to Dashboard
        </Button>
        <User className="size-16 mb-4 opacity-30" />
        <p className="text-lg">Select an accused to view their profile</p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto" style={{ background: "#0a0f1e" }}>
      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setView("dashboard")}
            className="text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-[#2a3550]/50 shrink-0 mt-1"
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-3 mb-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-[#e2e8f0]">
                {accused.name}
              </h1>
              <Badge
                variant="outline"
                className="bg-[#2a3550] text-[#e2e8f0] border-[#3a4560] text-sm px-2.5 py-0.5"
              >
                Age: {accused.age}
              </Badge>
              <Badge
                variant="outline"
                className="bg-[#2a3550] text-[#e2e8f0] border-[#3a4560] text-sm px-2.5 py-0.5"
              >
                {accused.gender}
              </Badge>
              {gangName && (
                <Badge
                  variant="outline"
                  className="bg-purple-500/15 text-purple-400 border-purple-500/30 text-sm px-2.5 py-0.5"
                >
                  <Users className="size-3 mr-1" />
                  {gangName}
                </Badge>
              )}
            </div>

            {/* Risk Score Gauge */}
            <div className="flex items-center gap-4 mt-4">
              <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0">
                <svg
                  viewBox="0 0 120 120"
                  className="w-full h-full -rotate-90"
                >
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke="#1a2035"
                    strokeWidth="10"
                  />
                  <circle
                    cx="60"
                    cy="60"
                    r="50"
                    fill="none"
                    stroke={riskColor}
                    strokeWidth="10"
                    strokeLinecap="round"
                    strokeDasharray={`${(accused.risk / 100) * 314.16} 314.16`}
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span
                    className="text-2xl sm:text-3xl font-bold"
                    style={{ color: riskColor }}
                  >
                    {accused.risk}
                  </span>
                  <span className="text-[10px] text-[#94a3b8] uppercase tracking-wider">
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
                <p className="text-sm text-[#94a3b8] mt-1">
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

        {/* Section 1 — Criminal History Timeline */}
        <Card className="bg-[#1a2035] border-[#2a3550] shadow-none">
          <CardHeader>
            <CardTitle className="text-[#e2e8f0] flex items-center gap-2">
              <FileText className="size-5 text-[#94a3b8]" />
              Criminal History Timeline
            </CardTitle>
          </CardHeader>
          <CardContent>
            {firs.length === 0 ? (
              <p className="text-[#94a3b8] text-sm">
                No FIR records found for this accused.
              </p>
            ) : (
              <div className="relative pl-6 max-h-96 overflow-y-auto space-y-0 custom-scrollbar">
                {/* Vertical timeline line */}
                <div className="absolute left-[9px] top-2 bottom-2 w-[2px] bg-[#2a3550]" />

                {firs.map((fir) => (
                  <div key={fir.fir_id} className="relative pb-6 last:pb-0">
                    {/* Timeline dot */}
                    <div
                      className={`absolute -left-6 top-1.5 w-4 h-4 rounded-full border-2 border-[#0a0f1e] ${severityColors[fir.severity] ?? "bg-gray-500"}`}
                    />
                    <div className="bg-[#0f1528] rounded-lg p-4 border border-[#2a3550]/60">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="text-sm text-[#94a3b8]">
                          {formatDate(fir.date)}
                        </span>
                        <Badge
                          variant="outline"
                          className="bg-[#2a3550] text-[#e2e8f0] border-[#3a4560] text-xs"
                        >
                          {fir.crime_type}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs ${severityBadgeColors[fir.severity] ?? ""}`}
                        >
                          {fir.severity.toUpperCase()}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs ${investigationStatusColors[fir.investigation_status] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30"}`}
                        >
                          {fir.investigation_status}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                        <span className="text-blue-400 font-mono">
                          {fir.fir_id}
                        </span>
                        <span className="text-[#94a3b8] flex items-center gap-1">
                          <MapPin className="size-3" />
                          {fir.district}
                        </span>
                        <span className="text-[#94a3b8] flex items-center gap-1">
                          <Clock className="size-3" />
                          {fir.time}
                        </span>
                        <span className="text-[#94a3b8]">
                          {fir.police_station}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 2 — Behavioral Analysis */}
        <Card className="bg-[#1a2035] border-[#2a3550] shadow-none">
          <CardHeader>
            <CardTitle className="text-[#e2e8f0] flex items-center gap-2">
              <Shield className="size-5 text-[#94a3b8]" />
              Behavioral Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Preferred Time of Crime */}
              <div className="bg-[#0f1528] rounded-lg p-4 border border-[#2a3550]/60">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="size-4 text-[#94a3b8]" />
                  <span className="text-sm font-medium text-[#e2e8f0]">
                    Preferred Time of Crime
                  </span>
                </div>
                {firs.length === 0 ? (
                  <p className="text-sm text-[#94a3b8]">No data</p>
                ) : (
                  <div className="space-y-2">
                    {(
                      ["morning", "evening", "night"] as const
                    ).map((slot) => (
                      <div key={slot} className="flex items-center gap-2">
                        <span className="text-xs text-[#94a3b8] w-16 capitalize">
                          {slot === "morning"
                            ? "Morning"
                            : slot === "evening"
                              ? "Evening"
                              : "Night"}
                          <span className="text-[10px] ml-0.5 opacity-60">
                            {slot === "morning"
                              ? "6-12"
                              : slot === "evening"
                                ? "12-18"
                                : "18-6"}
                          </span>
                        </span>
                        <div className="flex-1 h-2 bg-[#1a2035] rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${timeAnalysis.preferred === slot ? "bg-blue-400" : "bg-[#2a3550]"}`}
                            style={{
                              width: `${timeAnalysis.percentages[slot]}%`,
                            }}
                          />
                        </div>
                        <span className="text-xs text-[#94a3b8] w-10 text-right">
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
              <div className="bg-[#0f1528] rounded-lg p-4 border border-[#2a3550]/60">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="size-4 text-[#94a3b8]" />
                  <span className="text-sm font-medium text-[#e2e8f0]">
                    Preferred Crime Type
                  </span>
                </div>
                {preferredCrimeType ? (
                  <p className="text-sm text-blue-400 font-medium">
                    {preferredCrimeType}
                  </p>
                ) : (
                  <p className="text-sm text-[#94a3b8]">No data</p>
                )}
              </div>

              {/* Districts Active In */}
              <div className="bg-[#0f1528] rounded-lg p-4 border border-[#2a3550]/60">
                <div className="flex items-center gap-2 mb-3">
                  <MapPin className="size-4 text-[#94a3b8]" />
                  <span className="text-sm font-medium text-[#e2e8f0]">
                    Districts Active In
                  </span>
                </div>
                {activeDistricts.length > 0 ? (
                  <div className="flex flex-wrap gap-1.5">
                    {activeDistricts.map((d) => (
                      <Badge
                        key={d}
                        variant="outline"
                        className="bg-[#2a3550] text-[#e2e8f0] border-[#3a4560] text-xs"
                      >
                        {d}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#94a3b8]">No data</p>
                )}
              </div>

              {/* Vehicles Used */}
              <div className="bg-[#0f1528] rounded-lg p-4 border border-[#2a3550]/60">
                <div className="flex items-center gap-2 mb-3">
                  <Car className="size-4 text-[#94a3b8]" />
                  <span className="text-sm font-medium text-[#e2e8f0]">
                    Vehicles Used
                  </span>
                </div>
                {vehiclesUsed.length > 0 ? (
                  <div className="space-y-1.5">
                    {vehiclesUsed.map((v) => (
                      <div
                        key={v.id}
                        className="text-sm text-[#e2e8f0] flex items-center gap-2"
                      >
                        <span className="font-mono text-xs text-blue-400">
                          {v.reg}
                        </span>
                        <span className="text-[#94a3b8]">
                          {v.make} {v.type} ({v.color})
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#94a3b8]">No vehicles linked</p>
                )}
              </div>

              {/* Gang Associates */}
              <div className="bg-[#0f1528] rounded-lg p-4 border border-[#2a3550]/60 sm:col-span-2">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="size-4 text-[#94a3b8]" />
                  <span className="text-sm font-medium text-[#e2e8f0]">
                    Gang Associates
                  </span>
                </div>
                {gangAssociates.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {gangAssociates.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center gap-2 bg-[#1a2035] rounded-md px-3 py-1.5 border border-[#2a3550]"
                      >
                        <User className="size-3.5 text-purple-400" />
                        <span className="text-sm text-[#e2e8f0]">{a.name}</span>
                        <span className="text-xs text-[#94a3b8]">
                          (Risk: {a.risk})
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-[#94a3b8]">
                    No gang affiliation or no associates found
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3 — Risk Scoring Breakdown */}
        <Card className="bg-[#1a2035] border-[#2a3550] shadow-none">
          <CardHeader>
            <CardTitle className="text-[#e2e8f0] flex items-center gap-2">
              <Shield className="size-5 text-[#94a3b8]" />
              Risk Scoring Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow className="border-[#2a3550] hover:bg-transparent">
                  <TableHead className="text-[#94a3b8]">Factor</TableHead>
                  <TableHead className="text-[#94a3b8]">Value</TableHead>
                  <TableHead className="text-[#94a3b8] text-right">Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow className="border-[#2a3550] hover:bg-[#2a3550]/30">
                  <TableCell className="text-[#e2e8f0]">
                    Prior FIRs Count
                  </TableCell>
                  <TableCell className="text-[#e2e8f0]">
                    {riskBreakdown.priorFIRsCount}
                  </TableCell>
                  <TableCell className="text-[#e2e8f0] text-right">
                    {riskBreakdown.priorFIRsScore}
                    <span className="text-[#94a3b8] text-xs ml-1">
                      (max 40)
                    </span>
                  </TableCell>
                </TableRow>
                <TableRow className="border-[#2a3550] hover:bg-[#2a3550]/30">
                  <TableCell className="text-[#e2e8f0]">
                    Gang Membership
                  </TableCell>
                  <TableCell className="text-[#e2e8f0]">
                    {riskBreakdown.gangMembership}
                  </TableCell>
                  <TableCell className="text-[#e2e8f0] text-right">
                    {riskBreakdown.gangScore > 0 ? "+" : ""}
                    {riskBreakdown.gangScore}
                  </TableCell>
                </TableRow>
                <TableRow className="border-[#2a3550] hover:bg-[#2a3550]/30">
                  <TableCell className="text-[#e2e8f0]">
                    Severity of Crimes
                  </TableCell>
                  <TableCell className="text-[#e2e8f0]">
                    {riskBreakdown.highCriticalCount} high/critical
                  </TableCell>
                  <TableCell className="text-[#e2e8f0] text-right">
                    {riskBreakdown.severityScore}
                  </TableCell>
                </TableRow>
                <TableRow className="border-[#2a3550] hover:bg-[#2a3550]/30">
                  <TableCell className="text-[#e2e8f0]">Recency</TableCell>
                  <TableCell className="text-[#e2e8f0]">
                    {riskBreakdown.recentCrime
                      ? "Crime in last 12 months"
                      : "No recent crime"}
                  </TableCell>
                  <TableCell className="text-[#e2e8f0] text-right">
                    {riskBreakdown.recencyScore > 0 ? "+" : ""}
                    {riskBreakdown.recencyScore}
                  </TableCell>
                </TableRow>
                <TableRow className="border-[#2a3550] hover:bg-[#2a3550]/30">
                  <TableCell
                    className="text-[#e2e8f0] font-bold"
                    colSpan={2}
                  >
                    Total
                  </TableCell>
                  <TableCell
                    className="text-right font-bold"
                    style={{ color: riskColor }}
                  >
                    {riskBreakdown.total}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Section 4 — Financial Connections */}
        <Card className="bg-[#1a2035] border-[#2a3550] shadow-none">
          <CardHeader>
            <CardTitle className="text-[#e2e8f0] flex items-center gap-2">
              <FileText className="size-5 text-[#94a3b8]" />
              Financial Connections
            </CardTitle>
          </CardHeader>
          <CardContent>
            {financialTransactions.length === 0 ? (
              <p className="text-sm text-[#94a3b8]">
                No financial transactions linked to this accused.
              </p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto custom-scrollbar">
                {financialTransactions.map(({ firId, transaction }) => {
                  const bankAccount = crimeData?.bank_accounts.find(
                    (ba) => ba.id === transaction.account
                  );
                  return (
                    <div
                      key={firId}
                      className="bg-[#0f1528] rounded-lg p-4 border border-[#2a3550]/60 flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm text-blue-400">
                            {firId}
                          </span>
                        </div>
                        {bankAccount && (
                          <p className="text-xs text-[#94a3b8]">
                            {bankAccount.bank} — {bankAccount.acc}
                          </p>
                        )}
                        {transaction.note && (
                          <p className="text-xs text-[#94a3b8] mt-1">
                            {transaction.note}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold text-[#e2e8f0]">
                          {formatINR(transaction.amount_inr)}
                        </p>
                        <Badge
                          variant="outline"
                          className="bg-[#2a3550] text-[#e2e8f0] border-[#3a4560] text-xs mt-1"
                        >
                          {transaction.mode}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 5 — AI Analysis */}
        <Card className="bg-[#1a2035] border-[#2a3550] shadow-none">
          <CardHeader>
            <CardTitle className="text-[#e2e8f0] flex items-center gap-2">
              <Shield className="size-5 text-purple-400" />
              AI Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            {aiLoading && (
              <div className="flex items-center gap-3 py-4">
                <div className="size-5 border-2 border-purple-400/30 border-t-purple-400 rounded-full animate-spin" />
                <span className="text-sm text-[#94a3b8]">
                  Generating AI analysis...
                </span>
              </div>
            )}
            {aiError && !aiLoading && (
              <p className="text-sm text-[#94a3b8] py-2">
                AI analysis unavailable in demo mode.
              </p>
            )}
            {aiAnalysis && !aiLoading && (
              <p className="text-sm text-[#e2e8f0] leading-relaxed py-2">
                {aiAnalysis}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}