"use client";

import dynamic from "next/dynamic";
import {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  Suspense,
} from "react";
import { useAppStore } from "@/lib/store";
import { getNetworkEdges } from "@/lib/data";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  User,
  Shield,
  FileText,
  Car,
  MapPin,
  Users,
  RotateCcw,
  Maximize2,
  Box,
} from "lucide-react";
import type { FIR, Accused, Gang, Vehicle, District } from "@/lib/types";
import LoadingSpinner from "./LoadingSpinner";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";

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
  vx: number;
  vy: number;
  vz: number;
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
/*  Constants — Classified Console Design System (Phosphor Green)       */
/* ------------------------------------------------------------------ */

const LINK_COLORS: Record<string, string> = {
  involved_in: "rgba(255,107,107,0.35)",
  member_of: "rgba(255,217,61,0.4)",
  occurred_in: "rgba(107,203,119,0.3)",
  used_vehicle: "rgba(77,150,255,0.35)",
  gang_associate: "rgba(255,146,43,0.2)",
};

const CRIME_TYPES = [
  "Chain Snatching",
  "Vehicle Theft",
  "Cyber Fraud",
  "Jewellery Heist",
  "Drug Trafficking",
];

const NODE_TYPE_CONFIG: Record<
  string,
  { color: string; label: string; icon: string; radius: number }
> = {
  accused: { color: "#FF6B6B", label: "Accused", icon: "●", radius: 0.65 },
  gang: { color: "#FFD93D", label: "Gang", icon: "◆", radius: 1.6 },
  fir: { color: "#6BCB77", label: "FIR", icon: "■", radius: 0.5 },
  vehicle: { color: "#4D96FF", label: "Vehicle", icon: "▲", radius: 0.55 },
  district: { color: "#FF922B", label: "District", icon: "◉", radius: 1.3 },
};

/* ------------------------------------------------------------------ */
/*  Solid Card Style                                                   */
/* ------------------------------------------------------------------ */

const solidCard: React.CSSProperties = {
  background: "var(--bg-card)",
  border: "1px solid var(--border-default)",
  borderRadius: "3px",
  boxShadow:
    "0 16px 48px -12px rgba(0, 0, 0, 0.5), 0 0 8px rgba(0,255,102,0.04)",
};

/* ------------------------------------------------------------------ */
/*  Info Panel sub-components                                          */
/* ------------------------------------------------------------------ */

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <Icon className="size-4 mt-0.5 shrink-0 text-[var(--text-secondary)]" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)]">
          {label}
        </p>
        <p className="text-sm text-[var(--text-primary)] break-words">{value}</p>
      </div>
    </div>
  );
}

