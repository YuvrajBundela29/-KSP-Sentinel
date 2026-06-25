"use client";

import { useState, useMemo } from "react";
import {
  FileText,
  Download,
  Shield,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Lock,
  User,
  Network,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import { useAppStore } from "@/lib/store";
import {
  generateInvestigationBrief,
  computeSimilarCrimes,
  generateTimeline,
  getIntelFeedItems,
} from "@/lib/intelligence";
import type {
  FIR,
  Accused,
  InvestigationBrief,
  SimilarCrimeResult,
  TimelineEvent,
  IntelFeedItem,
} from "@/lib/types";
import { motion } from "framer-motion";

// ─── Confidence Ring SVG ────────────────────────────────────────────
function ConfidenceRing({ score }: { score: number }) {
  const r = 40;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color =
    score >= 80 ? "#34d399" : score >= 60 ? "#fbbf24" : "#f87171";

  return (
    <svg width="100" height="100" className="confidence-ring">
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth="6"
      />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="6"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="confidence-ring-circle"
      />
      <text
        x="50"
        y="50"
        textAnchor="middle"
        dominantBaseline="central"
        fill="#f1f5f9"
        fontSize="20"
        fontWeight="bold"
        className="!transform-none"
      >
        {score}%
      </text>
    </svg>
  );
}

// ─── Status Badge Helper ────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, React.CSSProperties> = {
    completed: { background: "rgba(52,211,153,0.1)", color: "#34d399", borderColor: "rgba(52,211,153,0.15)" },
    in_progress: { background: "rgba(251,191,36,0.1)", color: "#fbbf24", borderColor: "rgba(251,191,36,0.15)" },
    pending: { background: "rgba(90,101,122,0.1)", color: "#8b97b0", borderColor: "rgba(255,255,255,0.08)" },
  };
  const s = styles[status] || { background: "rgba(248,113,113,0.1)", color: "#f87171", borderColor: "rgba(248,113,113,0.15)" };

  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", padding: "2px 10px",
        borderRadius: "9999px", fontSize: "11px", fontWeight: 500,
        border: `1px solid ${s.borderColor}`, ...s,
      }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ─── Timeline Icon Helper ───────────────────────────────────────────
function TimelineIcon({ type }: { type: TimelineEvent["type"] }) {
  switch (type) {
    case "fir_filed":
    case "complaint":
      return <FileText className="w-4 h-4 text-[#22d3ee]" />;
    case "witness":
      return <User className="w-4 h-4 text-[#818cf8]" />;
    case "cctv":
      return <Shield className="w-4 h-4 text-[#22d3ee]" />;
    case "phone":
      return <Network className="w-4 h-4 text-[#34d399]" />;
    case "vehicle":
      return <Clock className="w-4 h-4 text-[#fbbf24]" />;
    case "financial":
      return <AlertTriangle className="w-4 h-4 text-[#fbbf24]" />;
    case "investigation":
      return <CheckCircle2 className="w-4 h-4" style={{ color: "#2dd4bf" }} />;
    case "arrest":
      return <XCircle className="w-4 h-4 text-[#f87171]" />;
    default:
      return <Clock className="w-4 h-4 text-[#8b97b0]" />;
  }
}

