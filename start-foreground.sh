#!/bin/bash
cd /home/z/my-project
export NODE_ENV=production

# Always sync static assets
rm -rf .next/standalone/.next/static
cp -r .next/static .next/standalone/.next/
rm -rf .next/standalone/public
cp -r public .next/standalone/

# Capture unhandled rejections and exceptions
node scripts/serve.js 2>&1