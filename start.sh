#!/bin/bash
cd /home/z/my-project
export NODE_ENV=production

rm -rf .next/standalone/.next/static
cp -r .next/static .next/standalone/.next/
rm -rf .next/standalone/public
cp -r public .next/standalone/

exec node scripts/serve.js