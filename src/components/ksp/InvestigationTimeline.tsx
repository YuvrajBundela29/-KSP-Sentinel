"use client";

import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock,
  FileText,
  MessageSquare,
  Users,
  Camera,
  Phone,
  Car,
  Banknote,
  Search,
  ShieldAlert,
  AlertTriangle,
  ChevronRight,
  Filter,
  Eye,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAppStore } from "@/lib/store";
import { generateTimeline } from "@/lib/intelligence";
import type { TimelineEvent } from "@/lib/types";

// ─── Icon Rendering ───────────────────────────────────────────────────
function TimelineIcon({
  name,
  className,
  style,
}: {
  name: string;
  className?: string;
  style?: React.CSSProperties;
}) {
  const props = { className, style };
  switch (name) {
    case "FileText":
      return <FileText {...props} />;
    case "MessageSquare":
      return <MessageSquare {...props} />;
    case "Users":
      return <Users {...props} />;
    case "Camera":
      return <Camera {...props} />;
    case "Phone":
      return <Phone {...props} />;
    case "Car":
      return <Car {...props} />;
    case "Banknote":
      return <Banknote {...props} />;
    case "Search":
      return <Search {...props} />;
    case "ShieldAlert":
    case "Handcuffs":
    case "CircleStop":
      return <ShieldAlert {...props} />;
    default:
      return <AlertTriangle {...props} />;
  }
}

// ─── Color System ──────────────────────────────────────────────────────

// Event TYPE colors (what kind of event it is)
const TYPE_COLORS: Record<TimelineEvent["type"], { color: string; glow: string; bg: string; label: string }> = {
  complaint:     { color: "#22d3ee", glow: "rgba(34,211,238,0.25)",  bg: "rgba(34,211,238,0.08)",  label: "Complaint" },
  fir_filed:     { color: "#22d3ee", glow: "rgba(34,211,238,0.25)",  bg: "rgba(34,211,238,0.08)",  label: "FIR Filed" },
  witness:       { color: "#818cf8", glow: "rgba(129,140,248,0.25)", bg: "rgba(129,140,248,0.08)", label: "Witness" },
  cctv:          { color: "#818cf8", glow: "rgba(129,140,248,0.25)", bg: "rgba(129,140,248,0.08)", label: "CCTV" },
  phone:         { color: "#34d399", glow: "rgba(52,211,153,0.25)",  bg: "rgba(52,211,153,0.08)",  label: "Phone" },
  vehicle:       { color: "#fbbf24", glow: "rgba(251,191,36,0.25)",  bg: "rgba(251,191,36,0.08)",  label: "Vehicle" },
  financial:     { color: "#fbbf24", glow: "rgba(251,191,36,0.25)",  bg: "rgba(251,191,36,0.08)",  label: "Financial" },
  investigation: { color: "#2dd4bf", glow: "rgba(45,212,191,0.25)",  bg: "rgba(45,212,191,0.08)",  label: "Investigation" },
  arrest:        { color: "#f87171", glow: "rgba(248,113,113,0.25)", bg: "rgba(248,113,113,0.08)", label: "Arrest" },
};

// Status colors (completion state)
const STATUS_COLORS: Record<TimelineEvent["status"], string> = {
  completed: "#34d399",
  in_progress: "#22d3ee",
  pending: "#fbbf24",
  unknown: "#5a657a",
};

