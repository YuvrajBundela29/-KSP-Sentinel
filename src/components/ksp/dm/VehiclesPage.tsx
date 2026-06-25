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
  Truck,
  Link2,
  ShieldAlert,
  Eye,
  Network,
  StickyNote,
  FileDown,
  FileSpreadsheet,
  FileJson,
  Printer,
  X,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Filter,
  Clock,
  MapPin,
  Car,
  Calendar,
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { loadCrimeData } from "@/lib/data";
import type { Vehicle, FIR, CrimeDataset } from "@/lib/types";
import {
  exportToCSV,
  exportToJSON,
  exportToExcel,
  exportToPrint,
  formatNumber,
} from "@/lib/export-utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
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
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

// ─── Types ──────────────────────────────────────────────────────────
type VehicleStatus = "Active" | "Under Investigation" | "Cleared";
type SortField = "reg" | "type" | "make" | "color" | "linkedCrimes" | "lastCrimeDate" | "status";
type SortDir = "asc" | "desc";

interface VehicleWithMeta extends Vehicle {
  linkedFirs: FIR[];
  linkedCrimeCount: number;
  districtsUsed: string[];
  lastCrimeDate: string | null;
  status: VehicleStatus;
  isStolen: boolean;
  underSurveillance: boolean;
}

// ─── Animated Counter ───────────────────────────────────────────────
function useAnimatedCounter(target: number, duration = 1200) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setCount(target);
        clearInterval(timer);
      } else {
        setCount(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [target, duration]);
  return count;
}

// ─── Stat Card ──────────────────────────────────────────────────────
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  suffix?: string;
  color: string;
  delay: number;
}

function StatCard({ icon, label, value, suffix = "", color, delay }: StatCardProps) {
  const animatedValue = useAnimatedCounter(value, 1400);
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: delay * 0.08 }}
      whileHover={{ scale: 1.03, boxShadow: `0 0 30px ${color}20` }}
      className="group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl transition-all duration-300"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100"
        style={{ background: `linear-gradient(135deg, ${color}08 0%, transparent 60%)` }}
      />
      <div className="relative flex items-start justify-between p-5">
        <div className="flex-1">
          <span className="text-[#64748b] text-xs font-medium uppercase tracking-wider">
            {label}
          </span>
          <div className="flex items-baseline gap-1.5 mt-1">
            <span className="text-[#e2e8f0] text-3xl font-bold tabular-nums">
              {animatedValue.toLocaleString("en-IN")}
            </span>
            {suffix && <span className="text-[#64748b] text-sm">{suffix}</span>}
          </div>
        </div>
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl"
          style={{ backgroundColor: `${color}15`, color }}
        >
          {icon}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Main Component ─────────────────────────────────────────────────
