"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { Swap, SwapAgreement } from "@/types";
import { C } from "@/constants/colors";
import Icon from "./Icon";
import Confetti from "./Confetti";

interface Props {
  swap: Swap;
  agreement: SwapAgreement | null;
  isOwner: boolean;
  currentUserId: string;
  onUpdate: (a: SwapAgreement) => void;
  onPropose: () => void;
  onPrint?: () => void;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  userA_confirmed: "#60A5FA",
  completed: "#00C9A7",
  cancelled: "#EF4444",
};

function SwapSummary({ swap }: { swap: Swap }) {
  const lines: string[] = [];
  if (swap.category === "work") {
    if (swap.run) lines.push(`Run ${swap.run}`);
    if (swap.route) lines.push(`Route ${swap.route}`);
    if (swap.startTime) lines.push(`Start ${swap.startTime}`);
    if (swap.clearTime) lines.push(`Clear ${swap.clearTime}`);
  } else if (swap.category === "daysoff") {
    if (swap.fromDay) lines.push(`Has: ${swap.fromDay}${swap.fromDate ? " " + new Date(swap.fromDate + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}`);
    if (swap.toDay) lines.push(`Wants: ${swap.toDay}${swap.toDate ? " " + new Date(swap.toDate + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" }) : ""}`);
  } else if (swap.category === "vacation") {
    if (swap.vacationHave) lines.push(`Has: ${swap.vacationHave}`);
    if (swap.vacationWant) lines.push(`Wants: ${swap.vacationWant}`);
  }
  if (!lines.length) lines.push(swap.details.substring(0, 60));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      {lines.map((l, i) => (
        <div key={i} style={{ fontSize: 11, color: C.white, lineHeight: 1.4 }}>{l}</div>
      ))}
    </div>
  );
}

