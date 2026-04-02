"use client";

import { useId, useState } from "react";
import { Announcement } from "@/types";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";
import FocusTrap from "./FocusTrap";

interface Props {
  depotCode: string;
  onPosted: (a: Announcement) => void;
  onClose: () => void;
}

export default function PostAnnouncementModal({ depotCode, onPosted, onClose }: Props) {
  const [text, setText] = useState("");
  const [pinned, setPinned] = useState(false);
  const [expiresIn, setExpiresIn] = useState<"" | "1" | "3" | "7" | "14" | "30">("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const titleId = useId();
  const textareaId = useId();
  const expiryId = useId();

  const remaining = 600 - text.length;

  const submit = async () => {
    if (!text.trim()) { setError("Announcement text is required"); return; }
    setBusy(true);
    setError("");
    try {
      let expiresAt: string | undefined;
      if (expiresIn) {
        const d = new Date();
        d.setDate(d.getDate() + Number(expiresIn));
        expiresAt = d.toISOString();
      }
      const ann = await api.post<Announcement>(`/depots/${depotCode}/announcements`, {
        text: text.trim(),
        pinned,
        expiresAt: expiresAt ?? null,
      });
      onPosted(ann);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to post");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      role="presentation"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "flex-end", zIndex: 300 }}
      onClick={onClose}
    >
      <FocusTrap
        onEscape={onClose}
        role="dialog"
        aria-modal={true}
        aria-labelledby={titleId}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        style={{ width: "100%", background: "rgb(6,5,52)", borderRadius: "20px 20px 0 0", padding: "24px 20px 44px", maxWidth: 520, margin: "0 auto" }}
      >
        <h2 id={titleId} style={{ fontSize: 16, fontWeight: 800, color: C.white, marginBottom: 4 }}>Post Announcement</h2>
        <div style={{ fontSize: 12, color: C.m, marginBottom: 18 }}>Visible to all operators at your depot</div>

        {error && (
          <div role="alert" aria-live="assertive" style={{ padding: "10px 14px", borderRadius: 10, background: `${C.red}15`, border: `1px solid ${C.red}33`, fontSize: 12, color: C.red, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <label htmlFor={textareaId} style={{ display: "block", fontSize: 11, fontWeight: 700, color: C.m, letterSpacing: 2, textTransform: "uppercase", marginBottom: 6 }}>
          Announcement
        </label>
        <textarea
          id={textareaId}
          value={text}
          onChange={e => { setText(e.target.value); setError(""); }}
          placeholder="e.g. Division is running short on Route B46 next week — swap requests may be easier to approve."
          maxLength={600}
          rows={4}
          style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${remaining < 50 ? C.red + "66" : C.bd}`, background: "rgba(255,255,255,.04)", color: C.white, fontSize: 14, resize: "none", fontFamily: "inherit", boxSizing: "border-box", marginBottom: 4 }}
        />
        <div style={{ fontSize: 10, color: remaining < 50 ? C.red : C.m, textAlign: "right", marginBottom: 14 }}>
          {remaining} characters remaining
        </div>

        {/* Options row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
          {/* Pin toggle */}
          <button
            type="button"
            aria-pressed={pinned}
            aria-label={pinned ? "Pinned — click to unpin" : "Not pinned — click to pin"}
            onClick={() => setPinned(p => !p)}
            style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", borderRadius: 12, border: `1px solid ${pinned ? C.gold + "55" : C.bd}`, background: pinned ? `${C.gold}0d` : "rgba(255,255,255,.03)", cursor: "pointer" }}
          >
            <div aria-hidden="true" style={{ width: 30, height: 17, borderRadius: 9, background: pinned ? C.gold : C.s, border: `1px solid ${pinned ? C.gold : C.bd}`, display: "flex", alignItems: "center", padding: "0 2px", transition: "background .2s", flexShrink: 0 }}>
              <div style={{ width: 13, height: 13, borderRadius: "50%", background: "#fff", marginLeft: pinned ? "auto" : 0, transition: "margin .2s" }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: pinned ? C.gold : C.m }}>Pin it</span>
          </button>

          {/* Expiry */}
          <div>
            <label htmlFor={expiryId} style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>Expiry</label>
            <select
              id={expiryId}
              value={expiresIn}
              onChange={e => setExpiresIn(e.target.value as typeof expiresIn)}
              style={{ padding: "11px 14px", borderRadius: 12, border: `1px solid ${C.bd}`, background: "rgba(255,255,255,.04)", color: C.white, fontSize: 12, cursor: "pointer", appearance: "auto" }}
            >
              <option value="">No expiry</option>
              <option value="1">Expires in 1 day</option>
              <option value="3">Expires in 3 days</option>
              <option value="7">Expires in 1 week</option>
              <option value="14">Expires in 2 weeks</option>
              <option value="30">Expires in 30 days</option>
            </select>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10 }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: 14, borderRadius: 14, border: `1px solid ${C.bd}`, background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 600, color: C.m }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={busy || !text.trim()}
            style={{ padding: 14, borderRadius: 14, border: "none", background: `linear-gradient(135deg,${C.gold},${C.gold}cc)`, cursor: "pointer", fontSize: 14, fontWeight: 700, color: C.bg, opacity: busy || !text.trim() ? 0.6 : 1 }}
          >
            {busy ? "Posting..." : "Post Announcement"}
          </button>
        </div>
      </FocusTrap>
    </div>
  );
}
