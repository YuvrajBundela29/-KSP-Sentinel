#!/bin/bash
cd /home/z/my-project
while true; do
  node .next/standalone/server.js 2>/tmp/next-dev.log
  echo "Server crashed, restarting in 2s..." >> /tmp/next-dev.log
  sleep 2
done
