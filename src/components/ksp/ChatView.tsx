"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Send,
  Mic,
  MicOff,
  FileText,
  Shield,
  User,
  Trash2,
  Loader2,
  ChevronDown,
  Link,
  Brain,
  Sparkles,
  Zap,
  Lightbulb,
  FileDown,
  Languages,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import type { ChatMessage, FIR, ExplainableResponse } from "@/lib/types";
import { searchFIRs } from "@/lib/data";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";
import ReactMarkdown from "react-markdown";

/* ═══════════════════════════════════════════════════════════════════════════
   TYPEWRITER TEXT — Character-by-character reveal for AI responses
   ═══════════════════════════════════════════════════════════════════════════ */

/* ═══════════════════════════════════════════════════════════════════════════
   MARKDOWN COMPONENTS — Styled markdown rendering for AI responses
   ═══════════════════════════════════════════════════════════════════════════ */

const mdStyle: React.CSSProperties = { color: "var(--text-primary)" };

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mdComponents: any = {
  h1: ({ children }: { children?: React.ReactNode }) => <h1 className="text-base font-bold mt-3 mb-1.5" style={mdStyle}>{children}</h1>,
  h2: ({ children }: { children?: React.ReactNode }) => <h2 className="text-[15px] font-bold mt-2.5 mb-1" style={mdStyle}>{children}</h2>,
  h3: ({ children }: { children?: React.ReactNode }) => <h3 className="text-sm font-bold mt-2 mb-1" style={mdStyle}>{children}</h3>,
  p: ({ children }: { children?: React.ReactNode }) => <p className="mb-2 last:mb-0 leading-[1.65]">{children}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => <strong className="font-bold" style={{ color: "var(--text-primary)" }}>{children}</strong>,
  em: ({ children }: { children?: React.ReactNode }) => <em className="italic opacity-90">{children}</em>,
  ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>,
  ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>,
  li: ({ children }: { children?: React.ReactNode }) => <li className="leading-[1.65]">{children}</li>,
  code: ({ children, className }: { children?: React.ReactNode; className?: string }) =>
    className ? (
      <code className="block p-3 rounded text-[12px] font-mono overflow-x-auto my-2" style={{ background: "rgba(0,0,0,0.4)", color: "#e2e8f0" }}>{children}</code>
    ) : (
      <code className="px-1.5 py-0.5 rounded text-[12px] font-mono" style={{ background: "rgba(0,255,102,0.1)", color: "#00FF66" }}>{children}</code>
    ),
  pre: ({ children }: { children?: React.ReactNode }) => <pre className="mb-2 overflow-x-auto">{children}</pre>,
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-2 pl-3 my-2 italic" style={{ borderColor: "rgba(0,255,102,0.3)", color: "var(--text-secondary)" }}>{children}</blockquote>
  ),
  a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
    <a href={href} className="underline" style={{ color: "#00FF66" }} target="_blank" rel="noopener noreferrer">{children}</a>
  ),
  hr: () => <hr className="my-3 border-t" style={{ borderColor: "var(--border-subtle)" }} />,};

function TypewriterText({ text, speed = 30 }: { text: string; speed?: number }) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      if (i >= text.length) {
        setDisplayed(text);
        setDone(true);
        clearInterval(iv);
      } else {
        setDisplayed(text.slice(0, i));
      }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);

  return (
    <>
      {displayed && <ReactMarkdown components={mdComponents}>{displayed}</ReactMarkdown>}
      {!done && (
        <span
          className="inline-block w-[6px] h-[14px] ml-0.5 align-middle"
          style={{
            backgroundColor: "var(--primary)",
            animation: "blink 0.8s step-end infinite",
          }}
        />
      )}
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS & HELPERS
   ═══════════════════════════════════════════════════════════════════════════ */

const EXAMPLE_QUERIES = [
  "Show all chain snatching cases in Mysuru",
  "Who are the members of the Silk City Gang?",
  "Which accused has the highest risk score?",
  "Are there patterns in vehicle theft crimes?",
  "Show financial links in jewellery heist cases",
];

const SEVERITY_BORDER: Record<string, string> = {
  critical: "var(--critical)",
  high: "var(--warning)",
  medium: "var(--warning)",
  low: "var(--success)",
};

const SEVERITY_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  critical: { bg: "var(--critical-glow)", color: "var(--critical)", border: "rgba(255,68,68,0.2)" },
  high: { bg: "var(--warning-glow)", color: "var(--warning)", border: "rgba(255,107,0,0.2)" },
  medium: { bg: "var(--warning-glow)", color: "var(--warning)", border: "rgba(255,107,0,0.2)" },
  low: { bg: "var(--success-glow)", color: "var(--success)", border: "rgba(0,204,82,0.2)" },
};

