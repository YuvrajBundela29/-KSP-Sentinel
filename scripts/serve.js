#!/usr/bin/env node
// Keep-alive wrapper for Next.js standalone server
// Restarts the server automatically if it crashes

const { spawn } = require('child_process');
const path = require('path');

const STANDALONE_DIR = path.resolve(__dirname, '../.next/standalone');
const MAX_RESTARTS = 50;
const RESTART_DELAY = 1000;

let restartCount = 0;

function startServer() {
  if (restartCount >= MAX_RESTARTS) {
    console.error(`Max restarts (${MAX_RESTARTS}) reached, exiting.`);
    process.exit(1);
  }

  const child = spawn(process.execPath, [path.join(STANDALONE_DIR, 'server.js')], {
    cwd: STANDALONE_DIR,
    env: { ...process.env, NODE_ENV: 'production', PORT: '3000', HOSTNAME: '0.0.0.0' },
    stdio: ['inherit', 'inherit', 'inherit'],
  });

  child.on('exit', (code, signal) => {
    console.log(`[keeper] Server exited with code=${code} signal=${signal}. Restart ${++restartCount}/${MAX_RESTARTS}`);
    setTimeout(startServer, RESTART_DELAY);
  });

  child.on('error', (err) => {
    console.error(`[keeper] Server error:`, err.message);
    setTimeout(startServer, RESTART_DELAY);
  });

  // Forward signals
  ['SIGTERM', 'SIGINT'].forEach(sig => {
    process.on(sig, () => {
      child.kill(sig);
      setTimeout(() => process.exit(0), 2000);
    });
  });
}

console.log('[keeper] Starting Next.js standalone server with auto-restart...');
startServer();