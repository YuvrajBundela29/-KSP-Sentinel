#!/bin/bash
# KSP Sentinel — Platform startup script
# Starts Next.js on port 3999 with a plain Node.js proxy on port 3000.
# Caddy (port 81) proxies to localhost:3000.

cd /home/z/my-project

# Install deps if needed
if [ ! -d "node_modules" ]; then
  echo "[KSP] Installing dependencies..."
  bun install
fi

# Build if needed (for production mode)
if [ ! -d ".next" ]; then
  echo "[KSP] Building Next.js..."
  npx next build
fi

echo "[KSP] Starting dev server (proxy :3000 -> Next.js :3999)..."
exec node scripts/dev-server.js