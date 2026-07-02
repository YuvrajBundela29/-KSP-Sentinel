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
  FileDown,
  Copy,
  Printer,
  Sparkles,
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
function ConfidenceRing({ score, size = 100 }: { score: number; size?: number }) {
  const r = size * 0.4;
  const cx = size / 2;
  const cy = size / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  const color =
    score >= 80 ? "#34d399" : score >= 60 ? "#fbbf24" : "#f87171";

  return (
    <svg width={size} height={size} className="confidence-ring">
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke="rgba(255,255,255,0.04)"
        strokeWidth="5"
      />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="5"
        strokeDasharray={c}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="confidence-ring-circle"
        style={{ filter: `drop-shadow(0 0 8px ${color}50)` }}
      />
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill="#f1f5f9"
        fontSize={size * 0.2}
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
  const map: Record<string, { bg: string; color: string; border: string }> = {
    completed:    { bg: "rgba(52,211,153,0.08)",  color: "var(--success)", border: "rgba(52,211,153,0.2)" },
    in_progress:  { bg: "rgba(251,191,36,0.08)",  color: "var(--warning)", border: "rgba(251,191,36,0.2)" },
    pending:      { bg: "rgba(90,101,122,0.08)",  color: "var(--text-secondary)", border: "rgba(255,255,255,0.08)" },
  };
  const s = map[status] ?? { bg: "rgba(248,113,113,0.08)", color: "var(--critical)", border: "rgba(248,113,113,0.2)" };

  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-wider"
      style={{ background: s.bg, color: s.color, borderColor: s.border }}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

// ─── Timeline Icon Helper ───────────────────────────────────────────
function TimelineIcon({ type }: { type: TimelineEvent["type"] }) {
  const typeMap: Record<TimelineEvent["type"], React.ReactNode> = {
    fir_filed:     <FileText className="w-4 h-4 text-[#22d3ee]" />,
    complaint:     <FileText className="w-4 h-4 text-[#22d3ee]" />,
    witness:       <User className="w-4 h-4 text-[#818cf8]" />,
    cctv:          <Shield className="w-4 h-4 text-[#818cf8]" />,
    phone:         <Network className="w-4 h-4 text-[#34d399]" />,
    vehicle:       <Clock className="w-4 h-4 text-[#fbbf24]" />,
    financial:     <AlertTriangle className="w-4 h-4 text-[#fbbf24]" />,
    investigation: <CheckCircle2 className="w-4 h-4 text-[#2dd4bf]" />,
    arrest:        <XCircle className="w-4 h-4 text-[#f87171]" />,
  };
  return <>{typeMap[type] ?? <Clock className="w-4 h-4 text-[#8b97b0]" />}</>;
}

// ─── Report Template Cards ──────────────────────────────────────────
const REPORT_TEMPLATES = [
  {
    id: "full",
    title: "Full Intelligence Brief",
    description: "Comprehensive AI-generated analysis with executive summary, network intelligence, evidence chain, and recommendations.",
    icon: <Shield className="w-5 h-5 text-[#22d3ee]" />,
    gradient: "linear-gradient(135deg, rgba(34,211,238,0.08), transparent 60%)",
    accent: "#22d3ee",
  },
  {
    id: "similar",
    title: "Similar Crimes Analysis",
    description: "Cross-referenced pattern analysis matching modus operandi, geography, and behavioral signatures across the database.",
    icon: <Network className="w-5 h-5 text-[#818cf8]" />,
    gradient: "linear-gradient(135deg, rgba(129,140,248,0.08), transparent 60%)",
    accent: "#818cf8",
  },
  {
    id: "timeline",
    title: "Investigation Timeline Report",
    description: "Detailed chronological reconstruction of all investigation events, evidence collection milestones, and status updates.",
    icon: <Clock className="w-5 h-5 text-[#34d399]" />,
    gradient: "linear-gradient(135deg, rgba(52,211,153,0.08), transparent 60%)",
    accent: "#34d399",
  },
];

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

  const inputStyle: React.CSSProperties = {
    background: "rgba(10,15,28,0.8)",
    border: "1px solid var(--border-subtle)",
    color: "var(--text-primary)",
  };

  const selectContentStyle: React.CSSProperties = {
    background: "rgba(15,21,36,0.95)",
    border: "1px solid var(--border-subtle)",
  };

  return (
    <div className="p-5 h-full overflow-y-auto space-y-6 animate-fade-in-up">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-3"
      >
        <div
          className="p-2.5 rounded-xl"
          style={{
            background: "rgba(34,211,238,0.1)",
            border: "1px solid rgba(34,211,238,0.15)",
            boxShadow: "0 0 20px rgba(34,211,238,0.08)",
          }}
        >
          <FileText className="w-6 h-6 text-[#22d3ee]" />
        </div>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-[#f1f5f9]">
            INTELLIGENCE REPORT GENERATOR
          </h1>
          <p className="text-sm text-[#8b97b0]">
            Generate professional investigation reports with AI analysis
          </p>
        </div>
      </motion.div>

      {/* ─── Template Selector ───────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05 }}
        className="space-y-3"
      >
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[#5a657a] flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#22d3ee]" />
          Report Template
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {REPORT_TEMPLATES.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => setReportType(tpl.id)}
              className="glass-card p-5 text-left cursor-pointer transition-all duration-300 relative overflow-hidden group"
              style={{
                borderColor:
                  reportType === tpl.id
                    ? `${tpl.accent}30`
                    : "rgba(255,255,255,0.06)",
                boxShadow:
                  reportType === tpl.id
                    ? `0 0 30px ${tpl.accent}10, inset 0 1px 0 rgba(255,255,255,0.03)`
                    : "none",
              }}
            >
              {/* Gradient overlay */}
              <div
                className="absolute inset-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                style={{ background: tpl.gradient }}
              />
              {/* Active accent line top */}
              {reportType === tpl.id && (
                <div
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{
                    background: `linear-gradient(90deg, ${tpl.accent}, transparent)`,
                    boxShadow: `0 0 12px ${tpl.accent}40`,
                  }}
                />
              )}
              <div className="relative">
                <div className="mb-3">{tpl.icon}</div>
                <h3
                  className="text-sm font-semibold mb-1.5"
                  style={{ color: reportType === tpl.id ? tpl.accent : "#f1f5f9" }}
                >
                  {tpl.title}
                </h3>
                <p className="text-xs text-[#8b97b0] leading-relaxed">
                  {tpl.description}
                </p>
                {reportType === tpl.id && (
                  <div
                    className="mt-3 inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: tpl.accent }}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    Selected
                  </div>
                )}
              </div>
            </button>
          ))}
        </div>
      </motion.div>

      {/* ─── Configuration Panel ─────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1 }}
        className="glass-card p-5 md:p-6 space-y-5"
        style={{ borderColor: "rgba(255,255,255,0.04)" }}
      >
        <h2 className="text-sm font-semibold flex items-center gap-2 text-[#f1f5f9]">
          <Lock className="w-4 h-4 text-[#22d3ee]" />
          Report Configuration
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* FIR Selector */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#8b97b0] uppercase tracking-wider">
              FIR Reference
            </label>
            <Select value={selectedFirId} onValueChange={setSelectedFirId}>
              <SelectTrigger style={inputStyle}>
                <SelectValue placeholder="Select an FIR…" />
              </SelectTrigger>
              <SelectContent style={selectContentStyle}>
                {firs.map((fir) => (
                  <SelectItem key={fir.fir_id} value={fir.fir_id}>
                    <span className="font-mono text-xs">{fir.fir_id}</span>
                    <span className="text-[#5a657a] mx-1.5">—</span>
                    <span className="text-[#8b97b0] text-xs">{fir.crime_type}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Accused Focus */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#8b97b0] uppercase tracking-wider">
              Accused Focus{" "}
              <span className="text-[#3d4659] normal-case">(optional)</span>
            </label>
            <Select
              value={selectedAccusedId}
              onValueChange={setSelectedAccusedId}
            >
              <SelectTrigger style={inputStyle}>
                <SelectValue placeholder="Select an accused…" />
              </SelectTrigger>
              <SelectContent style={selectContentStyle}>
                {accusedList.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    <span className="text-xs">{a.name}</span>
                    <span className="text-[#5a657a] mx-1.5">—</span>
                    <span className="text-[#8b97b0] text-xs">Risk: {a.risk}</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Report Type */}
          <div className="space-y-2">
            <label className="text-xs font-medium text-[#8b97b0] uppercase tracking-wider">
              Report Type
            </label>
            <Select value={reportType} onValueChange={setReportType}>
              <SelectTrigger style={inputStyle}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={selectContentStyle}>
                <SelectItem value="full">Full Intelligence Brief</SelectItem>
                <SelectItem value="similar">Similar Crimes Analysis</SelectItem>
                <SelectItem value="timeline">Investigation Timeline Report</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={(!selectedFirId && !selectedAccusedId) || isGenerating}
          className="px-8 py-3 rounded-xl text-sm font-semibold transition-all duration-300 cursor-pointer"
          style={{
            background: "linear-gradient(135deg, #22d3ee, #06b6d4)",
            color: "#050810",
            boxShadow: "0 0 24px rgba(34,211,238,0.2), 0 4px 16px rgba(0,0,0,0.3)",
          }}
        >
          {isGenerating ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Generating Report…
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Generate Report
            </span>
          )}
        </Button>
      </motion.div>

      {/* ─── Report Preview ──────────────────────────────────────── */}
      {reportGenerated && (
        <div className="space-y-5 animate-fade-in-up">
          {/* Export Button Bar */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="flex items-center justify-between gap-3"
          >
            <span className="text-xs text-[#5a657a] uppercase tracking-wider font-medium">
              Report Preview
            </span>
            <div className="flex items-center gap-2">
              <Button
                onClick={handleExportPDF}
                className="px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
                style={{
                  background: "linear-gradient(135deg, rgba(34,211,238,0.12), rgba(34,211,238,0.06))",
                  color: "var(--primary)",
                  border: "1px solid rgba(34,211,238,0.2)",
                  boxShadow: "0 0 16px rgba(34,211,238,0.06)",
                }}
              >
                <FileDown className="w-3.5 h-3.5 mr-1.5" />
                Export PDF
              </Button>
              <Button
                onClick={() => {
                  // Copy report summary to clipboard
                  if (brief) navigator.clipboard.writeText(brief.executiveSummary);
                }}
                className="px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
                style={{
                  background: "rgba(129,140,248,0.08)",
                  color: "var(--secondary)",
                  border: "1px solid rgba(129,140,248,0.15)",
                }}
              >
                <Copy className="w-3.5 h-3.5 mr-1.5" />
                Copy
              </Button>
              <Button
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 cursor-pointer"
                style={{
                  background: "var(--border-subtle)",
                  color: "var(--text-secondary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Print
              </Button>
            </div>
          </motion.div>

          {/* a. Report Header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="glass-card p-6 relative overflow-hidden"
          >
            {/* Subtle gradient overlay */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.04) 0%, transparent 40%, rgba(129,140,248,0.03) 100%)" }}
            />
            <div className="relative flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-1.5">
                <h2 className="text-xl md:text-2xl font-bold tracking-wide text-[#f1f5f9]">
                  KSP SENTINEL AI — INTELLIGENCE REPORT
                </h2>
                <p className="text-xs text-[#8b97b0]">
                  Karnataka State Police — Crime Intelligence Division
                </p>
              </div>
              <div className="flex flex-col items-start md:items-end gap-1 text-sm text-[#8b97b0]">
                <span>
                  Report ID:{" "}
                  <span className="text-[#f1f5f9] font-mono text-xs">
                    RPT-{reportId}
                  </span>
                </span>
                <span className="text-xs">
                  Generated:{" "}
                  <span className="text-[#f1f5f9]">
                    {new Date().toLocaleString("en-IN")}
                  </span>
                </span>
                <span className="text-xs">
                  Officer:{" "}
                  <span className="text-[#f1f5f9]">
                    {user?.username ?? "Unknown"} ({user?.role ?? "N/A"})
                  </span>
                </span>
              </div>
            </div>
            <div className="relative mt-4 flex items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-bold tracking-widest"
                style={{
                  background: "rgba(248,113,113,0.1)",
                  border: "1px solid rgba(248,113,113,0.15)",
                  color: "var(--critical)",
                }}
              >
                <Lock className="w-3 h-3" />
                CLASSIFICATION: CONFIDENTIAL
              </span>
              <Badge
                variant="outline"
                className="border-[rgba(34,211,238,0.3)] text-[#22d3ee] text-[10px]"
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
              className="glass-card p-6"
              style={{ borderColor: "rgba(255,255,255,0.04)" }}
            >
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2 text-[#f1f5f9]">
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
                        <span className="text-[#5a657a] text-xs uppercase tracking-wider">FIR</span>
                        <p className="text-[#f1f5f9] font-medium font-mono text-xs mt-0.5">
                          {selectedFir.fir_id}
                        </p>
                      </div>
                      <div>
                        <span className="text-[#5a657a] text-xs uppercase tracking-wider">Crime</span>
                        <p className="text-[#f1f5f9] text-xs mt-0.5">{selectedFir.crime_type}</p>
                      </div>
                      <div>
                        <span className="text-[#5a657a] text-xs uppercase tracking-wider">District</span>
                        <p className="text-[#f1f5f9] text-xs mt-0.5">{selectedFir.district}</p>
                      </div>
                      <div>
                        <span className="text-[#5a657a] text-xs uppercase tracking-wider">Status</span>
                        <p className="mt-0.5">
                          <span
                            className="text-xs font-medium"
                            style={{
                              color: "var(--warning)",
                              background: "rgba(251,191,36,0.08)",
                              padding: "1px 8px",
                              borderRadius: "9999px",
                              border: "1px solid rgba(251,191,36,0.15)",
                            }}
                          >
                            {selectedFir.investigation_status}
                          </span>
                        </p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center gap-1 shrink-0">
                  <ConfidenceRing score={brief.confidenceScore} />
                  <span className="text-[10px] text-[#5a657a] uppercase tracking-wider mt-1">
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
              className="glass-card p-6"
              style={{ borderColor: "rgba(255,255,255,0.04)" }}
            >
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2 text-[#f1f5f9]">
                <Clock className="w-5 h-5 text-[#22d3ee]" />
                Investigation Timeline
                <Badge
                  variant="outline"
                  className="border-[rgba(255,255,255,0.06)] text-[#8b97b0] text-[10px] ml-1"
                >
                  {timeline.length} events
                </Badge>
              </h3>
              <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                {timeline.map((event, idx) => (
                  <div
                    key={event.id}
                    className="flex items-start gap-3 p-3.5 rounded-lg transition-colors duration-200"
                    style={{
                      background: "rgba(10,15,28,0.4)",
                      border: "1px solid rgba(255,255,255,0.04)",
                    }}
                  >
                    <div
                      className="mt-0.5 p-2 rounded-lg shrink-0"
                      style={{
                        background: "rgba(15,21,36,0.6)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <TimelineIcon type={event.type} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-[#f1f5f9]">
                          {event.title}
                        </span>
                        <StatusBadge status={event.status} />
                      </div>
                      <p className="text-xs text-[#8b97b0] mt-1 line-clamp-2 leading-relaxed">
                        {event.description}
                      </p>
                    </div>
                    <span className="text-[10px] text-[#3d4659] whitespace-nowrap shrink-0 mt-1">
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
              className="glass-card p-6"
              style={{ borderColor: "rgba(255,255,255,0.04)" }}
            >
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2 text-[#f1f5f9]">
                <AlertTriangle className="w-5 h-5 text-[#fbbf24]" />
                Similar Crimes Analysis
              </h3>
              <div className="space-y-4">
                {similarCrimes.map((result) => (
                  <div
                    key={result.fir.fir_id}
                    className="p-4 rounded-lg space-y-3"
                    style={{
                      background: "rgba(10,15,28,0.4)",
                      border: "1px solid rgba(255,255,255,0.04)",
                    }}
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
                      <span
                        className="text-sm font-bold"
                        style={{
                          color:
                            result.similarityScore >= 75
                              ? "#f87171"
                              : result.similarityScore >= 50
                                ? "#fbbf24"
                                : "#34d399",
                        }}
                      >
                        {result.similarityScore}% match
                      </span>
                    </div>

                    {/* Similarity Bar */}
                    <div
                      className="w-full h-2 rounded-full overflow-hidden"
                      style={{ background: "rgba(15,21,36,0.6)", border: "1px solid rgba(255,255,255,0.03)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${result.similarityScore}%`,
                          background:
                            result.similarityScore >= 75
                              ? "linear-gradient(90deg, #f87171, #ef4444)"
                              : result.similarityScore >= 50
                                ? "linear-gradient(90deg, #fbbf24, #f59e0b)"
                                : "linear-gradient(90deg, #34d399, #10b981)",
                          boxShadow:
                            result.similarityScore >= 75
                              ? "0 0 12px rgba(248,113,113,0.3)"
                              : result.similarityScore >= 50
                                ? "0 0 12px rgba(251,191,36,0.3)"
                                : "0 0 12px rgba(52,211,153,0.3)",
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
                            className="border-[rgba(52,211,153,0.2)] text-[#34d399] text-[10px]"
                            style={{ background: "rgba(52,211,153,0.06)" }}
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
                            className="border-[rgba(248,113,113,0.12)] text-[rgba(248,113,113,0.5)] text-[10px]"
                            style={{ background: "rgba(248,113,113,0.04)" }}
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            {f.factor}
                          </Badge>
                        ))}
                    </div>

                    <p className="text-xs text-[#8b97b0] leading-relaxed">
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
              className="glass-card p-6"
              style={{ borderColor: "rgba(255,255,255,0.04)" }}
            >
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2 text-[#f1f5f9]">
                <Network className="w-5 h-5 text-[#818cf8]" />
                Network Intelligence
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Associated Gang Members */}
                {brief.likelyAssociates.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-[#5a657a] uppercase tracking-wider mb-3">
                      Likely Associates
                    </h4>
                    <div className="space-y-2 max-h-72 overflow-y-auto">
                      {brief.likelyAssociates.map((assoc) => (
                        <div
                          key={assoc.id}
                          className="flex items-center justify-between p-3 rounded-lg transition-colors duration-200"
                          style={{
                            background: "rgba(10,15,28,0.4)",
                            border: "1px solid rgba(255,255,255,0.04)",
                          }}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="w-7 h-7 rounded-lg flex items-center justify-center"
                              style={{
                                background: "rgba(15,21,36,0.6)",
                                border: "1px solid var(--border-subtle)",
                              }}
                            >
                              <User className="w-3.5 h-3.5 text-[#8b97b0]" />
                            </div>
                            <div>
                              <span className="text-sm font-medium text-[#f1f5f9]">
                                {assoc.name}
                              </span>
                              <p className="text-[10px] text-[#5a657a]">
                                {assoc.connection}
                              </p>
                            </div>
                          </div>
                          <Badge
                            variant="outline"
                            className="text-[10px]"
                            style={
                              assoc.strength === "strong"
                                ? { borderColor: "rgba(248,113,113,0.2)", color: "var(--critical)", background: "rgba(248,113,113,0.06)" }
                                : assoc.strength === "moderate"
                                  ? { borderColor: "rgba(251,191,36,0.2)", color: "var(--warning)", background: "rgba(251,191,36,0.06)" }
                                  : { borderColor: "rgba(255,255,255,0.08)", color: "var(--text-secondary)", background: "var(--border-subtle)" }
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
                      <h4 className="text-xs font-semibold text-[#5a657a] uppercase tracking-wider mb-3">
                        Linked Cases
                      </h4>
                      <div className="space-y-2 max-h-36 overflow-y-auto">
                        {brief.relatedCases.map((rc) => (
                          <div
                            key={rc.firId}
                            className="flex items-center gap-2.5 p-2.5 rounded-lg transition-colors duration-200"
                            style={{
                              background: "rgba(10,15,28,0.4)",
                              border: "1px solid rgba(255,255,255,0.04)",
                            }}
                          >
                            <FileText className="w-3.5 h-3.5 text-[#22d3ee] shrink-0" />
                            <span className="font-mono text-xs text-[#22d3ee]">
                              {rc.firId}
                            </span>
                            <span className="text-[10px] text-[#5a657a] truncate">
                              {rc.crimeType} — {rc.relevance}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {brief.financialLinks.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-[#5a657a] uppercase tracking-wider mb-3">
                        Financial Links
                      </h4>
                      <div className="space-y-2 max-h-36 overflow-y-auto">
                        {brief.financialLinks.map((fl, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-lg"
                            style={{
                              background: "rgba(10,15,28,0.4)",
                              border: "1px solid rgba(255,255,255,0.04)",
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-medium text-[#f1f5f9]">
                                {fl.bank} — {fl.holder}
                              </span>
                              <span
                                className="text-xs font-mono font-semibold"
                                style={{ color: "var(--success)" }}
                              >
                                ₹{fl.totalAmount.toLocaleString("en-IN")}
                              </span>
                            </div>
                            <p className="text-[10px] text-[#5a657a] mt-1">
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
              className="glass-card p-6"
              style={{ borderColor: "rgba(255,255,255,0.04)" }}
            >
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2 text-[#f1f5f9]">
                <Shield className="w-5 h-5 text-[#22d3ee]" />
                AI Findings & Recommendations
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Suggested Actions */}
                {brief.suggestedActions.length > 0 && (
                  <div>
                    <h4 className="text-xs font-semibold text-[#5a657a] uppercase tracking-wider mb-3">
                      Suggested Actions
                    </h4>
                    <div className="space-y-2">
                      {brief.suggestedActions.map((sa, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-2.5 p-3 rounded-lg"
                          style={{
                            background: "rgba(10,15,28,0.4)",
                            border: "1px solid rgba(255,255,255,0.04)",
                          }}
                        >
                          <div
                            className="mt-1 w-2 h-2 rounded-full shrink-0"
                            style={{
                              backgroundColor:
                                sa.priority === "immediate" ? "#f87171" :
                                sa.priority === "short_term" ? "#fbbf24" : "#22d3ee",
                              boxShadow:
                                sa.priority === "immediate" ? "0 0 8px rgba(248,113,113,0.4)" :
                                sa.priority === "short_term" ? "0 0 8px rgba(251,191,36,0.4)" : "0 0 8px rgba(34,211,238,0.4)",
                            }}
                          />
                          <div>
                            <p className="text-sm text-[#f1f5f9]">
                              {sa.action}
                            </p>
                            <p className="text-[10px] text-[#5a657a] mt-0.5">
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
                      <h4 className="text-xs font-semibold text-[#5a657a] uppercase tracking-wider mb-3">
                        Missing Evidence
                      </h4>
                      <div className="space-y-2">
                        {brief.missingEvidence.map((me, i) => (
                          <div
                            key={i}
                            className="flex items-start gap-2.5"
                          >
                            <XCircle
                              className="w-4 h-4 shrink-0 mt-0.5"
                              style={{
                                color:
                                  me.priority === "high" ? "#f87171" :
                                  me.priority === "medium" ? "#fbbf24" : "#8b97b0",
                              }}
                            />
                            <div>
                              <span className="text-xs font-medium text-[#f1f5f9]">
                                {me.type}
                              </span>
                              <p className="text-[10px] text-[#5a657a]">
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
                      <h4 className="text-xs font-semibold text-[#5a657a] uppercase tracking-wider mb-3">
                        Behavioral Analysis
                      </h4>
                      <div className="space-y-2">
                        {brief.behavioralAnalysis.map((ba, i) => (
                          <div
                            key={i}
                            className="p-3 rounded-lg"
                            style={{
                              background: "rgba(10,15,28,0.4)",
                              border: "1px solid rgba(255,255,255,0.04)",
                            }}
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-[#f1f5f9]">
                                {ba.pattern}
                              </span>
                              <Badge
                                variant="outline"
                                className="border-[rgba(255,255,255,0.06)] text-[#8b97b0] text-[10px]"
                              >
                                {ba.frequency}
                              </Badge>
                            </div>
                            <p className="text-[10px] text-[#5a657a] mt-1 leading-relaxed">
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
              className="glass-card p-6"
              style={{ borderColor: "rgba(255,255,255,0.04)" }}
            >
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2 text-[#f1f5f9]">
                <CheckCircle2 className="w-5 h-5 text-[#34d399]" />
                Evidence Summary
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div
                  className="p-5 rounded-xl text-center"
                  style={{
                    background: "rgba(10,15,28,0.4)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <p className="text-3xl font-bold text-[#22d3ee]">
                    {brief.relatedCases.length}
                  </p>
                  <p className="text-[10px] text-[#5a657a] uppercase tracking-wider mt-1">
                    FIRs Referenced
                  </p>
                </div>
                <div
                  className="p-5 rounded-xl text-center"
                  style={{
                    background: "rgba(10,15,28,0.4)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <p
                    className="text-3xl font-bold"
                    style={{
                      color:
                        brief.missingEvidence.length === 0
                          ? "#34d399"
                          : brief.missingEvidence.filter((m) => m.priority === "high").length === 0
                            ? "#fbbf24"
                            : "#f87171",
                    }}
                  >
                    {brief.missingEvidence.length === 0
                      ? "Strong"
                      : brief.missingEvidence.filter((m) => m.priority === "high").length === 0
                        ? "Moderate"
                        : "Weak"}
                  </p>
                  <p className="text-[10px] text-[#5a657a] uppercase tracking-wider mt-1">
                    Evidence Chain
                  </p>
                </div>
                <div
                  className="p-5 rounded-xl flex flex-col items-center justify-center"
                  style={{
                    background: "rgba(10,15,28,0.4)",
                    border: "1px solid rgba(255,255,255,0.04)",
                  }}
                >
                  <ConfidenceRing score={brief.confidenceScore} size={80} />
                  <p className="text-[10px] text-[#5a657a] uppercase tracking-wider mt-2">
                    Overall Confidence
                  </p>
                </div>
              </div>

              {/* Evidence Chain Items */}
              {brief.relatedCases.length > 0 && (
                <div className="mt-5">
                  <h4 className="text-xs font-semibold text-[#5a657a] uppercase tracking-wider mb-2.5">
                    Evidence Chain
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {brief.relatedCases.map((rc) => (
                      <Badge
                        key={rc.firId}
                        variant="outline"
                        className="border-[rgba(255,255,255,0.06)] text-[#f1f5f9] text-[10px]"
                        style={{ background: "var(--border-subtle)" }}
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
            className="glass-card p-6"
            style={{ borderColor: "rgba(255,255,255,0.04)" }}
          >
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex-1 text-center md:text-left">
                <p className="text-sm text-[#8b97b0]">
                  This report was auto-generated by{" "}
                  <span className="text-[#f1f5f9] font-medium">
                    KSP Sentinel AI
                  </span>
                </p>
                <p className="text-[10px] text-[#3d4659] mt-1">
                  Generated: {new Date().toLocaleString("en-IN")}
                </p>
                <p
                  className="text-[10px] mt-2 font-semibold tracking-widest uppercase"
                  style={{ color: "rgba(248,113,113,0.6)" }}
                >
                  CLASSIFICATION: CONFIDENTIAL — FOR AUTHORIZED PERSONNEL ONLY
                </p>
              </div>

              {/* QR Code Placeholder */}
              <div className="flex flex-col items-center gap-1">
                <div
                  className="w-16 h-16 rounded-lg flex items-center justify-center"
                  style={{
                    background: "rgba(15,21,36,0.5)",
                    border: "2px dashed rgba(255,255,255,0.06)",
                  }}
                >
                  <span className="text-xs font-mono text-[#3d4659]">QR</span>
                </div>
                <span className="text-[10px] text-[#3d4659]">
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