export default function AgreementPanel({ swap, agreement, isOwner, currentUserId, onUpdate, onPropose, onPrint }: Props) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);

  const act = async (action: "confirm" | "cancel") => {
    setBusy(true);
    setError("");
    try {
      const updated = await api.patch<SwapAgreement>(`/swaps/${swap.id}/agreement`, { action, note: note || undefined });
      if (updated.status === "completed") {
        setShowConfetti(true);
      }
      onUpdate(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally { setBusy(false); }
  };

  if (!agreement) {
    if (isOwner) return null; // Owner sees nothing until someone proposes
    return (
      <div style={{ marginTop: 16 }}>
        <button
          onClick={onPropose}
          style={{ width: "100%", padding: "16px 20px", borderRadius: 16, border: `1px solid #00C9A744`, background: "rgba(0,201,167,.08)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 15, fontWeight: 700, color: "#00C9A7" }}
        >
          <Icon n="agree" s={18} c="#00C9A7" />
          Agree to Swap
        </button>
        <div style={{ fontSize: 10, color: C.m, textAlign: "center", marginTop: 8, lineHeight: 1.5 }}>
          Creates a timestamped record both operators can show their dispatcher.
        </div>
      </div>
    );
  }

  const color = STATUS_COLORS[agreement.status] ?? C.m;
  const isInitiator = agreement.userAId === currentUserId;
  // Owner confirms to complete. Backwards-compat: initiator can still confirm if status is userA_confirmed (old records).
  const canConfirm = (isOwner && agreement.status === "pending") || (isInitiator && !isOwner && agreement.status === "userA_confirmed");
  const canCancel = agreement.status !== "completed" && agreement.status !== "cancelled";
  const isActive = agreement.status !== "completed" && agreement.status !== "cancelled";
  const isCompleted = agreement.status === "completed";

  return (
    <div style={{ marginTop: 16, background: "rgba(255,255,255,.03)", borderRadius: 16, padding: 18, border: `1px solid ${color}22` }}>
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
        <Icon n="shield" s={16} c={color} />
        <span style={{ fontSize: 12, fontWeight: 700, color: color, textTransform: "uppercase", letterSpacing: 1 }}>Swap Agreement</span>
        <span style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 20, background: color + "18", border: `1px solid ${color}33`, fontSize: 10, fontWeight: 700, color, textTransform: "uppercase", letterSpacing: 0.5 }}>
          {isCompleted ? "Taken" : agreement.status === "pending" ? "Awaiting Owner" : agreement.status === "userA_confirmed" ? "Awaiting You" : agreement.status}
        </span>
      </div>

      {/* TAKEN banner */}
      {isCompleted && (
        <div style={{ background: "rgba(0,201,167,.1)", border: "1px solid rgba(0,201,167,.3)", borderRadius: 12, padding: "14px 16px", marginBottom: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: onPrint ? 12 : 0 }}>
            <Icon n="chk" s={20} c="#00C9A7" />
            <div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "#00C9A7" }}>This swap is taken!</div>
              <div style={{ fontSize: 11, color: C.m, marginTop: 2 }}>
                Confirmed {agreement.completedAt ? new Date(agreement.completedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : ""}
              </div>
            </div>
          </div>
          {onPrint && (
            <button
              onClick={onPrint}
              style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid rgba(0,201,167,.4)", background: "rgba(0,201,167,.12)", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#00C9A7", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
              Print Agreement
            </button>
          )}
        </div>
      )}

      {/* Both parties side by side */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "stretch", marginBottom: 14 }}>
        {/* Poster's swap info */}
        <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}>
          <div style={{ fontSize: 9, color: C.m, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>Poster</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.white, marginBottom: 6 }}>
            {agreement.userB ? `${agreement.userB.firstName} ${agreement.userB.lastName}` : swap.posterName}
          </div>
          <SwapSummary swap={swap} />
          {agreement.userBAt && <div style={{ fontSize: 9, color: "#00C9A7", marginTop: 6 }}>✓ Confirmed</div>}
          {agreement.userBNote && (
            <div style={{ fontSize: 10, color: C.m, marginTop: 6, lineHeight: 1.4, borderTop: "1px solid rgba(255,255,255,.05)", paddingTop: 6 }}>{agreement.userBNote}</div>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center" }}>
          <Icon n="swap" s={16} c={color} />
        </div>

        {/* Proposer's schedule */}
        <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}>
          <div style={{ fontSize: 9, color: C.m, textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 6 }}>Interested</div>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.white, marginBottom: 6 }}>
            {agreement.userA ? `${agreement.userA.firstName} ${agreement.userA.lastName}` : "—"}
          </div>
          {agreement.userANote ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {agreement.userANote.split("\n").filter(Boolean).map((line, i) => (
                <div key={i} style={{ fontSize: 11, color: C.white, lineHeight: 1.4 }}>{line}</div>
              ))}
            </div>
          ) : (
            <div style={{ fontSize: 11, color: C.m }}>No schedule added</div>
          )}
          {agreement.userAAt && <div style={{ fontSize: 9, color: "#00C9A7", marginTop: 6 }}>✓ Confirmed</div>}
        </div>
      </div>

      {error && <div role="alert" style={{ padding: "8px 12px", borderRadius: 10, background: "#EF444415", border: "1px solid #EF444433", fontSize: 12, color: "#EF4444", marginBottom: 10 }}>{error}</div>}

      {isActive && canConfirm && (
        <div style={{ display: "grid", gap: 8 }}>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note (optional)"
            maxLength={300}
            rows={2}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.bd}`, background: "rgba(255,255,255,.04)", color: C.white, fontSize: 13, resize: "none", fontFamily: "inherit", boxSizing: "border-box" }}
          />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            <button onClick={() => act("cancel")} disabled={busy} style={{ padding: 12, borderRadius: 12, border: "1px solid #EF444433", background: "#EF444412", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#EF4444", opacity: busy ? 0.6 : 1 }}>
              <Icon n="del" s={14} c="#EF4444" /> Cancel
            </button>
            <button onClick={() => act("confirm")} disabled={busy} style={{ padding: 12, borderRadius: 12, border: "none", background: `linear-gradient(135deg,#00C9A7,#00C9A7cc)`, cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#fff", opacity: busy ? 0.6 : 1 }}>
              <Icon n="chk" s={14} c="#fff" /> Confirm
            </button>
          </div>
        </div>
      )}

      {isActive && !canConfirm && canCancel && (
        <button onClick={() => act("cancel")} disabled={busy} style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #EF444433", background: "#EF444412", cursor: "pointer", fontSize: 13, fontWeight: 600, color: "#EF4444", opacity: busy ? 0.6 : 1 }}>
          Cancel Agreement
        </button>
      )}
    </div>
  );
}
