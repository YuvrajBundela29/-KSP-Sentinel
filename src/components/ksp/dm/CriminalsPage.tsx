"use client";

import React, {
  useEffect,
  useState,
  useMemo,
  useCallback,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Eye,
  FileText,
  Brain,
  FileDown,
  FileSpreadsheet,
  FileJson,
  Printer,
  Users,
  ShieldAlert,
  UserPlus,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { loadCrimeData } from "@/lib/data";
import type { Accused } from "@/lib/types";
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
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

// ─── Types ───────────────────────────────────────────────────────────
type SortField = "id" | "name" | "age" | "gender" | "gang" | "risk" | "prior_firs" | "status";
type SortDir = "asc" | "desc";

// ─── Helpers ─────────────────────────────────────────────────────────
function getRiskColor(score: number): string {
  if (score > 70) return "text-red-400";
  if (score > 40) return "text-amber-400";
  return "text-emerald-400";
}

function getRiskBarColor(score: number): string {
  if (score > 70) return "[&>div]:bg-red-500";
  if (score > 40) return "[&>div]:bg-amber-500";
  return "[&>div]:bg-emerald-500";
}

function getRiskLevel(score: number): string {
  if (score > 70) return "High";
  if (score > 40) return "Medium";
  return "Low";
}

function getGangName(gangId: string | null, gangs: { id: string; name: string }[]): string {
  if (!gangId) return "Independent";
  return gangs.find((g) => g.id === gangId)?.name ?? gangId;
}

function getGangBadgeStyle(gangId: string | null): string {
  if (!gangId) return "bg-slate-500/20 text-slate-400 border-slate-500/30";
  return "bg-violet-500/20 text-violet-400 border-violet-500/30";
}

// ─── Main Component ──────────────────────────────────────────────────
export default function CriminalsPage() {
  const {
    crimeData,
    setCrimeData,
    addAuditLog,
    setView,
    setSelectedAccusedId,
    setSelectedFirId,
  } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGang, setFilterGang] = useState<string>("all");
  const [filterRisk, setFilterRisk] = useState<string>("all");
  const [filterGender, setFilterGender] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("risk");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [showFilters, setShowFilters] = useState(false);

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
      setLoading(false);
    }
    init();
  }, [crimeData, setCrimeData]);

  // ── Derived data ──
  const accused = useMemo(() => crimeData?.accused ?? [], [crimeData]);
  const gangs = useMemo(() => crimeData?.gangs ?? [], [crimeData]);
  const firs = useMemo(() => crimeData?.firs ?? [], [crimeData]);

  // Stats
  const stats = useMemo(() => {
    const total = accused.length;
    const highRisk = accused.filter((a) => a.risk > 70).length;
    const inGangs = accused.filter((a) => a.gang !== null).length;
    const avgRisk =
      total > 0
        ? Math.round(accused.reduce((sum, a) => sum + a.risk, 0) / total)
        : 0;

    // Risk distribution
    const critical = accused.filter((a) => a.risk >= 85).length;
    const high = accused.filter((a) => a.risk >= 70 && a.risk < 85).length;
    const medium = accused.filter((a) => a.risk >= 40 && a.risk < 70).length;
    const low = accused.filter((a) => a.risk < 40).length;

    return { total, highRisk, inGangs, avgRisk, critical, high, medium, low };
  }, [accused]);

  // Get FIR count per accused
  const firCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const a of accused) {
      map[a.id] = firs.filter((f) => f.accused.includes(a.id)).length;
    }
    return map;
  }, [accused, firs]);

  // ── Filtered & sorted ──
  const filteredData = useMemo(() => {
    let items = [...accused];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter(
        (a) =>
          a.name.toLowerCase().includes(q) ||
          a.id.toLowerCase().includes(q) ||
          (a.gang && getGangName(a.gang, gangs).toLowerCase().includes(q))
      );
    }

    if (filterGang !== "all") {
      items = items.filter((a) => {
        if (filterGang === "independent") return a.gang === null;
        return a.gang === filterGang;
      });
    }

    if (filterRisk !== "all") {
      items = items.filter((a) => getRiskLevel(a.risk) === filterRisk);
    }

    if (filterGender !== "all") {
      items = items.filter((a) => a.gender === filterGender);
    }

    // Sort
    items.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case "id":
          cmp = a.id.localeCompare(b.id);
          break;
        case "name":
          cmp = a.name.localeCompare(b.name);
          break;
        case "age":
          cmp = a.age - b.age;
          break;
        case "gender":
          cmp = a.gender.localeCompare(b.gender);
          break;
        case "gang":
          cmp = (a.gang ?? "").localeCompare(b.gang ?? "");
          break;
        case "risk":
          cmp = a.risk - b.risk;
          break;
        case "prior_firs":
          cmp = a.prior_firs - b.prior_firs;
          break;
        case "status":
          cmp = a.risk - b.risk; // use risk as proxy
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return items;
  }, [accused, searchQuery, filterGang, filterRisk, filterGender, sortField, sortDir, gangs]);

  // ── Handlers ──
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortField(field);
        setSortDir("desc");
      }
    },
    [sortField]
  );

  const handleRowClick = useCallback(
    (id: string) => {
      setSelectedAccusedId(id);
      setView("accused");
    },
    [setSelectedAccusedId, setView]
  );

  const handleViewProfile = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      setSelectedAccusedId(id);
      setView("accused");
    },
    [setSelectedAccusedId, setView]
  );

  const handleViewFIRs = useCallback(
    (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      const linkedFIR = firs.find((f) => f.accused.includes(id));
      if (linkedFIR) {
        setSelectedFirId(linkedFIR.fir_id);
        setView("dm-fir");
      }
    },
    [firs, setSelectedFirId, setView]
  );

  const handleRiskAnalysis = useCallback(
    (e: React.MouseEvent, acc: Accused) => {
      e.stopPropagation();
      addAuditLog({
        user: "Current User",
        role: "analyst",
        action: "risk_analysis_view",
        entity: "accused",
        entityId: acc.id,
        oldValue: "",
        newValue: `Risk: ${acc.risk}, Prior FIRs: ${acc.prior_firs}`,
        status: "success",
      });
    },
    [addAuditLog]
  );

  const handleExport = useCallback(
    (format: "csv" | "json" | "excel" | "print") => {
      const data = filteredData.map((a) => ({
        ID: a.id,
        Name: a.name,
        Age: a.age,
        Gender: a.gender,
        Gang: getGangName(a.gang, gangs),
        "Risk Score": a.risk,
        "Risk Level": getRiskLevel(a.risk),
        "Prior FIRs": a.prior_firs,
        "Linked Cases": firCounts[a.id] ?? 0,
      }));

      switch (format) {
        case "csv":
          exportToCSV(data, "criminals_export");
          break;
        case "json":
          exportToJSON(data, "criminals_export");
          break;
        case "excel":
          exportToExcel(data, "criminals_export");
          break;
        case "print":
          exportToPrint("criminals-print-area");
          break;
      }

      addAuditLog({
        user: "Current User",
        role: "analyst",
        action: `export_criminals_${format}`,
        entity: "accused",
        entityId: "-",
        oldValue: "",
        newValue: `${filteredData.length} records`,
        status: "success",
      });
    },
    [filteredData, gangs, firCounts, addAuditLog]
  );

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field)
      return <ArrowUpDown className="ml-1 h-3 w-3 text-[#4a5568]" />;
    return sortDir === "asc" ? (
      <ChevronUp className="ml-1 h-3 w-3 text-emerald-400" />
    ) : (
      <ChevronDown className="ml-1 h-3 w-3 text-emerald-400" />
    );
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-56 bg-white/5" />
          <Skeleton className="h-9 w-24 bg-white/5" />
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl bg-white/5" />
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-xl bg-white/5" />
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-lg bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  // ─── Render ──
  return (
    <div className="space-y-6 p-6" id="criminals-print-area">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#e2e8f0]">Criminals Database</h1>
          <p className="mt-1 text-sm text-[#64748b]">
            Comprehensive registry of accused persons with risk profiling
          </p>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="border-white/10 bg-white/5 text-[#94a3b8] hover:bg-white/10 hover:text-[#e2e8f0]">
              <FileDown className="mr-2 h-4 w-4" />
              Export
              <ChevronDown className="ml-2 h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="border-[#2a3550] bg-[#1a2035]">
            <DropdownMenuItem onClick={() => handleExport("csv")} className="text-[#94a3b8] focus:text-[#e2e8f0]">
              <FileDown className="mr-2 h-4 w-4" /> CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("json")} className="text-[#94a3b8] focus:text-[#e2e8f0]">
              <FileJson className="mr-2 h-4 w-4" /> JSON
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExport("excel")} className="text-[#94a3b8] focus:text-[#e2e8f0]">
              <FileSpreadsheet className="mr-2 h-4 w-4" /> Excel
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem onClick={() => handleExport("print")} className="text-[#94a3b8] focus:text-[#e2e8f0]">
              <Printer className="mr-2 h-4 w-4" /> Print
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            label: "Total Criminals",
            value: stats.total,
            icon: <Users className="h-5 w-5 text-blue-400" />,
            accent: "border-blue-500/20",
            valueColor: "text-blue-400",
          },
          {
            label: "High Risk (Risk > 70)",
            value: stats.highRisk,
            icon: <ShieldAlert className="h-5 w-5 text-red-400" />,
            accent: "border-red-500/20",
            valueColor: "text-red-400",
          },
          {
            label: "In Gangs",
            value: stats.inGangs,
            icon: <UserPlus className="h-5 w-5 text-violet-400" />,
            accent: "border-violet-500/20",
            valueColor: "text-violet-400",
          },
          {
            label: "Average Risk Score",
            value: stats.avgRisk,
            icon: <BarChart3 className="h-5 w-5 text-emerald-400" />,
            accent: "border-emerald-500/20",
            valueColor: "text-emerald-400",
          },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border bg-white/5 backdrop-blur-xl p-4 ${stat.accent}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[#64748b]">{stat.label}</p>
              {stat.icon}
            </div>
            <p className={`mt-2 text-2xl font-bold ${stat.valueColor}`}>
              {stat.label === "Average Risk Score" ? stat.value : formatNumber(stat.value)}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Risk Distribution */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-5"
      >
        <h3 className="mb-4 text-sm font-semibold text-[#e2e8f0]">Risk Distribution</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { label: "Critical (≥85)", count: stats.critical, color: "bg-red-500", textColor: "text-red-400" },
            { label: "High (70–84)", count: stats.high, color: "bg-orange-500", textColor: "text-orange-400" },
            { label: "Medium (40–69)", count: stats.medium, color: "bg-amber-500", textColor: "text-amber-400" },
            { label: "Low (<40)", count: stats.low, color: "bg-emerald-500", textColor: "text-emerald-400" },
          ].map((item) => {
            const maxCount = Math.max(stats.critical, stats.high, stats.medium, stats.low, 1);
            const widthPct = (item.count / maxCount) * 100;
            return (
              <div key={item.label}>
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-xs text-[#94a3b8]">{item.label}</span>
                  <span className={`text-sm font-bold ${item.textColor}`}>{item.count}</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${widthPct}%` }}
                    transition={{ duration: 0.8, ease: "easeOut", delay: 0.2 }}
                    className={`h-full rounded-full ${item.color}`}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#4a5568]" />
          <Input
            placeholder="Search by name, ID, or gang..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-white/10 bg-white/5 pl-10 text-[#e2e8f0] placeholder-[#4a5568] focus:border-emerald-500/50"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={`border-white/10 ${showFilters ? "bg-emerald-600/20 text-emerald-400 border-emerald-500/30" : "bg-white/5 text-[#94a3b8] hover:bg-white/10"}`}
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filters
          {(filterGang !== "all" || filterRisk !== "all" || filterGender !== "all") && (
            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-[10px] font-bold text-white">
              {[filterGang, filterRisk, filterGender].filter((f) => f !== "all").length}
            </span>
          )}
        </Button>
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
              <Select value={filterGang} onValueChange={setFilterGang}>
                <SelectTrigger className="w-[180px] border-white/10 bg-white/5 text-[#94a3b8]">
                  <SelectValue placeholder="Gang" />
                </SelectTrigger>
                <SelectContent className="border-[#2a3550] bg-[#1a2035]">
                  <SelectItem value="all" className="text-[#94a3b8]">All Gangs</SelectItem>
                  <SelectItem value="independent" className="text-[#94a3b8]">Independent</SelectItem>
                  {gangs.map((g) => (
                    <SelectItem key={g.id} value={g.id} className="text-[#94a3b8]">
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterRisk} onValueChange={setFilterRisk}>
                <SelectTrigger className="w-[140px] border-white/10 bg-white/5 text-[#94a3b8]">
                  <SelectValue placeholder="Risk Level" />
                </SelectTrigger>
                <SelectContent className="border-[#2a3550] bg-[#1a2035]">
                  <SelectItem value="all" className="text-[#94a3b8]">All Levels</SelectItem>
                  <SelectItem value="High" className="text-[#94a3b8]">High</SelectItem>
                  <SelectItem value="Medium" className="text-[#94a3b8]">Medium</SelectItem>
                  <SelectItem value="Low" className="text-[#94a3b8]">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterGender} onValueChange={setFilterGender}>
                <SelectTrigger className="w-[130px] border-white/10 bg-white/5 text-[#94a3b8]">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent className="border-[#2a3550] bg-[#1a2035]">
                  <SelectItem value="all" className="text-[#94a3b8]">All Genders</SelectItem>
                  <SelectItem value="Male" className="text-[#94a3b8]">Male</SelectItem>
                  <SelectItem value="Female" className="text-[#94a3b8]">Female</SelectItem>
                </SelectContent>
              </Select>
              <div className="ml-auto text-xs text-[#64748b]">
                {filteredData.length} of {accused.length} criminals
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
      >
        {filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Users className="mb-4 h-12 w-12 text-[#4a5568]" />
            <p className="text-sm font-medium text-[#94a3b8]">No criminals found</p>
            <p className="mt-1 text-xs text-[#4a5568]">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                {[
                  { field: "id" as SortField, label: "ID" },
                  { field: "name" as SortField, label: "Name" },
                  { field: "age" as SortField, label: "Age" },
                  { field: "gender" as SortField, label: "Gender" },
                  { field: "gang" as SortField, label: "Gang" },
                  { field: "risk" as SortField, label: "Risk Score" },
                  { field: "prior_firs" as SortField, label: "Prior FIRs" },
                  { field: "status" as SortField, label: "Status" },
                ].map((col) => (
                  <TableHead
                    key={col.field}
                    className="cursor-pointer select-none text-[11px] font-semibold uppercase tracking-wider text-[#64748b] hover:text-[#94a3b8]"
                    onClick={() => handleSort(col.field)}
                  >
                    <span className="flex items-center">
                      {col.label}
                      <SortIcon field={col.field} />
                    </span>
                  </TableHead>
                ))}
                <TableHead className="text-right text-[11px] font-semibold uppercase tracking-wider text-[#64748b]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((acc, idx) => (
                <motion.tr
                  key={acc.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="cursor-pointer border-white/5 transition-colors hover:bg-white/5"
                  onClick={() => handleRowClick(acc.id)}
                >
                  <TableCell className="font-mono text-xs text-[#94a3b8]">{acc.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                          acc.gender === "Male"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-pink-500/20 text-pink-400"
                        }`}
                      >
                        {acc.name.charAt(0)}
                      </div>
                      <span className="text-sm font-medium text-[#e2e8f0]">{acc.name}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-[#94a3b8]">{acc.age}</TableCell>
                  <TableCell className="text-sm text-[#94a3b8]">{acc.gender}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${getGangBadgeStyle(
                        acc.gang
                      )}`}
                    >
                      {getGangName(acc.gang, gangs)}
                    </span>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="w-24">
                        <Progress
                          value={acc.risk}
                          className={`h-2 bg-white/10 [&>div]:rounded-full ${getRiskBarColor(acc.risk)}`}
                        />
                      </div>
                      <span className={`text-sm font-bold tabular-nums ${getRiskColor(acc.risk)}`}>
                        {acc.risk}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-[#94a3b8]">{acc.prior_firs}</TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium ${
                        acc.risk > 70
                          ? "bg-red-500/20 text-red-400 border-red-500/30"
                          : acc.risk > 40
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                      }`}
                    >
                      {acc.risk > 70 ? (
                        <AlertTriangle className="h-3 w-3" />
                      ) : acc.risk > 40 ? (
                        <AlertTriangle className="h-3 w-3" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3" />
                      )}
                      {getRiskLevel(acc.risk)} Risk
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[#64748b] hover:text-emerald-400"
                        onClick={(e) => handleViewProfile(e, acc.id)}
                        title="View Profile"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[#64748b] hover:text-blue-400"
                        onClick={(e) => handleViewFIRs(e, acc.id)}
                        title="View Linked FIRs"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[#64748b] hover:text-purple-400"
                        onClick={(e) => handleRiskAnalysis(e, acc)}
                        title="Risk Analysis"
                      >
                        <Brain className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </TableBody>
          </Table>
        )}
      </motion.div>
    </div>
  );
}