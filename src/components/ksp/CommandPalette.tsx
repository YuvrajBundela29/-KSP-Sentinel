"use client";

import { useEffect, useCallback } from "react";
import { Command } from "cmdk";
import { useAppStore } from "@/lib/store";
import {
  LayoutDashboard,
  Bot,
  Network,
  MapPin,
  Clock,
  FileText,
  Search,
  Database,
  Sheet,
  Fingerprint,
  Users,
  Car,
  Landmark,
  Upload,
  ScrollText,
  Cpu,
  Settings,
  BarChart3,
  TrendingUp,
  GitBranch,
} from "lucide-react";
import type { ViewType } from "@/lib/types";

const MAIN_COMMANDS: { id: string; label: string; icon: React.ElementType; view: ViewType; shortcut: string }[] = [
  { id: "nav-dashboard", label: "Go to Mission Control", icon: LayoutDashboard, view: "dashboard", shortcut: "Alt+1" },
  { id: "nav-chat", label: "Open AI Copilot", icon: Bot, view: "chat", shortcut: "Alt+2" },
  { id: "nav-network", label: "Open Network Graph", icon: Network, view: "network", shortcut: "Alt+3" },
  { id: "nav-map", label: "Open Crime Map", icon: MapPin, view: "map", shortcut: "Alt+4" },
  { id: "nav-timeline", label: "Open Investigation Timeline", icon: Clock, view: "timeline", shortcut: "Alt+5" },
  { id: "nav-report", label: "Generate Report", icon: FileText, view: "report", shortcut: "Alt+6" },
];

const DM_COMMANDS: { id: string; label: string; icon: React.ElementType; view: ViewType }[] = [
  { id: "dm-dashboard", label: "Data Management Dashboard", icon: Database, view: "dm-dashboard" },
  { id: "dm-fir", label: "FIR Management", icon: Sheet, view: "dm-fir" },
  { id: "dm-evidence", label: "Evidence Management", icon: Fingerprint, view: "dm-evidence" },
  { id: "dm-criminals", label: "Criminals Database", icon: Users, view: "dm-criminals" },
  { id: "dm-victims", label: "Victims Registry", icon: Users, view: "dm-victims" },
  { id: "dm-vehicles", label: "Vehicle Records", icon: Car, view: "dm-vehicles" },
  { id: "dm-financial", label: "Financial Records", icon: Landmark, view: "dm-financial" },
  { id: "dm-import", label: "Import Center", icon: Upload, view: "dm-import" },
  { id: "dm-audit", label: "Audit Logs", icon: ScrollText, view: "dm-audit" },
  { id: "dm-ai-queue", label: "AI Processing Queue", icon: Cpu, view: "dm-ai-queue" },
  { id: "dm-settings", label: "Settings", icon: Settings, view: "dm-settings" },
  { id: "dm-sociological", label: "Sociological Insights", icon: BarChart3, view: "dm-sociological" },
  { id: "dm-forecasting", label: "Crime Forecasting", icon: TrendingUp, view: "dm-forecasting" },
  { id: "dm-financial-network", label: "Financial Network", icon: GitBranch, view: "dm-financial-network" },
];

export default function CommandPalette() {
  const commandPaletteOpen = useAppStore((s) => s.commandPaletteOpen);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const setView = useAppStore((s) => s.setView);

  const handleSelect = useCallback((view: ViewType) => {
    setView(view);
    setCommandPaletteOpen(false);
  }, [setView, setCommandPaletteOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === "Escape" && commandPaletteOpen) {
        setCommandPaletteOpen(false);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key >= "1" && e.key <= "6") {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (MAIN_COMMANDS[idx]) {
          setView(MAIN_COMMANDS[idx].view);
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [setView]);

  if (!commandPaletteOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999]">
      <div className="cmdk-overlay fixed inset-0" onClick={() => setCommandPaletteOpen(false)} />
      <div className="fixed inset-0 flex items-start justify-center pt-[15vh]">
        <Command className="cmdk w-full max-w-xl animate-scale-in rounded-xl backdrop-blur-xl shadow-2xl shadow-black/60">
          <div className="flex items-center gap-2 px-4 py-3 border-b">
            <Search className="w-4 h-4 text-[#5a657a] flex-shrink-0" />
            <Command.Input
              placeholder="Search commands, navigate, find FIRs..."
              className="cmdk-input flex-1 bg-transparent text-sm outline-none py-1"
            />
            <kbd className="cmdk-shortcut text-[10px] px-1.5 py-0.5 font-mono">ESC</kbd>
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            <Command.Empty className="cmdk-empty py-6 text-center text-sm">
              No results found.
            </Command.Empty>
            <Command.Group heading="Intelligence" className="px-1 py-1.5">
              {MAIN_COMMANDS.map((cmd) => (
                <Command.Item
                  key={cmd.id}
                  onSelect={() => handleSelect(cmd.view)}
                  className="cmdk-item flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer rounded-lg"
                >
                  <cmd.icon className="w-4 h-4 text-[#5a657a]" />
                  <span>{cmd.label}</span>
                  {cmd.shortcut && (
                    <span className="cmdk-shortcut ml-auto text-[10px] px-1.5 py-0.5 font-mono">{cmd.shortcut}</span>
                  )}
                </Command.Item>
              ))}
            </Command.Group>
            <Command.Group heading="Data Management" className="px-1 py-1.5">
              {DM_COMMANDS.map((cmd) => (
                <Command.Item
                  key={cmd.id}
                  onSelect={() => handleSelect(cmd.view)}
                  className="cmdk-item flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer rounded-lg"
                >
                  <cmd.icon className="w-4 h-4" style={{ color: "#818cf8" }} />
                  <span>{cmd.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
          <div className="flex items-center gap-4 px-4 py-2 border-t text-[10px] text-[#3d4659]">
            <span><kbd className="font-mono px-1 rounded" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>↑↓</kbd> Navigate</span>
            <span><kbd className="font-mono px-1 rounded" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>↵</kbd> Select</span>
            <span><kbd className="font-mono px-1 rounded" style={{ backgroundColor: "rgba(255,255,255,0.04)" }}>Esc</kbd> Close</span>
          </div>
        </Command>
      </div>
    </div>
  );
}