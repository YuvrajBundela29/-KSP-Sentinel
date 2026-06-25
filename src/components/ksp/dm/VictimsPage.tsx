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
  FileDown,
  FileSpreadsheet,
  FileJson,
  Printer,
  ChevronDown,
  Eye,
  MapPin,
  Users,
  Map,
  Calendar,
  FileText,
  Building2,
  Target,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { loadCrimeData } from "@/lib/data";
import type { Victim, FIR } from "@/lib/types";
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

// ─── Aggregated Victim ───────────────────────────────────────────────
interface AggregatedVictim {
  name: string;
  ages: (number | null)[];
  genders: (string | null)[];
  occupations: string[];
  districts: string[];
  crimeTypes: string[];
  firs: FIR[];
  lastIncidentDate: string;
}

// ─── Main Component ──────────────────────────────────────────────────
export default function VictimsPage() {
  const {
    crimeData,
    setCrimeData,
    addAuditLog,
    setView,
    setSelectedFirId,
  } = useAppStore();

  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGender, setFilterGender] = useState<string>("all");
  const [filterDistrict, setFilterDistrict] = useState<string>("all");
  const [filterCrimeType, setFilterCrimeType] = useState<string>("all");
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

  // ── Aggregate victims from FIRs ──
  const aggregatedVictims = useMemo((): AggregatedVictim[] => {
    const firs = crimeData?.firs ?? [];
    const record: Record<string, AggregatedVictim> = {};

    for (const fir of firs) {
      const key = fir.victim.name.trim();
      if (!key) continue;

      const existing = record[key];
      if (existing) {
        existing.ages.push(fir.victim.age);
        existing.genders.push(fir.victim.gender);
        if (fir.victim.occupation && !existing.occupations.includes(fir.victim.occupation)) {
          existing.occupations.push(fir.victim.occupation);
        }
        if (!existing.districts.includes(fir.district)) {
          existing.districts.push(fir.district);
        }
        if (!existing.crimeTypes.includes(fir.crime_type)) {
          existing.crimeTypes.push(fir.crime_type);
        }
        existing.firs.push(fir);
        if (fir.date > existing.lastIncidentDate) {
          existing.lastIncidentDate = fir.date;
        }
      } else {
        record[key] = {
          name: key,
          ages: [fir.victim.age],
          genders: [fir.victim.gender],
          occupations: fir.victim.occupation ? [fir.victim.occupation] : [],
          districts: [fir.district],
          crimeTypes: [fir.crime_type],
          firs: [fir],
          lastIncidentDate: fir.date,
        };
      }
    }

    return Object.values(record);
  }, [crimeData]);

  // ── Unique filter options ──
  const allDistricts = useMemo(
    () => [...new Set(aggregatedVictims.flatMap((v) => v.districts))].sort(),
    [aggregatedVictims]
  );

  const allCrimeTypes = useMemo(
    () => [...new Set(aggregatedVictims.flatMap((v) => v.crimeTypes))].sort(),
    [aggregatedVictims]
  );

  // ── Stats ──
  const stats = useMemo(() => {
    const totalVictims = aggregatedVictims.length;
    const uniqueDistricts = allDistricts.length;

    // Most common crime type
    const crimeCounts: Record<string, number> = {};
    for (const v of aggregatedVictims) {
      for (const ct of v.crimeTypes) {
        crimeCounts[ct] = (crimeCounts[ct] ?? 0) + 1;
      }
    }
    let mostCommonCrime = "—";
    let maxCount = 0;
    for (const crime of Object.keys(crimeCounts)) {
      const count = crimeCounts[crime];
      if (count > maxCount) {
        maxCount = count;
        mostCommonCrime = crime;
      }
    }

    return { totalVictims, uniqueDistricts, mostCommonCrime };
  }, [aggregatedVictims, allDistricts]);

  // ── Filtered data ──
  const filteredData = useMemo(() => {
    let items = [...aggregatedVictims];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      items = items.filter((v) => v.name.toLowerCase().includes(q));
    }

    if (filterGender !== "all") {
      items = items.filter((v) => v.genders.some((g) => g === filterGender));
    }

    if (filterDistrict !== "all") {
      items = items.filter((v) => v.districts.includes(filterDistrict));
    }

    if (filterCrimeType !== "all") {
      items = items.filter((v) => v.crimeTypes.includes(filterCrimeType));
    }

    // Sort by last incident date descending
    items.sort((a, b) => b.lastIncidentDate.localeCompare(a.lastIncidentDate));

    return items;
  }, [aggregatedVictims, searchQuery, filterGender, filterDistrict, filterCrimeType]);

  // ── Handlers ──
  const handleViewFIRs = useCallback(
    (e: React.MouseEvent, name: string) => {
      e.stopPropagation();
      const victim = aggregatedVictims.find((v) => v.name === name);
      if (victim && victim.firs.length > 0) {
        setSelectedFirId(victim.firs[0].fir_id);
        setView("dm-fir");
        addAuditLog({
          user: "Current User",
          role: "investigator",
          action: "view_victim_firs",
          entity: "victim",
          entityId: name,
          oldValue: "",
          newValue: `${victim.firs.length} FIRs viewed`,
          status: "success",
        });
      }
    },
    [aggregatedVictims, setSelectedFirId, setView, addAuditLog]
  );

  const handleViewOnMap = useCallback(
    (e: React.MouseEvent, name: string) => {
      e.stopPropagation();
      setView("map");
      addAuditLog({
        user: "Current User",
        role: "investigator",
        action: "view_victim_on_map",
        entity: "victim",
        entityId: name,
        oldValue: "",
        newValue: "Map view opened",
        status: "success",
      });
    },
    [setView, addAuditLog]
  );

  const handleExport = useCallback(
    (format: "csv" | "json" | "excel" | "print") => {
      const data = filteredData.map((v) => ({
        Name: v.name,
        Age: v.ages.find((a) => a !== null) ?? "N/A",
        Gender: v.genders.find((g) => g !== null) ?? "N/A",
        Occupation: v.occupations.join("; "),
        "Crimes Against": v.firs.length,
        Districts: v.districts.join("; "),
        "Last Incident": v.lastIncidentDate,
        "Crime Types": v.crimeTypes.join("; "),
        "Linked FIRs": v.firs.map((f) => f.fir_id).join("; "),
      }));

      switch (format) {
        case "csv":
          exportToCSV(data, "victims_export");
          break;
        case "json":
          exportToJSON(data, "victims_export");
          break;
        case "excel":
          exportToExcel(data, "victims_export");
          break;
        case "print":
          exportToPrint("victims-print-area");
          break;
      }

      addAuditLog({
        user: "Current User",
        role: "investigator",
        action: `export_victims_${format}`,
        entity: "victim",
        entityId: "-",
        oldValue: "",
        newValue: `${filteredData.length} records`,
        status: "success",
      });
    },
    [filteredData, addAuditLog]
  );

  // Helper: display age/gender (pick the non-null one)
  const getDisplayAge = (ages: (number | null)[]) => {
    const valid = ages.find((a) => a !== null);
    return valid ?? "—";
  };

  const getDisplayGender = (genders: (string | null)[]) => {
    const valid = genders.find((g) => g !== null);
    return valid ?? "—";
  };

  // ── Loading state ──
  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48 bg-white/5" />
          <Skeleton className="h-9 w-24 bg-white/5" />
        </div>
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
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
    <div className="space-y-6 p-6" id="victims-print-area">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#f1f5f9]">Victims Registry</h1>
          <p className="mt-1 text-sm text-[#5a657a]">
            Aggregated victim data across all FIRs with cross-case analysis
          </p>
        </div>
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
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {
            label: "Total Unique Victims",
            value: stats.totalVictims,
            icon: <Users className="h-5 w-5 text-[#34d399]" />,
            accent: "border-[rgba(52,211,153,0.15)]",
            valueColor: "text-[#34d399]",
          },
          {
            label: "Unique Districts Affected",
            value: stats.uniqueDistricts,
            icon: <Building2 className="h-5 w-5 text-[#22d3ee]" />,
            accent: "border-[rgba(34,211,238,0.15)]",
            valueColor: "text-[#22d3ee]",
          },
          {
            label: "Most Common Crime Type",
            value: stats.mostCommonCrime,
            icon: <Target className="h-5 w-5 text-[#fbbf24]" />,
            accent: "border-[rgba(251,191,36,0.15)]",
            valueColor: "text-[#fbbf24]",
            isText: true,
          },
        ].map((stat) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`rounded-2xl border bg-white/5 backdrop-blur-xl p-4 ${stat.accent}`}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-[#5a657a]">{stat.label}</p>
              {stat.icon}
            </div>
            <p
              className={`mt-2 ${"isText" in stat && stat.isText ? "text-xl" : "text-2xl"} font-bold ${
                stat.valueColor
              }`}
            >
              {"isText" in stat && stat.isText ? stat.value : formatNumber(stat.value as number)}
            </p>
          </motion.div>
        ))}
      </div>

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#3d4659]" />
          <Input
            placeholder="Search by victim name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="border-white/10 bg-white/5 pl-10 text-[#f1f5f9] placeholder-[#3d4659] focus:border-[rgba(52,211,153,0.3)]"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className={`border-white/10 ${
            showFilters
              ? "bg-[rgba(52,211,153,0.12)] text-[#34d399] border-[rgba(52,211,153,0.15)]"
              : "bg-white/5 text-[#8b97b0] hover:bg-white/10"
          }`}
        >
          <SlidersHorizontal className="mr-2 h-4 w-4" />
          Filters
          {(filterGender !== "all" || filterDistrict !== "all" || filterCrimeType !== "all") && (
            <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-[#34d399] text-[10px] font-bold text-white">
              {[filterGender, filterDistrict, filterCrimeType].filter((f) => f !== "all").length}
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
              <Select value={filterGender} onValueChange={setFilterGender}>
                <SelectTrigger className="w-[150px] border-white/10 bg-white/5 text-[#8b97b0]">
                  <SelectValue placeholder="Gender" />
                </SelectTrigger>
                <SelectContent className="border-[rgba(255,255,255,0.06)] bg-[rgba(15,21,36,0.45)]">
                  <SelectItem value="all" className="text-[#8b97b0]">All Genders</SelectItem>
                  <SelectItem value="Male" className="text-[#8b97b0]">Male</SelectItem>
                  <SelectItem value="Female" className="text-[#8b97b0]">Female</SelectItem>
                </SelectContent>
              </Select>
              <Select value={filterDistrict} onValueChange={setFilterDistrict}>
                <SelectTrigger className="w-[200px] border-white/10 bg-white/5 text-[#8b97b0]">
                  <SelectValue placeholder="District" />
                </SelectTrigger>
                <SelectContent className="border-[rgba(255,255,255,0.06)] bg-[rgba(15,21,36,0.45)]">
                  <SelectItem value="all" className="text-[#8b97b0]">All Districts</SelectItem>
                  {allDistricts.map((d) => (
                    <SelectItem key={d} value={d} className="text-[#8b97b0]">
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterCrimeType} onValueChange={setFilterCrimeType}>
                <SelectTrigger className="w-[180px] border-white/10 bg-white/5 text-[#8b97b0]">
                  <SelectValue placeholder="Crime Type" />
                </SelectTrigger>
                <SelectContent className="border-[rgba(255,255,255,0.06)] bg-[rgba(15,21,36,0.45)]">
                  <SelectItem value="all" className="text-[#8b97b0]">All Crime Types</SelectItem>
                  {allCrimeTypes.map((ct) => (
                    <SelectItem key={ct} value={ct} className="text-[#8b97b0]">
                      {ct}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="ml-auto text-xs text-[#5a657a]">
                {filteredData.length} of {aggregatedVictims.length} victims
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
      >
        {filteredData.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Users className="mb-4 h-12 w-12 text-[#3d4659]" />
            <p className="text-sm font-medium text-[#8b97b0]">No victims found</p>
            <p className="mt-1 text-xs text-[#3d4659]">
              Try adjusting your search or filters
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="border-white/10 hover:bg-transparent">
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-[#5a657a]">
                  Name
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-[#5a657a]">
                  Age
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-[#5a657a]">
                  Gender
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-[#5a657a]">
                  Occupation
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-[#5a657a]">
                  Crimes Against
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-[#5a657a]">
                  Districts
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-[#5a657a]">
                  Last Incident
                </TableHead>
                <TableHead className="text-[10px] font-semibold uppercase tracking-wider text-[#5a657a]">
                  Linked FIRs
                </TableHead>
                <TableHead className="text-right text-[10px] font-semibold uppercase tracking-wider text-[#5a657a]">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.map((victim, idx) => (
                <motion.tr
                  key={victim.name}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className="border-white/5 transition-colors hover:bg-white/5"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                          getDisplayGender(victim.genders) === "Female"
                            ? "bg-[rgba(248,113,113,0.12)] text-[#f87171]"
                            : "bg-[rgba(34,211,238,0.12)] text-[#22d3ee]"
                        }`}
                      >
                        {victim.name.charAt(0)}
                      </div>
                      <span className="max-w-[200px] truncate text-sm font-medium text-[#f1f5f9]" title={victim.name}>
                        {victim.name}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm text-[#8b97b0]">
                    {getDisplayAge(victim.ages)}
                  </TableCell>
                  <TableCell>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${
                        getDisplayGender(victim.genders) === "Female"
                          ? "bg-[rgba(248,113,113,0.12)] text-[#f87171] border-[rgba(248,113,113,0.15)]"
                          : "bg-[rgba(34,211,238,0.12)] text-[#22d3ee] border-[rgba(34,211,238,0.15)]"
                      }`}
                    >
                      {getDisplayGender(victim.genders)}
                    </span>
                  </TableCell>
                  <TableCell className="max-w-[160px]">
                    <div className="flex flex-wrap gap-1">
                      {victim.occupations.slice(0, 2).map((occ) => (
                        <Badge
                          key={occ}
                          variant="outline"
                          className="border-white/10 text-[10px] text-[#8b97b0]"
                        >
                          {occ}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className="text-lg font-bold text-[#34d399]">{victim.firs.length}</span>
                      <span className="text-xs text-[#3d4659]">case{victim.firs.length !== 1 ? "s" : ""}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {victim.districts.map((d) => (
                        <span
                          key={d}
                          className="inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-[#8b97b0]"
                        >
                          <MapPin className="h-2.5 w-2.5 text-[#3d4659]" />
                          {d}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-[#8b97b0]">
                      <Calendar className="h-3 w-3 text-[#3d4659]" />
                      {new Date(victim.lastIncidentDate).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {victim.firs.map((fir) => (
                        <button
                          key={fir.fir_id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFirId(fir.fir_id);
                            setView("dm-fir");
                          }}
                          className="font-mono text-[10px] text-[#34d399] hover:text-[#6ee7b7] hover:underline"
                        >
                          {fir.fir_id}
                        </button>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[#5a657a] hover:text-[#34d399]"
                        onClick={(e) => handleViewFIRs(e, victim.name)}
                        title="View Linked FIRs"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-[#5a657a] hover:text-[#22d3ee]"
                        onClick={(e) => handleViewOnMap(e, victim.name)}
                        title="View on Map"
                      >
                        <Map className="h-3.5 w-3.5" />
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