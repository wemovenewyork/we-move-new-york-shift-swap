"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <main
      id="main-content" tabIndex={-1}
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        background: "#010028",
        fontFamily: "var(--font-poppins, sans-serif)",
      }}
    >
      <div
        style={{
          maxWidth: 400,
          width: "100%",
          textAlign: "center",
          background: "rgba(255,255,255,.02)",
          backdropFilter: "blur(16px)",
          borderRadius: 28,
          border: "1px solid rgba(255,255,255,.06)",
          padding: 40,
        }}
      >
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "rgba(255,71,87,.12)",
            border: "1px solid rgba(255,71,87,.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 24px",
            fontSize: 28,
          }}
        >
          ⚠️
        </div>

        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#fff",
            margin: "0 0 12px",
          }}
        >
          Something went wrong
        </h1>

        <p
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,.6)",
            margin: "0 0 28px",
            lineHeight: 1.6,
          }}
        >
          An unexpected error occurred. Our team has been notified. Try again
          or go back to the swap board.
        </p>

        <div style={{ display: "grid", gap: 10 }}>
          <button
            onClick={reset}
            style={{
              padding: "14px 20px",
              borderRadius: 14,
              border: "none",
              cursor: "pointer",
              background: "linear-gradient(135deg,#D1AD38,#D1AD38dd)",
              fontSize: 15,
              fontWeight: 700,
              color: "#010028",
              width: "100%",
            }}
          >
            Try again
          </button>
          <button
            onClick={() => (window.location.href = "/depots")}
            style={{
              padding: "14px 20px",
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,.1)",
              cursor: "pointer",
              background: "rgba(255,255,255,.04)",
              fontSize: 14,
              fontWeight: 600,
              color: "rgba(255,255,255,.7)",
              width: "100%",
            }}
          >
            Back to swap board
          </button>
        </div>
      </div>
    </main>
  );
}
