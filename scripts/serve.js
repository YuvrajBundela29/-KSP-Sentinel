#!/usr/bin/env node
// Robust server: custom HTTP server that serves static files directly
// and proxies dynamic requests to the Next.js standalone server.
// Auto-restarts Next.js if it crashes.

const { createServer } = require('http');
const { spawn } = require('child_process');
const { readFileSync, existsSync, statSync } = require('fs');
const { join, resolve } = require('path');

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = '0.0.0.0';
const BASE_DIR = resolve(__dirname, '..');
const STANDALONE_DIR = join(BASE_DIR, '.next', 'standalone');
const STATIC_DIR = join(BASE_DIR, '.next', 'static');
const PUBLIC_DIR = join(BASE_DIR, 'public');

// Content types for static files
const MIME_TYPES = {
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.html': 'text/html',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain',
  '.map': 'application/json',
};

let nextProcess = null;
let nextReady = false;
let restartCount = 0;
const MAX_RESTARTS = 100;

// ── Start Next.js standalone server as child process ──────────────────
function startNextServer() {
  if (restartCount >= MAX_RESTARTS) {
    console.error(`[server] Max restarts reached (${MAX_RESTARTS})`);
    return;
  }

  nextReady = false;
  const serverJs = join(STANDALONE_DIR, 'server.js');

  nextProcess = spawn(process.execPath, [serverJs], {
    cwd: STANDALONE_DIR,
    env: { ...process.env, NODE_ENV: 'production', PORT: '3001', HOSTNAME: '0.0.0.0' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  nextProcess.stdout.on('data', (data) => {
    const msg = data.toString();
    console.log(`[next] ${msg.trim()}`);
    if (msg.includes('Ready')) nextReady = true;
  });

  nextProcess.stderr.on('data', (data) => {
    console.error(`[next:err] ${data.toString().trim()}`);
  });

  nextProcess.on('exit', (code, signal) => {
    console.log(`[next] Exited code=${code} signal=${signal}. Restart ${++restartCount}/${MAX_RESTARTS}`);
    nextProcess = null;
    nextReady = false;
    setTimeout(startNextServer, 1500);
  });

  nextProcess.on('error', (err) => {
    console.error(`[next] Error: ${err.message}`);
    nextProcess = null;
    setTimeout(startNextServer, 1500);
  });
}

// ── Serve static file directly ────────────────────────────────────────
function serveStatic(res, filePath) {
  try {
    if (!existsSync(filePath)) return false;
    const stat = statSync(filePath);
    if (!stat.isFile()) return false;

    const ext = filePath.substring(filePath.lastIndexOf('.'));
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    });
    readFileSync(filePath).pipe(res);
    return true;
  } catch {
    return false;
  }
}

// ── Proxy request to Next.js on port 3001 ─────────────────────────────
function proxyToNext(req, res, body) {
  if (!nextProcess || !nextReady) {
    // If Next.js isn't ready, wait and retry once
    if (nextProcess) {
      setTimeout(() => proxyToNext(req, res, body), 2000);
      return;
    }
    res.writeHead(503, { 'Content-Type': 'text/html' });
    res.end('<html><body><h2>KSP Sentinel — Server starting, please refresh in a moment...</h2></body></html>');
    return;
  }

  const http = require('http');
  const options = {
    hostname: '127.0.0.1',
    port: 3001,
    path: req.url,
    method: req.method,
    headers: { ...req.headers, host: 'localhost:3001' },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on('error', (err) => {
    console.error(`[proxy] Error: ${err.message}`);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain' });
    }
    res.end('Bad Gateway');
  });

  if (body && body.length > 0) proxyReq.write(body);
  proxyReq.end();
}

// ── Main HTTP server on port 3000 ─────────────────────────────────────
const server = createServer((req, res) => {
  const url = req.url.split('?')[0];

  // 1. Serve _next/static/ files directly (most reliable)
  if (url.startsWith('/_next/static/')) {
    const staticPath = join(STATIC_DIR, url.replace('/_next/static/', ''));
    if (serveStatic(res, staticPath)) return;
  }

  // 2. Serve files from public/ directly
  const publicPath = join(PUBLIC_DIR, url);
  if (url !== '/' && !url.startsWith('/api') && serveStatic(res, publicPath)) return;

  // 3. Serve favicon
  if (url === '/favicon.ico') {
    if (serveStatic(res, join(PUBLIC_DIR, 'favicon.ico'))) return;
  }

  // 4. Proxy everything else (pages, API routes) to Next.js
  let body = [];
  req.on('data', chunk => body.push(chunk));
  req.on('end', () => {
    proxyToNext(req, res, Buffer.concat(body));
  });
});

server.on('error', (err) => {
  console.error(`[server] Fatal: ${err.message}`);
  process.exit(1);
});

// Start everything
startNextServer();

server.listen(PORT, HOST, () => {
  console.log(`[server] KSP Sentinel listening on http://${HOST}:${PORT}`);
  console.log(`[server] Static files served directly from ${STATIC_DIR}`);
  console.log(`[server] Next.js backend on port 3001 (auto-restart enabled)`);
});

// Graceful shutdown
['SIGTERM', 'SIGINT'].forEach(sig => {
  process.on(sig, () => {
    console.log(`[server] Received ${sig}, shutting down...`);
    if (nextProcess) nextProcess.kill(sig);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000);
  });
});