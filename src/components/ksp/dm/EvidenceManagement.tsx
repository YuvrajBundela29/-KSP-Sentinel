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
  Upload,
  FileImage,
  FileVideo,
  FileAudio,
  FileText,
  Camera,
  File,
  Grid3X3,
  LayoutList,
  Table as TableIcon,
  Clock,
  Eye,
  Link2,
  Trash2,
  Brain,
  Loader2,
  CheckCircle2,
  XCircle,
  Filter,
  FileDown,
  FileSpreadsheet,
  FileJson,
  Printer,
  Sparkles,
  Type,
  MapPin,
  Phone,
  Calendar,
  Car,
  Landmark,
  Shield,
  Sword,
  Box,
  ChevronDown,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { loadCrimeData } from "@/lib/data";
import type {
  EvidenceItem,
  EvidenceViewMode,
  OCRExtractionResult,
} from "@/lib/types";
import {
  exportToCSV,
  exportToJSON,
  exportToExcel,
  exportToPrint,
  formatBytes,
  generateId,
} from "@/lib/export-utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Constants ───────────────────────────────────────────────────────
const EVIDENCE_TYPE_COLORS: Record<EvidenceItem["type"], { bg: string; icon: React.ReactNode; label: string }> = {
  photo: {
    bg: "from-blue-600/40 to-blue-800/20",
    icon: <FileImage className="h-6 w-6 text-[#22d3ee]" />,
    label: "Photo",
  },
  video: {
    bg: "from-purple-600/40 to-purple-800/20",
    icon: <FileVideo className="h-6 w-6 text-[#818cf8]" />,
    label: "Video",
  },
  audio: {
    bg: "from-orange-600/40 to-orange-800/20",
    icon: <FileAudio className="h-6 w-6 text-[#fbbf24]" />,
    label: "Audio",
  },
  pdf: {
    bg: "from-red-600/40 to-red-800/20",
    icon: <FileText className="h-6 w-6 text-[#f87171]" />,
    label: "PDF",
  },
  cctv: {
    bg: "from-emerald-600/40 to-emerald-800/20",
    icon: <Camera className="h-6 w-6 text-[#34d399]" />,
    label: "CCTV",
  },
  document: {
    bg: "from-cyan-600/40 to-cyan-800/20",
    icon: <File className="h-6 w-6 text-[#22d3ee]" />,
    label: "Document",
  },
};

const STATUS_STYLES: Record<EvidenceItem["status"], string> = {
  processing: "bg-[rgba(251,191,36,0.12)] text-[#fbbf24] border-[rgba(251,191,36,0.15)]",
  ready: "bg-[rgba(52,211,153,0.12)] text-[#34d399] border-[rgba(52,211,153,0.15)]",
  archived: "bg-[rgba(255,255,255,0.06)] text-[#8b97b0] border-[rgba(255,255,255,0.08)]",
};

const ACCEPTED_TYPES = [
  { icon: <FileImage className="h-4 w-4" />, label: "Photos", ext: "JPG, PNG, WEBP" },
  { icon: <FileVideo className="h-4 w-4" />, label: "Videos", ext: "MP4, AVI, MOV" },
  { icon: <FileAudio className="h-4 w-4" />, label: "Audio", ext: "MP3, WAV, AAC" },
  { icon: <FileText className="h-4 w-4" />, label: "PDF", ext: "PDF" },
  { icon: <Camera className="h-4 w-4" />, label: "CCTV", ext: "MKV, AVI" },
  { icon: <File className="h-4 w-4" />, label: "Documents", ext: "DOC, DOCX, TXT" },
];

