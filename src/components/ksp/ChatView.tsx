'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { Send, Mic, MicOff, FileText, MessageSquare } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useAppStore } from '@/lib/store';
import type { ChatMessage, FIR } from '@/lib/types';
import { loadCrimeData, searchFIRs } from '@/lib/data';
import jsPDF from 'jspdf';

const EXAMPLE_QUERIES = [
  'Show all chain snatching cases in Mysuru',
  'Who are the members of the Silk City Gang?',
  'Which accused has the highest risk score?',
  'Are there patterns in vehicle theft crimes?',
  'Show financial links in jewellery heist cases',
];

const SEVERITY_COLORS: Record<FIR['severity'], string> = {
  critical: 'bg-red-500/20 text-red-400 border border-red-500/40',
  high: 'bg-orange-500/20 text-orange-400 border border-orange-500/40',
  medium: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40',
  low: 'bg-green-500/20 text-green-400 border border-green-500/40',
};

function extractFIRIds(text: string): string[] {
  const pattern = /FIR-2024-KA-\d{4}/g;
  const matches = text.match(pattern);
  return matches ? [...new Set(matches)] : [];
}

export default function ChatView() {
  const crimeData = useAppStore((s) => s.crimeData);
  const chatMessages = useAppStore((s) => s.chatMessages);
  const addChatMessage = useAppStore((s) => s.addChatMessage);
  const chatLoading = useAppStore((s) => s.chatLoading);
  const setChatLoading = useAppStore((s) => s.setChatLoading);
  const user = useAppStore((s) => s.user);

  const [input, setInput] = useState('');
  const [voiceLang, setVoiceLang] = useState<'en' | 'kn'>('en');
  const [isListening, setIsListening] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  // Extract FIR IDs from the latest AI message for the evidence panel
  const extractedFIRs = useMemo(() => {
    if (!crimeData) return [];
    const lastAIMessage = [...chatMessages]
      .reverse()
      .find((m) => m.role === 'assistant');
    if (!lastAIMessage) return [];

    const firIds = extractFIRIds(lastAIMessage.content);
    const matchedFIRs: FIR[] = [];
    for (const id of firIds) {
      const results = searchFIRs(crimeData, { fir_id: id });
      matchedFIRs.push(...results);
    }
    return matchedFIRs;
  }, [chatMessages, crimeData]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || chatLoading) return;

    setInput('');
    addChatMessage({ role: 'user', content: trimmed });
    setChatLoading(true);

    try {
      const res = await fetch('/api/chat?XTransformPort=3000', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, history: chatMessages }),
      });

      if (!res.ok) throw new Error('Failed to get response');

      const data = await res.json();
      const aiContent = data.response ?? data.message ?? 'No response received.';
      addChatMessage({ role: 'assistant', content: aiContent });
    } catch {
      addChatMessage({
        role: 'assistant',
        content:
          '⚠️ Unable to reach the intelligence server. Please check your connection and try again.',
      });
    } finally {
      setChatLoading(false);
      inputRef.current?.focus();
    }
  }, [input, chatLoading, chatMessages, addChatMessage, setChatLoading]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleVoice = useCallback(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser.');
      return;
    }

    // If already listening, stop
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      recognitionRef.current = null;
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = voiceLang === 'en' ? 'en-IN' : 'kn-IN';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const text = event.results[0][0].transcript;
      setInput(text);
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onerror = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognition.onend = () => {
      setIsListening(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening, voiceLang]);

  const toggleLanguage = () => {
    setVoiceLang((prev) => (prev === 'en' ? 'kn' : 'en'));
  };

  const exportPDF = useCallback(() => {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('KSP Intelligence Briefing', pageWidth / 2, y, { align: 'center' });
    y += 10;

    // Metadata line
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    const now = new Date();
    const dateStr = now.toLocaleString('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
    const roleStr = user?.role ? ` | Role: ${user.role}` : '';
    doc.text(`Generated: ${dateStr}${roleStr}`, pageWidth / 2, y, {
      align: 'center',
    });
    y += 12;

    // Divider
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Chat messages
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(11);

    for (const msg of chatMessages) {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }

      const label =
        msg.role === 'user' ? 'OFFICER QUERY:' : 'AI COPILOT RESPONSE:';
      doc.setFont('helvetica', 'bold');
      doc.text(label, margin, y);
      y += 5;

      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(msg.content, contentWidth);
      for (const line of lines) {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.text(line, margin, y);
        y += 4.5;
      }
      y += 6;
    }

    // Footer
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `KSP Sentinel AI — Confidential`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'center' }
      );
    }

    const dateFile = now.toISOString().slice(0, 10);
    doc.save(`ksp_briefing_${dateFile}.pdf`);
  }, [chatMessages, user]);

  const fillQuery = (query: string) => {
    setInput(query);
    inputRef.current?.focus();
  };

  return (
    <div className="flex h-full w-full" style={{ backgroundColor: '#0a0f1e' }}>
      {/* ─── Left Column: Chat Area ─── */}
      <div className="flex flex-col h-full w-full lg:w-[60%]">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {chatMessages.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full text-center gap-4 opacity-60">
              <MessageSquare className="w-12 h-12" style={{ color: '#94a3b8' }} />
              <div>
                <p className="text-lg font-semibold" style={{ color: '#e2e8f0' }}>
                  KSP Sentinel AI — Intelligence Copilot
                </p>
                <p className="text-sm mt-1" style={{ color: '#94a3b8' }}>
                  Ask questions about crime data, FIRs, gangs, and more.
                </p>
              </div>
            </div>
          )}

          {chatMessages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className="max-w-[80%] px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap"
                style={
                  msg.role === 'user'
                    ? {
                        backgroundColor: '#3b82f6',
                        color: '#ffffff',
                        borderRadius: '0.75rem',
                      }
                    : {
                        backgroundColor: '#1a2035',
                        border: '1px solid #2a3550',
                        color: '#e2e8f0',
                        borderRadius: '0.75rem',
                      }
                }
              >
                {msg.content}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {chatLoading && (
            <div className="flex justify-start">
              <div
                className="px-4 py-3 rounded-xl flex items-center gap-2"
                style={{
                  backgroundColor: '#1a2035',
                  border: '1px solid #2a3550',
                }}
              >
                <div className="flex gap-1">
                  <span
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ backgroundColor: '#3b82f6', animationDelay: '0ms' }}
                  />
                  <span
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ backgroundColor: '#3b82f6', animationDelay: '150ms' }}
                  />
                  <span
                    className="w-2 h-2 rounded-full animate-bounce"
                    style={{ backgroundColor: '#3b82f6', animationDelay: '300ms' }}
                  />
                </div>
                <span className="text-xs" style={{ color: '#94a3b8' }}>
                  Analyzing intelligence data...
                </span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Example Query Buttons */}
        <div className="px-4 pb-2">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {EXAMPLE_QUERIES.map((query, idx) => (
              <button
                key={idx}
                onClick={() => fillQuery(query)}
                className="flex-shrink-0 px-3 py-1.5 text-xs rounded-lg border transition-colors cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: '#1a2035',
                  borderColor: '#2a3550',
                  color: '#94a3b8',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#3b82f6';
                  e.currentTarget.style.color = '#e2e8f0';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#2a3550';
                  e.currentTarget.style.color = '#94a3b8';
                }}
              >
                {query}
              </button>
            ))}
          </div>
        </div>

        {/* Input Area */}
        <div
          className="flex items-center gap-2 px-4 py-3 border-t"
          style={{ borderColor: '#2a3550', backgroundColor: '#0d1225' }}
        >
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              voiceLang === 'en'
                ? 'Ask about crimes, FIRs, gangs...'
                : 'ಅಪರಾಧ, FIR, ಗ್ಯಾಂಗ್ ಬಗ್ಗೆ ಕೇಳಿ...'
            }
            disabled={chatLoading}
            className="flex-1 text-sm h-10"
            style={{
              backgroundColor: '#1a2035',
              border: '1px solid #2a3550',
              color: '#e2e8f0',
            }}
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={chatLoading || !input.trim()}
            className="flex items-center justify-center w-10 h-10 rounded-lg transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: '#3b82f6' }}
            onMouseEnter={(e) => {
              if (!chatLoading && input.trim()) {
                e.currentTarget.style.backgroundColor = '#2563eb';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = '#3b82f6';
            }}
          >
            <Send className="w-4 h-4 text-white" />
          </button>

          {/* Microphone Button */}
          <button
            onClick={toggleVoice}
            className={`flex items-center justify-center w-10 h-10 rounded-lg border transition-colors cursor-pointer ${
              isListening ? 'animate-pulse' : ''
            }`}
            style={{
              borderColor: isListening ? '#3b82f6' : '#2a3550',
              backgroundColor: isListening ? '#3b82f620' : '#1a2035',
            }}
          >
            {isListening ? (
              <Mic className="w-4 h-4" style={{ color: '#3b82f6' }} />
            ) : (
              <MicOff className="w-4 h-4" style={{ color: '#94a3b8' }} />
            )}
          </button>

          {/* Language Toggle */}
          <button
            onClick={toggleLanguage}
            className="flex items-center justify-center w-10 h-10 rounded-lg border transition-colors cursor-pointer"
            style={{
              borderColor: voiceLang === 'kn' ? '#3b82f6' : '#2a3550',
              backgroundColor: voiceLang === 'kn' ? '#3b82f620' : '#1a2035',
              color: voiceLang === 'kn' ? '#3b82f6' : '#94a3b8',
            }}
          >
            <span className="text-xs font-bold">{voiceLang.toUpperCase()}</span>
          </button>

          {/* Export PDF */}
          <button
            onClick={exportPDF}
            disabled={chatMessages.length === 0}
            className="flex items-center justify-center w-10 h-10 rounded-lg border transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              borderColor: '#2a3550',
              backgroundColor: '#1a2035',
            }}
            onMouseEnter={(e) => {
              if (chatMessages.length > 0) {
                e.currentTarget.style.borderColor = '#3b82f6';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#2a3550';
            }}
          >
            <FileText className="w-4 h-4" style={{ color: '#94a3b8' }} />
          </button>
        </div>
      </div>

      {/* ─── Right Column: Evidence Panel ─── */}
      <div
        className="hidden lg:flex flex-col h-full w-[40%] border-l"
        style={{ borderColor: '#2a3550', backgroundColor: '#0d1225' }}
      >
        {/* Panel Header */}
        <div
          className="flex items-center gap-2 px-4 py-3 border-b"
          style={{ borderColor: '#2a3550' }}
        >
          <FileText className="w-4 h-4" style={{ color: '#3b82f6' }} />
          <span
            className="text-sm font-semibold tracking-wide uppercase"
            style={{ color: '#e2e8f0' }}
          >
            Evidence Panel
          </span>
          {extractedFIRs.length > 0 && (
            <span
              className="ml-auto text-xs px-2 py-0.5 rounded-full"
              style={{
                backgroundColor: '#3b82f620',
                color: '#3b82f6',
                border: '1px solid #3b82f640',
              }}
            >
              {extractedFIRs.length} FIR{extractedFIRs.length > 1 ? 's' : ''} linked
            </span>
          )}
        </div>

        {/* Panel Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {extractedFIRs.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center gap-3 opacity-50">
              <MessageSquare className="w-10 h-10" style={{ color: '#94a3b8' }} />
              <p className="text-sm" style={{ color: '#94a3b8' }}>
                FIR references will appear here...
              </p>
              <p className="text-xs" style={{ color: '#64748b' }}>
                Ask a question to see linked FIR evidence
              </p>
            </div>
          ) : (
            extractedFIRs.map((fir) => (
              <div
                key={fir.fir_id}
                className="p-4 rounded-xl border"
                style={{
                  backgroundColor: '#1a2035',
                  borderColor: '#2a3550',
                }}
              >
                {/* FIR ID + Severity */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-sm font-mono font-bold"
                    style={{ color: '#e2e8f0' }}
                  >
                    {fir.fir_id}
                  </span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase ${
                      SEVERITY_COLORS[fir.severity]
                    }`}
                  >
                    {fir.severity}
                  </span>
                </div>

                {/* Date */}
                <p className="text-xs mb-1" style={{ color: '#94a3b8' }}>
                  📅 {fir.date} {fir.time}
                </p>

                {/* Crime Type */}
                <p className="text-xs mb-1" style={{ color: '#e2e8f0' }}>
                  <span style={{ color: '#94a3b8' }}>Crime:</span>{' '}
                  {fir.crime_type}
                </p>

                {/* District */}
                <p className="text-xs mb-1" style={{ color: '#e2e8f0' }}>
                  <span style={{ color: '#94a3b8' }}>District:</span>{' '}
                  {fir.district}
                </p>

                {/* IPC Section */}
                <p className="text-xs" style={{ color: '#e2e8f0' }}>
                  <span style={{ color: '#94a3b8' }}>IPC:</span>{' '}
                  {fir.ipc_section}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}