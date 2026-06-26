"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Filter,
  MapPin,
  BarChart3,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
const Circle = dynamic(
  () => import("react-leaflet").then((mod) => mod.Circle),
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
  { color: string; radius: number; bg: string; border: string }
> = {
  critical: { color: "#f87171", radius: 12, bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.25)" },
  high: { color: "#fbbf24", radius: 10, bg: "rgba(251,191,36,0.12)", border: "rgba(251,191,36,0.25)" },
  medium: { color: "#eab308", radius: 8, bg: "rgba(234,179,8,0.12)", border: "rgba(234,179,8,0.25)" },
  low: { color: "#34d399", radius: 6, bg: "rgba(52,211,153,0.12)", border: "rgba(52,211,153,0.25)" },
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

// --- Glass Card Styles ---

const glassCard: React.CSSProperties = {
  background: "rgba(15, 21, 36, 0.92)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  borderRadius: "14px",
  boxShadow:
    "0 24px 48px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.03)",
};

const glassCardCompact: React.CSSProperties = {
  background: "rgba(13, 18, 33, 0.92)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  borderRadius: "10px",
  boxShadow: "0 8px 24px -8px rgba(0, 0, 0, 0.5)",
};

const selectTriggerStyle: React.CSSProperties = {
  background: "rgba(10, 15, 28, 0.8)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  color: "#f1f5f9",
  fontSize: "12px",
  height: "32px",
};

export default function CrimeMap() {
  const crimeData = useAppStore((s) => s.crimeData);

  // --- Filter State ---
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    [...CRIME_TYPES]
  );
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [selectedDistrict, setSelectedDistrict] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"markers" | "heatmap">("markers");
  const [filterPanelOpen, setFilterPanelOpen] = useState(true);
  const [statsPanelOpen, setStatsPanelOpen] = useState(true);

  // --- Available districts ---
  const availableDistricts = useMemo(() => {
    if (!crimeData) return [];
    const districts = new Set(crimeData.firs.map((f) => f.district));
    return Array.from(districts).sort();
  }, [crimeData]);

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
      if (!selectedTypes.includes(fir.crime_type)) return false;
      if (selectedYear !== "all") {
        const firYear = new Date(fir.date).getFullYear().toString();
        if (firYear !== selectedYear) return false;
      }
      if (selectedSeverity !== "all" && fir.severity !== selectedSeverity)
        return false;
      if (selectedDistrict !== "all" && fir.district !== selectedDistrict)
        return false;
      return true;
    });
  }, [crimeData, selectedTypes, selectedYear, selectedSeverity, selectedDistrict]);

  // --- Stats ---
  const stats = useMemo(() => {
    if (filteredFirs.length === 0) {
      return {
        topDistricts: [] as { name: string; count: number }[],
        commonCrime: "N/A",
      };
    }

    const districtMap = new Map<string, number>();
    const crimeTypeMap = new Map<string, number>();

    for (const fir of filteredFirs) {
      districtMap.set(fir.district, (districtMap.get(fir.district) ?? 0) + 1);
      crimeTypeMap.set(
        fir.crime_type,
        (crimeTypeMap.get(fir.crime_type) ?? 0) + 1
      );
    }

    const topDistricts = [...districtMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([name, count]) => ({ name, count }));

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

  // --- Cluster Detection ---
  const clusters = useMemo(() => {
    if (filteredFirs.length === 0) return [];

    const visited = new Set<string>();
    const result: { firs: FIR[]; center: [number, number]; locationName: string }[] = [];

    for (const fir of filteredFirs) {
      if (visited.has(fir.fir_id)) continue;

      const clusterFirs: FIR[] = [fir];
      visited.add(fir.fir_id);

      let changed = true;
      while (changed) {
        changed = false;
        for (const other of filteredFirs) {
          if (visited.has(other.fir_id)) continue;
          const latDiff = Math.abs(other.location.lat - fir.location.lat);
          const lngDiff = Math.abs(other.location.lng - fir.location.lng);
          if (latDiff <= 0.05 && lngDiff <= 0.05) {
            for (const member of clusterFirs) {
              const dLat = Math.abs(other.location.lat - member.location.lat);
              const dLng = Math.abs(other.location.lng - member.location.lng);
              if (dLat <= 0.05 && dLng <= 0.05) {
                clusterFirs.push(other);
                visited.add(other.fir_id);
                changed = true;
                break;
              }
            }
          }
        }
      }

      if (clusterFirs.length >= 3) {
        const avgLat =
          clusterFirs.reduce((s, f) => s + f.location.lat, 0) / clusterFirs.length;
        const avgLng =
          clusterFirs.reduce((s, f) => s + f.location.lng, 0) / clusterFirs.length;
        const nameCounts = new Map<string, number>();
        for (const f of clusterFirs) {
          nameCounts.set(f.district, (nameCounts.get(f.district) ?? 0) + 1);
        }
        const topName = [...nameCounts.entries()].sort((a, b) => b[1] - a[1])[0][0];
        result.push({ firs: clusterFirs, center: [avgLat, avgLng], locationName: topName });
      }
    }

    return result.sort((a, b) => b.firs.length - a.firs.length);
  }, [filteredFirs]);

  // --- Heat Points ---
  const heatPoints = useMemo(() => {
    if (filteredFirs.length === 0) return [];

    const THRESHOLD = 0.05;
    const assigned = new Set<string>();
    const points: { center: [number, number]; intensity: number }[] = [];

    for (const cluster of clusters) {
      points.push({
        center: cluster.center,
        intensity: cluster.firs.length,
      });
      for (const f of cluster.firs) {
        assigned.add(f.fir_id);
      }
    }

    const remaining = filteredFirs.filter((f) => !assigned.has(f.fir_id));
    const grouped = new Set<string>();

    for (const fir of remaining) {
      if (grouped.has(fir.fir_id)) continue;
      const group = [fir];
      grouped.add(fir.fir_id);

      for (const other of remaining) {
        if (grouped.has(other.fir_id)) continue;
        const dLat = Math.abs(other.location.lat - fir.location.lat);
        const dLng = Math.abs(other.location.lng - fir.location.lng);
        if (dLat <= THRESHOLD && dLng <= THRESHOLD) {
          group.push(other);
          grouped.add(other.fir_id);
        }
      }

      if (group.length >= 2) {
        const avgLat =
          group.reduce((s, f) => s + f.location.lat, 0) / group.length;
        const avgLng =
          group.reduce((s, f) => s + f.location.lng, 0) / group.length;
        points.push({ center: [avgLat, avgLng], intensity: group.length });
      } else {
        points.push({
          center: [fir.location.lat, fir.location.lng],
          intensity: 1,
        });
      }
    }

    return points;
  }, [filteredFirs, clusters]);

  // --- Crime Density Stats ---
  const densityStats = useMemo(() => {
    if (filteredFirs.length === 0) {
      return {
        highestDensity: "N/A",
        avgCrimesPerLocation: 0,
        numClusters: 0,
        topClusters: [] as { name: string; count: number }[],
      };
    }

    const topClusters = clusters.slice(0, 3).map((c) => ({
      name: c.locationName,
      count: c.firs.length,
    }));

    const uniqueLocations = new Set(
      filteredFirs.map((f) => `${f.location.lat.toFixed(4)},${f.location.lng.toFixed(4)}`)
    ).size;

    return {
      highestDensity:
        clusters.length > 0
          ? `${clusters[0].locationName} (${clusters[0].firs.length} FIRs)`
          : "N/A",
      avgCrimesPerLocation:
        Math.round((filteredFirs.length / Math.max(uniqueLocations, 1)) * 10) / 10,
      numClusters: clusters.length,
      topClusters,
    };
  }, [filteredFirs, clusters]);

  // --- Severity breakdown for stats overlay ---
  const severityBreakdown = useMemo(() => {
    const counts: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const fir of filteredFirs) {
      if (counts[fir.severity] !== undefined) counts[fir.severity]++;
    }
    return counts;
  }, [filteredFirs]);

  // --- Loading State ---
  if (!crimeData) {
    return <LoadingSpinner message="Loading crime map data..." />;
  }

  return (
    <div className="flex flex-col h-full w-full">
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
          {viewMode === "markers" &&
            filteredFirs.map((fir) => {
              const cfg = SEVERITY_CONFIG[fir.severity];
              if (!cfg) return null;
              return (
                <CircleMarker
                  key={fir.fir_id}
                  center={[fir.location.lat, fir.location.lng]}
                  radius={cfg.radius}
                  pathOptions={{
                    color: cfg.color,
                    weight: 1.5,
                    fillColor: cfg.color,
                    fillOpacity: 0.5,
                    opacity: 0.9,
                  }}
                >
                  <Popup>
                    <div
                      style={{
                        padding: "0",
                        minWidth: "220px",
                        background: "rgba(15, 21, 36, 0.95)",
                        backdropFilter: "blur(24px)",
                        borderRadius: "12px",
                        border: "1px solid rgba(255,255,255,0.06)",
                        boxShadow:
                          "0 16px 48px -12px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
                        overflow: "hidden",
                      }}
                    >
                      {/* Header */}
                      <div
                        style={{
                          padding: "12px 14px 10px",
                          borderBottom: "1px solid rgba(255,255,255,0.06)",
                          background: "rgba(255,255,255,0.02)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "8px",
                            marginBottom: "6px",
                          }}
                        >
                          <span
                            style={{
                              width: "6px",
                              height: "6px",
                              borderRadius: "50%",
                              background: cfg.color,
                              boxShadow: `0 0 8px ${cfg.color}60`,
                            }}
                          />
                          <p
                            style={{
                              fontWeight: 700,
                              fontSize: "13px",
                              color: "#f1f5f9",
                              letterSpacing: "0.01em",
                            }}
                          >
                            {fir.fir_id}
                          </p>
                        </div>
                        <span
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "5px",
                            padding: "2px 8px",
                            borderRadius: "6px",
                            background: cfg.bg,
                            border: `1px solid ${cfg.border}`,
                            fontSize: "9px",
                            fontWeight: 700,
                            color: cfg.color,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
                          {fir.severity}
                        </span>
                      </div>
                      {/* Body */}
                      <div style={{ padding: "10px 14px 12px" }}>
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "6px",
                          }}
                        >
                          {[
                            { label: "Crime Type", value: fir.crime_type },
                            { label: "Date", value: fir.date },
                            { label: "Time", value: fir.time },
                            { label: "District", value: fir.district },
                            { label: "Status", value: fir.investigation_status },
                            { label: "Location", value: fir.location.place },
                          ].map(({ label, value }) => (
                            <div
                              key={label}
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "baseline",
                              }}
                            >
                              <span
                                style={{
                                  color: "#5a657a",
                                  fontSize: "10px",
                                  fontWeight: 600,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.04em",
                                }}
                              >
                                {label}
                              </span>
                              <span
                                style={{
                                  color: "#c8d0e0",
                                  fontSize: "11px",
                                  textAlign: "right",
                                  maxWidth: "130px",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {value}
                              </span>
                            </div>
                          ))}
                        </div>
                        {fir.accused.length > 0 && (
                          <div style={{ marginTop: "10px", paddingTop: "8px", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                            <p
                              style={{
                                color: "#5a657a",
                                fontSize: "9px",
                                fontWeight: 600,
                                textTransform: "uppercase",
                                letterSpacing: "0.06em",
                                marginBottom: "4px",
                              }}
                            >
                              Accused ({fir.accused.length})
                            </p>
                            <div style={{ display: "flex", flexWrap: "wrap", gap: "3px" }}>
                              {fir.accused.map((a) => (
                                <span
                                  key={a}
                                  style={{
                                    padding: "1px 6px",
                                    borderRadius: "4px",
                                    background: "rgba(248,113,113,0.1)",
                                    border: "1px solid rgba(248,113,113,0.15)",
                                    color: "#f87171",
                                    fontSize: "9px",
                                    fontWeight: 600,
                                  }}
                                >
                                  {a}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          {viewMode === "heatmap" &&
            heatPoints.map((hp, idx) => {
              const maxIntensity = Math.max(
                ...heatPoints.map((p) => p.intensity),
                1
              );
              const normalized = hp.intensity / maxIntensity;

              const radius = 500 + normalized * 4500;
              const opacity = 0.15 + normalized * 0.2;
              const fillColor =
                normalized > 0.6
                  ? "#f87171"
                  : normalized > 0.3
                  ? "#fbbf24"
                  : "#fbbf24";
              return (
                <Circle
                  key={`heat-${idx}`}
                  center={hp.center}
                  radius={radius}
                  pathOptions={{
                    color: "transparent",
                    weight: 0,
                    fillColor,
                    fillOpacity: opacity,
                  }}
                />
              );
            })}
        </MapContainer>

        {/* ── Stats Overlay — Top Center ── */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000]"
        >
          <div className="flex items-center gap-3 px-4 py-2" style={glassCardCompact}>
            {/* Total markers pill */}
            <div className="flex items-center gap-2">
              <MapPin className="size-3.5 text-[#22d3ee]" />
              <span className="text-[12px] font-bold text-[#f1f5f9] tabular-nums">
                {filteredFirs.length}
              </span>
              <span className="text-[11px] text-[#5a657a]">
                {filteredFirs.length === 1 ? "marker" : "markers"}
              </span>
            </div>

            <div className="w-px h-4 bg-[rgba(255,255,255,0.06)]" />

            {/* Severity breakdown */}
            {(["critical", "high", "medium", "low"] as const).map((sev) => {
              const c = SEVERITY_CONFIG[sev];
              return (
                <div key={sev} className="flex items-center gap-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      background: c.color,
                      boxShadow: severityBreakdown[sev] > 0 ? `0 0 6px ${c.color}60` : "none",
                      opacity: severityBreakdown[sev] > 0 ? 1 : 0.3,
                    }}
                  />
                  <span
                    className="text-[10px] font-semibold tabular-nums"
                    style={{ color: severityBreakdown[sev] > 0 ? c.color : "#3d4659" }}
                  >
                    {severityBreakdown[sev]}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>

        {/* ── Filter Panel — Left ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="absolute top-14 left-3 z-[1000] w-60"
          style={glassCard}
        >
          {/* Panel header - collapsible */}
          <button
            onClick={() => setFilterPanelOpen((p) => !p)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-[rgba(255,255,255,0.02)] transition-colors rounded-t-[14px]"
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Filter className="size-3.5 text-[#22d3ee]" />
              <h3
                style={{
                  color: "#f1f5f9",
                  fontWeight: 600,
                  fontSize: "12px",
                  letterSpacing: "0.02em",
                }}
              >
                Filters
              </h3>
              {filteredFirs.length < (crimeData?.firs.length ?? 0) && (
                <span
                  style={{
                    fontSize: "9px",
                    fontWeight: 700,
                    color: "#22d3ee",
                    background: "rgba(34,211,238,0.1)",
                    padding: "1px 6px",
                    borderRadius: "4px",
                    border: "1px solid rgba(34,211,238,0.15)",
                  }}
                >
                  Active
                </span>
              )}
            </div>
            {filterPanelOpen ? (
              <ChevronUp className="size-3.5 text-[#5a657a]" />
            ) : (
              <ChevronDown className="size-3.5 text-[#5a657a]" />
            )}
          </button>

          <AnimatePresence>
            {filterPanelOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4">
                  {/* Crime Type Checkboxes */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "2px",
                      marginBottom: "14px",
                    }}
                  >
                    <p
                      style={{
                        color: "#5a657a",
                        fontSize: "9px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: "6px",
                      }}
                    >
                      Crime Type
                    </p>
                    {CRIME_TYPES.map((type) => (
                      <label
                        key={type}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "10px",
                          cursor: "pointer",
                          padding: "4px 8px",
                          borderRadius: "6px",
                          transition: "background 0.15s ease",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "rgba(255,255,255,0.03)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                        }}
                      >
                        <Checkbox
                          checked={selectedTypes.includes(type)}
                          onCheckedChange={() => toggleType(type)}
                          style={{
                            width: "14px",
                            height: "14px",
                            borderColor: "rgba(255,255,255,0.12)",
                          }}
                        />
                        <span style={{ color: "#c8d0e0", fontSize: "11px" }}>
                          {type}
                        </span>
                      </label>
                    ))}
                  </div>

                  {/* District Filter */}
                  <div style={{ marginBottom: "12px" }}>
                    <p
                      style={{
                        color: "#5a657a",
                        fontSize: "9px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: "6px",
                      }}
                    >
                      District
                    </p>
                    <Select
                      value={selectedDistrict}
                      onValueChange={setSelectedDistrict}
                    >
                      <SelectTrigger style={selectTriggerStyle}>
                        <SelectValue placeholder="All Districts" />
                      </SelectTrigger>
                      <SelectContent className="bg-[rgba(15,21,36,0.95)] border-[rgba(255,255,255,0.06)] max-h-48">
                        <SelectItem value="all" className="text-[#f1f5f9]">
                          All Districts
                        </SelectItem>
                        {availableDistricts.map((d) => (
                          <SelectItem key={d} value={d} className="text-[#f1f5f9]">
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Year Dropdown */}
                  <div style={{ marginBottom: "12px" }}>
                    <p
                      style={{
                        color: "#5a657a",
                        fontSize: "9px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: "6px",
                      }}
                    >
                      Year
                    </p>
                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                      <SelectTrigger style={selectTriggerStyle}>
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent className="bg-[rgba(15,21,36,0.95)] border-[rgba(255,255,255,0.06)]">
                        <SelectItem value="all" className="text-[#f1f5f9]">
                          All
                        </SelectItem>
                        <SelectItem value="2022" className="text-[#f1f5f9]">
                          2022
                        </SelectItem>
                        <SelectItem value="2023" className="text-[#f1f5f9]">
                          2023
                        </SelectItem>
                        <SelectItem value="2024" className="text-[#f1f5f9]">
                          2024
                        </SelectItem>
                        <SelectItem value="2025" className="text-[#f1f5f9]">
                          2025
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Severity Dropdown */}
                  <div style={{ marginBottom: "14px" }}>
                    <p
                      style={{
                        color: "#5a657a",
                        fontSize: "9px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: "6px",
                      }}
                    >
                      Severity
                    </p>
                    <Select
                      value={selectedSeverity}
                      onValueChange={setSelectedSeverity}
                    >
                      <SelectTrigger style={selectTriggerStyle}>
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent className="bg-[rgba(15,21,36,0.95)] border-[rgba(255,255,255,0.06)]">
                        <SelectItem value="all" className="text-[#f1f5f9]">
                          All
                        </SelectItem>
                        <SelectItem value="critical" className="text-[#f1f5f9]">
                          Critical
                        </SelectItem>
                        <SelectItem value="high" className="text-[#f1f5f9]">
                          High
                        </SelectItem>
                        <SelectItem value="medium" className="text-[#f1f5f9]">
                          Medium
                        </SelectItem>
                        <SelectItem value="low" className="text-[#f1f5f9]">
                          Low
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* View Mode Toggle */}
                  <div style={{ marginBottom: "14px" }}>
                    <p
                      style={{
                        color: "#5a657a",
                        fontSize: "9px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: "6px",
                      }}
                    >
                      View Mode
                    </p>
                    <div
                      style={{
                        display: "flex",
                        borderRadius: "8px",
                        overflow: "hidden",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <button
                        onClick={() => setViewMode("markers")}
                        style={{
                          flex: 1,
                          fontSize: "11px",
                          padding: "6px 0",
                          fontWeight: 600,
                          letterSpacing: "0.02em",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          background:
                            viewMode === "markers"
                              ? "rgba(34,211,238,0.12)"
                              : "transparent",
                          color:
                            viewMode === "markers" ? "#22d3ee" : "#5a657a",
                          border: "none",
                        }}
                        onMouseEnter={(e) => {
                          if (viewMode !== "markers")
                            e.currentTarget.style.color = "#8b97b0";
                        }}
                        onMouseLeave={(e) => {
                          if (viewMode !== "markers")
                            e.currentTarget.style.color = "#5a657a";
                        }}
                      >
                        Markers
                      </button>
                      <button
                        onClick={() => setViewMode("heatmap")}
                        style={{
                          flex: 1,
                          fontSize: "11px",
                          padding: "6px 0",
                          fontWeight: 600,
                          letterSpacing: "0.02em",
                          cursor: "pointer",
                          transition: "all 0.2s ease",
                          background:
                            viewMode === "heatmap"
                              ? "rgba(248,113,113,0.12)"
                              : "transparent",
                          color:
                            viewMode === "heatmap" ? "#f87171" : "#5a657a",
                          border: "none",
                          borderLeft: "1px solid rgba(255,255,255,0.06)",
                        }}
                        onMouseEnter={(e) => {
                          if (viewMode !== "heatmap")
                            e.currentTarget.style.color = "#8b97b0";
                        }}
                        onMouseLeave={(e) => {
                          if (viewMode !== "heatmap")
                            e.currentTarget.style.color = "#5a657a";
                        }}
                      >
                        Heatmap
                      </button>
                    </div>
                  </div>

                  {/* Severity Legend */}
                  <div
                    style={{
                      paddingTop: "12px",
                      borderTop: "1px solid rgba(255,255,255,0.04)",
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "8px",
                    }}
                  >
                    {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => (
                      <div
                        key={key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                        }}
                      >
                        <span
                          style={{
                            width: "6px",
                            height: "6px",
                            borderRadius: "50%",
                            background: cfg.color,
                            boxShadow: `0 0 5px ${cfg.color}50`,
                          }}
                        />
                        <span
                          style={{
                            color: "#5a657a",
                            fontSize: "9px",
                            fontWeight: 500,
                          }}
                        >
                          {SEVERITY_LABELS[key]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* ── Stats Panel — Right ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{
            duration: 0.4,
            delay: 0.1,
            ease: [0.4, 0, 0.2, 1],
          }}
          className="absolute top-14 right-3 z-[1000] w-60"
          style={glassCard}
        >
          {/* Panel header - collapsible */}
          <button
            onClick={() => setStatsPanelOpen((p) => !p)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-[rgba(255,255,255,0.02)] transition-colors rounded-t-[14px]"
          >
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <BarChart3 className="size-3.5 text-[#818cf8]" />
              <h3
                style={{
                  color: "#f1f5f9",
                  fontWeight: 600,
                  fontSize: "12px",
                  letterSpacing: "0.02em",
                }}
              >
                Analytics
              </h3>
            </div>
            {statsPanelOpen ? (
              <ChevronUp className="size-3.5 text-[#5a657a]" />
            ) : (
              <ChevronDown className="size-3.5 text-[#5a657a]" />
            )}
          </button>

          <AnimatePresence>
            {statsPanelOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-4">
                  {/* Top 3 Districts */}
                  <div style={{ marginBottom: "14px" }}>
                    <p
                      style={{
                        color: "#5a657a",
                        fontSize: "9px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: "8px",
                      }}
                    >
                      Top Districts
                    </p>
                    {stats.topDistricts.length === 0 ? (
                      <p style={{ color: "#3d4659", fontSize: "11px" }}>
                        No data
                      </p>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                        }}
                      >
                        {stats.topDistricts.map((d, i) => (
                          <div
                            key={d.name}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              padding: "3px 0",
                            }}
                          >
                            <span
                              style={{
                                color: "#c8d0e0",
                                fontSize: "11px",
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "18px",
                                  height: "18px",
                                  borderRadius: "6px",
                                  fontSize: "9px",
                                  fontWeight: 700,
                                  background:
                                    i === 0
                                      ? "rgba(248,113,113,0.15)"
                                      : i === 1
                                      ? "rgba(251,191,36,0.15)"
                                      : "rgba(234,179,8,0.12)",
                                  color:
                                    i === 0
                                      ? "#f87171"
                                      : i === 1
                                      ? "#fbbf24"
                                      : "#eab308",
                                }}
                              >
                                {i + 1}
                              </span>
                              {d.name}
                            </span>
                            <span
                              style={{
                                color: "#f1f5f9",
                                fontSize: "12px",
                                fontWeight: 700,
                                fontVariantNumeric: "tabular-nums",
                              }}
                            >
                              {d.count}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Most Common Crime */}
                  <div style={{ marginBottom: "14px" }}>
                    <p
                      style={{
                        color: "#5a657a",
                        fontSize: "9px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: "4px",
                      }}
                    >
                      Most Common Crime
                    </p>
                    <p
                      style={{
                        color: "#f1f5f9",
                        fontSize: "13px",
                        fontWeight: 600,
                      }}
                    >
                      {stats.commonCrime}
                    </p>
                  </div>

                  {/* Crime Density Info */}
                  <div
                    style={{
                      background: "rgba(10, 15, 28, 0.6)",
                      border: "1px solid rgba(255, 255, 255, 0.04)",
                      borderRadius: "10px",
                      padding: "10px",
                      marginBottom: "14px",
                    }}
                  >
                    <p
                      style={{
                        color: "#8b97b0",
                        fontSize: "9px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: "8px",
                      }}
                    >
                      Crime Density
                    </p>
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "6px",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span
                          style={{ color: "#5a657a", fontSize: "10px" }}
                        >
                          Highest Density
                        </span>
                        <span
                          style={{
                            color: "#c8d0e0",
                            fontSize: "10px",
                            fontWeight: 500,
                            textAlign: "right",
                            maxWidth: "110px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {densityStats.highestDensity}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span
                          style={{ color: "#5a657a", fontSize: "10px" }}
                        >
                          Avg / Location
                        </span>
                        <span
                          style={{
                            color: "#c8d0e0",
                            fontSize: "10px",
                            fontWeight: 500,
                          }}
                        >
                          {densityStats.avgCrimesPerLocation}
                        </span>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                        }}
                      >
                        <span
                          style={{ color: "#5a657a", fontSize: "10px" }}
                        >
                          Crime Clusters
                        </span>
                        <span
                          style={{
                            color: "#f87171",
                            fontSize: "10px",
                            fontWeight: 700,
                          }}
                        >
                          {densityStats.numClusters}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Cluster Analysis */}
                  <div>
                    <p
                      style={{
                        color: "#5a657a",
                        fontSize: "9px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        marginBottom: "6px",
                      }}
                    >
                      Cluster Analysis
                    </p>
                    {densityStats.topClusters.length === 0 ? (
                      <p style={{ color: "#3d4659", fontSize: "10px" }}>
                        No clusters detected
                      </p>
                    ) : (
                      <div
                        style={{
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        {densityStats.topClusters.map((c, i) => (
                          <div
                            key={c.name}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <span
                              style={{
                                color: "#c8d0e0",
                                fontSize: "10px",
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                              }}
                            >
                              <span
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  width: "15px",
                                  height: "15px",
                                  borderRadius: "5px",
                                  fontSize: "8px",
                                  fontWeight: 700,
                                  background:
                                    i === 0
                                      ? "rgba(248,113,113,0.15)"
                                      : i === 1
                                      ? "rgba(251,191,36,0.15)"
                                      : "rgba(234,179,8,0.12)",
                                  color:
                                    i === 0
                                      ? "#f87171"
                                      : i === 1
                                      ? "#fbbf24"
                                      : "#eab308",
                                }}
                              >
                                {i + 1}
                              </span>
                              {c.name}
                            </span>
                            <span
                              style={{
                                color: "#f1f5f9",
                                fontSize: "10px",
                                fontWeight: 600,
                              }}
                            >
                              {c.count} FIRs
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── District Summary Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          duration: 0.4,
          delay: 0.2,
          ease: [0.4, 0, 0.2, 1],
        }}
        className="mt-2 max-h-44 overflow-y-auto shrink-0"
        style={{
          ...glassCard,
          borderRadius: "12px",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr
              style={{
                borderBottom: "1px solid rgba(255,255,255,0.06)",
              }}
            >
              <th
                style={{
                  textAlign: "left",
                  padding: "10px 14px",
                  color: "#5a657a",
                  fontSize: "9px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                District
              </th>
              <th
                style={{
                  textAlign: "right",
                  padding: "10px 14px",
                  color: "#5a657a",
                  fontSize: "9px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                Crime Count
              </th>
            </tr>
          </thead>
          <tbody>
            {districtTable.length === 0 ? (
              <tr>
                <td
                  colSpan={2}
                  style={{
                    textAlign: "center",
                    padding: "20px 14px",
                    color: "#3d4659",
                    fontSize: "11px",
                  }}
                >
                  No matching records
                </td>
              </tr>
            ) : (
              districtTable.map((row, i) => (
                <tr
                  key={row.district}
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.03)",
                    transition: "background 0.15s ease",
                    cursor: "default",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "rgba(34,211,238,0.04)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <td
                    style={{
                      padding: "8px 14px",
                      color: "#c8d0e0",
                      fontSize: "11px",
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <span
                        style={{
                          width: "15px",
                          height: "15px",
                          borderRadius: "5px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "8px",
                          fontWeight: 700,
                          background:
                            i < 3
                              ? "rgba(34,211,238,0.08)"
                              : "transparent",
                          color: i < 3 ? "#22d3ee" : "#3d4659",
                        }}
                      >
                        {i + 1}
                      </span>
                      {row.district}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: "8px 14px",
                      color: "#f1f5f9",
                      fontSize: "11px",
                      textAlign: "right",
                      fontWeight: 600,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {row.count}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </motion.div>
    </div>
  );
}