function extractFIRIds(text: string): string[] {
  const m = text.match(/FIR-\d{4}-KA-\d{4}/g);
  return m ? [...new Set(m)] : [];
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function getConfidenceColor(score: number): string {
  if (score >= 80) return "#34d399";
  if (score >= 60) return "#fbbf24";
  return "#f87171";
}

function getConfidenceLabel(score: number): string {
  if (score >= 80) return "High";
  if (score >= 60) return "Medium";
  return "Low";
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONFIDENCE RING — SVG circular progress indicator
   ═══════════════════════════════════════════════════════════════════════════ */

function ConfidenceRing({ score, size = 36 }: { score: number; size?: number }) {
  const color = getConfidenceColor(score);
  const strokeWidth = 3;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const center = size / 2;

  return (
    <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="confidence-ring">
        {/* Track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth={strokeWidth}
        />
        {/* Progress */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="confidence-ring-circle"
          style={{ filter: `drop-shadow(0 0 4px ${color}40)` }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-[9px] font-bold" style={{ color }}>
          {score}
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   EXPLAINABLE AI PANEL
   ═══════════════════════════════════════════════════════════════════════════ */

function ExplainablePanel({ exp }: { exp: ExplainableResponse }) {
  const [open, setOpen] = useState(false);
  const confColor = getConfidenceColor(exp.confidenceScore);

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mt-2.5 overflow-hidden glass-card"
    >
      {/* Toggle Header */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left cursor-pointer transition-colors duration-200 hover:bg-white/[0.015]"
        style={{ borderBottom: open ? "1px solid var(--border-subtle)" : "none" }}
      >
        <Brain className="w-3.5 h-3.5 flex-shrink-0" style={{ color: confColor }} />
        <span className="text-[11px] label-tracked" style={{ color: "var(--text-secondary)" }}>
          Explainable AI
        </span>
        <span
          className="bracket-badge"
          style={{
            color: confColor,
          }}
        >
          [{getConfidenceLabel(exp.confidenceScore)} · {exp.confidenceScore}%]
        </span>
        {exp.evidenceChain.length > 0 && (
          <span className="text-[10px] flex items-center gap-1" style={{ color: "var(--text-tertiary)" }}>
            <Link className="w-3 h-3" />
            {exp.evidenceChain.length} source{exp.evidenceChain.length > 1 ? "s" : ""}
          </span>
        )}
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="ml-auto"
        >
          <ChevronDown className="w-3.5 h-3.5" style={{ color: "var(--text-tertiary)" }} />
        </motion.div>
      </button>

      {/* Expandable Content */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
            className="px-4 py-3.5 space-y-3.5 overflow-hidden"
          >
            {/* Confidence Score + Evidence Chain Pills */}
            <div className="flex items-center gap-4">
              <ConfidenceRing score={exp.confidenceScore} size={40} />
              {exp.evidenceChain.length > 0 && (
                <div className="flex flex-wrap gap-1.5 flex-1">
                  {exp.evidenceChain.map((e, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2.5 py-1 rounded-lg font-mono font-medium"
                      style={{
                        backgroundColor: "rgba(0,255,102,0.08)",
                        color: "var(--primary)",
                        border: "1px solid rgba(0,255,102,0.15)",
                      }}
                    >
                      {e.firId}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Reasoning Summary */}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--text-tertiary)" }}>
                Reasoning
              </p>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {exp.reasoningSummary}
              </p>
            </div>

            {/* Reasoning Steps */}
            {exp.reasoningSteps && exp.reasoningSteps.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
                  Analysis Steps
                </p>
                <div className="space-y-2">
                  {exp.reasoningSteps.map((step) => (
                    <div key={step.step} className="flex items-start gap-2.5">
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 text-[9px] font-bold mt-0.5"
                        style={{
                          backgroundColor: "rgba(0,255,102,0.08)",
                          color: "var(--primary)",
                          border: "1px solid rgba(0,255,102,0.12)",
                        }}
                      >
                        {step.step}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-medium" style={{ color: "var(--text-primary)" }}>
                          {step.finding}
                        </p>
                        {step.evidence.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {step.evidence.map((ev, i) => (
                              <span
                                key={i}
                                className="text-[9px] px-1.5 py-0.5 rounded font-mono"
                                style={{
                                  backgroundColor: "rgba(129,140,248,0.06)",
                                  color: "var(--secondary)",
                                  border: "1px solid rgba(129,140,248,0.1)",
                                }}
                              >
                                {ev}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evidence Detail List */}
            {exp.evidenceChain.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
                  Evidence Details
                </p>
                <div className="space-y-1.5">
                  {exp.evidenceChain.map((e, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2.5 p-2 rounded-lg transition-colors duration-150"
                      style={{ backgroundColor: "rgba(255,255,255,0.015)" }}
                    >
                      <span
                        className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                        style={{ backgroundColor: "var(--primary)", boxShadow: "0 0 6px rgba(0,255,102,0.4)" }}
                      />
                      <div>
                        <span className="text-[11px] font-mono font-bold" style={{ color: "var(--text-primary)" }}>
                          {e.firId}
                        </span>
                        <span className="text-[11px] ml-2" style={{ color: "var(--text-secondary)" }}>
                          {e.relevance}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Alternative Explanations */}
            {exp.alternativeExplanations && exp.alternativeExplanations.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "var(--warning)" }}>
                  Alternative Explanations
                </p>
                {exp.alternativeExplanations.map((alt, i) => (
                  <p
                    key={i}
                    className="text-[11px] leading-relaxed pl-3 py-0.5"
                    style={{ color: "var(--text-secondary)", borderLeft: "2px solid rgba(251,191,36,0.2)" }}
                  >
                    {alt}
                  </p>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TYPING INDICATOR
   ═══════════════════════════════════════════════════════════════════════════ */

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5 py-0.5">
      <span className="w-1.5 h-1.5 rounded-full typing-dot" style={{ backgroundColor: "var(--primary)" }} />
      <span className="w-1.5 h-1.5 rounded-full typing-dot" style={{ backgroundColor: "var(--primary)", animationDelay: "0.15s" }} />
      <span className="w-1.5 h-1.5 rounded-full typing-dot" style={{ backgroundColor: "var(--primary)", animationDelay: "0.3s" }} />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   THINKING STATE — Animated multi-step loading
   ═══════════════════════════════════════════════════════════════════════════ */

function ThinkingState() {
  const steps = [
    "Parsing query semantics...",
    "Searching crime database...",
    "Cross-referencing FIRs...",
    "Generating response...",
  ];
  const [step, setStep] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setStep((s) => (s + 1) % steps.length);
    }, 1200);
    return () => clearInterval(iv);
  }, [steps.length]);

  return (
    <div className="flex items-center gap-3 px-1">
      <div
        className="w-6 h-6 flex items-center justify-center"
        style={{
          background: "rgba(0,255,102,0.1)",
          border: "1px solid rgba(0,255,102,0.15)",
          borderRadius: "2px",
        }}
      >
        <Sparkles className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
      </div>
      <div className="flex flex-col gap-0.5">
        <p className="text-[11px] font-medium" style={{ color: "var(--primary)" }}>
          {steps[step]}
        </p>
        <TypingIndicator />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   WELCOME SCREEN
   ═══════════════════════════════════════════════════════════════════════════ */

function WelcomeScreen({
  onQueryClick,
  inputRef,
}: {
  onQueryClick: (q: string) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center gap-6 px-4 animate-fade-in">
      {/* Terminal prompt */}
      <div className="glass-card p-6 w-full max-w-md">
        <div
          className="font-mono text-[13px] text-left"
          style={{ color: "var(--primary)" }}
        >
          <span style={{ color: "var(--text-tertiary)" }}>ksp-sentinel:~$</span>{" "}
          <span style={{ color: "var(--text-primary)" }}>AWAITING QUERY</span>
          <span
            className="inline-block w-[7px] h-[15px] ml-0.5 align-middle"
            style={{
              backgroundColor: "var(--primary)",
              animation: "blink 1s step-end infinite",
            }}
          />
        </div>
        <div className="mt-3 h-px" style={{ background: "var(--border-subtle)" }} />
        <p className="text-[11px] mt-3 text-left" style={{ color: "var(--text-muted)" }}>
          Ask about crimes, patterns, gang connections, or specific FIRs.
        </p>
      </div>

      {/* Example Queries */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
        {EXAMPLE_QUERIES.map((q, i) => (
          <motion.button
            key={i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.06, duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
            whileHover={{ y: -2, transition: { duration: 0.15 } }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onQueryClick(q)}
            className="text-left p-3.5 cursor-pointer transition-all duration-200 group glass-card reticule-hover"
          >
            <div className="flex items-start gap-2.5">
              <span className="text-[11px] font-mono flex-shrink-0" style={{ color: "var(--text-muted)" }}>
                &gt;
              </span>
              <span className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                {q}
              </span>
            </div>
          </motion.button>
        ))}
      </div>

      {/* Quick Action Chips */}
      <div className="flex items-center gap-2 flex-wrap justify-center">
        <span className="text-[10px] label-tracked" style={{ color: "var(--text-muted)" }}>
          Explore
        </span>
        {["High risk analysis", "Gang mapping", "Crime trends", "FIR lookup"].map((chip) => (
          <button
            key={chip}
            onClick={() => onQueryClick(chip)}
            className="bracket-badge cursor-pointer transition-all duration-200"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = "var(--primary)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = "var(--text-tertiary)";
            }}
          >
            [{chip}]
          </button>
        ))}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   FIR EVIDENCE CARD
   ═══════════════════════════════════════════════════════════════════════════ */

function FIREvidenceCard({ fir, index }: { fir: FIR; index: number }) {
  const sev = SEVERITY_BADGE[fir.severity] || SEVERITY_BADGE.low;
  const borderColor = SEVERITY_BORDER[fir.severity] || "#fbbf24";

  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.06, duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
      className="p-4 cursor-default transition-all duration-200 group glass-card reticule-hover"
      style={{ borderLeft: `2px solid ${borderColor}` }}
    >
      {/* Header Row */}
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-[12px] font-mono font-bold tracking-wide" style={{ color: "var(--text-primary)" }}>
          {fir.fir_id}
        </span>
        <span
          className="bracket-badge"
          style={{ color: sev.color }}
        >
          [{fir.severity.toUpperCase()}]
        </span>
      </div>

      {/* Meta */}
      <p className="text-[11px] mb-2" style={{ color: "var(--text-tertiary)" }}>
        {fir.date} · {fir.time}
      </p>

      {/* Details */}
      <div className="space-y-1">
        <p className="text-[12px]" style={{ color: "var(--text-primary)" }}>
          <span style={{ color: "var(--text-tertiary)" }}>Crime: </span>
          {fir.crime_type}
        </p>
        <p className="text-[12px]" style={{ color: "var(--text-primary)" }}>
          <span style={{ color: "var(--text-tertiary)" }}>District: </span>
          {fir.district}
        </p>
        <p className="text-[11px] font-mono" style={{ color: "var(--text-tertiary)" }}>
          {fir.ipc_section}
        </p>
      </div>

      {/* Accused */}
      {fir.accused.length > 0 && (
        <div className="mt-2.5 pt-2.5" style={{ borderTop: "1px solid var(--border-subtle)" }}>
          <p className="text-[10px] uppercase tracking-wider mb-1.5 font-medium" style={{ color: "var(--text-tertiary)" }}>
            Accused
          </p>
          <div className="flex flex-wrap gap-1">
            {fir.accused.slice(0, 4).map((a) => (
              <span
                key={a}
                className="text-[10px] px-2 py-0.5 rounded-md font-mono"
                style={{
                  backgroundColor: "rgba(248,113,113,0.06)",
                  color: "var(--critical)",
                  border: "1px solid rgba(248,113,113,0.1)",
                }}
              >
                {a}
              </span>
            ))}
            {fir.accused.length > 4 && (
              <span className="text-[10px] px-2 py-0.5 rounded-md" style={{ color: "var(--text-tertiary)" }}>
                +{fir.accused.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN CHAT VIEW
   ═══════════════════════════════════════════════════════════════════════════ */

export default function ChatView() {
  const crimeData = useAppStore((s) => s.crimeData);
  const chatMessages = useAppStore((s) => s.chatMessages);
  const addChatMessage = useAppStore((s) => s.addChatMessage);
  const clearChat = useAppStore((s) => s.clearChat);
  const chatLoading = useAppStore((s) => s.chatLoading);
  const setChatLoading = useAppStore((s) => s.setChatLoading);
  const user = useAppStore((s) => s.user);

  const [input, setInput] = useState("");
  const [voiceLang, setVoiceLang] = useState<"en" | "kn">("en");
  const [isListening, setIsListening] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [evidenceOpen, setEvidenceOpen] = useState(true);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recogRef = useRef<any>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

  // Extract FIR IDs from last AI message
  const extractedFIRs = useMemo(() => {
    if (!crimeData) return [];
    const lastAI = [...chatMessages].reverse().find((m) => m.role === "assistant");
    if (!lastAI) return [];
    const ids = extractFIRIds(lastAI.content);
    const matched: FIR[] = [];
    for (const id of ids) {
      matched.push(...searchFIRs(crimeData, { fir_id: id }));
    }
    return matched;
  }, [chatMessages, crimeData]);

  // Send message
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || chatLoading) return;
    setInput("");
    addChatMessage({ role: "user", content: trimmed });
    setChatLoading(true);
    try {
      const res = await fetch("/api/chat?XTransformPort=3000", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history: chatMessages }),
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      addChatMessage({
        role: "assistant",
        content: data.response ?? "No response.",
        explainable: data.explainable,
      });
    } catch {
      addChatMessage({
        role: "assistant",
        content: "Unable to reach the intelligence server. Please try again.",
      });
    } finally {
      setChatLoading(false);
      inputRef.current?.focus();
    }
  }, [input, chatLoading, chatMessages, addChatMessage, setChatLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Voice recognition
  const toggleVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) {
      alert("Speech recognition not supported.");
      return;
    }
    if (isListening && recogRef.current) {
      recogRef.current.stop();
      setIsListening(false);
      recogRef.current = null;
      return;
    }
    const r = new SR();
    r.lang = voiceLang === "en" ? "en-IN" : "kn-IN";
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (ev: any) => {
      setInput(ev.results[0][0].transcript);
      setIsListening(false);
      recogRef.current = null;
    };
    r.onerror = () => {
      setIsListening(false);
      recogRef.current = null;
    };
    r.onend = () => {
      setIsListening(false);
      recogRef.current = null;
    };
    recogRef.current = r;
    r.start();
    setIsListening(true);
  }, [isListening, voiceLang]);

  // PDF export
  const exportPDF = useCallback(() => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pw = doc.internal.pageSize.getWidth();
    const mg = 20;
    const cw = pw - mg * 2;
    let y = 20;
    doc.setFontSize(20);
    doc.setFont("helvetica", "bold");
    doc.text("KSP Intelligence Briefing", pw / 2, y, { align: "center" });
    y += 10;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(120, 120, 120);
    const ds = new Date().toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
    doc.text(
      `Generated: ${ds}${user?.role ? ` | Role: ${user.role}` : ""}`,
      pw / 2,
      y,
      { align: "center" }
    );
    y += 12;
    doc.setDrawColor(200, 200, 200);
    doc.line(mg, y, pw - mg, y);
    y += 8;
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(11);
    for (const msg of chatMessages) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.setFont("helvetica", "bold");
      doc.text(
        msg.role === "user" ? "OFFICER QUERY:" : "AI COPILOT RESPONSE:",
        mg,
        y
      );
      y += 5;
      doc.setFont("helvetica", "normal");
      for (const line of doc.splitTextToSize(msg.content, cw)) {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, mg, y);
        y += 4.5;
      }
      y += 6;
    }
    const tp = doc.getNumberOfPages();
    for (let i = 1; i <= tp; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        "KSP Sentinel AI - Confidential",
        pw / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: "center" }
      );
    }
    doc.save(`ksp_briefing_${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [chatMessages, user]);

  const handleExampleClick = useCallback(
    (q: string) => {
      setInput(q);
      inputRef.current?.focus();
    },
    []
  );

  /* ═══════════════════════════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════════════════════════ */

  return (
    <div className="flex flex-col h-full w-full">
      {/* ── Header Bar ──────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-5 h-11 flex-shrink-0"
        style={{ borderBottom: "1px solid var(--border-subtle)" }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, rgba(0,255,102,0.15), rgba(0,255,102,0.05))",
              border: "1px solid rgba(0,255,102,0.12)",
            }}
          >
            <Shield className="w-3 h-3" style={{ color: "var(--primary)" }} />
          </div>
          <span className="text-[13px] font-semibold tracking-wide" style={{ color: "var(--text-primary)" }}>
            AI Copilot
          </span>
          <span
            className="bracket-badge"
            style={{
              color: "var(--primary)",
            }}
          >
            [LIVE]
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Evidence Panel Toggle */}
          {extractedFIRs.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => setEvidenceOpen(!evidenceOpen)}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-lg cursor-pointer transition-all duration-200"
              style={{
                color: evidenceOpen ? "#818cf8" : "var(--text-tertiary)",
                border: `1px solid ${evidenceOpen ? "rgba(129,140,248,0.2)" : "var(--border-default)"}`,
                backgroundColor: evidenceOpen ? "rgba(129,140,248,0.06)" : "transparent",
              }}
            >
              {evidenceOpen ? (
                <PanelRightClose className="w-3 h-3" />
              ) : (
                <PanelRightOpen className="w-3 h-3" />
              )}
              <span className="hidden sm:inline">Evidence</span>
              <span
                className="bracket-badge"
                style={{
                  color: "var(--secondary)",
                }}
              >
                [{extractedFIRs.length}]
              </span>
            </motion.button>
          )}

          {/* Clear Chat */}
          {chatMessages.length > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => clearChat()}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-lg cursor-pointer transition-all duration-200"
              style={{ color: "var(--text-tertiary)", border: "1px solid var(--border-default)" }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(248,113,113,0.06)";
                e.currentTarget.style.color = "#f87171";
                e.currentTarget.style.borderColor = "rgba(248,113,113,0.15)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
                e.currentTarget.style.color = "var(--text-tertiary)";
                e.currentTarget.style.borderColor = "var(--border-default)";
              }}
            >
              <Trash2 className="w-3 h-3" />
              <span className="hidden sm:inline">Clear</span>
            </motion.button>
          )}
        </div>
      </header>

      {/* ── Main Content Area ───────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden flex min-h-0">
        {/* ── Chat Messages Column ──────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto"
          >
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 space-y-5">
              {/* Welcome Screen */}
              {chatMessages.length === 0 && !chatLoading && (
                <WelcomeScreen onQueryClick={handleExampleClick} inputRef={inputRef} />
              )}

              {/* Chat Messages */}
              <AnimatePresence mode="popLayout">
                {chatMessages.map((msg, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                    className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {/* AI Avatar */}
                    {msg.role === "assistant" && (
                      <div
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
                        style={{
                          background: "linear-gradient(135deg, rgba(0,255,102,0.15), rgba(0,255,102,0.1))",
                          border: "1px solid rgba(0,255,102,0.15)",
                          boxShadow: "0 0 12px rgba(0,255,102,0.06)",
                        }}
                      >
                        <Shield className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                      </div>
                    )}

                    {/* Message Bubble */}
                    <div className="flex flex-col max-w-[82%] min-w-0">
                      <div
                        className={`px-4 py-3 text-[13px] leading-[1.65] ${msg.role === "user" ? "whitespace-pre-wrap" : ""}`}
                        style={
                          msg.role === "user"
                            ? {
                                background: "rgba(255,255,255,0.03)",
                                color: "var(--text-primary)",
                                borderRadius: "2px",
                                border: "1px solid var(--border-subtle)",
                              }
                            : {
                                backgroundColor: "var(--bg-card)",
                                border: "1px solid var(--border-subtle)",
                                borderLeft: "2px solid var(--primary)",
                                color: "var(--text-primary)",
                                borderRadius: "2px",
                              }
                        }
                      >
                        {msg.role === "assistant" && idx === chatMessages.length - 1 ? (
                          <TypewriterText text={msg.content} />
                        ) : msg.role === "assistant" ? (
                          <ReactMarkdown components={mdComponents}>{msg.content}</ReactMarkdown>
                        ) : (
                          msg.content
                        )}
                      </div>

                      {/* Explainable AI Panel */}
                      {msg.role === "assistant" && msg.explainable && (
                        <ExplainablePanel exp={msg.explainable} />
                      )}

                      {/* AI Disclaimer */}
                      {msg.role === "assistant" && idx === chatMessages.length - 1 && (
                        <div className="flex items-center gap-1.5 mt-1.5 ml-1">
                          <Zap className="w-3 h-3" style={{ color: "var(--text-muted)" }} />
                          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
                            AI Generated — Verify with sources
                          </span>
                        </div>
                      )}

                      {/* Timestamp */}
                      <span className="text-[10px] mt-1.5 px-1" style={{ color: "var(--text-muted)" }}>
                        {fmtTime(new Date())}
                      </span>
                    </div>

                    {/* User Avatar */}
                    {msg.role === "user" && (
                      <div
                        className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
                        style={{
                          background: "rgba(129,140,248,0.1)",
                          border: "1px solid rgba(129,140,248,0.15)",
                        }}
                      >
                        <User className="w-3.5 h-3.5" style={{ color: "var(--secondary)" }} />
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Thinking / Loading Indicator */}
              <AnimatePresence>
                {chatLoading && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                    className="flex gap-3 justify-start"
                  >
                    <div
                      className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5"
                      style={{
                        background: "linear-gradient(135deg, rgba(0,255,102,0.15), rgba(0,255,102,0.1))",
                        border: "1px solid rgba(0,255,102,0.15)",
                        boxShadow: "0 0 12px rgba(0,255,102,0.06)",
                      }}
                    >
                      <Shield className="w-3.5 h-3.5" style={{ color: "var(--primary)" }} />
                    </div>
                    <div
                      className="px-4 py-3.5 glass-card"
                    >
                      <ThinkingState />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Scroll Anchor */}
              <div ref={endRef} />
            </div>
          </div>
        </div>

        {/* ── Evidence Panel (Right Column) ─────────────────────────────── */}
        <AnimatePresence>
          {evidenceOpen && extractedFIRs.length > 0 && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              className="hidden lg:flex flex-col flex-shrink-0 overflow-hidden"
              style={{ borderLeft: "1px solid var(--border-subtle)" }}
            >
              {/* Panel Header */}
              <div
                className="flex items-center gap-2.5 px-4 h-11 flex-shrink-0"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
              >
                <FileText className="w-3.5 h-3.5" style={{ color: "var(--secondary)" }} />
                <span className="text-[12px] font-semibold tracking-wide" style={{ color: "var(--text-primary)" }}>
                  Linked Evidence
                </span>
                <motion.span
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="ml-auto bracket-badge"
                  style={{ color: "var(--secondary)" }}
                >
                  [{extractedFIRs.length} FIR{extractedFIRs.length > 1 ? "s" : ""}]
                </motion.span>
              </div>

              {/* Panel Content */}
              <div className="flex-1 overflow-y-auto p-3.5 space-y-3">
                {extractedFIRs.map((fir, idx) => (
                  <FIREvidenceCard key={fir.fir_id} fir={fir} index={idx} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Input Bar (Sticky Bottom) ──────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 sm:px-6 pb-4 pt-3">
        <div className="max-w-3xl mx-auto">
          <div
            className="glass-card p-1.5 transition-all duration-300"
            style={{
              boxShadow: inputFocused
                ? "0 0 0 1px rgba(0,255,102,0.25), 0 0 24px rgba(0,255,102,0.06), 0 8px 32px rgba(0,0,0,0.3)"
                : "0 0 0 1px var(--border-default), 0 8px 32px rgba(0,0,0,0.2)",
            }}
          >
            <div className="flex items-center gap-2">
              {/* Prompt prefix */}
              <span
                className="flex-shrink-0 pl-3 font-mono text-[13px] font-bold"
                style={{ color: "var(--primary)" }}
              >
                &gt;
              </span>
              {/* Text Input */}
              <div className="flex-1 min-w-0">
                <Input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  placeholder={
                    voiceLang === "en"
                      ? "Enter query..."
                      : "ಅಪರಾಧ, FIR, ಗ್ಯಾಂಗ್ ಬಗ್ಗೆ ಕೇಳಿ..."
                  }
                  disabled={chatLoading}
                  className="h-10 rounded-none text-[13px] border-0 bg-transparent shadow-none focus-visible:ring-0 placeholder:text-[var(--text-muted)] font-mono"
                  style={{ color: "var(--text-primary)" }}
                />
              </div>

              {/* Send Button */}
              <motion.button
                onClick={handleSend}
                disabled={chatLoading || !input.trim()}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                className="flex items-center justify-center w-10 h-10 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0"
                style={{
                  background: !chatLoading && input.trim()
                    ? "var(--primary)"
                    : "var(--border-subtle)",
                  color: !chatLoading && input.trim() ? "#05070A" : "var(--text-muted)",
                  borderRadius: "2px",
                  boxShadow: !chatLoading && input.trim()
                    ? "0 0 16px rgba(0,255,102,0.2)"
                    : "none",
                }}
              >
                <Send className="w-4 h-4" />
              </motion.button>

              {/* Divider */}
              <div
                className="w-px h-6 flex-shrink-0"
                style={{ backgroundColor: "var(--border-default)" }}
              />

              {/* Voice Toggle */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={toggleVoice}
                className="flex items-center justify-center w-10 h-10 cursor-pointer transition-all duration-200 relative flex-shrink-0"
                style={{
                  border: isListening
                    ? "1px solid rgba(248,113,113,0.3)"
                    : "1px solid var(--border-default)",
                  backgroundColor: isListening
                    ? "rgba(248,113,113,0.08)"
                    : "transparent",
                  borderRadius: "2px",
                }}
                title={isListening ? "Stop listening" : "Voice input"}
              >
                {isListening && (
                  <span
                    className="absolute inset-0 rounded-xl animate-ping"
                    style={{
                      backgroundColor: "rgba(248,113,113,0.1)",
                      animationDuration: "1.5s",
                    }}
                  />
                )}
                {isListening ? (
                  <Mic className="w-4 h-4" style={{ color: "var(--critical)" }} />
                ) : (
                  <MicOff className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
                )}
              </motion.button>

              {/* Language Toggle */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => setVoiceLang((v) => (v === "en" ? "kn" : "en"))}
                className="flex items-center justify-center w-10 h-10 cursor-pointer transition-all duration-200 flex-shrink-0"
                style={{
                  border:
                    voiceLang === "kn"
                      ? "1px solid rgba(0,255,102,0.2)"
                      : "1px solid var(--border-default)",
                  backgroundColor:
                    voiceLang === "kn"
                      ? "rgba(0,255,102,0.06)"
                      : "transparent",
                  color: voiceLang === "kn" ? "var(--primary)" : "var(--text-tertiary)",
                  borderRadius: "2px",
                }}
                title={`Switch to ${voiceLang === "en" ? "Kannada" : "English"}`}
              >
                <Languages className="w-4 h-4" />
              </motion.button>

              {/* PDF Export */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={exportPDF}
                disabled={chatMessages.length === 0}
                className="flex items-center justify-center w-10 h-10 cursor-pointer disabled:opacity-15 disabled:cursor-not-allowed transition-all duration-200 flex-shrink-0"
                style={{
                  border: "1px solid var(--border-default)",
                  backgroundColor: "transparent",
                  borderRadius: "2px",
                }}
                onMouseEnter={(e) => {
                  if (chatMessages.length > 0) {
                    e.currentTarget.style.borderColor = "rgba(0,255,102,0.15)";
                    e.currentTarget.style.background = "rgba(0,255,102,0.06)";
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "var(--border-default)";
                  e.currentTarget.style.background = "transparent";
                }}
                title="Export as PDF"
              >
                <FileDown
                  className="w-4 h-4"
                  style={{ color: chatMessages.length > 0 ? "var(--text-secondary)" : "var(--text-muted)" }}
                />
              </motion.button>
            </div>
          </div>

          {/* Subtle hint below input */}
          <div className="flex items-center justify-center gap-4 mt-2 px-2">
            <span className="text-[10px] font-mono" style={{ color: "var(--text-muted)" }}>
              Press <kbd className="px-1.5 py-0.5 text-[9px] font-mono" style={{ backgroundColor: "var(--border-subtle)", border: "1px solid var(--border-default)", borderRadius: "2px" }}>Enter</kbd> to send
            </span>
            {voiceLang === "kn" && (
              <span className="text-[10px]" style={{ color: "var(--primary)" }}>
                · Kannada mode active
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}