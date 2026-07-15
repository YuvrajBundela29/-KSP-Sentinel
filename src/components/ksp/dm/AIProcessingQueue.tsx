"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  ScanLine,
  GitBranch,
  Network,
  BarChart3,
  Globe,
  Cpu,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Plus,
  Trash2,
  RotateCcw,
  ChevronRight,
  Loader2,
  Zap,
  Timer,
  Layers,
  Activity,
  Eye,
  Inbox,
  FileSearch,
  Sparkles,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { loadCrimeData } from "@/lib/data";
import { generateId } from "@/lib/export-utils";
import type { AIQueueItem, CrimeDataset } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import LoadingSpinner from "@/components/ksp/LoadingSpinner";

// ─── Pipeline Stages ────────────────────────────────────────────────
const PIPELINE_STAGES = [
  { key: "queued", label: "Queued", icon: Inbox, color: "var(--text-tertiary)" },
  { key: "ocr", label: "OCR", icon: ScanLine, color: "var(--primary)" },
  { key: "entity_extraction", label: "Entity Extraction", icon: FileSearch, color: "var(--secondary)" },
  { key: "relationship_detection", label: "Relationship Detection", icon: GitBranch, color: "#db2777" },
  { key: "risk_scoring", label: "Risk Scoring", icon: BarChart3, color: "var(--warning)" },
  { key: "network_update", label: "Network Update", icon: Network, color: "var(--primary)" },
  { key: "embedding", label: "Embedding", icon: Cpu, color: "var(--success)" },
  { key: "completed", label: "Completed", icon: CheckCircle2, color: "var(--success)" },
] as const;

type StageKey = AIQueueItem["stage"];
type HistoryStageKey = StageKey | "completed";

const STAGE_ORDER: StageKey[] = [
  "queued", "ocr", "entity_extraction", "relationship_detection",
  "risk_scoring", "network_update", "embedding", "completed",
];

function getStageIndex(stage: StageKey): number {
  return STAGE_ORDER.indexOf(stage);
}

function getStageProgress(stage: StageKey): number {
  const idx = getStageIndex(stage);
  if (stage === "failed") return 0;
  if (stage === "completed") return 100;
  return Math.round((idx / (STAGE_ORDER.length - 1)) * 100);
}

// ─── Stage History Entry ────────────────────────────────────────────
interface StageHistoryEntry {
  stage: HistoryStageKey;
  enteredAt: string;
  exitedAt: string | null;
}

