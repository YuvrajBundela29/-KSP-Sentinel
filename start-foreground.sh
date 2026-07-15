#!/bin/bash
cd /home/z/my-project
export NODE_ENV=production

# Build if no .next directory exists
if [ ! -d ".next" ]; then
  echo "[KSP] No .next found, building..."
  npx next build
fi

echo "[KSP] Starting production server with port proxy..."
exec node scripts/serve.js