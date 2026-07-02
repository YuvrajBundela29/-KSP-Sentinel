#!/usr/bin/env python3
"""Generate the complete Phase 1 globals.css for the classified console aesthetic."""

css = r'''@import "tailwindcss";
@import "tw-animate-css";

@custom-variant dark (&:is(.dark *));

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-inter-tight);
  --font-mono: var(--font-ibm-plex-mono);
  --color-sidebar-ring: var(--sidebar-ring);
  --color-sidebar-border: var(--sidebar-border);
  --color-sidebar-accent-foreground: var(--sidebar-accent-foreground);
  --color-sidebar-accent: var(--sidebar-accent);
  --color-sidebar-primary-foreground: var(--sidebar-primary-foreground);
  --color-sidebar-primary: var(--sidebar-primary);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar: var(--sidebar);
  --color-chart-5: var(--chart-5);
  --color-chart-4: var(--chart-4);
  --color-chart-3: var(--chart-3);
  --color-chart-2: var(--chart-2);
  --color-chart-1: var(--chart-1);
  --color-ring: var(--ring);
  --color-input: var(--input);
  --color-border: var(--border);
  --color-destructive: var(--destructive);
  --color-accent-foreground: var(--accent-foreground);
  --color-accent: var(--accent);
  --color-muted-foreground: var(--muted-foreground);
  --color-muted: var(--muted);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-secondary: var(--secondary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary: var(--primary);
  --color-popover-foreground: var(--popover-foreground);
  --color-popover: var(--popover);
  --color-card-foreground: var(--card-foreground);
  --color-card: var(--card);
  --radius-sm: 2px;
  --radius-md: 2px;
  --radius-lg: 3px;
  --radius-xl: 4px;
}

/* ═══════════════════════════════════════════════════════════════════════
   CLASSIFIED CONSOLE DESIGN SYSTEM — KSP Sentinel AI
   Reference: Person of Interest HUD × Palantir Gotham × Mr. Robot terminal
   ═══════════════════════════════════════════════════════════════════════ */

:root {
  --radius: 0.125rem;

  /* ── Background Elevation Layers ─────────────────────────────────── */
  --background: #05070A;
  --bg-elevated-1: #080b10;
  --bg-elevated-2: #0a0e15;
  --bg-elevated-3: #0d1117;
  --bg-card: #0D1117;
  --bg-card-hover: #111820;
  --bg-input: #0a0e14;
  --bg-sidebar: #060910;

  /* ── Foreground / Text ──────────────────────────────────────────── */
  --foreground: rgba(255, 255, 255, 0.87);
  --text-primary: rgba(255, 255, 255, 0.87);
  --text-secondary: rgba(255, 255, 255, 0.55);
  --text-tertiary: rgba(255, 255, 255, 0.35);
  --text-muted: rgba(255, 255, 255, 0.2);

  /* ── Primary Accent: Phosphor Green ─────────────────────────────── */
  --primary: #00FF66;
  --primary-foreground: #05070A;
  --primary-glow: rgba(0, 255, 102, 0.1);
  --primary-glow-strong: rgba(0, 255, 102, 0.2);
  --primary-subtle: rgba(0, 255, 102, 0.05);

  /* ── Alert Accent: Amber ────────────────────────────────────────── */
  --alert: #FF6B00;
  --alert-glow: rgba(255, 107, 0, 0.1);

  /* ── Secondary — repurposed as neutral (no indigo/purple) ───────── */
  --secondary: #1a2030;
  --secondary-foreground: rgba(255, 255, 255, 0.87);
  --secondary-glow: rgba(255, 255, 255, 0.03);

  /* ── Status Colors ──────────────────────────────────────────────── */
  --success: #00cc52;
  --success-glow: rgba(0, 204, 82, 0.1);
  --warning: #FF6B00;
  --warning-glow: rgba(255, 107, 0, 0.1);
  --critical: #ff4444;
  --critical-glow: rgba(255, 68, 68, 0.1);

  /* ── Muted / Neutral ────────────────────────────────────────────── */
  --muted: #0d1117;
  --muted-foreground: rgba(255, 255, 255, 0.55);
  --accent: #111820;
  --accent-foreground: rgba(255, 255, 255, 0.87);

  /* ── Borders — green-tinted ─────────────────────────────────────── */
  --border: rgba(0, 255, 102, 0.15);
  --border-subtle: rgba(0, 255, 102, 0.08);
  --border-default: rgba(0, 255, 102, 0.15);
  --border-strong: rgba(0, 255, 102, 0.25);
  --border-accent: rgba(0, 255, 102, 0.4);

  /* ── Destructive ────────────────────────────────────────────────── */
  --destructive: #ff4444;

  /* ── Card & Popover ─────────────────────────────────────────────── */
  --card: #0D1117;
  --card-foreground: rgba(255, 255, 255, 0.87);
  --popover: #0D1117;
  --popover-foreground: rgba(255, 255, 255, 0.87);

  /* ── Input ──────────────────────────────────────────────────────── */
  --input: #0a0e14;

  /* ── Ring ───────────────────────────────────────────────────────── */
  --ring: #00FF66;

  /* ── Charts ─────────────────────────────────────────────────────── */
  --chart-1: #00FF66;
  --chart-2: #FF6B00;
  --chart-3: #00cc52;
  --chart-4: #ff4444;
  --chart-5: #666666;

  /* ── Sidebar ────────────────────────────────────────────────────── */
  --sidebar: var(--bg-sidebar);
  --sidebar-foreground: rgba(255, 255, 255, 0.7);
  --sidebar-primary: #00FF66;
  --sidebar-primary-foreground: #05070A;
  --sidebar-accent: rgba(0, 255, 102, 0.05);
  --sidebar-accent-foreground: rgba(255, 255, 255, 0.87);
  --sidebar-border: rgba(0, 255, 102, 0.1);
  --sidebar-ring: #00FF66;
}

.dark {
  --background: #05070A;
  --foreground: rgba(255, 255, 255, 0.87);
  --card: #0D1117;
  --card-foreground: rgba(255, 255, 255, 0.87);
  --popover: #0D1117;
  --popover-foreground: rgba(255, 255, 255, 0.87);
  --primary: #00FF66;
  --primary-foreground: #05070A;
  --secondary: #1a2030;
  --secondary-foreground: rgba(255, 255, 255, 0.87);
  --muted: #0d1117;
  --muted-foreground: rgba(255, 255, 255, 0.55);
  --accent: #111820;
  --accent-foreground: rgba(255, 255, 255, 0.87);
  --destructive: #ff4444;
  --border: rgba(0, 255, 102, 0.15);
  --input: #0a0e14;
  --ring: #00FF66;
  --chart-1: #00FF66;
  --chart-2: #FF6B00;
  --chart-3: #00cc52;
  --chart-4: #ff4444;
  --chart-5: #666666;
  --sidebar: var(--bg-sidebar);
  --sidebar-foreground: rgba(255, 255, 255, 0.7);
  --sidebar-primary: #00FF66;
  --sidebar-primary-foreground: #05070A;
  --sidebar-accent: rgba(0, 255, 102, 0.05);
  --sidebar-accent-foreground: rgba(255, 255, 255, 0.87);
  --sidebar-border: rgba(0, 255, 102, 0.1);
  --sidebar-ring: #00FF66;

  --bg-elevated-1: #080b10;
  --bg-elevated-2: #0a0e15;
  --bg-elevated-3: #0d1117;
  --bg-card: #0D1117;
  --bg-card-hover: #111820;
  --bg-input: #0a0e14;
  --bg-sidebar: #060910;
  --text-primary: rgba(255, 255, 255, 0.87);
  --text-secondary: rgba(255, 255, 255, 0.55);
  --text-tertiary: rgba(255, 255, 255, 0.35);
  --text-muted: rgba(255, 255, 255, 0.2);
  --primary-glow: rgba(0, 255, 102, 0.1);
  --primary-glow-strong: rgba(0, 255, 102, 0.2);
  --primary-subtle: rgba(0, 255, 102, 0.05);
  --secondary-glow: rgba(255, 255, 255, 0.03);
  --alert: #FF6B00;
  --alert-glow: rgba(255, 107, 0, 0.1);
  --success: #00cc52;
  --success-glow: rgba(0, 204, 82, 0.1);
  --warning: #FF6B00;
  --warning-glow: rgba(255, 107, 0, 0.1);
  --critical: #ff4444;
  --critical-glow: rgba(255, 68, 68, 0.1);
  --border-subtle: rgba(0, 255, 102, 0.08);
  --border-default: rgba(0, 255, 102, 0.15);
  --border-strong: rgba(0, 255, 102, 0.25);
  --border-accent: rgba(0, 255, 102, 0.4);

  color-scheme: dark;
}

/* ═══════════════════════════════════════════════════════════════════════
   LIGHT THEME — Minimal, functional
   ═══════════════════════════════════════════════════════════════════════ */

.light {
  --background: #f8fafc;
  --foreground: #0f172a;
  --card: #ffffff;
  --card-foreground: #0f172a;
  --popover: #ffffff;
  --popover-foreground: #0f172a;
  --primary: #059669;
  --primary-foreground: #ffffff;
  --secondary: #e2e8f0;
  --secondary-foreground: #0f172a;
  --muted: #f1f5f9;
  --muted-foreground: #64748b;
  --accent: #f1f5f9;
  --accent-foreground: #0c4a6e;
  --destructive: #ef4444;
  --border: rgba(0, 0, 0, 0.12);
  --input: #e2e8f0;
  --ring: #059669;
  --chart-1: #059669;
  --chart-2: #d97706;
  --chart-3: #047857;
  --chart-4: #ef4444;
  --chart-5: #888888;
  --sidebar: #ffffff;
  --sidebar-foreground: #334155;
  --sidebar-primary: #059669;
  --sidebar-primary-foreground: #ffffff;
  --sidebar-accent: rgba(5, 150, 105, 0.08);
  --sidebar-accent-foreground: #0f172a;
  --sidebar-border: rgba(0, 0, 0, 0.06);
  --sidebar-ring: #059669;
  --bg-elevated-1: #f1f5f9;
  --bg-elevated-2: #e2e8f0;
  --bg-elevated-3: #cbd5e1;
  --bg-card: #ffffff;
  --bg-card-hover: #f8fafc;
  --bg-input: #f1f5f9;
  --bg-sidebar: #ffffff;
  --text-primary: #0f172a;
  --text-secondary: #475569;
  --text-tertiary: #94a3b8;
  --text-muted: #cbd5e1;
  --primary-glow: rgba(5, 150, 105, 0.1);
  --primary-glow-strong: rgba(5, 150, 105, 0.2);
  --primary-subtle: rgba(5, 150, 105, 0.05);
  --secondary-glow: rgba(0, 0, 0, 0.03);
  --success: #059669;
  --success-glow: rgba(5, 150, 105, 0.1);
  --warning: #d97706;
  --warning-glow: rgba(217, 119, 6, 0.1);
  --critical: #ef4444;
  --critical-glow: rgba(239, 68, 68, 0.1);
  --border-subtle: rgba(0, 0, 0, 0.06);
  --border-default: rgba(0, 0, 0, 0.1);
  --border-strong: rgba(0, 0, 0, 0.15);
  --border-accent: rgba(5, 150, 105, 0.2);
  color-scheme: light;
}

/* ═══════════════════════════════════════════════════════════════════════
   OLD COLOR REMAPPING — Maps legacy hardcoded hex values to new system
   Components use Tailwind arbitrary values from the old design.
   These overrides remap them without touching component logic.
   ═══════════════════════════════════════════════════════════════════════ */

/* ── Primary heading text ─────────────────────────────────────────── */
.text-\[\#f1f5f9\] { color: rgba(255, 255, 255, 0.87) !important; }
.text-\[\#e8edf5\] { color: rgba(255, 255, 255, 0.87) !important; }
.text-white { color: rgba(255, 255, 255, 0.87) !important; }

/* ── Secondary body text ─────────────────────────────────────────── */
.text-\[\#8b97b0\] { color: rgba(255, 255, 255, 0.55) !important; }

/* ── Tertiary / hint text ────────────────────────────────────────── */
.text-\[\#5a657a\] { color: rgba(255, 255, 255, 0.35) !important; }

/* ── Muted / placeholder text ────────────────────────────────────── */
.text-\[\#3d4659\] { color: rgba(255, 255, 255, 0.2) !important; }
.text-\[\#334155\] { color: rgba(255, 255, 255, 0.35) !important; }

/* ── Accent: Cyan → Phosphor Green ───────────────────────────────── */
.text-\[\#22d3ee\] { color: #00FF66 !important; }
.text-\[\#06b6d4\] { color: #00FF66 !important; }
.bg-\[\#22d3ee\]\/10 { background-color: rgba(0, 255, 102, 0.1) !important; }
.bg-\[\#22d3ee\]\/15 { background-color: rgba(0, 255, 102, 0.12) !important; }
.bg-\[\#22d3ee\]\/20 { background-color: rgba(0, 255, 102, 0.15) !important; }
.border-\[\#22d3ee\]\/20,
.border-\[rgba\(34\,211\,238\,0\.2\)\] { border-color: rgba(0, 255, 102, 0.2) !important; }
.bg-\[rgba\(34\,211\,238\,0\.15\)\] { background-color: rgba(0, 255, 102, 0.12) !important; }

/* ── Accent: Indigo → Phosphor Green (or neutral) ────────────────── */
.text-\[\#818cf8\] { color: #00FF66 !important; }
.bg-\[\#818cf8\]\/10 { background-color: rgba(0, 255, 102, 0.1) !important; }
.bg-\[\#818cf8\]\/15 { background-color: rgba(0, 255, 102, 0.12) !important; }
.border-\[rgba\(129\,140\,248\,0\.15\)\] { border-color: rgba(0, 255, 102, 0.12) !important; }
.bg-\[rgba\(129\,140\,248\,0\.08\)\] { background-color: rgba(0, 255, 102, 0.05) !important; }
.bg-\[rgba\(129\,140\,248\,0\.15\)\] { background-color: rgba(0, 255, 102, 0.12) !important; }

/* ── Accent: Emerald → Darker Green ──────────────────────────────── */
.text-\[\#34d399\] { color: #00cc52 !important; }
.bg-\[\#34d399\]\/10 { background-color: rgba(0, 204, 82, 0.1) !important; }
.bg-\[\#34d399\]\/15 { background-color: rgba(0, 204, 82, 0.12) !important; }
.bg-\[\#34d399\]\/20 { background-color: rgba(0, 204, 82, 0.15) !important; }
.bg-\[rgba\(52\,211\,153\,0\.08\)\] { background-color: rgba(0, 204, 82, 0.06) !important; }
.bg-\[rgba\(52\,211\,153\,0\.15\)\] { background-color: rgba(0, 204, 82, 0.12) !important; }

/* ── Accent: Amber/Yellow → Alert Amber ──────────────────────────── */
.text-\[\#fbbf24\] { color: #FF6B00 !important; }
.bg-\[\#fbbf24\]\/10 { background-color: rgba(255, 107, 0, 0.1) !important; }
.bg-\[\#fbbf24\]\/15 { background-color: rgba(255, 107, 0, 0.12) !important; }
.bg-\[\#fbbf24\]\/20 { background-color: rgba(255, 107, 0, 0.15) !important; }
.bg-\[rgba\(251\,191\,36\,0\.08\)\] { background-color: rgba(255, 107, 0, 0.06) !important; }

/* ── Accent: Red → Critical Red ──────────────────────────────────── */
.text-\[\#f87171\] { color: #ff4444 !important; }
.bg-\[\#f87171\]\/10 { background-color: rgba(255, 68, 68, 0.1) !important; }
.bg-\[\#f87171\]\/15 { background-color: rgba(255, 68, 68, 0.12) !important; }
.bg-\[\#f87171\]\/20 { background-color: rgba(255, 68, 68, 0.15) !important; }
.bg-\[rgba\(248\,113\,113\,0\.08\)\] { background-color: rgba(255, 68, 68, 0.06) !important; }

/* ── Accent: Pink → Red ──────────────────────────────────────────── */
.text-\[\#ec4899\] { color: #ff4444 !important; }
.bg-\[\#ec4899\]\/10 { background-color: rgba(255, 68, 68, 0.1) !important; }
.bg-\[\#ec4899\]\/20 { background-color: rgba(255, 68, 68, 0.15) !important; }
.bg-\[rgba\(236\,72\,153\,0\.08\)\] { background-color: rgba(255, 68, 68, 0.06) !important; }

/* ── Accent: Lime → Green ────────────────────────────────────────── */
.text-\[\#84cc16\] { color: #00cc52 !important; }

/* ── Sidebar text ────────────────────────────────────────────────── */
.text-\[\#c8d0e0\] { color: rgba(255, 255, 255, 0.7) !important; }

/* ── Background tints (white-on-dark) → near-invisible green tint ─ */
.bg-white\/5,
.bg-white\/\[0\.03\],
.bg-white\/\[0\.04\],
.bg-white\/\[0\.05\],
.bg-white\/\[0\.06\],
.bg-white\/\[0\.08\],
.bg-white\/\[0\.1\],
.bg-white\/10,
.bg-white\/\[0\.15\],
.bg-white\/\[0\.2\],
.bg-white\/20 {
  background-color: rgba(0, 255, 102, 0.03) !important;
}
.hover\:bg-white\/5:hover,
.hover\:bg-white\/\[0\.05\]:hover,
.hover\:bg-white\/\[0\.06\]:hover,
.hover\:bg-white\/\[0\.08\]:hover,
.hover\:bg-white\/10:hover,
.hover\:bg-white\/\[0\.1\]:hover {
  background-color: rgba(0, 255, 102, 0.06) !important;
}
.data-\[state\=active\]\:bg-white\/10,
.data-\[state\=active\]\:bg-white\/\[0\.1\] { background-color: rgba(0, 255, 102, 0.06) !important; }
.data-\[state\=active\]\:text-\[\#f1f5f9\] { color: #00FF66 !important; }
.data-\[state\=active\]\:text-\[\#8b97b0\] { color: #00FF66 !important; }

/* ── Border tints ────────────────────────────────────────────────── */
.border-white\/5,
.border-white\/\[0\.05\],
.border-white\/\[0\.06\],
.border-white\/\[0\.08\],
.border-white\/\[0\.1\],
.border-white\/10,
.border-white\/\[0\.12\],
.border-white\/\[0\.15\],
.border-white\/\[0\.2\] {
  border-color: rgba(0, 255, 102, 0.12) !important;
}

/* ── Separator backgrounds ───────────────────────────────────────── */
.bg-white\/\[0\.12\] { background-color: rgba(0, 255, 102, 0.06) !important; }

/* ── Inline bg tints ─────────────────────────────────────────────── */
.bg-\[\#34d399\]\/15 { background-color: rgba(0, 204, 82, 0.12) !important; }
.bg-\[\#fbbf24\]\/15 { background-color: rgba(255, 107, 0, 0.12) !important; }
.bg-\[\#f87171\]\/15 { background-color: rgba(255, 68, 68, 0.12) !important; }

/* ── Notification panel bg ──────────────────────────────────────── */
.whilehover\:bg-white\/\[0\.02\]:hover { background-color: rgba(0, 255, 102, 0.03) !important; }

/* ── Focus ring ──────────────────────────────────────────────────── */
:focus-visible {
  outline: 1.5px solid rgba(0, 255, 102, 0.5);
  outline-offset: 1px;
  border-radius: 2px;
}

/* ── Selection ───────────────────────────────────────────────────── */
::selection {
  background: rgba(0, 255, 102, 0.2);
  color: rgba(255, 255, 255, 0.95);
}

/* ═══════════════════════════════════════════════════════════════════════
   LIGHT MODE OVERRIDES
   ═══════════════════════════════════════════════════════════════════════ */

.light .text-\[\#f1f5f9\] { color: #0f172a !important; }
.light .text-\[\#e8edf5\] { color: #0f172a !important; }
.light .text-\[\#8b97b0\] { color: #475569 !important; }
.light .text-\[\#5a657a\] { color: #94a3b8 !important; }
.light .text-\[\#3d4659\] { color: #cbd5e1 !important; }
.light .text-\[\#22d3ee\] { color: #059669 !important; }
.light .text-\[\#818cf8\] { color: #059669 !important; }
.light .text-\[\#34d399\] { color: #047857 !important; }
.light .text-\[\#fbbf24\] { color: #d97706 !important; }
.light .text-\[\#f87171\] { color: #ef4444 !important; }
.light .text-\[\#ec4899\] { color: #db2777 !important; }
.light .text-\[\#84cc16\] { color: #65a30d !important; }
.light .text-\[\#06b6d4\] { color: #059669 !important; }
.light .text-white { color: #0f172a !important; }

.light .bg-\[\#22d3ee\]\/10 { background-color: rgba(5, 150, 105, 0.08) !important; }
.light .bg-\[\#22d3ee\]\/20 { background-color: rgba(5, 150, 105, 0.15) !important; }
.light .bg-\[\#818cf8\]\/10 { background-color: rgba(5, 150, 105, 0.08) !important; }
.light .bg-\[\#818cf8\]\/15 { background-color: rgba(5, 150, 105, 0.1) !important; }
.light .bg-\[\#34d399\]\/10 { background-color: rgba(5, 150, 105, 0.08) !important; }
.light .bg-\[\#34d399\]\/20 { background-color: rgba(5, 150, 105, 0.15) !important; }
.light .bg-\[\#fbbf24\]\/10 { background-color: rgba(217, 119, 6, 0.08) !important; }
.light .bg-\[\#fbbf24\]\/20 { background-color: rgba(217, 119, 6, 0.15) !important; }
.light .bg-\[\#f87171\]\/10 { background-color: rgba(239, 68, 68, 0.08) !important; }
.light .bg-\[\#f87171\]\/20 { background-color: rgba(239, 68, 68, 0.15) !important; }
.light .bg-\[\#ec4899\]\/10 { background-color: rgba(219, 39, 119, 0.08) !important; }
.light .bg-\[\#ec4899\]\/20 { background-color: rgba(219, 39, 119, 0.15) !important; }

.light .bg-\[\#22d3ee\]\/15 { background-color: rgba(5, 150, 105, 0.1) !important; }
.light .bg-\[\#34d399\]\/15 { background-color: rgba(5, 150, 105, 0.1) !important; }
.light .bg-\[\#fbbf24\]\/15 { background-color: rgba(217, 119, 6, 0.1) !important; }
.light .bg-\[\#f87171\]\/15 { background-color: rgba(239, 68, 68, 0.1) !important; }
.light .bg-\[rgba\(34\,211\,238\,0\.15\)\] { background-color: rgba(5, 150, 105, 0.1) !important; }
.light .bg-\[rgba\(129\,140\,248\,0\.08\)\] { background-color: rgba(5, 150, 105, 0.06) !important; }
.light .bg-\[rgba\(129\,140\,248\,0\.15\)\] { background-color: rgba(5, 150, 105, 0.1) !important; }
.light .bg-\[rgba\(52\,211\,153\,0\.08\)\] { background-color: rgba(5, 150, 105, 0.06) !important; }
.light .bg-\[rgba\(52\,211\,153\,0\.15\)\] { background-color: rgba(5, 150, 105, 0.1) !important; }
.light .bg-\[rgba\(251\,191\,36\,0\.08\)\] { background-color: rgba(217, 119, 6, 0.06) !important; }
.light .bg-\[rgba\(248\,113\,113\,0\.08\)\] { background-color: rgba(239, 68, 68, 0.06) !important; }
.light .bg-\[rgba\(236\,72\,153\,0\.08\)\] { background-color: rgba(219, 39, 119, 0.06) !important; }

.light .border-\[\#22d3ee\]\/20,
.light .border-\[rgba\(34\,211\,238\,0\.2\)\] { border-color: rgba(5, 150, 105, 0.2) !important; }
.light .border-\[rgba\(129\,140\,248\,0\.15\)\] { border-color: rgba(5, 150, 105, 0.15) !important; }
.light .border-\[rgba\(255\,255\,255\,0\.06\)\],
.light .border-\[rgba\(255\,255\,255\,0\.08\)\],
.light .border-\[rgba\(255\,255\,255\,0\.1\)\],
.light .border-\[rgba\(255\,255\,255\,0\.12\)\],
.light .border-\[rgba\(255\,255\,255\,0\.15\)\],
.light .border-\[rgba\(255\,255\,255\,0\.2\)\] { border-color: rgba(0, 0, 0, 0.1) !important; }

.light .bg-white\/5,
.light .bg-white\/\[0\.03\],
.light .bg-white\/\[0\.04\],
.light .bg-white\/\[0\.05\],
.light .bg-white\/\[0\.06\],
.light .bg-white\/\[0\.08\],
.light .bg-white\/\[0\.1\],
.light .bg-white\/10,
.light .bg-white\/\[0\.15\],
.light .bg-white\/\[0\.2\],
.light .bg-white\/20 { background-color: rgba(0, 0, 0, 0.04) !important; }

.light .hover\:bg-white\/5:hover,
.light .hover\:bg-white\/\[0\.05\]:hover,
.light .hover\:bg-white\/10:hover,
.light .hover\:bg-white\/\[0\.1\]:hover,
.light .hover\:bg-white\/\[0\.08\]:hover,
.light .hover\:bg-white\/\[0\.06\]:hover { background-color: rgba(0, 0, 0, 0.06) !important; }

.light .data-\[state\=active\]\:bg-white\/10,
.light .data-\[state\=active\]\:bg-white\/\[0\.1\] { background-color: rgba(0, 0, 0, 0.06) !important; }
.light .data-\[state\=active\]\:text-\[\#f1f5f9\] { color: #059669 !important; }
.light .data-\[state\=active\]\:text-\[\#8b97b0\] { color: #059669 !important; }

.light .border-white\/5,
.light .border-white\/\[0\.05\],
.light .border-white\/\[0\.06\],
.light .border-white\/\[0\.08\],
.light .border-white\/\[0\.1\],
.light .border-white\/10,
.light .border-white\/\[0\.12\],
.light .border-white\/\[0\.15\],
.light .border-white\/\[0\.2\] { border-color: rgba(0, 0, 0, 0.1) !important; }

.light .text-red-300 { color: #dc2626 !important; }
.light .text-amber-300 { color: #d97706 !important; }
.light .text-emerald-300 { color: #047857 !important; }
.light .text-cyan-300 { color: #059669 !important; }
.light .text-pink-300 { color: #db2777 !important; }
.light .text-lime-300 { color: #65a30d !important; }

.light .border-blue-500 { border-color: #059669 !important; }
.light .ring-blue-500\/30 { --tw-ring-color: rgba(5, 150, 105, 0.3) !important; }

.light :focus-visible { outline: 1.5px solid rgba(5, 150, 105, 0.5); }

.light .recharts-cartesian-axis-tick-value { fill: #64748b !important; }
.light .recharts-legend-item-text { fill: #475569 !important; }
.light .recharts-tooltip-label { fill: #0f172a !important; }
.light .recharts-tooltip-item { color: #334155 !important; }

.light .whilehover\:bg-white\/\[0\.02\]:hover { background-color: rgba(0, 0, 0, 0.02) !important; }

.light .ambient-bg::before {
  background: radial-gradient(ellipse at 20% 50%, rgba(5, 150, 105, 0.03) 0%, transparent 50%);
}

.light [style*="box-shadow"] { filter: none; }

.light .gradient-cyan { background: linear-gradient(135deg, rgba(5, 150, 105, 0.06) 0%, transparent 60%); }
.light .gradient-indigo { background: linear-gradient(135deg, rgba(5, 150, 105, 0.04) 0%, transparent 60%); }
.light .gradient-emerald { background: linear-gradient(135deg, rgba(5, 150, 105, 0.06) 0%, transparent 60%); }
.light .gradient-amber { background: linear-gradient(135deg, rgba(217, 119, 6, 0.06) 0%, transparent 60%); }
.light .gradient-rose { background: linear-gradient(135deg, rgba(239, 68, 68, 0.06) 0%, transparent 60%); }

.light .leaflet-container { background: #e2e8f0; }
.light .leaflet-tile-pane { filter: none; }
.light .leaflet-popup-content-wrapper { background: rgba(255, 255, 255, 0.95); color: #0f172a; border: 1px solid rgba(0, 0, 0, 0.1); }
.light .leaflet-popup-tip { background: rgba(255, 255, 255, 0.95); }
.light .leaflet-control-zoom a { background: rgba(255, 255, 255, 0.9) !important; color: #334155 !important; border-color: rgba(0, 0, 0, 0.08) !important; }
.light .leaflet-control-zoom a:hover { background: rgba(5, 150, 105, 0.1) !important; color: #059669 !important; }

.light .glass { background: rgba(255, 255, 255, 0.6); border-color: rgba(0, 0, 0, 0.06); }
.light .glass-strong { background: rgba(255, 255, 255, 0.8); border-color: rgba(0, 0, 0, 0.08); }
.light .glass-card { background: rgba(255, 255, 255, 0.5); border-color: rgba(0, 0, 0, 0.06); }
.light .glass-card:hover { background: rgba(255, 255, 255, 0.7); border-color: rgba(5, 150, 105, 0.15); }

.light .cmdk-overlay { background: rgba(0, 0, 0, 0.3) !important; }
.light .cmdk { background: rgba(255, 255, 255, 0.95) !important; border-color: rgba(0, 0, 0, 0.08) !important; }
.light .cmdk-input { color: #0f172a !important; border-color: rgba(0, 0, 0, 0.06) !important; }
.light .cmdk-input::placeholder { color: #94a3b8 !important; }
.light .cmdk-item { color: #334155 !important; }
.light .cmdk-item[data-selected="true"] { background: rgba(5, 150, 105, 0.08) !important; color: #059669 !important; }
.light .cmdk-group-heading { color: #94a3b8 !important; }
.light .cmdk-separator { background: rgba(0, 0, 0, 0.06) !important; }
.light .cmdk-shortcut { color: #94a3b8 !important; background: rgba(0, 0, 0, 0.04) !important; border-color: rgba(0, 0, 0, 0.06) !important; }

.light ::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.12); }
.light ::-webkit-scrollbar-thumb:hover { background: rgba(5, 150, 105, 0.3); }
.light .skeleton { background: linear-gradient(90deg, rgba(0, 0, 0, 0.04) 25%, rgba(0, 0, 0, 0.08) 50%, rgba(0, 0, 0, 0.04) 75%); }
.light .sidebar-active-glow::before { background: #059669; box-shadow: 0 0 12px rgba(5, 150, 105, 0.3), 0 0 24px rgba(5, 150, 105, 0.1); }
.light .border-glow { border-color: rgba(0, 0, 0, 0.06); box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.8); }
.light .force-graph-tooltip { background: rgba(255, 255, 255, 0.95) !important; color: #0f172a !important; border-color: rgba(0, 0, 0, 0.08) !important; }

/* ═══════════════════════════════════════════════════════════════════════
   RADIX PORTAL — Ensure all dropdowns/popovers are always on top
   ═══════════════════════════════════════════════════════════════════════ */

[data-radix-popper-content-wrapper] {
  z-index: 9999 !important;
  position: fixed !important;
}
[data-radix-portal] {
  z-index: 9999 !important;
}

/* ── SOLID OPAQUE BACKGROUNDS — Near-sharp corners ── */

/* Shared shadow: border glow instead of drop shadows */
/* Dropdown Menu */
[data-slot="dropdown-menu-content"],
[data-slot="dropdown-menu-sub-content"] {
  background: var(--bg-card) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: 1px solid var(--border-default) !important;
  border-radius: 2px !important;
  box-shadow: 0 0 8px rgba(0, 255, 102, 0.08) !important;
  padding: 4px !important;
}
.light [data-slot="dropdown-menu-content"],
.light [data-slot="dropdown-menu-sub-content"] {
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.06) !important;
}

/* Dropdown Menu Items */
[data-slot="dropdown-menu-item"],
[data-slot="dropdown-menu-checkbox-item"],
[data-slot="dropdown-menu-radio-item"],
[data-slot="dropdown-menu-sub-trigger"] {
  border-radius: 2px !important;
  margin: 1px 0 !important;
  padding: 6px 10px !important;
  font-size: 0.8125rem !important;
  transition: background 0.15s ease, color 0.15s ease !important;
}
[data-slot="dropdown-menu-item"]:hover,
[data-slot="dropdown-menu-item"][data-highlighted],
[data-slot="dropdown-menu-checkbox-item"]:hover,
[data-slot="dropdown-menu-checkbox-item"][data-highlighted],
[data-slot="dropdown-menu-radio-item"]:hover,
[data-slot="dropdown-menu-radio-item"][data-highlighted],
[data-slot="dropdown-menu-sub-trigger"]:hover,
[data-slot="dropdown-menu-sub-trigger"][data-highlighted] {
  background: var(--primary-glow) !important;
  color: #00FF66 !important;
}
[data-slot="dropdown-menu-item"][data-variant="destructive"]:hover {
  background: var(--critical-glow) !important;
  color: var(--critical) !important;
}

/* Dropdown Menu Label */
[data-slot="dropdown-menu-label"] {
  padding: 6px 10px 4px !important;
  font-size: 0.6875rem !important;
  font-weight: 600 !important;
  text-transform: uppercase !important;
  letter-spacing: 0.12em !important;
  color: var(--text-muted) !important;
  font-family: var(--font-ibm-plex-mono), monospace;
}

/* Dropdown Menu Separator */
[data-slot="dropdown-menu-separator"] {
  margin: 4px 6px !important;
  height: 1px !important;
  background: var(--border-subtle) !important;
}

/* Popover */
[data-slot="popover-content"] {
  background: var(--bg-card) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: 1px solid var(--border-default) !important;
  border-radius: 2px !important;
  box-shadow: 0 0 8px rgba(0, 255, 102, 0.08) !important;
}
.light [data-slot="popover-content"] {
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.06) !important;
}

/* Context Menu */
[data-slot="context-menu-content"],
[data-slot="context-menu-sub-content"] {
  background: var(--bg-card) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: 1px solid var(--border-default) !important;
  border-radius: 2px !important;
  box-shadow: 0 0 8px rgba(0, 255, 102, 0.08) !important;
  padding: 4px !important;
}
.light [data-slot="context-menu-content"],
.light [data-slot="context-menu-sub-content"] {
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.06) !important;
}

/* Context Menu Items */
[data-slot="context-menu-item"],
[data-slot="context-menu-checkbox-item"],
[data-slot="context-menu-radio-item"] {
  border-radius: 2px !important;
  margin: 1px 0 !important;
  padding: 6px 10px !important;
  transition: background 0.15s ease, color 0.15s ease !important;
}
[data-slot="context-menu-item"]:hover,
[data-slot="context-menu-item"][data-highlighted],
[data-slot="context-menu-checkbox-item"]:hover,
[data-slot="context-menu-checkbox-item"][data-highlighted],
[data-slot="context-menu-radio-item"]:hover,
[data-slot="context-menu-radio-item"][data-highlighted] {
  background: var(--primary-glow) !important;
  color: #00FF66 !important;
}

/* Select Content */
[data-slot="select-content"] {
  background: var(--bg-card) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: 1px solid var(--border-default) !important;
  border-radius: 2px !important;
  box-shadow: 0 0 8px rgba(0, 255, 102, 0.08) !important;
  padding: 4px !important;
}
.light [data-slot="select-content"] {
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.06) !important;
}
[data-slot="select-content"] [data-slot="select-item"] {
  border-radius: 2px;
  margin: 2px 4px;
  padding: 6px 10px;
  font-size: 0.8125rem;
  transition: background 0.15s ease, color 0.15s ease;
}
[data-slot="select-content"] [data-slot="select-item"][data-highlighted] {
  background: var(--primary-glow) !important;
  color: #00FF66 !important;
}
[data-slot="select-content"] [data-slot="select-item"][data-state="checked"] {
  background: var(--primary-glow) !important;
  color: #00FF66 !important;
  font-weight: 500;
}

/* Dialog Content */
[data-slot="dialog-content"] {
  background: var(--bg-card) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: 1px solid var(--border-default) !important;
  border-radius: 3px !important;
  box-shadow: 0 0 12px rgba(0, 255, 102, 0.06) !important;
}
.light [data-slot="dialog-content"] {
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.06) !important;
}

/* Command Palette Dialog */
[data-slot="command"] {
  background: var(--bg-card) !important;
}

/* Tooltip */
[data-slot="tooltip-content"] {
  background: var(--bg-elevated-3) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: 1px solid var(--border-default) !important;
  border-radius: 2px !important;
  box-shadow: 0 0 6px rgba(0, 255, 102, 0.06) !important;
  color: var(--text-primary) !important;
  font-size: 0.75rem !important;
  padding: 4px 8px !important;
}

/* Hover Card */
[data-slot="hover-card-content"] {
  background: var(--bg-card) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: 1px solid var(--border-default) !important;
  border-radius: 2px !important;
  box-shadow: 0 0 8px rgba(0, 255, 102, 0.08) !important;
}

/* Sheet (side panel) */
[data-slot="sheet-content"] {
  background: var(--bg-card) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border-color: var(--border-default) !important;
  box-shadow: 0 0 12px rgba(0, 255, 102, 0.04) !important;
}
[data-slot="sheet-content"][data-side="left"] {
  box-shadow: 0 0 12px rgba(0, 255, 102, 0.04) !important;
}
.light [data-slot="sheet-content"] {
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.06) !important;
}

/* Drawer */
[data-radix-drawer-content] {
  background: var(--bg-card) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

/* Alert Dialog */
[data-slot="alert-dialog-content"] {
  background: var(--bg-card) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
  border: 1px solid var(--border-default) !important;
  border-radius: 3px !important;
  box-shadow: 0 0 12px rgba(0, 255, 102, 0.06) !important;
}
.light [data-slot="alert-dialog-content"] {
  box-shadow: 0 0 12px rgba(0, 0, 0, 0.06) !important;
}

/* ═══════════════════════════════════════════════════════════════════════
   BASE LAYER
   ═══════════════════════════════════════════════════════════════════════ */

@layer base {
  * {
    @apply border-border outline-ring/50;
  }
  html, body {
    overflow: hidden;
    height: 100%;
    margin: 0;
    padding: 0;
  }
  body {
    @apply bg-background text-foreground antialiased;
    font-family: var(--font-inter-tight), "Inter", system-ui, -apple-system, sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  #__next {
    height: 100%;
    overflow: hidden;
  }
}

/* ═══════════════════════════════════════════════════════════════════════
   MONOSPACE DATA CLASS — Apply to all data/IDs/numbers/badges
   ═══════════════════════════════════════════════════════════════════════ */

.font-mono,
.font-mono * {
  font-family: var(--font-ibm-plex-mono), "IBM Plex Mono", "JetBrains Mono", "Fira Code", monospace;
}

/* ═══════════════════════════════════════════════════════════════════════
   SCANLINE OVERLAY — Static CRT texture for sidebar
   ═══════════════════════════════════════════════════════════════════════ */

.scanline-overlay {
  position: relative;
}
.scanline-overlay::after {
  content: "";
  position: absolute;
  inset: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 2px,
    rgba(0, 255, 102, 0.015) 2px,
    rgba(0, 255, 102, 0.015) 4px
  );
  pointer-events: none;
  z-index: 1;
}

/* ═══════════════════════════════════════════════════════════════════════
   RETICULE HOVER — Corner bracket targeting motif
   ═══════════════════════════════════════════════════════════════════════ */

.reticule-hover {
  position: relative;
}
.reticule-hover::before,
.reticule-hover::after {
  content: "";
  position: absolute;
  width: 10px;
  height: 10px;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}
.reticule-hover:hover::before {
  opacity: 0.6;
  top: -1px;
  left: -1px;
  border-top: 1.5px solid #00FF66;
  border-left: 1.5px solid #00FF66;
}
.reticule-hover:hover::after {
  opacity: 0.6;
  bottom: -1px;
  right: -1px;
  border-bottom: 1.5px solid #00FF66;
  border-right: 1.5px solid #00FF66;
}

/* ═══════════════════════════════════════════════════════════════════════
   BRACKET BADGE — [STATUS] monospace tag style
   ═══════════════════════════════════════════════════════════════════════ */

.bracket-badge {
  font-family: var(--font-ibm-plex-mono), monospace;
  font-size: 0.6875rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  padding: 1px 6px;
  border-radius: 2px;
  border: 1px solid currentColor;
  opacity: 0.85;
  background: transparent;
}

/* ═══════════════════════════════════════════════════════════════════════
   SCROLLBAR — Thin, green-tinted
   ═══════════════════════════════════════════════════════════════════════ */

::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: rgba(0, 255, 102, 0.08);
  border-radius: 2px;
}
::-webkit-scrollbar-thumb:hover {
  background: rgba(0, 255, 102, 0.2);
}

/* ═══════════════════════════════════════════════════════════════════════
   LEAFLET — Dark map, green accents
   ═══════════════════════════════════════════════════════════════════════ */

.leaflet-container {
  background: #05070A;
}
.leaflet-popup-content-wrapper {
  background: rgba(13, 17, 23, 0.95);
  color: rgba(255, 255, 255, 0.87);
  border: 1px solid rgba(0, 255, 102, 0.15);
  border-radius: 2px;
  backdrop-filter: blur(16px);
  box-shadow: 0 0 8px rgba(0, 255, 102, 0.08);
}
.leaflet-popup-tip {
  background: rgba(13, 17, 23, 0.95);
}
.leaflet-tile-pane {
  filter: brightness(0.5) contrast(1.2) saturate(0) hue-rotate(90deg);
}
.leaflet-control-zoom a {
  background: rgba(13, 17, 23, 0.9) !important;
  color: rgba(255, 255, 255, 0.7) !important;
  border-color: rgba(0, 255, 102, 0.15) !important;
  backdrop-filter: blur(8px);
  transition: all 0.2s ease;
  border-radius: 2px !important;
}
.leaflet-control-zoom a:hover {
  background: rgba(0, 255, 102, 0.1) !important;
  color: #00FF66 !important;
  border-color: rgba(0, 255, 102, 0.4) !important;
}

/* ═══════════════════════════════════════════════════════════════════════
   SOLID PANELS — Replace glass system
   ═══════════════════════════════════════════════════════════════════════ */

.glass {
  background: #0D1117;
  border: 1px solid rgba(0, 255, 102, 0.1);
}
.glass-strong {
  background: #0D1117;
  border: 1px solid rgba(0, 255, 102, 0.15);
}
.glass-card {
  background: #0D1117;
  border: 1px solid rgba(0, 255, 102, 0.1);
  border-radius: 3px;
  transition: all 0.2s ease;
  box-shadow: 0 0 8px rgba(0, 255, 102, 0.04);
}
.glass-card:hover {
  border-color: rgba(0, 255, 102, 0.3);
  box-shadow: 0 0 12px rgba(0, 255, 102, 0.08);
}

/* ═══════════════════════════════════════════════════════════════════════
   AMBIENT BACKGROUND — Minimal, no colorful blobs
   ═══════════════════════════════════════════════════════════════════════ */

.ambient-bg {
  position: relative;
  overflow: hidden;
}
.ambient-bg::before {
  content: "";
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at 50% 0%, rgba(0, 255, 102, 0.015) 0%, transparent 60%);
  pointer-events: none;
  z-index: 0;
}

/* ═══════════════════════════════════════════════════════════════════════
   SKELETON LOADERS
   ═══════════════════════════════════════════════════════════════════════ */

@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, rgba(0, 255, 102, 0.02) 25%, rgba(0, 255, 102, 0.05) 50%, rgba(0, 255, 102, 0.02) 75%);
  background-size: 200% 100%;
  animation: shimmer 2s ease-in-out infinite;
  border-radius: 2px;
}

/* ═══════════════════════════════════════════════════════════════════════
   ANIMATIONS
   ═══════════════════════════════════════════════════════════════════════ */

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes slideInRight {
  from { opacity: 0; transform: translateX(16px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes slideInLeft {
  from { opacity: 0; transform: translateX(-16px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(0, 255, 102, 0.15); }
  50% { box-shadow: 0 0 20px 2px rgba(0, 255, 102, 0.06); }
}
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}
@keyframes shimmer-line {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}
@keyframes glow-pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.animate-fade-in-up { animation: fadeInUp 0.4s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
.animate-fade-in { animation: fadeIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
.animate-slide-in-right { animation: slideInRight 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
.animate-slide-in-left { animation: slideInLeft 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards; }
.animate-pulse-glow { animation: pulse-glow 3s ease-in-out infinite; }
.animate-scale-in { animation: scaleIn 0.25s cubic-bezier(0.4, 0, 0.2, 1) forwards; }

.stagger-1 { animation-delay: 0.05s; opacity: 0; }
.stagger-2 { animation-delay: 0.1s; opacity: 0; }
.stagger-3 { animation-delay: 0.15s; opacity: 0; }
.stagger-4 { animation-delay: 0.2s; opacity: 0; }
.stagger-5 { animation-delay: 0.25s; opacity: 0; }
.stagger-6 { animation-delay: 0.3s; opacity: 0; }

/* ═══════════════════════════════════════════════════════════════════════
   SPARKLINE
   ═══════════════════════════════════════════════════════════════════════ */

.sparkline-path {
  stroke-dasharray: 1000;
  stroke-dashoffset: 1000;
  animation: sparklineDraw 1.5s ease-out forwards;
}
@keyframes sparklineDraw {
  to { stroke-dashoffset: 0; }
}

/* ═══════════════════════════════════════════════════════════════════════
   TIMELINE
   ═══════════════════════════════════════════════════════════════════════ */

@keyframes timelinePulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.3); opacity: 0.5; }
}
.timeline-pulse {
  animation: timelinePulse 2.5s ease-in-out infinite;
}

/* ═══════════════════════════════════════════════════════════════════════
   COMMAND PALETTE — Terminal-style (Phase 4 full treatment)
   ═══════════════════════════════════════════════════════════════════════ */

.cmdk-overlay {
  background: rgba(0, 0, 0, 0.7) !important;
}
.cmdk {
  background: #0a0e14 !important;
  border: 1px solid rgba(0, 255, 102, 0.2) !important;
  border-radius: 3px !important;
  box-shadow: 0 0 20px rgba(0, 255, 102, 0.06), 0 0 0 1px rgba(0, 255, 102, 0.1) !important;
}
.cmdk-input {
  color: rgba(255, 255, 255, 0.87) !important;
  border-bottom: 1px solid rgba(0, 255, 102, 0.1) !important;
  font-family: var(--font-ibm-plex-mono), monospace !important;
}
.cmdk-input::placeholder {
  color: rgba(255, 255, 255, 0.2) !important;
}
.cmdk-item {
  color: rgba(255, 255, 255, 0.7) !important;
  border-radius: 2px !important;
  transition: all 0.1s ease;
}
.cmdk-item[data-selected="true"] {
  background: rgba(0, 255, 102, 0.06) !important;
  color: #00FF66 !important;
}
.cmdk-group-heading {
  color: rgba(255, 255, 255, 0.25) !important;
  font-size: 10px !important;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  font-family: var(--font-ibm-plex-mono), monospace !important;
}
.cmdk-separator {
  background: rgba(0, 255, 102, 0.06) !important;
}
.cmdk-shortcut {
  color: rgba(255, 255, 255, 0.25) !important;
  background: rgba(0, 255, 102, 0.03) !important;
  border-radius: 2px !important;
  border: 1px solid rgba(0, 255, 102, 0.1) !important;
  font-family: var(--font-ibm-plex-mono), monospace !important;
  font-size: 10px !important;
}

/* ═══════════════════════════════════════════════════════════════════════
   CONFIDENCE RING
   ═══════════════════════════════════════════════════════════════════════ */

.confidence-ring {
  transform: rotate(-90deg);
}
.confidence-ring-circle {
  transition: stroke-dashoffset 1s ease-out;
}

/* ═══════════════════════════════════════════════════════════════════════
   CONSOLE UTILITIES
   ═══════════════════════════════════════════════════════════════════════ */

/* Metric card — no gradient blobs, just subtle border glow */
.gradient-cyan {
  background: linear-gradient(135deg, rgba(0, 255, 102, 0.03) 0%, transparent 60%);
}
.gradient-indigo {
  background: linear-gradient(135deg, rgba(0, 255, 102, 0.02) 0%, transparent 60%);
}
.gradient-emerald {
  background: linear-gradient(135deg, rgba(0, 204, 82, 0.03) 0%, transparent 60%);
}
.gradient-amber {
  background: linear-gradient(135deg, rgba(255, 107, 0, 0.03) 0%, transparent 60%);
}
.gradient-rose {
  background: linear-gradient(135deg, rgba(255, 68, 68, 0.03) 0%, transparent 60%);
}

/* Active sidebar indicator — 2px left border, no glow */
.sidebar-active-glow {
  position: relative;
}
.sidebar-active-glow::before {
  content: "";
  position: absolute;
  left: 0;
  top: 15%;
  width: 2px;
  height: 70%;
  border-radius: 0 1px 1px 0;
  background: #00FF66;
  box-shadow: 0 0 8px rgba(0, 255, 102, 0.3);
}

/* Border glow — subtle green tint */
.border-glow {
  border: 1px solid rgba(0, 255, 102, 0.1);
}

/* Status dot pulse */
@keyframes status-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.5; transform: scale(1.4); }
}
.status-pulse {
  animation: status-pulse 2s ease-in-out infinite;
}

/* Number counter animation */
@keyframes countUp {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-count-up {
  animation: countUp 0.5s cubic-bezier(0.4, 0, 0.2, 1) forwards;
}

/* Force graph tooltip */
.force-graph-tooltip {
  background: rgba(13, 17, 23, 0.95) !important;
  color: rgba(255, 255, 255, 0.87) !important;
  border: 1px solid rgba(0, 255, 102, 0.15) !important;
  border-radius: 2px !important;
  padding: 8px 12px !important;
  font-size: 12px !important;
  font-family: var(--font-ibm-plex-mono), monospace;
  box-shadow: 0 0 8px rgba(0, 255, 102, 0.08) !important;
}

/* Typing indicator dots */
@keyframes typing-dot {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.3; }
  30% { transform: translateY(-3px); opacity: 1; }
}
.typing-dot {
  animation: typing-dot 1.4s ease-in-out infinite;
}

/* ═══════════════════════════════════════════════════════════════════════
   UPPERCASE LABEL UTILITY — Section labels, nav, categories
   ═══════════════════════════════════════════════════════════════════════ */

.label-tracked {
  text-transform: uppercase;
  letter-spacing: 0.14em;
  font-weight: 500;
  font-family: var(--font-ibm-plex-mono), monospace;
}
'''

with open('/home/z/my-project/src/app/globals.css', 'w') as f:
    f.write(css)

print(f"globals.css written: {len(css)} bytes")