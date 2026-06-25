"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, Line } from "@react-three/drei";
import { useAppStore } from "@/lib/store";
import { getNetworkEdges } from "@/lib/data";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { X, User, Shield, FileText, Car, MapPin, Users } from "lucide-react";
import type { FIR, Accused, Gang, Vehicle, District } from "@/lib/types";
import LoadingSpinner from "./LoadingSpinner";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface SimNode {
  id: string;
  name: string;
  type: "accused" | "gang" | "fir" | "vehicle" | "district";
  color: string;
  size: number;
  x: number;
  y: number;
  z: number;
  _accused?: Accused;
  _gang?: Gang;
  _fir?: FIR;
  _vehicle?: Vehicle;
  _district?: District;
  _firCount?: number;
}

interface SimLink {
  source: string;
  target: string;
  type: string;
  color: string;
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LINK_COLORS: Record<string, string> = {
  involved_in: "#64748b",
  member_of: "#f59e0b",
  occurred_in: "#8b5cf6",
  used_vehicle: "#06b6d4",
  gang_associate: "#f59e0b",
};

const CRIME_TYPES = [
  "Chain Snatching",
  "Vehicle Theft",
  "Cyber Fraud",
  "Jewellery Heist",
  "Drug Trafficking",
];

/* ------------------------------------------------------------------ */
/*  Info Panel sub-components                                          */
/* ------------------------------------------------------------------ */

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <Icon className="size-4 mt-0.5 shrink-0 text-[#94a3b8]" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-[#64748b]">{label}</p>
        <p className="text-sm text-[#e2e8f0] break-words">{value}</p>
      </div>
    </div>
  );
}

