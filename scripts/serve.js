#!/usr/bin/env node
// KSP Sentinel — Port proxy wrapper
// Next.js standalone server cannot bind to port 3000 in this environment,
// so we run it on port 3999 and proxy port 3000 -> 3999.

const http = require('http');
const path = require('path');

const NEXT_PORT = 3999;
const PROXY_PORT = 3000;

// ── 1. Start Next.js standalone server on port 3999 (in-process) ─────
process.env.NODE_ENV = 'production';
process.env.PORT = String(NEXT_PORT);
process.env.HOSTNAME = '0.0.0.0';

const standaloneDir = path.join(__dirname, '..', '.next', 'standalone');
process.chdir(standaloneDir);
require(path.join(standaloneDir, 'server.js'));

// ── 2. Start proxy on port 3000 after Next.js initializes ───────────
setTimeout(() => {
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
        res.end('<html><body><h2>KSP Sentinel — Loading, please refresh...</h2></body></html>');
      }
    });
    req.pipe(proxyReq);
  });

  proxy.listen(PROXY_PORT, '0.0.0.0', () => {
    console.log(`[proxy] Listening on :${PROXY_PORT} -> Next.js on :${NEXT_PORT}`);
  });

  // Keep process alive on proxy errors
  proxy.on('error', (err) => {
    console.error(`[proxy] Error: ${err.message}`);
  });
}, 3000);

// Prevent process from exiting
process.on('uncaughtException', (err) => {
  console.error('[uncaught]', err.message);
});