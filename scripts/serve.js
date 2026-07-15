#!/usr/bin/env node
// KSP Sentinel — Robust port proxy wrapper
// Problem: Next.js standalone server refuses connections on port 3000 in this container,
// but plain Node.js http servers work fine on port 3000.
// Solution: Parent process = plain Node.js proxy on port 3000.
//           Child process = Next.js on port 3999.

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const NEXT_PORT = 3999;
const PROXY_PORT = 3000;

let nextReady = false;

// ── 1. Start the proxy on port 3000 FIRST ─────────────────────────────
const proxy = http.createServer((req, res) => {
  if (!nextReady) {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end('<html><body><h2>KSP Sentinel — Server starting, please refresh in a few seconds...</h2></body></html>');
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
      res.end('<html><body><h2>KSP Sentinel — Temporarily unavailable, please refresh...</h2></body></html>');
    }
  });
  req.pipe(proxyReq);
});

proxy.listen(PROXY_PORT, '0.0.0.0', () => {
  console.log(`[proxy] Listening on :${PROXY_PORT} (proxying to Next.js on :${NEXT_PORT})`);
});

proxy.on('error', (err) => {
  console.error(`[proxy] Error: ${err.message}`);
});

// ── 2. Spawn Next.js as a child process ────────────────────────────────
const standaloneDir = path.join(__dirname, '..', '.next', 'standalone');

const nextProcess = spawn(process.execPath, [path.join(standaloneDir, 'server.js')], {
  cwd: standaloneDir,
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: String(NEXT_PORT),
    HOSTNAME: '0.0.0.0',
  },
  stdio: ['inherit', 'inherit', 'inherit'],
});

nextProcess.on('error', (err) => {
  console.error(`[next] Failed to start: ${err.message}`);
});

nextProcess.on('exit', (code, signal) => {
  console.error(`[next] Exited with code=${code}, signal=${signal}`);
  nextReady = false;
  // Restart Next.js after a short delay
  setTimeout(() => {
    console.log('[next] Restarting...');
    // Re-spawn is complex; just exit and let platform restart the whole thing
    process.exit(1);
  }, 1000);
});

// ── 3. Poll Next.js until it's ready ───────────────────────────────────
function checkNextReady() {
  const req = http.request(
    { hostname: '127.0.0.1', port: NEXT_PORT, path: '/', method: 'GET', timeout: 2000 },
    (res) => {
      res.resume(); // drain
      if (!nextReady) {
        nextReady = true;
        console.log(`[proxy] Next.js is ready on :${NEXT_PORT}`);
      }
      // Check again in 30 seconds
      setTimeout(checkNextReady, 30000);
    }
  );
  req.on('error', () => {
    // Not ready yet, check again in 1 second
    setTimeout(checkNextReady, 1000);
  });
  req.on('timeout', () => {
    req.destroy();
    setTimeout(checkNextReady, 1000);
  });
  req.end();
}

// Start polling after 2 seconds (give Next.js time to begin binding)
setTimeout(checkNextReady, 2000);

// ── 4. Keep process alive ──────────────────────────────────────────────
process.on('uncaughtException', (err) => {
  console.error('[uncaught]', err.message);
});

// Forward SIGTERM to child
process.on('SIGTERM', () => {
  nextProcess.kill('SIGTERM');
  setTimeout(() => process.exit(0), 3000);
});

process.on('SIGINT', () => {
  nextProcess.kill('SIGINT');
  setTimeout(() => process.exit(0), 3000);
});