#!/bin/bash
cd /home/z/my-project

# Always sync static assets
rm -rf .next/standalone/.next/static
cp -r .next/static .next/standalone/.next/
rm -rf .next/standalone/public
cp -r public .next/standalone/

# Start serve.js as a detached daemon
nohup node scripts/serve.js > /tmp/next-dev.log 2>&1 &
echo $! > /tmp/sentinel-server.pid
echo "Server started with PID $(cat /tmp/sentinel-server.pid)"
disown