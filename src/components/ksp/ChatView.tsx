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
  ChevronUp,
  Link,
  Brain,
  Sparkles,
  Zap,
  Lightbulb,
  ArrowRight,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import type { ChatMessage, FIR, ExplainableResponse } from "@/lib/types";
import { searchFIRs } from "@/lib/data";
import { motion, AnimatePresence } from "framer-motion";
import jsPDF from "jspdf";

const EXAMPLE_QUERIES = [
  "Show all chain snatching cases in Mysuru",
  "Who are the members of the Silk City Gang?",
  "Which accused has the highest risk score?",
  "Are there patterns in vehicle theft crimes?",
  "Show financial links in jewellery heist cases",
];

const SEVERITY_BORDER: Record<string, string> = {
  critical: "#f87171",
  high: "#fbbf24",
  medium: "#fbbf24",
  low: "#34d399",
};

const SEVERITY_BADGE: Record<string, { bg: string; color: string; border: string }> = {
  critical: { bg: "rgba(248,113,113,0.1)", color: "#f87171", border: "rgba(248,113,113,0.2)" },
  high: { bg: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "rgba(251,191,36,0.2)" },
  medium: { bg: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "rgba(251,191,36,0.2)" },
  low: { bg: "rgba(52,211,153,0.1)", color: "#34d399", border: "rgba(52,211,153,0.2)" },
};

