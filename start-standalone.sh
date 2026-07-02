#!/bin/bash
cd /home/z/my-project/.next/standalone
while true; do
  HOSTNAME=0.0.0.0 PORT=3000 bun server.js 2>&1
  sleep 2
done
