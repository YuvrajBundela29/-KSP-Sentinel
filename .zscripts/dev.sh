#!/bin/bash
# KSP Sentinel — Platform dev script
# The platform checks for .zscripts/dev.sh first and runs this instead of bun run dev.
# We use the production standalone build (pre-compiled) with our port proxy.

set -e

cd /home/z/my-project

echo "[KSP] Syncing static assets into standalone..."
rm -rf .next/standalone/.next/static 2>/dev/null
cp -r .next/static .next/standalone/.next/ 2>/dev/null || true
rm -rf .next/standalone/public 2>/dev/null
cp -r public .next/standalone/ 2>/dev/null || true

echo "[KSP] Starting production server with port proxy..."
# Keep this process alive — the platform runs this in a background subshell
exec node scripts/serve.js