const STATUS_LABELS: Record<TimelineEvent["status"], string> = {
  completed: "Completed",
  in_progress: "In Progress",
  pending: "Pending",
  unknown: "Unknown",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-[#f87171]/20 text-[#f87171] border-[rgba(248,113,113,0.15)]",
  high: "bg-[#fbbf24]/20 text-[#fbbf24] border-[rgba(251,191,36,0.15)]",
  medium: "bg-[#fbbf24]/20 text-[#fbbf24] border-[rgba(251,191,36,0.15)]",
  low: "bg-[#34d399]/20 text-[#34d399] border-[rgba(52,211,153,0.15)]",
};

const SEVERITY_DOT_COLORS: Record<string, string> = {
  critical: "#f87171",
  high: "#fbbf24",
  medium: "#eab308",
  low: "#34d399",
};

// ─── Helpers ─────────────────────────────────────────────────────────
function formatTimestamp(ts: string): string {
  try {
    const d = new Date(ts);
    return d.toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return ts;
  }
}

// ─── Filter Pill Button ───────────────────────────────────────────────
function FilterPill({
  label,
  active,
  onClick,
  color,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  color?: string;
}) {
  return (
    <button
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 cursor-pointer"
      style={{
        background: active
          ? color
            ? `${color}15`
            : "rgba(34,211,238,0.12)"
          : "transparent",
        borderColor: active
          ? color
            ? `${color}40`
            : "rgba(34,211,238,0.3)"
          : "rgba(255,255,255,0.06)",
        color: active
          ? color ?? "#22d3ee"
          : "#8b97b0",
        boxShadow: active
          ? color
            ? `0 0 16px ${color}20`
            : "0 0 16px rgba(34,211,238,0.12)"
          : "none",
      }}
    >
      {label}
    </button>
  );
}

// ─── Event Node (left-aligned icon) ───────────────────────────────────
function LeftNode({
  event,
  index,
}: {
  event: TimelineEvent;
  index: number;
}) {
  const typeInfo = TYPE_COLORS[event.type] ?? TYPE_COLORS.complaint;
  const statusColor = STATUS_COLORS[event.status];
  const isInProgress = event.status === "in_progress";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{
        delay: index * 0.08 + 0.05,
        duration: 0.35,
        ease: "easeOut",
      }}
      className="relative z-10 flex items-center justify-center w-11 h-11 rounded-xl shrink-0"
      style={{
        backgroundColor: typeInfo.bg,
        border: `1.5px solid ${typeInfo.color}40`,
        boxShadow: isInProgress
          ? `0 0 20px ${typeInfo.glow}, 0 0 40px ${typeInfo.bg}`
          : `0 4px 12px rgba(0,0,0,0.3)`,
      }}
    >
      {isInProgress && (
        <div className="timeline-pulse absolute inset-[-3px] rounded-xl" style={{ border: `1.5px solid ${typeInfo.color}30` }} />
      )}
      <TimelineIcon
        name={event.icon}
        className="w-4.5 h-4.5 relative z-10"
        style={{ color: typeInfo.color }}
      />
    </motion.div>
  );
}

