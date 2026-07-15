#!/usr/bin/env node
// KSP Sentinel — Dev server with port proxy
// Next.js cannot accept connections on port 3000 in this container,
// so we run it on 3999 and proxy 3000 -> 3999.
// The proxy is a plain Node.js http server which works fine on port 3000.

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const NEXT_PORT = 3999;
const PROXY_PORT = 3000;
const PROJECT_DIR = path.resolve(__dirname, '..');

let nextReady = false;
let nextProc = null;

// ── 1. Start proxy on port 3000 FIRST (plain Node.js, always works) ───
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
      res.end('<html><body style="font-family:system-ui;text-align:center;padding:4rem"><h2>KSP Sentinel</h2><p>Next.js is restarting... please refresh.</p></body></html>');
    }
  });
  req.pipe(proxyReq);
});

proxy.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`[proxy] Listening on :${PROXY_PORT} -> Next.js dev on :${NEXT_PORT}`);
});

proxy.on('error', (err) => {
  console.error(`[proxy] Error: ${err.message}`);
});

// ── 2. Start Next.js dev server on port 3999 ──────────────────────────
function startNext() {
  const nextBin = path.join(PROJECT_DIR, 'node_modules', '.bin', 'next');
  nextProc = spawn(
    process.execPath,
    [nextBin, 'dev', '-H', '0.0.0.0', '-p', String(NEXT_PORT)],
    {
      cwd: PROJECT_DIR,
      stdio: ['inherit', 'inherit', 'inherit'],
      env: { ...process.env, PORT: String(NEXT_PORT) },
    }
  );

  nextProc.on('error', (err) => {
    console.error(`[next] Failed to start: ${err.message}`);
    // Retry after 5 seconds
    setTimeout(startNext, 5000);
  });

  nextProc.on('exit', (code, signal) => {
    console.error(`[next] Exited: code=${code} signal=${signal}`);
    nextReady = false;
    // Restart after 3 seconds unless we're shutting down
    if (code !== 0 && !shuttingDown) {
      console.log('[next] Restarting in 3s...');
      setTimeout(startNext, 3000);
    }
  });
}

// ── 3. Poll Next.js readiness ──────────────────────────────────────────
function checkReady() {
  const req = http.request(
    { hostname: '127.0.0.1', port: NEXT_PORT, path: '/', method: 'GET', timeout: 3000 },
    (res) => {
      res.resume();
      if (!nextReady) {
        nextReady = true;
        console.log(`[proxy] Next.js is ready on :${NEXT_PORT}`);
      }
      setTimeout(checkReady, 30000);
    }
  );
  req.on('error', () => setTimeout(checkReady, 2000));
  req.on('timeout', () => { req.destroy(); setTimeout(checkReady, 2000); });
  req.end();
}

startNext();
setTimeout(checkReady, 3000);

// ── 4. Graceful shutdown ───────────────────────────────────────────────
let shuttingDown = false;
function shutdown() {
  shuttingDown = true;
  if (nextProc) nextProc.kill('SIGTERM');
  setTimeout(() => process.exit(0), 3000);
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
process.on('uncaughtException', (err) => {
  console.error('[uncaught]', err.message);
});