// ─── Initial Mock Queue ─────────────────────────────────────────────
function generateInitialQueue(crimeData: CrimeDataset | null): Array<AIQueueItem & { stageHistory: StageHistoryEntry[] }> {
  const now = Date.now();
  const firs = crimeData?.firs ?? [];
  const getFirId = () => firs.length > 0
    ? firs[Math.floor(Math.random() * firs.length)].fir_id
    : `FIR-2024-KA-${String(Math.floor(Math.random() * 200)).padStart(4, "0")}`;

  const items: Array<AIQueueItem & { stageHistory: StageHistoryEntry[] }> = [];

  // 2 completed
  for (let i = 0; i < 2; i++) {
    const completedAt = new Date(now - Math.random() * 3600000).toISOString();
    const startedAt = new Date(now - 45000 - Math.random() * 60000).toISOString();
    const history: StageHistoryEntry[] = STAGE_ORDER.filter(s => s !== "completed").map((s, idx) => ({
      stage: s as HistoryStageKey,
      enteredAt: new Date(new Date(startedAt).getTime() + idx * 5000 + Math.random() * 3000).toISOString(),
      exitedAt: new Date(new Date(startedAt).getTime() + (idx + 1) * 5000 + Math.random() * 3000).toISOString() as string | null,
    }));
    history.push({ stage: "completed", enteredAt: completedAt, exitedAt: null });
    items.push({
      id: generateId("AIQ"),
      firId: getFirId(),
      stage: "completed",
      progress: 100,
      startedAt,
      completedAt,
      error: null,
      stageHistory: history,
    });
  }

  // 1 failed
  {
    const startedAt = new Date(now - 20000).toISOString();
    const history: StageHistoryEntry[] = [
      { stage: "queued", enteredAt: startedAt, exitedAt: new Date(now - 18000).toISOString() },
      { stage: "ocr", enteredAt: new Date(now - 18000).toISOString(), exitedAt: new Date(now - 3000).toISOString() },
      { stage: "failed", enteredAt: new Date(now - 3000).toISOString(), exitedAt: null },
    ];
    items.push({
      id: generateId("AIQ"),
      firId: getFirId(),
      stage: "failed",
      progress: 12,
      startedAt,
      completedAt: null,
      error: "OCR engine timeout: document too large (45MB). Retry with smaller chunks.",
      stageHistory: history,
    });
  }

  // Another failed
  {
    const startedAt = new Date(now - 35000).toISOString();
    const history: StageHistoryEntry[] = [
      { stage: "queued", enteredAt: startedAt, exitedAt: new Date(now - 33000).toISOString() },
      { stage: "ocr", enteredAt: new Date(now - 33000).toISOString(), exitedAt: new Date(now - 22000).toISOString() },
      { stage: "entity_extraction", enteredAt: new Date(now - 22000).toISOString(), exitedAt: new Date(now - 5000).toISOString() },
      { stage: "failed", enteredAt: new Date(now - 5000).toISOString(), exitedAt: null },
    ];
    items.push({
      id: generateId("AIQ"),
      firId: getFirId(),
      stage: "failed",
      progress: 28,
      startedAt,
      completedAt: null,
      error: "Entity extraction API rate limit exceeded. Queue backoff for 60s.",
      stageHistory: history,
    });
  }

  // 3 at various processing stages
  const processingStages: StageKey[] = ["ocr", "entity_extraction", "risk_scoring"];
  processingStages.forEach((stage) => {
    const startedAt = new Date(now - Math.random() * 30000).toISOString();
    const idx = getStageIndex(stage);
    const history: StageHistoryEntry[] = [];
    for (let i = 0; i <= idx; i++) {
      const entered = new Date(new Date(startedAt).getTime() + i * 5000).toISOString();
      const exited = i < idx ? new Date(new Date(entered).getTime() + 4500 + Math.random() * 1000).toISOString() : null;
      history.push({ stage: STAGE_ORDER[i], enteredAt: entered, exitedAt: exited });
    }
    items.push({
      id: generateId("AIQ"),
      firId: getFirId(),
      stage,
      progress: getStageProgress(stage),
      startedAt,
      completedAt: null,
      error: null,
      stageHistory: history,
    });
  });

  // 3-4 queued
  for (let i = 0; i < 4; i++) {
    const startedAt = new Date(now - Math.random() * 15000).toISOString();
    items.push({
      id: generateId("AIQ"),
      firId: getFirId(),
      stage: "queued",
      progress: 0,
      startedAt,
      completedAt: null,
      error: null,
      stageHistory: [{ stage: "queued", enteredAt: startedAt, exitedAt: null }],
    });
  }

  return items;
}

