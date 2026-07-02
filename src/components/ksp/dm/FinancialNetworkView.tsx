"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  X,
  Circle,
  ArrowRight,
  Wallet,
  User,
  FileText,
  Users,
  IndianRupee,
  Building2,
  ChevronRight,
  Filter,
  Network,
  AlertCircle,
} from "lucide-react";
import { useAppStore } from "@/lib/store";
import { loadCrimeData } from "@/lib/data";
import { buildFinancialNetwork } from "@/lib/intelligence";
import type { FinancialNetworkNode, FinancialNetworkEdge } from "@/lib/intelligence";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import LoadingSpinner from "@/components/ksp/LoadingSpinner";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const NODE_COLORS: Record<string, string> = {
  account: "#fbbf24",
  accused: "#f87171",
  fir: "#22d3ee",
  gang: "#818cf8",
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

const NODE_BASE_RADIUS = 16;
const NODE_MAX_RADIUS = 40;

/* ------------------------------------------------------------------ */
/*  SimNode (runtime position added)                                   */
/* ------------------------------------------------------------------ */

interface SimNode extends FinancialNetworkNode {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function FinancialNetworkView() {
  const { crimeData, setCrimeData, dataLoading, setDataLoading } = useAppStore();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animFrameRef = useRef<number>(0);
  const simRunningRef = useRef(false);

  // Network state
  const [simNodes, setSimNodes] = useState<SimNode[]>([]);
  const [edges, setEdges] = useState<FinancialNetworkEdge[]>([]);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY] = useState(0);

  // Interaction state
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedNode, setSelectedNode] = useState<SimNode | null>(null);
  const [dragNode, setDragNode] = useState<SimNode | null>(null);
  const dragStartRef = useRef<{ mx: number; my: number; nx: number; ny: number } | null>(null);

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

    const initialized: SimNode[] = nodes.map((n, i) => {
      const angle = (2 * Math.PI * i) / nodes.length;
      const r = n.type === "gang" ? 0 : radius * (0.6 + Math.random() * 0.4);
      const maxValue = Math.max(...nodes.map((nn) => nn.value), 1);
      const nodeRadius =
        n.value > 0
          ? NODE_BASE_RADIUS + (NODE_MAX_RADIUS - NODE_BASE_RADIUS) * (n.value / maxValue)
          : NODE_BASE_RADIUS;
      return {
        ...n,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        radius: nodeRadius,
      };
    });

    setSimNodes(initialized);
    setEdges(edges);
    setNetworkBuilt(true);
  }, [crimeData, networkBuilt]);

  /* ---------------------------------------------------------------- */
  /*  Force-directed simulation                                        */
  /* ---------------------------------------------------------------- */

  const runSimulation = useCallback(() => {
    if (simNodes.length < 2) return;
    let nodes = simNodes;
    const alpha = 0.3;
    const repulsionStrength = 8000;
    const attractionStrength = 0.005;
    const centerPull = 0.01;
    const damping = 0.85;

    const step = () => {
      const visibleNodes = nodes.filter((n) => filterTypes.has(n.type));
      const visibleEdges = edges.filter((e) => {
        const src = nodes.find((n) => n.id === e.source);
        const tgt = nodes.find((n) => n.id === e.target);
        return src && tgt && filterTypes.has(src.type) && filterTypes.has(tgt.type);
      });

      const forces = new Map<string, { fx: number; fy: number }>();
      for (const n of visibleNodes) forces.set(n.id, { fx: 0, fy: 0 });

      // Repulsion (Coulomb-like)
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

      // Attraction along edges (Hooke-like)
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
      const cx = visibleNodes.reduce((s, n) => s + n.x, 0) / visibleNodes.length;
      const cy = visibleNodes.reduce((s, n) => s + n.y, 0) / visibleNodes.length;
      for (const n of visibleNodes) {
        forces.get(n.id)!.fx += (cx - n.x) * centerPull;
        forces.get(n.id)!.fy += (cy - n.y) * centerPull;
      }

      // Apply forces
      nodes = nodes.map((n) => {
        if (!forces.has(n.id)) return n;
        if (n.id === dragNode?.id) return n;
        const { fx, fy } = forces.get(n.id)!;
        return {
          ...n,
          vx: (n.vx + fx * alpha) * damping,
          vy: (n.vy + fy * alpha) * damping,
          x: n.x + n.vx,
          y: n.y + n.vy,
        };
      });

      setSimNodes([...nodes]);

      // Check if settled
      let totalVelocity = 0;
      for (const n of nodes) {
        totalVelocity += Math.abs(n.vx) + Math.abs(n.vy);
      }
      if (totalVelocity > 0.5) {
        animFrameRef.current = requestAnimationFrame(step);
      } else {
        simRunningRef.current = false;
      }
    };

    simRunningRef.current = true;
    animFrameRef.current = requestAnimationFrame(step);
  }, [simNodes, edges, filterTypes, dragNode]);

  useEffect(() => {
    if (simNodes.length >= 2 && networkBuilt && !simRunningRef.current) {
      runSimulation();
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [simNodes.length, networkBuilt, runSimulation]);

  /* ---------------------------------------------------------------- */
  /*  Canvas rendering                                                 */
  /* ---------------------------------------------------------------- */

  const getConnectedIds = useCallback(
    (nodeId: string): Set<string> => {
      const connected = new Set<string>();
      for (const e of edges) {
        if (e.source === nodeId) connected.add(e.target);
        if (e.target === nodeId) connected.add(e.source);
      }
      return connected;
    },
    [edges]
  );

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const w = rect.width;
    const h = rect.height;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.fillStyle = "rgba(10,15,28,0.6)";
    ctx.fillRect(0, 0, w, h);

    // Apply zoom + pan
    ctx.save();
    ctx.translate(w / 2 + panX, h / 2 + panY);
    ctx.scale(zoom, zoom);
    ctx.translate(-w / 2, -h / 2);

    const visibleNodes = simNodes.filter((n) => filterTypes.has(n.type));
    const activeHover = hoveredNode;
    const connectedToHover = activeHover ? getConnectedIds(activeHover) : new Set<string>();
    const connectedToSelected = selectedNode ? getConnectedIds(selectedNode.id) : new Set<string>();

    // Draw edges
    for (const edge of edges) {
      const src = visibleNodes.find((n) => n.id === edge.source);
      const tgt = visibleNodes.find((n) => n.id === edge.target);
      if (!src || !tgt) continue;

      const isHighlighted =
        activeHover &&
        (edge.source === activeHover || edge.target === activeHover);
      const isSelectedEdge =
        selectedNode &&
        (edge.source === selectedNode.id || edge.target === selectedNode.id);

      ctx.beginPath();
      ctx.moveTo(src.x, src.y);
      ctx.lineTo(tgt.x, tgt.y);

      if (isHighlighted || isSelectedEdge) {
        ctx.strokeStyle = EDGE_COLORS[edge.type] || "#5a657a";
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 1;
      } else if (activeHover || selectedNode) {
        ctx.strokeStyle = "#1e293b";
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.3;
      } else {
        ctx.strokeStyle = EDGE_COLORS[edge.type] || "#5a657a";
        ctx.lineWidth = 1.2;
        ctx.globalAlpha = 0.5;
      }
      ctx.stroke();
      ctx.globalAlpha = 1;

      // Amount label on transaction edges
      if (edge.type === "transaction" && edge.amount && (isHighlighted || isSelectedEdge || (!activeHover && !selectedNode))) {
        const mx = (src.x + tgt.x) / 2;
        const my = (src.y + tgt.y) / 2;
        ctx.font = "600 11px Inter, system-ui, sans-serif";
        ctx.fillStyle = "#34d399";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const label = `₹${(edge.amount / 1000).toFixed(0)}K`;
        const tw = ctx.measureText(label).width;
        ctx.fillStyle = "rgba(10, 15, 30, 0.85)";
        ctx.fillRect(mx - tw / 2 - 4, my - 8, tw + 8, 16);
        ctx.fillStyle = "#34d399";
        ctx.fillText(label, mx, my);
      }
    }

    // Draw nodes
    for (const node of visibleNodes) {
      const isConnectedToHover = connectedToHover.has(node.id) || node.id === activeHover;
      const isConnectedToSel = connectedToSelected.has(node.id) || node.id === selectedNode?.id;
      const dimmed = (activeHover && !isConnectedToHover) || (selectedNode && !isConnectedToSel);
      const highlighted = isConnectedToHover || isConnectedToSel;

      const color = NODE_COLORS[node.type] || "#5a657a";

      // Glow
      if (highlighted) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius + 8, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(node.x, node.y, node.radius, node.x, node.y, node.radius + 8);
        grad.addColorStop(0, color + "44");
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
      ctx.fillStyle = dimmed ? color + "33" : color + "cc";
      ctx.fill();
      ctx.strokeStyle = dimmed ? color + "22" : color;
      ctx.lineWidth = highlighted ? 3 : 1.5;
      ctx.stroke();

      // Inner lighter fill
      ctx.beginPath();
      ctx.arc(node.x, node.y, node.radius * 0.55, 0, Math.PI * 2);
      ctx.fillStyle = dimmed ? color + "11" : color + "33";
      ctx.fill();

      // Label
      if (!dimmed || highlighted) {
        ctx.font = `${highlighted ? "700" : "500"} 11px Inter, system-ui, sans-serif`;
        ctx.fillStyle = highlighted ? "#f1f5f9" : "#8b97b0";
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        const label = node.label.length > 18 ? node.label.slice(0, 16) + "..." : node.label;
        ctx.fillText(label, node.x, node.y + node.radius + 6);
      }
    }

    ctx.restore();
  }, [simNodes, edges, zoom, panX, panY, hoveredNode, selectedNode, filterTypes, getConnectedIds]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const observer = new ResizeObserver(() => renderCanvas());
    observer.observe(container);
    return () => observer.disconnect();
  }, [renderCanvas]);

  /* ---------------------------------------------------------------- */
  /*  Mouse interaction                                                */
  /* ---------------------------------------------------------------- */

  const canvasToWorld = useCallback(
    (clientX: number, clientY: number) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      const cx = rect.width / 2 + panX;
      const cy = rect.height / 2 + panY;
      const x = (clientX - rect.left - cx) / zoom + rect.width / 2;
      const y = (clientY - rect.top - cy) / zoom + rect.height / 2;
      return { x, y };
    },
    [zoom, panX]
  );

  const findNodeAt = useCallback(
    (worldX: number, worldY: number) => {
      const visible = simNodes.filter((n) => filterTypes.has(n.type));
      // Reverse so top-drawn nodes are picked first
      for (let i = visible.length - 1; i >= 0; i--) {
        const n = visible[i];
        const dx = worldX - n.x;
        const dy = worldY - n.y;
        if (dx * dx + dy * dy <= (n.radius + 4) * (n.radius + 4)) return n;
      }
      return null;
    },
    [simNodes, filterTypes]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const { x, y } = canvasToWorld(e.clientX, e.clientY);

      if (dragNode && dragStartRef.current) {
        const dx = x - dragStartRef.current.mx;
        const dy = y - dragStartRef.current.my;
        setSimNodes((prev) =>
          prev.map((n) =>
            n.id === dragNode.id
              ? { ...n, x: dragStartRef.current!.nx + dx, y: dragStartRef.current!.ny + dy, vx: 0, vy: 0 }
              : n
          )
        );
        return;
      }

      const node = findNodeAt(x, y);
      setHoveredNode(node?.id ?? null);
      if (canvasRef.current) canvasRef.current.style.cursor = node ? "pointer" : "default";
    },
    [canvasToWorld, findNodeAt, dragNode]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const { x, y } = canvasToWorld(e.clientX, e.clientY);
      const node = findNodeAt(x, y);
      if (node) {
        setDragNode(node);
        dragStartRef.current = { mx: x, my: y, nx: node.x, ny: node.y };
      }
    },
    [canvasToWorld, findNodeAt]
  );

  const handleMouseUp = useCallback(() => {
    if (dragNode) {
      // If barely moved, treat as click → select
      const node = simNodes.find((n) => n.id === dragNode.id);
      if (node && selectedNode?.id !== node.id) {
        setSelectedNode(node);
      } else if (node && selectedNode?.id === node.id) {
        setSelectedNode(null);
      }
      setDragNode(null);
      dragStartRef.current = null;
    }
  }, [dragNode, selectedNode, simNodes]);

  /* ---------------------------------------------------------------- */
  /*  Controls                                                         */
  /* ---------------------------------------------------------------- */

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.25, 4));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.25, 0.3));
  const handleResetLayout = () => {
    setZoom(1);
    setPanX(0);
    setSimNodes((prev) =>
      prev.map((n, i) => {
        const angle = (2 * Math.PI * i) / prev.length;
        const r = n.type === "gang" ? 0 : 200 + Math.random() * 150;
        return { ...n, x: 500 + Math.cos(angle) * r, y: 400 + Math.sin(angle) * r, vx: 0, vy: 0 };
      })
    );
    simRunningRef.current = false;
    setTimeout(() => {
      simRunningRef.current = false;
      // Trigger re-sim
      setSimNodes((prev) => [...prev]);
    }, 50);
  };

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
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
            <Network className="w-8 h-8 text-[#34d399]" />
          </div>
          <h3 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>No Financial Network Data</h3>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            No financial transactions have been linked to FIR records yet. Once bank accounts and
            transaction amounts are associated with cases, the financial network graph will appear here.
          </p>
          <div className="flex items-center gap-2 mt-2">
            <IndianRupee className="w-4 h-4" style={{ color: "var(--text-tertiary)" }} />
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
      {/* Left: Canvas + controls */}
      <div className="flex-1 flex flex-col gap-4 min-w-0">
        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-3 shrink-0">
          {[
            { label: "Total Accounts", value: stats.accounts, icon: Building2, color: "var(--warning)" },
            { label: "Transactions", value: stats.transactions, icon: ArrowRight, color: "var(--success)" },
            { label: "Total Value", value: `₹${stats.totalValue.toLocaleString("en-IN")}`, icon: IndianRupee, color: "var(--success)" },
            { label: "Gangs Involved", value: stats.gangs, icon: Users, color: "var(--secondary)" },
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
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <div className="min-w-0">
                <p className="text-xs truncate" style={{ color: "var(--text-tertiary)" }}>
                  {stat.label}
                </p>
                <p className="text-sm font-bold truncate" style={{ color: "var(--text-primary)" }}>
                  {stat.value}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Canvas */}
        <div className="flex-1 relative rounded-2xl overflow-hidden min-h-0" style={{ border: "1px solid var(--border-default)" }}>
          <div ref={containerRef} className="absolute inset-0" style={{ background: "rgba(10,15,28,0.6)" }}>
            <canvas ref={canvasRef} onMouseMove={handleMouseMove} onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} onMouseLeave={() => { setHoveredNode(null); setDragNode(null); dragStartRef.current = null; }} className="absolute inset-0 w-full h-full" />
          </div>

          {/* Controls overlay */}
          <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
            <button onClick={handleZoomIn} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ background: "var(--border-default)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}>
              <ZoomIn className="w-4 h-4" />
            </button>
            <button onClick={handleZoomOut} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ background: "var(--border-default)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}>
              <ZoomOut className="w-4 h-4" />
            </button>
            <button onClick={handleResetLayout} className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors" style={{ background: "var(--border-default)", border: "1px solid var(--border-default)", color: "var(--text-primary)" }}>
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
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                Filter Nodes
              </p>
              <div className="flex gap-2">
                {(["account", "accused", "fir", "gang"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => toggleFilter(type)}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all"
                    style={{
                      background: filterTypes.has(type) ? NODE_COLORS[type] + "22" : "transparent",
                      border: `1px solid ${filterTypes.has(type) ? NODE_COLORS[type] + "66" : "rgba(255,255,255,0.06)"}`,
                      color: filterTypes.has(type) ? NODE_COLORS[type] : "#3d4659",
                      opacity: filterTypes.has(type) ? 1 : 0.5,
                    }}
                  >
                    <Circle className="w-2.5 h-2.5" fill={filterTypes.has(type) ? NODE_COLORS[type] : "transparent"} stroke={NODE_COLORS[type]} />
                    {NODE_LABELS[type]}
                  </button>
                ))}
              </div>
            </div>

            <Separator orientation="vertical" className="h-auto" style={{ background: "var(--border-default)" }} />

            {/* Legend */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                Edge Types
              </p>
              <div className="flex gap-3">
                {(["transaction", "account_holder", "used_in", "gang_member"] as const).map((type) => (
                  <div key={type} className="flex items-center gap-1.5">
                    <div className="w-4 h-0.5 rounded" style={{ background: EDGE_COLORS[type] }} />
                    <span className="text-[10px]" style={{ color: "var(--text-tertiary)" }}>
                      {EDGE_LABELS[type]}
                    </span>
                  </div>
                ))}
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
              <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: (NODE_COLORS[selectedNode.type] || "#5a657a") + "22" }}
                  >
                    {selectedNode.type === "account" && <Building2 className="w-4 h-4" style={{ color: NODE_COLORS.account }} />}
                    {selectedNode.type === "accused" && <User className="w-4 h-4" style={{ color: NODE_COLORS.accused }} />}
                    {selectedNode.type === "fir" && <FileText className="w-4 h-4" style={{ color: NODE_COLORS.fir }} />}
                    {selectedNode.type === "gang" && <Users className="w-4 h-4" style={{ color: NODE_COLORS.gang }} />}
                  </div>
                  <div className="min-w-0">
                    <Badge
                      className="text-[10px] px-1.5 py-0"
                      style={{ background: (NODE_COLORS[selectedNode.type] || "#5a657a") + "22", color: NODE_COLORS[selectedNode.type], border: `1px solid ${(NODE_COLORS[selectedNode.type] || "#5a657a")}44` }}
                    >
                      {NODE_LABELS[selectedNode.type]}
                    </Badge>
                    <p className="text-sm font-semibold truncate mt-0.5" style={{ color: "var(--text-primary)" }}>
                      {selectedNode.label}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="w-7 h-7 rounded-md flex items-center justify-center shrink-0 transition-colors"
                  style={{ color: "var(--text-tertiary)" }}
                  onMouseEnter={(e) => (e.currentTarget.style.color = "#f1f5f9")}
                  onMouseLeave={(e) => (e.currentTarget.style.color = "#5a657a")}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body */}
              <ScrollArea className="flex-1 px-5 py-4">
                {/* Details */}
                <div className="space-y-2.5 mb-5">
                  <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--text-tertiary)" }}>
                    Details
                  </p>
                  {Object.entries(selectedNode.details).map(([key, val]) => (
                    <div key={key} className="flex justify-between items-start gap-2">
                      <span className="text-xs capitalize shrink-0" style={{ color: "var(--text-secondary)" }}>
                        {key.replace(/_/g, " ")}
                      </span>
                      <span className="text-xs font-medium text-right" style={{ color: "var(--text-primary)" }}>
                        {val}
                      </span>
                    </div>
                  ))}
                  {selectedNode.value > 0 && (
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs capitalize shrink-0" style={{ color: "var(--text-secondary)" }}>
                        Value
                      </span>
                      <span className="text-xs font-medium" style={{ color: "var(--success)" }}>
                        {selectedNode.type === "account" || selectedNode.type === "fir"
                          ? `₹${selectedNode.value.toLocaleString("en-IN")}`
                          : selectedNode.value}
                      </span>
                    </div>
                  )}
                </div>

                <Separator className="my-3" style={{ background: "var(--border-default)" }} />

                {/* Connected Nodes */}
                {selectedConnections.nodes.length > 0 && (
                  <div className="mb-5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
                      Connected Nodes ({selectedConnections.nodes.length})
                    </p>
                    <div className="space-y-1.5">
                      {selectedConnections.nodes.map((node) => (
                        <button
                          key={node.id}
                          onClick={() => setSelectedNode(node)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-colors group"
                          style={{ background: "var(--border-subtle)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.08)")}
                          onMouseLeave={(e) => (e.currentTarget.style.background = "rgba(255,255,255,0.03)")}
                        >
                          <Circle
                            className="w-3 h-3 shrink-0"
                            fill={NODE_COLORS[node.type]}
                            stroke={NODE_COLORS[node.type]}
                          />
                          <span className="text-xs font-medium truncate flex-1" style={{ color: "var(--text-primary)" }}>
                            {node.label}
                          </span>
                          <Badge
                            className="text-[9px] px-1.5 py-0 shrink-0"
                            style={{ background: NODE_COLORS[node.type] + "22", color: NODE_COLORS[node.type] }}
                          >
                            {NODE_LABELS[node.type]}
                          </Badge>
                          <ChevronRight className="w-3 h-3 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--text-tertiary)" }} />
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Connected Edges */}
                {selectedConnections.edges.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: "var(--text-tertiary)" }}>
                      Connections ({selectedConnections.edges.length})
                    </p>
                    <div className="space-y-1.5">
                      {selectedConnections.edges.map((edge, i) => {
                        const isOutgoing = edge.source === selectedNode.id;
                        const otherId = isOutgoing ? edge.target : edge.source;
                        const otherNode = simNodes.find((n) => n.id === otherId);
                        return (
                          <div
                            key={i}
                            className="flex items-center gap-2.5 px-3 py-2 rounded-lg"
                            style={{ background: "var(--border-subtle)" }}
                          >
                            <div className="w-3 h-0.5 rounded shrink-0" style={{ background: EDGE_COLORS[edge.type] }} />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[9px] uppercase font-medium" style={{ color: EDGE_COLORS[edge.type] }}>
                                  {edge.type}
                                </span>
                                {edge.amount != null && (
                                  <span className="text-[10px] font-semibold" style={{ color: "var(--success)" }}>
                                    ₹{edge.amount.toLocaleString("en-IN")}
                                  </span>
                                )}
                              </div>
                              {edge.label && (
                                <p className="text-[10px] truncate mt-0.5" style={{ color: "var(--text-tertiary)" }}>
                                  {edge.label}
                                </p>
                              )}
                              {otherNode && (
                                <p className="text-[10px] truncate mt-0.5" style={{ color: "var(--text-secondary)" }}>
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