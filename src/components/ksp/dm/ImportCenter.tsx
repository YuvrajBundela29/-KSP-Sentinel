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
  Upload,
  FileSpreadsheet,
  FileJson,
  FileText,
  FileArchive,
  Download,
  Play,
  RotateCcw,
  Eye,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Clock,
  Loader2,
  X,
  ChevronDown,
  ArrowRight,
  ArrowLeftRight,
  Database,
  Table2,
  ClipboardCheck,
  UploadCloud,
  Sparkles,
  Filter,
  RefreshCw,
  Pause,
  Zap,
  FileDown,
  Search,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { loadCrimeData } from "@/lib/data";
import type { ImportJob, CrimeDataset } from "@/lib/types";
import {
  formatBytes,
  generateId,
} from "@/lib/export-utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import { Label } from "@/components/ui/label";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// ─── Types ──────────────────────────────────────────────────────────
type ImportStep = "idle" | "mapping" | "validation" | "importing" | "complete" | "error";

interface UploadedFile {
  file: File;
  name: string;
  size: number;
  type: string;
  format: ImportJob["format"];
  estimatedRows: number;
}

interface ColumnMapping {
  sourceColumn: string;
  targetField: string;
}

interface ValidationError {
  row: number;
  column: string;
  message: string;
}

interface ValidationResult {
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  errors: ValidationError[];
}

// ─── Constants ──────────────────────────────────────────────────────
const ACCEPTED_FORMATS = [
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/json",
  "application/parquet",
  "application/zip",
  ".csv",
  ".xlsx",
  ".xls",
  ".json",
  ".parquet",
  ".zip",
];

const TARGET_FIELDS = [
  { value: "fir_id", label: "FIR ID" },
  { value: "date", label: "Date" },
  { value: "time", label: "Time" },
  { value: "crime_type", label: "Crime Type" },
  { value: "ipc_section", label: "IPC Section" },
  { value: "severity", label: "Severity" },
  { value: "district", label: "District" },
  { value: "location_place", label: "Location (Place)" },
  { value: "location_lat", label: "Location (Latitude)" },
  { value: "location_lng", label: "Location (Longitude)" },
  { value: "accused_names", label: "Accused Names" },
  { value: "victim_name", label: "Victim Name" },
  { value: "victim_age", label: "Victim Age" },
  { value: "vehicle_reg", label: "Vehicle Registration" },
  { value: "modus_operandi", label: "Modus Operandi" },
  { value: "items_stolen", label: "Items Stolen" },
  { value: "police_station", label: "Police Station" },
  { value: "officer_id", label: "Officer ID" },
  { value: "investigation_status", label: "Investigation Status" },
  { value: "bank_account", label: "Bank Account" },
  { value: "bank_name", label: "Bank Name" },
  { value: "amount_inr", label: "Amount (INR)" },
  { value: "transaction_mode", label: "Transaction Mode" },
  { value: "_skip", label: "— Skip Column —" },
];

const MOCK_SOURCE_COLUMNS = [
  "FIR Number",
  "Date of Incident",
  "Crime Category",
  "IPC Code",
  "District Name",
  "PS Name",
  "Latitude",
  "Longitude",
  "Accused 1",
  "Accused 2",
  "Victim Name",
  "Victim Age",
  "Vehicle No",
  "MO Details",
  "Stolen Items",
  "Bank A/c",
  "Bank Name",
  "Amount",
  "Txn Mode",
  "Status",
  "Officer Code",
];

