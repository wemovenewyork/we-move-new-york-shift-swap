"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { C } from "@/constants/colors";
import Icon from "@/components/ui/Icon";

const faqs = [
  {
    q: "How do I post a swap?",
    a: "Tap \"Post a Swap\", choose your swap type, fill in your shift details, and submit. Your swap will be visible to all operators at your depot.",
  },
  {
    q: "What happens after both operators confirm?",
    a: "Once both parties tap \"Agree to Swap\", the agreement is locked and you can print a confirmation PDF to bring to your supervisor. The swap still requires supervisor approval.",
  },
  {
    q: "Can my supervisor override this?",
    a: "Yes. WMNY is a coordination tool only. All swaps must comply with your depot's official procedures and receive supervisor approval.",
  },
  {
    q: "How do Mutual Matches work?",
    a: "Post your swap and we automatically compare it against other open swaps. If your schedules complement each other, it shows up as a match.",
  },
  {
    q: "Why can't I change my home depot?",
    a: "To prevent abuse, you can only change your home depot once every 7 days. Contact an admin if you have an urgent situation.",
  },
  {
    q: "How do I report a problem?",
    a: "Use the Report button on any swap card, or tap the feedback button in the app.",
  },
];

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ borderRadius: 14, border: `1px solid ${open ? "rgba(209,173,56,.3)" : C.bd}`, background: open ? "rgba(209,173,56,.04)" : "rgba(255,255,255,.025)", marginBottom: 8, overflow: "hidden", transition: "all .2s" }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: "100%", padding: "16px 18px", background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, textAlign: "left" }}
      >
        <span style={{ fontSize: 14, fontWeight: 700, color: C.white, lineHeight: 1.4 }}>{q}</span>
        <span style={{ fontSize: 18, color: C.gold, flexShrink: 0, transition: "transform .2s", transform: open ? "rotate(45deg)" : "rotate(0deg)" }}>+</span>
      </button>
      {open && (
        <div style={{ padding: "0 18px 16px", fontSize: 13, color: "rgba(255,255,255,.7)", lineHeight: 1.7 }}>{a}</div>
      )}
    </div>
  );
}

export default function HelpPage() {
  const { user } = useAuth();
  const router = useRouter();
  const depotCode = user?.depot?.code;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(1,0,40,.8)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button
          onClick={() => router.back()}
          aria-label="Go back"
          style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          <Icon n="back" s={16} />
        </button>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: C.white }}>Help &amp; FAQ</div>
      </div>

      <main id="main-content" style={{ maxWidth: 520, margin: "0 auto", padding: "28px 20px 100px" }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, background: `linear-gradient(135deg,${C.white},${C.gold}88)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 6 }}>Frequently Asked Questions</h1>
          <p style={{ fontSize: 13, color: C.m, lineHeight: 1.6, marginBottom: 16 }}>Everything you need to know about using We Move NY.</p>
          <button
            onClick={() => router.push("/how-it-works")}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 16px", borderRadius: 14, border: `1px solid ${C.gold}33`, background: `${C.gold}08`, cursor: "pointer", width: "100%" }}
          >
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `${C.gold}18`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>▶</div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: C.white }}>How It Works</div>
              <div style={{ fontSize: 11, color: C.m }}>Step-by-step visual guide</div>
            </div>
            <div style={{ marginLeft: "auto", color: C.m, fontSize: 16 }}>›</div>
          </button>
        </div>

        {faqs.map((faq, i) => (
          <AccordionItem key={i} q={faq.q} a={faq.a} />
        ))}

        <div style={{ marginTop: 32, padding: "18px 20px", borderRadius: 16, background: "rgba(255,255,255,.03)", border: `1px solid ${C.bd}`, textAlign: "center" }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: C.white, marginBottom: 6 }}>Still need help?</div>
          <div style={{ fontSize: 12, color: C.m, lineHeight: 1.6, marginBottom: 16 }}>Use the feedback button in the app or report a swap for urgent issues.</div>
          {depotCode && (
            <button
              onClick={() => router.push(`/depot/${depotCode}`)}
              style={{ padding: "10px 24px", borderRadius: 12, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${C.gold},${C.gold}dd)`, fontSize: 13, fontWeight: 700, color: C.bg }}
            >
              Back to Depot
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
