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

// ─── Status Colors ───────────────────────────────────────────────────
const STATUS_COLORS: Record<TimelineEvent["status"], string> = {
  completed: "#10b981",
  in_progress: "#3b82f6",
  pending: "#eab308",
  unknown: "#64748b",
};

const STATUS_LABELS: Record<TimelineEvent["status"], string> = {
  completed: "Completed",
  in_progress: "In Progress",
  pending: "Pending",
  unknown: "Unknown",
};

const SEVERITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border-red-500/30",
  high: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  medium: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
};

const SEVERITY_DOT_COLORS: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#10b981",
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

// ─── Event Node (Desktop Center Icon) ────────────────────────────────
function CenterNode({
  event,
  index,
}: {
  event: TimelineEvent;
  index: number;
}) {
  const color = STATUS_COLORS[event.status];
  const isInProgress = event.status === "in_progress";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{
        delay: index * 0.12 + 0.05,
        duration: 0.35,
        ease: "easeOut",
      }}
      className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full shrink-0"
      style={{
        backgroundColor: `${color}20`,
        border: `2px solid ${color}`,
        boxShadow: isInProgress ? `0 0 12px ${color}60` : undefined,
      }}
    >
      {isInProgress && (
        <div className="timeline-pulse absolute inset-0 rounded-full" />
      )}
      <TimelineIcon
        name={event.icon}
        className="w-4 h-4 relative z-10"
        style={{ color }}
      />
    </motion.div>
  );
}

// ─── Card Content (shared between desktop and mobile) ────────────────
function EventCardContent({
  event,
  color,
}: {
  event: TimelineEvent;
  color: string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="inline-flex items-center justify-center w-5 h-5 rounded"
          style={{ backgroundColor: `${color}20` }}
        >
          <TimelineIcon
            name={event.icon}
            className="w-3 h-3"
            style={{ color }}
          />
        </span>
        <h4 className="text-sm font-semibold text-[#e2e8f0] leading-tight">
          {event.title}
        </h4>
      </div>
      <p className="text-xs text-[#94a3b8] leading-relaxed">
        {event.description}
      </p>
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <span className="text-[10px] text-[#64748b] flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {formatTimestamp(event.timestamp)}
        </span>
        <Badge
          variant="outline"
          className="text-[10px] px-2 py-0 h-5 font-medium"
          style={{
            borderColor: `${color}50`,
            color,
            backgroundColor: `${color}15`,
          }}
        >
          {STATUS_LABELS[event.status]}
        </Badge>
      </div>
    </div>
  );
}

