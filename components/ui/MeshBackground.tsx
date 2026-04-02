"use client";

export default function MeshBackground() {
  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, overflow: "hidden", pointerEvents: "none" }}>
      {/* Orb 1 — deep blue, top-left */}
      <div style={{
        position: "absolute", width: "70vw", height: "70vw", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(2,73,181,.55) 0%, transparent 70%)",
        top: "-20%", left: "-15%",
        animation: "meshOrb1 18s ease-in-out infinite",
        filter: "blur(40px)",
      }} />
      {/* Orb 2 — gold, top-right */}
      <div style={{
        position: "absolute", width: "55vw", height: "55vw", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(209,173,56,.3) 0%, transparent 70%)",
        top: "-10%", right: "-10%",
        animation: "meshOrb2 22s ease-in-out infinite",
        filter: "blur(50px)",
      }} />
      {/* Orb 3 — purple, center */}
      <div style={{
        position: "absolute", width: "60vw", height: "60vw", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(80,20,180,.4) 0%, transparent 70%)",
        top: "25%", left: "20%",
        animation: "meshOrb3 26s ease-in-out infinite",
        filter: "blur(60px)",
      }} />
      {/* Orb 4 — teal, bottom-left */}
      <div style={{
        position: "absolute", width: "50vw", height: "50vw", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,130,150,.35) 0%, transparent 70%)",
        bottom: "-10%", left: "-5%",
        animation: "meshOrb4 20s ease-in-out infinite",
        filter: "blur(55px)",
      }} />
      {/* Orb 5 — gold accent, bottom-right */}
      <div style={{
        position: "absolute", width: "45vw", height: "45vw", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(209,173,56,.2) 0%, transparent 70%)",
        bottom: "5%", right: "-5%",
        animation: "meshOrb5 24s ease-in-out infinite",
        filter: "blur(45px)",
      }} />
      {/* Noise texture overlay for depth */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E\")",
        backgroundRepeat: "repeat",
        backgroundSize: "200px",
        opacity: 0.4,
      }} />
    </div>
  );
}