export default function VehiclesPage() {
  const { addAuditLog, addNotification, setView } = useAppStore();
  const [data, setData] = useState<CrimeDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterColor, setFilterColor] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleWithMeta | null>(null);
  const [noteText, setNoteText] = useState("");
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [sortField, setSortField] = useState<SortField>("linkedCrimes");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchQuery), 250);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load data
  useEffect(() => {
    loadCrimeData()
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Derive vehicle metadata
  const vehiclesWithMeta = useMemo<VehicleWithMeta[]>(() => {
    if (!data) return [];
    return data.vehicles.map((v) => {
      const linkedFirs = data.firs.filter((f) => f.vehicle_used === v.id);
      const districtsUsed = [...new Set(linkedFirs.map((f) => f.district))];
      const dates = linkedFirs.map((f) => f.date).sort().reverse();
      const lastCrimeDate = dates[0] || null;

      // Determine status
      let status: VehicleStatus = "Cleared";
      if (linkedFirs.length > 1) {
        status = "Active";
      } else if (linkedFirs.length === 1 && lastCrimeDate) {
        const daysSince = Math.floor(
          (Date.now() - new Date(lastCrimeDate).getTime()) / (1000 * 60 * 60 * 24)
        );
        if (daysSince <= 90) status = "Under Investigation";
      }

      const isStolen = linkedFirs.some(
        (f) => f.crime_type === "Vehicle Theft" || f.items_stolen.some((i) => i.toLowerCase().includes("vehicle") || i.toLowerCase().includes("bike") || i.toLowerCase().includes("car"))
      );
      const underSurveillance = status === "Active" && linkedFirs.length >= 2;

      return {
        ...v,
        linkedFirs,
        linkedCrimeCount: linkedFirs.length,
        districtsUsed,
        lastCrimeDate,
        status,
        isStolen,
        underSurveillance,
      };
    });
  }, [data]);

  // Stats
  const stats = useMemo(() => {
    const total = vehiclesWithMeta.length;
    const linked = vehiclesWithMeta.filter((v) => v.linkedCrimeCount > 0).length;
    const stolen = vehiclesWithMeta.filter((v) => v.isStolen).length;
    const surveillance = vehiclesWithMeta.filter((v) => v.underSurveillance).length;
    return { total, linked, stolen, surveillance };
  }, [vehiclesWithMeta]);

  // Unique filter values
  const vehicleTypes = useMemo(() => [...new Set(vehiclesWithMeta.map((v) => v.type))].sort(), [vehiclesWithMeta]);
  const vehicleColors = useMemo(() => [...new Set(vehiclesWithMeta.map((v) => v.color))].sort(), [vehiclesWithMeta]);

  // Filtered + sorted
  const filtered = useMemo(() => {
    let result = vehiclesWithMeta;
    if (debouncedSearch) {
      const q = debouncedSearch.toLowerCase();
      result = result.filter(
        (v) =>
          v.reg.toLowerCase().includes(q) ||
          v.make.toLowerCase().includes(q) ||
          v.type.toLowerCase().includes(q)
      );
    }
    if (filterType !== "all") result = result.filter((v) => v.type === filterType);
    if (filterColor !== "all") result = result.filter((v) => v.color === filterColor);
    if (filterStatus !== "all") result = result.filter((v) => v.status === filterStatus);

    result = [...result].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      switch (sortField) {
        case "reg": return dir * a.reg.localeCompare(b.reg);
        case "type": return dir * a.type.localeCompare(b.type);
        case "make": return dir * a.make.localeCompare(b.make);
        case "color": return dir * a.color.localeCompare(b.color);
        case "linkedCrimes": return dir * (a.linkedCrimeCount - b.linkedCrimeCount);
        case "lastCrimeDate": {
          const da = a.lastCrimeDate ? new Date(a.lastCrimeDate).getTime() : 0;
          const db = b.lastCrimeDate ? new Date(b.lastCrimeDate).getTime() : 0;
          return dir * (da - db);
        }
        case "status": return dir * a.status.localeCompare(b.status);
        default: return 0;
      }
    });

    return result;
  }, [vehiclesWithMeta, debouncedSearch, filterType, filterColor, filterStatus, sortField, sortDir]);

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filterType !== "all") count++;
    if (filterColor !== "all") count++;
    if (filterStatus !== "all") count++;
    return count;
  }, [filterType, filterColor, filterStatus]);

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronsUpDown className="h-3.5 w-3.5 text-[#4a5568]" />;
    return sortDir === "asc" ? (
      <ChevronUp className="h-3.5 w-3.5 text-blue-400" />
    ) : (
      <ChevronDown className="h-3.5 w-3.5 text-blue-400" />
    );
  };

  const handleSort = useCallback((field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  }, [sortField]);

  const clearFilters = useCallback(() => {
    setFilterType("all");
    setFilterColor("all");
    setFilterStatus("all");
    setSearchQuery("");
    setDebouncedSearch("");
    setPage(1);
  }, []);

  const handleAddNote = useCallback(() => {
    if (!noteText.trim() || !selectedVehicle) return;
    addAuditLog({
      user: "Current User",
      role: "investigator",
      action: "Added note to vehicle",
      entity: "Vehicle",
      entityId: selectedVehicle.reg,
      oldValue: "",
      newValue: noteText.trim(),
      status: "success",
    });
    addNotification({
      title: "Note Added",
      message: `Note added to vehicle ${selectedVehicle.reg}`,
      type: "success",
      read: false,
    });
    setNoteText("");
    setShowNoteDialog(false);
  }, [noteText, selectedVehicle, addAuditLog, addNotification]);

  const handleAction = useCallback(
    (action: string, v: VehicleWithMeta) => {
      addAuditLog({
        user: "Current User",
        role: "investigator",
        action,
        entity: "Vehicle",
        entityId: v.reg,
        oldValue: "",
        newValue: action,
        status: "success",
      });
      if (action === "View Linked FIRs") {
        setSelectedVehicle(v);
      } else if (action === "View on Network") {
        addNotification({
          title: "Network View",
          message: `Opening network graph for vehicle ${v.reg}`,
          type: "info",
          read: false,
        });
        setView("network");
      } else if (action === "Add Note") {
        setSelectedVehicle(v);
        setShowNoteDialog(true);
      }
    },
    [addAuditLog, addNotification, setView]
  );

  const statusColor = (s: VehicleStatus) => {
    switch (s) {
      case "Active": return "bg-red-500/15 text-red-400 border-red-500/30";
      case "Under Investigation": return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "Cleared": return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
    }
  };

  const getExportData = useCallback(() =>
    filtered.map((v) => ({
      registration: v.reg,
      type: v.type,
      make: v.make,
      color: v.color,
      linked_crimes: v.linkedCrimeCount,
      districts_used: v.districtsUsed.join("; "),
      last_crime_date: v.lastCrimeDate || "N/A",
      status: v.status,
    })),
  [filtered]);

  // ── Render: Loading ──
  if (loading) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  // ── Render: Main ──
  return (
    <div className="space-y-5 p-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-[#e2e8f0] text-2xl font-bold tracking-tight">
            Vehicle Records
          </h1>
          <p className="text-[#64748b] text-sm mt-1">
            Track vehicles linked to criminal activities across districts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2 border-white/10 bg-white/5 hover:bg-white/10 text-[#e2e8f0] rounded-xl">
                <FileDown className="h-4 w-4" />
                Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-[#1a2035] border-white/10 text-[#e2e8f0]">
              <DropdownMenuItem onClick={() => exportToCSV(getExportData(), "vehicles_export")}>
                <FileDown className="mr-2 h-4 w-4" /> Export CSV
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToExcel(getExportData(), "vehicles_export")}>
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportToJSON(getExportData(), "vehicles_export")}>
                <FileJson className="mr-2 h-4 w-4" /> Export JSON
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-white/10" />
              <DropdownMenuItem onClick={() => exportToPrint("vehicle-table")}>
                <Printer className="mr-2 h-4 w-4" /> Print
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<Car className="h-5 w-5" />}
          label="Total Vehicles"
          value={stats.total}
          color="#3b82f6"
          delay={0}
        />
        <StatCard
          icon={<Link2 className="h-5 w-5" />}
          label="Linked to Crimes"
          value={stats.linked}
          color="#10b981"
          delay={1}
        />
        <StatCard
          icon={<ShieldAlert className="h-5 w-5" />}
          label="Stolen"
          value={stats.stolen}
          color="#ef4444"
          delay={2}
        />
        <StatCard
          icon={<Eye className="h-5 w-5" />}
          label="Under Surveillance"
          value={stats.surveillance}
          color="#f59e0b"
          delay={3}
        />
      </div>

      {/* ── Search + Filter Controls ── */}
      <div className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4a5568]" />
            <Input
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              placeholder="Search by registration, make, type..."
              className="pl-10 bg-white/5 border-white/10 text-[#e2e8f0] placeholder:text-[#4a5568] h-10 rounded-xl focus-visible:border-blue-500/50 focus-visible:ring-blue-500/20"
            />
          </div>
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
        </div>

        {/* Advanced Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="overflow-hidden"
            >
              <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-4">
                <div className="space-y-1.5">
                  <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">
                    Vehicle Type
                  </label>
                  <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1); }}>
                    <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-[#e2e8f0] h-9 rounded-xl">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2035] border-white/10 text-[#e2e8f0]">
                      <SelectItem value="all">All Types</SelectItem>
                      {vehicleTypes.map((t) => (
                        <SelectItem key={t} value={t}>{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">
                    Color
                  </label>
                  <Select value={filterColor} onValueChange={(v) => { setFilterColor(v); setPage(1); }}>
                    <SelectTrigger className="w-[160px] bg-white/5 border-white/10 text-[#e2e8f0] h-9 rounded-xl">
                      <SelectValue placeholder="All Colors" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2035] border-white/10 text-[#e2e8f0]">
                      <SelectItem value="all">All Colors</SelectItem>
                      {vehicleColors.map((c) => (
                        <SelectItem key={c} value={c}>{c}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[#64748b] text-xs font-medium uppercase tracking-wider">
                    Status
                  </label>
                  <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); setPage(1); }}>
                    <SelectTrigger className="w-[180px] bg-white/5 border-white/10 text-[#e2e8f0] h-9 rounded-xl">
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a2035] border-white/10 text-[#e2e8f0]">
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Under Investigation">Under Investigation</SelectItem>
                      <SelectItem value="Cleared">Cleared</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  className="text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-white/10 h-9 text-xs"
                >
                  Clear All
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Results Info ── */}
      <div className="flex items-center justify-between">
        <p className="text-[#64748b] text-sm">
          Showing <span className="text-[#e2e8f0] font-medium">{paged.length}</span> of{" "}
          <span className="text-[#e2e8f0] font-medium">{filtered.length}</span> vehicles
        </p>
      </div>

      {/* ── Table ── */}
      {filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl py-20"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/5">
            <Truck className="h-8 w-8 text-[#4a5568]" />
          </div>
          <div className="text-center">
            <p className="text-[#e2e8f0] font-medium">No vehicles found</p>
            <p className="text-[#64748b] text-sm mt-1">
              Try adjusting your search or filters
            </p>
          </div>
          {activeFilterCount > 0 && (
            <Button variant="ghost" onClick={clearFilters} className="text-blue-400 hover:text-blue-300 hover:bg-blue-500/10">
              Clear Filters
            </Button>
          )}
        </motion.div>
      ) : (
        <div id="vehicle-table">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl overflow-hidden"
          >
            <ScrollArea className="w-full">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/5 hover:bg-transparent">
                    <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wider">
                      <button onClick={() => handleSort("reg")} className="flex items-center gap-1 hover:text-[#e2e8f0] transition-colors">
                        Registration <SortIcon field="reg" />
                      </button>
                    </TableHead>
                    <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wider">
                      <button onClick={() => handleSort("type")} className="flex items-center gap-1 hover:text-[#e2e8f0] transition-colors">
                        Type <SortIcon field="type" />
                      </button>
                    </TableHead>
                    <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wider">
                      <button onClick={() => handleSort("make")} className="flex items-center gap-1 hover:text-[#e2e8f0] transition-colors">
                        Make <SortIcon field="make" />
                      </button>
                    </TableHead>
                    <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wider">
                      <button onClick={() => handleSort("color")} className="flex items-center gap-1 hover:text-[#e2e8f0] transition-colors">
                        Color <SortIcon field="color" />
                      </button>
                    </TableHead>
                    <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wider">
                      <button onClick={() => handleSort("linkedCrimes")} className="flex items-center gap-1 hover:text-[#e2e8f0] transition-colors">
                        Linked Crimes <SortIcon field="linkedCrimes" />
                      </button>
                    </TableHead>
                    <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wider">
                      Districts Used
                    </TableHead>
                    <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wider">
                      <button onClick={() => handleSort("lastCrimeDate")} className="flex items-center gap-1 hover:text-[#e2e8f0] transition-colors">
                        Last Crime Date <SortIcon field="lastCrimeDate" />
                      </button>
                    </TableHead>
                    <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wider">
                      <button onClick={() => handleSort("status")} className="flex items-center gap-1 hover:text-[#e2e8f0] transition-colors">
                        Status <SortIcon field="status" />
                      </button>
                    </TableHead>
                    <TableHead className="text-[#64748b] font-semibold text-xs uppercase tracking-wider text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paged.map((v, idx) => (
                    <motion.tr
                      key={v.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: idx * 0.02 }}
                      className="border-white/5 hover:bg-white/5 cursor-pointer transition-colors group"
                      onClick={() => setSelectedVehicle(v)}
                    >
                      <TableCell className="text-[#e2e8f0] font-mono text-sm font-medium">
                        {v.reg}
                      </TableCell>
                      <TableCell className="text-[#94a3b8] text-sm">{v.type}</TableCell>
                      <TableCell className="text-[#94a3b8] text-sm">{v.make}</TableCell>
                      <TableCell className="text-[#94a3b8] text-sm">
                        <div className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-full border border-white/20"
                            style={{ backgroundColor: v.color.toLowerCase() }}
                          />
                          {v.color}
                        </div>
                      </TableCell>
                      <TableCell className="text-[#e2e8f0] text-sm font-medium">
                        {v.linkedCrimeCount > 0 ? (
                          <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px]">
                            {v.linkedCrimeCount} FIR{v.linkedCrimeCount !== 1 ? "s" : ""}
                          </Badge>
                        ) : (
                          <span className="text-[#4a5568]">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-[#94a3b8] text-sm">
                        {v.districtsUsed.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {v.districtsUsed.map((d) => (
                              <Badge key={d} variant="outline" className="text-[10px] border-white/10 text-[#94a3b8]">
                                {d}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span className="text-[#4a5568]">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-[#94a3b8] text-sm">
                        {v.lastCrimeDate
                          ? new Date(v.lastCrimeDate).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                            })
                          : <span className="text-[#4a5568]">—</span>}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-[10px] border ${statusColor(v.status)}`}>
                          {v.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); handleAction("View Linked FIRs", v); }}
                            className="h-7 w-7 p-0 text-[#94a3b8] hover:text-blue-400 hover:bg-blue-500/10"
                            title="View Linked FIRs"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); handleAction("View on Network", v); }}
                            className="h-7 w-7 p-0 text-[#94a3b8] hover:text-emerald-400 hover:bg-emerald-500/10"
                            title="View on Network"
                          >
                            <Network className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => { e.stopPropagation(); handleAction("Add Note", v); }}
                            className="h-7 w-7 p-0 text-[#94a3b8] hover:text-amber-400 hover:bg-amber-500/10"
                            title="Add Note"
                          >
                            <StickyNote className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </motion.tr>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </motion.div>

          {/* ── Pagination ── */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-[#64748b] text-sm">
                Page {page} of {totalPages}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="border-white/10 bg-white/5 text-[#94a3b8] hover:bg-white/10 rounded-lg h-8"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="border-white/10 bg-white/5 text-[#94a3b8] hover:bg-white/10 rounded-lg h-8"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Detail Panel (Side Sheet) ── */}
      <AnimatePresence>
        {selectedVehicle && (
          <motion.div
            initial={{ opacity: 0, x: 400 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 400 }}
            transition={{ type: "spring", damping: 25, stiffness: 250 }}
            className="fixed right-0 top-0 bottom-0 z-40 w-[480px] border-l border-white/10 bg-[#0d1225]/95 backdrop-blur-xl shadow-2xl"
          >
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-[#e2e8f0] text-lg font-bold">{selectedVehicle.reg}</h2>
                    <p className="text-[#64748b] text-sm mt-0.5">
                      {selectedVehicle.make} · {selectedVehicle.type} · {selectedVehicle.color}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedVehicle(null)}
                    className="h-8 w-8 p-0 text-[#64748b] hover:text-[#e2e8f0] hover:bg-white/10 rounded-lg"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                {/* Status & Flags */}
                <div className="flex flex-wrap gap-2">
                  <Badge className={`text-xs border ${statusColor(selectedVehicle.status)}`}>
                    {selectedVehicle.status}
                  </Badge>
                  {selectedVehicle.isStolen && (
                    <Badge className="bg-red-500/15 text-red-400 border-red-500/30 text-xs">
                      <ShieldAlert className="h-3 w-3 mr-1" /> Stolen
                    </Badge>
                  )}
                  {selectedVehicle.underSurveillance && (
                    <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-xs animate-pulse">
                      <Eye className="h-3 w-3 mr-1" /> Under Surveillance
                    </Badge>
                  )}
                </div>

                {/* Vehicle Details Grid */}
                <div className="rounded-xl border border-white/10 bg-white/5 p-4 space-y-3">
                  <h3 className="text-[#e2e8f0] text-sm font-semibold">Vehicle Details</h3>
                  {[
                    { label: "Registration", value: selectedVehicle.reg },
                    { label: "Type", value: selectedVehicle.type },
                    { label: "Make", value: selectedVehicle.make },
                    { label: "Color", value: selectedVehicle.color },
                    { label: "ID", value: selectedVehicle.id },
                    { label: "Linked FIRs", value: String(selectedVehicle.linkedCrimeCount) },
                    { label: "Districts Used", value: selectedVehicle.districtsUsed.join(", ") || "N/A" },
                    {
                      label: "Last Crime Date",
                      value: selectedVehicle.lastCrimeDate
                        ? new Date(selectedVehicle.lastCrimeDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "long",
                            year: "numeric",
                          })
                        : "N/A",
                    },
                  ].map((item) => (
                    <div key={item.label} className="flex justify-between">
                      <span className="text-[#64748b] text-sm">{item.label}</span>
                      <span className="text-[#e2e8f0] text-sm font-medium">{item.value}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={() => handleAction("View Linked FIRs", selectedVehicle)}
                    className="gap-2 bg-blue-600 hover:bg-blue-700 text-white border-0 rounded-xl text-sm flex-1"
                  >
                    <Eye className="h-4 w-4" /> View Linked FIRs
                  </Button>
                  <Button
                    onClick={() => handleAction("View on Network", selectedVehicle)}
                    className="gap-2 bg-white/5 hover:bg-white/10 text-[#e2e8f0] border border-white/10 rounded-xl text-sm flex-1"
                  >
                    <Network className="h-4 w-4" /> View on Network
                  </Button>
                  <Button
                    onClick={() => setShowNoteDialog(true)}
                    className="gap-2 bg-white/5 hover:bg-white/10 text-[#e2e8f0] border border-white/10 rounded-xl text-sm flex-1"
                  >
                    <StickyNote className="h-4 w-4" /> Add Note
                  </Button>
                </div>

                {/* Linked FIRs */}
                {selectedVehicle.linkedFirs.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-[#e2e8f0] text-sm font-semibold flex items-center gap-2">
                      <Link2 className="h-4 w-4 text-blue-400" />
                      Linked FIRs ({selectedVehicle.linkedFirs.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedVehicle.linkedFirs
                        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                        .map((fir) => (
                          <div
                            key={fir.fir_id}
                            className="rounded-xl border border-white/10 bg-white/5 p-3 hover:bg-white/8 transition-colors cursor-pointer"
                            onClick={() => {
                              useAppStore.getState().setSelectedFirId(fir.fir_id);
                              setSelectedVehicle(null);
                            }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[#e2e8f0] text-sm font-mono font-medium">
                                {fir.fir_id}
                              </span>
                              <Badge className="text-[10px] bg-blue-500/15 text-blue-400 border-blue-500/30">
                                {fir.crime_type}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5">
                              <span className="text-[#94a3b8] text-xs flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(fir.date).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "short",
                                  year: "numeric",
                                })}
                              </span>
                              <span className="text-[#94a3b8] text-xs flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {fir.district}
                              </span>
                              <span className="text-[#94a3b8] text-xs flex items-center gap-1">
                                <ShieldAlert className="h-3 w-3" />
                                {fir.severity}
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Usage Timeline */}
                {selectedVehicle.linkedFirs.length > 1 && (
                  <div className="space-y-3">
                    <h3 className="text-[#e2e8f0] text-sm font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-400" />
                      Usage Timeline
                    </h3>
                    <div className="relative pl-6 space-y-4">
                      <div className="absolute left-2 top-2 bottom-2 w-px bg-gradient-to-b from-blue-500/50 via-amber-500/50 to-transparent" />
                      {selectedVehicle.linkedFirs
                        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                        .map((fir, i) => (
                          <div key={fir.fir_id} className="relative">
                            <div
                              className="absolute -left-[18px] top-1.5 h-3 w-3 rounded-full border-2"
                              style={{
                                borderColor: i === 0 ? "#3b82f6" : "#f59e0b",
                                backgroundColor: i === 0 ? "#3b82f6" : "#f59e0b",
                              }}
                            />
                            <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-[#e2e8f0] text-sm font-medium">
                                  {fir.crime_type}
                                </span>
                                <span className="text-[#64748b] text-xs">
                                  {new Date(fir.date).toLocaleDateString("en-IN")}
                                </span>
                              </div>
                              <p className="text-[#94a3b8] text-xs mt-1">
                                {fir.district} · {fir.location.place}
                              </p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Backdrop for detail panel ── */}
      <AnimatePresence>
        {selectedVehicle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedVehicle(null)}
            className="fixed inset-0 z-30 bg-black/40"
          />
        )}
      </AnimatePresence>

      {/* ── Note Dialog ── */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent className="bg-[#1a2035] border-white/10 text-[#e2e8f0] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Note — {selectedVehicle?.reg}</DialogTitle>
            <DialogDescription className="text-[#64748b]">
              Add an investigative note to this vehicle record
            </DialogDescription>
          </DialogHeader>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="Enter your note here..."
            rows={4}
            className="bg-white/5 border-white/10 text-[#e2e8f0] placeholder:text-[#4a5568] focus-visible:border-blue-500/50 focus-visible:ring-blue-500/20 rounded-xl"
          />
          <DialogFooter>
            <Button
              variant="ghost"
              onClick={() => { setShowNoteDialog(false); setNoteText(""); }}
              className="text-[#94a3b8] hover:text-[#e2e8f0] hover:bg-white/10 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              onClick={handleAddNote}
              disabled={!noteText.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white border-0 rounded-xl"
            >
              Save Note
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}