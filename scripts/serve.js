// Custom server that serves pre-rendered HTML for / and delegates API to Next.js
// This works around a Turbopack standalone build chunk hash inconsistency bug

const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = parseInt(process.env.PORT || "3000", 10);
const NEXT_PORT = PORT + 1; // Next.js runs on a different port internally

const STANDALONE_DIR = path.resolve(__dirname, "..", ".next", "standalone");
const STATIC_DIR = path.join(STANDALONE_DIR, ".next", "static");
const PRERENDER_DIR = path.join(STANDALONE_DIR, ".next", "server", "app");
const PUBLIC_DIR = path.join(STANDALONE_DIR, "public");

const MIME_TYPES = {
  ".js": "application/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ico": "image/x-icon",
  ".map": "application/json",
};

// Start the Next.js standalone server on an internal port
const { fork } = require("child_process");
const nextServer = fork(path.join(STANDALONE_DIR, "server.js"), [], {
  env: { ...process.env, PORT: String(NEXT_PORT) },
  stdio: ["pipe", "pipe", "pipe", "ipc"],
});

nextServer.stdout.on("data", (d) => process.stdout.write(d));
nextServer.stderr.on("data", (d) => process.stderr.write(d));

const MIME = (ext) => MIME_TYPES[ext] || "application/octet-stream";

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  // 1. Serve static chunks
  if (url.pathname.startsWith("/_next/static/")) {
    const relative = url.pathname.replace("/_next/static/", "");
    const filePath = path.join(STATIC_DIR, relative);
    if (fs.existsSync(filePath)) {
      const ext = path.extname(filePath);
      res.writeHead(200, {
        "Content-Type": MIME(ext),
        "Cache-Control": "public, max-age=31536000, immutable",
      });
      return fs.createReadStream(filePath).pipe(res);
    }
  }

  // 2. Serve public files (favicon, etc.)
  if (!url.pathname.startsWith("/_next") && !url.pathname.startsWith("/api")) {
    const publicPath = path.join(PUBLIC_DIR, url.pathname);
    if (fs.existsSync(publicPath) && !fs.statSync(publicPath).isDirectory()) {
      const ext = path.extname(publicPath);
      res.writeHead(200, { "Content-Type": MIME(ext) });
      return fs.createReadStream(publicPath).pipe(res);
    }
  }

  // 3. Serve pre-rendered HTML for /
  if (url.pathname === "/" || url.pathname === "") {
    const htmlPath = path.join(PRERENDER_DIR, "index.html");
    if (fs.existsSync(htmlPath)) {
      res.writeHead(200, { "Content-Type": "text/html" });
      return fs.createReadStream(htmlPath).pipe(res);
    }
  }

  // 4. Proxy everything else to the Next.js server
  const proxyReq = http.request(
    {
      hostname: "localhost",
      port: NEXT_PORT,
      path: url.pathname + url.search,
      method: req.method,
      headers: req.headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    }
  );
  proxyReq.on("error", (err) => {
    console.error("Proxy error:", err.message);
    res.writeHead(502);
    res.end("Bad Gateway");
  });
  req.pipe(proxyReq);
});

server.listen(PORT, () => {
  console.log(`> Custom server ready on http://localhost:${PORT}`);
  console.log(`> Next.js internal on http://localhost:${NEXT_PORT}`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  nextServer.kill("SIGTERM");
  server.close(() => process.exit(0));
});