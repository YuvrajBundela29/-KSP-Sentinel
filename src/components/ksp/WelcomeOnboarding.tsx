"use client";

import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAppStore } from "@/lib/store";
import {
  Shield,
  LayoutDashboard,
  Bot,
  Network,
  MapPin,
  UserSearch,
  Clock,
  FileText,
  Database,
  TrendingUp,
  BrainCircuit,
  ChevronRight,
  ChevronLeft,
  X,
  Keyboard,
  ArrowRight,
  Zap,
  BarChart3,
  Search,
  Lightbulb,
  BookOpen,
  Sparkles,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════
   STEP DATA
   ═══════════════════════════════════════════════════════════════════════ */

interface StepData {
  id: string;
  type: "welcome" | "features" | "shortcuts" | "complete";
  title: string;
  subtitle: string;
  content: React.ReactNode;
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  shortcut,
  color,
  delay,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  shortcut?: string;
  color: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
      className="rounded-xl p-4 transition-all duration-300 group cursor-default"
      style={{
        background: "rgba(15,21,36,0.5)",
        border: "1px solid var(--border-subtle)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = color + "30";
        e.currentTarget.style.background = color + "08";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "rgba(255,255,255,0.06)";
        e.currentTarget.style.background = "rgba(15,21,36,0.5)";
        e.currentTarget.style.transform = "translateY(0)";
      }}
    >
      <div className="flex items-start gap-3.5">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
          style={{
            background: color + "12",
            border: `1px solid ${color}20`,
          }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <h4
              className="text-[13px] font-semibold"
              style={{ color: "var(--text-primary)" }}
            >
              {title}
            </h4>
            {shortcut && (
              <kbd
                className="text-[9px] font-mono px-1.5 py-0.5 rounded flex-shrink-0"
                style={{
                  background: "var(--border-subtle)",
                  color: "var(--text-tertiary)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                {shortcut}
              </kbd>
            )}
          </div>
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            {description}
          </p>
        </div>
      </div>
    </motion.div>
  );
}

function ShortcutRow({
  keys,
  action,
  delay,
}: {
  keys: string;
  action: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.35 }}
      className="flex items-center justify-between py-2.5 px-4 rounded-lg"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.03)" }}
    >
      <span className="text-[12px]" style={{ color: "var(--sidebar-foreground)" }}>
        {action}
      </span>
      <div className="flex items-center gap-1.5">
        {keys.split(" + ").map((key, i) => (
          <span key={i} className="flex items-center gap-1.5">
            <kbd
              className="text-[10px] font-mono px-2 py-1 rounded-md font-semibold"
              style={{
                background: "var(--border-subtle)",
                color: "var(--primary)",
                border: "1px solid rgba(34,211,238,0.15)",
                boxShadow: "0 1px 2px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.04)",
              }}
            >
              {key}
            </kbd>
            {i < keys.split(" + ").length - 1 && (
              <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>+</span>
            )}
          </span>
        ))}
      </div>
    </motion.div>
  );
}