// ─── Generate mock evidence from crime data ──────────────────────────
function generateMockEvidence(): EvidenceItem[] {
  return [
    {
      id: "EV-001",
      firId: "FIR-2024-KA-0001",
      type: "cctv",
      filename: "cctv_mysuru_sayanara_20240115.mp4",
      size: 52428800,
      uploadedAt: "2024-01-16T09:00:00Z",
      uploadedBy: "IPS-101",
      tags: ["cctv", "chain-snatching", "bike", "mysuru"],
      aiSummary: "CCTV footage shows two individuals on a motorcycle approaching victim from behind on a deserted road near Sayanara Gardens. The pillion rider can be seen grabbing the victim's chain before the bike speeds away.",
      linkedAccused: ["A001", "A002"],
      linkedVictim: "Lakshmi Devi",
      linkedVehicle: "V001",
      status: "ready",
    },
    {
      id: "EV-002",
      firId: "FIR-2024-KA-0004",
      type: "pdf",
      filename: "bank_statement_vikram_singh.pdf",
      size: 2097152,
      uploadedAt: "2024-03-12T11:30:00Z",
      uploadedBy: "IPS-104",
      tags: ["financial", "bank-statement", "cyber-fraud", "upi"],
      aiSummary: "Bank statement shows multiple UPI transfers totaling ₹8,50,000 received over 3 days from the victim's account. Transactions were routed through intermediate accounts before reaching the primary holder's account.",
      linkedAccused: ["A008", "A009"],
      linkedVictim: "Dr. Priya Nair",
      linkedVehicle: "",
      status: "ready",
    },
    {
      id: "EV-003",
      firId: "FIR-2024-KA-0005",
      type: "photo",
      filename: "crime_scene_hampankatta_20240325.jpg",
      size: 4194304,
      uploadedAt: "2024-03-26T06:00:00Z",
      uploadedBy: "IPS-105",
      tags: ["crime-scene", "jewellery-heist", "mangaluru", "break-in"],
      aiSummary: "Crime scene photographs show rear wall breach point with tool marks consistent with a power drill. Safe compartment was found open with cutting marks. Footwear impressions recovered from dust near the entry point.",
      linkedAccused: ["A010", "A011"],
      linkedVictim: "Krishna Bhat & Sons Jewellers",
      linkedVehicle: "V006",
      status: "ready",
    },
    {
      id: "EV-004",
      firId: "FIR-2024-KA-0007",
      type: "cctv",
      filename: "atm_footage_vidyanagar_20240418.avi",
      size: 104857600,
      uploadedAt: "2024-04-19T08:00:00Z",
      uploadedBy: "IPS-106",
      tags: ["cctv", "atm", "carjacking", "armed", "hubballi"],
      aiSummary: "ATM CCTV footage captures two suspects approaching victim near ATM kiosk at 03:00 AM. One suspect appears to brandish a firearm. The victim is seen surrendering vehicle keys before suspects flee in the victim's Hyundai i20 and a second vehicle.",
      linkedAccused: ["A005", "A006"],
      linkedVictim: "Mallikarjun Patil",
      linkedVehicle: "V003",
      status: "ready",
    },
    {
      id: "EV-005",
      firId: "FIR-2024-KA-0009",
      type: "video",
      filename: "witness_mobile_kadri_20240515.mp4",
      size: 15728640,
      uploadedAt: "2024-05-16T10:00:00Z",
      uploadedBy: "IPS-105",
      tags: ["video", "witness", "dacoity", "armed", "mangaluru"],
      aiSummary: "Mobile phone video recorded by a passerby shows three masked individuals fleeing the jewellery shop on Kadri Temple Road. One suspect is seen carrying a bag. Partial registration plate of the getaway vehicle (KA-01) is visible.",
      linkedAccused: ["A010", "A011", "A012"],
      linkedVictim: "Lakshmi Gold House",
      linkedVehicle: "V006",
      status: "ready",
    },
    {
      id: "EV-006",
      firId: "FIR-2024-KA-0008",
      type: "document",
      filename: "whatsapp_screenshots_scam.docx",
      size: 3145728,
      uploadedAt: "2024-05-04T14:00:00Z",
      uploadedBy: "IPS-104",
      tags: ["digital-evidence", "whatsapp", "lottery-scam", "cyber-fraud"],
      aiSummary: "WhatsApp chat screenshots show the accused impersonating a lottery official. The victim was convinced of a ₹25 lakh lottery win and instructed to pay processing fees via bank transfer. Multiple messages show the grooming process over 2 weeks.",
      linkedAccused: ["A008"],
      linkedVictim: "Sunil Kumar Gupta",
      linkedVehicle: "",
      status: "ready",
    },
    {
      id: "EV-007",
      firId: "FIR-2024-KA-0013",
      type: "photo",
      filename: "skylight_entry_belagavi_20240805.jpg",
      size: 3670016,
      uploadedAt: "2024-08-06T07:30:00Z",
      uploadedBy: "IPS-108",
      tags: ["crime-scene", "break-in", "skylight", "belagavi", "gas-cutter"],
      aiSummary: "Photographs document the skylight entry point on the roof of Venkateshwara Jewellers. Metal cut marks on the skylight frame are consistent with gas cutting equipment. Interior photos show the open safe with tool residue.",
      linkedAccused: ["A010", "A012"],
      linkedVictim: "Venkateshwara Jewellers",
      linkedVehicle: "V004",
      status: "ready",
    },
    {
      id: "EV-008",
      firId: "FIR-2024-KA-0017",
      type: "cctv",
      filename: "railway_cctv_kalaburagi_20241018.mp4",
      size: 83886080,
      uploadedAt: "2024-10-19T05:00:00Z",
      uploadedBy: "IPS-111",
      tags: ["cctv", "railway", "drug-trafficking", "kalaburagi", "ndps"],
      aiSummary: "Railway platform CCTV footage shows the accused exiting the Goa-Bengaluru express at Kalaburagi station carrying a modified sports bag. RPF personnel are seen intercepting the suspect. The bag was found to contain 500g MDMA and 200g Cocaine concealed in false compartments.",
      linkedAccused: ["A011"],
      linkedVictim: "State of Karnataka",
      linkedVehicle: "V004",
      status: "ready",
    },
    {
      id: "EV-009",
      firId: "FIR-2024-KA-0012",
      type: "pdf",
      filename: "fake_aadhaar_identity_theft.pdf",
      size: 1572864,
      uploadedAt: "2024-07-12T16:00:00Z",
      uploadedBy: "IPS-107",
      tags: ["identity-theft", "fake-document", "aadhaar", "cyber-fraud"],
      aiSummary: "Document contains a forged Aadhaar card used to open fraudulent bank accounts. AI analysis confirms document tampering in the photo area and address field. The fake identity was used to secure loans totaling ₹3,50,000 from multiple banks.",
      linkedAccused: ["A009"],
      linkedVictim: "Kiran Prasad",
      linkedVehicle: "",
      status: "processing",
    },
    {
      id: "EV-010",
      firId: "FIR-2024-KA-0020",
      type: "audio",
      filename: "emergency_call_jayanagar_20250220.wav",
      size: 5242880,
      uploadedAt: "2024-02-21T00:30:00Z",
      uploadedBy: "IPS-104",
      tags: ["audio", "emergency-call", "robbery", "armed", "bengaluru"],
      aiSummary: "Emergency 112 call recording from a security guard at Nagarathna Jewellers. Caller reports three masked armed men with iron rods. Background sounds include glass breaking and shouting. Call duration: 2 minutes 34 seconds.",
      linkedAccused: ["A010", "A011", "A012"],
      linkedVictim: "Nagarathna Jewellers",
      linkedVehicle: "V006",
      status: "archived",
    },
  ];
}

