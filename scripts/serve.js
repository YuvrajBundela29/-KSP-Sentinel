#!/usr/bin/env node
// KSP Sentinel — Production port proxy wrapper
// Next.js cannot accept connections on port 3000 in this container,
// so we run it on 3999 and proxy 3000 -> 3999.

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const NEXT_PORT = 3999;
const PROXY_PORT = 3000;
const PROJECT_DIR = path.resolve(__dirname, '..');

let nextReady = false;

// ── 1. Start the proxy on port 3000 FIRST ─────────────────────────────
const proxy = http.createServer((req, res) => {
  if (!nextReady) {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<html><body style="font-family:system-ui;text-align:center;padding:4rem"><h2>KSP Sentinel</h2><p>Server is starting up... please refresh in a few seconds.</p></body></html>');
    }
    return;
  }

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
      res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<html><body style="font-family:system-ui;text-align:center;padding:4rem"><h2>KSP Sentinel</h2><p>Temporarily unavailable, please refresh.</p></body></html>');
    }
  });
  req.pipe(proxyReq);
});

proxy.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`[proxy] Listening on :${PROXY_PORT} -> Next.js on :${NEXT_PORT}`);
});

proxy.on('error', (err) => {
  console.error(`[proxy] Error: ${err.message}`);
});

// ── 2. Spawn Next.js production server on port 3999 ────────────────────
const nextBin = path.join(PROJECT_DIR, 'node_modules', '.bin', 'next');
const nextProcess = spawn(
  process.execPath,
  [nextBin, 'start', '-H', '0.0.0.0', '-p', String(NEXT_PORT)],
  {
    cwd: PROJECT_DIR,
    env: { ...process.env, NODE_ENV: 'production', PORT: String(NEXT_PORT), HOSTNAME: '0.0.0.0' },
    stdio: ['inherit', 'inherit', 'inherit'],
  }
);

nextProcess.on('error', (err) => {
  console.error(`[next] Failed to start: ${err.message}`);
});

nextProcess.on('exit', (code, signal) => {
  console.error(`[next] Exited with code=${code}, signal=${signal}`);
  nextReady = false;
  setTimeout(() => process.exit(1), 1000);
});

// ── 3. Poll Next.js until it's ready ───────────────────────────────────
function checkNextReady() {
  const req = http.request(
    { hostname: '127.0.0.1', port: NEXT_PORT, path: '/', method: 'GET', timeout: 2000 },
    (res) => {
      res.resume();
      if (!nextReady) {
        nextReady = true;
        console.log(`[proxy] Next.js is ready on :${NEXT_PORT}`);
      }
      setTimeout(checkNextReady, 30000);
    }
  );
  req.on('error', () => setTimeout(checkNextReady, 1000));
  req.on('timeout', () => { req.destroy(); setTimeout(checkNextReady, 1000); });
  req.end();
}
setTimeout(checkNextReady, 2000);

// ── 4. Keep process alive ──────────────────────────────────────────────
process.on('uncaughtException', (err) => console.error('[uncaught]', err.message));
process.on('SIGTERM', () => { nextProcess.kill('SIGTERM'); setTimeout(() => process.exit(0), 3000); });
process.on('SIGINT', () => { nextProcess.kill('SIGINT'); setTimeout(() => process.exit(0), 3000); });