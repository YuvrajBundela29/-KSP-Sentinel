"use client";

import dynamic from "next/dynamic";
import { useState, useMemo, useCallback, useEffect, useRef, Suspense } from "react";
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
import { OrbitControls, Html, Line, Stars } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
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
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const LINK_COLORS: Record<string, string> = {
  involved_in: "#5a657a",
  member_of: "#fbbf24",
  occurred_in: "#818cf8",
  used_vehicle: "#22d3ee",
  gang_associate: "#fbbf24",
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
  { color: string; label: string; icon: string; baseSize: number }
> = {
  accused: { color: "#f87171", label: "Accused", icon: "●", baseSize: 6 },
  gang: { color: "#fbbf24", label: "Gang", icon: "◆", baseSize: 8 },
  fir: { color: "#eab308", label: "FIR", icon: "■", baseSize: 4 },
  vehicle: { color: "#22d3ee", label: "Vehicle", icon: "▲", baseSize: 5 },
  district: { color: "#818cf8", label: "District", icon: "◉", baseSize: 7 },
};

/* ------------------------------------------------------------------ */
/*  Glass Card Styles                                                  */
/* ------------------------------------------------------------------ */

const glassCard: React.CSSProperties = {
  background: "rgba(15, 21, 36, 0.92)",
  backdropFilter: "blur(24px)",
  WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255, 255, 255, 0.06)",
  borderRadius: "12px",
  boxShadow:
    "0 16px 48px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.03)",
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
      <Icon className="size-4 mt-0.5 shrink-0 text-[#8b97b0]" />
      <div className="min-w-0">
        <p className="text-[11px] uppercase tracking-wider text-[#5a657a]">
          {label}
        </p>
        <p className="text-sm text-[#f1f5f9] break-words">{value}</p>
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
        <div className="w-9 h-9 rounded-full bg-[#f87171]/20 flex items-center justify-center">
          <User className="size-4 text-[#f87171]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white leading-tight">
            {a.name}
          </h3>
          <span className="text-[11px] text-[#5a657a] uppercase">
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
                ? "text-[#f87171] font-bold"
                : a.risk > 60
                ? "text-[#fbbf24] font-bold"
                : "text-[#34d399] font-bold"
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
          <p className="text-[11px] uppercase tracking-wider text-[#5a657a] mb-1">
            Linked FIRs
          </p>
          <div className="flex flex-wrap gap-1">
            {firs.map((f) => (
              <span
                key={f.fir_id}
                className="px-1.5 py-0.5 bg-[#fbbf24]/10 text-[#fbbf24] text-[11px] rounded"
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
        <div className="w-9 h-9 rounded-full bg-[#fbbf24]/20 flex items-center justify-center">
          <Shield className="size-4 text-[#fbbf24]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white leading-tight">
            {g.name}
          </h3>
          <span className="text-[11px] text-[#5a657a] uppercase">
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
                  <span className="text-[#5a657a]">({mid})</span>
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
        <div className="w-9 h-9 rounded-full bg-[#fbbf24]/20 flex items-center justify-center">
          <FileText className="size-4 text-[#fbbf24]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white leading-tight">
            {f.fir_id}
          </h3>
          <span className="text-[11px] text-[#5a657a] uppercase">
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
                ? "text-[#f87171]"
                : f.severity === "high"
                ? "text-[#fbbf24]"
                : "text-[#fbbf24]"
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
        <div className="w-9 h-9 rounded-full bg-[#22d3ee]/20 flex items-center justify-center">
          <Car className="size-4 text-[#22d3ee]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white leading-tight">
            {v.reg}
          </h3>
          <span className="text-[11px] text-[#5a657a] uppercase">
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
        <div className="w-9 h-9 rounded-full bg-[#818cf8]/20 flex items-center justify-center">
          <MapPin className="size-4 text-[#818cf8]" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-white leading-tight">
            {d.name}
          </h3>
          <span className="text-[11px] text-[#5a657a] uppercase">
            District
          </span>
        </div>
      </div>
      <InfoRow icon={MapPin} label="Name" value={d.name} />
      <InfoRow
        icon={FileText}
        label="FIR Count"
        value={
          <span className="font-bold text-[#818cf8]">
            {node._firCount ?? 0}
          </span>
        }
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  3D Force Simulation                                                */
/* ------------------------------------------------------------------ */

function simulateForce3D(
  nodes: SimNode[],
  links: SimLink[],
  iterations: number = 400
) {
  const spread = 30;

  for (const n of nodes) {
    n.x = (Math.random() - 0.5) * spread * 2;
    n.y = (Math.random() - 0.5) * spread * 2;
    n.z = (Math.random() - 0.5) * spread * 2;
    n.vx = 0;
    n.vy = 0;
    n.vz = 0;
  }

  const nodeMap = new Map<string, SimNode>();
  for (const n of nodes) nodeMap.set(n.id, n);

  for (let iter = 0; iter < iterations; iter++) {
    const alpha = 1 - iter / iterations;
    const repulsion = 8000;
    const attraction = 0.004;
    const centerForce = 0.008;
    const damping = 0.8;

    // Repulsion between all pairs
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
        a.vx += fx; a.vy += fy; a.vz += fz;
        b.vx -= fx; b.vy -= fy; b.vz -= fz;
      }
    }

    // Attraction along links
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
      s.vx += fx; s.vy += fy; s.vz += fz;
      t.vx -= fx; t.vy -= fy; t.vz -= fz;
    }

    // Center gravity
    for (const n of nodes) {
      n.vx += (0 - n.x) * centerForce * alpha;
      n.vy += (0 - n.y) * centerForce * alpha;
      n.vz += (0 - n.z) * centerForce * alpha;
    }

    // Apply velocity with damping
    for (const n of nodes) {
      n.vx *= damping;
      n.vy *= damping;
      n.vz *= damping;
      n.x += n.vx;
      n.y += n.vy;
      n.z += n.vz;
    }
  }
}

/* ------------------------------------------------------------------ */
/*  3D Scene Components                                                */
/* ------------------------------------------------------------------ */

// Pre-compute node sizes for 3D rendering
function getNodeRadius(node: SimNode): number {
  let r = NODE_TYPE_CONFIG[node.type]?.baseSize ?? 4;
  if (node.type === "accused" && node._accused) {
    r = Math.max(0.4, node._accused.risk / 25);
  }
  if (node.type === "district" && node._firCount) {
    r = Math.max(0.6, Math.min(2.0, 0.5 + node._firCount * 0.15));
  }
  return r * 0.15;
}

// A single node mesh
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
  const [hoveredLocal, setHoveredLocal] = useState(false);
  const radius = getNodeRadius(node);

  useFrame((_state, delta) => {
    if (glowRef.current) {
      const scale = isSelected || isHovered || hoveredLocal
        ? 1.6 + Math.sin(Date.now() * 0.004) * 0.15
        : 1.2;
      glowRef.current.scale.setScalar(scale);
    }
    // Slow rotation for gang and FIR nodes
    if (meshRef.current && (node.type === "gang" || node.type === "fir" || node.type === "vehicle")) {
      meshRef.current.rotation.y += delta * 0.3;
    }
  });

  const baseOpacity = isDimmed ? 0.08 : 1;
  const emissiveIntensity = isSelected || isHovered || hoveredLocal ? 1.5 : 0.6;
  const color = new THREE.Color(node.color);

  const geometry = useMemo(() => {
    switch (node.type) {
      case "accused":
        return <sphereGeometry args={[radius, 24, 24]} />;
      case "gang":
        return <octahedronGeometry args={[radius * 1.3, 0]} />;
      case "fir":
        return <boxGeometry args={[radius * 1.2, radius * 1.2, radius * 1.2]} />;
      case "vehicle":
        return <coneGeometry args={[radius * 0.8, radius * 2, 6]} />;
      case "district":
        return <sphereGeometry args={[radius, 32, 32]} />;
      default:
        return <sphereGeometry args={[radius, 16, 16]} />;
    }
  }, [node.type, radius]);

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
          opacity={node.type === "district" ? baseOpacity * 0.3 : baseOpacity}
          roughness={0.2}
          metalness={0.8}
          toneMapped={false}
        />
      </mesh>

      {/* Glow sphere */}
      {!isDimmed && (isSelected || isHovered || hoveredLocal) && (
        <mesh ref={glowRef}>
          <sphereGeometry args={[radius * 2.5, 16, 16]} />
          <meshBasicMaterial
            color={color}
            transparent
            opacity={0.08}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* Selection ring */}
      {isSelected && !isDimmed && (
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <ringGeometry args={[radius * 1.8, radius * 2.0, 32]} />
          <meshBasicMaterial
            color="#ffffff"
            transparent
            opacity={0.4}
            side={THREE.DoubleSide}
            toneMapped={false}
          />
        </mesh>
      )}

      {/* HTML Label */}
      {!isDimmed && (isSelected || isHovered || hoveredLocal) && (
        <Html
          position={[0, radius * 2.5 + 0.3, 0]}
          center
          style={{ pointerEvents: "none" }}
        >
          <div
            style={{
              background: "rgba(5, 8, 16, 0.92)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "6px",
              padding: "3px 8px",
              whiteSpace: "nowrap",
              fontSize: "11px",
              fontWeight: 600,
              color: "#f1f5f9",
              boxShadow: "0 4px 16px rgba(0,0,0,0.6)",
              backdropFilter: "blur(8px)",
            }}
          >
            {node.name.length > 20 ? node.name.slice(0, 20) + "..." : node.name}
          </div>
        </Html>
      )}
    </group>
  );
}

