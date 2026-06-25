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
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/lib/store";
import type { ChatMessage, FIR } from "@/lib/types";
import { searchFIRs } from "@/lib/data";
import jsPDF from "jspdf";

const EXAMPLE_QUERIES = [
  "Show all chain snatching cases in Mysuru",
  "Who are the members of the Silk City Gang?",
  "Which accused has the highest risk score?",
  "Are there patterns in vehicle theft crimes?",
  "Show financial links in jewellery heist cases",
];

const SEVERITY_BORDER: Record<string, string> = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#22c55e",
};

const SEVERITY_BADGE: Record<string, string> = {
  critical: "bg-red-500/20 text-red-400 border border-red-500/40",
  high: "bg-orange-500/20 text-orange-400 border border-orange-500/40",
  medium: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40",
  low: "bg-green-500/20 text-green-400 border border-green-500/40",
};

function extractFIRIds(text: string): string[] {
  const m = text.match(/FIR-\d{4}-KA-\d{4}/g);
  return m ? [...new Set(m)] : [];
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
}

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
      addChatMessage({ role: "assistant", content: data.response ?? "No response." });
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
    <div className="flex h-full w-full" style={{ backgroundColor: "#0a0f1e" }}>
      {/* Left Column — Chat */}
      <div className="flex flex-col h-full w-full lg:w-[60%]">
        {/* Chat Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#2a3550", backgroundColor: "#0d1225" }}>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: "#3b82f6" }} />
            <span className="text-sm font-semibold tracking-wide" style={{ color: "#e2e8f0" }}>KSP Sentinel Chat</span>
          </div>
          {chatMessages.length > 0 && (
            <button onClick={() => clearChat()} className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer hover:border-red-500 hover:text-red-400 hover:bg-red-500/10" style={{ borderColor: "#2a3550", backgroundColor: "#1a2035", color: "#94a3b8" }}>
              <Trash2 className="w-3 h-3" /> Clear Chat
            </button>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {/* Welcome Screen */}
          {chatMessages.length === 0 && !chatLoading && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-6">
              <div className="flex items-center justify-center w-20 h-20 rounded-2xl" style={{ background: "linear-gradient(135deg, rgba(59,130,246,0.13), rgba(59,130,246,0.06))", border: "1px solid rgba(59,130,246,0.19)" }}>
                <Shield className="w-10 h-10" style={{ color: "#3b82f6" }} />
              </div>
              <div>
                <p className="text-xl font-bold" style={{ color: "#e2e8f0" }}>KSP AI Copilot</p>
                <p className="text-sm mt-2 max-w-sm" style={{ color: "#94a3b8" }}>Ask me about crimes, patterns, gang connections, or specific FIRs</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 w-full max-w-xl px-4">
                {EXAMPLE_QUERIES.map((q, i) => (
                  <button key={i} onClick={() => { setInput(q); inputRef.current?.focus(); }}
                    className="text-left p-3 rounded-xl border transition-all cursor-pointer hover:border-blue-500 hover:text-white hover:bg-[#1a2035] hover:-translate-y-0.5 hover:shadow-[0_4px_12px_rgba(59,130,246,0.15)]"
                    style={{ backgroundColor: "rgba(26,32,53,0.5)", borderColor: "#2a3550", color: "#94a3b8", fontSize: "0.75rem", lineHeight: "1.4" }}>
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Chat Bubbles */}
          {chatMessages.map((msg, idx) => (
            <div key={idx} className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              {msg.role === "assistant" && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-1" style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", boxShadow: "0 0 12px rgba(59,130,246,0.3)" }}>
                  <Shield className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div className="flex flex-col max-w-[80%]">
                <div
                  className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                  style={msg.role === "user"
                    ? { background: "linear-gradient(135deg, #2563eb, #1d4ed8)", color: "#fff", borderRadius: "1rem 1rem 0.25rem 1rem", boxShadow: "0 4px 16px rgba(37,99,235,0.3)" }
                    : { backgroundColor: "rgba(26,32,53,0.7)", backdropFilter: "blur(12px)", border: "1px solid #2a3550", color: "#e2e8f0", borderRadius: "1rem 1rem 1rem 0.25rem" }}
                >
                  {msg.content}
                </div>
                <span className="text-[10px] mt-1 px-1" style={{ color: "#64748b" }}>{fmtTime(new Date())}</span>
              </div>
              {msg.role === "user" && (
                <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-1" style={{ background: "linear-gradient(135deg, #334155, #1e293b)", border: "1px solid #475569" }}>
                  <User className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
                </div>
              )}
            </div>
          ))}

          {/* Loading Indicator */}
          {chatLoading && (
            <div className="flex gap-2.5 justify-start">
              <div className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-1" style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", boxShadow: "0 0 12px rgba(59,130,246,0.3)" }}>
                <Shield className="w-3.5 h-3.5 text-white" />
              </div>
              <div className="px-4 py-3 rounded-2xl flex items-center gap-2" style={{ backgroundColor: "rgba(26,32,53,0.7)", backdropFilter: "blur(12px)", border: "1px solid #2a3550" }}>
                <Loader2 className="w-3.5 h-3.5 animate-spin" style={{ color: "#3b82f6" }} />
                <span className="text-xs" style={{ color: "#94a3b8" }}>Analyzing intelligence data</span>
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: "#3b82f6", animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: "#3b82f6", animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: "#3b82f6", animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input Area */}
        <div className="flex items-center gap-2 px-4 py-3 border-t" style={{ borderColor: "#2a3550", backgroundColor: "#0d1225" }}>
          <Input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder={voiceLang === "en" ? "Ask about crimes, FIRs, gangs..." : "ಅಪರಾಧ, FIR, ಗ್ಯಾಂಗ್ ಬಗ್ಗೆ ಕೇಳಿ..."}
            disabled={chatLoading}
            className="flex-1 text-sm h-12 rounded-2xl"
            style={{ backgroundColor: "#1a2035", border: "1px solid #2a3550", color: "#e2e8f0" }}
          />
          <button onClick={handleSend} disabled={chatLoading || !input.trim()}
            className="flex items-center justify-center w-10 h-10 rounded-xl transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed hover:bg-blue-700"
            style={{ backgroundColor: "#3b82f6" }}>
            <Send className="w-4 h-4 text-white" />
          </button>
          <button onClick={toggleVoice}
            className="flex items-center justify-center w-10 h-10 rounded-xl border transition-all cursor-pointer relative"
            style={{ borderColor: isListening ? "#ef4444" : "#2a3550", backgroundColor: isListening ? "rgba(239,68,68,0.13)" : "#1a2035" }}>
            {isListening && <span className="absolute inset-0 rounded-xl animate-ping" style={{ backgroundColor: "rgba(239,68,68,0.15)", animationDuration: "1s" }} />}
            {isListening ? <Mic className="w-4 h-4" style={{ color: "#ef4444" }} /> : <MicOff className="w-4 h-4" style={{ color: "#94a3b8" }} />}
          </button>
          <button onClick={() => setVoiceLang((v) => v === "en" ? "kn" : "en")}
            className="flex items-center justify-center w-10 h-10 rounded-xl border transition-colors cursor-pointer"
            style={{ borderColor: voiceLang === "kn" ? "#3b82f6" : "#2a3550", backgroundColor: voiceLang === "kn" ? "rgba(59,130,246,0.13)" : "#1a2035", color: voiceLang === "kn" ? "#3b82f6" : "#94a3b8" }}>
            <span className="text-xs font-bold">{voiceLang.toUpperCase()}</span>
          </button>
          <button onClick={exportPDF} disabled={chatMessages.length === 0}
            className="flex items-center gap-1.5 px-3 h-10 rounded-xl border transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed hover:border-blue-500"
            style={{ borderColor: "#2a3550", backgroundColor: "#1a2035" }}>
            <FileText className="w-3.5 h-3.5" style={{ color: "#94a3b8" }} />
            <span className="text-xs hidden sm:inline" style={{ color: "#94a3b8" }}>PDF</span>
          </button>
        </div>
      </div>

      {/* Right Column — Evidence Panel */}
      <div className="hidden lg:flex flex-col h-full w-[40%] border-l" style={{ borderColor: "#2a3550", backgroundColor: "#0d1225" }}>
        <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: "#2a3550", backgroundColor: "rgba(26,32,53,0.6)", backdropFilter: "blur(12px)" }}>
          <FileText className="w-4 h-4" style={{ color: "#3b82f6" }} />
          <span className="text-sm font-semibold tracking-wide uppercase" style={{ color: "#e2e8f0" }}>Evidence Panel</span>
          {extractedFIRs.length > 0 && (
            <span className="ml-auto text-xs px-2 py-0.5 rounded-full" style={{ backgroundColor: "rgba(59,130,246,0.13)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.25)" }}>
              {extractedFIRs.length} FIR{extractedFIRs.length > 1 ? "s" : ""} linked
            </span>
          )}
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {extractedFIRs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-50">
              <Shield className="w-10 h-10" style={{ color: "#94a3b8" }} />
              <p className="text-sm" style={{ color: "#94a3b8" }}>FIR references will appear here...</p>
              <p className="text-xs" style={{ color: "#64748b" }}>Ask a question to see linked FIR evidence</p>
            </div>
          ) : (
            extractedFIRs.map((fir) => (
              <div key={fir.fir_id}
                className="p-4 rounded-xl border transition-all duration-200 cursor-default hover:shadow-[0_4px_16px_rgba(59,130,246,0.08)] hover:translate-x-0.5"
                style={{ backgroundColor: "#1a2035", borderColor: "#2a3550", borderLeftWidth: "3px", borderLeftColor: SEVERITY_BORDER[fir.severity] || "#eab308" }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono font-bold" style={{ color: "#e2e8f0" }}>{fir.fir_id}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${SEVERITY_BADGE[fir.severity] || ""}`}>{fir.severity}</span>
                </div>
                <p className="text-xs mb-1" style={{ color: "#94a3b8" }}>&#128197; {fir.date} {fir.time}</p>
                <p className="text-xs mb-1" style={{ color: "#e2e8f0" }}><span style={{ color: "#94a3b8" }}>Crime:</span> {fir.crime_type}</p>
                <p className="text-xs mb-1" style={{ color: "#e2e8f0" }}><span style={{ color: "#94a3b8" }}>District:</span> {fir.district}</p>
                <p className="text-xs" style={{ color: "#e2e8f0" }}><span style={{ color: "#94a3b8" }}>IPC:</span> {fir.ipc_section}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}