const MOCK_PREVIEW_ROWS = [
  {
    "FIR Number": "2024-KA-0501",
    "Date of Incident": "15-01-2024",
    "Crime Category": "Theft",
    "IPC Code": "379",
    "District Name": "Bengaluru Urban",
    "PS Name": "Koramangala PS",
    "Latitude": "12.9352",
    "Longitude": "77.6245",
    "Accused 1": "Ravi Kumar",
    "Accused 2": "Suresh M",
    "Victim Name": "Priya Sharma",
    "Victim Age": "32",
    "Vehicle No": "KA-01-AB-1234",
    "MO Details": "Snatching near bus stop",
    "Stolen Items": "Gold chain, Mobile",
    "Bank A/c": "1234567890",
    "Bank Name": "SBI",
    "Amount": "250000",
    "Txn Mode": "NEFT",
    "Status": "Under Investigation",
    "Officer Code": "PS-4521",
  },
  {
    "FIR Number": "2024-KA-0502",
    "Date of Incident": "18-01-2024",
    "Crime Category": "Robbery",
    "IPC Code": "392",
    "District Name": "Mysuru",
    "PS Name": "Krishnaraja PS",
    "Latitude": "12.2958",
    "Longitude": "76.6394",
    "Accused 1": "Manoj T",
    "Accused 2": "",
    "Victim Name": "Anand Rao",
    "Victim Age": "45",
    "Vehicle No": "KA-09-CD-5678",
    "MO Details": "Armed robbery at ATM",
    "Stolen Items": "Cash ₹50,000",
    "Bank A/c": "",
    "Bank Name": "",
    "Amount": "",
    "Txn Mode": "",
    "Status": "Open",
    "Officer Code": "PS-3102",
  },
  {
    "FIR Number": "2024-KA-0503",
    "Date of Incident": "22-01-2024",
    "Crime Category": "Cyber Crime",
    "IPC Code": "420",
    "District Name": "Bengaluru Urban",
    "PS Name": "Cyber Crime PS",
    "Latitude": "12.9716",
    "Longitude": "77.5946",
    "Accused 1": "Unknown",
    "Accused 2": "",
    "Victim Name": "Meera Krishnan",
    "Victim Age": "28",
    "Vehicle No": "",
    "MO Details": "Online fraud via UPI",
    "Stolen Items": "₹1,80,000",
    "Bank A/c": "9876543210",
    "Bank Name": "HDFC",
    "Amount": "180000",
    "Txn Mode": "UPI",
    "Status": "Under Investigation",
    "Officer Code": "CC-001",
  },
  {
    "FIR Number": "",
    "Date of Incident": "25-01-2024",
    "Crime Category": "Assault",
    "IPC Code": "323",
    "District Name": "Dharwad",
    "PS Name": "Hubli PS",
    "Latitude": "15.3647",
    "Longitude": "75.1240",
    "Accused 1": "Kiran Naik",
    "Accused 2": "Deepak S",
    "Victim Name": "Rajesh Kulkarni",
    "Victim Age": "38",
    "Vehicle No": "",
    "MO Details": "Physical altercation",
    "Stolen Items": "",
    "Bank A/c": "",
    "Bank Name": "",
    "Amount": "",
    "Txn Mode": "",
    "Status": "Closed",
    "Officer Code": "PS-8801",
  },
  {
    "FIR Number": "2024-KA-0505",
    "Date of Incident": "30-01-2024",
    "Crime Category": "Vehicle Theft",
    "IPC Code": "379",
    "District Name": "Mangaluru",
    "PS Name": "Pandeshwar PS",
    "Latitude": "12.9141",
    "Longitude": "74.8560",
    "Accused 1": "Ashraf K",
    "Accused 2": "Nazeer A",
    "Victim Name": "Sunitha D'Souza",
    "Victim Age": "55",
    "Vehicle No": "KA-19-EF-9012",
    "MO Details": "Two-wheeler stolen from parking",
    "Stolen Items": "Honda Activa, KA-19-EF-9012",
    "Bank A/c": "",
    "Bank Name": "",
    "Amount": "",
    "Txn Mode": "",
    "Status": "Under Investigation",
    "Officer Code": "PS-6610",
  },
];

const AUTO_MAP: Record<string, string> = {
  "FIR Number": "fir_id",
  "Date of Incident": "date",
  "Crime Category": "crime_type",
  "IPC Code": "ipc_section",
  "District Name": "district",
  "PS Name": "police_station",
  "Latitude": "location_lat",
  "Longitude": "location_lng",
  "Accused 1": "accused_names",
  "Victim Name": "victim_name",
  "Victim Age": "victim_age",
  "Vehicle No": "vehicle_reg",
  "MO Details": "modus_operandi",
  "Stolen Items": "items_stolen",
  "Bank A/c": "bank_account",
  "Bank Name": "bank_name",
  "Amount": "amount_inr",
  "Txn Mode": "transaction_mode",
  "Status": "investigation_status",
  "Officer Code": "officer_id",
};

const MOCK_HISTORY_JOBS: ImportJob[] = [
  {
    id: "IMP-2024-001",
    filename: "bengaluru_firs_jan2024.csv",
    format: "csv",
    status: "completed",
    totalRows: 1250,
    processedRows: 1250,
    errors: 3,
    duplicates: 12,
    startedAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    completedAt: new Date(Date.now() - 86400000 * 7 + 120000).toISOString(),
    startedBy: "SI Ramesh",
    columnMapping: { "FIR Number": "fir_id", "Crime Category": "crime_type" },
  },
  {
    id: "IMP-2024-002",
    filename: "mysuru_district_bulk.xlsx",
    format: "excel",
    status: "completed",
    totalRows: 890,
    processedRows: 890,
    errors: 0,
    duplicates: 5,
    startedAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    completedAt: new Date(Date.now() - 86400000 * 5 + 95000).toISOString(),
    startedBy: "PS Kumar",
    columnMapping: {},
  },
  {
    id: "IMP-2024-003",
    filename: "cyber_crime_q4_2023.json",
    format: "json",
    status: "failed",
    totalRows: 3400,
    processedRows: 1205,
    errors: 42,
    duplicates: 0,
    startedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    completedAt: null,
    startedBy: "CC Officer Priya",
    columnMapping: {},
  },
  {
    id: "IMP-2024-004",
    filename: "statewide_fir_dump.parquet",
    format: "parquet",
    status: "rolled_back",
    totalRows: 15000,
    processedRows: 15000,
    errors: 289,
    duplicates: 145,
    startedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    completedAt: new Date(Date.now() - 86400000 * 2 + 300000).toISOString(),
    startedBy: "DSP Anand",
    columnMapping: {},
  },
  {
    id: "IMP-2024-005",
    filename: "dharwad_feb_batch.csv",
    format: "csv",
    status: "processing",
    totalRows: 560,
    processedRows: 312,
    errors: 2,
    duplicates: 4,
    startedAt: new Date(Date.now() - 60000).toISOString(),
    completedAt: null,
    startedBy: "Current User",
    columnMapping: {},
  },
  {
    id: "IMP-2024-006",
    filename: "belt_and_road_cases.zip",
    format: "zip",
    status: "queued",
    totalRows: 0,
    processedRows: 0,
    errors: 0,
    duplicates: 0,
    startedAt: new Date().toISOString(),
    completedAt: null,
    startedBy: "Current User",
    columnMapping: {},
  },
];