// A single link line
function LinkLine({
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
  if (!s || !t) return null;

  const isHighlighted =
    selectedNodeId &&
    (link.source === selectedNodeId || link.target === selectedNodeId);
  const isDashed = link.type === "gang_associate";
  const opacity = selectedNodeId ? (isHighlighted ? 0.6 : 0.03) : isDashed ? 0.08 : 0.2;
  const lineWidth = isHighlighted ? 2 : 1;

  if (opacity < 0.02) return null;

  const points: [number, number, number][] = [
    [s.x, s.y, s.z],
    [t.x, t.y, t.z],
  ];

  return (
    <Line
      points={points}
      color={link.color}
      lineWidth={lineWidth}
      transparent
      opacity={opacity}
      dashed={isDashed}
      dashSize={0.3}
      gapSize={0.2}
    />
  );
}

// Camera controller to reset view
function CameraController({
  resetFlag,
}: {
  resetFlag: number;
}) {
  const { camera } = useThree();
  const controlsRef = useRef<any>(null);

  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.reset();
    }
    camera.position.set(0, 20, 40);
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
      zoomSpeed={0.8}
      minDistance={5}
      maxDistance={120}
      maxPolarAngle={Math.PI * 0.85}
    />
  );
}

// The full 3D graph scene
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
      {/* Environment */}
      <color attach="background" args={["#050810"]} />
      <fog attach="fog" args={["#050810", 60, 120]} />

      {/* Lighting */}
      <ambientLight intensity={0.25} />
      <pointLight position={[30, 40, 20]} intensity={0.8} color="#22d3ee" />
      <pointLight position={[-30, -20, -30]} intensity={0.4} color="#818cf8" />
      <pointLight position={[0, 50, 0]} intensity={0.3} color="#fbbf24" />

      {/* Stars background */}
      <Stars
        radius={100}
        depth={60}
        count={2000}
        factor={3}
        saturation={0}
        fade
        speed={0.5}
      />

      {/* Grid helper — subtle 3D grid */}
      <gridHelper
        args={[80, 40, "#0f1628", "#0a0f1c"]}
        position={[0, -12, 0]}
        rotation={[0, 0, 0]}
      />

      {/* Camera */}
      <CameraController resetFlag={resetFlag} />

      {/* Links */}
      {links.map((link, i) => (
        <LinkLine
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
          isDimmed={!!selectedNode && selectedNode.id !== node.id && !connectedNodeIds.has(node.id)}
          isHovered={hoveredNode?.id === node.id}
          onClick={onSelectNode}
          onHover={onHoverNode}
        />
      ))}

      {/* Post-processing — Bloom for the glow effect */}
      <EffectComposer>
        <Bloom
          intensity={1.2}
          luminanceThreshold={0.2}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
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
        color: "#f87171",
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
        color: "#fbbf24",
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
        color: "#eab308",
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
        color: "#22d3ee",
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
        color: "#818cf8",
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
      color: LINK_COLORS[e.type] || "#5a657a",
    }));

    return { nodes: Array.from(nodeMap.values()), links: filteredLinks };
  }, [crimeData, crimeTypeFilter, gangFilter]);

  /* Run 3D force simulation */
  const simNodes = useMemo(() => {
    if (nodes.length === 0) return [];
    const result = nodes.map((n) => ({ ...n }));
    simulateForce3D(result, links, 400);
    return result;
  }, [nodes, links, layoutVersion]);

  const simReady = simNodes.length > 0;

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
      <div className="flex flex-wrap items-center gap-3 px-4 py-2.5 border-b border-[rgba(255,255,255,0.06)] shrink-0 bg-[#080c18]/80">
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-semibold text-[#5a657a] uppercase tracking-wider">
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
            <SelectTrigger className="w-40 h-7 text-xs bg-[rgba(10,15,28,0.8)] border-[rgba(255,255,255,0.06)] text-[#f1f5f9]">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent className="bg-[rgba(15,21,36,0.95)] border-[rgba(255,255,255,0.06)]">
              <SelectItem value="all" className="text-[#f1f5f9]">
                All Types
              </SelectItem>
              {crimeTypes.map((ct) => (
                <SelectItem key={ct} value={ct} className="text-[#f1f5f9]">
                  {ct}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[10px] font-semibold text-[#5a657a] uppercase tracking-wider">
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
            <SelectTrigger className="w-48 h-7 text-xs bg-[rgba(10,15,28,0.8)] border-[rgba(255,255,255,0.06)] text-[#f1f5f9]">
              <SelectValue placeholder="All Gangs" />
            </SelectTrigger>
            <SelectContent className="bg-[rgba(15,21,36,0.95)] border-[rgba(255,255,255,0.06)]">
              <SelectItem value="all" className="text-[#f1f5f9]">
                All Gangs
              </SelectItem>
              {gangNames.map((gn) => (
                <SelectItem key={gn} value={gn} className="text-[#f1f5f9]">
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
          <span className="text-[10px] text-[#5a657a] font-medium tabular-nums mr-2">
            <span className="text-[#8b97b0]">{simNodes.length}</span> nodes
            <span className="mx-1 text-[#3d4659]">&middot;</span>
            <span className="text-[#8b97b0]">{links.length}</span> links
          </span>
        )}

        {/* 3D badge */}
        {simReady && (
          <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-[#22d3ee]/10 text-[#22d3ee] border border-[#22d3ee]/20">
            3D
          </span>
        )}
      </div>

      {/* 3D Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 relative overflow-hidden"
        style={{ background: "#050810" }}
      >
        {/* Three.js Canvas */}
        {simReady && (
          <Canvas
            camera={{ position: [0, 20, 40], fov: 50, near: 0.1, far: 200 }}
            gl={{
              antialias: true,
              alpha: false,
              powerPreference: "high-performance",
              toneMapping: THREE.ACESFilmicToneMapping,
              toneMappingExposure: 1.2,
            }}
            dpr={[1, 2]}
          >
            <Suspense fallback={null}>
              <GraphScene3D
                nodes={simNodes}
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

        {!simReady && nodes.length > 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <LoadingSpinner message="Computing 3D layout..." />
          </div>
        )}

        {/* ── Floating Toolbar — Top Left ── */}
        {simReady && (
          <div
            className="absolute top-3 left-3 z-10 flex flex-col gap-1 p-1.5"
            style={glassCard}
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
            <div className="w-full h-px bg-[rgba(255,255,255,0.06)] my-0.5" />
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
              ...glassCard,
              borderRadius: "10px",
            }}
          >
            <p className="text-[9px] font-semibold text-[#5a657a] uppercase tracking-wider mb-2">
              Node Types
            </p>
            <div className="flex flex-col gap-1.5">
              {Object.entries(NODE_TYPE_CONFIG).map(([type, cfg]) => (
                <div key={type} className="flex items-center gap-2">
                  <span
                    className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                    style={{
                      backgroundColor: cfg.color,
                      boxShadow: `0 0 6px ${cfg.color}50`,
                    }}
                  />
                  <span className="text-[11px] text-[#8b97b0]">
                    {cfg.label}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-[rgba(255,255,255,0.04)]">
              <p className="text-[9px] font-semibold text-[#5a657a] uppercase tracking-wider mb-1.5">
                Link Types
              </p>
              <div className="flex flex-col gap-1">
                {[
                  { color: "#5a657a", label: "Involved In" },
                  { color: "#fbbf24", label: "Member Of" },
                  { color: "#818cf8", label: "Occurred In" },
                  { color: "#22d3ee", label: "Used Vehicle" },
                ].map((l) => (
                  <div key={l.label} className="flex items-center gap-2">
                    <span
                      className="inline-block w-3 h-0.5 shrink-0 rounded-full"
                      style={{ backgroundColor: l.color }}
                    />
                    <span className="text-[10px] text-[#5a657a]">
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
              ...glassCard,
              borderRadius: "8px",
            }}
          >
            <p className="text-[9px] text-[#3d4659] leading-relaxed">
              Left-drag: rotate &bull; Scroll: zoom &bull; Right-drag: pan &bull; Click: select
            </p>
          </div>
        )}

        {/* ── Hover Tooltip (glass-card) ── */}
        {displayNode && !selectedNode && (
          <div
            className="absolute z-20 pointer-events-none px-3 py-2.5 max-w-xs"
            style={{
              ...glassCard,
              borderRadius: "10px",
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
                  boxShadow: `0 0 8px ${displayNode.color}60`,
                }}
              />
              <span className="text-[12px] font-semibold text-[#f1f5f9] truncate">
                {displayNode.name}
              </span>
              <span className="text-[9px] text-[#5a657a] uppercase tracking-wider ml-auto">
                {displayNode.type}
              </span>
            </div>
            {displayNode.type === "accused" && displayNode._accused && (
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-[#8b97b0]">
                  Risk:{" "}
                  <span
                    className={
                      displayNode._accused.risk > 80
                        ? "text-[#f87171] font-bold"
                        : displayNode._accused.risk > 60
                        ? "text-[#fbbf24] font-bold"
                        : "text-[#34d399] font-bold"
                    }
                  >
                    {displayNode._accused.risk}/100
                  </span>
                </span>
                <span className="text-[#5a657a]">&middot;</span>
                <span className="text-[#8b97b0]">
                  Age: {displayNode._accused.age}
                </span>
              </div>
            )}
            {displayNode.type === "fir" && displayNode._fir && (
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-[#8b97b0]">
                  {displayNode._fir.crime_type}
                </span>
                <span className="text-[#5a657a]">&middot;</span>
                <span
                  className={
                    displayNode._fir.severity === "critical"
                      ? "text-[#f87171]"
                      : displayNode._fir.severity === "high"
                      ? "text-[#fbbf24]"
                      : "text-[#fbbf24]"
                  }
                >
                  {displayNode._fir.severity.toUpperCase()}
                </span>
              </div>
            )}
            {displayNode.type === "gang" && displayNode._gang && (
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-[#8b97b0]">
                  {displayNode._gang.type}
                </span>
                <span className="text-[#5a657a]">&middot;</span>
                <span className="text-[#8b97b0]">
                  {displayNode._gang.members.length} members
                </span>
              </div>
            )}
            {displayNode.type === "vehicle" && displayNode._vehicle && (
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-[#8b97b0]">
                  {displayNode._vehicle.make} {displayNode._vehicle.type}
                </span>
                <span className="text-[#5a657a]">&middot;</span>
                <span className="text-[#8b97b0]">
                  {displayNode._vehicle.color}
                </span>
              </div>
            )}
            {displayNode.type === "district" && (
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-[#8b97b0]">
                  {displayNode._firCount ?? 0} FIRs
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Right Side Info Panel ── */}
        {selectedNode && (
          <div
            className="absolute top-0 right-0 w-80 h-full z-10 flex flex-col overflow-hidden"
            style={{
              background: "rgba(7, 10, 20, 0.96)",
              backdropFilter: "blur(24px)",
              WebkitBackdropFilter: "blur(24px)",
              borderLeft: "1px solid rgba(255,255,255,0.06)",
              boxShadow:
                "-8px 0 32px rgba(0,0,0,0.4)",
            }}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-[rgba(255,255,255,0.06)] shrink-0">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{
                    backgroundColor: selectedNode.color,
                    boxShadow: `0 0 8px ${selectedNode.color}60`,
                  }}
                />
                <h2 className="text-xs font-semibold text-white uppercase tracking-wider">
                  Node Details
                </h2>
              </div>
              <button
                onClick={() => setSelectedNode(null)}
                className="w-7 h-7 rounded-md flex items-center justify-center text-[#5a657a] hover:text-white hover:bg-[rgba(34,211,238,0.08)] transition-colors"
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
            <div className="px-4 py-2.5 border-t border-[rgba(255,255,255,0.06)] shrink-0">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: selectedNode.color }}
                />
                <span className="text-[11px] text-[#5a657a] uppercase">
                  {selectedNode.type}
                </span>
                <span className="text-[11px] text-[#334155]">&middot;</span>
                <span className="text-[11px] text-[#3d4659] truncate">
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
      className="w-8 h-8 flex items-center justify-center rounded-lg transition-all duration-150 relative group"
      style={{
        color: hovered ? "#22d3ee" : "#8b97b0",
        background: hovered ? "rgba(34,211,238,0.08)" : "transparent",
      }}
      title={tooltip}
    >
      {icon}
      {/* Tooltip */}
      {hovered && (
        <span
          className="absolute left-full ml-2 whitespace-nowrap text-[10px] font-medium px-2 py-1 rounded-md z-50 pointer-events-none"
          style={{
            background: "rgba(15,21,36,0.95)",
            border: "1px solid rgba(255,255,255,0.06)",
            color: "#f1f5f9",
            boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
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