function AccusedPanel({ node }: { node: SimNode }) {
  const a = node._accused!;
  const crimeData = useAppStore((s) => s.crimeData);
  const firs = crimeData?.firs.filter((f) => f.accused.includes(a.id)) ?? [];
  const gang = crimeData?.gangs.find((g) => g.id === a.gang);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-red-500/20 flex items-center justify-center">
          <User className="size-4 text-red-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white leading-tight">{a.name}</h3>
          <span className="text-[11px] text-[#64748b] uppercase">Accused &bull; {a.id}</span>
        </div>
      </div>
      <InfoRow icon={User} label="Age" value={`${a.age} years`} />
      <InfoRow icon={Users} label="Gender" value={a.gender} />
      <InfoRow icon={Shield} label="Risk Score" value={
        <span className={a.risk > 80 ? "text-red-400 font-bold" : a.risk > 60 ? "text-orange-400 font-bold" : "text-green-400 font-bold"}>
          {a.risk}/100
        </span>
      } />
      <InfoRow icon={Shield} label="Gang" value={gang ? gang.name : "None"} />
      <InfoRow icon={FileText} label="Prior FIRs" value={String(a.prior_firs)} />
      {firs.length > 0 && (
        <div className="mt-2">
          <p className="text-[11px] uppercase tracking-wider text-[#64748b] mb-1">Linked FIRs</p>
          <div className="flex flex-wrap gap-1">
            {firs.map((f) => (
              <span key={f.fir_id} className="px-1.5 py-0.5 bg-yellow-500/10 text-yellow-400 text-[11px] rounded">
                {f.fir_id}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GangPanel({ node }: { node: SimNode }) {
  const g = node._gang!;
  const crimeData = useAppStore((s) => s.crimeData);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-orange-500/20 flex items-center justify-center">
          <Shield className="size-4 text-orange-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white leading-tight">{g.name}</h3>
          <span className="text-[11px] text-[#64748b] uppercase">Gang &bull; {g.id}</span>
        </div>
      </div>
      <InfoRow icon={Shield} label="Type" value={g.type} />
      <InfoRow icon={MapPin} label="Base" value={g.base} />
      <InfoRow icon={Users} label="Members" value={
        <div className="space-y-0.5">
          {g.members.map((mid) => {
            const acc = crimeData?.accused.find((a) => a.id === mid);
            return <div key={mid}>{acc ? acc.name : mid} <span className="text-[#64748b]">({mid})</span></div>;
          })}
        </div>
      } />
    </div>
  );
}

function FIRPanel({ node }: { node: SimNode }) {
  const f = node._fir!;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-yellow-500/20 flex items-center justify-center">
          <FileText className="size-4 text-yellow-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white leading-tight">{f.fir_id}</h3>
          <span className="text-[11px] text-[#64748b] uppercase">FIR &bull; {f.crime_type}</span>
        </div>
      </div>
      <InfoRow icon={FileText} label="Date" value={`${f.date} ${f.time}`} />
      <InfoRow icon={MapPin} label="District" value={f.district} />
      <InfoRow icon={Shield} label="Severity" value={
        <span className={
          f.severity === "critical" ? "text-red-400" : f.severity === "high" ? "text-orange-400" : "text-yellow-400"
        }>{f.severity.toUpperCase()}</span>
      } />
      <InfoRow icon={Shield} label="Status" value={f.investigation_status} />
      <InfoRow icon={MapPin} label="Location" value={f.location.place} />
      <InfoRow icon={Users} label="Accused" value={
        <div className="space-y-0.5">{f.accused.map((a) => <div key={a}>{a}</div>)}</div>
      } />
    </div>
  );
}

function VehiclePanel({ node }: { node: SimNode }) {
  const v = node._vehicle!;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-cyan-500/20 flex items-center justify-center">
          <Car className="size-4 text-cyan-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white leading-tight">{v.reg}</h3>
          <span className="text-[11px] text-[#64748b] uppercase">Vehicle &bull; {v.id}</span>
        </div>
      </div>
      <InfoRow icon={Car} label="Type" value={v.type} />
      <InfoRow icon={Car} label="Make" value={v.make} />
      <InfoRow icon={Shield} label="Color" value={v.color} />
    </div>
  );
}

function DistrictPanel({ node }: { node: SimNode }) {
  const d = node._district!;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center">
          <MapPin className="size-4 text-purple-400" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white leading-tight">{d.name}</h3>
          <span className="text-[11px] text-[#64748b] uppercase">District</span>
        </div>
      </div>
      <InfoRow icon={MapPin} label="Name" value={d.name} />
      <InfoRow icon={FileText} label="FIR Count" value={
        <span className="font-bold text-purple-400">{node._firCount ?? 0}</span>
      } />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  3D Force Simulation (no D3 dependency)                             */
/* ------------------------------------------------------------------ */

function simulateForce3D(nodes: SimNode[], links: SimLink[], iterations: number = 200) {
  const spread = 150;
  for (const n of nodes) {
    n.x = (Math.random() - 0.5) * spread * 2;
    n.y = (Math.random() - 0.5) * spread * 2;
    n.z = (Math.random() - 0.5) * spread * 2;
  }

  const nodeMap = new Map<string, SimNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations;
    const repulsion = 8000;
    const attraction = 0.004;
    const centerForce = 0.008;
    const damping = 0.85;

    const vels = new Map<string, { vx: number; vy: number; vz: number }>();
    for (const n of nodes) vels.set(n.id, { vx: 0, vy: 0, vz: 0 });

    // Repulsion between all pairs (3D)
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let dz = a.z - b.z;
        let dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist < 1) {
          dist = 1;
          dx = Math.random() - 0.5;
          dy = Math.random() - 0.5;
          dz = Math.random() - 0.5;
        }
        const force = (repulsion * alpha) / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;
        const va = vels.get(a.id)!;
        const vb = vels.get(b.id)!;
        va.vx += fx; va.vy += fy; va.vz += fz;
        vb.vx -= fx; vb.vy -= fy; vb.vz -= fz;
      }
    }

    // Attraction along links (spring force)
    for (const link of links) {
      const s = nodeMap.get(link.source);
      const t = nodeMap.get(link.target);
      if (!s || !t) continue;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dz = t.z - s.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < 1) continue;
      const force = dist * attraction * alpha;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      const fz = (dz / dist) * force;
      const vs = vels.get(s.id)!;
      const vt = vels.get(t.id)!;
      vs.vx += fx; vs.vy += fy; vs.vz += fz;
      vt.vx -= fx; vt.vy -= fy; vt.vz -= fz;
    }

    // Center gravity pulling toward origin
    for (const n of nodes) {
      const v = vels.get(n.id)!;
      v.vx += (0 - n.x) * centerForce * alpha;
      v.vy += (0 - n.y) * centerForce * alpha;
      v.vz += (0 - n.z) * centerForce * alpha;
    }

    // Apply velocity with damping
    for (const n of nodes) {
      const v = vels.get(n.id)!;
      v.vx *= damping;
      v.vy *= damping;
      v.vz *= damping;
      n.x += v.vx;
      n.y += v.vy;
      n.z += v.vz;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  R3F 3D Scene Components (must be rendered inside Canvas)           */
/* ------------------------------------------------------------------ */

function GraphNodeMesh({
  node,
  isSelected,
  onSelect,
}: {
  node: SimNode;
  isSelected: boolean;
  onSelect: (node: SimNode) => void;
}) {
  const [hovered, setHovered] = useState(false);

  const scale = hovered || isSelected ? 1.3 : 1;
  const emissiveIntensity = hovered || isSelected ? 0.4 : 0.05;

  const labelY = (() => {
    switch (node.type) {
      case "accused": return -(node.size * scale + 15);
      case "gang": return -(8 * scale + 15);
      case "fir": return -(5 * scale + 15);
      case "vehicle": return -(6 * scale + 15);
      case "district": return -(10 * scale + 15);
      default: return -15;
    }
  })();

  const label = node.name.length > 14 ? node.name.slice(0, 14) + "..." : node.name;

  return (
    <group position={[node.x, node.y, node.z]}>
      <mesh
        scale={scale}
        onPointerDown={(e) => {
          e.stopPropagation();
          onSelect(node);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        {node.type === "accused" && (
          <sphereGeometry args={[node.size, 16, 16]} />
        )}
        {node.type === "gang" && (
          <dodecahedronGeometry args={[8, 0]} />
        )}
        {node.type === "fir" && (
          <boxGeometry args={[5, 5, 5]} />
        )}
        {node.type === "vehicle" && (
          <coneGeometry args={[6, 12, 8]} />
        )}
        {node.type === "district" && (
          <sphereGeometry args={[10, 16, 16]} />
        )}

        {node.type === "district" ? (
          <meshStandardMaterial
            color={node.color}
            transparent
            opacity={0.5}
            emissive={node.color}
            emissiveIntensity={emissiveIntensity}
          />
        ) : (
          <meshStandardMaterial
            color={node.color}
            emissive={node.color}
            emissiveIntensity={emissiveIntensity}
          />
        )}
      </mesh>

      {/* Selection ring */}
      {isSelected && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[node.type === "accused" ? node.size * 1.8 : 14, node.type === "accused" ? node.size * 2 : 16, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.4} side={2} />
        </mesh>
      )}

      {/* Label */}
      <Html position={[0, labelY, 0]} center>
        <div
          style={{
            background: "rgba(10,15,30,0.85)",
            color: "#fff",
            padding: "2px 6px",
            borderRadius: "4px",
            fontSize: "10px",
            whiteSpace: "nowrap",
            pointerEvents: "none",
            border: "1px solid #2a3550",
            fontFamily: "Inter, system-ui, sans-serif",
          }}
        >
          {label}
        </div>
      </Html>
    </group>
  );
}

function GraphLinkLine({ link, nodeMap }: { link: SimLink; nodeMap: Map<string, SimNode> }) {
  const s = nodeMap.get(link.source);
  const t = nodeMap.get(link.target);
  if (!s || !t) return null;

  const isGangAssociate = link.type === "gang_associate";

  return (
    <Line
      points={[[s.x, s.y, s.z], [t.x, t.y, t.z]]}
      color={link.color}
      lineWidth={1}
      opacity={isGangAssociate ? 0.15 : 0.3}
      transparent
      dashed={isGangAssociate}
    />
  );
}

function GraphScene({
  nodes,
  links,
  selectedNode,
  onSelectNode,
}: {
  nodes: SimNode[];
  links: SimLink[];
  selectedNode: SimNode | null;
  onSelectNode: (node: SimNode) => void;
}) {
  const nodeMap = useMemo(() => {
    const m = new Map<string, SimNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <pointLight position={[200, 200, 200]} intensity={1.2} />
      <pointLight position={[-150, -100, -150]} intensity={0.4} color="#8b5cf6" />

      {/* Links */}
      {links.map((link, i) => (
        <GraphLinkLine key={`${link.source}-${link.target}-${i}`} link={link} nodeMap={nodeMap} />
      ))}

      {/* Nodes */}
      {nodes.map((node) => (
        <GraphNodeMesh
          key={node.id}
          node={node}
          isSelected={selectedNode?.id === node.id}
          onSelect={onSelectNode}
        />
      ))}

      <OrbitControls enableDamping dampingFactor={0.05} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Inner Component (all hooks + Canvas)                          */
/* ------------------------------------------------------------------ */

function NetworkGraphInner() {
  const crimeData = useAppStore((s) => s.crimeData);
  const [crimeTypeFilter, setCrimeTypeFilter] = useState<string>("all");
  const [gangFilter, setGangFilter] = useState<string>("all");
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);

  /* derive unique crime types & gang names */
  const crimeTypes = useMemo(() => {
    if (!crimeData) return CRIME_TYPES;
    const set = new Set(crimeData.firs.map((f) => f.crime_type));
    return CRIME_TYPES.filter((t) => set.has(t));
  }, [crimeData]);

  const gangNames = useMemo(() => {
    if (!crimeData) return [];
    return crimeData.gangs.map((g) => g.name);
  }, [crimeData]);

  /* build filtered nodes & links (same logic as before) */
  const { nodes, links } = useMemo(() => {
    if (!crimeData) return { nodes: [] as SimNode[], links: [] as SimLink[] };

    const firs = crimeData.firs;
    const accused = crimeData.accused;
    const gangs = crimeData.gangs;
    const vehicles = crimeData.vehicles;
    const districts = crimeData.districts;

    let visibleFirIds: Set<string> | null = null;
    let visibleAccusedIds: Set<string> | null = null;
    let visibleGangIds: Set<string> | null = null;

    if (crimeTypeFilter !== "all") {
      visibleFirIds = new Set(firs.filter((f) => f.crime_type === crimeTypeFilter).map((f) => f.fir_id));
      visibleAccusedIds = new Set<string>();
      for (const fir of firs) {
        if (visibleFirIds.has(fir.fir_id)) {
          for (const aid of fir.accused) visibleAccusedIds.add(aid);
          if (fir.vehicle_used) visibleAccusedIds.add(fir.vehicle_used);
          visibleAccusedIds.add(fir.district);
          if (fir.gang_id) visibleAccusedIds.add(fir.gang_id);
        }
      }
    }

    if (gangFilter !== "all") {
      const gang = gangs.find((g) => g.name === gangFilter);
      if (gang) {
        visibleGangIds = new Set([gang.id]);
        const memberIds = new Set(gang.members);
        const gangFirIds = new Set(firs.filter((f) => f.gang_id === gang.id).map((f) => f.fir_id));
        visibleFirIds = visibleFirIds ? new Set([...visibleFirIds].filter((id) => gangFirIds.has(id))) : gangFirIds;
        visibleAccusedIds = memberIds;
        for (const fir of firs) {
          if (visibleFirIds.has(fir.fir_id)) {
            if (fir.vehicle_used) memberIds.add(fir.vehicle_used);
            memberIds.add(fir.district);
          }
        }
      }
    }

    const isFiltered = visibleFirIds !== null || visibleAccusedIds !== null;
    const nodeMap = new Map<string, SimNode>();

    for (const a of accused) {
      if (isFiltered && visibleAccusedIds && !visibleAccusedIds.has(a.id)) continue;
      nodeMap.set(a.id, {
        id: a.id, name: a.name, type: "accused", color: "#ef4444",
        size: a.risk / 10, x: 0, y: 0, z: 0, _accused: a,
      });
    }
    for (const g of gangs) {
      if (isFiltered && visibleGangIds && !visibleGangIds.has(g.id)) continue;
      if (isFiltered && visibleAccusedIds && !visibleAccusedIds.has(g.id)) continue;
      nodeMap.set(g.id, {
        id: g.id, name: g.name, type: "gang", color: "#f59e0b",
        size: 6, x: 0, y: 0, z: 0, _gang: g,
      });
    }
    for (const f of firs) {
      if (isFiltered && visibleFirIds && !visibleFirIds.has(f.fir_id)) continue;
      nodeMap.set(f.fir_id, {
        id: f.fir_id, name: f.fir_id, type: "fir", color: "#eab308",
        size: 2, x: 0, y: 0, z: 0, _fir: f,
      });
    }
    for (const v of vehicles) {
      if (isFiltered && visibleAccusedIds && !visibleAccusedIds.has(v.id)) continue;
      nodeMap.set(v.id, {
        id: v.id, name: v.reg, type: "vehicle", color: "#06b6d4",
        size: 3, x: 0, y: 0, z: 0, _vehicle: v,
      });
    }
    for (const d of districts) {
      if (isFiltered && visibleAccusedIds && !visibleAccusedIds.has(d.name)) continue;
      const firCount = firs.filter((f) => (!visibleFirIds || visibleFirIds.has(f.fir_id)) && f.district === d.name).length;
      if (isFiltered && firCount === 0) continue;
      nodeMap.set(d.name, {
        id: d.name, name: d.name, type: "district", color: "#8b5cf6",
        size: 4, x: 0, y: 0, z: 0, _district: d, _firCount: firCount,
      });
    }

    const allEdges = getNetworkEdges(crimeData);
    const nodeIds = new Set(nodeMap.keys());
    const filteredEdges = allEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
    const filteredLinks: SimLink[] = filteredEdges.map((e) => ({
      source: e.source, target: e.target, type: e.type, color: LINK_COLORS[e.type] || "#64748b",
    }));

    return { nodes: Array.from(nodeMap.values()), links: filteredLinks };
  }, [crimeData, crimeTypeFilter, gangFilter]);

  /* Run 3D force simulation via useMemo (synchronous computation) */
  const simNodes = useMemo(() => {
    if (nodes.length === 0) return [];
    const result = nodes.map((n) => ({ ...n }));
    simulateForce3D(result, links, 200);
    return result;
  }, [nodes, links]);

  const simReady = simNodes.length > 0;

  const handleSelectNode = useCallback((node: SimNode) => {
    setSelectedNode((prev) => (prev?.id === node.id ? null : node));
  }, []);

  const handleReset = useCallback(() => {
    setCrimeTypeFilter("all");
    setGangFilter("all");
    setSelectedNode(null);
  }, []);

  if (!crimeData) {
    return <LoadingSpinner message="Loading network data..." />;
  }

  return (
    <div className="flex flex-col h-full w-full">
      {/* Filter Controls (HTML overlay, NOT inside Canvas) */}
      <div className="flex flex-wrap items-center gap-3 px-4 py-3 bg-[#0d1321] border-b border-[#1e293b] shrink-0">
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Crime Type</label>
          <Select value={crimeTypeFilter} onValueChange={(v) => { setCrimeTypeFilter(v); setSelectedNode(null); }}>
            <SelectTrigger className="w-48 bg-[#0a0f1e] border-[#1e293b] text-[#e2e8f0]">
              <SelectValue placeholder="Show All" />
            </SelectTrigger>
            <SelectContent className="bg-[#0d1321] border-[#1e293b]">
              <SelectItem value="all" className="text-[#e2e8f0]">Show All</SelectItem>
              {crimeTypes.map((ct) => (
                <SelectItem key={ct} value={ct} className="text-[#e2e8f0]">{ct}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-medium text-[#94a3b8] uppercase tracking-wider">Gang</label>
          <Select value={gangFilter} onValueChange={(v) => { setGangFilter(v); setSelectedNode(null); }}>
            <SelectTrigger className="w-56 bg-[#0a0f1e] border-[#1e293b] text-[#e2e8f0]">
              <SelectValue placeholder="All Gangs" />
            </SelectTrigger>
            <SelectContent className="bg-[#0d1321] border-[#1e293b]">
              <SelectItem value="all" className="text-[#e2e8f0]">All Gangs</SelectItem>
              {gangNames.map((gn) => (
                <SelectItem key={gn} value={gn} className="text-[#e2e8f0]">{gn}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" size="sm" onClick={handleReset} className="border-[#334155] text-[#94a3b8] hover:bg-[#1e293b] hover:text-white bg-transparent">
          Reset
        </Button>
        {/* Legend */}
        <div className="flex items-center gap-3 ml-auto">
          {[
            { color: "#ef4444", label: "Accused" },
            { color: "#f59e0b", label: "Gang" },
            { color: "#eab308", label: "FIR" },
            { color: "#06b6d4", label: "Vehicle" },
            { color: "#8b5cf6", label: "District" },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
              <span className="text-[11px] text-[#64748b] hidden sm:inline">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3D Canvas + Info Panel */}
      <div className="flex-1 relative overflow-hidden" style={{ background: "#0a0f1e" }}>
        {/* R3F Canvas */}
        {simReady && (
          <Canvas
            camera={{ position: [0, 0, 500], fov: 60 }}
            style={{ background: "#0a0f1e" }}
            onPointerMissed={() => setSelectedNode(null)}
          >
            <GraphScene
              nodes={simNodes}
              links={links}
              selectedNode={selectedNode}
              onSelectNode={handleSelectNode}
            />
          </Canvas>
        )}

        {/* Loading indicator while sim runs */}
        {!simReady && nodes.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <LoadingSpinner message="Computing 3D layout..." />
          </div>
        )}

        {/* Stats overlay */}
        {simReady && (
          <div className="absolute bottom-3 left-3 z-10">
            <div className="px-3 py-1.5 bg-[#0a0f1e]/80 backdrop-blur-sm border border-[#1e293b] rounded-md">
              <p className="text-[11px] text-[#64748b]">
                <span className="text-[#94a3b8] font-medium">{simNodes.length}</span> nodes
                <span className="mx-1.5 text-[#334155]">&bull;</span>
                <span className="text-[#94a3b8] font-medium">{links.length}</span> links
              </p>
            </div>
          </div>
        )}

        {/* Controls hint */}
        {simReady && (
          <div className="absolute bottom-3 right-3 z-10">
            <div className="px-3 py-1.5 bg-[#0a0f1e]/80 backdrop-blur-sm border border-[#1e293b] rounded-md">
              <p className="text-[10px] text-[#475569]">
                Left drag: rotate &bull; Scroll: zoom &bull; Right drag: pan
              </p>
            </div>
          </div>
        )}

        {/* Right Side Info Panel (HTML overlay, NOT inside Canvas) */}
        {selectedNode && (
          <div className="absolute top-0 right-0 w-80 h-full bg-[#0d1321]/95 backdrop-blur-md border-l border-[#1e293b] z-10 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e293b] shrink-0">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Node Details</h2>
              <button
                onClick={() => setSelectedNode(null)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-[#64748b] hover:text-white hover:bg-[#1e293b] transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {selectedNode.type === "accused" && <AccusedPanel node={selectedNode} />}
              {selectedNode.type === "gang" && <GangPanel node={selectedNode} />}
              {selectedNode.type === "fir" && <FIRPanel node={selectedNode} />}
              {selectedNode.type === "vehicle" && <VehiclePanel node={selectedNode} />}
              {selectedNode.type === "district" && <DistrictPanel node={selectedNode} />}
            </div>
            <div className="px-4 py-2 border-t border-[#1e293b] shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedNode.color }} />
                <span className="text-[11px] text-[#64748b] uppercase">{selectedNode.type}</span>
                <span className="text-[11px] text-[#334155]">&bull;</span>
                <span className="text-[11px] text-[#475569] truncate">{selectedNode.id}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dynamic wrapper for SSR safety (Three.js needs window)             */
/* ------------------------------------------------------------------ */

export default dynamic(() => Promise.resolve(NetworkGraphInner), { ssr: false });