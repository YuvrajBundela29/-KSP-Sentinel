"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
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
  vx: number;
  vy: number;
  fx: number | null;
  fy: number | null;
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
          <span className="text-[11px] text-[#64748b] uppercase">Accused • {a.id}</span>
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
          <span className="text-[11px] text-[#64748b] uppercase">Gang • {g.id}</span>
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
          <span className="text-[11px] text-[#64748b] uppercase">FIR • {f.crime_type}</span>
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
          <span className="text-[11px] text-[#64748b] uppercase">Vehicle • {v.id}</span>
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
/*  Simple force simulation (no D3 dependency)                         */
/* ------------------------------------------------------------------ */

function simulateForce(nodes: SimNode[], links: SimLink[], width: number, height: number, iterations: number = 100) {
  const nodeMap = new Map<string, SimNode>();
  for (const n of nodes) {
    n.x = width / 2 + (Math.random() - 0.5) * width * 0.6;
    n.y = height / 2 + (Math.random() - 0.5) * height * 0.6;
    n.vx = 0;
    n.vy = 0;
    n.fx = null;
    n.fy = null;
    nodeMap.set(n.id, n);
  }

  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations;
    const repulsion = 2000;
    const attraction = 0.005;
    const centerForce = 0.01;
    const damping = 0.9;

    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) { dist = 1; dx = Math.random() - 0.5; dy = Math.random() - 0.5; }
        const force = (repulsion * alpha) / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        if (a.fx === null) { a.vx += fx; a.vy += fy; }
        if (b.fx === null) { b.vx -= fx; b.vy -= fy; }
      }
    }

    // Attraction along links
    for (const link of links) {
      const s = nodeMap.get(link.source);
      const t = nodeMap.get(link.target);
      if (!s || !t) continue;
      const dx = t.x - s.x;
      const dy = t.y - s.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 1) continue;
      const force = dist * attraction * alpha;
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      if (s.fx === null) { s.vx += fx; s.vy += fy; }
      if (t.fx === null) { t.vx -= fx; t.vy -= fy; }
    }

    // Center gravity
    for (const n of nodes) {
      if (n.fx === null) {
        n.vx += (width / 2 - n.x) * centerForce * alpha;
        n.vy += (height / 2 - n.y) * centerForce * alpha;
      }
    }

    // Apply velocity
    for (const n of nodes) {
      if (n.fx === null) {
        n.vx *= damping;
        n.vy *= damping;
        n.x += n.vx;
        n.y += n.vy;
        // Keep in bounds
        n.x = Math.max(30, Math.min(width - 30, n.x));
        n.y = Math.max(30, Math.min(height - 30, n.y));
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Canvas drawing                                                     */
/* ------------------------------------------------------------------ */

function drawGraph(
  ctx: CanvasRenderingContext2D,
  nodes: SimNode[],
  links: SimLink[],
  width: number,
  height: number,
  hoveredNode: SimNode | null,
  selectedNode: SimNode | null
) {
  const nodeMap = new Map<string, SimNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#0a0f1e";
  ctx.fillRect(0, 0, width, height);

  // Draw links
  for (const link of links) {
    const s = nodeMap.get(link.source);
    const t = nodeMap.get(link.target);
    if (!s || !t) continue;

    ctx.beginPath();
    ctx.strokeStyle = link.color;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = link.type === "gang_associate" ? 1 : 1.5;
    if (link.type === "gang_associate") ctx.setLineDash([4, 3]);
    else ctx.setLineDash([]);
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(t.x, t.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }

  // Draw nodes
  for (const node of nodes) {
    const isHovered = hoveredNode?.id === node.id;
    const isSelected = selectedNode?.id === node.id;
    const size = node.size * 3;

    // Glow
    if (isHovered || isSelected) {
      ctx.shadowColor = node.color;
      ctx.shadowBlur = 16;
    }

    ctx.fillStyle = node.color;

    switch (node.type) {
      case "accused": {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.beginPath();
        ctx.arc(node.x - size * 0.25, node.y - size * 0.25, size * 0.35, 0, 2 * Math.PI);
        ctx.fill();
        break;
      }
      case "gang": {
        const sides = 6;
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
          const angle = (Math.PI * 2 * i) / sides - Math.PI / 2;
          const px = node.x + size * Math.cos(angle);
          const py = node.y + size * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        break;
      }
      case "fir": {
        const half = size * 0.85;
        ctx.fillRect(node.x - half, node.y - half, half * 2, half * 2);
        break;
      }
      case "vehicle": {
        ctx.beginPath();
        ctx.moveTo(node.x, node.y - size);
        ctx.lineTo(node.x - size * 0.866, node.y + size * 0.5);
        ctx.lineTo(node.x + size * 0.866, node.y + size * 0.5);
        ctx.closePath();
        ctx.fill();
        break;
      }
      case "district": {
        ctx.beginPath();
        ctx.arc(node.x, node.y, size * 1.2, 0, 2 * Math.PI);
        ctx.fill();
        ctx.fillStyle = "rgba(255,255,255,0.12)";
        ctx.beginPath();
        ctx.arc(node.x, node.y, size * 0.5, 0, 2 * Math.PI);
        ctx.fill();
        break;
      }
    }
    ctx.shadowBlur = 0;

    // Label
    ctx.font = `${isHovered || isSelected ? "11px" : "10px"} Inter, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    ctx.fillStyle = isHovered || isSelected ? "#ffffff" : "rgba(255,255,255,0.8)";
    const label = node.name.length > 14 ? node.name.slice(0, 14) + "..." : node.name;
    ctx.fillText(label, node.x, node.y + size + 4);
  }

  // Tooltip for hovered node
  if (hoveredNode) {
    const tx = hoveredNode.x + 15;
    const ty = hoveredNode.y - 10;
    const text = `${hoveredNode.name} (${hoveredNode.type})`;
    ctx.font = "12px Inter, system-ui, sans-serif";
    const metrics = ctx.measureText(text);
    const pw = metrics.width + 16;
    const ph = 26;
    ctx.fillStyle = "rgba(26, 32, 53, 0.95)";
    ctx.strokeStyle = "#2a3550";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(tx, ty - ph, pw, ph, 6);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#e2e8f0";
    ctx.textAlign = "left";
    ctx.textBaseline = "middle";
    ctx.fillText(text, tx + 8, ty - ph / 2);
  }
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function NetworkGraph() {
  const crimeData = useAppStore((s) => s.crimeData);
  const [crimeTypeFilter, setCrimeTypeFilter] = useState<string>("all");
  const [gangFilter, setGangFilter] = useState<string>("all");
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const simNodesRef = useRef<SimNode[]>([]);
  const dragNodeRef = useRef<SimNode | null>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 800, h: 600 });

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

  /* build filtered nodes & links */
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
      nodeMap.set(a.id, { id: a.id, name: a.name, type: "accused", color: "#ef4444", size: a.risk / 10, x: 0, y: 0, vx: 0, vy: 0, fx: null, fy: null, _accused: a });
    }
    for (const g of gangs) {
      if (isFiltered && visibleGangIds && !visibleGangIds.has(g.id)) continue;
      if (isFiltered && visibleAccusedIds && !visibleAccusedIds.has(g.id)) continue;
      nodeMap.set(g.id, { id: g.id, name: g.name, type: "gang", color: "#f59e0b", size: 6, x: 0, y: 0, vx: 0, vy: 0, fx: null, fy: null, _gang: g });
    }
    for (const f of firs) {
      if (isFiltered && visibleFirIds && !visibleFirIds.has(f.fir_id)) continue;
      nodeMap.set(f.fir_id, { id: f.fir_id, name: f.fir_id, type: "fir", color: "#eab308", size: 2, x: 0, y: 0, vx: 0, vy: 0, fx: null, fy: null, _fir: f });
    }
    for (const v of vehicles) {
      if (isFiltered && visibleAccusedIds && !visibleAccusedIds.has(v.id)) continue;
      nodeMap.set(v.id, { id: v.id, name: v.reg, type: "vehicle", color: "#06b6d4", size: 3, x: 0, y: 0, vx: 0, vy: 0, fx: null, fy: null, _vehicle: v });
    }
    for (const d of districts) {
      if (isFiltered && visibleAccusedIds && !visibleAccusedIds.has(d.name)) continue;
      const firCount = firs.filter((f) => (!visibleFirIds || visibleFirIds.has(f.fir_id)) && f.district === d.name).length;
      if (isFiltered && firCount === 0) continue;
      nodeMap.set(d.name, { id: d.name, name: d.name, type: "district", color: "#8b5cf6", size: 4, x: 0, y: 0, vx: 0, vy: 0, fx: null, fy: null, _district: d, _firCount: firCount });
    }

    const allEdges = getNetworkEdges(crimeData);
    const nodeIds = new Set(nodeMap.keys());
    const filteredEdges = allEdges.filter((e) => nodeIds.has(e.source) && nodeIds.has(e.target));
    const filteredLinks: SimLink[] = filteredEdges.map((e) => ({ source: e.source, target: e.target, type: e.type, color: LINK_COLORS[e.type] || "#64748b" }));

    return { nodes: Array.from(nodeMap.values()), links: filteredLinks };
  }, [crimeData, crimeTypeFilter, gangFilter]);

  /* Run force simulation when data changes */
  useEffect(() => {
    if (nodes.length === 0) return;
    const simNodes = nodes.map((n) => ({ ...n }));
    simulateForce(simNodes, links, canvasSize.w, canvasSize.h, 150);
    simNodesRef.current = simNodes;
  }, [nodes, links, canvasSize.w, canvasSize.h]);

  /* Draw canvas */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || simNodesRef.current.length === 0) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    drawGraph(ctx, simNodesRef.current, links, canvasSize.w, canvasSize.h, hoveredNode, selectedNode);
  }, [links, canvasSize, hoveredNode, selectedNode]);

  /* Resize observer */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          setCanvasSize({ w: Math.floor(width), h: Math.floor(height) });
        }
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  /* Canvas interaction handlers */
  const getMouseNode = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (canvas.width / rect.width);
    const my = (e.clientY - rect.top) * (canvas.height / rect.height);
    for (const n of simNodesRef.current) {
      const dx = mx - n.x;
      const dy = my - n.y;
      const hitSize = Math.max(n.size * 3, 10) + 5;
      if (dx * dx + dy * dy < hitSize * hitSize) return n;
    }
    return null;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragNodeRef.current) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      dragNodeRef.current.x = (e.clientX - rect.left) * (canvas.width / rect.width);
      dragNodeRef.current.y = (e.clientY - rect.top) * (canvas.height / rect.height);
      return;
    }
    const node = getMouseNode(e);
    setHoveredNode(node);
  }, [getMouseNode]);

  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const node = getMouseNode(e);
    if (node) {
      dragNodeRef.current = node;
    }
  }, [getMouseNode]);

  const handleMouseUp = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragNodeRef.current) {
      dragNodeRef.current = null;
      return;
    }
  }, []);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragNodeRef.current) return;
    const node = getMouseNode(e);
    setSelectedNode(node);
  }, [getMouseNode]);

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
      {/* Filter Controls */}
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

      {/* Graph + Info Panel */}
      <div className="flex-1 relative overflow-hidden" ref={containerRef}>
        <canvas
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          className="w-full h-full cursor-grab active:cursor-grabbing"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onClick={handleClick}
        />

        {/* Right Side Info Panel */}
        {selectedNode && (
          <div className="absolute top-0 right-0 w-80 h-full bg-[#0d1321]/95 backdrop-blur-md border-l border-[#1e293b] z-10 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e293b] shrink-0">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Node Details</h2>
              <button onClick={() => setSelectedNode(null)} className="w-7 h-7 rounded-md flex items-center justify-center text-[#64748b] hover:text-white hover:bg-[#1e293b] transition-colors">
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
                <span className="text-[11px] text-[#334155]">•</span>
                <span className="text-[11px] text-[#475569] truncate">{selectedNode.id}</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}