// ─── Status Badge Component ─────────────────────────────────────────
function StatusBadge({ status }: { status: ImportJob["status"] }) {
  const config: Record<ImportJob["status"], { color: string; icon: React.ReactNode; animate?: boolean }> = {
    queued: {
      color: "bg-gray-500/15 text-gray-400 border-gray-500/30",
      icon: <Clock className="h-3 w-3" />,
    },
    processing: {
      color: "bg-[#22d3ee]/15 text-[#22d3ee] border-[rgba(34,211,238,0.15)] animate-pulse",
      icon: <Loader2 className="h-3 w-3 animate-spin" />,
      animate: true,
    },
    completed: {
      color: "bg-[#34d399]/15 text-[#34d399] border-[rgba(52,211,153,0.15)]",
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    failed: {
      color: "bg-[#f87171]/15 text-[#f87171] border-[rgba(248,113,113,0.15)]",
      icon: <XCircle className="h-3 w-3" />,
    },
    rolled_back: {
      color: "bg-[#fbbf24]/15 text-[#fbbf24] border-[rgba(251,191,36,0.15)]",
      icon: <RotateCcw className="h-3 w-3" />,
    },
  };

  const cfg = config[status];
  const label = status === "rolled_back" ? "Rolled Back" : status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <Badge className={`text-[10px] border gap-1 ${cfg.color}`}>
      {cfg.icon}
      {label}
    </Badge>
  );
}

// ─── Format Icon ────────────────────────────────────────────────────
function FormatIcon({ format, className = "h-4 w-4" }: { format: ImportJob["format"]; className?: string }) {
  switch (format) {
    case "csv": return <FileText className={className} />;
    case "excel": return <FileSpreadsheet className={className} />;
    case "json": return <FileJson className={className} />;
    case "parquet": return <Database className={className} />;
    case "zip": return <FileArchive className={className} />;
  }
}

