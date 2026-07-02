#!/usr/bin/env python3
"""Fix all hardcoded dark-theme inline colors to use CSS variables for light mode support."""

import re
import os

BASE = "/home/z/my-project/src/components/ksp"

def fix_sidebar():
    path = os.path.join(BASE, "Sidebar.tsx")
    with open(path, "r") as f:
        content = f.read()
    
    replacements = [
        # NavItem glowColor computation
        (
            'const glowColor = accentColor === "#22d3ee"\n    ? "rgba(34,211,238,0.08)"\n    : accentColor === "#818cf8"\n      ? "rgba(129,140,248,0.08)"\n      : accentColor === "#34d399"\n        ? "rgba(52,211,153,0.08)"\n        : "rgba(251,191,36,0.08)";',
            'const glowColor = accentColor === "var(--primary)"\n    ? "var(--primary-glow)"\n    : accentColor === "var(--secondary)"\n      ? "var(--secondary-glow)"\n      : "var(--success-glow)";'
        ),
        # NavItem drop-shadow filter
        (
            'style={isActive ? { filter: `drop-shadow(0 0 6px ${accentColor}50)` } : {}}',
            'style={isActive ? { filter: `drop-shadow(0 0 8px ${glowColor})` } : {}}'
        ),
        # NavItem active indicator boxShadow
        (
            'boxShadow: `0 0 12px ${accentColor}60`,',
            'boxShadow: `0 0 12px ${glowColor}`,'
        ),
        # Logo box
        (
            'background: "linear-gradient(135deg, rgba(34,211,238,0.15), rgba(129,140,248,0.08))",\n              border: "1px solid rgba(34,211,238,0.12)",\n              boxShadow: "0 0 16px rgba(34,211,238,0.08)",',
            'background: "var(--primary-glow-strong)",\n              border: "1px solid var(--border-accent)",\n              boxShadow: "0 0 16px var(--primary-glow)",'
        ),
        # Sentinel text
        (
            'color: "#22d3ee",\n                    textShadow: "0 0 20px rgba(34,211,238,0.3)",',
            'color: "var(--primary)",\n                    textShadow: "0 0 20px var(--primary-glow-strong)",'
        ),
        # Separator gradient
        (
            'background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)",',
            'background: "linear-gradient(90deg, transparent, var(--border-default), transparent)",'
        ),
        # Intelligence accentColor
        ('accentColor="#22d3ee"', 'accentColor="var(--primary)"'),
        # Analytics section color
        ('color="#34d399"\n            open={analyticsOpen}', 'color="var(--success)"\n            open={analyticsOpen}'),
        # Analytics accentColor
        ('accentColor="#34d399"', 'accentColor="var(--success)"'),
        # DM section color
        ('color="#818cf8"\n            open={dmOpen}', 'color="var(--secondary)"\n            open={dmOpen}'),
        # DM accentColor
        ('accentColor="#818cf8"', 'accentColor="var(--secondary)"'),
        # Collapsed separators
        ('style={{ background: "rgba(255,255,255,0.06)" }}', 'style={{ background: "var(--border-subtle)" }}'),
        # User avatar
        (
            'background: "linear-gradient(135deg, rgba(34,211,238,0.1), rgba(129,140,248,0.08))",\n                color: "#22d3ee",\n                border: "1px solid rgba(34,211,238,0.1)",',
            'background: "var(--primary-glow-strong)",\n                color: "var(--primary)",\n                border: "1px solid var(--border-accent)",'
        ),
        # Logout hover
        (
            'e.currentTarget.style.background = "rgba(248,113,113,0.06)";\n            e.currentTarget.style.color = "#f87171";',
            'e.currentTarget.style.background = "var(--critical-glow)";\n            e.currentTarget.style.color = "var(--critical)";'
        ),
        # Mobile hamburger background
        (
            'background: "rgba(15,21,36,0.85)",\n          border: "1px solid rgba(255,255,255,0.06)",',
            'background: "var(--bg-card)",\n          border: "1px solid var(--border-subtle)",'
        ),
        # Mobile notification dot
        (
            'style={{ background: "#f87171", color: "#050810" }}',
            'style={{ background: "var(--critical)", color: "var(--primary-foreground)" }}'
        ),
    ]
    
    count = 0
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new, 1)
            count += 1
            print(f"  ✓ Sidebar: Replaced '{old[:60]}...'")
        else:
            print(f"  ✗ Sidebar: NOT FOUND '{old[:60]}...'")
    
    with open(path, "w") as f:
        f.write(content)
    print(f"\n  Sidebar: {count}/{len(replacements)} replacements applied")
    return count