function useSteps(): StepData[] {
  return [
    /* ── STEP 0: Welcome ─────────────────────────────────────── */
    {
      id: "welcome",
      type: "welcome",
      title: "Welcome to KSP Sentinel",
      subtitle: "AI-Powered Crime Intelligence Platform",
      content: (
        <div className="text-center space-y-6 py-4">
          {/* Hero icon */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="relative inline-flex items-center justify-center"
          >
            <div
              className="w-20 h-20 rounded-2xl flex items-center justify-center relative"
              style={{
                background:
                  "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(129,140,248,0.1))",
                border: "1px solid rgba(34,211,238,0.2)",
                boxShadow: "0 0 40px rgba(34,211,238,0.1), 0 0 80px rgba(34,211,238,0.05)",
              }}
            >
              <Shield className="w-10 h-10" style={{ color: "var(--primary)" }} />
            </div>
            <motion.div
              className="absolute -top-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center"
              style={{
                background: "rgba(34,211,238,0.2)",
                border: "1px solid rgba(34,211,238,0.3)",
              }}
              animate={{ scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
            >
              <Sparkles className="w-3 h-3" style={{ color: "var(--primary)" }} />
            </motion.div>
          </motion.div>

          {/* Description */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="space-y-3 max-w-md mx-auto"
          >
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--sidebar-foreground)" }}>
              Sentinel is your intelligent command center for crime analysis,
              investigation management, and data-driven policing. This quick
              guide will walk you through every feature.
            </p>
            <p className="text-[13px] leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Built for Karnataka State Police with AI-powered insights,
              real-time analytics, and comprehensive data management — all in
              one secure platform.
            </p>
          </motion.div>

          {/* Quick stats */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.5 }}
            className="flex items-center justify-center gap-6 pt-2"
          >
            {[
              { label: "Intelligence Views", value: "7+", color: "var(--primary)" },
              { label: "AI Models", value: "5", color: "var(--success)" },
              { label: "Data Modules", value: "11", color: "var(--secondary)" },
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <div
                  className="text-xl font-bold"
                  style={{ color: stat.color }}
                >
                  {stat.value}
                </div>
                <div
                  className="text-[10px] mt-0.5 uppercase tracking-wider"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      ),
    },

    /* ── STEP 1: Core Intelligence ────────────────────────────── */
    {
      id: "core-intelligence",
      type: "features",
      title: "Core Intelligence",
      subtitle: "Your primary investigation workspace",
      content: (
        <div className="space-y-3 max-w-lg mx-auto">
          <p className="text-[12px] mb-4 px-1" style={{ color: "var(--text-secondary)" }}>
            These are your main tools for daily investigations. Each view is
            designed for a specific aspect of intelligence work.
          </p>
          <FeatureCard
            icon={LayoutDashboard}
            title="Mission Control"
            description="Your operational overview — live crime stats, FIR trends, investigation queue, AI recommendations, intel feed, and risk alerts. Start here every shift."
            shortcut="Alt+1"
            color="#00FF66"
            delay={0.05}
          />
          <FeatureCard
            icon={Bot}
            title="AI Copilot"
            description="Ask questions about any case in plain English or Kannada. The AI analyzes FIRs, finds patterns, explains evidence chains, and provides confidence-scored answers. Supports voice input."
            shortcut="Alt+2"
            color="#00FF66"
            delay={0.1}
          />
          <FeatureCard
            icon={Network}
            title="Network Graph"
            description="Visualize relationships between accused, gangs, FIRs, vehicles, and districts. Drag nodes to explore connections. Filter by crime type, gang, or relationship strength."
            shortcut="Alt+3"
            color="#00FF66"
            delay={0.15}
          />
          <FeatureCard
            icon={MapPin}
            title="Crime Map"
            description="Interactive map showing crime locations across Karnataka. Toggle between marker view and heat map. Filter by crime type, severity, and district for focused analysis."
            shortcut="Alt+4"
            color="#00FF66"
            delay={0.2}
          />
        </div>
      ),
    },

    /* ── STEP 2: Investigation Tools ──────────────────────────── */
    {
      id: "investigation-tools",
      type: "features",
      title: "Investigation Tools",
      subtitle: "Deep-dive into cases and generate reports",
      content: (
        <div className="space-y-3 max-w-lg mx-auto">
          <p className="text-[12px] mb-4 px-1" style={{ color: "var(--text-secondary)" }}>
            Use these tools to track investigations, build case profiles, and
            produce professional reports for court and departmental use.
          </p>
          <FeatureCard
            icon={UserSearch}
            title="Accused Profile"
            description="Comprehensive suspect profiles with risk scores, prior FIR history, gang affiliations, linked cases, and financial records. Essential for building cases."
            shortcut="Alt+5"
            color="#ff4444"
            delay={0.05}
          />
          <FeatureCard
            icon={Clock}
            title="Investigation Timeline"
            description="Chronological view of all events in a case — complaints, witness statements, CCTV footage, arrests, and more. Filter by event type and build a complete case narrative."
            shortcut="Alt+6"
            color="#FF6B00"
            delay={0.1}
          />
          <FeatureCard
            icon={FileText}
            title="Report Generator"
            description="Generate professional investigation reports, intelligence briefs, and summary documents. Export as PDF with proper formatting for court submissions."
            shortcut="Alt+7"
            color="#00cc52"
            delay={0.15}
          />
        </div>
      ),
    },

    /* ── STEP 3: Analytics & Data Management ──────────────────── */
    {
      id: "analytics-data",
      type: "features",
      title: "Analytics & Data Management",
      subtitle: "Advanced AI models and comprehensive data operations",
      content: (
        <div className="space-y-3 max-w-lg mx-auto">
          <p className="text-[12px] mb-4 px-1" style={{ color: "var(--text-secondary)" }}>
            Predictive analytics help you stay ahead of crime patterns. Data
            management modules let you control every aspect of your crime
            database.
          </p>
          <FeatureCard
            icon={TrendingUp}
            title="Crime Forecasting"
            description="AI-powered predictive models that forecast crime hotspots and trends based on historical patterns. Plan patrols and resource allocation proactively."
            color="#00cc52"
            delay={0.05}
          />
          <FeatureCard
            icon={BrainCircuit}
            title="Sociological Insights"
            description="Deep analysis of socio-economic factors driving crime patterns. Understand root causes, demographic correlations, and community-level risk indicators."
            color="#00cc52"
            delay={0.1}
          />
          <FeatureCard
            icon={Database}
            title="Data Management Hub"
            description="11 specialized modules for managing FIRs, evidence, criminals, victims, vehicles, financial records, imports, audit logs, AI processing queue, and settings."
            color="#00FF66"
            delay={0.15}
          />
        </div>
      ),
    },

    /* ── STEP 4: Keyboard Shortcuts ───────────────────────────── */
    {
      id: "shortcuts",
      type: "shortcuts",
      title: "Keyboard Shortcuts",
      subtitle: "Navigate faster with hotkeys",
      content: (
        <div className="max-w-md mx-auto">
          <p className="text-[12px] mb-4 px-1" style={{ color: "var(--text-secondary)" }}>
            Power users can navigate the entire platform without touching the
            mouse. Here are the essential shortcuts.
          </p>
          <div
            className="rounded-xl overflow-hidden"
            style={{
              background: "rgba(15,21,36,0.5)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <div
              className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider"
              style={{
                color: "var(--text-tertiary)",
                borderBottom: "1px solid var(--border-subtle)",
              }}
            >
              Navigation
            </div>
            <ShortcutRow keys="Alt + 1" action="Mission Control" delay={0.05} />
            <ShortcutRow keys="Alt + 2" action="AI Copilot" delay={0.08} />
            <ShortcutRow keys="Alt + 3" action="Network Graph" delay={0.11} />
            <ShortcutRow keys="Alt + 4" action="Crime Map" delay={0.14} />
            <ShortcutRow keys="Alt + 5" action="Accused Profile" delay={0.17} />
            <ShortcutRow keys="Alt + 6" action="Investigation Timeline" delay={0.2} />
            <ShortcutRow keys="Alt + 7" action="Report Generator" delay={0.23} />
            <div
              className="px-4 py-3 text-[10px] font-bold uppercase tracking-wider"
              style={{
                color: "var(--text-tertiary)",
                borderBottom: "1px solid var(--border-subtle)",
                borderTop: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              Actions
            </div>
            <ShortcutRow keys="Ctrl + K" action="Command Palette (search anything)" delay={0.26} />
          </div>
        </div>
      ),
    },

    /* ── STEP 5: Complete ────────────────────────────────────── */
    {
      id: "complete",
      type: "complete",
      title: "You're All Set",
      subtitle: "Start investigating with confidence",
      content: (
        <div className="text-center space-y-6 py-4">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
            className="inline-flex items-center justify-center w-16 h-16 rounded-full"
            style={{
              background:
                "linear-gradient(135deg, rgba(52,211,153,0.15), rgba(34,211,238,0.1))",
              border: "1px solid rgba(52,211,153,0.2)",
            }}
          >
            <Zap className="w-7 h-7" style={{ color: "var(--success)" }} />
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25, duration: 0.5 }}
            className="space-y-3 max-w-md mx-auto"
          >
            <p className="text-[14px] leading-relaxed" style={{ color: "var(--sidebar-foreground)" }}>
              You now know your way around KSP Sentinel. Here's a suggested
              workflow to get started:
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="max-w-sm mx-auto space-y-3 text-left"
          >
            {[
              {
                num: "1",
                text: "Check Mission Control for today's overview and alerts",
                color: "var(--primary)",
              },
              {
                num: "2",
                text: "Ask AI Copilot about any case or pattern you're investigating",
                color: "var(--success)",
              },
              {
                num: "3",
                text: "Use Network Graph to map suspect connections",
                color: "var(--secondary)",
              },
              {
                num: "4",
                text: "Explore Crime Map for location-based analysis",
                color: "var(--warning)",
              },
            ].map((step, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.45 + i * 0.08, duration: 0.35 }}
                className="flex items-center gap-3 py-1.5"
              >
                <div
                  className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-[11px] font-bold"
                  style={{
                    background: step.color + "15",
                    color: step.color,
                    border: `1px solid ${step.color}25`,
                  }}
                >
                  {step.num}
                </div>
                <p className="text-[12px]" style={{ color: "var(--sidebar-foreground)" }}>
                  {step.text}
                </p>
              </motion.div>
            ))}
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="text-[11px] pt-2"
            style={{ color: "var(--text-tertiary)" }}
          >
            You can revisit this guide anytime from the sidebar.
          </motion.p>
        </div>
      ),
    },
  ];
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════ */

export default function WelcomeOnboarding() {
  const showOnboarding = useAppStore((s) => s.showOnboarding);
  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const setShowOnboarding = useAppStore((s) => s.setShowOnboarding);
  const steps = useSteps();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1); // 1 = forward, -1 = backward

  // Dismiss on client if onboarding was previously completed (avoids hydration mismatch)
  useEffect(() => {
    if (localStorage.getItem("ksp_onboarding_done")) {
      setShowOnboarding(false);
    }
  }, [setShowOnboarding]);

  const step = steps[currentStep];
  const isLast = currentStep === steps.length - 1;
  const isFirst = currentStep === 0;
  const progress = ((currentStep + 1) / steps.length) * 100;

  const goNext = useCallback(() => {
    if (isLast) {
      completeOnboarding();
    } else {
      setDirection(1);
      setCurrentStep((c) => c + 1);
    }
  }, [isLast, completeOnboarding]);

  const goPrev = useCallback(() => {
    if (!isFirst) {
      setDirection(-1);
      setCurrentStep((c) => c - 1);
    }
  }, [isFirst]);

  const skip = useCallback(() => {
    completeOnboarding();
  }, [completeOnboarding]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        goPrev();
      } else if (e.key === "Escape") {
        e.preventDefault();
        skip();
      }
    },
    [goNext, goPrev, skip]
  );

  if (!showOnboarding) return null;

  const slideVariants = {
    enter: (d: number) => ({ x: d > 0 ? 60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (d: number) => ({ x: d > 0 ? -60 : 60, opacity: 0 }),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{
        background: "rgba(0,0,0,0.75)",
        backdropFilter: "blur(8px)",
      }}
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      {/* Click outside to close */}
      <div className="absolute inset-0" onClick={skip} />

      {/* Main card */}
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-[640px] mx-4 rounded-2xl overflow-hidden"
        style={{
          background: "linear-gradient(180deg, rgba(10,14,24,0.98) 0%, rgba(7,10,18,0.99) 100%)",
          border: "1px solid var(--border-subtle)",
          boxShadow:
            "0 32px 64px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03), 0 0 120px -40px rgba(34,211,238,0.06)",
          maxHeight: "85vh",
        }}
      >
        {/* Top accent line */}
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent 5%, rgba(34,211,238,0.3) 30%, rgba(129,140,248,0.2) 70%, transparent 95%)",
          }}
        />

        {/* Header */}
        <div className="flex items-start justify-between px-7 pt-7 pb-0">
          <div className="flex-1 min-w-0">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-3">
              <div
                className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-md"
                style={{
                  background: "rgba(34,211,238,0.08)",
                  color: "var(--primary)",
                  border: "1px solid rgba(34,211,238,0.15)",
                }}
              >
                {currentStep + 1} / {steps.length}
              </div>
              {step.type === "welcome" && (
                <span
                  className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md"
                  style={{
                    background: "rgba(52,211,153,0.08)",
                    color: "var(--success)",
                    border: "1px solid rgba(52,211,153,0.12)",
                  }}
                >
                  Getting Started
                </span>
              )}
              {step.type === "features" && (
                <span
                  className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md"
                  style={{
                    background: "rgba(34,211,238,0.08)",
                    color: "var(--primary)",
                    border: "1px solid rgba(34,211,238,0.12)",
                  }}
                >
                  Features
                </span>
              )}
              {step.type === "shortcuts" && (
                <span
                  className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md"
                  style={{
                    background: "rgba(251,191,36,0.08)",
                    color: "var(--warning)",
                    border: "1px solid rgba(251,191,36,0.12)",
                  }}
                >
                  Pro Tips
                </span>
              )}
              {step.type === "complete" && (
                <span
                  className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-md"
                  style={{
                    background: "rgba(52,211,153,0.08)",
                    color: "var(--success)",
                    border: "1px solid rgba(52,211,153,0.12)",
                  }}
                >
                  Ready
                </span>
              )}
            </div>
            <h2
              className="text-[18px] font-bold tracking-tight"
              style={{ color: "var(--text-primary)" }}
            >
              {step.title}
            </h2>
            <p
              className="text-[12px] mt-1"
              style={{ color: "var(--text-tertiary)" }}
            >
              {step.subtitle}
            </p>
          </div>
          <button
            onClick={skip}
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 cursor-pointer transition-all duration-200 ml-4 mt-1"
            style={{ color: "var(--text-tertiary)" }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              e.currentTarget.style.color = "#c8d0e0";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "#5a657a";
            }}
            title="Skip guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="px-7 mt-5">
          <div
            className="h-px w-full rounded-full overflow-hidden"
            style={{ background: "var(--border-subtle)" }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                background:
                  "linear-gradient(90deg, #00FF66, #00cc52)",
                boxShadow: "0 0 8px rgba(0,255,102,0.3)",
              }}
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
            />
          </div>
        </div>

        {/* Content area */}
        <div className="px-7 py-6 overflow-y-auto" style={{ maxHeight: "calc(85vh - 220px)" }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={step.id}
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              {step.content}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between px-7 py-4"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(5,8,16,0.5)",
          }}
        >
          <div>
            {isFirst ? (
              <button
                onClick={skip}
                className="text-[12px] px-4 py-2 rounded-lg cursor-pointer transition-all duration-200"
                style={{ color: "var(--text-tertiary)" }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = "#c8d0e0";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = "#5a657a";
                }}
              >
                Skip guide
              </button>
            ) : (
              <button
                onClick={goPrev}
                className="flex items-center gap-1.5 text-[12px] px-4 py-2 rounded-lg cursor-pointer transition-all duration-200"
                style={{
                  color: "var(--text-secondary)",
                  background: "var(--border-subtle)",
                  border: "1px solid var(--border-subtle)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                  e.currentTarget.style.color = "#f1f5f9";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                  e.currentTarget.style.color = "#8b97b0";
                }}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Back
              </button>
            )}
          </div>

          {/* Dot indicators */}
          <div className="hidden sm:flex items-center gap-1.5">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => {
                  setDirection(i > currentStep ? 1 : -1);
                  setCurrentStep(i);
                }}
                className="cursor-pointer transition-all duration-300"
                style={{
                  width: i === currentStep ? 20 : 6,
                  height: 6,
                  borderRadius: 3,
                  background:
                    i === currentStep
                      ? "linear-gradient(90deg, #00FF66, #00cc52)"
                      : "rgba(255,255,255,0.1)",
                  boxShadow:
                    i === currentStep
                      ? "0 0 8px rgba(0,255,102,0.3)"
                      : "none",
                }}
              />
            ))}
          </div>

          <div>
            {isLast ? (
              <motion.button
                onClick={goNext}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 text-[13px] font-semibold px-6 py-2.5 rounded-xl cursor-pointer transition-all duration-200"
                style={{
                  background: "linear-gradient(135deg, #00FF66, #00cc52)",
                  color: "#05070A",
                  boxShadow: "0 0 20px rgba(0,255,102,0.2)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 0 30px rgba(0,255,102,0.35)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 0 20px rgba(0,255,102,0.2)";
                }}
              >
                Start Exploring
                <ArrowRight className="w-4 h-4" />
              </motion.button>
            ) : (
              <motion.button
                onClick={goNext}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="flex items-center gap-2 text-[12px] font-semibold px-5 py-2.5 rounded-lg cursor-pointer transition-all duration-200"
                style={{
                  background: "rgba(34,211,238,0.1)",
                  color: "var(--primary)",
                  border: "1px solid rgba(34,211,238,0.2)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "rgba(34,211,238,0.15)";
                  e.currentTarget.style.borderColor = "rgba(34,211,238,0.3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "rgba(34,211,238,0.1)";
                  e.currentTarget.style.borderColor = "rgba(34,211,238,0.2)";
                }}
              >
                Next
                <ChevronRight className="w-3.5 h-3.5" />
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}