// ─── Main Component ─────────────────────────────────────────────────
export default function ImportCenter() {
  const { importJobs, addImportJob, addAuditLog, addNotification } = useAppStore();
  const [loading, setLoading] = useState(true);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [importStep, setImportStep] = useState<ImportStep>("idle");
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [importProgress, setImportProgress] = useState(0);
  const [processingJob, setProcessingJob] = useState<ImportJob | null>(null);
  const [searchHistory, setSearchHistory] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const dropRef = useRef<HTMLDivElement>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // Simulate loading
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  // Auto-map columns when file is "uploaded"
  useEffect(() => {
    if (uploadedFile) {
      const mappings = MOCK_SOURCE_COLUMNS.map((col) => ({
        sourceColumn: col,
        targetField: AUTO_MAP[col] || "_skip",
      }));
      setColumnMappings(mappings);
    }
  }, [uploadedFile]);

  // Merge store jobs with mock history
  const allJobs = useMemo(() => {
    const storeJobs = importJobs || [];
    return [...MOCK_HISTORY_JOBS, ...storeJobs].sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }, [importJobs]);

  // Filtered history
  const filteredJobs = useMemo(() => {
    let result = allJobs;
    if (searchHistory) {
      const q = searchHistory.toLowerCase();
      result = result.filter(
        (j) =>
          j.filename.toLowerCase().includes(q) ||
          j.id.toLowerCase().includes(q) ||
          j.format.includes(q)
      );
    }
    if (filterStatus !== "all") {
      result = result.filter((j) => j.status === filterStatus);
    }
    return result;
  }, [allJobs, searchHistory, filterStatus]);

  // ── File Upload Handling ──
  const handleFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    let format: ImportJob["format"] = "csv";
    if (ext === "csv") format = "csv";
    else if (["xlsx", "xls"].includes(ext)) format = "excel";
    else if (ext === "json") format = "json";
    else if (ext === "parquet") format = "parquet";
    else if (ext === "zip") format = "zip";
    else {
      addNotification({
        title: "Invalid File Type",
        message: `Unsupported file format: .${ext}`,
        type: "error",
        read: false,
      });
      return;
    }

    const estimatedRows = Math.floor(file.size / 512); // rough estimate

    setUploadedFile({
      file,
      name: file.name,
      size: file.size,
      type: file.type,
      format,
      estimatedRows: Math.min(Math.max(estimatedRows, 10), 50000),
    });

    setImportStep("idle");
    setValidationResult(null);
    setImportProgress(0);
    addAuditLog({
      user: "Current User",
      role: "analyst",
      action: "Uploaded file for import",
      entity: "ImportJob",
      entityId: file.name,
      oldValue: "",
      newValue: `${format}, ${formatBytes(file.size)}`,
      status: "success",
    });
  }, [addAuditLog, addNotification]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = "";
    },
    [handleFile]
  );

  // ── Step Handlers ──
  const handleOpenMapping = useCallback(() => {
    setImportStep("mapping");
  }, []);

  const handleMappingNext = useCallback(() => {
    // Run mock validation
    const errors: ValidationError[] = [
      { row: 4, column: "FIR Number", message: "FIR ID is required but missing" },
      { row: 12, column: "Date of Incident", message: "Invalid date format. Expected DD-MM-YYYY" },
      { row: 28, column: "IPC Code", message: "Invalid IPC section: 'ABC'" },
      { row: 45, column: "Latitude", message: "Latitude out of range for Karnataka" },
      { row: 67, column: "Amount", message: "Amount must be a positive number" },
    ];

    const totalEstRows = uploadedFile?.estimatedRows || 500;
    setValidationResult({
      validRows: totalEstRows - errors.length - 8,
      invalidRows: errors.length,
      duplicateRows: 8,
      errors,
    });
    setImportStep("validation");
  }, [uploadedFile]);

  const handleFixErrors = useCallback(() => {
    setImportStep("mapping");
  }, []);

  const handleProceedWithValid = useCallback(() => {
    setImportStep("importing");
    setImportProgress(0);

    // Create the import job
    const job: ImportJob = {
      id: generateId("IMP"),
      filename: uploadedFile?.name || "unknown.csv",
      format: uploadedFile?.format || "csv",
      status: "processing",
      totalRows: uploadedFile?.estimatedRows || 500,
      processedRows: 0,
      errors: validationResult?.invalidRows || 0,
      duplicates: validationResult?.duplicateRows || 0,
      startedAt: new Date().toISOString(),
      completedAt: null,
      startedBy: "Current User",
      columnMapping: Object.fromEntries(
        columnMappings
          .filter((m) => m.targetField !== "_skip")
          .map((m) => [m.sourceColumn, m.targetField])
      ),
    };

    setProcessingJob(job);
    addImportJob(job);

    // Simulate progress
    let progress = 0;
    const totalRows = job.totalRows;
    progressInterval.current = setInterval(() => {
      progress += Math.floor(Math.random() * 15) + 5;
      if (progress >= totalRows) {
        progress = totalRows;
        if (progressInterval.current) clearInterval(progressInterval.current);

        const completedJob: ImportJob = {
          ...job,
          status: "completed",
          processedRows: totalRows,
          completedAt: new Date().toISOString(),
        };

        setProcessingJob(completedJob);
        setImportProgress(100);
        setImportStep("complete");

        addNotification({
          title: "Import Complete",
          message: `${job.filename} — ${totalRows} rows imported successfully`,
          type: "success",
          read: false,
        });

        addAuditLog({
          user: "Current User",
          role: "analyst",
          action: "Completed import",
          entity: "ImportJob",
          entityId: job.id,
          oldValue: "processing",
          newValue: "completed",
          status: "success",
        });
      } else {
        setImportProgress(Math.round((progress / totalRows) * 100));
        setProcessingJob((prev) =>
          prev ? { ...prev, processedRows: progress } : prev
        );
      }
    }, 200);
  }, [
    uploadedFile,
    validationResult,
    columnMappings,
    addImportJob,
    addNotification,
    addAuditLog,
  ]);

  const handleReset = useCallback(() => {
    if (progressInterval.current) clearInterval(progressInterval.current);
    setUploadedFile(null);
    setImportStep("idle");
    setColumnMappings([]);
    setValidationResult(null);
    setImportProgress(0);
    setProcessingJob(null);
  }, []);

  const handleDownloadTemplate = useCallback(
    (format: "csv" | "json") => {
      addAuditLog({
        user: "Current User",
        role: "analyst",
        action: "Downloaded import template",
        entity: "ImportJob",
        entityId: format,
        oldValue: "",
        newValue: `${format.toUpperCase()} template`,
        status: "success",
      });

      if (format === "csv") {
        const headers = MOCK_SOURCE_COLUMNS.join(",");
        const sampleRow = MOCK_PREVIEW_ROWS[0]
          ? MOCK_SOURCE_COLUMNS.map((c) => `"${MOCK_PREVIEW_ROWS[0][c as keyof typeof MOCK_PREVIEW_ROWS[0]] || ""}"`).join(",")
          : "";
        const csv = headers + "\n" + sampleRow;
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "ksp_fir_import_template.csv";
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const json = JSON.stringify([MOCK_PREVIEW_ROWS[0]], null, 2);
        const blob = new Blob([json], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "ksp_fir_import_template.json";
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    [addAuditLog]
  );

  // Cleanup interval
  useEffect(() => {
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, []);

  // ── Render: Loading ──
  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-52 w-full rounded-2xl" />
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg" />
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
          <h1 className="text-[#f1f5f9] text-2xl font-bold tracking-tight">
            Import Center
          </h1>
          <p className="text-[#5a657a] text-sm mt-1">
            Bulk import FIR data from CSV, Excel, JSON, Parquet, and ZIP files
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => handleDownloadTemplate("csv")}
            className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-[#f1f5f9] rounded-xl"
          >
            <FileText className="h-4 w-4" />
            CSV Template
          </Button>
          <Button
            variant="outline"
            onClick={() => handleDownloadTemplate("json")}
            className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-[#f1f5f9] rounded-xl"
          >
            <FileJson className="h-4 w-4" />
            JSON Template
          </Button>
        </div>
      </div>

      {/* ── Upload Zone ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
      >
        {!uploadedFile ? (
          <div
            ref={dropRef}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-12
              transition-all duration-300 cursor-pointer
              ${isDragOver
                ? "border-cyan-500 bg-[#22d3ee]/10 backdrop-blur-xl scale-[1.01]"
                : "border-white/10 bg-white/5 backdrop-blur-xl hover:border-white/20 hover:bg-white/8"
              }
            `}
            onClick={() => document.getElementById("file-input")?.click()}
          >
            <input
              id="file-input"
              type="file"
              accept={ACCEPTED_FORMATS.join(",")}
              onChange={handleFileInput}
              className="hidden"
            />
            <motion.div
              animate={isDragOver ? { scale: 1.15, y: -4 } : { scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex h-20 w-20 items-center justify-center rounded-2xl bg-white/5"
            >
              <UploadCloud
                className={`h-10 w-10 transition-colors duration-300 ${
                  isDragOver ? "text-[#22d3ee]" : "text-[#3d4659]"
                }`}
              />
            </motion.div>
            <div className="text-center">
              <p className="text-[#f1f5f9] text-base font-medium">
                {isDragOver ? "Drop your file here" : "Drag & drop files here"}
              </p>
              <p className="text-[#5a657a] text-sm mt-1">
                or click to browse · Supports CSV, Excel, JSON, Parquet, ZIP
              </p>
            </div>
            <div className="flex items-center gap-2 mt-1">
              {["CSV", "Excel", "JSON", "Parquet", "ZIP"].map((fmt) => (
                <Badge
                  key={fmt}
                  variant="outline"
                  className="text-[10px] border-white/10 text-[#5a657a]"
                >
                  {fmt}
                </Badge>
              ))}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#22d3ee]/15">
                  <FormatIcon format={uploadedFile.format} className="h-6 w-6 text-[#22d3ee]" />
                </div>
                <div>
                  <h3 className="text-[#f1f5f9] text-base font-semibold">{uploadedFile.name}</h3>
                  <div className="flex items-center gap-3 mt-1">
                    <Badge variant="outline" className="text-[10px] border-white/10 text-[#8b97b0]">
                      {uploadedFile.format.toUpperCase()}
                    </Badge>
                    <span className="text-[#5a657a] text-xs">{formatBytes(uploadedFile.size)}</span>
                    <span className="text-[#5a657a] text-xs">~{uploadedFile.estimatedRows.toLocaleString("en-IN")} estimated rows</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {importStep === "idle" && (
                  <Button
                    onClick={() => document.getElementById("file-input")?.click()}
                    variant="ghost"
                    className="text-[#8b97b0] hover:text-[#f1f5f9] hover:bg-white/10 rounded-lg h-8 text-xs"
                  >
                    Change File
                  </Button>
                )}
                <Button
                  variant="ghost"
                  onClick={handleReset}
                  disabled={importStep === "importing"}
                  className="h-8 w-8 p-0 text-[#5a657a] hover:text-[#f87171] hover:bg-[#f87171]/10 rounded-lg"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Import Progress Bar (during importing) */}
            {importStep === "importing" && (
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[#8b97b0] text-sm flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-[#22d3ee]" />
                    Importing data...
                  </span>
                  <span className="text-[#f1f5f9] text-sm font-medium">
                    {importProgress}%
                  </span>
                </div>
                <Progress value={importProgress} className="h-2 bg-white/10 [&>div]:bg-gradient-to-r [&>div]:from-cyan-500 [&>div]:to-emerald-500" />
                <p className="text-[#5a657a] text-xs">
                  {processingJob?.processedRows.toLocaleString("en-IN")} of {processingJob?.totalRows.toLocaleString("en-IN")} rows processed
                </p>
              </div>
            )}

            {/* Step Indicator */}
            {importStep !== "importing" && importStep !== "complete" && (
              <div className="mt-4">
                <div className="flex items-center gap-2">
                  {(["mapping", "validation", "importing"] as ImportStep[]).map((step, i) => {
                    const stepLabels = ["Column Mapping", "Validation", "Import"];
                    const stepIcons = [<ArrowLeftRight className="h-4 w-4" />, <ClipboardCheck className="h-4 w-4" />, <Database className="h-4 w-4" />];
                    const isActive = importStep === step;
                    const isPast = i === 0 && importStep === "validation";
                    return (
                      <React.Fragment key={step}>
                        {i > 0 && <div className="flex-1 h-px bg-white/10" />}
                        <div className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors ${
                          isActive ? "bg-[#22d3ee]/15 text-[#22d3ee]" : isPast ? "bg-[#34d399]/10 text-[#34d399]" : "bg-white/5 text-[#3d4659]"
                        }`}>
                          {stepIcons[i]}
                          <span className="text-xs font-medium">{stepLabels[i]}</span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-end gap-2 mt-4">
                  {importStep === "idle" && (
                    <Button
                      onClick={handleOpenMapping}
                      className="gap-2 bg-[#34d399] hover:bg-[#2bc48a] text-white border-0 rounded-xl"
                    >
                      <ArrowLeftRight className="h-4 w-4" />
                      Map Columns
                    </Button>
                  )}
                  {importStep === "mapping" && (
                    <>
                      <Button
                        variant="ghost"
                        onClick={handleReset}
                        className="text-[#8b97b0] hover:text-[#f1f5f9] hover:bg-white/10 rounded-xl"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleMappingNext}
                        className="gap-2 bg-[#22d3ee] hover:bg-cyan-700 text-white border-0 rounded-xl"
                      >
                        <ClipboardCheck className="h-4 w-4" />
                        Validate & Continue
                      </Button>
                    </>
                  )}
                  {importStep === "validation" && (
                    <>
                      <Button
                        variant="ghost"
                        onClick={handleFixErrors}
                        className="text-[#8b97b0] hover:text-[#f1f5f9] hover:bg-white/10 rounded-xl"
                      >
                        Fix Errors
                      </Button>
                      <Button
                        onClick={handleProceedWithValid}
                        className="gap-2 bg-[#34d399] hover:bg-[#2bc48a] text-white border-0 rounded-xl"
                      >
                        <Play className="h-4 w-4" />
                        Proceed with Valid Rows
                      </Button>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Complete State */}
            {importStep === "complete" && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-4 rounded-xl border border-[rgba(52,211,153,0.12)] bg-[#34d399]/5 p-4"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#34d399]/20">
                    <CheckCircle2 className="h-5 w-5 text-[#34d399]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[#34d399] font-medium text-sm">Import Completed Successfully</p>
                    <p className="text-[#5a657a] text-xs mt-0.5">
                      {processingJob?.totalRows.toLocaleString("en-IN")} rows imported · {processingJob?.errors} errors · {processingJob?.duplicates} duplicates skipped
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={handleReset}
                    className="gap-2 text-[#34d399] hover:text-emerald-300 hover:bg-[#34d399]/10 rounded-xl text-sm"
                  >
                    <RefreshCw className="h-4 w-4" />
                    Import Another
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </motion.div>

      {/* ── Column Mapping Dialog ── */}
      <AnimatePresence>
        {importStep === "mapping" && uploadedFile && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 space-y-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#22d3ee]/15">
                <ArrowLeftRight className="h-4 w-4 text-[#22d3ee]" />
              </div>
              <div>
                <h3 className="text-[#f1f5f9] text-sm font-semibold">Column Mapping</h3>
                <p className="text-[#5a657a] text-xs">
                  Map source columns to KSP Sentinel fields. Auto-mapped columns are pre-filled.
                </p>
              </div>
              <Badge className="bg-[#34d399]/15 text-[#34d399] border-[rgba(52,211,153,0.15)] text-[10px] ml-auto">
                <Sparkles className="h-3 w-3 mr-1" />
                Auto-mapped
              </Badge>
            </div>

            {/* Mapping Table */}
            <ScrollArea className="max-h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-[#5a657a] font-semibold text-xs uppercase tracking-wider">
                      Source Column
                    </TableHead>
                    <TableHead className="text-center text-[#5a657a] font-semibold text-xs uppercase tracking-wider w-10">
                      →
                    </TableHead>
                    <TableHead className="text-[#5a657a] font-semibold text-xs uppercase tracking-wider">
                      Target Field
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {columnMappings.map((mapping) => (
                    <TableRow key={mapping.sourceColumn} className="border-white/5">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Table2 className="h-3.5 w-3.5 text-[#5a657a]" />
                          <span className="text-[#f1f5f9] text-sm">{mapping.sourceColumn}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <ArrowRight className="h-4 w-4 text-[#3d4659] mx-auto" />
                      </TableCell>
                      <TableCell>
                        <Select
                          value={mapping.targetField}
                          onValueChange={(val) => {
                            setColumnMappings((prev) =>
                              prev.map((m) =>
                                m.sourceColumn === mapping.sourceColumn
                                  ? { ...m, targetField: val }
                                  : m
                              )
                            );
                          }}
                        >
                          <SelectTrigger className="w-full bg-white/5 border-white/10 text-[#f1f5f9] h-8 rounded-lg text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-[rgba(15,21,36,0.45)] border-white/10 text-[#f1f5f9] max-h-64">
                            {TARGET_FIELDS.map((f) => (
                              <SelectItem key={f.value} value={f.value}>
                                {f.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Preview Table */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Eye className="h-4 w-4 text-[#5a657a]" />
                <h4 className="text-[#f1f5f9] text-sm font-semibold">Data Preview (First 5 Rows)</h4>
              </div>
              <ScrollArea className="w-full">
                <div className="rounded-xl border border-white/10 overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-white/5 hover:bg-transparent">
                        {MOCK_SOURCE_COLUMNS.filter((_, i) => i < 8).map((col) => (
                          <TableHead key={col} className="text-[#5a657a] text-[10px] uppercase tracking-wider whitespace-nowrap">
                            {col}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {MOCK_PREVIEW_ROWS.slice(0, 5).map((row, i) => (
                        <TableRow key={i} className="border-white/5">
                          {MOCK_SOURCE_COLUMNS.filter((_, ci) => ci < 8).map((col) => (
                            <TableCell key={col} className="text-[#8b97b0] text-xs whitespace-nowrap max-w-[150px] truncate">
                              {row[col as keyof typeof row] || <span className="text-[#3d4659] italic">null</span>}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </ScrollArea>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Validation Results ── */}
      <AnimatePresence>
        {importStep === "validation" && validationResult && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5 space-y-5"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#fbbf24]/15">
                <ClipboardCheck className="h-4 w-4 text-[#fbbf24]" />
              </div>
              <div>
                <h3 className="text-[#f1f5f9] text-sm font-semibold">Validation Results</h3>
                <p className="text-[#5a657a] text-xs">
                  Review validation results before proceeding with import
                </p>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
              <div className="rounded-xl border border-[rgba(52,211,153,0.12)] bg-[#34d399]/5 p-4 text-center">
                <p className="text-[#34d399] text-2xl font-bold">
                  {validationResult.validRows.toLocaleString("en-IN")}
                </p>
                <p className="text-[#5a657a] text-xs mt-1">Valid Rows</p>
              </div>
              <div className="rounded-xl border border-red-500/20 bg-[#f87171]/5 p-4 text-center">
                <p className="text-[#f87171] text-2xl font-bold">
                  {validationResult.invalidRows}
                </p>
                <p className="text-[#5a657a] text-xs mt-1">Invalid Rows</p>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-[#fbbf24]/5 p-4 text-center">
                <p className="text-[#fbbf24] text-2xl font-bold">
                  {validationResult.duplicateRows}
                </p>
                <p className="text-[#5a657a] text-xs mt-1">Duplicates</p>
              </div>
            </div>

            {/* Error List */}
            {validationResult.errors.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-[#f1f5f9] text-sm font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-[#f87171]" />
                  Errors Found ({validationResult.errors.length})
                </h4>
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-1.5">
                    {validationResult.errors.map((err, i) => (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-lg border border-red-500/10 bg-[#f87171]/5 p-3"
                      >
                        <Badge className="bg-[#f87171]/20 text-[#f87171] border-[rgba(248,113,113,0.15)] text-[10px] shrink-0 mt-0.5">
                          Row {err.row}
                        </Badge>
                        <div className="min-w-0">
                          <p className="text-[#f1f5f9] text-sm">{err.message}</p>
                          <p className="text-[#5a657a] text-xs mt-0.5">Column: {err.column}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Import History ── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[#f1f5f9] text-lg font-semibold">Import History</h2>
          <Badge className="bg-white/5 text-[#8b97b0] border-white/10 text-xs">
            {filteredJobs.length} jobs
          </Badge>
        </div>

        {/* Search + Filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3d4659]" />
            <Input
              value={searchHistory}
              onChange={(e) => setSearchHistory(e.target.value)}
              placeholder="Search by filename, ID, or format..."
              className="pl-10 bg-white/5 border-white/10 text-[#f1f5f9] placeholder:text-[#3d4659] h-9 rounded-xl focus-visible:border-cyan-500/50 focus-visible:ring-cyan-500/20"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-[#f1f5f9] h-9 rounded-xl">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent className="bg-[rgba(15,21,36,0.45)] border-white/10 text-[#f1f5f9]">
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="queued">Queued</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="rolled_back">Rolled Back</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* History Table */}
        {filteredJobs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl py-16"
          >
            <Database className="h-8 w-8 text-[#3d4659]" />
            <p className="text-[#5a657a] text-sm">No import jobs found</p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden"
          >
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-[#5a657a] font-semibold text-xs uppercase tracking-wider">ID</TableHead>
                    <TableHead className="text-[#5a657a] font-semibold text-xs uppercase tracking-wider">Filename</TableHead>
                    <TableHead className="text-[#5a657a] font-semibold text-xs uppercase tracking-wider">Format</TableHead>
                    <TableHead className="text-[#5a657a] font-semibold text-xs uppercase tracking-wider">Status</TableHead>
                    <TableHead className="text-[#5a657a] font-semibold text-xs uppercase tracking-wider">Progress</TableHead>
                    <TableHead className="text-[#5a657a] font-semibold text-xs uppercase tracking-wider text-right">Rows</TableHead>
                    <TableHead className="text-[#5a657a] font-semibold text-xs uppercase tracking-wider text-right">Errors</TableHead>
                    <TableHead className="text-[#5a657a] font-semibold text-xs uppercase tracking-wider text-right">Dupes</TableHead>
                    <TableHead className="text-[#5a657a] font-semibold text-xs uppercase tracking-wider">Started</TableHead>
                    <TableHead className="text-[#5a657a] font-semibold text-xs uppercase tracking-wider">Completed</TableHead>
                    <TableHead className="text-[#5a657a] font-semibold text-xs uppercase tracking-wider text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredJobs.map((job, idx) => {
                    const progressPct = job.totalRows > 0
                      ? Math.round((job.processedRows / job.totalRows) * 100)
                      : 0;

                    return (
                      <motion.tr
                        key={job.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: idx * 0.03 }}
                        className="border-white/5 hover:bg-white/5 transition-colors group"
                      >
                        <TableCell className="text-[#8b97b0] text-xs font-mono">{job.id}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FormatIcon format={job.format} className="h-4 w-4 text-[#5a657a] shrink-0" />
                            <span className="text-[#f1f5f9] text-sm font-medium truncate max-w-[200px]">
                              {job.filename}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] border-white/10 text-[#8b97b0] uppercase">
                            {job.format}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <StatusBadge status={job.status} />
                        </TableCell>
                        <TableCell className="min-w-[120px]">
                          {job.status === "processing" ? (
                            <div className="space-y-1">
                              <Progress
                                value={progressPct}
                                className="h-1.5 bg-white/10 [&>div]:bg-[#22d3ee]"
                              />
                              <span className="text-[#5a657a] text-[10px]">{progressPct}%</span>
                            </div>
                          ) : job.status === "completed" ? (
                            <Progress value={100} className="h-1.5 bg-white/10 [&>div]:bg-[#34d399]" />
                          ) : job.status === "failed" ? (
                            <Progress value={progressPct} className="h-1.5 bg-white/10 [&>div]:bg-[#f87171]" />
                          ) : (
                            <div className="h-1.5 rounded-full bg-white/10" />
                          )}
                        </TableCell>
                        <TableCell className="text-[#f1f5f9] text-sm text-right font-mono">
                          {job.totalRows > 0 ? (
                            <>
                              <span>{job.processedRows.toLocaleString("en-IN")}</span>
                              <span className="text-[#3d4659]"> / {job.totalRows.toLocaleString("en-IN")}</span>
                            </>
                          ) : (
                            <span className="text-[#3d4659]">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={job.errors > 0 ? "text-[#f87171] text-sm" : "text-[#3d4659] text-sm"}>
                            {job.errors || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className={job.duplicates > 0 ? "text-[#fbbf24] text-sm" : "text-[#3d4659] text-sm"}>
                            {job.duplicates || "—"}
                          </span>
                        </TableCell>
                        <TableCell className="text-[#8b97b0] text-xs">
                          {new Date(job.startedAt).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </TableCell>
                        <TableCell className="text-[#8b97b0] text-xs">
                          {job.completedAt
                            ? new Date(job.completedAt).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : <span className="text-[#3d4659]">—</span>}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {job.status === "failed" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  addNotification({
                                    title: "Retry Queued",
                                    message: `Re-queuing ${job.filename}`,
                                    type: "info",
                                    read: false,
                                  });
                                }}
                                className="h-7 w-7 p-0 text-[#8b97b0] hover:text-[#22d3ee] hover:bg-[#22d3ee]/10"
                                title="Retry"
                              >
                                <RefreshCw className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            {job.status === "completed" && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  addNotification({
                                    title: "Rollback Initiated",
                                    message: `Rolling back import ${job.id}`,
                                    type: "warning",
                                    read: false,
                                  });
                                }}
                                className="h-7 w-7 p-0 text-[#8b97b0] hover:text-[#fbbf24] hover:bg-[#fbbf24]/10"
                                title="Rollback"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 text-[#8b97b0] hover:text-[#f1f5f9] hover:bg-white/10"
                              title="View Details"
                            >
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </motion.tr>
                    );
                  })}
                </TableBody>
              </Table>
            </ScrollArea>
          </motion.div>
        )}
      </div>
    </div>
  );
}