// ─── Event Card Content ───────────────────────────────────────────────
function EventCardContent({
  event,
  index,
}: {
  event: TimelineEvent;
  index: number;
}) {
  const typeInfo = TYPE_COLORS[event.type] ?? TYPE_COLORS.complaint;
  const statusColor = STATUS_COLORS[event.status];

  return (
    <motion.div
      initial={{ opacity: 0, x: 16 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{
        delay: index * 0.08 + 0.1,
        duration: 0.4,
        ease: [0.4, 0, 0.2, 1],
      }}
      className="glass-card p-4 flex-1 min-w-0 group"
      style={{
        borderColor: `${typeInfo.color}15`,
      }}
    >
      {/* Top accent line */}
      <div
        className="absolute top-0 left-4 right-4 h-[1px]"
        style={{
          background: `linear-gradient(90deg, ${typeInfo.color}30, transparent)`,
        }}
      />

      <div className="relative space-y-2.5">
        {/* Title row */}
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="inline-flex items-center justify-center w-6 h-6 rounded-md"
            style={{
              backgroundColor: typeInfo.bg,
              border: `1px solid ${typeInfo.color}20`,
            }}
          >
            <TimelineIcon
              name={event.icon}
              className="w-3 h-3"
              style={{ color: typeInfo.color }}
            />
          </span>
          <h4 className="text-sm font-semibold text-[#f1f5f9] leading-tight">
            {event.title}
          </h4>
          <span
            className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full"
            style={{
              color: typeInfo.color,
              background: typeInfo.bg,
              border: `1px solid ${typeInfo.color}15`,
            }}
          >
            {typeInfo.label}
          </span>
        </div>

        {/* Description */}
        <p className="text-xs text-[#8b97b0] leading-relaxed pl-8">
          {event.description}
        </p>

        {/* Footer: timestamp + status */}
        <div className="flex items-center justify-between gap-2 flex-wrap pl-8">
          <span className="text-[10px] text-[#5a657a] flex items-center gap-1.5">
            <Clock className="w-3 h-3" />
            {formatTimestamp(event.timestamp)}
          </span>
          <div className="flex items-center gap-2">
            {/* Status dot + label */}
            <span className="flex items-center gap-1.5">
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  backgroundColor: statusColor,
                  boxShadow: event.status === "in_progress" ? `0 0 8px ${statusColor}` : "none",
                }}
              />
              <span
                className="text-[10px] font-medium"
                style={{ color: statusColor }}
              >
                {STATUS_LABELS[event.status]}
              </span>
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// ─── Summary Bar ─────────────────────────────────────────────────────
function SummaryBar({ events }: { events: TimelineEvent[] }) {
  const total = events.length;
  const completed = events.filter((e) => e.status === "completed").length;
  const inProgress = events.filter((e) => e.status === "in_progress").length;
  const pending = events.filter((e) => e.status === "pending").length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.3, duration: 0.4 }}
      className="glass-card p-5"
    >
      {/* Stats row */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-6 text-xs">
          <span className="text-[#8b97b0]">
            Total Events:{" "}
            <span className="text-[#f1f5f9] font-bold text-sm">{total}</span>
          </span>
          <span className="flex items-center gap-2 text-[#8b97b0]">
            <span className="w-2 h-2 rounded-full bg-[#34d399]" style={{ boxShadow: "0 0 8px rgba(52,211,153,0.4)" }} />
            <span className="text-[#34d399] font-semibold">{completed}</span> Done
          </span>
          <span className="flex items-center gap-2 text-[#8b97b0]">
            <span className="w-2 h-2 rounded-full bg-[#22d3ee]" style={{ boxShadow: "0 0 8px rgba(34,211,238,0.4)" }} />
            <span className="text-[#22d3ee] font-semibold">{inProgress}</span> Active
          </span>
          <span className="flex items-center gap-2 text-[#8b97b0]">
            <span className="w-2 h-2 rounded-full bg-[#fbbf24]" style={{ boxShadow: "0 0 8px rgba(251,191,36,0.4)" }} />
            <span className="text-[#fbbf24] font-semibold">{pending}</span> Pending
          </span>
        </div>
        <span className="text-xs text-[#8b97b0]">
          Investigation Progress:{" "}
          <span className="text-[#f1f5f9] font-bold text-sm">{pct}%</span>
        </span>
      </div>

      {/* Progress bar */}
      <div
        className="w-full h-2.5 rounded-full overflow-hidden"
        style={{ background: "rgba(15,21,36,0.6)", border: "1px solid rgba(255,255,255,0.04)" }}
      >
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{
            background: "linear-gradient(90deg, #22d3ee, #818cf8)",
            boxShadow: "0 0 12px rgba(34,211,238,0.3), 0 0 24px rgba(129,140,248,0.15)",
          }}
        />
      </div>
    </motion.div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────
function EmptyState({
  firs,
  onSelectFir,
}: {
  firs: { fir_id: string; crime_type: string; severity: string }[];
  onSelectFir: (id: string) => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="flex flex-col items-center justify-center py-20 px-6 text-center"
    >
      <div
        className="w-20 h-20 rounded-2xl glass-card flex items-center justify-center mb-6"
        style={{ boxShadow: "0 0 40px rgba(34,211,238,0.06)" }}
      >
        <Clock className="w-9 h-9 text-[#5a657a]" />
      </div>
      <h3 className="text-lg font-semibold text-[#f1f5f9] mb-2">
        Select an FIR to view its investigation timeline
      </h3>
      <p className="text-sm text-[#8b97b0] mb-8 max-w-md">
        Choose a First Information Report from the dropdown above or click one
        of the cases below to explore the chronological investigation events.
      </p>
      {firs.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-2 max-w-lg">
          {firs.map((fir, i) => (
            <motion.button
              key={fir.fir_id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06, duration: 0.3 }}
              onClick={() => onSelectFir(fir.fir_id)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium border border-[rgba(255,255,255,0.06)] bg-[rgba(15,21,36,0.45)] text-[#8b97b0] hover:text-[#f1f5f9] hover:border-[rgba(34,211,238,0.3)] hover:bg-[rgba(34,211,238,0.08)] hover:shadow-[0_0_20px_rgba(34,211,238,0.08)] transition-all duration-200 cursor-pointer"
            >
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor:
                    SEVERITY_DOT_COLORS[fir.severity] ?? "#5a657a",
                  boxShadow: `0 0 6px ${SEVERITY_DOT_COLORS[fir.severity] ?? "#5a657a"}60`,
                }}
              />
              <span className="font-mono">{fir.fir_id}</span>
              <span className="text-[#5a657a]">—</span>
              <span>{fir.crime_type}</span>
              <ChevronRight className="w-3 h-3 opacity-40" />
            </motion.button>
          ))}
        </div>
      )}
    </motion.div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