// ─── Single Timeline Event Node ───────────────────────────────────────
function TimelineEventNode({
  event,
  index,
  isLeft,
}: {
  event: TimelineEvent;
  index: number;
  isLeft: boolean;
}) {
  const color = STATUS_COLORS[event.status];

  return (
    <div className="relative flex items-start w-full">
      {/* ── Desktop: alternating left/right ── */}
      <div className="hidden md:contents">
        {/* Left column */}
        <div className="w-[calc(50%-24px)]">
          {isLeft ? (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: index * 0.12,
                duration: 0.4,
                ease: "easeOut",
              }}
              className="glass-card p-4 ml-auto mr-6 max-w-md"
            >
              <EventCardContent event={event} color={color} />
            </motion.div>
          ) : (
            <div />
          )}
        </div>

        {/* Center node */}
        <CenterNode event={event} index={index} />

        {/* Right column */}
        <div className="w-[calc(50%-24px)]">
          {!isLeft ? (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{
                delay: index * 0.12,
                duration: 0.4,
                ease: "easeOut",
              }}
              className="glass-card p-4 mr-auto ml-6 max-w-md"
            >
              <EventCardContent event={event} color={color} />
            </motion.div>
          ) : (
            <div />
          )}
        </div>
      </div>

      {/* ── Mobile: single column ── */}
      <div className="flex md:hidden items-start w-full gap-4">
        <CenterNode event={event} index={index} />
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{
            delay: index * 0.12,
            duration: 0.4,
            ease: "easeOut",
          }}
          className="glass-card p-4 flex-1 min-w-0"
        >
          <EventCardContent event={event} color={color} />
        </motion.div>
      </div>
    </div>
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
      className="glass-card p-4 mt-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
        <div className="flex items-center gap-5 text-xs">
          <span className="text-[#94a3b8]">
            Total:{" "}
            <span className="text-[#e2e8f0] font-semibold">{total}</span>
          </span>
          <span className="flex items-center gap-1.5 text-[#94a3b8]">
            <span className="w-2 h-2 rounded-full bg-[#10b981]" />
            Completed:{" "}
            <span className="text-[#10b981] font-semibold">{completed}</span>
          </span>
          <span className="flex items-center gap-1.5 text-[#94a3b8]">
            <span className="w-2 h-2 rounded-full bg-[#3b82f6]" />
            In Progress:{" "}
            <span className="text-[#3b82f6] font-semibold">{inProgress}</span>
          </span>
          <span className="flex items-center gap-1.5 text-[#94a3b8]">
            <span className="w-2 h-2 rounded-full bg-[#eab308]" />
            Pending:{" "}
            <span className="text-[#eab308] font-semibold">{pending}</span>
          </span>
        </div>
        <span className="text-xs text-[#94a3b8]">
          Investigation Progress:{" "}
          <span className="text-[#e2e8f0] font-semibold">{pct}%</span>
        </span>
      </div>
      <div className="w-full h-2 rounded-full bg-[#1e293b] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ delay: 0.5, duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: "linear-gradient(90deg, #3b82f6, #8b5cf6)" }}
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
      <div className="w-16 h-16 rounded-full bg-[#1e293b] flex items-center justify-center mb-6">
        <Clock className="w-8 h-8 text-[#64748b]" />
      </div>
      <h3 className="text-lg font-semibold text-[#e2e8f0] mb-2">
        Select an FIR to view its investigation timeline
      </h3>
      <p className="text-sm text-[#94a3b8] mb-8 max-w-md">
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
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border border-[#2a3550] bg-[#1a2035] text-[#94a3b8] hover:text-[#e2e8f0] hover:border-[#3b82f6] hover:bg-[#3b82f6]/10 transition-all duration-200 cursor-pointer"
            >
              <span
                className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  backgroundColor:
                    SEVERITY_DOT_COLORS[fir.severity] ?? "#64748b",
                }}
              />
              {fir.fir_id}
              <ChevronRight className="w-3 h-3 opacity-50" />
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

  // Derive effective FIR ID: prefer local selection, fall back to store
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
  const events = useMemo<TimelineEvent[]>(() => {
    if (!crimeData || !effectiveFirId) return [];
    return generateTimeline(crimeData, effectiveFirId);
  }, [crimeData, effectiveFirId]);

  // Current FIR metadata
  const currentFir = useMemo(() => {
    if (!crimeData || !effectiveFirId) return null;
    return crimeData.firs.find((f) => f.fir_id === effectiveFirId) ?? null;
  }, [crimeData, effectiveFirId]);

  const handleFirSelect = (firId: string) => {
    setActiveFirId(firId);
    setSelectedFirId(firId);
  };

  if (!crimeData) {
    return (
      <div className="flex items-center justify-center h-64 text-[#94a3b8] text-sm">
        Loading crime data...
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up space-y-6">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#3b82f6]/15 flex items-center justify-center">
            <Clock className="w-5 h-5 text-[#3b82f6]" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-[#e2e8f0]">
              INVESTIGATION TIMELINE
            </h1>
            <p className="text-xs text-[#94a3b8] mt-0.5">
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
              <SelectTrigger className="w-[240px] bg-[#1a2035] border-[#2a3550] text-[#e2e8f0] text-xs h-9">
                <SelectValue placeholder="Select FIR..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2035] border-[#2a3550]">
                {crimeData.firs.map((fir) => (
                  <SelectItem
                    key={fir.fir_id}
                    value={fir.fir_id}
                    className="text-[#e2e8f0] text-xs focus:bg-[#3b82f6]/10 focus:text-[#3b82f6]"
                  >
                    <span className="flex items-center gap-2">
                      <span className="font-mono">{fir.fir_id}</span>
                      <span className="text-[#64748b]">—</span>
                      <span className="text-[#94a3b8]">{fir.crime_type}</span>
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
                <span className="text-xs text-[#94a3b8] hidden sm:inline">
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

      {/* ── Content ────────────────────────────────────────────── */}
      {!effectiveFirId ? (
        <EmptyState firs={crimeData.firs} onSelectFir={handleFirSelect} />
      ) : events.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center py-20 text-center"
        >
          <AlertTriangle className="w-10 h-10 text-[#64748b] mb-4" />
          <p className="text-sm text-[#94a3b8]">
            No timeline events found for this FIR.
          </p>
        </motion.div>
      ) : (
        <div className="relative">
          {/* Vertical gradient line — desktop: centered */}
          <div
            className="hidden md:block absolute left-1/2 top-0 bottom-0 w-0.5 -translate-x-1/2 z-0"
            style={{
              background:
                "linear-gradient(to bottom, #3b82f6, #8b5cf6, #3b82f6)",
              opacity: 0.4,
            }}
          />

          {/* Vertical gradient line — mobile: left-aligned */}
          <div
            className="md:hidden absolute left-5 top-0 bottom-0 w-0.5 z-0"
            style={{
              background:
                "linear-gradient(to bottom, #3b82f6, #8b5cf6, #3b82f6)",
              opacity: 0.4,
            }}
          />

          {/* Timeline events */}
          <div className="space-y-8 relative z-10">
            {events.map((event, index) => (
              <TimelineEventNode
                key={event.id}
                event={event}
                index={index}
                isLeft={index % 2 === 0}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Summary Bar ─────────────────────────────────────────── */}
      {effectiveFirId && events.length > 0 && <SummaryBar events={events} />}
    </div>
  );
}