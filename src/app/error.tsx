"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      style={{
        margin: 0,
        padding: "40px",
        background: "#05070A",
        color: "#00FF66",
        fontFamily: "monospace",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div style={{ maxWidth: 800, width: "100%" }}>
        <h2
          style={{
            color: "#ff4444",
            fontSize: 18,
            marginBottom: 16,
            fontFamily: "monospace",
          }}
        >
          ROUTE ERROR
        </h2>
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, marginBottom: 24 }}>
          Error details:
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
    </div>
  );
}