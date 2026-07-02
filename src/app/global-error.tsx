"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en" className="dark">
      <body
        style={{
          margin: 0,
          padding: "40px",
          background: "#05070A",
          color: "#00FF66",
          fontFamily: "monospace",
          minHeight: "100vh",
        }}
      >
        <div style={{ maxWidth: 800 }}>
          <h2
            style={{
              color: "#ff4444",
              fontSize: 18,
              marginBottom: 16,
              fontFamily: "monospace",
            }}
          >
            CLIENT-SIDE EXCEPTION DETECTED
          </h2>
          <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginBottom: 24 }}>
            An unhandled error occurred during page hydration or rendering.
            Error details below for debugging:
          </p>
          <pre
            style={{
              background: "#0D1117",
              border: "1px solid rgba(0,255,102,0.15)",
              borderRadius: 4,
              padding: 16,
              overflow: "auto",
              fontSize: 12,
              color: "#ff4444",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              lineHeight: 1.6,
            }}
          >
            {error.message}
            {"\n\n"}
            {error.stack}
          </pre>
          {error.digest && (
            <p
              style={{
                color: "rgba(255,255,255,0.35)",
                fontSize: 11,
                marginTop: 12,
              }}
            >
              Digest: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            style={{
              marginTop: 24,
              padding: "10px 24px",
              background: "rgba(0,255,102,0.1)",
              color: "#00FF66",
              border: "1px solid rgba(0,255,102,0.3)",
              borderRadius: 4,
              cursor: "pointer",
              fontFamily: "monospace",
              fontSize: 13,
            }}
          >
            TRY AGAIN
          </button>
        </div>

        {/* Capture any further errors */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.onerror = function(msg, url, line, col, err) {
                var d = document.createElement('div');
                d.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#ff4444;color:#fff;padding:12px;font-family:monospace;font-size:12px;z-index:99999;white-space:pre-wrap;max-height:40vh;overflow:auto;';
                d.textContent = 'RUNTIME ERROR: ' + msg + '\\nSource: ' + url + ':' + line + ':' + col + '\\nStack: ' + (err && err.stack ? err.stack : 'N/A');
                document.body.appendChild(d);
                return false;
              };
              window.addEventListener('unhandledrejection', function(e) {
                var d = document.createElement('div');
                d.style.cssText = 'position:fixed;bottom:0;left:0;right:0;background:#FF6B00;color:#fff;padding:12px;font-family:monospace;font-size:12px;z-index:99999;white-space:pre-wrap;max-height:40vh;overflow:auto;';
                d.textContent = 'UNHANDLED PROMISE: ' + (e.reason && e.reason.message || e.reason || 'Unknown');
                document.body.appendChild(d);
              });
            `,
          }}
        />
      </body>
    </html>
  );
}