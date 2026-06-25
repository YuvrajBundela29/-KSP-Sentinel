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
} from "lucide-react";
import type { ViewType } from "@/lib/types";

const COMMANDS: { id: string; label: string; icon: React.ElementType; view: ViewType; shortcut: string }[] = [
  { id: "nav-dashboard", label: "Go to Mission Control", icon: LayoutDashboard, view: "dashboard", shortcut: "Alt+1" },
  { id: "nav-chat", label: "Open AI Copilot", icon: Bot, view: "chat", shortcut: "Alt+2" },
  { id: "nav-network", label: "Open Network Graph", icon: Network, view: "network", shortcut: "Alt+3" },
  { id: "nav-map", label: "Open Crime Map", icon: MapPin, view: "map", shortcut: "Alt+4" },
  { id: "nav-timeline", label: "Open Investigation Timeline", icon: Clock, view: "timeline", shortcut: "Alt+5" },
  { id: "nav-report", label: "Generate Report", icon: FileText, view: "report", shortcut: "Alt+6" },
];

export default function CommandPalette() {
  const commandPaletteOpen = useAppStore((s) => s.commandPaletteOpen);
  const setCommandPaletteOpen = useAppStore((s) => s.setCommandPaletteOpen);
  const setView = useAppStore((s) => s.setView);

  const handleSelect = useCallback((view: ViewType) => {
    setView(view);
    setCommandPaletteOpen(false);
  }, [setView, setCommandPaletteOpen]);

  // Keyboard shortcut: Ctrl+K or Cmd+K to open
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

  // Alt+number shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.altKey && e.key >= "1" && e.key <= "6") {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        if (COMMANDS[idx]) {
          setView(COMMANDS[idx].view);
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
      <div className="fixed inset-0 flex items-start justify-center pt-[20vh]">
        <Command className="cmdk w-full max-w-lg animate-scale-in">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2a3550]">
            <Search className="w-4 h-4 text-[#64748b] flex-shrink-0" />
            <Command.Input
              placeholder="Search commands, navigate, find FIRs..."
              className="cmdk-input flex-1 bg-transparent text-sm outline-none placeholder:text-[#64748b] py-1"
            />
            <kbd className="cmdk-shortcut text-[10px] px-1.5 py-0.5 font-mono">ESC</kbd>
          </div>
          <Command.List className="max-h-72 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-[#64748b]">
              No results found.
            </Command.Empty>
            <Command.Group heading="Navigation" className="px-1 py-1.5">
              {COMMANDS.map((cmd) => (
                <Command.Item
                  key={cmd.id}
                  onSelect={() => handleSelect(cmd.view)}
                  className="cmdk-item flex items-center gap-3 px-3 py-2.5 text-sm cursor-pointer"
                >
                  <cmd.icon className="w-4 h-4 text-[#64748b]" />
                  <span>{cmd.label}</span>
                  <span className="cmdk-shortcut ml-auto text-[10px] px-1.5 py-0.5 font-mono">{cmd.shortcut}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
          <div className="flex items-center gap-4 px-4 py-2 border-t border-[#2a3550] text-[10px] text-[#4a5568]">
            <span><kbd className="font-mono bg-[#2a3550] px-1 rounded">↑↓</kbd> Navigate</span>
            <span><kbd className="font-mono bg-[#2a3550] px-1 rounded">↵</kbd> Select</span>
            <span><kbd className="font-mono bg-[#2a3550] px-1 rounded">Esc</kbd> Close</span>
          </div>
        </Command>
      </div>
    </div>
  );
}