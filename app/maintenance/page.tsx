export default function MaintenancePage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, textAlign: "center" }}>
      <div>
        <div style={{ width: 56, height: 56, borderRadius: 16, background: "linear-gradient(135deg,#010028,#0a1f6e)", border: "2px solid #C9A84C", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
          <span style={{ fontSize: 10, fontWeight: 800, color: "#C9A84C", lineHeight: 1.1, textAlign: "center" }}>WM<br />NY</span>
        </div>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#fff", marginBottom: 10 }}>Down for Maintenance</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,.55)", maxWidth: 320, margin: "0 auto", lineHeight: 1.6 }}>
          We Move New York is temporarily offline for scheduled maintenance. We&apos;ll be back shortly.
        </p>
      </div>
    </div>
  );
}