function AccusedPanel({ node }: { node: SimNode }) {
  const a = node._accused!;
  const crimeData = useAppStore((s) => s.crimeData);
  const firs =
    crimeData?.firs.filter((f) => f.accused.includes(a.id)) ?? [];
  const gang = crimeData?.gangs.find((g) => g.id === a.gang);
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-[#FF6B6B]/15 flex items-center justify-center">
          <User className="size-4 text-[#FF6B6B]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white leading-tight">
            {a.name}
          </h3>
          <span className="text-[11px] text-[var(--text-tertiary)] uppercase">
            Accused &bull; {a.id}
          </span>
        </div>
      </div>
      <InfoRow icon={User} label="Age" value={`${a.age} years`} />
      <InfoRow icon={Users} label="Gender" value={a.gender} />
      <InfoRow
        icon={Shield}
        label="Risk Score"
        value={
          <span
            className={
              a.risk > 80
                ? "text-[#00FF66] font-bold"
                : a.risk > 60
                ? "text-[#00cc52] font-bold"
                : "text-[rgba(0,255,102,0.6)] font-bold"
            }
          >
            {a.risk}/100
          </span>
        }
      />
      <InfoRow
        icon={Shield}
        label="Gang"
        value={gang ? gang.name : "None"}
      />
      <InfoRow
        icon={FileText}
        label="Prior FIRs"
        value={String(a.prior_firs)}
      />
      {firs.length > 0 && (
        <div className="mt-2">
          <p className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] mb-1">
            Linked FIRs
          </p>
          <div className="flex flex-wrap gap-1">
            {firs.map((f) => (
              <span
                key={f.fir_id}
                className="px-1.5 py-0.5 bg-[#FF6B6B]/10 text-[#FF6B6B] text-[11px] rounded font-mono"
              >
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
        <div className="w-9 h-9 rounded-full bg-[#FFD93D]/15 flex items-center justify-center">
          <Shield className="size-4 text-[#FFD93D]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white leading-tight">
            {g.name}
          </h3>
          <span className="text-[11px] text-[var(--text-tertiary)] uppercase">
            Gang &bull; {g.id}
          </span>
        </div>
      </div>
      <InfoRow icon={Shield} label="Type" value={g.type} />
      <InfoRow icon={MapPin} label="Base" value={g.base} />
      <InfoRow
        icon={Users}
        label="Members"
        value={
          <div className="space-y-0.5">
            {g.members.map((mid) => {
              const acc = crimeData?.accused.find((a) => a.id === mid);
              return (
                <div key={mid}>
                  {acc ? acc.name : mid}{" "}
                  <span className="text-[var(--text-tertiary)]">({mid})</span>
                </div>
              );
            })}
          </div>
        }
      />
    </div>
  );
}

function FIRPanel({ node }: { node: SimNode }) {
  const f = node._fir!;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-[#6BCB77]/15 flex items-center justify-center">
          <FileText className="size-4 text-[#6BCB77]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white leading-tight">
            {f.fir_id}
          </h3>
          <span className="text-[11px] text-[var(--text-tertiary)] uppercase">
            FIR &bull; {f.crime_type}
          </span>
        </div>
      </div>
      <InfoRow icon={FileText} label="Date" value={`${f.date} ${f.time}`} />
      <InfoRow icon={MapPin} label="District" value={f.district} />
      <InfoRow
        icon={Shield}
        label="Severity"
        value={
          <span
            className={
              f.severity === "critical"
                ? "text-[#00FF66]"
                : f.severity === "high"
                ? "text-[#00cc52]"
                : "text-[rgba(0,255,102,0.7)]"
            }
          >
            {f.severity.toUpperCase()}
          </span>
        }
      />
      <InfoRow
        icon={Shield}
        label="Status"
        value={f.investigation_status}
      />
      <InfoRow icon={MapPin} label="Location" value={f.location.place} />
      <InfoRow
        icon={Users}
        label="Accused"
        value={
          <div className="space-y-0.5">
            {f.accused.map((a) => (
              <div key={a}>{a}</div>
            ))}
          </div>
        }
      />
    </div>
  );
}

function VehiclePanel({ node }: { node: SimNode }) {
  const v = node._vehicle!;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-9 h-9 rounded-full bg-[#4D96FF]/15 flex items-center justify-center">
          <Car className="size-4 text-[#4D96FF]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white leading-tight">
            {v.reg}
          </h3>
          <span className="text-[11px] text-[var(--text-tertiary)] uppercase">
            Vehicle &bull; {v.id}
          </span>
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
        <div className="w-9 h-9 rounded-full bg-[#FF922B]/15 flex items-center justify-center">
          <MapPin className="size-4 text-[#FF922B]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white leading-tight">
            {d.name}
          </h3>
          <span className="text-[11px] text-[var(--text-tertiary)] uppercase">
            District
          </span>
        </div>
      </div>
      <InfoRow icon={MapPin} label="Name" value={d.name} />
      <InfoRow
        icon={FileText}
        label="FIR Count"
        value={
          <span className="font-bold text-[#FF922B]">
            {node._firCount ?? 0}
          </span>
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Hierarchical Radial Layout (deterministic, no force simulation)     */
/* ------------------------------------------------------------------ */

function layoutHierarchical(
  nodes: SimNode[],
  links: SimLink[]
) {
  const nodeMap = new Map<string, SimNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  /* Group by type */
  const gangs: SimNode[] = [];
  const accused: SimNode[] = [];
  const firs: SimNode[] = [];
  const vehicles: SimNode[] = [];
  const districts: SimNode[] = [];

  for (const n of nodes) {
    switch (n.type) {
      case "gang": gangs.push(n); break;
      case "accused": accused.push(n); break;
      case "fir": firs.push(n); break;
      case "vehicle": vehicles.push(n); break;
      case "district": districts.push(n); break;
    }
  }

  /* Build adjacency: accused → gang */
  const accusedToGang = new Map<string, SimNode>();
  const gangMembers = new Map<string, SimNode[]>();
  for (const a of accused) {
    if (a._accused?.gang) {
      const g = nodeMap.get(a._accused.gang);
      if (g) {
        accusedToGang.set(a.id, g);
        if (!gangMembers.has(g.id)) gangMembers.set(g.id, []);
        gangMembers.get(g.id)!.push(a);
      }
    }
  }

  /* Build adjacency: FIR → accused, FIR → district, FIR → vehicle */
  const firToAccused = new Map<string, SimNode[]>();
  const firToDistrict = new Map<string, SimNode>();
  const firToVehicle = new Map<string, SimNode>();
  for (const f of firs) {
    if (f._fir) {
      const linked: SimNode[] = [];
      for (const aid of f._fir.accused) {
        const a = nodeMap.get(aid);
        if (a) linked.push(a);
      }
      firToAccused.set(f.id, linked);
      if (f._fir.district) {
        const d = nodeMap.get(f._fir.district);
        if (d) firToDistrict.set(f.id, d);
      }
      if (f._fir.vehicle_used) {
        const v = nodeMap.get(f._fir.vehicle_used);
        if (v) firToVehicle.set(f.id, v);
      }
    }
  }

  /* ── 1. Place GANGS in center ring ── */
  const gangRadius = Math.max(5, gangs.length * 2.8);
  const gangAngleStep = gangs.length > 0 ? (2 * Math.PI) / gangs.length : 0;
  for (let i = 0; i < gangs.length; i++) {
    const angle = gangAngleStep * i - Math.PI / 2;
    gangs[i].x = Math.cos(angle) * gangRadius;
    gangs[i].y = 1.0;
    gangs[i].z = Math.sin(angle) * gangRadius;
  }

  /* ── 2. Place ACCUSED around their gang ── */
  for (const gang of gangs) {
    const members = gangMembers.get(gang.id) ?? [];
    const memberRadius = 6.0;
    const arcSpan = Math.min(Math.PI * 0.85, members.length * 0.5);
    const memberAngleStep =
      members.length > 1 ? arcSpan / (members.length - 1) : 0;
    const gangAngle = Math.atan2(gang.z, gang.x);
    const startAngle = gangAngle - arcSpan / 2;

    for (let i = 0; i < members.length; i++) {
      const angle = startAngle + memberAngleStep * i;
      members[i].x = gang.x + Math.cos(angle) * memberRadius;
      members[i].y = 0.3;
      members[i].z = gang.z + Math.sin(angle) * memberRadius;
    }
  }

  /* Accused with no gang → outer scatter */
  const unaffiliated = accused.filter((a) => !accusedToGang.has(a.id));
  const uaRadius = gangRadius + 10;
  const uaStep =
    unaffiliated.length > 0 ? (2 * Math.PI) / unaffiliated.length : 0;
  for (let i = 0; i < unaffiliated.length; i++) {
    const angle = uaStep * i + 0.5;
    unaffiliated[i].x = Math.cos(angle) * uaRadius;
    unaffiliated[i].y = 0.3;
    unaffiliated[i].z = Math.sin(angle) * uaRadius;
  }

  /* ── 3. Place FIRs near their first accused, pushed outward ── */
  // Track FIR placement angles to spread multiple FIRs per accused
  const accusedFirCount = new Map<string, number>();
  for (const fir of firs) {
    const linked = firToAccused.get(fir.id);
    if (linked && linked.length > 0) {
      const anchor = linked[0];
      const dirX = anchor.x;
      const dirZ = anchor.z;
      const dist = Math.sqrt(dirX * dirX + dirZ * dirZ) || 1;
      const outX = dirX / dist;
      const outZ = dirZ / dist;
      const idx = accusedFirCount.get(anchor.id) ?? 0;
      accusedFirCount.set(anchor.id, idx + 1);
      // Fan out multiple FIRs per accused
      const spread = idx * 0.6;
      const perpX = -outZ;
      const perpZ = outX;
      fir.x = anchor.x + outX * 4.0 + perpX * spread;
      fir.y = -0.1;
      fir.z = anchor.z + outZ * 4.0 + perpZ * spread;
    } else {
      // Fallback: place in a ring
      const fIdx = firs.indexOf(fir);
      const fAngle = (2 * Math.PI * fIdx) / firs.length;
      const fRadius = gangRadius + 7;
      fir.x = Math.cos(fAngle) * fRadius;
      fir.y = -0.2;
      fir.z = Math.sin(fAngle) * fRadius;
    }
  }

  /* ── 4. Place VEHICLES near their FIR ── */
  for (const v of vehicles) {
    const link = links.find((l) => l.source === v.id || l.target === v.id);
    if (link) {
      const otherId =
        link.source === v.id ? link.target : link.source;
      const anchor = nodeMap.get(otherId);
      if (anchor) {
        const dx = anchor.x;
        const dz = anchor.z;
        const dist = Math.sqrt(dx * dx + dz * dz) || 1;
        const perpX = -dz / dist;
        const perpZ = dx / dist;
        v.x = anchor.x + perpX * 2.5 + (dx / dist) * 1.8;
        v.y = -0.3;
        v.z = anchor.z + perpZ * 2.5 + (dz / dist) * 1.8;
        continue;
      }
    }
    // Fallback: outer ring
    const vIdx = vehicles.indexOf(v);
    const vAngle = (2 * Math.PI * vIdx) / vehicles.length + 1.0;
    const vRadius = gangRadius + 12;
    v.x = Math.cos(vAngle) * vRadius;
    v.y = -0.4;
    v.z = Math.sin(vAngle) * vRadius;
  }

  /* ── 5. Place DISTRICTS in outer ring ── */
  const distRadius = gangRadius + 16;
  const distStep =
    districts.length > 0 ? (2 * Math.PI) / districts.length : 0;
  for (let i = 0; i < districts.length; i++) {
    const angle = distStep * i + 0.3;
    districts[i].x = Math.cos(angle) * distRadius;
    districts[i].y = -0.6;
    districts[i].z = Math.sin(angle) * distRadius;
  }

  /* ── 6. Collision avoidance (8 passes, stronger) ── */
  for (let pass = 0; pass < 8; pass++) {
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x;
        const dz = a.z - b.z;
        const dist = Math.sqrt(dx * dx + dz * dz);
        // Larger minimum distance for bigger node types
        const ra = getNodeRadius(a);
        const rb = getNodeRadius(b);
        const minDist = (ra + rb) * 2.5 + 0.5;
        if (dist < minDist && dist > 0.01) {
          const push = (minDist - dist) * 0.45;
          const nx = dx / dist;
          const nz = dz / dist;
          a.x += nx * push;
          a.z += nz * push;
          b.x -= nx * push;
          b.z -= nz * push;
        }
      }
    }
  }
}

/* ------------------------------------------------------------------ */
/*  Compute curved link points (quadratic bezier arc in 3D)           */
/* ------------------------------------------------------------------ */

function curvedLinkPoints(
  sx: number,
  sy: number,
  sz: number,
  tx: number,
  ty: number,
  tz: number,
  segments: number = 12
): [number, number, number][] {
  // Midpoint with upward arc
  const mx = (sx + tx) / 2;
  const mz = (sz + tz) / 2;
  const my = Math.max(sy, ty) + 0.8; // arc upward

  const points: [number, number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const inv = 1 - t;
    // Quadratic bezier
    const px = inv * inv * sx + 2 * inv * t * mx + t * t * tx;
    const py = inv * inv * sy + 2 * inv * t * my + t * t * ty;
    const pz = inv * inv * sz + 2 * inv * t * mz + t * t * tz;
    points.push([px, py, pz]);
  }
  return points;
}

/* ------------------------------------------------------------------ */
/*  3D Scene Components                                                */
/* ------------------------------------------------------------------ */

function getNodeRadius(node: SimNode): number {
  let r = NODE_TYPE_CONFIG[node.type]?.radius ?? 0.5;
  if (node.type === "accused" && node._accused) {
    r = Math.max(0.4, node._accused.risk / 100);
  }
  if (node.type === "district" && node._firCount) {
    r = Math.max(0.6, Math.min(1.4, 0.7 + node._firCount * 0.15));
  }
  return r;
}

/* ── Animated Dashed Edge ── */
function AnimatedEdge({
  link,
  nodeMap,
  selectedNodeId,
}: {
  link: SimLink;
  nodeMap: Map<string, SimNode>;
  selectedNodeId: string | null;
}) {
  const s = nodeMap.get(link.source);
  const t = nodeMap.get(link.target);
  const lineRef = useRef<THREE.Line>(null);
  const matRef = useRef<THREE.LineDashedMaterial>(null);

  if (!s || !t) return null;
  if (link.type === "gang_associate") return null;

  const isHighlighted =
    selectedNodeId &&
    (link.source === selectedNodeId || link.target === selectedNodeId);

  const baseOpacity = link.type === "involved_in" ? 0.28 : 0.35;
  const opacity = selectedNodeId
    ? isHighlighted
      ? 0.95
      : 0.02
    : baseOpacity;

  if (opacity < 0.02) return null;

  const points = curvedLinkPoints(s.x, s.y, s.z, t.x, t.y, t.z, 20);

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const vertices = new Float32Array(points.length * 3);
    for (let i = 0; i < points.length; i++) {
      vertices[i * 3] = points[i][0];
      vertices[i * 3 + 1] = points[i][1];
      vertices[i * 3 + 2] = points[i][2];
    }
    geo.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
    return geo;
  }, [points]);

  // Animate dash offset to create "data flowing" effect
  useFrame((_state, delta) => {
    if (matRef.current) {
      matRef.current.dashOffset -= delta * (isHighlighted ? 2.0 : 0.6);
    }
  });

  const edgeColorMap: Record<string, string> = {
    involved_in: "#FF6B6B",
    member_of: "#FFD93D",
    occurred_in: "#6BCB77",
    used_vehicle: "#4D96FF",
    gang_associate: "#FF922B",
  };

  return (
    <line ref={lineRef} geometry={geometry}>
      {/* @ts-expect-error R3F lowercase primitive for THREE.Line */}
      <lineDashedMaterial
        ref={matRef}
        color={edgeColorMap[link.type] || "#00FF66"}
        transparent
        opacity={opacity}
        dashSize={isHighlighted ? 1.0 : 0.6}
        gapSize={isHighlighted ? 0.3 : 0.6}
        linewidth={1}
        toneMapped={false}
      />
    </line>
  );
}

/* ── Green Particle Field ── */
function GreenParticleField() {
  const pointsRef = useRef<THREE.Points>(null);

  const geometry = useMemo(() => {
    const count = 1200;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      // Random positions in a large sphere
      const r = 15 + Math.random() * 45;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = r * Math.cos(phi);

      // Multi-colored particles
      const particleColors = ["#FF6B6B", "#FFD93D", "#6BCB77", "#4D96FF", "#FF922B", "#00FF66"];
      const pColor = new THREE.Color(particleColors[Math.floor(Math.random() * particleColors.length)]);
      colors[i * 3] = pColor.r;
      colors[i * 3 + 1] = pColor.g;
      colors[i * 3 + 2] = pColor.b;

      sizes[i] = 0.1 + Math.random() * 0.35;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    return geo;
  }, []);

  // Slow rotation for ambient feel
  useFrame((_state, delta) => {
    if (pointsRef.current) {
      pointsRef.current.rotation.y += delta * 0.008;
    }
  });

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        size={0.2}
        vertexColors
        transparent
        opacity={0.5}
        sizeAttenuation
        toneMapped={false}
        depthWrite={false}
      />
    </points>
  );
}

/* ── Node Mesh ── */
function NodeMesh({
  node,
  isSelected,
  isConnected,
  isDimmed,
  isHovered,
  onClick,
  onHover,
}: {
  node: SimNode;
  isSelected: boolean;
  isConnected: boolean;
  isDimmed: boolean;
  isHovered: boolean;
  onClick: (n: SimNode) => void;
  onHover: (n: SimNode | null) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const [hoveredLocal, setHoveredLocal] = useState(false);
  const radius = getNodeRadius(node);
  const isActive = isSelected || isHovered || hoveredLocal;

  useFrame((_state, delta) => {
    // Gentle pulse for selected/hovered
    if (glowRef.current) {
      const targetScale = isActive ? 3.5 : 2.2;
      const current = glowRef.current.scale.x;
      const next = current + (targetScale - current) * 0.08;
      glowRef.current.scale.setScalar(next);
    }
    // Slow rotation for gang nodes
    if (meshRef.current && node.type === "gang") {
      meshRef.current.rotation.y += delta * 0.5;
    }
    // Selection ring rotation
    if (ringRef.current && isSelected) {
      ringRef.current.rotation.z += delta * 1.0;
    }
    // Ambient pulse — all nodes breathe subtly
    if (meshRef.current) {
      const pulse = 1 + Math.sin(_state.clock.elapsedTime * 1.5 + node.x * 0.3) * 0.04;
      meshRef.current.scale.setScalar(pulse);
    }
  });

  const opacity = isDimmed ? 0.06 : 1;
  const emissiveIntensity = isActive ? 0.9 : 0.5;
  const color = new THREE.Color(node.color);

  // Only gang and district show labels by default
  const showLabelAlways = node.type === "gang" || node.type === "district";
  const showLabel = !isDimmed && (showLabelAlways || isActive);

  const geometry = useMemo(() => {
    switch (node.type) {
      case "accused":
        return <icosahedronGeometry args={[radius, 1]} />;
      case "gang":
        return <octahedronGeometry args={[radius, 0]} />;
      case "fir":
        return <boxGeometry args={[radius * 1.2, radius * 1.2, radius * 0.3]} />;
      case "vehicle":
        return <coneGeometry args={[radius * 0.7, radius * 2.0, 4]} />;
      case "district":
        return <dodecahedronGeometry args={[radius, 0]} />;
      default:
        return <sphereGeometry args={[radius, 16, 16]} />;
    }
  }, [node.type, radius]);

  const labelStyle: React.CSSProperties = showLabelAlways
    ? {
        background: "rgba(5, 7, 10, 0.92)",
        border: `1px solid ${node.color}26`,
        borderRadius: "2px",
        padding: "2px 6px",
        whiteSpace: "nowrap",
        fontSize: isActive ? "11px" : "10px",
        fontWeight: 600,
        color: node.color,
        fontFamily: "var(--font-ibm-plex-mono), monospace",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        boxShadow: `0 2px 12px rgba(0,0,0,0.6), 0 0 6px ${node.color}14`,
        pointerEvents: "none",
      }
    : {
        background: "rgba(5, 7, 10, 0.94)",
        border: `1px solid ${node.color}4D`,
        borderRadius: "2px",
        padding: "2px 8px",
        whiteSpace: "nowrap",
        fontSize: "11px",
        fontWeight: 600,
        color: node.color,
        fontFamily: "var(--font-ibm-plex-mono), monospace",
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        boxShadow: `0 4px 16px rgba(0,0,0,0.7), 0 0 10px ${node.color}1F`,
        pointerEvents: "none",
      };

  const truncatedName =
    node.name.length > 20 ? node.name.slice(0, 20) + "…" : node.name;

  return (
    <group position={[node.x, node.y, node.z]}>
      {/* Main mesh */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick(node);
        }}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredLocal(true);
          onHover(node);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHoveredLocal(false);
          onHover(null);
          document.body.style.cursor = "auto";
        }}
      >
        {geometry}
        <meshStandardMaterial
          color={color}
          emissive={color}
          emissiveIntensity={emissiveIntensity}
          transparent
          opacity={opacity}
          roughness={0.2}
          metalness={0.7}
          toneMapped={false}
        />
      </mesh>

      {/* Outer glow — larger, more visible */}
      {!isDimmed && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[radius * 2.0, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={isActive ? 0.25 : 0.08}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Ambient pulse ring for gang nodes */}
      {node.type === "gang" && !isDimmed && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 2.0, radius * 2.3, 6]} />
          <meshBasicMaterial
            color="#FFD93D"
            transparent
            opacity={0.12}
            side={THREE.DoubleSide}
            toneMapped={false}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Selection ring — bright phosphor green */}
      {isSelected && !isDimmed && (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 1.6, radius * 1.8, 32]} />
          <meshBasicMaterial
            color={node.color}
            transparent
            opacity={0.6}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Label */}
      {showLabel && (
        <Html
          position={[0, radius + 0.5, 0]}
          center
          style={{ pointerEvents: "none" }}
          distanceFactor={14}
        >
          <div style={labelStyle}>{truncatedName}</div>
        </Html>
      )}
    </group>
  );
}

