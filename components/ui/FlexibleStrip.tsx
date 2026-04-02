"use client";

import { FlexibleOperator } from "@/types";
import { C } from "@/constants/colors";
import Icon from "./Icon";
import RepBadge from "./RepBadge";

interface Props {
  operators: FlexibleOperator[];
  onMessage: (op: FlexibleOperator) => void;
  currentUserId: string;
  isFlexible: boolean;
  onToggle: () => void;
}

export default function FlexibleStrip({ operators, onMessage, currentUserId, isFlexible, onToggle }: Props) {
  const GREEN = "#22C55E";

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Section header with toggle */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: GREEN, boxShadow: `0 0 6px ${GREEN}` }} />
          <span style={{ fontSize: 11, fontWeight: 700, color: GREEN, textTransform: "uppercase", letterSpacing: 1 }}>
            I&apos;ll Take Anything
          </span>
          {operators.length > 0 && (
            <span style={{ padding: "1px 6px", borderRadius: 6, background: `${GREEN}18`, border: `1px solid ${GREEN}33`, fontSize: 9, fontWeight: 700, color: GREEN }}>
              {operators.length}
            </span>
          )}
        </div>

        {/* My own toggle */}
        <button
          onClick={onToggle}
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 6, padding: "5px 10px", borderRadius: 10, border: `1px solid ${isFlexible ? GREEN + "44" : C.bd}`, background: isFlexible ? `${GREEN}10` : "rgba(255,255,255,.03)", cursor: "pointer" }}
        >
          <div style={{ width: 28, height: 16, borderRadius: 8, background: isFlexible ? GREEN : C.s, border: `1px solid ${isFlexible ? GREEN : C.bd}`, display: "flex", alignItems: "center", padding: "0 2px", transition: "background .2s", flexShrink: 0 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#fff", marginLeft: isFlexible ? "auto" : 0, transition: "margin .2s" }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 700, color: isFlexible ? GREEN : C.m, whiteSpace: "nowrap" }}>
            {isFlexible ? "You're in" : "Join"}
          </span>
        </button>
      </div>

      {operators.length === 0 ? (
        <div style={{ padding: "12px 14px", borderRadius: 12, background: "rgba(255,255,255,.02)", border: `1px solid rgba(255,255,255,.05)`, fontSize: 12, color: C.m, textAlign: "center" }}>
          No flexible operators right now.{" "}
          {!isFlexible && <span style={{ color: GREEN }}>Toggle &quot;Join&quot; to be the first.</span>}
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" as React.CSSProperties["WebkitOverflowScrolling"] }}>
          {operators.map(op => (
            <div
              key={op.id}
              style={{ flexShrink: 0, width: 120, padding: "10px 12px", borderRadius: 14, background: `${GREEN}08`, border: `1px solid ${GREEN}22`, display: "flex", flexDirection: "column", gap: 4 }}
            >
              {/* Avatar */}
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: `linear-gradient(135deg,${C.navy},${C.blue})`, border: `2px solid ${GREEN}44`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 2px" }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: GREEN }}>
                  {op.firstName[0]}{op.lastName[0]}
                </span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: C.white, textAlign: "center", lineHeight: 1.2 }}>
                {op.firstName}<br />{op.lastName}
              </div>
              <div style={{ display: "flex", justifyContent: "center" }}>
                <RepBadge rep={op.reputation} size="small" />
              </div>
              <button
                onClick={() => onMessage(op)}
                style={{ marginTop: 4, padding: "6px 0", borderRadius: 8, border: `1px solid ${GREEN}44`, background: `${GREEN}14`, cursor: "pointer", fontSize: 11, fontWeight: 700, color: GREEN, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}
              >
                <Icon n="msg" s={11} c={GREEN} /> Message
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
