"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { useAppStore } from "@/lib/store";
import type { FIR } from "@/lib/types";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import LoadingSpinner from "@/components/ksp/LoadingSpinner";

// Dynamic imports for Leaflet (requires window)
const MapContainer = dynamic(
  () => import("react-leaflet").then((mod) => mod.MapContainer),
  { ssr: false }
);
const TileLayer = dynamic(
  () => import("react-leaflet").then((mod) => mod.TileLayer),
  { ssr: false }
);
const CircleMarker = dynamic(
  () => import("react-leaflet").then((mod) => mod.CircleMarker),
  { ssr: false }
);
const Popup = dynamic(
  () => import("react-leaflet").then((mod) => mod.Popup),
  { ssr: false }
);

// --- Constants ---

const CRIME_TYPES = [
  "Chain Snatching",
  "Vehicle Theft",
  "Cyber Fraud",
  "Jewellery Heist",
  "Drug Trafficking",
] as const;

const SEVERITY_CONFIG: Record<
  string,
  { color: string; radius: number }
> = {
  critical: { color: "#ef4444", radius: 8 },
  high: { color: "#f97316", radius: 6 },
  medium: { color: "#eab308", radius: 5 },
};

export default function CrimeMap() {
  const crimeData = useAppStore((s) => s.crimeData);

  // --- Filter State ---
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    [...CRIME_TYPES]
  );
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");

  // --- Handlers ---
  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type)
        ? prev.filter((t) => t !== type)
        : [...prev, type]
    );
  };

  // --- Filtered FIRs ---
  const filteredFirs = useMemo<FIR[]>(() => {
    if (!crimeData) return [];

    return crimeData.firs.filter((fir) => {
      // Crime type filter
      if (!selectedTypes.includes(fir.crime_type)) return false;

      // Year filter
      if (selectedYear !== "all") {
        const firYear = new Date(fir.date).getFullYear().toString();
        if (firYear !== selectedYear) return false;
      }

      // Severity filter
      if (selectedSeverity !== "all" && fir.severity !== selectedSeverity)
        return false;

      return true;
    });
  }, [crimeData, selectedTypes, selectedYear, selectedSeverity]);

  // --- Stats ---
  const stats = useMemo(() => {
    if (filteredFirs.length === 0) {
      return {
        topDistricts: [] as { name: string; count: number }[],
        commonCrime: "N/A",
      };
    }

    // District counts
    const districtMap = new Map<string, number>();
    const crimeTypeMap = new Map<string, number>();

    for (const fir of filteredFirs) {
      districtMap.set(fir.district, (districtMap.get(fir.district) ?? 0) + 1);
      crimeTypeMap.set(
        fir.crime_type,
        (crimeTypeMap.get(fir.crime_type) ?? 0) + 1
      );
    }

    // Top 3 districts
    const topDistricts = [...districtMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

    // Most common crime type
    let commonCrime = "N/A";
    let maxCount = 0;
    for (const [type, count] of crimeTypeMap.entries()) {
      if (count > maxCount) {
        maxCount = count;
        commonCrime = type;
      }
    }

    return { topDistricts, commonCrime };
  }, [filteredFirs]);

  // --- District Table ---
  const districtTable = useMemo(() => {
    const map = new Map<string, number>();
    for (const fir of filteredFirs) {
      map.set(fir.district, (map.get(fir.district) ?? 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([district, count]) => ({ district, count }));
  }, [filteredFirs]);

  // --- Loading State ---
  if (!crimeData) {
    return <LoadingSpinner message="Loading crime map data..." />;
  }

  return (
    <div className="flex flex-col w-full" style={{ height: "calc(100vh - 14rem)" }}>
      {/* Map Container */}
      <div className="relative flex-1 min-h-0">
        <MapContainer
          center={[15.3173, 75.7139]}
          zoom={7}
          style={{ height: "100%", width: "100%" }}
          className="z-0"
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {filteredFirs.map((fir) => {
            const cfg = SEVERITY_CONFIG[fir.severity];
            if (!cfg) return null;
            return (
              <CircleMarker
                key={fir.fir_id}
                center={[fir.location.lat, fir.location.lng]}
                radius={cfg.radius}
                pathOptions={{
                  color: "#ffffff",
                  weight: 1,
                  fillColor: cfg.color,
                  fillOpacity: 0.7,
                }}
              >
                <Popup>
                  <div className="bg-[#0a0f1e] text-[#e2e8f0] p-3 rounded text-xs space-y-1 min-w-[180px]">
                    <p className="font-bold text-sm text-white">
                      {fir.fir_id}
                    </p>
                    <p>
                      <span className="text-[#94a3b8]">Date:</span>{" "}
                      {fir.date}
                    </p>
                    <p>
                      <span className="text-[#94a3b8]">Crime Type:</span>{" "}
                      {fir.crime_type}
                    </p>
                    <p>
                      <span className="text-[#94a3b8]">District:</span>{" "}
                      {fir.district}
                    </p>
                    <p>
                      <span className="text-[#94a3b8]">Status:</span>{" "}
                      {fir.investigation_status}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>

        {/* Filter Panel — Left */}
        <div className="absolute top-4 left-4 z-[1000] w-64 bg-[#1a2035]/95 backdrop-blur border border-[#2a3550] rounded-lg p-4">
          <h3 className="text-[#e2e8f0] font-semibold text-sm mb-3">
            Filters
          </h3>

          {/* Crime Type Checkboxes */}
          <div className="space-y-2 mb-4">
            {CRIME_TYPES.map((type) => (
              <label
                key={type}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Checkbox
                  checked={selectedTypes.includes(type)}
                  onCheckedChange={() => toggleType(type)}
                  className="border-[#2a3550] data-[state=checked]:bg-[#e2e8f0] data-[state=checked]:text-[#0a0f1e]"
                />
                <span className="text-[#e2e8f0] text-xs">{type}</span>
              </label>
            ))}
          </div>

          {/* Year Dropdown */}
          <div className="mb-4">
            <p className="text-[#94a3b8] text-xs mb-1.5">Year</p>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-full bg-[#0a0f1e] border-[#2a3550] text-[#e2e8f0] text-xs h-8">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="2022">2022</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2025">2025</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Severity Dropdown */}
          <div>
            <p className="text-[#94a3b8] text-xs mb-1.5">Severity</p>
            <Select
              value={selectedSeverity}
              onValueChange={setSelectedSeverity}
            >
              <SelectTrigger className="w-full bg-[#0a0f1e] border-[#2a3550] text-[#e2e8f0] text-xs h-8">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Panel — Right */}
        <div className="absolute top-4 right-4 z-[1000] w-64 bg-[#1a2035]/95 backdrop-blur border border-[#2a3550] rounded-lg p-4">
          <h3 className="text-[#e2e8f0] font-semibold text-sm mb-3">
            Statistics
          </h3>

          {/* Top 3 Districts */}
          <div className="mb-4">
            <p className="text-[#94a3b8] text-xs mb-2">Top Districts</p>
            {stats.topDistricts.length === 0 ? (
              <p className="text-[#94a3b8] text-xs">No data</p>
            ) : (
              <div className="space-y-1.5">
                {stats.topDistricts.map((d, i) => (
                  <div
                    key={d.name}
                    className="flex items-center justify-between"
                  >
                    <span className="text-[#e2e8f0] text-xs flex items-center gap-2">
                      <span
                        className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold"
                        style={{
                          backgroundColor:
                            i === 0
                              ? "#ef4444"
                              : i === 1
                              ? "#f97316"
                              : "#eab308",
                          color: "#fff",
                        }}
                      >
                        {i + 1}
                      </span>
                      {d.name}
                    </span>
                    <span className="text-[#e2e8f0] text-xs font-semibold">
                      {d.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Most Common Crime */}
          <div>
            <p className="text-[#94a3b8] text-xs mb-1">Most Common Crime</p>
            <p className="text-[#e2e8f0] text-sm font-medium">
              {stats.commonCrime}
            </p>
          </div>
        </div>
      </div>

      {/* District Summary Table */}
      <div className="mt-3 max-h-48 overflow-y-auto bg-[#1a2035] border border-[#2a3550] rounded-lg">
        <Table>
          <TableHeader>
            <TableRow className="border-[#2a3550] hover:bg-transparent">
              <TableHead className="text-[#94a3b8] text-xs font-semibold">
                District
              </TableHead>
              <TableHead className="text-[#94a3b8] text-xs font-semibold text-right">
                Crime Count
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {districtTable.length === 0 ? (
              <TableRow className="border-[#2a3550] hover:bg-transparent">
                <TableCell
                  colSpan={2}
                  className="text-[#94a3b8] text-xs text-center py-4"
                >
                  No matching records
                </TableCell>
              </TableRow>
            ) : (
              districtTable.map((row) => (
                <TableRow
                  key={row.district}
                  className="border-[#2a3550] hover:bg-[#0a0f1e]/60"
                >
                  <TableCell className="text-[#e2e8f0] text-xs">
                    {row.district}
                  </TableCell>
                  <TableCell className="text-[#e2e8f0] text-xs text-right font-medium">
                    {row.count}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}