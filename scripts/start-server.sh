#!/bin/bash
cd /home/z/my-project
# Ensure static assets are linked
if [ ! -d .next/standalone/.next/static ]; then
  cp -r .next/static .next/standalone/.next/ 2>/dev/null
fi
if [ ! -d .next/standalone/public ]; then
  cp -r public .next/standalone/ 2>/dev/null
fi
while true; do
  node .next/standalone/server.js >> /tmp/next-dev.log 2>&1
  EXIT_CODE=$?
  echo "[$(date)] Server exited with code $EXIT_CODE, restarting in 1s..." >> /tmp/next-dev.log
  sleep 1
done