"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Circle,
  ArrowRight,
  User,
  FileText,
  Users,
  IndianRupee,
  Building2,
  ChevronRight,
  Network,
  RotateCcw,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { loadCrimeData } from "@/lib/data";
import { buildFinancialNetwork } from "@/lib/intelligence";
import type { FinancialNetworkNode, FinancialNetworkEdge } from "@/lib/intelligence";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import LoadingSpinner from "@/components/ksp/LoadingSpinner";
import * as THREE from "three";
import { Canvas, useFrame, useThree, ThreeEvent } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const NODE_COLORS: Record<string, string> = {
  account: "#fbbf24",
  accused: "#f87171",
  fir: "#22d3ee",
  gang: "#a78bfa",
};

const NODE_LABELS: Record<string, string> = {
  account: "Bank Account",
  accused: "Accused",
  fir: "FIR Case",
  gang: "Gang",
};

const EDGE_COLORS: Record<string, string> = {
  transaction: "#34d399",
  account_holder: "#5a657a",
  used_in: "#fbbf24",
  gang_member: "#818cf8",
};

const EDGE_LABELS: Record<string, string> = {
  transaction: "Transaction",
  account_holder: "Account Holder",
  used_in: "Used In Crime",
  gang_member: "Gang Member",
};

const SCALE_2D_TO_3D = 0.02; // 2D pixel coords → 3D world units
const CENTER_X_2D = 500;
const CENTER_Y_2D = 400;

/* ------------------------------------------------------------------ */
/*  SimNode (runtime position added)                                   */
/* ------------------------------------------------------------------ */

interface SimNode extends FinancialNetworkNode {
  x: number;
  y: number;
  radius: number;
}

/* ------------------------------------------------------------------ */
/*  Force simulation (runs fixed iterations, synchronous)              */
/* ------------------------------------------------------------------ */

function runForceSimulation(
  nodes: SimNode[],
  edges: FinancialNetworkEdge[],
  filterTypes: Set<string>,
  iterations: number = 150
): SimNode[] {
  let current = nodes.map((n) => ({ ...n, vx: 0, vy: 0 }));
  const repulsionStrength = 8000;
  const attractionStrength = 0.005;
  const centerPull = 0.01;
  const damping = 0.85;
  const alpha = 0.3;

  for (let iter = 0; iter < iterations; iter++) {
    const visibleNodes = current.filter((n) => filterTypes.has(n.type));
    const visibleEdges = edges.filter((e) => {
      const src = current.find((n) => n.id === e.source);
      const tgt = current.find((n) => n.id === e.target);
      return src && tgt && filterTypes.has(src.type) && filterTypes.has(tgt.type);
    });

    const forces = new Map<string, { fx: number; fy: number }>();
    for (const n of visibleNodes) forces.set(n.id, { fx: 0, fy: 0 });

    // Repulsion
    for (let i = 0; i < visibleNodes.length; i++) {
      for (let j = i + 1; j < visibleNodes.length; j++) {
        const a = visibleNodes[i];
        const b = visibleNodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
        const force = repulsionStrength / (dist * dist);
        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        forces.get(a.id)!.fx += fx;
        forces.get(a.id)!.fy += fy;
        forces.get(b.id)!.fx -= fx;
        forces.get(b.id)!.fy -= fy;
      }
    }

    // Attraction
    for (const edge of visibleEdges) {
      const src = visibleNodes.find((n) => n.id === edge.source);
      const tgt = visibleNodes.find((n) => n.id === edge.target);
      if (!src || !tgt) continue;
      const dx = tgt.x - src.x;
      const dy = tgt.y - src.y;
      const dist = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
      const idealDist = 180;
      const force = attractionStrength * (dist - idealDist);
      const fx = (dx / dist) * force;
      const fy = (dy / dist) * force;
      forces.get(src.id)!.fx += fx;
      forces.get(src.id)!.fy += fy;
      forces.get(tgt.id)!.fx -= fx;
      forces.get(tgt.id)!.fy -= fy;
    }

    // Center gravity
    if (visibleNodes.length > 0) {
      const cx = visibleNodes.reduce((s, n) => s + n.x, 0) / visibleNodes.length;
      const cy = visibleNodes.reduce((s, n) => s + n.y, 0) / visibleNodes.length;
      for (const n of visibleNodes) {
        forces.get(n.id)!.fx += (cx - n.x) * centerPull;
        forces.get(n.id)!.fy += (cy - n.y) * centerPull;
      }
    }

    // Apply
    current = current.map((n) => {
      if (!forces.has(n.id)) return n;
      const { fx, fy } = forces.get(n.id)!;
      const vx = (n.vx + fx * alpha) * damping;
      const vy = (n.vy + fy * alpha) * damping;
      return { ...n, vx, vy, x: n.x + vx, y: n.y + vy };
    });
  }

  // Strip velocity before returning
  return current.map(({ vx, vy, ...rest }) => rest as SimNode);
}

/* ------------------------------------------------------------------ */
/*  3D Sub-components                                                  */
/* ------------------------------------------------------------------ */