def fix_header():
    path = os.path.join(BASE, "Header.tsx")
    with open(path, "r") as f:
        content = f.read()
    
    replacements = [
        # DM badge
        (
            'style={{ background: "rgba(129,140,248,0.08)", color: "#818cf8", border: "1px solid rgba(129,140,248,0.12)" }}',
            'style={{ background: "var(--secondary-glow)", color: "var(--secondary)", border: "1px solid var(--secondary-glow)" }}'
        ),
        # System status online color (Wifi icon)
        (
            '<Wifi className="w-3 h-3" style={{ color: "#34d399" }} />',
            '<Wifi className="w-3 h-3" style={{ color: "var(--success)" }} />'
        ),
        # System status online text
        (
            'style={{ color: "#34d399" }}>{getLabel(lang, "online")}',
            'style={{ color: "var(--success)" }}>{getLabel(lang, "online")}'
        ),
        # System status bg
        (
            'style={{ background: "rgba(52,211,153,0.05)" }}',
            'style={{ background: "var(--success-glow)" }}'
        ),
        # Activity icon
        (
            '<Activity className="w-3 h-3" style={{ color: "#22d3ee" }} />',
            '<Activity className="w-3 h-3" style={{ color: "var(--primary)" }} />'
        ),
        # Lang dropdown active item bg
        (
            'background: lang === l.code ? "rgba(34,211,238,0.06)" : "transparent",',
            'background: lang === l.code ? "var(--primary-glow)" : "transparent",'
        ),
        # Mark all read
        (
            'style={{ color: "#22d3ee" }}',
            'style={{ color: "var(--primary)" }}'
        ),
        # Notification hover
        (
            'whileHover={{ background: "rgba(255,255,255,0.02)" }}',
            'whileHover={{ background: "var(--border-subtle)" }}'
        ),
        # Notification unread bg
        (
            'background: !n.read ? "rgba(34,211,238,0.02)" : "transparent",',
            'background: !n.read ? "var(--primary-subtle)" : "transparent",'
        ),
        # NOTIF_COLORS
        (
            'const NOTIF_COLORS: Record<string, string> = {\n  info: "#22d3ee",\n  warning: "#fbbf24",\n  error: "#f87171",\n  success: "#34d399",\n};',
            'const NOTIF_COLORS: Record<string, string> = {\n  info: "var(--primary)",\n  warning: "var(--warning)",\n  error: "var(--critical)",\n  success: "var(--success)",\n};'
        ),
        # Default notif color fallback
        (
            'backgroundColor: NOTIF_COLORS[n.type] || "#5a657a"',
            'backgroundColor: NOTIF_COLORS[n.type] || "var(--text-tertiary)"'
        ),
        # User avatar gradient
        (
            'style={{ background: "linear-gradient(135deg, rgba(34,211,238,0.12), rgba(129,140,248,0.08))", border: "1px solid rgba(34,211,238,0.1)" }}',
            'style={{ background: "var(--primary-glow-strong)", border: "1px solid var(--border-accent)" }}'
        ),
        # User avatar text
        (
            'style={{ color: "#22d3ee" }}>\n              {user.username.slice(0, 2).toUpperCase()}',
            'style={{ color: "var(--primary)" }}>\n              {user.username.slice(0, 2).toUpperCase()}'
        ),
        # Notification badge
        (
            'style={{ background: "#f87171", color: "#050810" }}',
            'style={{ background: "var(--critical)", color: "var(--primary-foreground)" }}'
        ),
    ]
    
    count = 0
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new, 1)
            count += 1
            print(f"  ✓ Header: Replaced '{old[:60]}...'")
        else:
            print(f"  ✗ Header: NOT FOUND '{old[:60]}...'")
    
    with open(path, "w") as f:
        f.write(content)
    print(f"\n  Header: {count}/{len(replacements)} replacements applied")
    return count


