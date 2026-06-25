#!/usr/bin/env python3
"""BLACKBIRD Color Migration Script."""
import sys

REPLACEMENTS = [
    ('#0a0f1e', 'rgba(10,15,28,0.6)'),
    ('#0d1225', 'rgba(13,18,33,0.5)'),
    ('#0d1424', 'rgba(15,21,36,0.45)'),
    ('#0d1326', 'rgba(13,19,38,0.5)'),
    ('#0b1120', 'rgba(11,17,32,0.5)'),
    ('#1a2035', 'rgba(15,21,36,0.45)'),
    ('#2a3550', 'rgba(255,255,255,0.08)'),
    ('#3b82f6', '#22d3ee'),
    ('#2563eb', '#06b6d4'),
    ('#1d4ed8', '#0891b2'),
    ('#8b5cf6', '#818cf8'),
    ('#7c3aed', '#6d7de8'),
    ('#e2e8f0', '#f1f5f9'),
    ('#94a3b8', '#8b97b0'),
    ('#64748b', '#5a657a'),
    ('#475569', '#3d4659'),
    ('#4a5568', '#3d4659'),
    ('bg-red-500', 'bg-[#f87171]'), ('bg-red-600', 'bg-[#f87171]'),
    ('bg-orange-500', 'bg-[#fbbf24]'), ('bg-orange-600', 'bg-[#fbbf24]'),
    ('bg-amber-500', 'bg-[#fbbf24]'), ('bg-amber-600', 'bg-[#fbbf24]'),
    ('bg-yellow-500', 'bg-[#fbbf24]'), ('bg-yellow-600', 'bg-[#fbbf24]'),
    ('bg-green-500', 'bg-[#34d399]'), ('bg-green-600', 'bg-[#34d399]'),
    ('bg-emerald-500', 'bg-[#34d399]'), ('bg-emerald-600', 'bg-[#34d399]'), ('bg-emerald-700', 'bg-[#2bc48a]'),
    ('bg-blue-500', 'bg-[#22d3ee]'), ('bg-blue-600', 'bg-[#22d3ee]'), ('bg-blue-700', 'bg-[#06b6d4]'),
    ('bg-cyan-500', 'bg-[#22d3ee]'), ('bg-cyan-600', 'bg-[#22d3ee]'),
    ('bg-purple-500', 'bg-[#818cf8]'), ('bg-purple-600', 'bg-[#818cf8]'),
    ('bg-violet-500', 'bg-[#818cf8]'), ('bg-violet-600', 'bg-[#818cf8]'), ('bg-violet-700', 'bg-[#6d7de8]'),
    ('bg-indigo-500', 'bg-[#818cf8]'), ('bg-indigo-600', 'bg-[#818cf8]'),
    ('bg-pink-500', 'bg-[#f87171]'), ('bg-pink-600', 'bg-[#f87171]'),
    ('bg-slate-500', 'bg-[#5a657a]'), ('bg-slate-600', 'bg-[#3d4659]'), ('bg-slate-700', 'bg-[#3d4659]'),
    ('bg-slate-800', 'bg-[rgba(255,255,255,0.04)]'), ('bg-slate-900', 'bg-[rgba(10,15,28,0.8)]'),
    ('text-red-400', 'text-[#f87171]'), ('text-red-500', 'text-[#f87171]'),
    ('text-orange-400', 'text-[#fbbf24]'), ('text-orange-500', 'text-[#fbbf24]'),
    ('text-amber-400', 'text-[#fbbf24]'), ('text-amber-500', 'text-[#fbbf24]'),
    ('text-yellow-400', 'text-[#fbbf24]'), ('text-yellow-500', 'text-[#fbbf24]'),
    ('text-green-400', 'text-[#34d399]'), ('text-green-500', 'text-[#34d399]'),
    ('text-emerald-400', 'text-[#34d399]'), ('text-emerald-500', 'text-[#34d399]'),
    ('text-blue-400', 'text-[#22d3ee]'), ('text-blue-500', 'text-[#22d3ee]'),
    ('text-cyan-400', 'text-[#22d3ee]'), ('text-cyan-500', 'text-[#22d3ee]'),
    ('text-purple-400', 'text-[#818cf8]'), ('text-purple-500', 'text-[#818cf8]'),
    ('text-violet-400', 'text-[#818cf8]'), ('text-violet-500', 'text-[#818cf8]'),
    ('text-indigo-400', 'text-[#818cf8]'), ('text-indigo-500', 'text-[#818cf8]'),
    ('text-pink-400', 'text-[#f87171]'), ('text-pink-500', 'text-[#f87171]'),
    ('text-slate-300', 'text-[#8b97b0]'), ('text-slate-400', 'text-[#8b97b0]'),
    ('text-slate-500', 'text-[#5a657a]'), ('text-slate-600', 'text-[#3d4659]'),
    ('border-red-500/30', 'border-[rgba(248,113,113,0.15)]'), ('border-red-500/40', 'border-[rgba(248,113,113,0.2)]'),
    ('border-orange-500/30', 'border-[rgba(251,191,36,0.15)]'), ('border-amber-500/30', 'border-[rgba(251,191,36,0.15)]'),
    ('border-yellow-500/30', 'border-[rgba(251,191,36,0.15)]'),
    ('border-green-500/30', 'border-[rgba(52,211,153,0.15)]'), ('border-emerald-500/30', 'border-[rgba(52,211,153,0.15)]'),
    ('border-emerald-500/20', 'border-[rgba(52,211,153,0.12)]'),
    ('border-blue-500/30', 'border-[rgba(34,211,238,0.15)]'), ('border-blue-500/40', 'border-[rgba(34,211,238,0.2)]'),
    ('border-cyan-500/30', 'border-[rgba(34,211,238,0.15)]'),
    ('border-purple-500/30', 'border-[rgba(129,140,248,0.15)]'),
    ('border-violet-500/30', 'border-[rgba(129,140,248,0.15)]'), ('border-violet-500/20', 'border-[rgba(129,140,248,0.12)]'),
    ('border-indigo-500/30', 'border-[rgba(129,140,248,0.15)]'),
    ('border-pink-500/40', 'border-[rgba(248,113,113,0.2)]'),
    ('border-slate-500/30', 'border-[rgba(255,255,255,0.08)]'), ('border-slate-600', 'border-[rgba(255,255,255,0.08)]'),
    ('border-slate-700', 'border-[rgba(255,255,255,0.06)]'),
    ('bg-red-500/10', 'bg-[rgba(248,113,113,0.08)]'), ('bg-red-500/20', 'bg-[rgba(248,113,113,0.12)]'), ('bg-red-500/5', 'bg-[rgba(248,113,113,0.04)]'),
    ('bg-orange-500/10', 'bg-[rgba(251,191,36,0.08)]'), ('bg-orange-500/20', 'bg-[rgba(251,191,36,0.12)]'),
    ('bg-amber-500/10', 'bg-[rgba(251,191,36,0.08)]'), ('bg-amber-500/20', 'bg-[rgba(251,191,36,0.12)]'),
    ('bg-yellow-500/10', 'bg-[rgba(251,191,36,0.08)]'), ('bg-yellow-500/20', 'bg-[rgba(251,191,36,0.12)]'),
    ('bg-green-500/10', 'bg-[rgba(52,211,153,0.08)]'), ('bg-green-500/20', 'bg-[rgba(52,211,153,0.12)]'),
    ('bg-emerald-500/10', 'bg-[rgba(52,211,153,0.08)]'), ('bg-emerald-500/20', 'bg-[rgba(52,211,153,0.12)]'), ('bg-emerald-500/5', 'bg-[rgba(52,211,153,0.04)]'),
    ('bg-blue-500/10', 'bg-[rgba(34,211,238,0.08)]'), ('bg-blue-500/20', 'bg-[rgba(34,211,238,0.12)]'), ('bg-blue-500/5', 'bg-[rgba(34,211,238,0.04)]'),
    ('bg-cyan-500/10', 'bg-[rgba(34,211,238,0.08)]'), ('bg-cyan-500/20', 'bg-[rgba(34,211,238,0.12)]'),
    ('bg-purple-500/10', 'bg-[rgba(129,140,248,0.08)]'), ('bg-purple-500/20', 'bg-[rgba(129,140,248,0.12)]'),
    ('bg-violet-500/10', 'bg-[rgba(129,140,248,0.08)]'), ('bg-violet-500/20', 'bg-[rgba(129,140,248,0.12)]'), ('bg-violet-500/15', 'bg-[rgba(129,140,248,0.1)]'),
    ('bg-indigo-500/10', 'bg-[rgba(129,140,248,0.08)]'),
    ('bg-pink-500/10', 'bg-[rgba(248,113,113,0.08)]'), ('bg-pink-500/20', 'bg-[rgba(248,113,113,0.12)]'),
    ('bg-slate-500/20', 'bg-[rgba(255,255,255,0.06)]'), ('bg-slate-800/50', 'bg-[rgba(255,255,255,0.04)]'),
    ('hover:bg-slate-800', 'hover:bg-[rgba(255,255,255,0.04)]'),
    ('hover:bg-emerald-700', 'hover:bg-[#2bc48a]'), ('hover:bg-blue-700', 'hover:bg-[#06b6d4]'),
    ('hover:bg-violet-700', 'hover:bg-[#6d7de8]'), ('hover:bg-red-600', 'hover:bg-[#e85d5d]'),
    ('hover:bg-indigo-600', 'hover:bg-[#6d7de8]'), ('hover:bg-purple-600', 'hover:bg-[#6d7de8]'),
    ('hover:bg-amber-600', 'hover:bg-[#e5ad1e]'),
    ('ring-blue-500/20', 'ring-[rgba(34,211,238,0.2)]'), ('ring-emerald-500/20', 'ring-[rgba(52,211,153,0.2)]'),
    ('ring-red-500/20', 'ring-[rgba(248,113,113,0.2)]'), ('ring-violet-500/20', 'ring-[rgba(129,140,248,0.2)]'),
    ('focus-visible:border-emerald-600', 'focus-visible:border-[#34d399]'),
    ('focus-visible:border-blue-600', 'focus-visible:border-[#22d3ee]'),
    ('focus-visible:border-violet-600', 'focus-visible:border-[#818cf8]'),
    ('data-[state=checked]:border-emerald-600', 'data-[state=checked]:border-[#34d399]'),
    ('data-[state=checked]:bg-emerald-600', 'data-[state=checked]:bg-[#34d399]'),
    ('shadow-lg shadow-black/20', 'shadow-lg shadow-black/40'),
    ('border-[#2a3550]/60', 'border-[rgba(255,255,255,0.05)]'),
    ('border-[#2a3550]/40', 'border-[rgba(255,255,255,0.04)]'),
    ('bg-[#0d1424]', 'bg-[rgba(15,21,36,0.45)]'),
    ('hover:bg-[#0d1424]', 'hover:bg-[rgba(255,255,255,0.03)]'),
    ('bg-[#2a3550]', 'bg-[rgba(255,255,255,0.08)]'),
    ('bg-[#1a2035]/50', 'bg-[rgba(15,21,36,0.3)]'),
    ('text-[#e2e8f0]', 'text-[#f1f5f9]'),
    ('text-[#94a3b8]', 'text-[#8b97b0]'),
    ('text-[#64748b]', 'text-[#5a657a]'),
    ('text-[#475569]', 'text-[#3d4659]'),
    ('text-[#3b82f6]', 'text-[#22d3ee]'),
    ('text-[#8b5cf6]', 'text-[#818cf8]'),
]

def migrate_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    for pattern, replacement in REPLACEMENTS:
        content = content.replace(pattern, replacement)
    if content != original:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

if __name__ == '__main__':
    for f in sys.argv[1:]:
        try:
            changed = migrate_file(f)
            print(f"  {'UPDATED' if changed else 'NO CHANGE'}: {f}")
        except Exception as e:
            print(f"  ERROR: {f}: {e}")