function to3D(ox: number, oy: number): [number, number, number] {
  return [
    (ox - CENTER_X_2D) * SCALE_2D_TO_3D,
    0,
    (oy - CENTER_Y_2D) * SCALE_2D_TO_3D,
  ];
}

/* ---------- Particle Field ---------- */

function FinancialParticles() {
  const count = 800;
  const meshRef = useRef<THREE.Points>(null);
  const colorArray = useMemo(() => {
    const palette = [
      new THREE.Color("#fbbf24"),
      new THREE.Color("#f87171"),
      new THREE.Color("#22d3ee"),
      new THREE.Color("#a78bfa"),
      new THREE.Color("#34d399"),
      new THREE.Color("#FF6B6B"),
    ];
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const c = palette[Math.floor(Math.random() * palette.length)];
      arr[i * 3] = c.r;
      arr[i * 3 + 1] = c.g;
      arr[i * 3 + 2] = c.b;
    }
    return arr;
  }, []);

  const positions = useMemo(() => {
    const arr = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (Math.random() - 0.5) * 60;
      arr[i * 3 + 1] = Math.random() * 25 - 3;
      arr[i * 3 + 2] = (Math.random() - 0.5) * 60;
    }
    return arr;
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    meshRef.current.rotation.y = state.clock.elapsedTime * 0.015;
    meshRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.1) * 0.4;
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          args={[positions, 3]}
          count={count}
        />
        <bufferAttribute
          attach="attributes-color"
          args={[colorArray, 3]}
          count={count}
        />
      </bufferGeometry>
      <pointsMaterial
        size={0.12}
        vertexColors
        transparent
        opacity={0.55}
        sizeAttenuation
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

/* ---------- Grid Floor ---------- */

function GridFloor() {
  return (
    <gridHelper
      args={[40, 40, "#1a1f3a", "#111528"]}
      position={[0, -0.5, 0]}
    />
  );
}

/* ---------- Edge Component ---------- */

function FinancialEdge({
  edge,
  nodeMap,
  selectedNodeId,
  hoveredNodeId,
}: {
  edge: FinancialNetworkEdge;
  nodeMap: Map<string, SimNode>;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
}) {
  const lineRef = useRef<THREE.Line>(null);
  const dashOffsetRef = useRef(0);
  const matRef = useRef<THREE.LineDashedMaterial>(null);

  const srcNode = nodeMap.get(edge.source);
  const tgtNode = nodeMap.get(edge.target);
  if (!srcNode || !tgtNode) return null;

  const start = to3D(srcNode.x, srcNode.y);
  const end = to3D(tgtNode.x, tgtNode.y);

  // Quadratic bezier with midpoint raised
  const mid: [number, number, number] = [
    (start[0] + end[0]) / 2,
    0.6,
    (start[2] + end[2]) / 2,
  ];

  const curve = new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(...start),
    new THREE.Vector3(...mid),
    new THREE.Vector3(...end)
  );
  const points = curve.getPoints(32);

  const isHighlighted =
    (hoveredNodeId && (edge.source === hoveredNodeId || edge.target === hoveredNodeId)) ||
    (selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId));

  const isDimmed = (hoveredNodeId || selectedNodeId) && !isHighlighted;

  const color = EDGE_COLORS[edge.type] || "#5a657a";

  useFrame(() => {
    dashOffsetRef.current -= 0.03;
    if (matRef.current) {
      (matRef.current as any).dashOffset = dashOffsetRef.current;
    }
  });

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    return geo;
  }, [start.join(","), end.join(",")]);

  return (
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <primitive ref={lineRef as any} object={(() => {
      const mat = new THREE.LineDashedMaterial({
        color,
        dashSize: 0.3,
        gapSize: 0.15,
        transparent: true,
        opacity: isDimmed ? 0.08 : isHighlighted ? 0.9 : 0.35,
      });
      if (matRef.current === null) matRef.current = mat;
      const line = new THREE.Line(geometry, mat);
      line.computeLineDistances();
      return line;
    })()}
    geometry={geometry}
  />
  );
}