// ─── Animated Counter ───────────────────────────────────────────────
function useAnimatedCounter(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else { setCount(Math.floor(start)); }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

// ─── Pipeline Node ──────────────────────────────────────────────────
function PipelineNode({
  stage,
  isActive,
  isCompleted,
  isFailed,
  index,
}: {
  stage: (typeof PIPELINE_STAGES)[number];
  isActive: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  index: number;
}) {
  const Icon = stage.icon;
  let nodeColor: string = stage.color;
  if (isFailed) nodeColor = "#f87171";
  else if (isCompleted) nodeColor = "#34d399";
  else if (!isActive) nodeColor = "#3d4659";

  return (
    <motion.div
      className="flex flex-col items-center gap-2"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08 }}
    >
      <motion.div
        className={`relative flex h-14 w-14 items-center justify-center rounded-2xl border-2 transition-colors ${
          isActive ? "border-transparent" : isCompleted ? "border-[rgba(52,211,153,0.15)]" : isFailed ? "border-[rgba(248,113,113,0.15)]" : "border-white/10"
        }`}
        style={{ backgroundColor: `${nodeColor}15` }}
        animate={isActive ? { boxShadow: [`0 0 0px ${nodeColor}40`, `0 0 20px ${nodeColor}40`, `0 0 0px ${nodeColor}40`] } : {}}
        transition={isActive ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
      >
        <Icon className="h-6 w-6" style={{ color: nodeColor }} />
        {isActive && (
          <motion.div
            className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-[#34d399]"
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
        {isCompleted && <CheckCircle2 className="absolute -bottom-1 -right-1 h-4 w-4 text-[#34d399]" />}
        {isFailed && <XCircle className="absolute -bottom-1 -right-1 h-4 w-4 text-[#f87171]" />}
      </motion.div>
      <span className="text-[10px] text-[#8b97b0] font-medium text-center max-w-[80px] leading-tight">{stage.label}</span>
    </motion.div>
  );
}

// ─── Pipeline Connector ─────────────────────────────────────────────
function PipelineConnector({
  isCompleted,
  isActive,
  index,
}: {
  isCompleted: boolean;
  isActive: boolean;
  index: number;
}) {
  return (
    <div className="flex items-center self-start mt-7 w-8 lg:w-12 h-0.5 bg-white/10 relative overflow-hidden">
      {(isCompleted || isActive) && (
        <motion.div
          className="absolute top-0 left-0 h-full w-3 rounded-full"
          style={{ backgroundColor: isCompleted ? "#34d399" : "#22d3ee" }}
          initial={{ left: "-12px" }}
          animate={{ left: "calc(100% + 0px)" }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear", delay: index * 0.3 }}
        />
      )}
      {isCompleted && <div className="absolute inset-0 bg-[#34d399]/50" />}
    </div>
  );
}

// ─── Stage Badge ────────────────────────────────────────────────────
function StageBadge({ stage }: { stage: StageKey }) {
  const stageConfig: Record<string, { bg: string }> = {
    queued: { bg: "bg-[#5a657a]/15 text-[#8b97b0] border-[rgba(255,255,255,0.08)]" },
    ocr: { bg: "bg-[#22d3ee]/15 text-[#22d3ee] border-[rgba(34,211,238,0.15)]" },
    entity_extraction: { bg: "bg-[#818cf8]/15 text-[#818cf8] border-[rgba(129,140,248,0.15)]" },
    relationship_detection: { bg: "bg-[#f87171]/15 text-[#f87171] border-pink-500/30" },
    risk_scoring: { bg: "bg-[#fbbf24]/15 text-[#fbbf24] border-[rgba(251,191,36,0.15)]" },
    network_update: { bg: "bg-[#22d3ee]/15 text-[#22d3ee] border-[rgba(34,211,238,0.15)]" },
    embedding: { bg: "bg-[#34d399]/15 text-[#34d399] border-[rgba(52,211,153,0.15)]" },
    completed: { bg: "bg-[#34d399]/15 text-[#34d399] border-[rgba(52,211,153,0.15)]" },
    failed: { bg: "bg-[#f87171]/15 text-[#f87171] border-[rgba(248,113,113,0.15)]" },
  };
  const c = stageConfig[stage] || stageConfig.queued;
  const label = PIPELINE_STAGES.find(s => s.key === stage)?.label ?? stage;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${c.bg}`}>
      {label}
    </span>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function AIProcessingQueue() {
  const { crimeData, setCrimeData, addAIQueueItem, updateAIQueueItem, addNotification } = useAppStore();
  const [localQueue, setLocalQueue] = useState<Array<AIQueueItem & { stageHistory: StageHistoryEntry[] }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItem, setSelectedItem] = useState<(AIQueueItem & { stageHistory: StageHistoryEntry[] }) | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Initialize
  useEffect(() => {
    async function init() {
      let data = crimeData;
      if (!data) {
        try { data = await loadCrimeData(); setCrimeData(data); } catch (e) { console.error(e); }
      }
      const queue = generateInitialQueue(data);
      // Sync to store
      queue.forEach(item => {
        const { stageHistory: _, ...storeItem } = item;
        addAIQueueItem(storeItem);
      });
      setLocalQueue(queue);
      setLoading(false);
    }
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-progress simulation: every 3 seconds, advance a queued item
  useEffect(() => {
    if (loading) return;
    const interval = setInterval(() => {
      setLocalQueue(prev => {
        const copy = [...prev];
        // Find items that are not completed/failed
        const activeItems = copy.filter(q => q.stage !== "completed" && q.stage !== "failed");
        if (activeItems.length === 0) return prev;

        // Prefer the earliest staged item
        activeItems.sort((a, b) => getStageIndex(a.stage) - getStageIndex(b.stage));
        const target = activeItems[0];
        const idx = copy.findIndex(q => q.id === target.id);
        if (idx === -1) return prev;

        const currentIdx = getStageIndex(target.stage);
        // 5% chance of failure at processing stages
        const willFail = currentIdx > 0 && currentIdx < STAGE_ORDER.length - 1 && Math.random() < 0.05;

        const now = new Date().toISOString();
        const updatedHistory = [...target.stageHistory.map(h => h.stage === target.stage ? { ...h, exitedAt: now } : h)];

        if (willFail) {
          const failedItem: typeof copy[0] = {
            ...copy[idx],
            stage: "failed",
            progress: getStageProgress(target.stage),
            error: `Processing error at ${PIPELINE_STAGES[currentIdx]?.label ?? "unknown"} stage: Unexpected internal failure.`,
            stageHistory: [...updatedHistory, { stage: "failed", enteredAt: now, exitedAt: null }],
          };
          // Schedule side effects outside of render via microtask
          queueMicrotask(() => updateAIQueueItem(target.id, { stage: "failed", error: failedItem.error }));
          copy[idx] = failedItem;
        } else {
          const nextStage = STAGE_ORDER[currentIdx + 1];
          const isCompleted = nextStage === "completed";
          const completedAt = isCompleted ? now : null;
          const newItem: typeof copy[0] = {
            ...copy[idx],
            stage: nextStage,
            progress: getStageProgress(nextStage),
            completedAt,
            stageHistory: [...updatedHistory, { stage: nextStage, enteredAt: now, exitedAt: null }],
          };
          // Schedule side effects outside of render via microtask
          queueMicrotask(() => updateAIQueueItem(target.id, { stage: nextStage, progress: newItem.progress, completedAt }));
          copy[idx] = newItem;

          if (isCompleted) {
            queueMicrotask(() => addNotification({
              title: "AI Processing Complete",
              message: `${target.firId} has been fully processed through the AI pipeline.`,
              type: "success",
              read: false,
            }));
          }
        }
        return copy;
      });
    }, 3000);
    return () => clearInterval(interval);
  }, [loading, updateAIQueueItem, addNotification]);

  // Stats
  const stats = useMemo(() => {
    const total = localQueue.length;
    const processing = localQueue.filter(q => q.stage !== "completed" && q.stage !== "failed" && q.stage !== "queued").length;
    const completedToday = localQueue.filter(q => q.stage === "completed").length;
    const failed = localQueue.filter(q => q.stage === "failed").length;
    // Avg processing time for completed items
    const completed = localQueue.filter(q => q.stage === "completed" && q.startedAt && q.completedAt);
    const avgTime = completed.length > 0
      ? Math.round(completed.reduce((sum, q) => sum + (new Date(q.completedAt!).getTime() - new Date(q.startedAt).getTime()), 0) / completed.length / 1000)
      : 0;
    return { total, processing, completedToday, failed, avgTime };
  }, [localQueue]);

  const animTotal = useAnimatedCounter(stats.total);
  const animProcessing = useAnimatedCounter(stats.processing);
  const animCompleted = useAnimatedCounter(stats.completedToday);
  const animFailed = useAnimatedCounter(stats.failed);

  // Pipeline state: highest active stage across all items
  const highestActiveStage = useMemo(() => {
    const active = localQueue.filter(q => q.stage !== "completed" && q.stage !== "failed" && q.stage !== "queued");
    if (active.length === 0) return null;
    return active.reduce((best, q) => getStageIndex(q.stage) > getStageIndex(best.stage) ? q : best, active[0]).stage;
  }, [localQueue]);

  // Add test item
  const addTestItem = useCallback(() => {
    const firs = crimeData?.firs;
    const firId = firs && firs.length > 0
      ? firs[Math.floor(Math.random() * firs.length)].fir_id
      : `FIR-2024-KA-${String(Math.floor(Math.random() * 200)).padStart(4, "0")}`;
    const now = new Date().toISOString();
    const newItem: AIQueueItem & { stageHistory: StageHistoryEntry[] } = {
      id: generateId("AIQ"),
      firId,
      stage: "queued",
      progress: 0,
      startedAt: now,
      completedAt: null,
      error: null,
      stageHistory: [{ stage: "queued", enteredAt: now, exitedAt: null }],
    };
    addAIQueueItem(newItem);
    setLocalQueue(prev => [...prev, newItem]);
  }, [crimeData, addAIQueueItem]);

  // Clear completed
  const clearCompleted = useCallback(() => {
    setLocalQueue(prev => prev.filter(q => q.stage !== "completed"));
  }, []);

  // Retry failed
  const retryFailed = useCallback(() => {
    setLocalQueue(prev => prev.map(q => {
      if (q.stage === "failed") {
        const now = new Date().toISOString();
        const updated: typeof q = {
          ...q,
          stage: "queued",
          progress: 0,
          error: null,
          completedAt: null,
          stageHistory: [{ stage: "queued", enteredAt: now, exitedAt: null }],
        };
        updateAIQueueItem(q.id, { stage: "queued", progress: 0, error: null, completedAt: null });
        return updated;
      }
      return q;
    }));
  }, [updateAIQueueItem]);

  // Duration calculation
  function getDuration(item: typeof localQueue[0]): string {
    const start = new Date(item.startedAt).getTime();
    const end = item.completedAt ? new Date(item.completedAt).getTime() : Date.now();
    const secs = Math.round((end - start) / 1000);
    if (secs < 60) return `${secs}s`;
    const mins = Math.floor(secs / 60);
    const remainSecs = secs % 60;
    return `${mins}m ${remainSecs}s`;
  }

  const statCards = [
    { label: "Total in Queue", value: animTotal, icon: <Layers className="h-5 w-5" />, color: "var(--primary)", delay: 0 },
    { label: "Processing Now", value: animProcessing, icon: <Loader2 className="h-5 w-5" />, color: "var(--warning)", delay: 1 },
    { label: "Completed Today", value: animCompleted, icon: <CheckCircle2 className="h-5 w-5" />, color: "var(--success)", delay: 2 },
    { label: "Failed", value: animFailed, icon: <XCircle className="h-5 w-5" />, color: "var(--critical)", delay: 3 },
    { label: "Avg Process Time", value: stats.avgTime, suffix: "s", icon: <Timer className="h-5 w-5" />, color: "var(--secondary)", delay: 4, isRaw: true },
  ];

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
        <div>
          <h1 className="text-[#f1f5f9] text-2xl font-bold tracking-tight">AI Processing Queue</h1>
          <p className="text-[#5a657a] text-sm mt-1">8-stage intelligence pipeline with real-time progress tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={addTestItem} className="gap-2 bg-[#34d399] hover:bg-[#2bc48a] text-white border-0 rounded-xl px-5">
            <Plus className="h-4 w-4" /> Add Test Item
          </Button>
          <Button variant="outline" onClick={clearCompleted} className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-[#8b97b0] hover:text-[#f1f5f9] rounded-xl px-4">
            <Trash2 className="h-4 w-4" /> Clear Completed
          </Button>
          <Button variant="outline" onClick={retryFailed} className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-[#8b97b0] hover:text-[#f1f5f9] rounded-xl px-4">
            <RotateCcw className="h-4 w-4" /> Retry Failed
          </Button>
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {statCards.map((sc) => (
          <motion.div
            key={sc.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: sc.delay * 0.08 }}
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300 hover:scale-[1.02]"
            style={{ borderLeft: `3px solid ${sc.color}` }}
          >
            <div className="relative flex items-start justify-between p-4">
              <div>
                <span className="text-[#5a657a] text-[10px] font-medium uppercase tracking-wider">{sc.label}</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-[#f1f5f9] text-2xl font-bold tabular-nums">
                    {sc.isRaw ? sc.value : sc.value}
                  </span>
                  {sc.suffix && <span className="text-[#5a657a] text-sm">{sc.suffix}</span>}
                </div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ backgroundColor: `${sc.color}15`, color: sc.color }}>
                {sc.icon}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Pipeline Visualization */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6"
      >
        <div className="flex items-center gap-2 mb-6">
          <Brain className="h-5 w-5 text-[#22d3ee]" />
          <h2 className="text-[#f1f5f9] text-sm font-semibold uppercase tracking-wider">Processing Pipeline</h2>
          {highestActiveStage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="ml-2 flex items-center gap-1.5 rounded-full bg-[#22d3ee]/15 border border-[rgba(34,211,238,0.15)] px-3 py-1"
            >
              <motion.div className="h-1.5 w-1.5 rounded-full bg-cyan-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
              <span className="text-[#22d3ee] text-xs font-medium">
                Active: {PIPELINE_STAGES.find(s => s.key === highestActiveStage)?.label}
              </span>
            </motion.div>
          )}
        </div>

        <div className="flex items-center justify-center gap-1 overflow-x-auto pb-2">
          {PIPELINE_STAGES.map((stage, idx) => {
            const stageIdx = getStageIndex(stage.key);
            const isActive = highestActiveStage === stage.key;
            const isCompleted = highestActiveStage ? stageIdx < getStageIndex(highestActiveStage) : false;
            const isFailed = localQueue.some(q => q.stage === "failed" && q.stageHistory[q.stageHistory.length - 2]?.stage === stage.key);

            return (
              <div key={stage.key} className="flex items-center">
                <PipelineNode stage={stage} isActive={isActive} isCompleted={isCompleted} isFailed={isFailed} index={idx} />
                {idx < PIPELINE_STAGES.length - 1 && (
                  <PipelineConnector isCompleted={isCompleted} isActive={isActive} index={idx} />
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Queue Table */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#5a657a]" />
            <span className="text-[#f1f5f9] text-sm font-semibold">Queue Items</span>
            <Badge variant="outline" className="border-white/10 text-[#5a657a] text-xs ml-1">{localQueue.length}</Badge>
          </div>
        </div>

        {localQueue.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Inbox className="h-12 w-12 text-[#3d4659]" />
            <p className="text-[#5a657a] text-sm">No items in the queue</p>
            <Button onClick={addTestItem} className="gap-2 bg-[#34d399] hover:bg-[#2bc48a] text-white rounded-xl">
              <Plus className="h-4 w-4" /> Add Test Item
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-[#5a657a] text-xs font-semibold uppercase tracking-wider">FIR ID</TableHead>
                <TableHead className="text-[#5a657a] text-xs font-semibold uppercase tracking-wider">Current Stage</TableHead>
                <TableHead className="text-[#5a657a] text-xs font-semibold uppercase tracking-wider">Progress</TableHead>
                <TableHead className="text-[#5a657a] text-xs font-semibold uppercase tracking-wider">Started</TableHead>
                <TableHead className="text-[#5a657a] text-xs font-semibold uppercase tracking-wider">Duration</TableHead>
                <TableHead className="text-[#5a657a] text-xs font-semibold uppercase tracking-wider">Status</TableHead>
                <TableHead className="text-[#5a657a] text-xs font-semibold uppercase tracking-wider">Error</TableHead>
                <TableHead className="text-[#5a657a] text-xs font-semibold uppercase tracking-wider">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <AnimatePresence mode="popLayout">
                {localQueue.map((item) => (
                  <motion.tr
                    key={item.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors"
                  >
                    <TableCell className="text-[#f1f5f9] text-xs font-mono font-medium py-2.5">
                      {item.firId}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <StageBadge stage={item.stage} />
                    </TableCell>
                    <TableCell className="py-2.5 min-w-[120px]">
                      <div className="flex items-center gap-2">
                        <Progress
                          value={item.progress}
                          className={`h-2 w-20 bg-white/5 ${
                            item.stage === "failed" ? "[&>div]:bg-[#f87171]" :
                            item.stage === "completed" ? "[&>div]:bg-[#34d399]" : "[&>div]:bg-[#22d3ee]"
                          } [&>div]:rounded-full`}
                        />
                        <span className="text-[#8b97b0] text-xs tabular-nums w-8">{item.progress}%</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-[#8b97b0] text-xs py-2.5">
                      {new Date(item.startedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                    </TableCell>
                    <TableCell className="text-[#8b97b0] text-xs tabular-nums py-2.5">
                      {getDuration(item)}
                    </TableCell>
                    <TableCell className="py-2.5">
                      {item.stage === "completed" && (
                        <span className="inline-flex items-center gap-1 text-[#34d399] text-xs font-medium">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Done
                        </span>
                      )}
                      {item.stage === "failed" && (
                        <span className="inline-flex items-center gap-1 text-[#f87171] text-xs font-medium">
                          <XCircle className="h-3.5 w-3.5" /> Failed
                        </span>
                      )}
                      {(item.stage !== "completed" && item.stage !== "failed") && (
                        <span className="inline-flex items-center gap-1 text-[#22d3ee] text-xs font-medium">
                          <motion.div className="h-2 w-2 rounded-full bg-cyan-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }} />
                          Active
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs py-2.5 max-w-[200px]">
                      {item.error ? (
                        <span className="text-[#f87171] truncate block" title={item.error}>{item.error}</span>
                      ) : (
                        <span className="text-[#3d4659]">—</span>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Button variant="ghost" size="sm" className="text-[#5a657a] hover:text-[#f1f5f9] h-8 gap-1 text-xs"
                        onClick={() => { setSelectedItem(item); setShowDetail(true); }}>
                        <Eye className="h-3.5 w-3.5" /> Details
                      </Button>
                    </TableCell>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </TableBody>
          </Table>
        )}
      </motion.div>

      {/* Detail Dialog */}
      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="bg-[rgba(15,21,36,0.95)] border-[rgba(255,255,255,0.06)] max-w-lg max-h-[85vh] overflow-hidden">
          {selectedItem && (
            <>
              <DialogHeader>
                <DialogTitle className="text-[#f1f5f9] flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-[#22d3ee]" />
                  {selectedItem.firId}
                </DialogTitle>
                <DialogDescription className="text-[#5a657a]">
                  Stage history and processing details
                </DialogDescription>
              </DialogHeader>
              <ScrollArea className="max-h-[60vh]">
                <div className="space-y-4 pr-4">
                  {/* Summary */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <span className="text-[#5a657a] text-xs block mb-1">Current Stage</span>
                      <StageBadge stage={selectedItem.stage} />
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <span className="text-[#5a657a] text-xs block mb-1">Duration</span>
                      <span className="text-[#f1f5f9] text-sm font-medium">{getDuration(selectedItem)}</span>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <span className="text-[#5a657a] text-xs block mb-1">Progress</span>
                      <span className="text-[#f1f5f9] text-sm font-medium tabular-nums">{selectedItem.progress}%</span>
                    </div>
                    <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                      <span className="text-[#5a657a] text-xs block mb-1">Started</span>
                      <span className="text-[#f1f5f9] text-sm font-medium">
                        {new Date(selectedItem.startedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                      </span>
                    </div>
                  </div>

                  {/* Error */}
                  {selectedItem.error && (
                    <div className="rounded-xl border border-red-500/20 bg-[#f87171]/5 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <XCircle className="h-4 w-4 text-[#f87171]" />
                        <span className="text-[#f87171] text-sm font-semibold">Error</span>
                      </div>
                      <p className="text-[#8b97b0] text-xs">{selectedItem.error}</p>
                    </div>
                  )}

                  {/* Stage History Timeline */}
                  <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                    <h3 className="text-[#f1f5f9] text-sm font-semibold mb-4">Stage History</h3>
                    <div className="space-y-0">
                      {selectedItem.stageHistory.map((entry, idx) => {
                        const stageInfo = PIPELINE_STAGES.find(s => s.key === entry.stage);
                        const StageIcon = stageInfo?.icon ?? Clock;
                        const isLast = idx === selectedItem.stageHistory.length - 1;
                        const isCurrentStage = entry.stage === selectedItem.stage;
                        const isCompletedStage = !!entry.exitedAt;

                        let dotColor = "#3d4659";
                        if (isCompletedStage) dotColor = "#34d399";
                        if (isCurrentStage && !isCompletedStage) {
                          dotColor = selectedItem.stage === "failed" ? "#f87171" : "#22d3ee";
                        }

                        return (
                          <motion.div
                            key={`${entry.stage}-${idx}`}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.08 }}
                            className="flex items-start gap-3"
                          >
                            <div className="relative mt-1">
                              <div className="flex h-7 w-7 items-center justify-center rounded-full border-2" style={{ borderColor: `${dotColor}40`, backgroundColor: `${dotColor}15` }}>
                                <StageIcon className="h-3.5 w-3.5" style={{ color: dotColor }} />
                              </div>
                              {!isLast && (
                                <div className="absolute left-1/2 top-7 h-full w-px bg-white/10 -translate-x-1/2" />
                              )}
                            </div>
                            <div className="flex-1 pb-6 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[#f1f5f9] text-sm font-medium">
                                  {stageInfo?.label ?? entry.stage}
                                </span>
                                {isCurrentStage && !isCompletedStage && (
                                  <motion.div className="h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }}
                                    animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}
                                  />
                                )}
                              </div>
                              <div className="text-[#3d4659] text-xs mt-0.5">
                                Entered: {new Date(entry.enteredAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}
                                {entry.exitedAt && (
                                  <> &middot; Exited: {new Date(entry.exitedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })}</>
                                )}
                              </div>
                              {isCompletedStage && (
                                <div className="text-[#5a657a] text-[10px] mt-0.5">
                                  Duration: {Math.round((new Date(entry.exitedAt!).getTime() - new Date(entry.enteredAt).getTime()) / 1000)}s
                                </div>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}