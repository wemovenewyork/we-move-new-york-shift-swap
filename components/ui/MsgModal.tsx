"use client";

import { useId, useState } from "react";
import { Swap } from "@/types";
import { C } from "@/constants/colors";
import Icon from "./Icon";
import FocusTrap from "./FocusTrap";

interface Props {
  swap: Swap;
  onSend: (swap: Swap, text: string) => void;
  onClose: () => void;
}

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: C.m, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

const inp: React.CSSProperties = { width: "100%", background: "rgba(255,255,255,.05)", border: `1px solid rgba(255,255,255,.1)`, borderRadius: 10, padding: "10px 13px", fontSize: 14, color: C.white, fontFamily: "inherit", boxSizing: "border-box", outline: "none" };
const sel: React.CSSProperties = { ...inp, cursor: "pointer", appearance: "none", WebkitAppearance: "none" };

export default function MsgModal({ swap, onSend, onClose }: Props) {
  const titleId = useId();

  // Work swap fields
  const [wRun, setWRun] = useState("");
  const [wRoute, setWRoute] = useState("");
  const [wStart, setWStart] = useState("");
  const [wClear, setWClear] = useState("");
  const [wSwingStart, setWSwingStart] = useState("");
  const [wSwingEnd, setWSwingEnd] = useState("");

  // Days off swap fields
  const [doFromDay, setDoFromDay] = useState("");
  const [doFromDate, setDoFromDate] = useState("");
  const [doToDay, setDoToDay] = useState("");
  const [doToDate, setDoToDate] = useState("");

  // Vacation swap fields
  const [vacHave, setVacHave] = useState("");
  const [vacWant, setVacWant] = useState("");

  // Extra note
  const [note, setNote] = useState("");

  const buildMessage = (): string => {
    const lines: string[] = ["Hi! I'm interested in your swap. Here's my schedule:"];

    if (swap.category === "work") {
      if (wRun) lines.push(`Run: ${wRun}`);
      if (wRoute) lines.push(`Route: ${wRoute}`);
      if (wStart) lines.push(`Start time: ${wStart}`);
      if (wClear) lines.push(`Clear time: ${wClear}`);
      if (wSwingStart && wSwingEnd) lines.push(`Swing: ${wSwingStart} – ${wSwingEnd}`);
      else if (wSwingStart) lines.push(`Swing start: ${wSwingStart}`);
    } else if (swap.category === "daysoff") {
      if (doFromDay || doFromDate) lines.push(`I have: ${[doFromDay, doFromDate].filter(Boolean).join(" ")}`);
      if (doToDay || doToDate) lines.push(`I want: ${[doToDay, doToDate].filter(Boolean).join(" ")}`);
    } else if (swap.category === "vacation") {
      if (vacHave) lines.push(`I have: ${vacHave}`);
      if (vacWant) lines.push(`I want: ${vacWant}`);
    }

    if (note.trim()) lines.push(`\n${note.trim()}`);
    return lines.join("\n");
  };

  const scheduleEmpty = () => {
    if (swap.category === "work") return !wRun && !wRoute && !wStart && !wClear;
    if (swap.category === "daysoff") return !doFromDay && !doFromDate && !doToDay && !doToDate;
    if (swap.category === "vacation") return !vacHave && !vacWant;
    return false;
  };

  const canSend = !scheduleEmpty();

  const handleSend = () => {
    if (!canSend) return;
    onSend(swap, buildMessage());
  };

  return (
    <div
      role="presentation"
      style={{ position: "fixed", inset: 0, zIndex: 400, background: "rgba(0,0,0,.75)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onClick={onClose}
    >
      <FocusTrap
        onEscape={onClose}
        role="dialog"
        aria-modal={true}
        aria-labelledby={titleId}
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
        style={{ background: "rgb(4,3,45)", backdropFilter: "blur(24px)", borderRadius: "24px 24px 0 0", border: "1px solid rgba(255,255,255,.08)", padding: "24px 20px 40px", maxWidth: 480, width: "100%", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 -24px 80px rgba(0,0,0,.5)", animation: "fadeUp .3s ease" }}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
          <h3 id={titleId} style={{ fontSize: 17, fontWeight: 800, color: C.white, margin: 0 }}>
            <Icon n="match" s={16} c={C.gold} /> I&apos;m Interested
          </h3>
          <button onClick={onClose} aria-label="Close dialog" style={{ width: 32, height: 32, borderRadius: 8, border: `1px solid ${C.bd}`, background: C.s, color: C.m, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Icon n="back" s={14} />
          </button>
        </div>
        <div style={{ fontSize: 12, color: C.m, marginBottom: 20 }}>
          Fill in your schedule — it goes straight to <span style={{ color: C.gold, fontWeight: 700 }}>{swap.posterName}</span>
        </div>

        {/* Swap summary chip */}
        <div style={{ background: "rgba(255,255,255,.04)", borderRadius: 12, padding: "10px 14px", marginBottom: 20, border: `1px solid rgba(255,255,255,.07)` }}>
          <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, marginBottom: 2, textTransform: "uppercase", letterSpacing: 1 }}>{swap.category === "work" ? "Work Swap" : swap.category === "daysoff" ? "Days Off Swap" : "Vacation Swap"}</div>
          <div style={{ fontSize: 12, color: C.m, lineHeight: 1.5 }}>{swap.details.substring(0, 80)}{swap.details.length > 80 ? "…" : ""}</div>
        </div>

        {/* Schedule section */}
        <div style={{ fontSize: 12, fontWeight: 700, color: C.white, marginBottom: 14, textTransform: "uppercase", letterSpacing: 1.5 }}>Your Schedule</div>

        {swap.category === "work" && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <Field label="Run #">
                <input value={wRun} onChange={e => setWRun(e.target.value)} placeholder="e.g. 42" style={inp} />
              </Field>
              <Field label="Route">
                <input value={wRoute} onChange={e => setWRoute(e.target.value)} placeholder="e.g. M15" style={inp} />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <Field label="Start Time">
                <input value={wStart} onChange={e => setWStart(e.target.value)} placeholder="e.g. 6:00 AM" style={inp} />
              </Field>
              <Field label="Clear Time">
                <input value={wClear} onChange={e => setWClear(e.target.value)} placeholder="e.g. 2:30 PM" style={inp} />
              </Field>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <Field label="Swing Start">
                <input value={wSwingStart} onChange={e => setWSwingStart(e.target.value)} placeholder="Optional" style={inp} />
              </Field>
              <Field label="Swing End">
                <input value={wSwingEnd} onChange={e => setWSwingEnd(e.target.value)} placeholder="Optional" style={inp} />
              </Field>
            </div>
          </>
        )}

        {swap.category === "daysoff" && (
          <>
            <div style={{ marginBottom: 4, fontSize: 12, color: C.m }}>What are you offering?</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <Field label="Day I have">
                <select value={doFromDay} onChange={e => setDoFromDay(e.target.value)} style={sel}>
                  <option value="">Select day</option>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Date (optional)">
                <input type="date" value={doFromDate} onChange={e => setDoFromDate(e.target.value)} style={inp} />
              </Field>
            </div>
            <div style={{ marginBottom: 4, fontSize: 12, color: C.m }}>What do you want in return?</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <Field label="Day I want">
                <select value={doToDay} onChange={e => setDoToDay(e.target.value)} style={sel}>
                  <option value="">Select day</option>
                  {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Date (optional)">
                <input type="date" value={doToDate} onChange={e => setDoToDate(e.target.value)} style={inp} />
              </Field>
            </div>
          </>
        )}

        {swap.category === "vacation" && (
          <>
            <Field label="Vacation I have">
              <input value={vacHave} onChange={e => setVacHave(e.target.value)} placeholder="e.g. Week of July 14–18" style={inp} />
            </Field>
            <Field label="Vacation I want">
              <input value={vacWant} onChange={e => setVacWant(e.target.value)} placeholder="e.g. Week of Aug 4–8" style={inp} />
            </Field>
          </>
        )}

        {/* Optional note */}
        <Field label="Additional Note (optional)">
          <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Anything else you want them to know..." rows={3} maxLength={300} style={{ ...inp, resize: "none" }} />
        </Field>

        {scheduleEmpty() && (
          <div style={{ fontSize: 12, color: "#F97316", marginBottom: 10 }}>
            Fill in at least one schedule field to send.
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginTop: 4 }}>
          <button onClick={onClose} style={{ padding: 14, borderRadius: 12, border: `1px solid ${C.bd}`, background: "transparent", color: C.m, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>Cancel</button>
          <button
            onClick={handleSend}
            disabled={!canSend}
            style={{ padding: 14, borderRadius: 12, border: "none", cursor: canSend ? "pointer" : "not-allowed", background: `linear-gradient(135deg,${C.gold},${C.gold}dd)`, fontSize: 14, fontWeight: 700, color: C.bg, opacity: canSend ? 1 : 0.4 }}
          >
            Send My Schedule
          </button>
        </div>
      </FocusTrap>
    </div>
  );
}