/* ---------- Edge Flow Particle ---------- */
function FinancialEdgeFlowParticle({
  edge,
  nodeMap,
  selectedNodeId,
  hoveredNodeId,
  speed,
  offset,
}: {
  edge: FinancialNetworkEdge;
  nodeMap: Map<string, SimNode>;
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  speed: number;
  offset: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const progressRef = useRef(offset);

  const srcNode = nodeMap.get(edge.source);
  const tgtNode = nodeMap.get(edge.target);
  if (!srcNode || !tgtNode) return null;

  const start = to3D(srcNode.x, srcNode.y);
  const end = to3D(tgtNode.x, tgtNode.y);
  const mid: [number, number, number] = [
    (start[0] + end[0]) / 2,
    0.6,
    (start[2] + end[2]) / 2,
  ];

  const isHighlighted =
    (hoveredNodeId && (edge.source === hoveredNodeId || edge.target === hoveredNodeId)) ||
    (selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId));
  const isDimmed = (hoveredNodeId || selectedNodeId) && !isHighlighted;

  const color = EDGE_COLORS[edge.type] || "#5a657a";

  useFrame((_, delta) => {
    progressRef.current += delta * (isHighlighted ? speed * 1.5 : speed);
    if (progressRef.current > 1) progressRef.current -= 1;
    if (meshRef.current) {
      const t = progressRef.current;
      const inv = 1 - t;
      const px = inv * inv * start[0] + 2 * inv * t * mid[0] + t * t * end[0];
      const py = inv * inv * start[1] + 2 * inv * t * mid[1] + t * t * end[1];
      const pz = inv * inv * start[2] + 2 * inv * t * mid[2] + t * t * end[2];
      meshRef.current.position.set(px, py, pz);
    }
  });

  return (
    <mesh ref={meshRef} frustumCulled={false}>
      <sphereGeometry args={[isHighlighted ? 0.06 : 0.035, 6, 6]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={isDimmed ? 0.02 : isHighlighted ? 0.9 : 0.4}
        toneMapped={false}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ---------- Node Mesh Component ---------- */

function FinancialNodeMesh({
  node,
  isSelected,
  isHovered,
  isDimmed,
  position3D,
  onClick,
  onHover,
}: {
  node: SimNode;
  isSelected: boolean;
  isHovered: boolean;
  isDimmed: boolean;
  position3D: [number, number, number];
  onClick: (node: SimNode) => void;
  onHover: (nodeId: string | null) => void;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const glowRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const color = NODE_COLORS[node.type] || "#5a657a";
  const threeColor = useMemo(() => new THREE.Color(color), [color]);

  const baseRadius = node.radius * SCALE_2D_TO_3D * 0.5;
  const radius = Math.max(0.15, Math.min(baseRadius, 0.8));

  useFrame((state) => {
    // Gang nodes rotate slowly
    if (node.type === "gang" && groupRef.current) {
      groupRef.current.rotation.y += 0.008;
      groupRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.5) * 0.15;
    }
    // Glow pulse
    if (glowRef.current) {
      const scale = 1 + Math.sin(state.clock.elapsedTime * 2) * 0.08;
      glowRef.current.scale.setScalar(scale);
    }
    // Selection ring rotation
    if (ringRef.current && isSelected) {
      ringRef.current.rotation.z += 0.02;
    }
    // Gentle floating
    if (groupRef.current) {
      const baseY = position3D[1];
      groupRef.current.position.y = baseY + Math.sin(state.clock.elapsedTime * 0.7 + position3D[0] * 0.3) * 0.04;
    }
  });

  const opacity = isDimmed ? 0.15 : 1;
  const emissiveIntensity = isDimmed ? 0.05 : isHovered || isSelected ? 0.6 : 0.3;

  const showLabel = node.type === "gang" || isHovered || isSelected;

  const label = node.label.length > 22 ? node.label.slice(0, 20) + "…" : node.label;

  return (
    <group
      ref={groupRef}
      position={position3D}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClick(node);
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        document.body.style.cursor = "pointer";
        onHover(node.id);
      }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        document.body.style.cursor = "default";
        onHover(null);
      }}
    >
      {/* Outer glow sphere */}
      <mesh ref={glowRef}>
        <sphereGeometry args={[radius * 1.8, 16, 16]} />
        <meshBasicMaterial
          color={threeColor}
          transparent
          opacity={isDimmed ? 0.02 : isHovered || isSelected ? 0.18 : 0.07}
          depthWrite={false}
        />
      </mesh>

      {/* Main geometry by type */}
      {node.type === "account" && (
        <mesh>
          <sphereGeometry args={[radius, 24, 24]} />
          <meshStandardMaterial
            color={threeColor}
            emissive={threeColor}
            emissiveIntensity={emissiveIntensity}
            metalness={0.7}
            roughness={0.2}
            transparent
            opacity={opacity}
          />
        </mesh>
      )}
      {(isHovered || isSelected) && !isDimmed && node.type === "account" && (
        <mesh scale={[1.05, 1.05, 1.05]}>
          <sphereGeometry args={[radius, 24, 24]} />
          <meshBasicMaterial color={threeColor} wireframe transparent opacity={0.25} depthWrite={false} toneMapped={false} />
        </mesh>
      )}

      {node.type === "accused" && (
        <mesh>
          <icosahedronGeometry args={[radius, 1]} />
          <meshStandardMaterial
            color={threeColor}
            emissive={threeColor}
            emissiveIntensity={emissiveIntensity}
            metalness={0.7}
            roughness={0.2}
            transparent
            opacity={opacity}
          />
        </mesh>
      )}
      {(isHovered || isSelected) && !isDimmed && node.type === "accused" && (
        <mesh scale={[1.05, 1.05, 1.05]}>
          <icosahedronGeometry args={[radius, 1]} />
          <meshBasicMaterial color={threeColor} wireframe transparent opacity={0.25} depthWrite={false} toneMapped={false} />
        </mesh>
      )}

      {node.type === "fir" && (
        <mesh rotation={[0, Math.PI / 4, 0]}>
          <boxGeometry args={[radius * 1.4, radius * 0.15, radius * 1.0]} />
          <meshStandardMaterial
            color={threeColor}
            emissive={threeColor}
            emissiveIntensity={emissiveIntensity}
            metalness={0.7}
            roughness={0.2}
            transparent
            opacity={opacity}
          />
        </mesh>
      )}
      {(isHovered || isSelected) && !isDimmed && node.type === "fir" && (
        <mesh scale={[1.05, 1.05, 1.05]} rotation={[0, Math.PI / 4, 0]}>
          <boxGeometry args={[radius * 1.4, radius * 0.15, radius * 1.0]} />
          <meshBasicMaterial color={threeColor} wireframe transparent opacity={0.25} depthWrite={false} toneMapped={false} />
        </mesh>
      )}

      {node.type === "gang" && (
        <mesh>
          <octahedronGeometry args={[radius * 1.1, 0]} />
          <meshStandardMaterial
            color={threeColor}
            emissive={threeColor}
            emissiveIntensity={emissiveIntensity}
            metalness={0.7}
            roughness={0.2}
            transparent
            opacity={opacity}
          />
        </mesh>
      )}
      {(isHovered || isSelected) && !isDimmed && node.type === "gang" && (
        <mesh scale={[1.05, 1.05, 1.05]}>
          <octahedronGeometry args={[radius * 1.1, 0]} />
          <meshBasicMaterial color={threeColor} wireframe transparent opacity={0.25} depthWrite={false} toneMapped={false} />
        </mesh>
      )}

      {/* Selection ring */}
      {isSelected && (
        <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[radius * 1.5, 0.02, 8, 48]} />
          <meshBasicMaterial color={threeColor} transparent opacity={0.9} />
        </mesh>
      )}

      {/* HTML Label */}
      {showLabel && (
        <Html
          position={[0, radius + 0.35, 0]}
          center
          style={{ pointerEvents: "none" }}
          zIndexRange={[50, 0]}
        >
          <div
            style={{
              background: "rgba(5, 7, 16, 0.88)",
              border: `1px solid ${color}66`,
              borderRadius: 6,
              padding: "3px 8px",
              whiteSpace: "nowrap",
              fontSize: 11,
              fontWeight: isHovered || isSelected ? 700 : 500,
              color: isDimmed ? "#3d4659" : "#f1f5f9",
              backdropFilter: "blur(8px)",
              boxShadow: `0 0 12px ${color}33`,
            }}
          >
            {label}
          </div>
        </Html>
      )}
    </group>
  );
}

