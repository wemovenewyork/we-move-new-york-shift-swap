"use client";

import { Swap, User } from "@/types";
import { C, CM, STC, SWAP_TYPES } from "@/constants/colors";
import Icon from "./Icon";
import RepBadge from "./RepBadge";

const ft = (t?: string | null) => {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = +h;
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
};

const timeAgo = (d: string) => {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  if (s < 604800) return Math.floor(s / 86400) + "d ago";
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

interface Props {
  swap: Swap;
  user: User | null;
  onDelete?: (id: string) => void;
  onStatusChange?: (id: string, status: string) => void;
  onInterest?: (s: Swap) => void;
  onEdit?: (s: Swap) => void;
  onReport?: (s: Swap) => void;
  onSaveTemplate?: (s: Swap) => void;
  lastVisit?: number;
  onClick?: () => void;
}

export default function SwapCard({ swap: s, user, onDelete, onStatusChange, onInterest, onEdit, onReport, onSaveTemplate, lastVisit, onClick }: Props) {
  const m = CM[s.category] ?? CM.work;
  const co = SWAP_TYPES.find(x => x.id === s.category);
  const own = user && s.userId === user.id;
  const st2 = STC[s.status] ?? STC.open;
  const isNew = lastVisit && new Date(s.createdAt).getTime() > lastVisit - 3600000;

  return (
    <div
      style={{ background: "rgba(255,255,255,.03)", backdropFilter: "blur(12px)", borderRadius: 18, padding: 20, border: "1px solid rgba(255,255,255,.06)", transition: "all .3s cubic-bezier(.4,0,.2,1)", cursor: onClick ? "pointer" : "default", borderLeft: "3px solid transparent" }}
      onMouseEnter={e => { const el = e.currentTarget; el.style.transform = "translateY(-2px)"; el.style.borderColor = m.c + "33"; el.style.boxShadow = `0 8px 32px rgba(0,0,0,.3),0 0 0 1px ${m.c}15`; el.style.borderLeftColor = m.c + "44"; }}
      onMouseLeave={e => { const el = e.currentTarget; el.style.transform = ""; el.style.borderColor = "rgba(255,255,255,.06)"; el.style.boxShadow = ""; el.style.borderLeftColor = "transparent"; }}
      onClick={onClick}
    >
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontSize: 10, fontWeight: 700, color: m.c, letterSpacing: 1, textTransform: "uppercase" }}>{co?.f}</span>
          {isNew && <span style={{ padding: "1px 6px", borderRadius: 4, background: C.gold, color: C.bg, fontSize: 8, fontWeight: 800, letterSpacing: 1 }}>NEW</span>}
        </div>
        <span style={{ padding: "4px 10px", borderRadius: 20, background: st2.bg, border: `1px solid ${st2.bd}`, fontSize: 9, fontWeight: 700, color: st2.c, textTransform: "uppercase", letterSpacing: 1, boxShadow: `0 0 8px ${st2.c}15`, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: st2.c, animation: s.status === "open" ? "pulseGlow 2s ease infinite" : "none" }} />
          {s.status}
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 17, fontWeight: 700, color: C.white }}>{s.posterName}</span>
        <RepBadge rep={s.reputation} size="small" />
      </div>
      <p style={{ fontSize: 13, color: "rgba(255,255,255,.6)", lineHeight: 1.5, marginTop: 6 }}>{s.details}</p>

      {s.category === "work" && (s.run || s.startTime) && (
        <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
          {[{ l: "Run", v: s.run, r: true }, { l: "Route", v: s.route, r: true }, { l: "Start", v: s.startTime }, { l: "Clear", v: s.clearTime }, { l: "Swing Start", v: s.swingStart }, { l: "Swing End", v: s.swingEnd }].filter(t => t.v).map(t => (
            <div key={t.l} style={{ padding: "3px 8px", borderRadius: 6, background: C.blue + "12", border: `1px solid ${C.blue}22` }}>
              <div style={{ fontSize: 8, color: C.blue, letterSpacing: 1, textTransform: "uppercase" }}>{t.l}</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.white }}>{t.r ? t.v : ft(t.v ?? undefined)}</div>
            </div>
          ))}
        </div>
      )}

      {s.category === "daysoff" && (s.fromDay || s.fromDate) && (
        <div style={{ marginTop: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 6, alignItems: "center" }}>
            <div style={{ padding: "6px 10px", borderRadius: 8, background: C.gs }}>
              <div style={{ fontSize: 8, color: C.gold, textTransform: "uppercase" }}>From</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.white }}>{s.fromDay}</div>
              {s.fromDate && <div style={{ fontSize: 10, color: C.m, marginTop: 2 }}>{new Date(s.fromDate + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>}
            </div>
            <Icon n="swap" s={14} c={C.m} />
            <div style={{ padding: "6px 10px", borderRadius: 8, background: C.blue + "12" }}>
              <div style={{ fontSize: 8, color: C.blue, textTransform: "uppercase" }}>To</div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.white }}>{s.toDay}</div>
              {s.toDate && <div style={{ fontSize: 10, color: C.m, marginTop: 2 }}>{new Date(s.toDate + "T12:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>}
            </div>
          </div>
        </div>
      )}

      {s.category === "vacation" && (s.vacationHave || s.vacationWant) && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 6, marginTop: 8, alignItems: "center" }}>
          <div style={{ padding: "6px 10px", borderRadius: 8, background: "rgba(0,201,167,.08)" }}>
            <div style={{ fontSize: 8, color: "#00C9A7", textTransform: "uppercase" }}>Have</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.white }}>{s.vacationHave}</div>
          </div>
          <Icon n="swap" s={14} c={C.m} />
          <div style={{ padding: "6px 10px", borderRadius: 8, background: C.blue + "12" }}>
            <div style={{ fontSize: 8, color: C.blue, textTransform: "uppercase" }}>Want</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.white }}>{s.vacationWant}</div>
          </div>
        </div>
      )}

      <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.bd}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 11, color: C.m }}>{timeAgo(s.createdAt)}</span>
        <div style={{ display: "flex", gap: 6 }} onClick={e => e.stopPropagation()}>
          {own ? (
            <>
              {onSaveTemplate && (
                <button onClick={() => onSaveTemplate(s)} title="Save as template" aria-label="Save as template" style={{ padding: "4px 8px", borderRadius: 8, border: `1px solid ${C.gold}33`, background: C.gs, cursor: "pointer", color: C.gold, display: "flex", alignItems: "center" }}><Icon n="clk" s={13} /></button>
              )}
              {onEdit && (
                <button onClick={() => onEdit(s)} aria-label="Edit swap" style={{ padding: "4px 8px", borderRadius: 8, border: `1px solid ${C.blue}33`, background: C.blue + "12", cursor: "pointer", color: C.blue, display: "flex", alignItems: "center" }}><Icon n="edit" s={13} /></button>
              )}
              {onStatusChange && (
                <select value={s.status} onChange={e => onStatusChange(s.id, e.target.value)} style={{ padding: "4px 8px", borderRadius: 8, fontSize: 10, fontWeight: 600, width: "auto", cursor: "pointer", appearance: "auto", background: C.s, border: `1px solid ${C.bd}`, color: C.white }}>
                  <option value="open">Open</option>
                  <option value="pending">Pending</option>
                  <option value="filled">Filled</option>
                  <option value="expired">Expired</option>
                </select>
              )}
              {onDelete && (
                <button onClick={() => onDelete(s.id)} aria-label="Delete swap" style={{ padding: "4px 8px", borderRadius: 8, border: `1px solid ${C.red}33`, background: C.red + "12", cursor: "pointer", color: C.red, display: "flex", alignItems: "center" }}><Icon n="del" s={13} /></button>
              )}
            </>
          ) : (
            <>
              {onReport && (
                <button onClick={() => onReport(s)} title="Report" aria-label="Report this swap" style={{ padding: "4px 6px", borderRadius: 6, border: `1px solid ${C.bd}`, background: "transparent", cursor: "pointer", color: C.m, display: "flex", alignItems: "center", opacity: 0.5 }}><Icon n="inf" s={11} /></button>
              )}
              {s.status === "open" && onInterest && (
                <button onClick={() => onInterest(s)} style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${m.bd2}`, background: m.bg, cursor: "pointer", fontSize: 12, fontWeight: 600, color: m.c, display: "flex", alignItems: "center", gap: 4 }}>
                  I&apos;m Interested <Icon n="arr" s={12} />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
