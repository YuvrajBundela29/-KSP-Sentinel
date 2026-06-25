"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  SlidersHorizontal,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  FileDown,
  FileSpreadsheet,
  FileJson,
  Printer,
  Brain,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  Copy,
  BarChart3,
  Network,
  Clock,
  CheckSquare,
  Square,
  X,
  Sparkles,
  Filter,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Columns3,
  Send,
  Zap,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { loadCrimeData } from "@/lib/data";
import type { FIR } from "@/lib/types";
import {
  exportToCSV,
  exportToJSON,
  exportToExcel,
  exportToPrint,
  generateId,
} from "@/lib/export-utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// ─── Types ─────────────────────────────────────────────────────────
interface AIExtraction {
  crime_type: string;
  victim: string;
  location: string;
  time: string;
  ipc_sections: string;
  keywords: string[];
  timeline: { event: string; date: string }[];
  confidence: number;
}

type SortField =
  | "fir_id"
  | "date"
  | "crime_type"
  | "district"
  | "severity"
  | "investigation_status";
type SortDir = "asc" | "desc";

interface ColumnDef {
  key: string;
  label: string;
  visible: boolean;
  sortable: boolean;
}

// ─── Mock AI Extraction ────────────────────────────────────────────
function simulateAIExtraction(text: string): AIExtraction | null {
  if (!text.trim()) return null;

  const lower = text.toLowerCase();

  // Detect crime type
  let crime_type = "Unknown Offense";
  const crimeKeywords: Record<string, string[]> = {
    "Chain Snatching": ["chain snatching", "snatched chain", "gold chain", "mangalsutra"],
    "Theft": ["theft", "stolen", "burglary", "robbed", "looted", "pickpocket"],
    "Murder": ["murder", "killed", "homicide", "dead body", "assassinated"],
    "Assault": ["assault", "beaten", "attacked", "grievous hurt", "violence"],
    "Rape": ["rape", "sexual assault", "molestation", "harassment"],
    "Cyber Crime": ["cyber", "online fraud", "phishing", "hacking", "digital"],
    "Vehicle Theft": ["vehicle theft", "car stolen", "bike stolen", "two-wheeler stolen"],
    "Dacoity": ["dacoity", "armed robbery", "gang robbery"],
    "Kidnapping": ["kidnapping", "abduction", "missing person", "abducted"],
    "Fraud": ["fraud", "cheating", "scam", "counterfeit", "forgery"],
  };

  for (const [type, keywords] of Object.entries(crimeKeywords)) {
    if (keywords.some((kw) => lower.includes(kw))) {
      crime_type = type;
      break;
    }
  }

  // Extract location
  let location = "Not specified";
  const locationPatterns = [
    /(?:near|at|around|in|from)\s+([A-Z][A-Za-z\s]+?(?:\s+(?:Bus Stand|Station|Road|Street|Market|Temple|College|Hospital|Area|Circle|Junction|Layout|Colony|Nagar|Pete|Gate)))/i,
    /(?:near|at|around|in)\s+([A-Z][A-Za-z\s]{3,30})/i,
  ];
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match) {
      location = match[1].trim();
      break;
    }
  }

  // Extract time
  let time = "Not specified";
  const timeMatch = text.match(
    /(?:around|at|by)\s+(\d{1,2}(?::\d{2})?\s*(?:AM|PM|am|pm|a\.m\.|p\.m\.))/i
  );
  if (timeMatch) {
    time = timeMatch[1].toUpperCase();
  }

  // Extract victim
  let victim = "Not specified";
  if (lower.includes("woman")) victim = "Woman (unidentified)";
  else if (lower.includes("man")) victim = "Man (unidentified)";
  const nameMatch = text.match(/(?:Ms\.|Mrs\.|Mr\.|Smt\.|Sri\.?)\s+([A-Z][A-Za-z\s]+)/);
  if (nameMatch) victim = nameMatch[1].trim();

  // Extract keywords
  const keywords: string[] = [];
  const kwList = [
    "chain snatching", "bus stand", "evening", "night", "morning", "crowded",
    "lonely", "weapon", "knife", "gun", "vehicle", "mobile", "gold", "cash",
    "bike", "car", "snatch", "flee", "arrested", "suspect", "accused", "cctv",
  ];
  for (const kw of kwList) {
    if (lower.includes(kw)) keywords.push(kw);
  }

  // IPC sections
  let ipc_sections = "To be determined";
  if (crime_type === "Chain Snatching") ipc_sections = "379, 354B";
  else if (crime_type === "Murder") ipc_sections = "302, 34";
  else if (crime_type === "Theft") ipc_sections = "379, 380";
  else if (crime_type === "Robbery") ipc_sections = "392, 397";
  else if (crime_type === "Assault") ipc_sections = "323, 324, 354";
  else if (crime_type === "Rape") ipc_sections = "376, 376(2)(n)";
  else if (crime_type === "Cyber Crime") ipc_sections = "66C, 66D, 420";
  else if (crime_type === "Vehicle Theft") ipc_sections = "379, 279";
  else if (crime_type === "Dacoity") ipc_sections = "395, 397";
  else if (crime_type === "Kidnapping") ipc_sections = "363, 366";
  else if (crime_type === "Fraud") ipc_sections = "420, 463, 471";

  return {
    crime_type,
    victim,
    location,
    time,
    ipc_sections,
    keywords,
    timeline: [{ event: `${crime_type} incident reported`, date: "Today" }],
    confidence: Math.floor(Math.random() * 15) + 78, // 78-92%
  };
}

