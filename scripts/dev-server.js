#!/usr/bin/env node
// Dev server with port proxy workaround
// Next.js cannot accept connections on port 3000 in this container,
// so we run it on 3999 and proxy 3000 -> 3999.

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const NEXT_PORT = 3999;
const PROXY_PORT = 3000;

// ── 1. Start Next.js dev server on port 3999 ─────────────────────────
const nextDev = spawn(
  process.execPath,
  ['node_modules/.bin/next', 'dev', '-H', '0.0.0.0', '-p', String(NEXT_PORT)],
  {
    cwd: path.resolve(__dirname, '..'),
    stdio: ['inherit', 'inherit', 'inherit'],
    env: { ...process.env },
  }
);

nextDev.on('exit', (code) => {
  console.error(`[dev-proxy] Next.js exited with code ${code}`);
  process.exit(code || 1);
});

// ── 2. Start proxy on port 3000 ──────────────────────────────────────
const proxy = http.createServer((req, res) => {
  const proxyReq = http.request(
    {
      hostname: '127.0.0.1',
      port: NEXT_PORT,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `localhost:${NEXT_PORT}` },
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );
  proxyReq.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/html' });
      res.end('<h2>KSP Sentinel — Next.js is starting, please refresh...</h2>');
    }
  });
  req.pipe(proxyReq);
});

proxy.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`[dev-proxy] Proxy :${PROXY_PORT} -> Next.js dev :${NEXT_PORT}`);
});

proxy.on('error', (err) => {
  console.error(`[dev-proxy] Error: ${err.message}`);
});

// Graceful shutdown
process.on('SIGTERM', () => { nextDev.kill('SIGTERM'); process.exit(0); });
process.on('SIGINT', () => { nextDev.kill('SIGINT'); process.exit(0); });