// ─── Mock OCR extraction ─────────────────────────────────────────────
function simulateOCR(): OCRExtractionResult {
  return {
    text: "COMPLAINT REGISTERED AT HSR LAYOUT POLICE STATION\nCase FIR-2024-KA-0004 dated 10-Mar-2024\nComplainant: Dr. Priya Nair, Age 41, Female, Resident of HSR Layout, Bengaluru\nAccused 1: Vikram Singh, Phone: 9876543210\nAccused 2: Neha Sharma, Phone: 9876543211\nVehicle: None used\nBank Account: 1234567890123456 (SBI)\nIPC Sections: 420, 66C, 66D of IPC and IT Act 2000\nLocation: HSR Layout, Bengaluru Urban District\nDate of Incident: 08-Mar-2024 to 10-Mar-2024\nAmount: Rs. 8,50,000 via UPI\nWeapon: Digital - Phishing email, fake bank website\nTimeline: 08-Mar phishing email sent → 09-Mar victim clicked link → 09-Mar UPI consent obtained → 10-Mar multiple transfers executed → 10-Mar complaint filed",
    entities: {
      names: ["Dr. Priya Nair", "Vikram Singh", "Neha Sharma"],
      addresses: ["HSR Layout, Bengaluru"],
      phones: ["9876543210", "9876543211"],
      vehicles: [],
      accounts: ["1234567890123456 (SBI)"],
      ipcSections: ["420", "66C", "66D", "IT Act 2000"],
      dates: ["10-Mar-2024", "08-Mar-2024", "09-Mar-2024"],
      locations: ["HSR Layout, Bengaluru Urban District"],
      weapons: ["Digital - Phishing email, fake bank website"],
      evidence: ["Phishing email", "Fake bank website", "UPI transaction records"],
      timeline: [
        { event: "Phishing email sent to victim", date: "08-Mar-2024" },
        { event: "Victim clicked malicious link", date: "09-Mar-2024" },
        { event: "UPI consent obtained through fake bank portal", date: "09-Mar-2024" },
        { event: "Multiple UPI transfers executed (₹8,50,000)", date: "10-Mar-2024" },
        { event: "Complaint filed at HSR Layout PS", date: "10-Mar-2024" },
      ],
    },
    confidence: 87,
  };
}

// ─── Sub-components ──────────────────────────────────────────────────

function EvidenceTypeBadge({ type }: { type: EvidenceItem["type"] }) {
  const info = EVIDENCE_TYPE_COLORS[type];
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-medium text-[#8b97b0]">
      {info.icon}
      {info.label}
    </span>
  );
}