// ─── Severity Badge ────────────────────────────────────────────────
function SeverityBadge({ severity }: { severity: string }) {
  const map: Record<string, string> = {
    critical: "bg-red-500/20 text-red-400 border-red-500/30",
    high: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    medium: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    low: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
        map[severity] ?? "bg-white/10 text-white/70 border-white/20"
      }`}
    >
      {severity}
    </span>
  );
}

// ─── Status Badge ──────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    "Under Investigation": "bg-blue-500/20 text-blue-400 border-blue-500/30",
    "Closed": "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    "Open": "bg-amber-500/20 text-amber-400 border-amber-500/30",
    "Chargesheeted": "bg-violet-500/20 text-violet-400 border-violet-500/30",
    "Pending": "bg-orange-500/20 text-orange-400 border-orange-500/30",
    "Transferred": "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
        map[status] ?? "bg-white/10 text-white/70 border-white/20"
      }`}
    >
      {status}
    </span>
  );
}

// ─── AI Score Cell ─────────────────────────────────────────────────
function AIScoreCell({ score }: { score: number }) {
  const color =
    score >= 80
      ? "text-emerald-400"
      : score >= 60
      ? "text-amber-400"
      : "text-red-400";
  return (
    <div className="flex items-center gap-2">
      <div className="w-12">
        <Progress
          value={score}
          className={`h-1.5 bg-white/10 [&>div]:rounded-full ${
            score >= 80
              ? "[&>div]:bg-emerald-500"
              : score >= 60
              ? "[&>div]:bg-amber-500"
              : "[&>div]:bg-red-500"
          }`}
        />
      </div>
      <span className={`text-xs font-medium tabular-nums ${color}`}>{score}%</span>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────
export default function FIRManagement() {
  const { crimeData, setCrimeData, addAuditLog, addNotification, setView } =
    useAppStore();

  // ── Loading ──
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function init() {
      if (!crimeData) {
        try {
          const data = await loadCrimeData();
          setCrimeData(data);
        } catch (err) {
          console.error("Failed to load crime data:", err);
        }
      }
      setLoading(false);
    }
    init();
  }, [crimeData, setCrimeData]);

  // ── AI Extraction State ──
  const [aiText, setAiText] = useState("");
  const [extraction, setExtraction] = useState<AIExtraction | null>(null);
  const [extracting, setExtracting] = useState(false);

  // ── Create FIR Dialog ──
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFirForm, setNewFirForm] = useState({
    crime_type: "",
    district: "",
    description: "",
  });

  // ── Table State ──
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Filters
  const [filterCrimeType, setFilterCrimeType] = useState<string>("all");
  const [filterDistrict, setFilterDistrict] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selection
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());

  // Column visibility
  const [columns, setColumns] = useState<ColumnDef[]>([
    { key: "fir_id", label: "FIR Number", visible: true, sortable: true },
    { key: "crime_type", label: "Crime Type", visible: true, sortable: true },
    { key: "status", label: "Status", visible: true, sortable: true },
    { key: "district", label: "District", visible: true, sortable: true },
    { key: "officer", label: "Officer", visible: true, sortable: false },
    { key: "severity", label: "Priority", visible: true, sortable: true },
    { key: "date", label: "Created Date", visible: true, sortable: true },
    { key: "ai_score", label: "AI Score", visible: true, sortable: false },
  ]);

  // ── Derived Data ──
  const firs = crimeData?.firs ?? [];

  const uniqueCrimeTypes = useMemo(
    () => [...new Set(firs.map((f) => f.crime_type))].sort(),
    [firs]
  );

  const uniqueDistricts = useMemo(
    () => [...new Set(firs.map((f) => f.district))].sort(),
    [firs]
  );

  const uniqueStatuses = useMemo(
    () => [...new Set(firs.map((f) => f.investigation_status))].sort(),
    [firs]
  );

  // Debounced search
  useEffect(() => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1);
    }, 300);
    return () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    };
  }, [searchQuery]);

  // ── Filtered + Sorted + Paginated ──
  const filteredFirs = useMemo(() => {
    let result = [...firs];

    // Search
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (f) =>
          f.fir_id.toLowerCase().includes(q) ||
          f.crime_type.toLowerCase().includes(q) ||
          f.district.toLowerCase().includes(q) ||
          f.location.place.toLowerCase().includes(q) ||
          f.police_station.toLowerCase().includes(q) ||
          f.modus_operandi.toLowerCase().includes(q) ||
          f.victim.name.toLowerCase().includes(q) ||
          f.accused.some((a) => a.toLowerCase().includes(q)) ||
          f.ipc_section.toLowerCase().includes(q)
      );
    }

    // Filters
    if (filterCrimeType !== "all") {
      result = result.filter((f) => f.crime_type === filterCrimeType);
    }
    if (filterDistrict !== "all") {
      result = result.filter((f) => f.district === filterDistrict);
    }
    if (filterSeverity !== "all") {
      result = result.filter((f) => f.severity === filterSeverity);
    }
    if (filterStatus !== "all") {
      result = result.filter((f) => f.investigation_status === filterStatus);
    }
    if (filterDateFrom) {
      result = result.filter((f) => f.date >= filterDateFrom);
    }
    if (filterDateTo) {
      result = result.filter((f) => f.date <= filterDateTo);
    }

    // Sort
    result.sort((a, b) => {
      let aVal: string | number = "";
      let bVal: string | number = "";
      switch (sortField) {
        case "fir_id":
          aVal = a.fir_id;
          bVal = b.fir_id;
          break;
        case "date":
          aVal = a.date;
          bVal = b.date;
          break;
        case "crime_type":
          aVal = a.crime_type;
          bVal = b.crime_type;
          break;
        case "district":
          aVal = a.district;
          bVal = b.district;
          break;
        case "severity": {
          const sevMap: Record<string, number> = {
            critical: 0,
            high: 1,
            medium: 2,
            low: 3,
          };
          aVal = sevMap[a.severity] ?? 99;
          bVal = sevMap[b.severity] ?? 99;
          break;
        }
        case "investigation_status":
          aVal = a.investigation_status;
          bVal = b.investigation_status;
          break;
      }
      if (aVal < bVal) return sortDir === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [
    firs,
    debouncedSearch,
    filterCrimeType,
    filterDistrict,
    filterSeverity,
    filterStatus,
    filterDateFrom,
    filterDateTo,
    sortField,
    sortDir,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredFirs.length / pageSize));
  const paginatedFirs = useMemo(
    () => filteredFirs.slice((page - 1) * pageSize, page * pageSize),
    [filteredFirs, page, pageSize]
  );

  // Generate a mock AI score for each FIR based on its id
  const getAIScore = useCallback((fir: FIR): number => {
    const hash = fir.fir_id.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    return 60 + (hash % 35); // 60-94
  }, []);

  // ── Handlers ──
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("asc");
      }
    },
    [sortField]
  );

  const handleSelectAll = useCallback(() => {
    if (selectedRows.size === paginatedFirs.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(paginatedFirs.map((f) => f.fir_id)));
    }
  }, [selectedRows, paginatedFirs]);

  const handleSelectRow = useCallback((firId: string) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(firId)) next.delete(firId);
      else next.add(firId);
      return next;
    });
  }, []);

  const toggleColumn = useCallback((key: string) => {
    setColumns((cols) =>
      cols.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c))
    );
  }, []);

  const handleAIExtract = useCallback(() => {
    if (!aiText.trim()) return;
    setExtracting(true);
    setExtraction(null);
    // Simulate AI delay
    setTimeout(() => {
      const result = simulateAIExtraction(aiText);
      setExtraction(result);
      setExtracting(false);
    }, 1500);
  }, [aiText]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        handleAIExtract();
      }
    },
    [handleAIExtract]
  );

  const handleUseAIForDialog = useCallback(() => {
    if (extraction) {
      setNewFirForm({
        crime_type: extraction.crime_type,
        district: "",
        description: `Location: ${extraction.location}, Time: ${extraction.time}, IPC: ${extraction.ipc_sections}`,
      });
      setShowCreateDialog(true);
    }
  }, [extraction]);

  const handleCreateFIR = useCallback(() => {
    if (!newFirForm.crime_type.trim()) return;
    addAuditLog({
      user: "Current User",
      role: "station_officer",
      action: "Created FIR",
      entity: "FIR",
      entityId: generateId("FIR"),
      oldValue: "",
      newValue: `Crime: ${newFirForm.crime_type}, District: ${newFirForm.district || "N/A"}`,
      status: "success",
    });
    addNotification({
      title: "FIR Created",
      message: `New ${newFirForm.crime_type} FIR created successfully`,
      type: "success",
      read: false,
    });
    setShowCreateDialog(false);
    setNewFirForm({ crime_type: "", district: "", description: "" });
  }, [newFirForm, addAuditLog, addNotification]);

  const handleBulkExport = useCallback(
    (format: "csv" | "excel" | "json") => {
      const selectedData = firs.filter((f) => selectedRows.has(f.fir_id));
      const exportData = selectedData.map((f) => ({
        fir_id: f.fir_id,
        date: f.date,
        crime_type: f.crime_type,
        severity: f.severity,
        district: f.district,
        location: f.location.place,
        status: f.investigation_status,
        ipc_section: f.ipc_section,
        victim: f.victim.name,
        police_station: f.police_station,
      }));

      switch (format) {
        case "csv":
          exportToCSV(exportData, "firs_export");
          break;
        case "excel":
          exportToExcel(exportData, "firs_export");
          break;
        case "json":
          exportToJSON(exportData, "firs_export");
          break;
      }

      addAuditLog({
        user: "Current User",
        role: "station_officer",
        action: "Exported FIRs",
        entity: "FIR",
        entityId: `${selectedRows.size} records`,
        oldValue: "",
        newValue: format.toUpperCase(),
        status: "success",
      });
    },
    [firs, selectedRows, addAuditLog]
  );

  const handleBulkDelete = useCallback(() => {
    addAuditLog({
      user: "Current User",
      role: "station_officer",
      action: "Bulk deleted FIRs",
      entity: "FIR",
      entityId: `${selectedRows.size} records`,
      oldValue: "active",
      newValue: "deleted",
      status: "success",
    });
    addNotification({
      title: "FIRs Deleted",
      message: `${selectedRows.size} FIRs have been marked for deletion`,
      type: "warning",
      read: false,
    });
    setSelectedRows(new Set());
  }, [selectedRows, addAuditLog, addNotification]);

  const handleBulkAIReport = useCallback(() => {
    addAuditLog({
      user: "Current User",
      role: "analyst",
      action: "Generated AI Report",
      entity: "FIR",
      entityId: `${selectedRows.size} records`,
      oldValue: "",
      newValue: "AI analysis queued",
      status: "success",
    });
    addNotification({
      title: "AI Analysis Queued",
      message: `${selectedRows.size} FIRs queued for AI analysis`,
      type: "info",
      read: false,
    });
  }, [selectedRows, addAuditLog, addNotification]);

  const handleRowAction = useCallback(
    (action: string, fir: FIR) => {
      addAuditLog({
        user: "Current User",
        role: "station_officer",
        action,
        entity: "FIR",
        entityId: fir.fir_id,
        oldValue: "",
        newValue: action,
        status: "success",
      });

      if (action === "View") {
        useAppStore.getState().setSelectedFirId(fir.fir_id);
      } else if (action === "Delete") {
        addNotification({
          title: "FIR Deleted",
          message: `${fir.fir_id} has been marked for deletion`,
          type: "warning",
          read: false,
        });
      } else if (action === "Duplicate") {
        addNotification({
          title: "Duplicate Check",
          message: `Running duplicate detection for ${fir.fir_id}`,
          type: "info",
          read: false,
        });
      } else if (action === "Generate AI Report") {
        addNotification({
          title: "AI Report Queued",
          message: `Generating AI report for ${fir.fir_id}`,
          type: "info",
          read: false,
        });
      }
    },
    [addAuditLog, addNotification]
  );

  const clearFilters = useCallback(() => {
    setFilterCrimeType("all");
    setFilterDistrict("all");
    setFilterSeverity("all");
    setFilterStatus("all");
    setFilterDateFrom("");
    setFilterDateTo("");
    setSearchQuery("");
    setDebouncedSearch("");
    setPage(1);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterCrimeType !== "all") count++;
    if (filterDistrict !== "all") count++;
    if (filterSeverity !== "all") count++;
    if (filterStatus !== "all") count++;
    if (filterDateFrom) count++;
    if (filterDateTo) count++;
    return count;
  }, [filterCrimeType, filterDistrict, filterSeverity, filterStatus, filterDateFrom, filterDateTo]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3.5 w-3.5 text-[#4a5568]" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3.5 w-3.5 text-blue-400" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-blue-400" />
    );
  };

  // ── Render ──
  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 p-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[#e2e8f0] text-2xl font-bold tracking-tight">
            FIR Management
          </h1>
          <p className="text-[#64748b] text-sm mt-1">
            Search, filter, and manage all First Information Reports
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setShowCreateDialog(true)}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0 rounded-xl"
          >
            <Plus className="h-4 w-4" />
            New FIR
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-[#e2e8f0] rounded-xl"
              >
                <FileDown className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#1a2035] border-white/10 text-[#e2e8f0]">
              <DropdownMenuItem
                onClick={() =>
                  exportToCSV(
                    filteredFirs.map((f) => ({
                      fir_id: f.fir_id,
                      date: f.date,
                      crime_type: f.crime_type,
                      severity: f.severity,
                      district: f.district,
                      status: f.investigation_status,
                    })),
                    "firs_export"
                  )
                }
              >
                <FileDown className="mr-2 h-4 w-4" /> Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  exportToExcel(
                    filteredFirs.map((f) => ({
                      fir_id: f.fir_id,
                      date: f.date,
                      crime_type: f.crime_type,
                      severity: f.severity,
                      district: f.district,
                      status: f.investigation_status,
                    })),
                    "firs_export"
                  )
                }
              >
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  exportToJSON(
                    filteredFirs.map((f) => ({
                      fir_id: f.fir_id,
                      date: f.date,
                      crime_type: f.crime_type,
                      severity: f.severity,
                      district: f.district,
                      status: f.investigation_status,
                    })),
                    "firs_export"
                  )
                }
              >
                <FileJson className="mr-2 h-4 w-4" /> Export JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={() => exportToPrint("fir-table")}>
                <Printer className="mr-2 h-4 w-4" /> Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── AI-Assisted Entry Section ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5"
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/15">
            <Brain className="h-4 w-4 text-violet-400" />
          </div>
          <div>
            <h2 className="text-[#e2e8f0] text-sm font-semibold">
              AI-Assisted FIR Entry
            </h2>
            <p className="text-[#64748b] text-xs">
              Describe the incident in plain text — AI will extract key fields
            </p>
          </div>
        </div>
        <div className="relative">
          <Textarea
            value={aiText}
            onChange={(e) => setAiText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Describe the incident... e.g., "A woman reported chain snatching near Mysuru Bus Stand around 8 PM. Two suspects on a black motorcycle fled the scene."'
            className="min-h-[80px] bg-white/5 border-white/10 text-[#e2e8f0] placeholder:text-[#4a5568] resize-none focus-visible:border-violet-500/50 focus-visible:ring-violet-500/20"
            rows={3}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-[#4a5568] text-xs">
              Press <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono text-[#94a3b8]">Ctrl+Enter</kbd> to analyze
            </span>
            <Button
              onClick={handleAIExtract}
              disabled={extracting || !aiText.trim()}
              className="gap-2 bg-violet-600 hover:bg-violet-700 text-white border-0 rounded-xl text-sm"
            >
              {extracting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {extracting ? "Analyzing..." : "Extract with AI"}
            </Button>
          </div>
        </div>

        {/* Extraction Result */}
        <AnimatePresence>
          {extraction && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="mt-4 rounded-xl border border-violet-500/20 bg-violet-500/5 p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    <span className="text-[#e2e8f0] text-sm font-medium">
                      AI Extraction Complete
                    </span>
                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px]">
                      {extraction.confidence}% confidence
                    </Badge>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setExtraction(null)}
                    className="h-7 w-7 p-0 text-[#64748b] hover:text-[#e2e8f0]"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    { label: "Crime Type", value: extraction.crime_type },
                    { label: "Victim", value: extraction.victim },
                    { label: "Location", value: extraction.location },
                    { label: "Time", value: extraction.time },
                    { label: "IPC Sections", value: extraction.ipc_sections },
                    {
                      label: "Keywords",
                      value: extraction.keywords.join(", ") || "N/A",
                    },
                  ].map((item) => (
                    <div key={item.label}>
                      <span className="text-[#64748b] text-xs font-medium uppercase tracking-wider">
                        {item.label}
                      </span>
                      <p className="text-[#e2e8f0] text-sm mt-0.5">{item.value}</p>
                    </div>
                  ))}
                </div>

                {extraction.timeline.length > 0 && (
                  <div className="mt-3">
                    <span className="text-[#64748b] text-xs font-medium uppercase tracking-wider">
                      Timeline
                    </span>
                    <div className="mt-1 flex items-center gap-2">
                      {extraction.timeline.map((t, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 rounded-lg bg-white/5 px-3 py-1.5"
                        >
                          <Clock className="h-3 w-3 text-[#64748b]" />
                          <span className="text-[#e2e8f0] text-xs">
                            {t.event}
                          </span>
                          <span className="text-[#4a5568] text-xs">
                            ({t.date})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-4 flex items-center gap-2">
                  <Button
                    onClick={handleUseAIForDialog}
                    className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white border-0 rounded-xl text-sm"
                  >
                    <Plus className="h-4 w-4" />
                    Create FIR from Extraction
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── Bulk Actions Bar ── */}
      <AnimatePresence>
        {selectedRows.size > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 backdrop-blur-xl">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4 text-emerald-400" />
                <span className="text-[#e2e8f0] text-sm font-medium">
                  {selectedRows.size} selected
                </span>
              </div>
              <div className="h-5 w-px bg-white/10" />
              <Button
                size="sm"
                variant="ghost"
                onClick={handleBulkDelete}
                className="gap-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 h-8 text-xs"
              >
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5 text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-white/10 h-8 text-xs"
                  >
                    <FileDown className="h-3.5 w-3.5" /> Export Selected
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-[#1a2035] border-white/10 text-[#e2e8f0]">
                  <DropdownMenuItem onClick={() => handleBulkExport("csv")}>
                    <FileDown className="mr-2 h-3.5 w-3.5" /> CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkExport("excel")}>
                    <FileSpreadsheet className="mr-2 h-3.5 w-3.5" /> Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleBulkExport("json")}>
                    <FileJson className="mr-2 h-3.5 w-3.5" /> JSON
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleBulkAIReport}
                className="gap-1.5 text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-white/10 h-8 text-xs"
              >
                <Zap className="h-3.5 w-3.5" /> Generate AI Report
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  addNotification({
                    title: "Network Analysis",
                    message: `Analyzing network for ${selectedRows.size} FIRs`,
                    type: "info",
                    read: false,
                  });
                }}
                className="gap-1.5 text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-white/10 h-8 text-xs"
              >
                <Network className="h-3.5 w-3.5" /> Analyze Network
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  addAuditLog({
                    user: "Current User",
                    role: "auditor",
                    action: "Marked FIRs as Reviewed",
                    entity: "FIR",
                    entityId: `${selectedRows.size} records`,
                    oldValue: "unreviewed",
                    newValue: "reviewed",
                    status: "success",
                  });
                  setSelectedRows(new Set());
                }}
                className="gap-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 h-8 text-xs"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Mark Reviewed
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Search + Filter Controls ── */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4a5568]" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search FIRs by number, crime type, district, location, victim, accused..."
              className="pl-10 bg-white/5 border-white/10 text-[#e2e8f0] placeholder:text-[#4a5568] h-10 rounded-xl focus-visible:border-blue-500/50 focus-visible:ring-blue-500/20"
            />
          </div>

          {/* Filter Toggle */}
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className={`gap-2 border-white/10 rounded-xl h-10 ${
              showFilters || activeFilterCount > 0
                ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                : "bg-white/5 text-[#94a3b8] hover:bg-white/10"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-500 text-[10px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </Button>

          {/* Column Visibility */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="gap-2 border-white/10 bg-white/5 text-[#94a3b8] hover:bg-white/10 rounded-xl h-10"
              >
                <Columns3 className="h-4 w-4" />
                Columns
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="bg-[#1a2035] border-white/10 text-[#e2e8f0] w-48"
              align="end"
            >
              <DropdownMenuLabel className="text-[#94a3b8]">
                Toggle Columns
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-white/10" />
              {columns.map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.key}
                  checked={col.visible}
                  onCheckedChange={() => toggleColumn(col.key)}
                  className="text-[#e2e8f0] focus:bg-white/10"
                >
                  {col.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap items-end gap-3 rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="min-w-[160px] space-y-1.5">
                  <Label className="text-[#94a3b8] text-xs">Crime Type</Label>
                  <Select value={filterCrimeType} onValueChange={(v) => { setFilterCrimeType(v); setPage(1); }}>
                    <SelectTrigger className="h-9 bg-white/5 border-white/10 text-[#e2e8f0] rounded-lg w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2035] border-white/10 text-[#e2e8f0]">
                      <SelectItem value="all">All Types</SelectItem>
                      {uniqueCrimeTypes.map((ct) => (
                        <SelectItem key={ct} value={ct}>
                          {ct}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-[160px] space-y-1.5">
                  <Label className="text-[#94a3b8] text-xs">District</Label>
                  <Select value={filterDistrict} onValueChange={(v) => { setFilterDistrict(v); setPage(1); }}>
                    <SelectTrigger className="h-9 bg-white/5 border-white/10 text-[#e2e8f0] rounded-lg w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2035] border-white/10 text-[#e2e8f0]">
                      <SelectItem value="all">All Districts</SelectItem>
                      {uniqueDistricts.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-[130px] space-y-1.5">
                  <Label className="text-[#94a3b8] text-xs">Severity</Label>
                  <Select value={filterSeverity} onValueChange={(v) => { setFilterSeverity(v); setPage(1); }}>
                    <SelectTrigger className="h-9 bg-white/5 border-white/10 text-[#e2e8f0] rounded-lg w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2035] border-white/10 text-[#e2e8f0]">
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-[160px] space-y-1.5">
                  <Label className="text-[#94a3b8] text-xs">Status</Label>
                  <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
                    <SelectTrigger className="h-9 bg-white/5 border-white/10 text-[#e2e8f0] rounded-lg w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2035] border-white/10 text-[#e2e8f0]">
                      <SelectItem value="all">All Statuses</SelectItem>
                      {uniqueStatuses.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="min-w-[140px] space-y-1.5">
                  <Label className="text-[#94a3b8] text-xs">Date From</Label>
                  <Input
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => { setFilterDateFrom(e.target.value); setPage(1); }}
                    className="h-9 bg-white/5 border-white/10 text-[#e2e8f0] rounded-lg [color-scheme:dark]"
                  />
                </div>

                <div className="min-w-[140px] space-y-1.5">
                  <Label className="text-[#94a3b8] text-xs">Date To</Label>
                  <Input
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => { setFilterDateTo(e.target.value); setPage(1); }}
                    className="h-9 bg-white/5 border-white/10 text-[#e2e8f0] rounded-lg [color-scheme:dark]"
                  />
                </div>

                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="gap-1.5 text-[#64748b] hover:text-[#e2e8f0] h-9 text-xs"
                >
                  <X className="h-3.5 w-3.5" /> Clear All
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Table Container ── */}
      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden">
        {/* Table header stats */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
          <div className="flex items-center gap-3">
            <span className="text-[#94a3b8] text-sm">
              Showing{" "}
              <span className="text-[#e2e8f0] font-medium">
                {filteredFirs.length}
              </span>{" "}
              of{" "}
              <span className="text-[#e2e8f0] font-medium">{firs.length}</span>{" "}
              FIRs
            </span>
            {filteredFirs.length !== firs.length && (
              <Badge
                variant="outline"
                className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-[10px]"
              >
                Filtered
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[#64748b] text-xs">Rows:</span>
            <Select
              value={String(pageSize)}
              onValueChange={(v) => {
                setPageSize(Number(v));
                setPage(1);
              }}
            >
              <SelectTrigger className="h-8 w-[70px] bg-white/5 border-white/10 text-[#e2e8f0] text-xs rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a2035] border-white/10 text-[#e2e8f0]">
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
                <SelectItem value="100">100</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Table */}
        <div id="fir-table" className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-white/5">
                <TableHead className="w-12">
                  <Checkbox
                    checked={
                      paginatedFirs.length > 0 &&
                      selectedRows.size === paginatedFirs.length
                    }
                    onCheckedChange={handleSelectAll}
                    className="border-white/20 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                  />
                </TableHead>
                {columns
                  .filter((c) => c.visible)
                  .map((col) => (
                    <TableHead
                      key={col.key}
                      className={`text-[#94a3b8] text-xs font-medium uppercase tracking-wider ${
                        col.sortable ? "cursor-pointer select-none hover:text-[#e2e8f0]" : ""
                      }`}
                      onClick={
                        col.sortable
                          ? () => handleSort(col.key as SortField)
                          : undefined
                      }
                    >
                      <div className="flex items-center gap-1.5">
                        {col.label}
                        {col.sortable && <SortIcon field={col.key as SortField} />}
                      </div>
                    </TableHead>
                  ))}
                <TableHead className="text-[#94a3b8] text-xs font-medium uppercase tracking-wider text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedFirs.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={columns.filter((c) => c.visible).length + 2}
                    className="h-40 text-center"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <AlertTriangle className="h-8 w-8 text-[#4a5568]" />
                      <p className="text-[#64748b] text-sm">No FIRs found</p>
                      <p className="text-[#4a5568] text-xs">
                        Try adjusting your search or filters
                      </p>
                      {activeFilterCount > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={clearFilters}
                          className="mt-2 text-blue-400 text-xs"
                        >
                          Clear filters
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginatedFirs.map((fir) => (
                  <TableRow
                    key={fir.fir_id}
                    className={`border-white/5 hover:bg-white/5 transition-colors ${
                      selectedRows.has(fir.fir_id) ? "bg-blue-500/5" : ""
                    }`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedRows.has(fir.fir_id)}
                        onCheckedChange={() => handleSelectRow(fir.fir_id)}
                        className="border-white/20 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                      />
                    </TableCell>
                    {columns
                      .filter((c) => c.visible)
                      .map((col) => (
                        <TableCell key={col.key} className="text-sm">
                          {col.key === "fir_id" && (
                            <button
                              onClick={() => handleRowAction("View", fir)}
                              className="text-blue-400 hover:text-blue-300 hover:underline font-mono text-xs"
                            >
                              {fir.fir_id}
                            </button>
                          )}
                          {col.key === "crime_type" && (
                            <span className="text-[#e2e8f0]">
                              {fir.crime_type}
                            </span>
                          )}
                          {col.key === "status" && (
                            <StatusBadge status={fir.investigation_status} />
                          )}
                          {col.key === "district" && (
                            <span className="text-[#94a3b8] text-xs">
                              {fir.district}
                            </span>
                          )}
                          {col.key === "officer" && (
                            <span className="text-[#94a3b8] text-xs font-mono">
                              {fir.officer_id}
                            </span>
                          )}
                          {col.key === "severity" && (
                            <SeverityBadge severity={fir.severity} />
                          )}
                          {col.key === "date" && (
                            <span className="text-[#94a3b8] text-xs">
                              {new Date(fir.date).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })}
                            </span>
                          )}
                          {col.key === "ai_score" && (
                            <AIScoreCell score={getAIScore(fir)} />
                          )}
                        </TableCell>
                      ))}
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-[#64748b] hover:text-[#e2e8f0] hover:bg-white/10"
                          >
                            <SlidersHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          className="bg-[#1a2035] border-white/10 text-[#e2e8f0] w-48"
                          align="end"
                        >
                          <DropdownMenuItem
                            onClick={() => handleRowAction("View", fir)}
                            className="gap-2"
                          >
                            <Eye className="h-4 w-4" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRowAction("Edit", fir)}
                            className="gap-2"
                          >
                            <Pencil className="h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem
                            onClick={() => handleRowAction("Duplicate", fir)}
                            className="gap-2"
                          >
                            <Copy className="h-4 w-4" /> Check Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleRowAction("Generate AI Report", fir)}
                            className="gap-2"
                          >
                            <BarChart3 className="h-4 w-4" /> Generate AI
                            Report
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              addNotification({
                                title: "Network Analysis",
                                message: `Analyzing network for ${fir.fir_id}`,
                                type: "info",
                                read: false,
                              })
                            }
                            className="gap-2"
                          >
                            <Network className="h-4 w-4" /> Analyze Network
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              addNotification({
                                title: "Timeline",
                                message: `Viewing timeline for ${fir.fir_id}`,
                                type: "info",
                                read: false,
                              });
                              useAppStore.getState().setSelectedFirId(fir.fir_id);
                              setView("timeline");
                            }}
                            className="gap-2"
                          >
                            <Clock className="h-4 w-4" /> View Timeline
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/10" />
                          <DropdownMenuItem
                            onClick={() => handleRowAction("Delete", fir)}
                            variant="destructive"
                            className="gap-2"
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="flex flex-col items-center justify-between gap-3 border-t border-white/10 px-5 py-3 sm:flex-row">
          <span className="text-[#64748b] text-xs">
            Page {page} of {totalPages} — {filteredFirs.length} total results
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-white/10 bg-white/5 text-[#94a3b8] hover:bg-white/10 hover:text-[#e2e8f0] rounded-lg disabled:opacity-30"
              disabled={page <= 1}
              onClick={() => setPage(1)}
            >
              <ChevronLeft className="h-4 w-4" />
              <ChevronLeft className="h-4 w-4 -ml-2.5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-white/10 bg-white/5 text-[#94a3b8] hover:bg-white/10 hover:text-[#e2e8f0] rounded-lg disabled:opacity-30"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            {/* Page numbers */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (page <= 3) {
                pageNum = i + 1;
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = page - 2 + i;
              }
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? "default" : "outline"}
                  size="icon"
                  className={`h-8 w-8 rounded-lg text-xs ${
                    page === pageNum
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white border-0"
                      : "border-white/10 bg-white/5 text-[#94a3b8] hover:bg-white/10 hover:text-[#e2e8f0]"
                  }`}
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              );
            })}

            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-white/10 bg-white/5 text-[#94a3b8] hover:bg-white/10 hover:text-[#e2e8f0] rounded-lg disabled:opacity-30"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8 border-white/10 bg-white/5 text-[#94a3b8] hover:bg-white/10 hover:text-[#e2e8f0] rounded-lg disabled:opacity-30"
              disabled={page >= totalPages}
              onClick={() => setPage(totalPages)}
            >
              <ChevronRight className="h-4 w-4" />
              <ChevronRight className="h-4 w-4 -ml-2.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* ── Create FIR Dialog ── */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="bg-[#1a2035] border-white/10 text-[#e2e8f0] max-w-lg rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-[#e2e8f0]">Create New FIR</DialogTitle>
            <DialogDescription className="text-[#64748b]">
              Fill in the essential details to create a new First Information
              Report.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-[#94a3b8] text-sm">Crime Type</Label>
              <Input
                value={newFirForm.crime_type}
                onChange={(e) =>
                  setNewFirForm((f) => ({ ...f, crime_type: e.target.value }))
                }
                placeholder="e.g., Theft, Murder, Chain Snatching"
                className="bg-white/5 border-white/10 text-[#e2e8f0] placeholder:text-[#4a5568] rounded-xl focus-visible:border-emerald-500/50 focus-visible:ring-emerald-500/20"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#94a3b8] text-sm">District</Label>
              <Select
                value={newFirForm.district}
                onValueChange={(v) =>
                  setNewFirForm((f) => ({ ...f, district: v }))
                }
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-[#e2e8f0] rounded-xl w-full">
                  <SelectValue placeholder="Select district" />
                </SelectTrigger>
                <SelectContent className="bg-[#0a0f1e] border-white/10 text-[#e2e8f0]">
                  {uniqueDistricts.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#94a3b8] text-sm">Description</Label>
              <Textarea
                value={newFirForm.description}
                onChange={(e) =>
                  setNewFirForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Brief description of the incident..."
                className="min-h-[80px] bg-white/5 border-white/10 text-[#e2e8f0] placeholder:text-[#4a5568] rounded-xl resize-none focus-visible:border-emerald-500/50 focus-visible:ring-emerald-500/20"
              />
            </div>
            {extraction && (
              <div className="flex items-center gap-2 rounded-lg bg-violet-500/10 border border-violet-500/20 px-3 py-2">
                <Sparkles className="h-4 w-4 text-violet-400 shrink-0" />
                <span className="text-violet-300 text-xs">
                  Pre-filled from AI extraction ({extraction.confidence}%
                  confidence)
                </span>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowCreateDialog(false)}
              className="border-white/10 bg-white/5 text-[#94a3b8] hover:bg-white/10 hover:text-[#e2e8f0] rounded-xl"
            >
              Cancel
            </Button>
            {extraction && (
              <Button
                variant="outline"
                onClick={() => {
                  setNewFirForm({
                    crime_type: extraction.crime_type,
                    district: "",
                    description: `Location: ${extraction.location}, Time: ${extraction.time}, IPC: ${extraction.ipc_sections}`,
                  });
                }}
                className="border-violet-500/30 bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 rounded-xl gap-2"
              >
                <Brain className="h-4 w-4" />
                Re-fill from AI
              </Button>
            )}
            <Button
              onClick={handleCreateFIR}
              disabled={!newFirForm.crime_type.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 rounded-xl gap-2"
            >
              <Send className="h-4 w-4" />
              Create FIR
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}