// ─── Main Component ─────────────────────────────────────────────────
export default function ReportGenerator() {
  const { crimeData, user } = useAppStore();

  const [selectedFirId, setSelectedFirId] = useState<string>("");
  const [selectedAccusedId, setSelectedAccusedId] = useState<string>("");
  const [reportType, setReportType] = useState<string>("full");
  const [reportGenerated, setReportGenerated] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [reportId, setReportId] = useState<string>("");

  // Derived data
  const firs = useMemo(() => crimeData?.firs ?? [], [crimeData]);
  const accusedList = useMemo(
    () => crimeData?.accused ?? [],
    [crimeData],
  );

  // Selected FIR and accused objects
  const selectedFir = useMemo(
    () => firs.find((f) => f.fir_id === selectedFirId) ?? null,
    [firs, selectedFirId],
  );
  const selectedAccused = useMemo(
    () => accusedList.find((a) => a.id === selectedAccusedId) ?? null,
    [accusedList, selectedAccusedId],
  );

  // Computed report data
  const brief: InvestigationBrief | null = useMemo(() => {
    if (!crimeData || !reportGenerated) return null;
    if (selectedAccusedId) {
      return generateInvestigationBrief(crimeData, selectedAccusedId, "accused");
    }
    if (selectedFirId) {
      return generateInvestigationBrief(crimeData, selectedFirId, "fir");
    }
    return null;
  }, [crimeData, selectedAccusedId, selectedFirId, reportGenerated]);

  const timeline: TimelineEvent[] = useMemo(() => {
    if (!crimeData || !selectedFirId || !reportGenerated) return [];
    return generateTimeline(crimeData, selectedFirId);
  }, [crimeData, selectedFirId, reportGenerated]);

  const similarCrimes: SimilarCrimeResult[] = useMemo(() => {
    if (!crimeData || !selectedFirId || !reportGenerated) return [];
    return computeSimilarCrimes(crimeData, selectedFirId, 3);
  }, [crimeData, selectedFirId, reportGenerated]);

  const intelFeed: IntelFeedItem[] = useMemo(() => {
    if (!crimeData || !reportGenerated) return [];
    return getIntelFeedItems(crimeData);
  }, [crimeData, reportGenerated]);

  // Generate handler
  const handleGenerate = () => {
    if (!selectedFirId && !selectedAccusedId) return;
    setIsGenerating(true);
    setReportId(crypto.randomUUID().slice(0, 8).toUpperCase());
    setTimeout(() => {
      setIsGenerating(false);
      setReportGenerated(true);
    }, 1200);
  };

  // PDF Export
  const handleExportPDF = () => {
    const doc = new jsPDF();
    const now = new Date().toLocaleString("en-IN", {
      dateStyle: "medium",
      timeStyle: "short",
    });

    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("KSP SENTINEL AI — INTELLIGENCE REPORT", 20, 25);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(200, 0, 0);
    doc.text("CLASSIFICATION: CONFIDENTIAL", 20, 33);

    doc.setTextColor(0, 0, 0);
    doc.text(`Report ID: RPT-${reportId}`, 20, 42);
    doc.text(`Generated: ${now}`, 20, 48);
    doc.text(`Officer: ${user?.username ?? "Unknown"} (${user?.role ?? "N/A"})`, 20, 54);

    if (selectedFir) {
      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.text(`FIR: ${selectedFir.fir_id}`, 20, 66);
      doc.text(`Crime: ${selectedFir.crime_type} — ${selectedFir.ipc_section}`, 20, 73);
      doc.text(`District: ${selectedFir.district} | Station: ${selectedFir.police_station}`, 20, 80);
    }

    if (brief) {
      doc.setFontSize(13);
      doc.setFont("helvetica", "bold");
      doc.text("Executive Summary", 20, 94);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const lines = doc.splitTextToSize(brief.executiveSummary, 170);
      doc.text(lines, 20, 102);

      let y = 102 + lines.length * 5 + 10;

      if (brief.suggestedActions.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Suggested Actions", 20, y);
        y += 7;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        for (const action of brief.suggestedActions) {
          const actionLines = doc.splitTextToSize(
            `• ${action.action} — ${action.rationale}`,
            170,
          );
          doc.text(actionLines, 20, y);
          y += actionLines.length * 5 + 2;
        }
      }

      y += 6;
      if (brief.missingEvidence.length > 0) {
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text("Missing Evidence", 20, y);
        y += 7;
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        for (const ev of brief.missingEvidence) {
          doc.text(`• [${ev.priority}] ${ev.description}`, 20, y);
          y += 6;
        }
      }
    }

    doc.setFontSize(8);
    doc.setTextColor(120, 120, 120);
    const pageH = doc.internal.pageSize.height;
    doc.text(
      "This report was auto-generated by KSP Sentinel AI. CLASSIFICATION: CONFIDENTIAL — FOR AUTHORIZED PERSONNEL ONLY",
      20,
      pageH - 10,
    );

    const dateStr = new Date().toISOString().slice(0, 10);
    doc.save(`ksp_intelligence_report_${dateStr}.pdf`);
  };

  return (
    <div className="min-h-screen bg-[rgba(10,15,28,0.6)] text-[#f1f5f9] p-4 md:p-6 lg:p-8 space-y-6">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3"
      >
        <div className="p-2.5 rounded-lg bg-[#22d3ee]/10 border border-[#22d3ee]/20">
          <FileText className="w-6 h-6 text-[#22d3ee]" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            INTELLIGENCE REPORT GENERATOR
          </h1>
          <p className="text-sm text-[#8b97b0]">
            Generate professional investigation reports with AI analysis
          </p>
        </div>
      </motion.div>

      {/* ─── Configuration Panel ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="glass-card rounded-xl border border-[rgba(255,255,255,0.08)] p-5 md:p-6 space-y-5"
      >
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#22d3ee]" />
          Report Configuration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* FIR Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#8b97b0]">
              FIR Reference
            </label>
            <Select value={selectedFirId} onValueChange={setSelectedFirId}>
              <SelectTrigger className="bg-[rgba(10,15,28,0.8)] border-[rgba(255,255,255,0.06)] text-[#f1f5f9]">
                <SelectValue placeholder="Select an FIR…" />
              </SelectTrigger>
              <SelectContent className="bg-[rgba(15,21,36,0.85)] border-[rgba(255,255,255,0.06)]">
                {firs.map((fir) => (
                  <SelectItem key={fir.fir_id} value={fir.fir_id}>
                    {fir.fir_id} — {fir.crime_type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Accused Focus */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#8b97b0]">
              Accused Focus{" "}
              <span className="text-xs opacity-50">(optional)</span>
            </label>
            <Select
              value={selectedAccusedId}
              onValueChange={setSelectedAccusedId}
            >
              <SelectTrigger className="bg-[rgba(10,15,28,0.8)] border-[rgba(255,255,255,0.06)] text-[#f1f5f9]">
                <SelectValue placeholder="Select an accused…" />
              </SelectTrigger>
              <SelectContent className="bg-[rgba(15,21,36,0.85)] border-[rgba(255,255,255,0.06)]">
                {accusedList.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name} (Risk: {a.risk})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Report Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-[#8b97b0]">
              Report Type
            </label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger className="bg-[rgba(10,15,28,0.8)] border-[rgba(255,255,255,0.06)] text-[#f1f5f9]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[rgba(15,21,36,0.85)] border-[rgba(255,255,255,0.06)]">
                <SelectItem value="full">Full Intelligence Brief</SelectItem>
                <SelectItem value="similar">Similar Crimes Analysis</SelectItem>
                <SelectItem value="timeline">
                  Investigation Timeline Report
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={
            (!selectedFirId && !selectedAccusedId) || isGenerating
          }
          className="px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-200 cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #22d3ee, #06b6d4)",
            color: "#050810",
            boxShadow: "0 0 24px rgba(34,211,238,0.2)",
          }}
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating Report…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Generate Report
            </span>
          )}
        </Button>
      </motion.div>

      {/* ─── Report Preview ──────────────────────────────────────── */}
      {reportGenerated && (
        <div className="space-y-5 animate-fade-in-up">
          {/* Export Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleExportPDF}
              className="px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
              style={{
                background: "rgba(52,211,153,0.12)",
                color: "#34d399",
                border: "1px solid rgba(52,211,153,0.2)",
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>

          {/* a. Report Header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="glass-card rounded-xl border border-[rgba(255,255,255,0.08)] p-6"
          >
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl md:text-2xl font-bold tracking-wide">
                  KSP SENTINEL AI — INTELLIGENCE REPORT
                </h2>
                <p className="text-xs text-[#8b97b0]">
                  Karnataka State Police — Crime Intelligence Division
                </p>
              </div>
              <div className="flex flex-col items-start md:items-end gap-1 text-sm text-[#8b97b0]">
                <span>
                  Report ID:{" "}
                  <span className="text-[#f1f5f9] font-mono">
                    RPT-{reportId}
                  </span>
                </span>
                <span>
                  Generated:{" "}
                  <span className="text-[#f1f5f9]">
                    {new Date().toLocaleString("en-IN")}
                  </span>
                </span>
                <span>
                  Officer:{" "}
                  <span className="text-[#f1f5f9]">
                    {user?.username ?? "Unknown"} ({user?.role ?? "N/A"})
                  </span>
                </span>
              </div>
            </div>
            <div className="mt-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-[#f87171]/15 border border-[rgba(248,113,113,0.15)] text-[#f87171] text-xs font-bold tracking-widest">
                <Lock className="w-3 h-3" />
                CLASSIFICATION: CONFIDENTIAL
              </span>
              <Badge
                variant="outline"
                className="border-[#22d3ee]/40 text-[#22d3ee]"
              >
                {reportType === "full"
                  ? "Full Intelligence Brief"
                  : reportType === "similar"
                    ? "Similar Crimes Analysis"
                    : "Investigation Timeline Report"}
              </Badge>
            </div>
          </motion.div>

          {/* b. Executive Summary */}
          {brief && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.08 }}
              className="glass-card rounded-xl border border-[rgba(255,255,255,0.08)] p-6"
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#22d3ee]" />
                Executive Summary
              </h3>
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1">
                  <p className="text-sm text-[#8b97b0] leading-relaxed">
                    {brief.executiveSummary}
                  </p>
                  {selectedFir && (
                    <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-[#8b97b0]">FIR:</span>{" "}
                        <span className="text-[#f1f5f9] font-medium">
                          {selectedFir.fir_id}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8b97b0]">Crime:</span>{" "}
                        <span className="text-[#f1f5f9]">
                          {selectedFir.crime_type}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8b97b0]">District:</span>{" "}
                        <span className="text-[#f1f5f9]">
                          {selectedFir.district}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#8b97b0]">Status:</span>{" "}
                        <Badge
                          variant="outline"
                          className="border-amber-500/40 text-[#fbbf24] text-xs"
                        >
                          {selectedFir.investigation_status}
                        </Badge>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center gap-1">
                  <ConfidenceRing score={brief.confidenceScore} />
                  <span className="text-xs text-[#8b97b0] mt-1">
                    Confidence
                  </span>
                </div>
              </div>
            </motion.div>
          )}

          {/* c. Timeline Section */}
          {timeline.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.16 }}
              className="glass-card rounded-xl border border-[rgba(255,255,255,0.08)] p-6"
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-[#22d3ee]" />
                Investigation Timeline
                <Badge
                  variant="outline"
                  className="border-[rgba(255,255,255,0.08)] text-[#8b97b0] text-xs ml-1"
                >
                  {timeline.length} events
                </Badge>
              </h3>
              <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                {timeline.map((event, idx) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-[rgba(15,21,36,0.45)] border-[rgba(255,255,255,0.06)]"
                  >
                    <div className="mt-0.5 p-1.5 rounded-md bg-[rgba(15,21,36,0.6)]">
                      <TimelineIcon type={event.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[#f1f5f9]">
                          {event.title}
                        </span>
                        <StatusBadge status={event.status} />
                      </div>
                      <p className="text-xs text-[#8b97b0] mt-1 line-clamp-2">
                        {event.description}
                      </p>
                    </div>
                    <span className="text-xs text-[#5a657a] whitespace-nowrap">
                      {event.timestamp}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* d. Similar Crimes Section */}
          {similarCrimes.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.24 }}
              className="glass-card rounded-xl border border-[rgba(255,255,255,0.08)] p-6"
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#fbbf24]" />
                Similar Crimes Analysis
              </h3>
              <div className="space-y-4">
                {similarCrimes.map((result) => (
                  <div
                    key={result.fir.fir_id}
                    className="p-4 rounded-lg bg-[rgba(15,21,36,0.45)] border-[rgba(255,255,255,0.06)] space-y-3"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <span className="font-mono text-sm font-bold text-[#22d3ee]">
                          {result.fir.fir_id}
                        </span>
                        <span className="text-sm text-[#8b97b0] ml-2">
                          {result.fir.crime_type} — {result.fir.district}
                        </span>
                      </div>
                      <span className="text-sm font-bold text-[#f1f5f9]">
                        {result.similarityScore}% match
                      </span>
                    </div>

                    {/* Similarity Bar */}
                    <div className="w-full h-2 rounded-full bg-[rgba(15,21,36,0.6)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${result.similarityScore}%`,
                          backgroundColor:
                            result.similarityScore >= 75
                              ? "#f87171"
                              : result.similarityScore >= 50
                                ? "#fbbf24"
                                : "#34d399",
                        }}
                      />
                    </div>

                    {/* Matched Factors */}
                    <div className="flex flex-wrap gap-1.5">
                      {result.matchedFactors
                        .filter((f) => f.matched)
                        .map((f) => (
                          <Badge
                            key={f.factor}
                            variant="outline"
                            className="border-[rgba(52,211,153,0.15)] text-[#34d399] text-xs"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            {f.factor}
                          </Badge>
                        ))}
                      {result.matchedFactors
                        .filter((f) => !f.matched)
                        .map((f) => (
                          <Badge
                            key={f.factor}
                            variant="outline"
                            className="border-red-500/20 text-[#f87171]/60 text-xs"
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            {f.factor}
                          </Badge>
                        ))}
                    </div>

                    <p className="text-xs text-[#8b97b0]">
                      {result.explanation}
                    </p>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* e. Network Intelligence */}
          {brief && (brief.relatedCases.length > 0 || brief.likelyAssociates.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.32 }}
              className="glass-card rounded-xl border border-[rgba(255,255,255,0.08)] p-6"
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Network className="w-5 h-5 text-[#818cf8]" />
                Network Intelligence
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Associated Gang Members */}
                {brief.likelyAssociates.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-[#8b97b0] mb-3">
                      Likely Associates
                    </h4>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {brief.likelyAssociates.map((assoc) => (
                        <div
                          key={assoc.id}
                          className="flex items-center justify-between p-2.5 rounded-lg bg-[rgba(15,21,36,0.45)] border-[rgba(255,255,255,0.06)]"
                        >
                          <div className="flex items-center gap-2">
                            <User className="w-4 h-4 text-[#8b97b0]" />
                            <div>
                              <span className="text-sm font-medium text-[#f1f5f9]">
                                {assoc.name}
                              </span>
                              <p className="text-xs text-[#8b97b0]">
                                {assoc.connection}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className={
                              assoc.strength === "strong"
                                ? "border-[rgba(248,113,113,0.15)] text-[#f87171] text-xs"
                                : assoc.strength === "moderate"
                                  ? "border-[rgba(251,191,36,0.15)] text-[#fbbf24] text-xs"
                                  : "border-[rgba(255,255,255,0.08)] text-[#8b97b0] text-xs"
                            }
                          >
                            {assoc.strength}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Linked FIRs & Financial Links */}
                <div className="space-y-4">
                  {brief.relatedCases.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-[#8b97b0] mb-3">
                        Linked Cases
                      </h4>
                      <div className="space-y-2 max-h-36 overflow-y-auto">
                        {brief.relatedCases.map((rc) => (
                          <div
                            key={rc.firId}
                            className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(15,21,36,0.45)] border-[rgba(255,255,255,0.06)] text-sm"
                          >
                            <FileText className="w-3.5 h-3.5 text-[#22d3ee] shrink-0" />
                            <span className="font-mono text-xs text-[#22d3ee]">
                              {rc.firId}
                            </span>
                            <span className="text-[#8b97b0] text-xs truncate">
                              {rc.crimeType} — {rc.relevance}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {brief.financialLinks.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-[#8b97b0] mb-3">
                        Financial Links
                      </h4>
                      <div className="space-y-2 max-h-36 overflow-y-auto">
                        {brief.financialLinks.map((fl, i) => (
                          <div
                            key={i}
                            className="p-2 rounded-lg bg-[rgba(15,21,36,0.45)] border-[rgba(255,255,255,0.06)] text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-[#f1f5f9]">
                                {fl.bank} — {fl.holder}
                              </span>
                              <span className="text-[#34d399] font-mono">
                                ₹{fl.totalAmount.toLocaleString("en-IN")}
                              </span>
                            </div>
                            <p className="text-[#8b97b0] mt-1">
                              {fl.transactions} transactions — {fl.details}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* f. AI Findings */}
          {brief && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.4 }}
              className="glass-card rounded-xl border border-[rgba(255,255,255,0.08)] p-6"
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#22d3ee]" />
                AI Findings &amp; Recommendations
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Suggested Actions */}
                {brief.suggestedActions.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-[#8b97b0] mb-3">
                      Suggested Actions
                    </h4>
                    <div className="space-y-2">
                      {brief.suggestedActions.map((sa, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2 p-2.5 rounded-lg bg-[rgba(15,21,36,0.45)] border-[rgba(255,255,255,0.06)]"
                        >
                          <div
                            className={`mt-1 w-2 h-2 rounded-full shrink-0 ${
                              sa.priority === "immediate"
                                ? "bg-[#f87171]"
                                : sa.priority === "short_term"
                                  ? "bg-[#fbbf24]"
                                  : "bg-[#22d3ee]"
                            }`}
                          />
                          <div>
                            <p className="text-sm text-[#f1f5f9]">
                              {sa.action}
                            </p>
                            <p className="text-xs text-[#8b97b0]">
                              {sa.rationale}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="space-y-6">
                  {/* Missing Evidence */}
                  {brief.missingEvidence.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-[#8b97b0] mb-3">
                        Missing Evidence
                      </h4>
                      <div className="space-y-2">
                        {brief.missingEvidence.map((me, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2 text-sm"
                          >
                            <XCircle
                              className={`w-4 h-4 shrink-0 mt-0.5 ${
                                me.priority === "high"
                                  ? "text-[#f87171]"
                                  : me.priority === "medium"
                                    ? "text-[#fbbf24]"
                                    : "text-[#8b97b0]"
                              }`}
                            />
                            <div>
                              <span className="text-[#f1f5f9]">
                                {me.type}
                              </span>
                              <p className="text-xs text-[#8b97b0]">
                                {me.description}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Behavioral Analysis */}
                  {brief.behavioralAnalysis.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-[#8b97b0] mb-3">
                        Behavioral Analysis
                      </h4>
                      <div className="space-y-2">
                        {brief.behavioralAnalysis.map((ba, i) => (
                          <div
                            key={i}
                            className="p-2.5 rounded-lg bg-[rgba(15,21,36,0.45)] border-[rgba(255,255,255,0.06)] text-sm"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-[#f1f5f9]">
                                {ba.pattern}
                              </span>
                              <Badge
                                variant="outline"
                                className="border-[rgba(255,255,255,0.08)] text-[#8b97b0] text-xs"
                              >
                                {ba.frequency}
                              </Badge>
                            </div>
                            <p className="text-xs text-[#8b97b0] mt-1">
                              {ba.description}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* g. Evidence Summary */}
          {brief && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.48 }}
              className="glass-card rounded-xl border border-[rgba(255,255,255,0.08)] p-6"
            >
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-[#34d399]" />
                Evidence Summary
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-[rgba(15,21,36,0.45)] border-[rgba(255,255,255,0.06)] text-center">
                  <p className="text-3xl font-bold text-[#22d3ee]">
                    {brief.relatedCases.length}
                  </p>
                  <p className="text-xs text-[#8b97b0] mt-1">
                    FIRs Referenced
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-[rgba(15,21,36,0.45)] border-[rgba(255,255,255,0.06)] text-center">
                  <p className="text-3xl font-bold text-[#34d399]">
                    {brief.missingEvidence.length === 0
                      ? "Strong"
                      : brief.missingEvidence.filter((m) => m.priority === "high")
                            .length === 0
                        ? "Moderate"
                        : "Weak"}
                  </p>
                  <p className="text-xs text-[#8b97b0] mt-1">
                    Evidence Chain
                  </p>
                </div>
                <div className="p-4 rounded-lg bg-[rgba(15,21,36,0.45)] border-[rgba(255,255,255,0.06)] flex flex-col items-center justify-center">
                  <ConfidenceRing score={brief.confidenceScore} />
                  <p className="text-xs text-[#8b97b0] mt-1">
                    Overall Confidence
                  </p>
                </div>
              </div>

              {/* Evidence Chain Items */}
              {brief.relatedCases.length > 0 && (
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-[#8b97b0] mb-2">
                    Evidence Chain
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {brief.relatedCases.map((rc) => (
                      <Badge
                        key={rc.firId}
                        variant="outline"
                        className="border-[rgba(255,255,255,0.08)] text-[#f1f5f9] text-xs"
                      >
                        {rc.firId} — {rc.relevance}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {/* h. Footer */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.56 }}
            className="glass-card rounded-xl border border-[rgba(255,255,255,0.08)] p-6"
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex-1 text-center md:text-left">
                <p className="text-sm text-[#8b97b0]">
                  This report was auto-generated by{" "}
                  <span className="text-[#f1f5f9] font-medium">
                    KSP Sentinel AI
                  </span>
                </p>
                <p className="text-xs text-[#5a657a] mt-1">
                  Generated: {new Date().toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-[#f87171]/70 mt-2 font-medium tracking-wide">
                  CLASSIFICATION: CONFIDENTIAL — FOR AUTHORIZED PERSONNEL ONLY
                </p>
              </div>

              {/* QR Code Placeholder */}
              <div className="flex flex-col items-center gap-1">
                <div className="bg-[rgba(15,21,36,0.5)] border-2 border-dashed border-[rgba(255,255,255,0.06)]">
                  <span className="text-xs font-mono text-[#8b97b0]">QR</span>
                </div>
                <span className="text-[10px] text-[#5a657a]">
                  Verification Code
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}