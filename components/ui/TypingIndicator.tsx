"use client";

export default function TypingIndicator() {
  return (
    <>
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-6px); }
        }
      `}</style>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
        {[0, 150, 300].map((delay, i) => (
          <div
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.5)",
              animation: `typingBounce 1s ease infinite`,
              animationDelay: `${delay}ms`,
            }}
          />
        ))}
      </div>
    </>
  );
}
