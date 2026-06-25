#!/bin/bash
cd /home/z/my-project
export NODE_ENV=production
exec bun .next/standalone/server.js