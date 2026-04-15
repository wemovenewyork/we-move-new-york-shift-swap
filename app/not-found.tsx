import Link from "next/link";

export default function NotFound() {
  return (
    <main
      id="main-content"
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
            fontSize: 64,
            marginBottom: 16,
            lineHeight: 1,
          }}
        >
          🚌
        </div>
        <h1
          style={{
            fontSize: 22,
            fontWeight: 800,
            color: "#fff",
            margin: "0 0 12px",
          }}
        >
          Page not found
        </h1>
        <p
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,.6)",
            margin: "0 0 28px",
            lineHeight: 1.6,
          }}
        >
          This page doesn&apos;t exist or was moved. Head back to the swap
          board.
        </p>
        <Link
          href="/depots"
          style={{
            display: "block",
            padding: "14px 20px",
            borderRadius: 14,
            background: "linear-gradient(135deg,#D1AD38,#D1AD38dd)",
            fontSize: 15,
            fontWeight: 700,
            color: "#010028",
            textDecoration: "none",
          }}
        >
          Back to swap board
        </Link>
      </div>
    </main>
  );
}
