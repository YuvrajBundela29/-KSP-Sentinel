#!/bin/bash
cd /home/z/my-project

# Always sync static assets (handles rebuilds with changed chunk hashes)
echo "[$(date)] Syncing static assets to standalone..." >> /tmp/next-dev.log
rm -rf .next/standalone/.next/static
cp -r .next/static .next/standalone/.next/
rm -rf .next/standalone/public
cp -r public .next/standalone/
echo "[$(date)] Static assets synced." >> /tmp/next-dev.log

while true; do
  node scripts/serve.js >> /tmp/next-dev.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Serve.js exited with code $EXIT_CODE, restarting in 2s..." >> /tmp/next-dev.log
  sleep 2
done