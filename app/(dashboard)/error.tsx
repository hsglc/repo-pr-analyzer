"use client";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div style={{ padding: "2rem", maxWidth: "600px", margin: "0 auto" }}>
      <h2 style={{ color: "#dc2626", marginBottom: "1rem" }}>Bir hata oluştu</h2>
      <pre
        style={{
          background: "#fef2f2",
          padding: "1rem",
          borderRadius: "8px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          fontSize: "0.875rem",
          marginBottom: "1rem",
        }}
      >
        {error.message}
      </pre>
      <button
        onClick={reset}
        style={{
          background: "#2563eb",
          color: "white",
          padding: "0.5rem 1rem",
          borderRadius: "8px",
          border: "none",
          cursor: "pointer",
        }}
      >
        Tekrar Dene
      </button>
    </div>
  );
}