function extractFIRIds(text: string): string[] {
  const m = text.match(/FIR-\d{4}-KA-\d{4}/g);
  return m ? [...new Set(m)] : [];
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

/* ─── Explainable AI Panel ──────────────────────────────────────────── */
function ExplainablePanel({ exp }: { exp: ExplainableResponse }) {
  const [open, setOpen] = useState(false);
  const confColor = exp.confidenceScore >= 80 ? "#34d399" : exp.confidenceScore >= 60 ? "#fbbf24" : "#f87171";
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="mt-2 rounded-xl overflow-hidden"
      style={{ border: "1px solid rgba(255,255,255,0.06)", backgroundColor: "rgba(15,21,36,0.6)", backdropFilter: "blur(12px)" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-left cursor-pointer transition-colors duration-200"
        style={{ borderBottom: open ? "1px solid rgba(255,255,255,0.04)" : "none" }}
        onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
      >
        <Brain className="w-3.5 h-3.5 flex-shrink-0" style={{ color: confColor }} />
        <span className="text-[11px] font-semibold tracking-wider uppercase" style={{ color: "#8b97b0" }}>Explainable AI</span>
        <span
          className="text-[10px] px-2 py-0.5 rounded-full font-bold"
          style={{ backgroundColor: `${confColor}15`, color: confColor, border: `1px solid ${confColor}25` }}
        >
          {exp.confidenceScore}% confidence
        </span>
        {exp.evidenceChain.length > 0 && (
          <span className="text-[10px] flex items-center gap-1" style={{ color: "#5a657a" }}>
            <Link className="w-3 h-3" /> {exp.evidenceChain.length} source{exp.evidenceChain.length > 1 ? "s" : ""}
          </span>
        )}
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="ml-auto"
        >
          <ChevronDown className="w-3.5 h-3.5" style={{ color: "#5a657a" }} />
        </motion.div>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="px-4 py-3 space-y-3 overflow-hidden"
          >
            {exp.evidenceChain.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "#5a657a" }}>Evidence Chain</p>
                <div className="flex flex-wrap gap-1.5">
                  {exp.evidenceChain.map((e, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2.5 py-1 rounded-lg font-mono"
                      style={{ backgroundColor: "rgba(34,211,238,0.08)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.15)" }}
                    >
                      {e.firId}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: "#5a657a" }}>Reasoning</p>
              <p className="text-[12px] leading-relaxed" style={{ color: "#8b97b0" }}>{exp.reasoningSummary}</p>
            </div>
            {exp.evidenceChain.map((e, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0" style={{ backgroundColor: "#22d3ee" }} />
                <div>
                  <span className="text-[11px] font-mono font-bold" style={{ color: "#f1f5f9" }}>{e.firId}</span>
                  <span className="text-[11px] ml-2" style={{ color: "#8b97b0" }}>{e.relevance}</span>
                </div>
              </div>
            ))}
            {exp.alternativeExplanations && exp.alternativeExplanations.length > 0 && (
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: "#fbbf24" }}>Alternative Explanations</p>
                {exp.alternativeExplanations.map((alt, i) => (
                  <p key={i} className="text-[11px] leading-relaxed pl-3" style={{ color: "#8b97b0", borderLeft: "2px solid rgba(251,191,36,0.2)" }}>
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

/* ─── Typing Indicator ──────────────────────────────────────────────── */
function TypingIndicator() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="w-1.5 h-1.5 rounded-full typing-dot" style={{ backgroundColor: "#22d3ee" }} />
      <span className="w-1.5 h-1.5 rounded-full typing-dot" style={{ backgroundColor: "#22d3ee", animationDelay: "0.15s" }} />
      <span className="w-1.5 h-1.5 rounded-full typing-dot" style={{ backgroundColor: "#22d3ee", animationDelay: "0.3s" }} />
    </div>
  );
}

/* ─── Thinking State ─────────────────────────────────────────────────── */
function ThinkingState() {
  const steps = ["Parsing query semantics...", "Searching crime database...", "Cross-referencing FIRs...", "Generating response..."];
  const [step, setStep] = useState(0);

  useEffect(() => {
    const iv = setInterval(() => {
      setStep((s) => (s + 1) % steps.length);
    }, 1200);
    return () => clearInterval(iv);
  }, [steps.length]);

  return (
    <div className="flex items-center gap-2.5 px-1">
      <div className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: "rgba(34,211,238,0.1)", border: "1px solid rgba(34,211,238,0.15)" }}>
        <Sparkles className="w-3 h-3" style={{ color: "#22d3ee" }} />
      </div>
      <div>
        <p className="text-[11px] font-medium" style={{ color: "#22d3ee" }}>{steps[step]}</p>
        <TypingIndicator />
      </div>
    </div>
  );
}

/* ─── Main Chat View ─────────────────────────────────────────────────── */
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

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recogRef = useRef<any>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, chatLoading]);

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
      addChatMessage({ role: "assistant", content: data.response ?? "No response.", explainable: data.explainable });
    } catch {
      addChatMessage({ role: "assistant", content: "Unable to reach the intelligence server. Please try again." });
    } finally {
      setChatLoading(false);
      inputRef.current?.focus();
    }
  }, [input, chatLoading, chatMessages, addChatMessage, setChatLoading]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const toggleVoice = useCallback(() => {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported."); return; }
    if (isListening && recogRef.current) { recogRef.current.stop(); setIsListening(false); recogRef.current = null; return; }
    const r = new SR();
    r.lang = voiceLang === "en" ? "en-IN" : "kn-IN";
    r.continuous = false;
    r.interimResults = false;
    r.onresult = (ev: any) => { setInput(ev.results[0][0].transcript); setIsListening(false); recogRef.current = null; };
    r.onerror = () => { setIsListening(false); recogRef.current = null; };
    r.onend = () => { setIsListening(false); recogRef.current = null; };
    recogRef.current = r;
    r.start();
    setIsListening(true);
  }, [isListening, voiceLang]);

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
    doc.text(`Generated: ${ds}${user?.role ? ` | Role: ${user.role}` : ""}`, pw / 2, y, { align: "center" });
    y += 12;
    doc.setDrawColor(200, 200, 200);
    doc.line(mg, y, pw - mg, y);
    y += 8;
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(11);
    for (const msg of chatMessages) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFont("helvetica", "bold");
      doc.text(msg.role === "user" ? "OFFICER QUERY:" : "AI COPILOT RESPONSE:", mg, y);
      y += 5;
      doc.setFont("helvetica", "normal");
      for (const line of doc.splitTextToSize(msg.content, cw)) {
        if (y > 275) { doc.addPage(); y = 20; }
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
      doc.text("KSP Sentinel AI - Confidential", pw / 2, doc.internal.pageSize.getHeight() - 8, { align: "center" });
    }
    doc.save(`ksp_briefing_${new Date().toISOString().slice(0, 10)}.pdf`);
  }, [chatMessages, user]);

  return (
    <div className="flex h-full w-full">
      {/* Left Column — Chat */}
      <div className="flex flex-col h-full w-full lg:w-[60%]">
        {/* Chat Header */}
        <div
          className="flex items-center justify-between px-5 h-12 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(34,211,238,0.05))", border: "1px solid rgba(34,211,238,0.12)" }}>
              <Shield className="w-3.5 h-3.5" style={{ color: "#22d3ee" }} />
            </div>
            <span className="text-[13px] font-semibold tracking-wide" style={{ color: "#f1f5f9" }}>AI Copilot</span>
            <span className="text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider" style={{ background: "rgba(34,211,238,0.08)", color: "#22d3ee", border: "1px solid rgba(34,211,238,0.12)" }}>Live</span>
          </div>
          {chatMessages.length > 0 && (
            <motion.button
              onClick={() => clearChat()}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-[11px] rounded-lg cursor-pointer transition-all duration-200"
              style={{ color: "#5a657a", border: "1px solid rgba(255,255,255,0.06)" }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(248,113,113,0.06)"; e.currentTarget.style.color = "#f87171"; e.currentTarget.style.borderColor = "rgba(248,113,113,0.15)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#5a657a"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; }}
            >
              <Trash2 className="w-3 h-3" /> Clear
            </motion.button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
          {/* Welcome Screen */}
          {chatMessages.length === 0 && !chatLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-8 animate-fade-in">
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <div className="w-20 h-20 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.12), rgba(129,140,248,0.08))", border: "1px solid rgba(34,211,238,0.15)" }}>
                  <Shield className="w-9 h-9" style={{ color: "#22d3ee" }} />
                </div>
                <div className="absolute -inset-4 rounded-3xl animate-pulse-glow" style={{ background: "radial-gradient(circle, rgba(34,211,238,0.06) 0%, transparent 70%)" }} />
              </motion.div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold" style={{ color: "#f1f5f9" }}>KSP AI Copilot</h2>
                <p className="text-sm max-w-sm mx-auto leading-relaxed" style={{ color: "#8b97b0" }}>
                  Ask about crimes, patterns, gang connections, or specific FIRs. Intelligence analysis powered by pattern recognition.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg px-4">
                {EXAMPLE_QUERIES.map((q, i) => (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 + i * 0.05, duration: 0.3 }}
                    whileHover={{ y: -2, transition: { duration: 0.15 } }}
                    onClick={() => { setInput(q); inputRef.current?.focus(); }}
                    className="text-left p-3.5 rounded-xl cursor-pointer transition-all duration-200 group"
                    style={{ backgroundColor: "rgba(15,21,36,0.45)", border: "1px solid rgba(255,255,255,0.06)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = "rgba(34,211,238,0.15)"; e.currentTarget.style.background = "rgba(15,21,36,0.6)"; e.currentTarget.style.boxShadow = "0 8px 32px rgba(34,211,238,0.04)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(15,21,36,0.45)"; e.currentTarget.style.boxShadow = "none"; }}
                  >
                    <div className="flex items-start gap-2.5">
                      <Lightbulb className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 transition-colors duration-200" style={{ color: "#3d4659" }} />
                      <span className="text-[12px] leading-relaxed" style={{ color: "#8b97b0" }}>{q}</span>
                    </div>
                  </motion.button>
                ))}
              </div>

              {/* Quick actions */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] uppercase tracking-wider" style={{ color: "#3d4659" }}>Try:</span>
                {["High risk analysis", "Gang mapping", "Crime trends"].map((chip) => (
                  <button
                    key={chip}
                    onClick={() => { setInput(chip); inputRef.current?.focus(); }}
                    className="text-[10px] px-2.5 py-1 rounded-full cursor-pointer transition-all duration-200"
                    style={{ color: "#5a657a", border: "1px solid rgba(255,255,255,0.06)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = "#22d3ee"; e.currentTarget.style.borderColor = "rgba(34,211,238,0.2)"; e.currentTarget.style.background = "rgba(34,211,238,0.06)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = "#5a657a"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "transparent"; }}
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Bubbles */}
          <AnimatePresence>
            {chatMessages.map((msg, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "assistant" && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-1" style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(129,140,248,0.1))", border: "1px solid rgba(34,211,238,0.15)" }}>
                    <Shield className="w-3.5 h-3.5" style={{ color: "#22d3ee" }} />
                  </div>
                )}
                <div className="flex flex-col max-w-[80%]">
                  <div
                    className="px-4 py-3 text-[13px] leading-relaxed whitespace-pre-wrap"
                    style={msg.role === "user"
                      ? { background: "linear-gradient(135deg, rgba(34,211,238,0.12), rgba(34,211,238,0.06))", color: "#f1f5f9", borderRadius: "16px 16px 4px 16px", border: "1px solid rgba(34,211,238,0.15)" }
                      : { backgroundColor: "rgba(15,21,36,0.45)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.06)", color: "#e8edf5", borderRadius: "16px 16px 16px 4px" }
                  }
                  >
                    {msg.content}
                  </div>
                  {msg.role === "assistant" && msg.explainable && (
                    <ExplainablePanel exp={msg.explainable} />
                  )}
                  {msg.role === "assistant" && idx === chatMessages.length - 1 && (
                    <div className="flex items-center gap-1.5 mt-1.5 ml-1">
                      <Zap className="w-3 h-3" style={{ color: "#3d4659" }} />
                      <span className="text-[10px]" style={{ color: "#3d4659" }}>AI Generated — Verify with sources</span>
                    </div>
                  )}
                  <span className="text-[10px] mt-1.5 px-1" style={{ color: "#3d4659" }}>{fmtTime(new Date())}</span>
                </div>
                {msg.role === "user" && (
                  <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-1" style={{ background: "rgba(129,140,248,0.1)", border: "1px solid rgba(129,140,248,0.15)" }}>
                    <User className="w-3.5 h-3.5" style={{ color: "#818cf8" }} />
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Loading / Thinking State */}
          <AnimatePresence>
            {chatLoading && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="flex gap-3 justify-start"
              >
                <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-1" style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(129,140,248,0.1))", border: "1px solid rgba(34,211,238,0.15)" }}>
                  <Shield className="w-3.5 h-3.5" style={{ color: "#22d3ee" }} />
                </div>
                <div className="px-4 py-3.5 rounded-2xl" style={{ backgroundColor: "rgba(15,21,36,0.45)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <ThinkingState />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={endRef} />
        </div>

        {/* Input Area */}
        <div
          className="flex items-center gap-2 px-5 py-3 flex-shrink-0"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
        >
          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={voiceLang === "en" ? "Ask about crimes, FIRs, gangs..." : "ಅಪರಾಧ, FIR, ಗ್ಯಾಂಗ್ ಬಗ್ಗೆ ಕೇಳಿ..."}
              disabled={chatLoading}
              className="h-11 rounded-xl text-[13px]"
              style={{ backgroundColor: "rgba(10,15,28,0.6)", border: "1px solid rgba(255,255,255,0.06)", color: "#f1f5f9" }}
            />
          </div>
          <motion.button
            onClick={handleSend}
            disabled={chatLoading || !input.trim()}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            className="flex items-center justify-center w-11 h-11 rounded-xl cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
            style={{ background: "linear-gradient(135deg, #22d3ee, #06b6d4)", color: "#050810", boxShadow: (!chatLoading && input.trim()) ? "0 0 20px rgba(34,211,238,0.15)" : "none" }}
          >
            <Send className="w-4 h-4" />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={toggleVoice}
            className="flex items-center justify-center w-11 h-11 rounded-xl cursor-pointer transition-all duration-200 relative"
            style={{ border: isListening ? "1px solid rgba(248,113,113,0.3)" : "1px solid rgba(255,255,255,0.06)", backgroundColor: isListening ? "rgba(248,113,113,0.08)" : "rgba(15,21,36,0.45)" }}
          >
            {isListening && <span className="absolute inset-0 rounded-xl animate-ping" style={{ backgroundColor: "rgba(248,113,113,0.1)", animationDuration: "1.5s" }} />}
            {isListening ? <Mic className="w-4 h-4" style={{ color: "#f87171" }} /> : <MicOff className="w-4 h-4" style={{ color: "#5a657a" }} />}
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={() => setVoiceLang((v) => v === "en" ? "kn" : "en")}
            className="flex items-center justify-center w-11 h-11 rounded-xl cursor-pointer transition-all duration-200"
            style={{ border: voiceLang === "kn" ? "1px solid rgba(34,211,238,0.2)" : "1px solid rgba(255,255,255,0.06)", backgroundColor: voiceLang === "kn" ? "rgba(34,211,238,0.06)" : "rgba(15,21,36,0.45)", color: voiceLang === "kn" ? "#22d3ee" : "#5a657a" }}
          >
            <span className="text-[10px] font-bold">{voiceLang.toUpperCase()}</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            onClick={exportPDF}
            disabled={chatMessages.length === 0}
            className="flex items-center justify-center w-11 h-11 rounded-xl cursor-pointer disabled:opacity-20 disabled:cursor-not-allowed transition-all duration-200"
            style={{ border: "1px solid rgba(255,255,255,0.06)", backgroundColor: "rgba(15,21,36,0.45)" }}
            onMouseEnter={(e) => { if (chatMessages.length > 0) { e.currentTarget.style.borderColor = "rgba(34,211,238,0.15)"; e.currentTarget.style.background = "rgba(34,211,238,0.06)"; }}}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)"; e.currentTarget.style.background = "rgba(15,21,36,0.45)"; }}
          >
            <FileText className="w-4 h-4" style={{ color: chatMessages.length > 0 ? "#8b97b0" : "#3d4659" }} />
          </motion.button>
        </div>
      </div>

      {/* Right Column — Evidence Panel */}
      <div
        className="hidden lg:flex flex-col h-full w-[40%] flex-shrink-0"
        style={{ borderLeft: "1px solid rgba(255,255,255,0.04)" }}
      >
        <div
          className="flex items-center gap-2.5 px-5 h-12 flex-shrink-0"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
        >
          <FileText className="w-4 h-4" style={{ color: "#818cf8" }} />
          <span className="text-[13px] font-semibold tracking-wide" style={{ color: "#f1f5f9" }}>Evidence Panel</span>
          {extractedFIRs.length > 0 && (
            <motion.span
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="ml-auto text-[10px] px-2.5 py-0.5 rounded-full font-semibold"
              style={{ backgroundColor: "rgba(129,140,248,0.08)", color: "#818cf8", border: "1px solid rgba(129,140,248,0.12)" }}
            >
              {extractedFIRs.length} FIR{extractedFIRs.length > 1 ? "s" : ""} linked
            </motion.span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {extractedFIRs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.04)" }}>
                <Shield className="w-5 h-5" style={{ color: "#3d4659" }} />
              </div>
              <div>
                <p className="text-[13px] font-medium" style={{ color: "#3d4659" }}>No evidence linked</p>
                <p className="text-[11px] mt-1" style={{ color: "#3d4659" }}>FIR references will appear here when you ask a question</p>
              </div>
            </div>
          ) : (
            extractedFIRs.map((fir, idx) => {
              const sev = SEVERITY_BADGE[fir.severity] || SEVERITY_BADGE.low;
              return (
                <motion.div
                  key={fir.fir_id}
                  initial={{ opacity: 0, x: 8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05, duration: 0.2 }}
                  className="p-4 rounded-xl cursor-default transition-all duration-200 group"
                  style={{
                    backgroundColor: "rgba(15,21,36,0.45)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderLeft: `3px solid ${SEVERITY_BORDER[fir.severity] || "#fbbf24"}`,
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(15,21,36,0.6)"; e.currentTarget.style.boxShadow = "0 4px 24px rgba(0,0,0,0.2)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(15,21,36,0.45)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[12px] font-mono font-bold" style={{ color: "#f1f5f9" }}>{fir.fir_id}</span>
                    <span
                      className="text-[9px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider"
                      style={{ backgroundColor: sev.bg, color: sev.color, border: `1px solid ${sev.border}` }}
                    >
                      {fir.severity}
                    </span>
                  </div>
                  <p className="text-[11px] mb-1.5" style={{ color: "#5a657a" }}>{fir.date} {fir.time}</p>
                  <p className="text-[12px] mb-1" style={{ color: "#e8edf5" }}>
                    <span style={{ color: "#5a657a" }}>Crime: </span>{fir.crime_type}
                  </p>
                  <p className="text-[12px] mb-1" style={{ color: "#e8edf5" }}>
                    <span style={{ color: "#5a657a" }}>District: </span>{fir.district}
                  </p>
                  <p className="text-[11px]" style={{ color: "#5a657a" }}>IPC: {fir.ipc_section}</p>
                </motion.div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}