/* Camera controller with auto-rotate */
function CameraController({
  resetFlag,
}: {
  resetFlag: number;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    camera.position.set(0, 22, 28);
    camera.lookAt(0, 0, 0);
    if (controlsRef.current) {
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resetFlag]);

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      rotateSpeed={0.6}
      zoomSpeed={1.0}
      minDistance={5}
      maxDistance={55}
      maxPolarAngle={Math.PI * 0.85}
      minPolarAngle={Math.PI * 0.1}
      autoRotate
      autoRotateSpeed={0.1}
    />
  );
}

/* The full 3D graph scene */
function GraphScene3D({
  nodes,
  links,
  selectedNode,
  hoveredNode,
  onSelectNode,
  onHoverNode,
  resetFlag,
}: {
  nodes: SimNode[];
  links: SimLink[];
  selectedNode: SimNode | null;
  hoveredNode: SimNode | null;
  onSelectNode: (node: SimNode) => void;
  onHoverNode: (node: SimNode | null) => void;
  resetFlag: number;
}) {
  const nodeMap = useMemo(() => {
    const m = new Map<string, SimNode>();
    for (const n of nodes) m.set(n.id, n);
    return m;
  }, [nodes]);

  const connectedNodeIds = useMemo(() => {
    if (!selectedNode) return new Set<string>();
    const ids = new Set<string>();
    for (const l of links) {
      if (l.source === selectedNode.id) ids.add(l.target);
      if (l.target === selectedNode.id) ids.add(l.source);
    }
    return ids;
  }, [selectedNode, links]);

  return (
    <>
      {/* Environment — dark classified console background */}
      <color attach="background" args={["#030508"]} />
      <fog attach="fog" args={["#030508", 30, 70]} />

      {/* Lighting — multi-colored for vibrant feel */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[15, 25, 15]}
        intensity={0.3}
        color="#e8e8e8"
      />
      {/* Central green point light for node glow illumination */}
      <pointLight
        position={[0, 8, 0]}
        intensity={1.0}
        color="#00FF66"
        distance={55}
        decay={2}
      />
      <pointLight
        position={[15, 10, 15]}
        intensity={0.3}
        color="#00FF66"
        distance={45}
        decay={2}
      />
      <pointLight
        position={[-15, 10, -15]}
        intensity={0.2}
        color="#00cc52"
        distance={45}
        decay={2}
      />
      {/* Colored point lights for different node types */}
      <pointLight position={[12, 8, 0]} intensity={0.6} color="#FF6B6B" distance={40} decay={2} />
      <pointLight position={[-12, 8, 0]} intensity={0.6} color="#4D96FF" distance={40} decay={2} />
      <pointLight position={[0, 8, 12]} intensity={0.5} color="#FFD93D" distance={40} decay={2} />
      <pointLight position={[0, 8, -12]} intensity={0.5} color="#FF922B" distance={40} decay={2} />

      {/* Green particle field (star field replacement) */}
      <GreenParticleField />

      {/* Ground grid — subtle green tint */}
      <gridHelper
        args={[60, 30, "rgba(0,255,102,0.08)", "rgba(0,255,102,0.03)"]}
        position={[0, -1.5, 0]}
      />

      {/* Camera */}
      <CameraController resetFlag={resetFlag} />

      {/* Links — animated dashed edges */}
      {links.map((link, i) => (
        <AnimatedEdge
          key={`link-${i}`}
          link={link}
          nodeMap={nodeMap}
          selectedNodeId={selectedNode?.id}
        />
      ))}

      {/* Nodes */}
      {nodes.map((node) => (
        <NodeMesh
          key={node.id}
          node={node}
          isSelected={selectedNode?.id === node.id}
          isConnected={connectedNodeIds.has(node.id)}
          isDimmed={
            !!selectedNode &&
            selectedNode.id !== node.id &&
            !connectedNodeIds.has(node.id)
          }
          isHovered={hoveredNode?.id === node.id}
          onClick={onSelectNode}
          onHover={onHoverNode}
        />
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

function NetworkGraphInner() {
  const crimeData = useAppStore((s) => s.crimeData);
  const [crimeTypeFilter, setCrimeTypeFilter] = useState<string>("all");
  const [gangFilter, setGangFilter] = useState<string>("all");
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [hoveredNode, setHoveredNode] = useState<SimNode | null>(null);
  const [layoutVersion, setLayoutVersion] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (!crimeData)
      return { nodes: [] as SimNode[], links: [] as SimLink[] };

    const firs = crimeData.firs;
    const accused = crimeData.accused;
    const gangs = crimeData.gangs;
    const vehicles = crimeData.vehicles;
    const districts = crimeData.districts;

    let visibleFirIds: Set<string> | null = null;
    let visibleAccusedIds: Set<string> | null = null;
    let visibleGangIds: Set<string> | null = null;

    if (crimeTypeFilter !== "all") {
      visibleFirIds = new Set(
        firs.filter((f) => f.crime_type === crimeTypeFilter).map((f) => f.fir_id)
      );
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
        const gangFirIds = new Set(
          firs.filter((f) => f.gang_id === gang.id).map((f) => f.fir_id)
        );
        visibleFirIds = visibleFirIds
          ? new Set([...visibleFirIds].filter((id) => gangFirIds.has(id)))
          : gangFirIds;
        visibleAccusedIds = memberIds;
        for (const fir of firs) {
          if (visibleFirIds.has(fir.fir_id)) {
            if (fir.vehicle_used) memberIds.add(fir.vehicle_used);
            memberIds.add(fir.district);
          }
        }
      }
    }

    const isFiltered =
      visibleFirIds !== null || visibleAccusedIds !== null;
    const nodeMap = new Map<string, SimNode>();

    for (const a of accused) {
      if (isFiltered && visibleAccusedIds && !visibleAccusedIds.has(a.id))
        continue;
      nodeMap.set(a.id, {
        id: a.id,
        name: a.name,
        type: "accused",
        color: "#FF6B6B",
        size: a.risk / 10,
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        _accused: a,
      });
    }
    for (const g of gangs) {
      if (isFiltered && visibleGangIds && !visibleGangIds.has(g.id))
        continue;
      if (isFiltered && visibleAccusedIds && !visibleAccusedIds.has(g.id))
        continue;
      nodeMap.set(g.id, {
        id: g.id,
        name: g.name,
        type: "gang",
        color: "#FFD93D",
        size: 6,
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        _gang: g,
      });
    }
    for (const f of firs) {
      if (isFiltered && visibleFirIds && !visibleFirIds.has(f.fir_id))
        continue;
      nodeMap.set(f.fir_id, {
        id: f.fir_id,
        name: f.fir_id,
        type: "fir",
        color: "#6BCB77",
        size: 2,
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        _fir: f,
      });
    }
    for (const v of vehicles) {
      if (isFiltered && visibleAccusedIds && !visibleAccusedIds.has(v.id))
        continue;
      nodeMap.set(v.id, {
        id: v.id,
        name: v.reg,
        type: "vehicle",
        color: "#4D96FF",
        size: 3,
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        _vehicle: v,
      });
    }
    for (const d of districts) {
      if (isFiltered && visibleAccusedIds && !visibleAccusedIds.has(d.name))
        continue;
      const firCount = firs.filter(
        (f) =>
          (!visibleFirIds || visibleFirIds.has(f.fir_id)) &&
          f.district === d.name
      ).length;
      if (isFiltered && firCount === 0) continue;
      nodeMap.set(d.name, {
        id: d.name,
        name: d.name,
        type: "district",
        color: "#FF922B",
        size: 4,
        x: 0, y: 0, z: 0,
        vx: 0, vy: 0, vz: 0,
        _district: d,
        _firCount: firCount,
      });
    }

    const allEdges = getNetworkEdges(crimeData);
    const nodeIds = new Set(nodeMap.keys());
    const filteredEdges = allEdges.filter(
      (e) => nodeIds.has(e.source) && nodeIds.has(e.target)
    );
    const filteredLinks: SimLink[] = filteredEdges.map((e) => ({
      source: e.source,
      target: e.target,
      type: e.type,
      color: LINK_COLORS[e.type] || "rgba(255,255,255,0.12)",
    }));

    return { nodes: Array.from(nodeMap.values()), links: filteredLinks };
  }, [crimeData, crimeTypeFilter, gangFilter]);

  /* Run hierarchical layout */
  const layoutNodes = useMemo(() => {
    if (nodes.length === 0) return [];
    const result = nodes.map((n) => ({ ...n }));
    layoutHierarchical(result, links);
    return result;
  }, [nodes, links, layoutVersion]);

  const simReady = layoutNodes.length > 0;

  const handleSelectNode = useCallback((node: SimNode | null) => {
    setSelectedNode((prev) => (prev?.id === node?.id ? null : node ?? null));
  }, []);

  const handleHoverNode = useCallback((node: SimNode | null) => {
    setHoveredNode(node);
  }, []);

  const handleReset = useCallback(() => {
    setCrimeTypeFilter("all");
    setGangFilter("all");
    setSelectedNode(null);
    setLayoutVersion((v) => v + 1);
  }, []);

  if (!crimeData) {
    return <LoadingSpinner message="Loading network data..." />;
  }

  const displayNode = hoveredNode || selectedNode;

  return (
    <div className="flex flex-col h-full w-full">
      {/* Filter Controls Bar */}
      <div
        className="flex flex-wrap items-center gap-3 px-4 py-2.5 shrink-0"
        style={{
          background: "var(--bg-elevated-1)",
          borderBottom: "1px solid var(--border-default)",
        }}
      >
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            Crime
          </label>
          <Select
            value={crimeTypeFilter}
            onValueChange={(v) => {
              setCrimeTypeFilter(v);
              setSelectedNode(null);
              setLayoutVersion((l) => l + 1);
            }}
          >
            <SelectTrigger className="w-32 sm:w-40 h-7 text-xs bg-[var(--bg-input)] border-[var(--border-default)] text-[var(--text-primary)]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--bg-card)] border-[var(--border-default)]">
              <SelectItem value="all" className="text-[var(--text-primary)]">
                All Types
              </SelectItem>
              {crimeTypes.map((ct) => (
                <SelectItem
                  key={ct}
                  value={ct}
                  className="text-[var(--text-primary)]"
                >
                  {ct}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">
            Gang
          </label>
          <Select
            value={gangFilter}
            onValueChange={(v) => {
              setGangFilter(v);
              setSelectedNode(null);
              setLayoutVersion((l) => l + 1);
            }}
          >
            <SelectTrigger className="w-36 sm:w-48 h-7 text-xs bg-[var(--bg-input)] border-[var(--border-default)] text-[var(--text-primary)]">
              <SelectValue placeholder="All Gangs" />
            </SelectTrigger>
            <SelectContent className="bg-[var(--bg-card)] border-[var(--border-default)]">
              <SelectItem value="all" className="text-[var(--text-primary)]">
                All Gangs
              </SelectItem>
              {gangNames.map((gn) => (
                <SelectItem
                  key={gn}
                  value={gn}
                  className="text-[var(--text-primary)]"
                >
                  {gn}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Node/Link count in toolbar */}
        {simReady && (
          <span className="text-[10px] text-[var(--text-tertiary)] font-medium tabular-nums mr-2">
            <span className="text-[var(--text-secondary)]">
              {layoutNodes.length}
            </span>{" "}
            nodes
            <span className="mx-1 text-[var(--text-muted)]">&middot;</span>
            <span className="text-[var(--text-secondary)]">
              {links.filter((l) => l.type !== "gang_associate").length}
            </span>{" "}
            links
          </span>
        )}

        {/* 3D badge — green themed */}
        {simReady && (
          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#00FF66]/10 text-[#00FF66] border border-[#00FF66]/20 font-mono">
            3D
          </span>
        )}
      </div>

      {/* 3D Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ background: "#05070A" }}
      >
        {/* Three.js Canvas */}
        {simReady && (
          <Canvas
            camera={{ position: [0, 18, 22], fov: 50, near: 0.1, far: 200 }}
            gl={{
              antialias: true,
              alpha: false,
              powerPreference: "high-performance",
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.1,
            }}
            dpr={[1, 2]}
          >
            <Suspense fallback={null}>
              <GraphScene3D
                nodes={layoutNodes}
                links={links}
                selectedNode={selectedNode}
                hoveredNode={hoveredNode}
                onSelectNode={handleSelectNode}
                onHoverNode={handleHoverNode}
                resetFlag={layoutVersion}
              />
            </Suspense>
          </Canvas>
        )}

        {/* Vignette overlay — CSS post-processing feel */}
        <div
          className="absolute inset-0 pointer-events-none z-[5]"
          style={{
            boxShadow: "inset 0 0 120px 40px rgba(5,7,10,0.7), inset 0 0 40px 10px rgba(5,7,10,0.4)",
          }}
        />

        {!simReady && nodes.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <LoadingSpinner message="Computing layout..." />
          </div>
        )}

        {/* ── Floating Toolbar — Top Left ── */}
        {simReady && (
          <div
            className="absolute top-3 left-3 z-10 flex flex-col gap-1 p-1.5"
            style={solidCard}
          >
            <ToolbarButton
              icon={<RotateCcw className="size-4" />}
              tooltip="Reset View"
              onClick={() => {
                setLayoutVersion((v) => v + 1);
                setSelectedNode(null);
              }}
            />
            <ToolbarButton
              icon={<Maximize2 className="size-4" />}
              tooltip="Re-layout Graph"
              onClick={() => {
                setLayoutVersion((v) => v + 1);
                setSelectedNode(null);
              }}
            />
            <div className="w-full h-px bg-[var(--border-default)] my-0.5" />
            <ToolbarButton
              icon={<Box className="size-4" />}
              tooltip="Reset Filters"
              onClick={handleReset}
            />
          </div>
        )}

        {/* ── Legend Overlay — Bottom Left ── */}
        {simReady && (
          <div
            className="absolute bottom-3 left-3 z-10 px-3 py-2.5"
            style={{
              ...solidCard,
              borderRadius: "3px",
            }}
          >
            <p className="text-[9px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-2 font-mono">
              Node Types
            </p>
            <div className="flex flex-col gap-1.5">
              {Object.entries(NODE_TYPE_CONFIG).map(([type, cfg]) => (
                <div key={type} className="flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: cfg.color,
                      boxShadow: `0 0 6px ${cfg.color}66`,
                    }}
                  />
                  <span className="text-[11px] text-[var(--text-secondary)]">
                    {cfg.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-[var(--border-subtle)]">
              <p className="text-[9px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1.5 font-mono">
                Link Types
              </p>
              <div className="flex flex-col gap-1">
                {[
                  { color: "#FF6B6B", label: "Involved In" },
                  { color: "#FFD93D", label: "Member Of" },
                  { color: "#6BCB77", label: "Occurred In" },
                  { color: "#4D96FF", label: "Used Vehicle" },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-0.5 shrink-0 rounded-full"
                      style={{ backgroundColor: l.color }}
                    />
                    <span className="text-[10px] text-[var(--text-tertiary)]">
                      {l.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── Controls Hint — Bottom Right ── */}
        {simReady && (
          <div
            className="absolute bottom-3 right-3 z-10 px-3 py-2"
            style={{
              ...solidCard,
              borderRadius: "2px",
            }}
          >
            <p className="text-[9px] text-[var(--text-muted)] leading-relaxed font-mono">
              LMB: rotate &bull; Scroll: zoom &bull; RMB: pan
              &bull; Click: select
            </p>
          </div>
        )}

        {/* ── Hover Tooltip ── */}
        {displayNode && !selectedNode && (
          <div
            className="absolute z-20 pointer-events-none px-3 py-2.5 max-w-xs"
            style={{
              ...solidCard,
              borderRadius: "3px",
              left: "50%",
              top: "12px",
              transform: "translateX(-50%)",
            }}
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{
                  backgroundColor: displayNode.color,
                  boxShadow: `0 0 8px ${displayNode.color}80`,
                }}
              />
              <span className="text-[12px] font-semibold text-[var(--text-primary)] truncate font-mono">
                {displayNode.name}
              </span>
              <span className="text-[9px] text-[var(--text-tertiary)] uppercase tracking-wider ml-auto font-mono">
                {displayNode.type}
              </span>
            </div>
            {displayNode.type === "accused" && displayNode._accused && (
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-[var(--text-secondary)]">
                  Risk:{" "}
                  <span
                    className={
                      displayNode._accused.risk > 80
                        ? "text-[#00FF66] font-bold"
                        : displayNode._accused.risk > 60
                        ? "text-[#00cc52] font-bold"
                        : "text-[rgba(0,255,102,0.6)] font-bold"
                    }
                  >
                    {displayNode._accused.risk}/100
                  </span>
                </span>
                <span className="text-[var(--text-tertiary)]">&middot;</span>
                <span className="text-[var(--text-secondary)]">
                  Age: {displayNode._accused.age}
                </span>
              </div>
            )}
            {displayNode.type === "fir" && displayNode._fir && (
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-[var(--text-secondary)]">
                  {displayNode._fir.crime_type}
                </span>
                <span className="text-[var(--text-tertiary)]">&middot;</span>
                <span
                  className={
                    displayNode._fir.severity === "critical"
                      ? "text-[#00FF66]"
                      : displayNode._fir.severity === "high"
                      ? "text-[#00cc52]"
                      : "text-[rgba(0,255,102,0.7)]"
                  }
                >
                  {displayNode._fir.severity.toUpperCase()}
                </span>
              </div>
            )}
            {displayNode.type === "gang" && displayNode._gang && (
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-[var(--text-secondary)]">
                  {displayNode._gang.type}
                </span>
                <span className="text-[var(--text-tertiary)]">&middot;</span>
                <span className="text-[var(--text-secondary)]">
                  {displayNode._gang.members.length} members
                </span>
              </div>
            )}
            {displayNode.type === "vehicle" && displayNode._vehicle && (
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-[var(--text-secondary)]">
                  {displayNode._vehicle.make} {displayNode._vehicle.type}
                </span>
                <span className="text-[var(--text-tertiary)]">&middot;</span>
                <span className="text-[var(--text-secondary)]">
                  {displayNode._vehicle.color}
                </span>
              </div>
            )}
            {displayNode.type === "district" && (
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-[var(--text-secondary)]">
                  {displayNode._firCount ?? 0} FIRs
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Right Side Info Panel ── */}
        {selectedNode && (
          <div
            className="absolute top-0 right-0 w-80 max-w-[85vw] h-full z-10 flex flex-col overflow-hidden"
            style={{
              background: "var(--bg-card)",
              borderLeft: "1px solid var(--border-default)",
              boxShadow: "-8px 0 32px rgba(0,0,0,0.4), 0 0 12px rgba(0,255,102,0.04)",
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-default)] shrink-0">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: selectedNode.color,
                    boxShadow: `0 0 8px ${selectedNode.color}80`,
                  }}
                />
                <h2 className="text-xs font-semibold text-white uppercase tracking-wider font-mono">
                  Node Details
                </h2>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--text-tertiary)] hover:text-[#00FF66] hover:bg-[rgba(0,255,102,0.08)] transition-colors"
              >
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-4 py-4">
              {selectedNode.type === "accused" && (
                <AccusedPanel node={selectedNode} />
              )}
              {selectedNode.type === "gang" && (
                <GangPanel node={selectedNode} />
              )}
              {selectedNode.type === "fir" && (
                <FIRPanel node={selectedNode} />
              )}
              {selectedNode.type === "vehicle" && (
                <VehiclePanel node={selectedNode} />
              )}
              {selectedNode.type === "district" && (
                <DistrictPanel node={selectedNode} />
              )}
            </div>
            <div className="px-4 py-2.5 border-t border-[var(--border-default)] shrink-0">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedNode.color }}
                />
                <span className="text-[11px] text-[var(--text-tertiary)] uppercase font-mono">
                  {selectedNode.type}
                </span>
                <span className="text-[11px] text-[#334155]">&middot;</span>
                <span className="text-[11px] text-[var(--text-muted)] truncate font-mono">
                  {selectedNode.id}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Toolbar Button                                                     */
/* ------------------------------------------------------------------ */

function ToolbarButton({
  icon,
  tooltip,
  onClick,
}: {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="w-8 h-8 flex items-center justify-center rounded transition-all duration-150 relative group"
      style={{
        color: hovered ? "#00FF66" : "var(--text-secondary)",
        background: hovered ? "rgba(0,255,102,0.08)" : "transparent",
      }}
      title={tooltip}
    >
      {icon}
      {/* Tooltip */}
      {hovered && (
        <span
          className="absolute left-full ml-2 whitespace-nowrap text-[10px] font-medium px-2 py-1 rounded-md z-50 pointer-events-none font-mono"
          style={{
            background: "var(--bg-card)",
            border: "1px solid rgba(0,255,102,0.2)",
            color: "var(--text-primary)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4), 0 0 8px rgba(0,255,102,0.1)",
          }}
        >
          {tooltip}
        </span>
      )}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  Dynamic wrapper for SSR safety                                     */
/* ------------------------------------------------------------------ */

export default dynamic(() => Promise.resolve(NetworkGraphInner), {
  ssr: false,
});