def fix_remaining_components():
    """Fix hardcoded colors in remaining components using CSS variable approach."""
    files_to_fix = [
        "DashboardHome.tsx",
        "ChatView.tsx", 
        "LoadingSpinner.tsx",
        "CommandPalette.tsx",
        "LoginView.tsx",
        "WelcomeOnboarding.tsx",
        "CrimeMap.tsx",
        "ReportGenerator.tsx",
        "AccusedProfile.tsx",
    ]
    
    total = 0
    for fname in files_to_fix:
        path = os.path.join(BASE, fname)
        if not os.path.exists(path):
            print(f"  ✗ {fname}: File not found")
            continue
        
        with open(path, "r") as f:
            content = f.read()
        
        original = content
        
        # Common replacements across all files
        replacements = [
            ('color: "#f1f5f9"', 'color: "var(--text-primary)"'),
            ('color: "#e8edf5"', 'color: "var(--foreground)"'),
            ('color: "#8b97b0"', 'color: "var(--text-secondary)"'),
            ('color: "#5a657a"', 'color: "var(--text-tertiary)"'),
            ('color: "#3d4659"', 'color: "var(--text-muted)"'),
            ('color: "#22d3ee"', 'color: "var(--primary)"'),
            ('color: "#818cf8"', 'color: "var(--secondary)"'),
            ('color: "#34d399"', 'color: "var(--success)"'),
            ('color: "#fbbf24"', 'color: "var(--warning)"'),
            ('color: "#f87171"', 'color: "var(--critical)"'),
            ('color: "#ec4899"', 'color: "#db2777"'),  # Keep pink as-is (not a CSS var)
            ('color: "#06b6d4"', 'color: "var(--primary)"'),
            ('color: "#84cc16"', 'color: "#65a30d"'),  # Keep lime as-is
            # Background rgba patterns
            ('background: "rgba(255,255,255,0.02)"', 'background: "var(--border-subtle)"'),
            ('background: "rgba(255,255,255,0.03)"', 'background: "var(--border-subtle)"'),
            ('background: "rgba(255,255,255,0.04)"', 'background: "var(--border-subtle)"'),
            ('background: "rgba(255,255,255,0.05)"', 'background: "var(--border-subtle)"'),
            ('background: "rgba(255,255,255,0.06)"', 'background: "var(--border-subtle)"'),
            ('background: "rgba(255,255,255,0.08)"', 'background: "var(--border-default)"'),
            ('background: "rgba(255,255,255,0.1)"', 'background: "var(--border-default)"'),
            # Border patterns
            ('border: "1px solid rgba(255,255,255,0.06)"', 'border: "1px solid var(--border-subtle)"'),
            ('border: "1px solid rgba(255,255,255,0.08)"', 'border: "1px solid var(--border-subtle)"'),
            ('border: "1px solid rgba(255,255,255,0.1)"', 'border: "1px solid var(--border-default)"'),
            ('border: "1px solid rgba(255,255,255,0.12)"', 'border: "1px solid var(--border-default)"'),
            ('border: "1px solid rgba(255,255,255,0.15)"', 'border: "1px solid var(--border-strong)"'),
            ('border: "1px solid rgba(255,255,255,0.2)"', 'border: "1px solid var(--border-strong)"'),
            ('borderBottom: "1px solid rgba(255,255,255,0.06)"', 'borderBottom: "1px solid var(--border-subtle)"'),
            ('borderBottom: "1px solid rgba(255,255,255,0.08)"', 'borderBottom: "1px solid var(--border-subtle)"'),
            # Box shadow patterns
            ('boxShadow: "0 0 12px rgba(34,211,238,0.08)"', 'boxShadow: "0 0 12px var(--primary-glow)"'),
        ]
        
        file_count = 0
        for old, new in replacements:
            if old in content:
                content = content.replace(old, new)
                file_count += 1
        
        if content != original:
            with open(path, "w") as f:
                f.write(content)
            print(f"  ✓ {fname}: {file_count} replacements")
            total += file_count
        else:
            print(f"  - {fname}: No changes needed")
    
    print(f"\n  Other components: {total} total replacements")
    return total


