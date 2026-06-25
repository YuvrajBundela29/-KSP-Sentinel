#!/bin/bash
cd /home/z/my-project
export NODE_ENV=production

# Capture unhandled rejections and exceptions
bun .next/standalone/server.js 2>&1