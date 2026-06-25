"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
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
  { color: string; radius: number }
> = {
  critical: { color: "#f87171", radius: 12 },
  high: { color: "#fbbf24", radius: 10 },
  medium: { color: "#eab308", radius: 8 },
  low: { color: "#34d399", radius: 6 },
};

const SEVERITY_LABELS: Record<string, string> = {
  critical: "Critical",
  high: "High",
  medium: "Medium",
  low: "Low",
};

// --- Styles ---

const glassPanel: React.CSSProperties = {
  background: "rgba(15, 21, 36, 0.85)",
  backdropFilter: "blur(32px)",
  WebkitBackdropFilter: "blur(32px)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  borderRadius: "16px",
  boxShadow: "0 24px 48px -12px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.03)",
};

const selectTriggerStyle: React.CSSProperties = {
  background: "rgba(10, 15, 28, 0.8)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  color: "#f1f5f9",
  fontSize: "12px",
  height: "32px",
};

const densityBoxStyle: React.CSSProperties = {
  background: "rgba(10, 15, 28, 0.6)",
  border: "1px solid rgba(255, 255, 255, 0.04)",
  borderRadius: "10px",
  padding: "10px",
};

export default function CrimeMap() {
  const crimeData = useAppStore((s) => s.crimeData);

  // --- Filter State ---
  const [selectedTypes, setSelectedTypes] = useState<string[]>(
    [...CRIME_TYPES]
  );
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [selectedSeverity, setSelectedSeverity] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"markers" | "heatmap">("markers");

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
                    <div style={{ padding: "12px 14px", minWidth: "200px" }}>
                      <p style={{ fontWeight: 700, fontSize: "13px", color: "#f1f5f9", marginBottom: "6px" }}>
                        {fir.fir_id}
                      </p>
                      <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        {[
                          ["Date", fir.date],
                          ["Type", fir.crime_type],
                          ["District", fir.district],
                          ["Status", fir.investigation_status],
                        ].map(([label, val]) => (
                          <div key={label} style={{ display: "flex", justifyContent: "space-between" }}>
                            <span style={{ color: "#5a657a", fontSize: "11px" }}>{label}</span>
                            <span style={{ color: "#c8d0e0", fontSize: "11px" }}>{val}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{
                        marginTop: "8px",
                        paddingTop: "8px",
                        borderTop: "1px solid rgba(255,255,255,0.06)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "2px 8px",
                        borderRadius: "6px",
                        background: `${cfg.color}15`,
                        border: `1px solid ${cfg.color}30`,
                        fontSize: "10px",
                        fontWeight: 600,
                        color: cfg.color,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                      }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: cfg.color }} />
                        {fir.severity}
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

        {/* ── Filter Panel — Left ── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: [0.4, 0, 0.2, 1] }}
          className="absolute top-4 left-4 z-[1000] w-64 p-5"
          style={glassPanel}
        >
          {/* Panel title */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <div style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#22d3ee",
              boxShadow: "0 0 8px rgba(34,211,238,0.4)",
            }} />
            <h3 style={{ color: "#f1f5f9", fontWeight: 600, fontSize: "13px", letterSpacing: "0.02em" }}>
              Filters
            </h3>
          </div>

          {/* Crime Type Checkboxes */}
          <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
            {CRIME_TYPES.map((type) => (
              <label
                key={type}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  padding: "5px 8px",
                  borderRadius: "8px",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(255,255,255,0.03)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
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
                <span style={{ color: "#c8d0e0", fontSize: "12px" }}>{type}</span>
              </label>
            ))}
          </div>

          {/* Year Dropdown */}
          <div style={{ marginBottom: "14px" }}>
            <p style={{ color: "#5a657a", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
              Year
            </p>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger style={selectTriggerStyle}>
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
          <div style={{ marginBottom: "14px" }}>
            <p style={{ color: "#5a657a", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
              Severity
            </p>
            <Select
              value={selectedSeverity}
              onValueChange={setSelectedSeverity}
            >
              <SelectTrigger style={selectTriggerStyle}>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* View Mode Toggle */}
          <div>
            <p style={{ color: "#5a657a", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "6px" }}>
              View Mode
            </p>
            <div style={{
              display: "flex",
              borderRadius: "10px",
              overflow: "hidden",
              border: "1px solid rgba(255,255,255,0.06)",
            }}>
              <button
                onClick={() => setViewMode("markers")}
                style={{
                  flex: 1,
                  fontSize: "11px",
                  padding: "7px 0",
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background: viewMode === "markers" ? "rgba(34,211,238,0.12)" : "transparent",
                  color: viewMode === "markers" ? "#22d3ee" : "#5a657a",
                  border: "none",
                }}
                onMouseEnter={(e) => {
                  if (viewMode !== "markers") e.currentTarget.style.color = "#8b97b0";
                }}
                onMouseLeave={(e) => {
                  if (viewMode !== "markers") e.currentTarget.style.color = "#5a657a";
                }}
              >
                Markers
              </button>
              <button
                onClick={() => setViewMode("heatmap")}
                style={{
                  flex: 1,
                  fontSize: "11px",
                  padding: "7px 0",
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                  background: viewMode === "heatmap" ? "rgba(248,113,113,0.12)" : "transparent",
                  color: viewMode === "heatmap" ? "#f87171" : "#5a657a",
                  border: "none",
                  borderLeft: "1px solid rgba(255,255,255,0.06)",
                }}
                onMouseEnter={(e) => {
                  if (viewMode !== "heatmap") e.currentTarget.style.color = "#8b97b0";
                }}
                onMouseLeave={(e) => {
                  if (viewMode !== "heatmap") e.currentTarget.style.color = "#5a657a";
                }}
              >
                Heatmap
              </button>
            </div>
          </div>

          {/* Severity Legend */}
          <div style={{
            marginTop: "16px",
            paddingTop: "14px",
            borderTop: "1px solid rgba(255,255,255,0.04)",
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
          }}>
            {Object.entries(SEVERITY_CONFIG).map(([key, cfg]) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                <span style={{
                  width: "7px",
                  height: "7px",
                  borderRadius: "50%",
                  background: cfg.color,
                  boxShadow: `0 0 6px ${cfg.color}60`,
                }} />
                <span style={{ color: "#5a657a", fontSize: "10px" }}>{SEVERITY_LABELS[key]}</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Stats Panel — Right ── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, delay: 0.1, ease: [0.4, 0, 0.2, 1] }}
          className="absolute top-4 right-4 z-[1000] w-64 p-5"
          style={glassPanel}
        >
          {/* Panel title */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <div style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#818cf8",
              boxShadow: "0 0 8px rgba(129,140,248,0.4)",
            }} />
            <h3 style={{ color: "#f1f5f9", fontWeight: 600, fontSize: "13px", letterSpacing: "0.02em" }}>
              Statistics
            </h3>
            <span style={{
              marginLeft: "auto",
              fontSize: "10px",
              fontWeight: 700,
              color: "#22d3ee",
              background: "rgba(34,211,238,0.08)",
              padding: "2px 8px",
              borderRadius: "6px",
              border: "1px solid rgba(34,211,238,0.12)",
            }}>
              {filteredFirs.length} FIRs
            </span>
          </div>

          {/* Top 3 Districts */}
          <div style={{ marginBottom: "16px" }}>
            <p style={{ color: "#5a657a", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
              Top Districts
            </p>
            {stats.topDistricts.length === 0 ? (
              <p style={{ color: "#3d4659", fontSize: "12px" }}>No data</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {stats.topDistricts.map((d, i) => (
                  <div
                    key={d.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "4px 0",
                    }}
                  >
                    <span style={{ color: "#c8d0e0", fontSize: "12px", display: "flex", alignItems: "center", gap: "10px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "20px",
                          height: "20px",
                          borderRadius: "8px",
                          fontSize: "10px",
                          fontWeight: 700,
                          background: i === 0 ? "rgba(248,113,113,0.15)" : i === 1 ? "rgba(251,191,36,0.15)" : "rgba(234,179,8,0.12)",
                          color: i === 0 ? "#f87171" : i === 1 ? "#fbbf24" : "#eab308",
                        }}
                      >
                        {i + 1}
                      </span>
                      {d.name}
                    </span>
                    <span style={{
                      color: "#f1f5f9",
                      fontSize: "13px",
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                    }}>
                      {d.count}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Most Common Crime */}
          <div style={{ marginBottom: "16px" }}>
            <p style={{ color: "#5a657a", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>
              Most Common Crime
            </p>
            <p style={{ color: "#f1f5f9", fontSize: "14px", fontWeight: 600 }}>
              {stats.commonCrime}
            </p>
          </div>

          {/* Crime Density Info */}
          <div style={{ ...densityBoxStyle, marginBottom: "14px" }}>
            <p style={{ color: "#8b97b0", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "10px" }}>
              Crime Density
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#5a657a", fontSize: "11px" }}>Highest Density</span>
                <span style={{ color: "#c8d0e0", fontSize: "11px", fontWeight: 500, textAlign: "right", maxWidth: "120px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {densityStats.highestDensity}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#5a657a", fontSize: "11px" }}>Avg / Location</span>
                <span style={{ color: "#c8d0e0", fontSize: "11px", fontWeight: 500 }}>
                  {densityStats.avgCrimesPerLocation}
                </span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span style={{ color: "#5a657a", fontSize: "11px" }}>Crime Clusters</span>
                <span style={{ color: "#f87171", fontSize: "11px", fontWeight: 700 }}>
                  {densityStats.numClusters}
                </span>
              </div>
            </div>
          </div>

          {/* Cluster Analysis */}
          <div>
            <p style={{ color: "#5a657a", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "8px" }}>
              Cluster Analysis
            </p>
            {densityStats.topClusters.length === 0 ? (
              <p style={{ color: "#3d4659", fontSize: "11px" }}>No clusters detected</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {densityStats.topClusters.map((c, i) => (
                  <div
                    key={c.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <span style={{ color: "#c8d0e0", fontSize: "11px", display: "flex", alignItems: "center", gap: "8px" }}>
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: "16px",
                          height: "16px",
                          borderRadius: "6px",
                          fontSize: "9px",
                          fontWeight: 700,
                          background: i === 0 ? "rgba(248,113,113,0.15)" : i === 1 ? "rgba(251,191,36,0.15)" : "rgba(234,179,8,0.12)",
                          color: i === 0 ? "#f87171" : i === 1 ? "#fbbf24" : "#eab308",
                        }}
                      >
                        {i + 1}
                      </span>
                      {c.name}
                    </span>
                    <span style={{ color: "#f1f5f9", fontSize: "11px", fontWeight: 600 }}>
                      {c.count} FIRs
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* ── District Summary Table ── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2, ease: [0.4, 0, 0.2, 1] }}
        className="mt-3 max-h-48 overflow-y-auto"
        style={{
          ...glassPanel,
          borderRadius: "14px",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <th style={{ textAlign: "left", padding: "12px 16px", color: "#5a657a", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                District
              </th>
              <th style={{ textAlign: "right", padding: "12px 16px", color: "#5a657a", fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em" }}>
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
                    padding: "24px 16px",
                    color: "#3d4659",
                    fontSize: "12px",
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
                  onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(34,211,238,0.04)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <td style={{ padding: "10px 16px", color: "#c8d0e0", fontSize: "12px" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <span style={{
                        width: "16px",
                        height: "16px",
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "9px",
                        fontWeight: 700,
                        background: i < 3 ? "rgba(34,211,238,0.08)" : "transparent",
                        color: i < 3 ? "#22d3ee" : "#3d4659",
                      }}>
                        {i + 1}
                      </span>
                      {row.district}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", color: "#f1f5f9", fontSize: "12px", textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
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