def fix_dm_components():
    """Fix hardcoded colors in DM components."""
    dm_dir = os.path.join(BASE, "dm")
    total = 0
    
    for fname in os.listdir(dm_dir):
        if not fname.endswith(".tsx"):
            continue
        path = os.path.join(dm_dir, fname)
        
        with open(path, "r") as f:
            content = f.read()
        
        original = content
        
        # Common color replacements for inline styles
        replacements = [
            ('color: "#f1f5f9"', 'color: "var(--text-primary)"'),
            ('color: "#e8edf5"', 'color: "var(--foreground)"'),
            ('color: "#8b97b0"', 'color: "var(--text-secondary)"'),
            ('color: "#5a657a"', 'color: "var(--text-tertiary)"'),
            ('color: "#3d4659"', 'color: "var(--text-muted)"'),
            ('color: "#22d3ee"', 'color: "var(--primary)"'),
            ('color: "#818cf8"', 'color: "var(--secondary)"'),
            ('color: "#34d399"', 'color: "var(--success)"'),
            ('color: "#fbbf24"', 'color: "var(--warning)"'),
            ('color: "#f87171"', 'color: "var(--critical)"'),
            ('color: "#ec4899"', 'color: "#db2777"'),
            ('color: "#06b6d4"', 'color: "var(--primary)"'),
            # Background rgba patterns
            ('background: "rgba(255,255,255,0.02)"', 'background: "var(--border-subtle)"'),
            ('background: "rgba(255,255,255,0.03)"', 'background: "var(--border-subtle)"'),
            ('background: "rgba(255,255,255,0.04)"', 'background: "var(--border-subtle)"'),
            ('background: "rgba(255,255,255,0.05)"', 'background: "var(--border-subtle)"'),
            ('background: "rgba(255,255,255,0.06)"', 'background: "var(--border-subtle)"'),
            ('background: "rgba(255,255,255,0.08)"', 'background: "var(--border-default)"'),
            ('background: "rgba(255,255,255,0.1)"', 'background: "var(--border-default)"'),
            # Border patterns
            ('border: "1px solid rgba(255,255,255,0.06)"', 'border: "1px solid var(--border-subtle)"'),
            ('border: "1px solid rgba(255,255,255,0.08)"', 'border: "1px solid var(--border-subtle)"'),
            ('border: "1px solid rgba(255,255,255,0.1)"', 'border: "1px solid var(--border-default)"'),
            ('border: "1px solid rgba(255,255,255,0.12)"', 'border: "1px solid var(--border-default)"'),
            ('borderBottom: "1px solid rgba(255,255,255,0.06)"', 'borderBottom: "1px solid var(--border-subtle)"'),
            ('borderBottom: "1px solid rgba(255,255,255,0.08)"', 'borderBottom: "1px solid var(--border-subtle)"'),
        ]
        
        file_count = 0
        for old, new in replacements:
            if old in content:
                content = content.replace(old, new)
                file_count += 1
        
        if content != original:
            with open(path, "w") as f:
                f.write(content)
            print(f"  ✓ dm/{fname}: {file_count} replacements")
            total += file_count
    
    print(f"\n  DM components: {total} total replacements")
    return total


if __name__ == "__main__":
    print("=== Fixing Light Mode: Hardcoded Colors → CSS Variables ===\n")
    
    print("--- Sidebar ---")
    c1 = fix_sidebar()
    
    print("\n--- Header ---")
    c2 = fix_header()
    
    print("\n--- Main Components ---")
    c3 = fix_remaining_components()
    
    print("\n--- DM Components ---")
    c4 = fix_dm_components()
    
    total = c1 + c2 + c3 + c4
    print(f"\n=== Total: {total} replacements across all files ===")