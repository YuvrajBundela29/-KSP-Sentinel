const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const logFd = fs.openSync('/tmp/next-dev.log', 'a');

const child = spawn('node', ['server.js'], {
  cwd: path.join(__dirname, '..', '.next', 'standalone'),
  detached: true,
  stdio: ['ignore', logFd, logFd]
});

child.unref();
fs.writeFileSync('/tmp/sentinel-server.pid', String(child.pid));
console.log('Server daemon started with PID ' + child.pid);