export default function InvestigationTimeline() {
  const { crimeData, selectedFirId, setSelectedFirId } = useAppStore();
  const [activeFirId, setActiveFirId] = useState<string>(() => {
    if (selectedFirId) return selectedFirId;
    return "";
  });

  // Filter state
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");

  // Derive effective FIR ID
  const effectiveFirId = useMemo(() => {
    if (activeFirId) return activeFirId;
    if (
      selectedFirId &&
      crimeData?.firs.some((f) => f.fir_id === selectedFirId)
    ) {
      return selectedFirId;
    }
    return "";
  }, [activeFirId, selectedFirId, crimeData]);

  // Generate timeline events
  const allEvents = useMemo<TimelineEvent[]>(() => {
    if (!crimeData || !effectiveFirId) return [];
    return generateTimeline(crimeData, effectiveFirId);
  }, [crimeData, effectiveFirId]);

  // Apply filters
  const events = useMemo(() => {
    let filtered = allEvents;
    if (filterStatus !== "all") {
      filtered = filtered.filter((e) => e.status === filterStatus);
    }
    if (filterType !== "all") {
      filtered = filtered.filter((e) => e.type === filterType);
    }
    return filtered;
  }, [allEvents, filterStatus, filterType]);

  // Current FIR metadata
  const currentFir = useMemo(() => {
    if (!crimeData || !effectiveFirId) return null;
    return crimeData.firs.find((f) => f.fir_id === effectiveFirId) ?? null;
  }, [crimeData, effectiveFirId]);

  const handleFirSelect = (firId: string) => {
    setActiveFirId(firId);
    setSelectedFirId(firId);
    // Reset filters
    setFilterStatus("all");
    setFilterType("all");
  };

  if (!crimeData) {
    return (
      <div className="flex items-center justify-center h-64 text-[#8b97b0] text-sm">
        Loading crime data...
      </div>
    );
  }

  // Get unique types present in events for type filter
  const eventTypes = useMemo(() => {
    const types = new Set(allEvents.map((e) => e.type));
    return Array.from(types);
  }, [allEvents]);

  return (
    <div className="p-5 h-full flex flex-col animate-fade-in-up">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{
              background: "rgba(34,211,238,0.1)",
              border: "1px solid rgba(34,211,238,0.15)",
              boxShadow: "0 0 20px rgba(34,211,238,0.08)",
            }}
          >
            <Clock className="w-5 h-5 text-[#22d3ee]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#f1f5f9]">
              INVESTIGATION TIMELINE
            </h1>
            <p className="text-xs text-[#8b97b0] mt-0.5">
              Chronological view of investigation events
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {crimeData.firs.length > 0 && (
            <Select
              value={effectiveFirId || undefined}
              onValueChange={handleFirSelect}
            >
              <SelectTrigger
                className="w-[240px] text-[#f1f5f9] text-xs h-9"
                style={{
                  background: "rgba(15,21,36,0.6)",
                  border: "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <SelectValue placeholder="Select FIR..." />
              </SelectTrigger>
              <SelectContent
                style={{
                  background: "var(--bg-card)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {crimeData.firs.map((fir) => (
                  <SelectItem
                    key={fir.fir_id}
                    value={fir.fir_id}
                    className="text-[#f1f5f9] text-xs focus:bg-[rgba(34,211,238,0.1)] focus:text-[#22d3ee]"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-mono">{fir.fir_id}</span>
                      <span className="text-[#5a657a]">—</span>
                      <span className="text-[#8b97b0]">{fir.crime_type}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {currentFir && (
            <AnimatePresence mode="wait">
              <motion.div
                key={currentFir.fir_id}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-2"
              >
                <span className="text-xs text-[#8b97b0] hidden sm:inline">
                  {currentFir.crime_type}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-semibold uppercase tracking-wider ${SEVERITY_COLORS[currentFir.severity] ?? "bg-gray-500/20 text-gray-400 border-gray-500/30"}`}
                >
                  {currentFir.severity}
                </Badge>
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>

      {/* ── Filter Toolbar ──────────────────────────────────────── */}
      {effectiveFirId && allEvents.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="glass-card p-4 mb-5"
          style={{ borderColor: "rgba(255,255,255,0.04)" }}
        >
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            {/* Filter icon + label */}
            <div className="flex items-center gap-2 text-xs text-[#5a657a] font-medium uppercase tracking-wider shrink-0">
              <Filter className="w-3.5 h-3.5" />
              Filters
            </div>

            {/* Status filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <FilterPill
                label="All"
                active={filterStatus === "all"}
                onClick={() => setFilterStatus("all")}
              />
              <FilterPill
                label="Completed"
                active={filterStatus === "completed"}
                onClick={() => setFilterStatus("completed")}
                color="#34d399"
              />
              <FilterPill
                label="In Progress"
                active={filterStatus === "in_progress"}
                onClick={() => setFilterStatus("in_progress")}
                color="#22d3ee"
              />
              <FilterPill
                label="Pending"
                active={filterStatus === "pending"}
                onClick={() => setFilterStatus("pending")}
                color="#fbbf24"
              />
            </div>

            {/* Separator */}
            <div className="hidden sm:block w-px h-6 bg-[rgba(255,255,255,0.06)]" />

            {/* Type filters */}
            <div className="flex items-center gap-2 flex-wrap">
              <FilterPill
                label="All Types"
                active={filterType === "all"}
                onClick={() => setFilterType("all")}
              />
              {eventTypes.map((t) => {
                const info = TYPE_COLORS[t];
                return (
                  <FilterPill
                    key={t}
                    label={info.label}
                    active={filterType === t}
                    onClick={() => setFilterType(t)}
                    color={info.color}
                  />
                );
              })}
            </div>
          </div>

          {/* Active filter count */}
          {(filterStatus !== "all" || filterType !== "all") && (
            <div className="mt-3 pt-3 flex items-center gap-2" style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}>
              <Eye className="w-3 h-3 text-[#5a657a]" />
              <span className="text-[10px] text-[#5a657a]">
                Showing {events.length} of {allEvents.length} events
              </span>
            </div>
          )}
        </motion.div>
      )}

      {/* ── Content ────────────────────────────────────────────── */}
      <div className="flex-1 min-h-0">
        {!effectiveFirId ? (
          <EmptyState firs={crimeData.firs} onSelectFir={handleFirSelect} />
        ) : events.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
          >
            <div className="w-16 h-16 rounded-2xl glass-card flex items-center justify-center mb-4">
              <AlertTriangle className="w-8 h-8 text-[#5a657a]" />
            </div>
            <p className="text-sm text-[#8b97b0]">
              {allEvents.length > 0
                ? "No events match the current filters."
                : "No timeline events found for this FIR."}
            </p>
            {allEvents.length > 0 && (
              <button
                onClick={() => {
                  setFilterStatus("all");
                  setFilterType("all");
                }}
                className="mt-3 text-xs text-[#22d3ee] hover:underline cursor-pointer"
              >
                Clear all filters
              </button>
            )}
          </motion.div>
        ) : (
          <div className="relative h-full overflow-y-auto pr-1">
            {/* Vertical glowing line — left-aligned */}
            <div
              className="absolute left-[22px] top-0 bottom-0 w-[2px] z-0"
              style={{
                background:
                  "linear-gradient(to bottom, #22d3ee, #818cf8 50%, #22d3ee)",
                opacity: 0.3,
                boxShadow: "0 0 8px rgba(34,211,238,0.1), 0 0 16px rgba(129,140,248,0.06)",
              }}
            />

            {/* Timeline events */}
            <div className="space-y-6 relative z-10">
              {events.map((event, index) => {
                const typeInfo = TYPE_COLORS[event.type] ?? TYPE_COLORS.complaint;

                return (
                  <div key={event.id} className="relative flex items-start w-full gap-4">
                    {/* Node */}
                    <LeftNode event={event} index={index} />

                    {/* Card */}
                    <EventCardContent event={event} index={index} />
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* ── Summary Bar ─────────────────────────────────────────── */}
      {effectiveFirId && allEvents.length > 0 && (
        <div className="mt-5 shrink-0">
          <SummaryBar events={allEvents} />
        </div>
      )}
    </div>
  );
}