function StatusBadge({ status }: { status: EvidenceItem["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
        STATUS_STYLES[status]
      }`}
    >
      {status === "processing" && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
      {status === "ready" && <CheckCircle2 className="mr-1 h-3 w-3" />}
      {status === "archived" && <XCircle className="mr-1 h-3 w-3" />}
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Main Component ──────────────────────────────────────────────────
export default function EvidenceManagement() {
  const {
    crimeData,
    setCrimeData,
    evidenceItems,
    addEvidenceItem,
    addAuditLog,
    addNotification,
    setView,
    setSelectedFirId,
  } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<EvidenceViewMode>("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Upload state
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadingType, setUploadingType] = useState<EvidenceItem["type"] | null>(null);

  // OCR state
  const [showOCRDialog, setShowOCRDialog] = useState(false);
  const [ocrFileSelected, setOcrFileSelected] = useState(false);
  const [ocrProcessing, setOcrProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrResult, setOcrResult] = useState<OCRExtractionResult | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const ocrFileInputRef = useRef<HTMLInputElement>(null);

  // ── Initialize ──
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
      // Seed mock evidence if store is empty
      if (evidenceItems.length === 0) {
        const mocks = generateMockEvidence();
        for (const item of mocks) {
          addEvidenceItem(item);
        }
      }
      setLoading(false);
    }
    init();
  }, [crimeData, setCrimeData, evidenceItems.length, addEvidenceItem]);

  // ── All evidence (merged mock + store additions) ──
  const allEvidence = useMemo(() => {
    if (evidenceItems.length > 0) return evidenceItems;
    return generateMockEvidence();
  }, [evidenceItems]);

  // ── Filtered evidence ──
  const filteredEvidence = useMemo(() => {
    let items = allEvidence;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (e) =>
          e.filename.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q)) ||
          e.firId.toLowerCase().includes(q) ||
          e.aiSummary.toLowerCase().includes(q)
      );
    }

    if (filterType !== "all") {
      items = items.filter((e) => e.type === filterType);
    }

    if (filterStatus !== "all") {
      items = items.filter((e) => e.status === filterStatus);
    }

    return items;
  }, [allEvidence, searchQuery, filterType, filterStatus]);

  // ── Handlers ──
  const simulateUpload = useCallback(
    (type: EvidenceItem["type"]) => {
      setUploadingType(type);
      setUploadProgress(0);

      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev === null || prev >= 100) {
            clearInterval(interval);

            // Create mock evidence item
            const firs = crimeData?.firs ?? [];
            const randomFir = firs[Math.floor(Math.random() * firs.length)];
            const newItem: EvidenceItem = {
              id: generateId("EV"),
              firId: randomFir?.fir_id ?? "FIR-2024-KA-0001",
              type,
              filename: `uploaded_${type}_${Date.now().toString(36)}.${type === "photo" ? "jpg" : type === "video" ? "mp4" : type === "audio" ? "mp3" : type === "pdf" ? "pdf" : type === "cctv" ? "avi" : "docx"}`,
              size: Math.floor(Math.random() * 100000000) + 1000000,
              uploadedAt: new Date().toISOString(),
              uploadedBy: "Current User",
              tags: [type, "uploaded", "new"],
              aiSummary: `AI analysis pending for this ${type} file. The system will automatically extract relevant entities, detect faces, and cross-reference with existing case data once processing is complete.`,
              linkedAccused: randomFir?.accused ?? [],
              linkedVictim: randomFir?.victim?.name ?? "Unknown",
              linkedVehicle: randomFir?.vehicle_used ?? "",
              status: "processing",
            };

            addEvidenceItem(newItem);
            addAuditLog({
              user: "Current User",
              role: "investigator",
              action: "upload_evidence",
              entity: "evidence",
              entityId: newItem.id,
              oldValue: "",
              newValue: newItem.filename,
              status: "success",
            });
            addNotification({
              title: "Evidence Uploaded",
              message: `${newItem.filename} uploaded and queued for AI processing`,
              type: "info",
              read: false,
            });

            setTimeout(() => {
              setUploadProgress(null);
              setUploadingType(null);
            }, 500);

            return null;
          }
          return prev + Math.random() * 15 + 5;
        });
      }, 200);
    },
    [crimeData, addEvidenceItem, addAuditLog, addNotification]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const types: EvidenceItem["type"][] = ["photo", "video", "audio", "pdf", "cctv", "document"];
      const randomType = types[Math.floor(Math.random() * types.length)];
      simulateUpload(randomType);
    },
    [simulateUpload]
  );

  const handleOCRUpload = useCallback(() => {
    setOcrFileSelected(true);
  }, []);

  const handleOCRProcess = useCallback(() => {
    setOcrProcessing(true);
    setOcrProgress(0);

    const interval = setInterval(() => {
      setOcrProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setOcrProcessing(false);
          setOcrResult(simulateOCR());
          addNotification({
            title: "OCR Processing Complete",
            message: "Document entities extracted with 87% confidence",
            type: "success",
            read: false,
          });
          return 100;
        }
        return prev + Math.random() * 12 + 3;
      });
    }, 250);
  }, [addNotification]);

  const handleOCRApprove = useCallback(() => {
    if (!ocrResult) return;
    addAuditLog({
      user: "Current User",
      role: "investigator",
      action: "ocr_approve",
      entity: "evidence",
      entityId: generateId("OCR"),
      oldValue: "",
      newValue: `${ocrResult.entities.names.length} entities extracted`,
      status: "success",
    });
    addNotification({
      title: "OCR Results Approved",
      message: "Extracted entities saved to case file",
      type: "success",
      read: false,
    });
    setShowOCRDialog(false);
    setOcrResult(null);
    setOcrFileSelected(false);
    setOcrProgress(0);
  }, [ocrResult, addAuditLog, addNotification]);

  const handleOCRReject = useCallback(() => {
    setShowOCRDialog(false);
    setOcrResult(null);
    setOcrFileSelected(false);
    setOcrProgress(0);
  }, []);

  const handleViewEvidence = useCallback(
    (item: EvidenceItem) => {
      setSelectedFirId(item.firId);
      setView("dm-fir");
    },
    [setSelectedFirId, setView]
  );

  const handleLinkFIR = useCallback(
    (firId: string) => {
      setSelectedFirId(firId);
      setView("dm-fir");
    },
    [setSelectedFirId, setView]
  );

  const handleExport = useCallback(
    (format: "csv" | "json" | "excel" | "print") => {
      const data = filteredEvidence.map((e) => ({
        ID: e.id,
        Filename: e.filename,
        Type: e.type,
        "FIR ID": e.firId,
        Size: formatBytes(e.size),
        "Uploaded At": new Date(e.uploadedAt).toLocaleString("en-IN"),
        Tags: e.tags.join(", "),
        "AI Summary": e.aiSummary,
        "Linked Accused": e.linkedAccused.join(", "),
        "Linked Victim": e.linkedVictim,
        Status: e.status,
      }));

      switch (format) {
        case "csv":
          exportToCSV(data, "evidence_export");
          break;
        case "json":
          exportToJSON(data, "evidence_export");
          break;
        case "excel":
          exportToExcel(data, "evidence_export");
          break;
        case "print":
          exportToPrint("evidence-print-area");
          break;
      }

      addAuditLog({
        user: "Current User",
        role: "investigator",
        action: `export_evidence_${format}`,
        entity: "evidence",
        entityId: "-",
        oldValue: "",
        newValue: `${filteredEvidence.length} items`,
        status: "success",
      });
    },
    [filteredEvidence, addAuditLog]
  );

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-64 bg-white/5" />
        <Skeleton className="h-48 w-full rounded-2xl bg-white/5" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Entity display component for OCR ──
  function EntitySection({
    icon,
    label,
    items,
    color,
  }: {
    icon: React.ReactNode;
    label: string;
    items: string[];
    color: string;
  }) {
    return (
      <div className="rounded-xl bg-white/5 p-3">
        <div className="mb-2 flex items-center gap-2">
          <span className={color}>{icon}</span>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#5a657a]">
            {label}
          </span>
          <Badge variant="outline" className="ml-auto border-white/10 text-[10px] text-[#8b97b0]">
            {items.length}
          </Badge>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span
              key={i}
              className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs text-[#f1f5f9]"
            >
              {item}
            </span>
          ))}
          {items.length === 0 && (
            <span className="text-xs text-[#3d4659] italic">None detected</span>
          )}
        </div>
      </div>
    );
  }

  // ─── Render ──
  return (
    <div className="space-y-6 p-6" id="evidence-print-area">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f1f5f9]">Evidence Management</h1>
          <p className="mt-1 text-sm text-[#5a657a]">
            Upload, process, and manage digital evidence linked to FIRs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="border-white/10 bg-white/5 text-[#8b97b0] hover:bg-white/10 hover:text-[#f1f5f9]">
                <FileDown className="mr-2 h-4 w-4" />
                Export
                <ChevronDown className="ml-2 h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="border-[rgba(255,255,255,0.06)] bg-[rgba(15,21,36,0.45)]">
              <DropdownMenuItem onClick={() => handleExport("csv")} className="text-[#8b97b0] focus:text-[#f1f5f9]">
                <FileDown className="mr-2 h-4 w-4" /> CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("json")} className="text-[#8b97b0] focus:text-[#f1f5f9]">
                <FileJson className="mr-2 h-4 w-4" /> JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("excel")} className="text-[#8b97b0] focus:text-[#f1f5f9]">
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={() => handleExport("print")} className="text-[#8b97b0] focus:text-[#f1f5f9]">
                <Printer className="mr-2 h-4 w-4" /> Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            size="sm"
            className="bg-[#34d399] text-white hover:bg-[#2bc48a]"
            onClick={() => setShowOCRDialog(true)}
          >
            <Brain className="mr-2 h-4 w-4" />
            OCR Ingestion
          </Button>
        </div>
      </div>

      {/* Upload Zone */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] p-6 transition-colors"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
      >
        {uploadProgress !== null ? (
          <div className="flex flex-col items-center gap-4 py-4">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[rgba(52,211,153,0.12)]"
            >
              {uploadingType && EVIDENCE_TYPE_COLORS[uploadingType]?.icon}
            </motion.div>
            <div className="w-full max-w-md">
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="text-[#f1f5f9]">Uploading {uploadingType}...</span>
                <span className="text-[#34d399] font-medium">{Math.min(Math.round(uploadProgress), 100)}%</span>
              </div>
              <Progress
                value={Math.min(uploadProgress, 100)}
                className="h-2 bg-white/10 [&>div]:rounded-full [&>div]:bg-[#34d399]"
              />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <motion.div
              className={`flex h-16 w-16 items-center justify-center rounded-2xl transition-colors ${
                isDragOver ? "bg-[#34d399]/30" : "bg-white/5"
              }`}
              whileHover={{ scale: 1.05 }}
            >
              <Upload className={`h-8 w-8 ${isDragOver ? "text-[#34d399]" : "text-[#3d4659]"}`} />
            </motion.div>
            <div className="text-center">
              <p className="text-sm font-medium text-[#f1f5f9]">
                Drag & drop evidence files here
              </p>
              <p className="mt-1 text-xs text-[#5a657a]">
                or click to browse • Max 500MB per file
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-3">
              {ACCEPTED_TYPES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => {
                    const typeMap: Record<string, EvidenceItem["type"]> = {
                      Photos: "photo",
                      Videos: "video",
                      Audio: "audio",
                      PDF: "pdf",
                      CCTV: "cctv",
                      Documents: "document",
                    };
                    simulateUpload(typeMap[t.label]);
                  }}
                  className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-[#8b97b0] transition-colors hover:border-[rgba(52,211,153,0.15)] hover:bg-[rgba(52,211,153,0.08)] hover:text-[#34d399]"
                >
                  {t.icon}
                  <span>{t.label}</span>
                  <span className="text-[10px] text-[#3d4659]">{t.ext}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      {/* Search, Filter, View Mode */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3d4659]" />
          <Input
            placeholder="Search by filename, tag, FIR ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-white/10 bg-white/5 pl-10 text-[#f1f5f9] placeholder-[#3d4659] focus:border-[rgba(52,211,153,0.3)]"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-[140px] border-white/10 bg-white/5 text-[#8b97b0]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent className="border-[rgba(255,255,255,0.06)] bg-[rgba(15,21,36,0.45)]">
            <SelectItem value="all" className="text-[#8b97b0]">All Types</SelectItem>
            {Object.entries(EVIDENCE_TYPE_COLORS).map(([key, val]) => (
              <SelectItem key={key} value={key} className="text-[#8b97b0]">
                {val.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-[140px] border-white/10 bg-white/5 text-[#8b97b0]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="border-[rgba(255,255,255,0.06)] bg-[rgba(15,21,36,0.45)]">
            <SelectItem value="all" className="text-[#8b97b0]">All Status</SelectItem>
            <SelectItem value="processing" className="text-[#8b97b0]">Processing</SelectItem>
            <SelectItem value="ready" className="text-[#8b97b0]">Ready</SelectItem>
            <SelectItem value="archived" className="text-[#8b97b0]">Archived</SelectItem>
          </SelectContent>
        </Select>
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as EvidenceViewMode)}>
          <TabsList className="border-white/10 bg-white/5">
            <TabsTrigger value="grid" className="data-[state=active]:bg-[rgba(52,211,153,0.12)] data-[state=active]:text-[#34d399] text-[#5a657a]">
              <Grid3X3 className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="card" className="data-[state=active]:bg-[rgba(52,211,153,0.12)] data-[state=active]:text-[#34d399] text-[#5a657a]">
              <LayoutList className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="table" className="data-[state=active]:bg-[rgba(52,211,153,0.12)] data-[state=active]:text-[#34d399] text-[#5a657a]">
              <TableIcon className="h-4 w-4" />
            </TabsTrigger>
            <TabsTrigger value="timeline" className="data-[state=active]:bg-[rgba(52,211,153,0.12)] data-[state=active]:text-[#34d399] text-[#5a657a]">
              <Clock className="h-4 w-4" />
            </TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="ml-auto text-xs text-[#3d4659]">
          {filteredEvidence.length} item{filteredEvidence.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* View Modes */}
      <AnimatePresence mode="wait">
        {filteredEvidence.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/5 py-16"
          >
            <File className="mb-4 h-12 w-12 text-[#3d4659]" />
            <p className="text-sm font-medium text-[#8b97b0]">No evidence found</p>
            <p className="mt-1 text-xs text-[#3d4659]">
              Try adjusting your search or filters
            </p>
          </motion.div>
        ) : viewMode === "grid" ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
          >
            {filteredEvidence.map((item, idx) => {
              const typeInfo = EVIDENCE_TYPE_COLORS[item.type];
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/[0.07]"
                >
                  {/* Thumbnail */}
                  <div
                    className={`relative flex h-36 items-center justify-center bg-gradient-to-br ${typeInfo.bg}`}
                  >
                    <div className="scale-150 opacity-30">{typeInfo.icon}</div>
                    <div className="absolute left-3 top-3">
                      <StatusBadge status={item.status} />
                    </div>
                    <div className="absolute bottom-3 right-3 text-[10px] text-white/60">
                      {formatBytes(item.size)}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="space-y-3 p-4">
                    <div>
                      <p className="truncate text-sm font-medium text-[#f1f5f9]" title={item.filename}>
                        {item.filename}
                      </p>
                      <button
                        onClick={() => handleLinkFIR(item.firId)}
                        className="mt-1 text-xs text-[#34d399] hover:text-[#6ee7b7] hover:underline"
                      >
                        {item.firId}
                      </button>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1">
                      {item.tags.slice(0, 3).map((tag) => (
                        <Badge
                          key={tag}
                          variant="outline"
                          className="border-white/10 text-[10px] text-[#8b97b0]"
                        >
                          {tag}
                        </Badge>
                      ))}
                      {item.tags.length > 3 && (
                        <Badge variant="outline" className="border-white/10 text-[10px] text-[#3d4659]">
                          +{item.tags.length - 3}
                        </Badge>
                      )}
                    </div>

                    {/* AI Summary */}
                    <p className="line-clamp-2 text-xs leading-relaxed text-[#5a657a]">
                      {item.aiSummary}
                    </p>

                    {/* Actions */}
                    <div className="flex items-center gap-1 border-t border-white/5 pt-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[#5a657a] hover:text-[#34d399]"
                        onClick={() => handleViewEvidence(item)}
                      >
                        <Eye className="mr-1 h-3.5 w-3.5" />
                        View
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[#5a657a] hover:text-[#22d3ee]"
                        onClick={() => handleLinkFIR(item.firId)}
                      >
                        <Link2 className="mr-1 h-3.5 w-3.5" />
                        FIR
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="ml-auto h-7 px-2 text-[#5a657a] hover:text-[#f87171]"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : viewMode === "card" ? (
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 gap-4 lg:grid-cols-2"
          >
            {filteredEvidence.map((item, idx) => {
              const typeInfo = EVIDENCE_TYPE_COLORS[item.type];
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="group overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all hover:border-white/20"
                >
                  <div className="flex">
                    {/* Left: Thumbnail */}
                    <div
                      className={`flex w-40 shrink-0 items-center justify-center bg-gradient-to-br ${typeInfo.bg}`}
                    >
                      <div className="scale-[2] opacity-20">{typeInfo.icon}</div>
                    </div>

                    {/* Right: Details */}
                    <div className="flex-1 p-4">
                      <div className="mb-2 flex items-start justify-between">
                        <div>
                          <p className="text-sm font-semibold text-[#f1f5f9]" title={item.filename}>
                            {item.filename}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            <EvidenceTypeBadge type={item.type} />
                            <StatusBadge status={item.status} />
                          </div>
                        </div>
                        <span className="text-xs text-[#3d4659]">{formatBytes(item.size)}</span>
                      </div>

                      <div className="mb-2 flex flex-wrap gap-1">
                        {item.tags.map((tag) => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="border-white/10 text-[10px] text-[#8b97b0]"
                          >
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <p className="mb-3 line-clamp-3 text-xs leading-relaxed text-[#5a657a]">
                        {item.aiSummary}
                      </p>

                      {/* Linked entities */}
                      <div className="mb-3 grid grid-cols-3 gap-2 text-[11px]">
                        <div>
                          <span className="text-[#3d4659]">FIR</span>
                          <button
                            onClick={() => handleLinkFIR(item.firId)}
                            className="block truncate text-[#34d399] hover:underline"
                          >
                            {item.firId}
                          </button>
                        </div>
                        <div>
                          <span className="text-[#3d4659]">Accused</span>
                          <p className="truncate text-[#8b97b0]">{item.linkedAccused.join(", ") || "—"}</p>
                        </div>
                        <div>
                          <span className="text-[#3d4659]">Victim</span>
                          <p className="truncate text-[#8b97b0]">{item.linkedVictim || "—"}</p>
                        </div>
                      </div>

                      {item.linkedVehicle && (
                        <div className="mb-3 text-[11px]">
                          <span className="text-[#3d4659]">Vehicle: </span>
                          <span className="text-[#8b97b0]">{item.linkedVehicle}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1 border-t border-white/5 pt-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[#5a657a] hover:text-[#34d399]"
                          onClick={() => handleViewEvidence(item)}
                        >
                          <Eye className="mr-1 h-3.5 w-3.5" />
                          View
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-2 text-[#5a657a] hover:text-[#22d3ee]"
                          onClick={() => handleLinkFIR(item.firId)}
                        >
                          <Link2 className="mr-1 h-3.5 w-3.5" />
                          Link FIR
                        </Button>
                        <span className="ml-auto text-[10px] text-[#3d4659]">
                          {new Date(item.uploadedAt).toLocaleDateString("en-IN")}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        ) : viewMode === "table" ? (
          <motion.div
            key="table"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
          >
            <Table>
              <TableHeader>
                <TableRow className="border-white/10 hover:bg-transparent">
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-[#5a657a]">ID</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-[#5a657a]">Filename</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-[#5a657a]">Type</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-[#5a657a]">FIR</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-[#5a657a]">Size</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-[#5a657a]">Uploaded</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-[#5a657a]">Tags</TableHead>
                  <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-[#5a657a]">Status</TableHead>
                  <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-[#5a657a]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvidence.map((item) => (
                  <TableRow
                    key={item.id}
                    className="border-white/5 transition-colors hover:bg-white/5"
                  >
                    <TableCell className="font-mono text-xs text-[#8b97b0]">{item.id}</TableCell>
                    <TableCell className="max-w-[200px]">
                      <p className="truncate text-sm text-[#f1f5f9]" title={item.filename}>
                        {item.filename}
                      </p>
                    </TableCell>
                    <TableCell>
                      <EvidenceTypeBadge type={item.type} />
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleLinkFIR(item.firId)}
                        className="font-mono text-xs text-[#34d399] hover:underline"
                      >
                        {item.firId}
                      </button>
                    </TableCell>
                    <TableCell className="text-xs text-[#8b97b0]">{formatBytes(item.size)}</TableCell>
                    <TableCell className="text-xs text-[#8b97b0]">
                      {new Date(item.uploadedAt).toLocaleDateString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.tags.slice(0, 2).map((t) => (
                          <Badge key={t} variant="outline" className="border-white/10 text-[10px] text-[#5a657a]">
                            {t}
                          </Badge>
                        ))}
                        {item.tags.length > 2 && (
                          <span className="text-[10px] text-[#3d4659]">+{item.tags.length - 2}</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={item.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-[#5a657a] hover:text-[#34d399]"
                          onClick={() => handleViewEvidence(item)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-[#5a657a] hover:text-[#22d3ee]"
                          onClick={() => handleLinkFIR(item.firId)}
                        >
                          <Link2 className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 text-[#5a657a] hover:text-[#f87171]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </motion.div>
        ) : (
          /* Timeline View */
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="relative space-y-0 pl-8"
          >
            {/* Vertical line */}
            <div className="absolute bottom-0 left-3 top-0 w-px bg-gradient-to-b from-emerald-500/50 via-emerald-500/20 to-transparent" />

            {[...filteredEvidence]
              .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
              .map((item, idx) => {
                const typeInfo = EVIDENCE_TYPE_COLORS[item.type];
                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.06 }}
                    className="relative pb-8"
                  >
                    {/* Dot */}
                    <div className={`absolute -left-5 top-2 flex h-6 w-6 items-center justify-center rounded-full border-2 border-[rgba(15,21,36,0.45)] bg-gradient-to-br ${typeInfo.bg}`}>
                      <div className="h-2 w-2 rounded-full bg-[#34d399]" />
                    </div>

                    <div className="rounded-2xl border border-white/10 bg-white/5 p-4 transition-all hover:border-white/20 hover:bg-white/[0.07]">
                      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#3d4659]">
                              {new Date(item.uploadedAt).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                            <EvidenceTypeBadge type={item.type} />
                            <StatusBadge status={item.status} />
                          </div>
                          <p className="mt-1 text-sm font-medium text-[#f1f5f9]">{item.filename}</p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[#5a657a] hover:text-[#34d399]"
                            onClick={() => handleViewEvidence(item)}
                          >
                            <Eye className="mr-1 h-3.5 w-3.5" />
                            View
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[#5a657a] hover:text-[#22d3ee]"
                            onClick={() => handleLinkFIR(item.firId)}
                          >
                            <Link2 className="mr-1 h-3.5 w-3.5" />
                            FIR
                          </Button>
                        </div>
                      </div>

                      <p className="mb-3 text-xs leading-relaxed text-[#5a657a]">{item.aiSummary}</p>

                      <div className="flex flex-wrap gap-1.5">
                        {item.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="border-white/10 text-[10px] text-[#5a657a]">
                            {tag}
                          </Badge>
                        ))}
                      </div>

                      <div className="mt-3 flex items-center gap-4 text-[11px] text-[#3d4659]">
                        <span>
                          FIR:{" "}
                          <button
                            onClick={() => handleLinkFIR(item.firId)}
                            className="text-[#34d399] hover:underline"
                          >
                            {item.firId}
                          </button>
                        </span>
                        {item.linkedAccused.length > 0 && (
                          <span>Accused: {item.linkedAccused.join(", ")}</span>
                        )}
                        {item.linkedVictim && <span>Victim: {item.linkedVictim}</span>}
                        <span>{formatBytes(item.size)}</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── OCR Ingestion Dialog ─── */}
      <Dialog open={showOCRDialog} onOpenChange={(open) => {
        if (!open) {
          setOcrResult(null);
          setOcrFileSelected(false);
          setOcrProcessing(false);
          setOcrProgress(0);
        }
        setShowOCRDialog(open);
      }}>
        <DialogContent className="max-w-3xl border-[rgba(255,255,255,0.06)] bg-[rgba(15,21,36,0.45)] p-0">
          <DialogHeader className="border-b border-white/10 px-6 py-4">
            <DialogTitle className="flex items-center gap-2 text-[#f1f5f9]">
              <Brain className="h-5 w-5 text-[#34d399]" />
              OCR Document Ingestion
            </DialogTitle>
            <DialogDescription className="text-[#5a657a]">
              Upload a document for AI-powered OCR extraction and entity recognition
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[70vh] overflow-y-auto px-6 py-4">
            {!ocrResult ? (
              <div className="space-y-4">
                {/* File upload area */}
                <div
                  className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-8 transition-colors ${
                    ocrFileSelected
                      ? "border-[rgba(52,211,153,0.3)] bg-[rgba(52,211,153,0.04)]"
                      : "border-white/10 bg-white/[0.02] hover:border-white/20"
                  }`}
                  onClick={() => ocrFileInputRef.current?.click()}
                >
                  {ocrFileSelected ? (
                    <>
                      <CheckCircle2 className="mb-2 h-10 w-10 text-[#34d399]" />
                      <p className="text-sm font-medium text-[#34d399]">Document Selected</p>
                      <p className="mt-1 text-xs text-[#5a657a]">FIR_Complaint_2024.pdf • 2.4 MB</p>
                    </>
                  ) : (
                    <>
                      <Upload className="mb-2 h-10 w-10 text-[#3d4659]" />
                      <p className="text-sm font-medium text-[#8b97b0]">
                        Click to upload document for OCR
                      </p>
                      <p className="mt-1 text-xs text-[#3d4659]">
                        PDF, Images, Scanned Documents • Max 50MB
                      </p>
                    </>
                  )}
                  <input
                    ref={ocrFileInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png,.tiff,.bmp"
                    onChange={handleOCRUpload}
                  />
                </div>

                {/* Processing progress */}
                {ocrProcessing && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3 rounded-xl bg-white/5 p-4"
                  >
                    <div className="flex items-center gap-3">
                      <Loader2 className="h-5 w-5 animate-spin text-[#34d399]" />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-[#f1f5f9]">
                          {ocrProgress < 30
                            ? "Scanning document pages..."
                            : ocrProgress < 60
                            ? "Extracting text with OCR engine..."
                            : ocrProgress < 85
                            ? "Running NER entity extraction..."
                            : "Building structured output..."}
                        </p>
                        <Progress
                          value={ocrProgress}
                          className="mt-2 h-1.5 bg-white/10 [&>div]:rounded-full [&>div]:bg-[#34d399]"
                        />
                      </div>
                      <span className="text-sm font-medium text-[#34d399]">
                        {Math.round(ocrProgress)}%
                      </span>
                    </div>
                  </motion.div>
                )}

                {/* Process button */}
                {ocrFileSelected && !ocrProcessing && (
                  <Button
                    className="w-full bg-[#34d399] py-6 text-white hover:bg-[#2bc48a]"
                    onClick={handleOCRProcess}
                  >
                    <Sparkles className="mr-2 h-5 w-5" />
                    Start OCR Processing
                  </Button>
                )}
              </div>
            ) : (
              /* OCR Results */
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Confidence */}
                <div className="flex items-center justify-between rounded-xl bg-[rgba(52,211,153,0.08)] border border-[rgba(52,211,153,0.15)] p-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#34d399]" />
                    <span className="text-sm font-medium text-[#34d399]">OCR Confidence Score</span>
                  </div>
                  <span className="text-lg font-bold text-[#34d399]">{ocrResult.confidence}%</span>
                </div>

                {/* Extracted text preview */}
                <div className="rounded-xl bg-white/5 p-3">
                  <h4 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5a657a]">
                    <Type className="h-3.5 w-3.5" />
                    Extracted Text (Preview)
                  </h4>
                  <p className="max-h-32 overflow-y-auto whitespace-pre-wrap text-xs leading-relaxed text-[#8b97b0]">
                    {ocrResult.text.slice(0, 500)}...
                  </p>
                </div>

                {/* Entities Grid */}
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <EntitySection
                    icon={<Type className="h-4 w-4" />}
                    label="Names"
                    items={ocrResult.entities.names}
                    color="text-[#22d3ee]"
                  />
                  <EntitySection
                    icon={<MapPin className="h-4 w-4" />}
                    label="Addresses"
                    items={ocrResult.entities.addresses}
                    color="text-[#818cf8]"
                  />
                  <EntitySection
                    icon={<Phone className="h-4 w-4" />}
                    label="Phones"
                    items={ocrResult.entities.phones}
                    color="text-[#34d399]"
                  />
                  <EntitySection
                    icon={<Car className="h-4 w-4" />}
                    label="Vehicles"
                    items={ocrResult.entities.vehicles}
                    color="text-[#fbbf24]"
                  />
                  <EntitySection
                    icon={<Landmark className="h-4 w-4" />}
                    label="Accounts"
                    items={ocrResult.entities.accounts}
                    color="text-[#22d3ee]"
                  />
                  <EntitySection
                    icon={<Shield className="h-4 w-4" />}
                    label="IPC Sections"
                    items={ocrResult.entities.ipcSections}
                    color="text-[#f87171]"
                  />
                  <EntitySection
                    icon={<Calendar className="h-4 w-4" />}
                    label="Dates"
                    items={ocrResult.entities.dates}
                    color="text-[#fbbf24]"
                  />
                  <EntitySection
                    icon={<MapPin className="h-4 w-4" />}
                    label="Locations"
                    items={ocrResult.entities.locations}
                    color="text-[#f87171]"
                  />
                  <EntitySection
                    icon={<Sword className="h-4 w-4" />}
                    label="Weapons"
                    items={ocrResult.entities.weapons}
                    color="text-[#f87171]"
                  />
                  <EntitySection
                    icon={<Box className="h-4 w-4" />}
                    label="Evidence"
                    items={ocrResult.entities.evidence}
                    color="text-[#818cf8]"
                  />
                </div>

                {/* Timeline */}
                {ocrResult.entities.timeline.length > 0 && (
                  <div className="rounded-xl bg-white/5 p-3">
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5a657a]">
                      <Clock className="h-3.5 w-3.5" />
                      Extracted Timeline
                    </h4>
                    <div className="relative space-y-0 pl-6">
                      <div className="absolute bottom-0 left-2 top-0 w-px bg-[#34d399]/30" />
                      {ocrResult.entities.timeline.map((event, i) => (
                        <div key={i} className="relative pb-3">
                          <div className="absolute -left-4 top-1 h-2 w-2 rounded-full bg-[#34d399]" />
                          <p className="text-xs text-[#f1f5f9]">{event.event}</p>
                          <p className="text-[10px] text-[#3d4659]">{event.date}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </div>

          {ocrResult && (
            <DialogFooter className="border-t border-white/10 px-6 py-4">
              <Button
                variant="outline"
                className="border-white/10 bg-white/5 text-[#8b97b0] hover:bg-white/10"
                onClick={handleOCRReject}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject
              </Button>
              <Button
                className="bg-[#34d399] text-white hover:bg-[#2bc48a]"
                onClick={handleOCRApprove}
              >
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Approve & Save
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}