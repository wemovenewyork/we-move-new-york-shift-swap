"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { SwapAgreement } from "@/types";
import { C } from "@/constants/colors";
import Icon from "./Icon";
import Confetti from "./Confetti";

interface Props {
  swapId: string;
  agreement: SwapAgreement | null;
  isOwner: boolean;
  currentUserId: string;
  onUpdate: (a: SwapAgreement) => void;
  onPropose: () => void;
}

const STATUS_LABELS: Record<string, string> = {
  pending: "Awaiting owner confirmation",
  userA_confirmed: "Owner confirmed — waiting for your final confirmation",
  completed: "Agreement completed",
  cancelled: "Agreement cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#F59E0B",
  userA_confirmed: "#60A5FA",
  completed: "#00C9A7",
  cancelled: "#EF4444",
};

export default function AgreementPanel({ swapId, agreement, isOwner, currentUserId, onUpdate, onPropose }: Props) {
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [showConfetti, setShowConfetti] = useState(false);

  const act = async (action: "confirm" | "cancel") => {
    setBusy(true);
    setError("");
    try {
      const updated = await api.patch<SwapAgreement>(`/swaps/${swapId}/agreement`, { action, note: note || undefined });
      if (updated.status === "completed") setShowConfetti(true);
      onUpdate(updated);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Action failed");
    } finally { setBusy(false); }
  };

  if (!agreement) {
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
          Both operators must confirm — creates a timestamped record you can show your dispatcher.
        </div>
      </div>
    );
  }

  const color = STATUS_COLORS[agreement.status] ?? C.m;
  const isInitiator = agreement.userAId === currentUserId;
  const canConfirm = (isOwner && agreement.status === "pending") || (isInitiator && agreement.status === "userA_confirmed");
  const canCancel = agreement.status !== "completed" && agreement.status !== "cancelled";
  const isActive = agreement.status !== "completed" && agreement.status !== "cancelled";

  return (
    <div style={{ marginTop: 16, background: "rgba(255,255,255,.03)", borderRadius: 16, padding: 18, border: `1px solid ${color}22` }}>
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Icon n="shield" s={16} c={color} />
        <span style={{ fontSize: 12, fontWeight: 700, color: color, textTransform: "uppercase", letterSpacing: 1 }}>Swap Agreement</span>
        <span style={{ marginLeft: "auto", padding: "3px 10px", borderRadius: 20, background: color + "18", border: `1px solid ${color}33`, fontSize: 10, fontWeight: 700, color }}>{agreement.status.replace("_", " ").toUpperCase()}</span>
      </div>

      <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)", marginBottom: 12, lineHeight: 1.5 }}>
        {STATUS_LABELS[agreement.status]}
      </div>

      {/* Parties */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,.04)" }}>
          <div style={{ fontSize: 9, color: C.m, textTransform: "uppercase", marginBottom: 2 }}>Proposer</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.white }}>
            {agreement.userA ? `${agreement.userA.firstName} ${agreement.userA.lastName}` : "—"}
          </div>
          {agreement.userAAt && <div style={{ fontSize: 9, color: "#00C9A7", marginTop: 2 }}>✓ Signed</div>}
        </div>
        <Icon n="swap" s={16} c={C.m} />
        <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,.04)" }}>
          <div style={{ fontSize: 9, color: C.m, textTransform: "uppercase", marginBottom: 2 }}>Owner</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: C.white }}>
            {agreement.userB ? `${agreement.userB.firstName} ${agreement.userB.lastName}` : "—"}
          </div>
          {agreement.userBAt && <div style={{ fontSize: 9, color: "#00C9A7", marginTop: 2 }}>✓ Signed</div>}
        </div>
      </div>

      {/* Notes */}
      {agreement.userANote && (
        <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,.02)", marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: C.m, textTransform: "uppercase", marginBottom: 2 }}>Proposer note</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)" }}>{agreement.userANote}</div>
        </div>
      )}
      {agreement.userBNote && (
        <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(255,255,255,.02)", marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: C.m, textTransform: "uppercase", marginBottom: 2 }}>Owner note</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,.7)" }}>{agreement.userBNote}</div>
        </div>
      )}

      {/* Completed at */}
      {agreement.completedAt && (
        <div style={{ padding: "8px 12px", borderRadius: 10, background: "rgba(0,201,167,.06)", border: "1px solid rgba(0,201,167,.2)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <Icon n="chk" s={14} c="#00C9A7" />
          <span style={{ fontSize: 11, color: "#00C9A7" }}>Completed on {new Date(agreement.completedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
        </div>
      )}

      {error && <div role="alert" aria-live="assertive" style={{ padding: "8px 12px", borderRadius: 10, background: "#EF444415", border: "1px solid #EF444433", fontSize: 12, color: "#EF4444", marginBottom: 10 }}>{error}</div>}

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