/* ---------- Scene Controller ---------- */

function FinancialScene({
  nodes,
  edges,
  selectedNodeId,
  hoveredNodeId,
  filterTypes,
  onSelect,
  onHover,
}: {
  nodes: SimNode[];
  edges: FinancialNetworkEdge[];
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  filterTypes: Set<string>;
  onSelect: (node: SimNode) => void;
  onHover: (nodeId: string | null) => void;
}) {
  const { camera } = useThree();

  // Set initial camera position on first render
  useEffect(() => {
    camera.position.set(0, 12, 8);
    camera.lookAt(0, 0, 0);
  }, [camera]);

  const nodeMap = useMemo(() => {
    const map = new Map<string, SimNode>();
    for (const n of nodes) map.set(n.id, n);
    return map;
  }, [nodes]);

  const connectedToHover = useMemo(() => {
    if (!hoveredNodeId) return new Set<string>();
    const connected = new Set<string>();
    for (const e of edges) {
      if (e.source === hoveredNodeId) connected.add(e.target);
      if (e.target === hoveredNodeId) connected.add(e.source);
    }
    return connected;
  }, [hoveredNodeId, edges]);

  const connectedToSelected = useMemo(() => {
    if (!selectedNodeId) return new Set<string>();
    const connected = new Set<string>();
    for (const e of edges) {
      if (e.source === selectedNodeId) connected.add(e.target);
      if (e.target === selectedNodeId) connected.add(e.source);
    }
    return connected;
  }, [selectedNodeId, edges]);

  const visibleNodes = useMemo(
    () => nodes.filter((n) => filterTypes.has(n.type)),
    [nodes, filterTypes]
  );

  const visibleEdges = useMemo(
    () =>
      edges.filter((e) => {
        const src = nodeMap.get(e.source);
        const tgt = nodeMap.get(e.target);
        return src && tgt && filterTypes.has(src.type) && filterTypes.has(tgt.type);
      }),
    [edges, nodeMap, filterTypes]
  );

  const handleBackgroundClick = useCallback(() => {
    onSelect(null as unknown as SimNode);
  }, [onSelect]);

  return (
    <>
      {/* Environment */}
      <color attach="background" args={["#050710"]} />
      <fog attach="fog" args={["#050710", 15, 45]} />

      {/* Lights */}
      <ambientLight intensity={0.25} />
      <pointLight position={[5, 8, 5]} color="#fbbf24" intensity={15} distance={30} />
      <pointLight position={[-5, 6, -5]} color="#f87171" intensity={12} distance={30} />
      <pointLight position={[5, 6, -5]} color="#22d3ee" intensity={10} distance={30} />
      <pointLight position={[-5, 8, 5]} color="#a78bfa" intensity={10} distance={30} />
      <pointLight position={[5, 5, 5]} intensity={0.4} color="#fbbf24" distance={30} decay={2} />
      <pointLight position={[-5, 5, -5]} intensity={0.4} color="#22d3ee" distance={30} decay={2} />
      <pointLight position={[5, 5, -5]} intensity={0.3} color="#f87171" distance={30} decay={2} />

      {/* Grid */}
      <GridFloor />

      {/* Particles */}
      <FinancialParticles />

      {/* Clickable background to deselect */}
      <mesh position={[0, -1, 0]} rotation={[-Math.PI / 2, 0, 0]} onClick={handleBackgroundClick} visible={false as boolean}>
        <planeGeometry args={[100, 100]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Edges */}
      {visibleEdges.map((edge, i) => (
        <FinancialEdge
          key={`edge-${i}`}
          edge={edge}
          nodeMap={nodeMap}
          selectedNodeId={selectedNodeId}
          hoveredNodeId={hoveredNodeId}
        />
      ))}

      {/* Edge flow particles */}
      {visibleEdges.map((edge, i) => {
        const srcNode = nodeMap.get(edge.source);
        const tgtNode = nodeMap.get(edge.target);
        if (!srcNode || !tgtNode) return null;
        const isHighlighted =
          (hoveredNodeId && (edge.source === hoveredNodeId || edge.target === hoveredNodeId)) ||
          (selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId));
        const isDimmed = (hoveredNodeId || selectedNodeId) && !isHighlighted;
        if (isDimmed) return null;
        return (
          <React.Fragment key={`efp-${i}`}>
            <FinancialEdgeFlowParticle edge={edge} nodeMap={nodeMap} selectedNodeId={selectedNodeId} hoveredNodeId={hoveredNodeId} speed={0.15} offset={0} />
            <FinancialEdgeFlowParticle edge={edge} nodeMap={nodeMap} selectedNodeId={selectedNodeId} hoveredNodeId={hoveredNodeId} speed={0.1} offset={0.5} />
          </React.Fragment>
        );
      })}

      {/* Nodes */}
      {visibleNodes.map((node) => {
        const isConnectedHover =
          connectedToHover.has(node.id) || node.id === hoveredNodeId;
        const isConnectedSel =
          connectedToSelected.has(node.id) || node.id === selectedNodeId;
        const isDimmed =
          (hoveredNodeId && !isConnectedHover) ||
          (selectedNodeId && !isConnectedSel);

        return (
          <FinancialNodeMesh
            key={node.id}
            node={node}
            isSelected={node.id === selectedNodeId}
            isHovered={node.id === hoveredNodeId}
            isDimmed={!!isDimmed}
            position3D={to3D(node.x, node.y)}
            onClick={onSelect}
            onHover={onHover}
          />
        );
      })}

      {/* Controls */}
      <OrbitControls
        enableDamping
        dampingFactor={0.08}
        autoRotate
        autoRotateSpeed={0.3}
        minDistance={3}
        maxDistance={30}
        maxPolarAngle={Math.PI / 2.1}
        minPolarAngle={0.2}
      />
      <EffectComposer>
        <Bloom
          intensity={1.0}
          luminanceThreshold={0.15}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
        <Vignette darkness={0.35} offset={0.3} />
      </EffectComposer>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component (Inner)                                             */
/* ------------------------------------------------------------------ */

function FinancialNetworkViewInner() {
  const { crimeData, setCrimeData, dataLoading, setDataLoading } = useAppStore();

  // Network state
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [edges, setEdges] = useState<FinancialNetworkEdge[]>([]);

  // Interaction state
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);

  // Filter state
  const [filterTypes, setFilterTypes] = useState<Set<string>>(
    new Set(["account", "accused", "fir", "gang"])
  );

  // Data loading
  const [networkBuilt, setNetworkBuilt] = useState(false);

  /* ---------------------------------------------------------------- */
  /*  Load data & build network                                        */
  /* ---------------------------------------------------------------- */

  useEffect(() => {
    if (!crimeData) {
      setDataLoading(true);
      loadCrimeData()
        .then((data) => {
          setCrimeData(data);
          setDataLoading(false);
        })
        .catch(() => setDataLoading(false));
    }
  }, [crimeData, setCrimeData, setDataLoading]);

  const NODE_BASE_RADIUS = 16;
  const NODE_MAX_RADIUS = 40;

  useEffect(() => {
    if (!crimeData || networkBuilt) return;
    const { nodes, edges } = buildFinancialNetwork(crimeData);

    if (nodes.length === 0) {
      setNetworkBuilt(true);
      return;
    }

    // Initialize positions in a circle + center arrangement
    const cx = 500;
    const cy = 400;
    const radius = Math.min(300, nodes.length * 25);
    const maxValue = Math.max(...nodes.map((nn) => nn.value), 1);

    const initialized: SimNode[] = nodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / nodes.length;
      const r = n.type === "gang" ? 0 : radius * (0.6 + Math.random() * 0.4);
      const nodeRadius =
        n.value > 0
          ? NODE_BASE_RADIUS + (NODE_MAX_RADIUS - NODE_BASE_RADIUS) * (n.value / maxValue)
          : NODE_BASE_RADIUS;
      return {
        ...n,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        radius: nodeRadius,
      };
    });

    // Run force simulation synchronously
    const simulated = runForceSimulation(initialized, edges, filterTypes, 150);

    setSimNodes(simulated);
    setEdges(edges);
    setNetworkBuilt(true);
  }, [crimeData, networkBuilt]);

  // Re-run simulation when filters change
  useEffect(() => {
    if (!networkBuilt || simNodes.length < 2) return;
    const simulated = runForceSimulation(simNodes, edges, filterTypes, 80);
    setSimNodes(simulated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterTypes]);

  /* ---------------------------------------------------------------- */
  /*  Controls                                                         */
  /* ---------------------------------------------------------------- */

  const handleResetLayout = useCallback(() => {
    if (simNodes.length === 0) return;
    const reset = simNodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / simNodes.length;
      const r = n.type === "gang" ? 0 : 200 + Math.random() * 150;
      return { ...n, x: 500 + Math.cos(angle) * r, y: 400 + Math.sin(angle) * r };
    });
    const simulated = runForceSimulation(reset, edges, filterTypes, 150);
    setSimNodes(simulated);
  }, [simNodes, edges, filterTypes]);

  const toggleFilter = (type: string) => {
    setFilterTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        if (next.size > 1) next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

  /* ---------------------------------------------------------------- */
  /*  Computed stats                                                   */
  /* ---------------------------------------------------------------- */

  const stats = useMemo(() => {
    const accounts = simNodes.filter((n) => n.type === "account").length;
    const transactionEdges = edges.filter((e) => e.type === "transaction");
    const totalValue = transactionEdges.reduce((s, e) => s + (e.amount || 0), 0);
    const gangs = simNodes.filter((n) => n.type === "gang").length;
    return { accounts, transactions: transactionEdges.length, totalValue, gangs };
  }, [simNodes, edges]);

  /* ---------------------------------------------------------------- */
  /*  Selected node details                                            */
  /* ---------------------------------------------------------------- */

  const selectedConnections = useMemo(() => {
    if (!selectedNode) return { nodes: [], edges: [] };
    const connNodes: SimNode[] = [];
    const connEdges: FinancialNetworkEdge[] = [];
    for (const e of edges) {
      if (e.source === selectedNode.id) {
        const target = simNodes.find((n) => n.id === e.target);
        if (target) connNodes.push(target);
        connEdges.push(e);
      } else if (e.target === selectedNode.id) {
        const source = simNodes.find((n) => n.id === e.source);
        if (source) connNodes.push(source);
        connEdges.push(e);
      }
    }
    return { nodes: connNodes, edges: connEdges };
  }, [selectedNode, edges, simNodes]);

  /* ---------------------------------------------------------------- */
  /*  3D Interaction handlers                                          */
  /* ---------------------------------------------------------------- */

  const handleNodeSelect = useCallback(
    (node: SimNode) => {
      if (!node || (node as unknown) === null) {
        setSelectedNode(null);
        return;
      }
      if (selectedNode?.id === node.id) {
        setSelectedNode(null);
      } else {
        setSelectedNode(node);
      }
    },
    [selectedNode]
  );

  const handleNodeHover = useCallback((nodeId: string | null) => {
    setHoveredNodeId(nodeId);
  }, []);

  /* ---------------------------------------------------------------- */
  /*  Render                                                           */
  /* ---------------------------------------------------------------- */

  if (dataLoading) return <LoadingSpinner />;

  if (networkBuilt && simNodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div
          className="flex flex-col items-center gap-4 px-8 py-12 max-w-md text-center"
          style={{
            background: "var(--border-subtle)",
            backdropFilter: "blur(24px)",
            border: "1px solid var(--border-default)",
            borderRadius: 16,
          }}
        >
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{ background: "rgba(16,185,129,0.15)" }}
          >
            <Network className="w-8 h-8 text-[#34d399]" />
          </div>
          <h3
            className="text-lg font-semibold"
            style={{ color: "var(--text-primary)" }}
          >
            No Financial Network Data
          </h3>
          <p
            className="text-sm leading-relaxed"
            style={{ color: "var(--text-secondary)" }}
          >
            No financial transactions have been linked to FIR records yet. Once
            bank accounts and transaction amounts are associated with cases, the
            financial network graph will appear here.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <IndianRupee
              className="w-4 h-4"
              style={{ color: "var(--text-tertiary)" }}
            />
            <span className="text-xs" style={{ color: "var(--text-tertiary)" }}>
              Link financial transactions to FIRs to see the network
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full gap-4 p-4 overflow-hidden">
      {/* Left: 3D Canvas + controls */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3 shrink-0">
          {[
            {
              label: "Total Accounts",
              value: stats.accounts,
              icon: Building2,
              color: "var(--warning)",
            },
            {
              label: "Transactions",
              value: stats.transactions,
              icon: ArrowRight,
              color: "var(--success)",
            },
            {
              label: "Total Value",
              value: `₹${stats.totalValue.toLocaleString("en-IN")}`,
              icon: IndianRupee,
              color: "var(--success)",
            },
            {
              label: "Gangs Involved",
              value: stats.gangs,
              icon: Users,
              color: "var(--secondary)",
            },
          ].map((stat) => (
            <div
              key={stat.label}
              className="flex items-center gap-3 px-4 py-3"
              style={{
                background: "var(--border-subtle)",
                backdropFilter: "blur(24px)",
                border: "1px solid var(--border-default)",
                borderRadius: 12,
              }}
            >
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: stat.color + "1a" }}
              >
                <stat.icon
                  className="w-4 h-4"
                  style={{ color: stat.color }}
                />
              </div>
              <div className="min-w-0">
                <p
                  className="text-xs truncate"
                  style={{ color: "var(--text-tertiary)" }}
                >
                  {stat.label}
                </p>
                <p
                  className="text-sm font-bold truncate"
                  style={{ color: "var(--text-primary)" }}
                >
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* 3D Canvas */}
        <div
          className="flex-1 relative rounded-2xl overflow-hidden min-h-0"
          style={{ border: "1px solid var(--border-default)" }}
        >
          <Canvas
            camera={{ position: [0, 12, 8], fov: 50, near: 0.1, far: 100 }}
            gl={{ antialias: true, alpha: false }}
            dpr={[1, 2]}
            style={{ background: "#050710" }}
          >
            <FinancialScene
              nodes={simNodes}
              edges={edges}
              selectedNodeId={selectedNode?.id ?? null}
              hoveredNodeId={hoveredNodeId}
              filterTypes={filterTypes}
              onSelect={handleNodeSelect}
              onHover={handleNodeHover}
            />
          </Canvas>

          {/* Controls overlay */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
            <button
              onClick={handleResetLayout}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
              style={{
                background: "var(--border-default)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
              }}
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>

          {/* Filter + Legend overlay */}
          <div
            className="absolute bottom-3 left-3 flex items-start gap-4 z-10 px-4 py-3"
            style={{
              background: "rgba(10,15,30,0.85)",
              backdropFilter: "blur(16px)",
              border: "1px solid var(--border-default)",
              borderRadius: 12,
            }}
          >
            {/* Filters */}
            <div className="flex flex-col gap-1.5">
              <p
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Filter Nodes
              </p>
              <div className="flex gap-2">
                {(["account", "accused", "fir", "gang"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleFilter(type)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all"
                    style={{
                      background: filterTypes.has(type)
                        ? NODE_COLORS[type] + "22"
                        : "transparent",
                      border: `1px solid ${
                        filterTypes.has(type)
                          ? NODE_COLORS[type] + "66"
                          : "rgba(255,255,255,0.06)"
                      }`,
                      color: filterTypes.has(type)
                        ? NODE_COLORS[type]
                        : "#3d4659",
                      opacity: filterTypes.has(type) ? 1 : 0.5,
                    }}
                  >
                    <Circle
                      className="w-2.5 h-2.5"
                      fill={filterTypes.has(type) ? NODE_COLORS[type] : "transparent"}
                      stroke={NODE_COLORS[type]}
                    />
                    {NODE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            <Separator
              orientation="vertical"
              className="h-auto"
              style={{ background: "var(--border-default)" }}
            />

            {/* Legend */}
            <div className="flex flex-col gap-1.5">
              <p
                className="text-[10px] font-semibold uppercase tracking-wider"
                style={{ color: "var(--text-tertiary)" }}
              >
                Edge Types
              </p>
              <div className="flex gap-3">
                {(["transaction", "account_holder", "used_in", "gang_member"] as const).map(
                  (type) => (
                    <div key={type} className="flex items-center gap-1.5">
                      <div
                        className="w-4 h-0.5 rounded"
                        style={{ background: EDGE_COLORS[type] }}
                      />
                      <span
                        className="text-[10px]"
                        style={{ color: "var(--text-tertiary)" }}
                      >
                        {EDGE_LABELS[type]}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Detail Panel */}
      <AnimatePresence>
        {selectedNode && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden shrink-0"
          >
            <div
              className="h-full flex flex-col"
              style={{
                background: "var(--border-subtle)",
                backdropFilter: "blur(24px)",
                border: "1px solid var(--border-default)",
                borderRadius: 16,
              }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-4 shrink-0"
                style={{ borderBottom: "1px solid var(--border-subtle)" }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: (NODE_COLORS[selectedNode.type] || "#5a657a") + "22",
                    }}
                  >
                    {selectedNode.type === "account" && (
                      <Building2
                        className="w-4 h-4"
                        style={{ color: NODE_COLORS.account }}
                      />
                    )}
                    {selectedNode.type === "accused" && (
                      <User
                        className="w-4 h-4"
                        style={{ color: NODE_COLORS.accused }}
                      />
                    )}
                    {selectedNode.type === "fir" && (
                      <FileText
                        className="w-4 h-4"
                        style={{ color: NODE_COLORS.fir }}
                      />
                    )}
                    {selectedNode.type === "gang" && (
                      <Users
                        className="w-4 h-4"
                        style={{ color: NODE_COLORS.gang }}
                      />
                    )}
                  </div>
                  <div className="min-w-0">
                    <Badge
                      className="text-[10px] px-1.5 py-0"
                      style={{
                        background: (NODE_COLORS[selectedNode.type] || "#5a657a") + "22",
                        color: NODE_COLORS[selectedNode.type],
                        border: `1px solid ${(NODE_COLORS[selectedNode.type] || "#5a657a")}44`,
                      }}
                    >
                      {NODE_LABELS[selectedNode.type]}
                    </Badge>
                    <p
                      className="text-sm font-semibold truncate mt-0.5"
                      style={{ color: "var(--text-primary)" }}
                    >
                      {selectedNode.label}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors"
                  style={{ color: "var(--text-tertiary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#f1f5f9")}
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.color = "#5a657a")
                  }
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <ScrollArea className="flex-1 px-5 py-4">
                {/* Details */}
                <div className="space-y-2.5 mb-5">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-wider"
                    style={{ color: "var(--text-tertiary)" }}
                  >
                    Details
                  </p>
                  {Object.entries(selectedNode.details).map(([key, val]) => (
                    <div
                      key={key}
                      className="flex justify-between items-start gap-2"
                    >
                      <span
                        className="text-xs capitalize shrink-0"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        {key.replace(/_/g, " ")}
                      </span>
                      <span
                        className="text-xs font-medium text-right"
                        style={{ color: "var(--text-primary)" }}
                      >
                        {val}
                      </span>
                    </div>
                  ))}
                  {selectedNode.value > 0 && (
                    <div className="flex justify-between items-start gap-2">
                      <span
                        className="text-xs capitalize shrink-0"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Value
                      </span>
                      <span
                        className="text-xs font-medium"
                        style={{ color: "var(--success)" }}
                      >
                        {selectedNode.type === "account" ||
                        selectedNode.type === "fir"
                          ? `₹${selectedNode.value.toLocaleString("en-IN")}`
                          : selectedNode.value}
                      </span>
                    </div>
                  )}
                </div>

                <Separator
                  className="my-3"
                  style={{ background: "var(--border-default)" }}
                />

                {/* Connected Nodes */}
                {selectedConnections.nodes.length > 0 && (
                  <div className="mb-5">
                    <p
                      className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Connected Nodes ({selectedConnections.nodes.length})
                    </p>
                    <div className="space-y-1.5">
                      {selectedConnections.nodes.map((node) => (
                        <button
                          key={node.id}
                          onClick={() => setSelectedNode(node)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors group"
                          style={{ background: "var(--border-subtle)" }}
                          onMouseEnter={(e) =>
                            (e.currentTarget.style.background =
                              "rgba(255,255,255,0.08)")
                          }
                          onMouseLeave={(e) =>
                            (e.currentTarget.style.background =
                              "rgba(255,255,255,0.03)")
                          }
                        >
                          <Circle
                            className="w-3 h-3 shrink-0"
                            fill={NODE_COLORS[node.type]}
                            stroke={NODE_COLORS[node.type]}
                          />
                          <span
                            className="text-xs font-medium truncate flex-1"
                            style={{ color: "var(--text-primary)" }}
                          >
                            {node.label}
                          </span>
                          <Badge
                            className="text-[9px] px-1.5 py-0 shrink-0"
                            style={{
                              background: NODE_COLORS[node.type] + "22",
                              color: NODE_COLORS[node.type],
                            }}
                          >
                            {NODE_LABELS[node.type]}
                          </Badge>
                          <ChevronRight
                            className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
                            style={{ color: "var(--text-tertiary)" }}
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Connected Edges */}
                {selectedConnections.edges.length > 0 && (
                  <div>
                    <p
                      className="text-[10px] font-semibold uppercase tracking-wider mb-2"
                      style={{ color: "var(--text-tertiary)" }}
                    >
                      Connections ({selectedConnections.edges.length})
                    </p>
                    <div className="space-y-1.5">
                      {selectedConnections.edges.map((edge, i) => {
                        const isOutgoing = edge.source === selectedNode.id;
                        const otherId = isOutgoing ? edge.target : edge.source;
                        const otherNode = simNodes.find(
                          (n) => n.id === otherId
                        );
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                            style={{ background: "var(--border-subtle)" }}
                          >
                            <div
                              className="w-3 h-0.5 rounded shrink-0"
                              style={{ background: EDGE_COLORS[edge.type] }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span
                                  className="text-[9px] uppercase font-medium"
                                  style={{ color: EDGE_COLORS[edge.type] }}
                                >
                                  {edge.type}
                                </span>
                                {edge.amount != null && (
                                  <span
                                    className="text-[10px] font-semibold"
                                    style={{ color: "var(--success)" }}
                                  >
                                    ₹{edge.amount.toLocaleString("en-IN")}
                                  </span>
                                )}
                              </div>
                              {edge.label && (
                                <p
                                  className="text-[10px] truncate mt-0.5"
                                  style={{ color: "var(--text-tertiary)" }}
                                >
                                  {edge.label}
                                </p>
                              )}
                              {otherNode && (
                                <p
                                  className="text-[10px] truncate mt-0.5"
                                  style={{ color: "var(--text-secondary)" }}
                                >
                                  {isOutgoing ? "→" : "←"} {otherNode.label}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Dynamic export (SSR-safe)                                          */
/* ------------------------------------------------------------------ */

export default dynamic(() => Promise.resolve(FinancialNetworkViewInner), {
  ssr: false,
});