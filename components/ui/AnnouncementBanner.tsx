"use client";

import { useState } from "react";
import { Announcement } from "@/types";
import { C } from "@/constants/colors";
import Icon from "./Icon";

interface Props {
  announcements: Announcement[];
  isRep: boolean;
  onDelete?: (id: string) => void;
}

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 3600) return Math.floor(s / 60) + "m ago";
  if (s < 86400) return Math.floor(s / 3600) + "h ago";
  return Math.floor(s / 86400) + "d ago";
}

export default function AnnouncementBanner({ announcements, isRep, onDelete }: Props) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const visible = announcements.filter(a => !dismissed.has(a.id));
  if (visible.length === 0) return null;

  return (
    <div style={{ display: "grid", gap: 8, marginBottom: 14 }}>
      {visible.map(a => {
        const isExpanded = expanded.has(a.id);
        const isPinned = a.pinned;
        const accentColor = isPinned ? C.gold : "#60A5FA";
        const truncate = a.body.length > 120 && !isExpanded;

        return (
          <div
            key={a.id}
            style={{
              borderRadius: 14,
              background: isPinned ? `${C.gold}0c` : "rgba(96,165,250,.08)",
              border: `1px solid ${accentColor}30`,
              borderLeft: `3px solid ${accentColor}`,
              padding: "12px 14px",
              position: "relative",
            }}
          >
            {/* Header row */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              {isPinned && (
                <span style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 9, fontWeight: 800, color: C.gold, textTransform: "uppercase", letterSpacing: 1 }}>
                  <Icon n="chk" s={10} c={C.gold} /> Pinned
                </span>
              )}
              <span style={{ fontSize: 10, fontWeight: 700, color: accentColor, textTransform: "uppercase", letterSpacing: 1 }}>
                {isPinned ? "" : "Announcement"}
              </span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: C.m }}>
                {a.author ? `${a.author.firstName} ${a.author.lastName}` : "Rep"} · {timeAgo(a.createdAt)}
              </span>
              {/* Rep delete button */}
              {isRep && onDelete && (
                <button
                  onClick={() => onDelete(a.id)}
                  aria-label="Delete announcement"
                  style={{ width: 22, height: 22, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.m, opacity: 0.6 }}
                >
                  <Icon n="del" s={12} c={C.m} />
                </button>
              )}
              {/* Dismiss button (non-reps) */}
              {!isRep && (
                <button
                  onClick={() => setDismissed(prev => new Set([...prev, a.id]))}
                  aria-label="Dismiss"
                  style={{ width: 22, height: 22, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: C.m, opacity: 0.5 }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Body */}
            <p style={{ fontSize: 13, color: "rgba(255,255,255,.85)", lineHeight: 1.6, margin: 0 }}>
              {truncate ? a.body.slice(0, 120) + "…" : a.body}
            </p>

            {a.body.length > 120 && (
              <button
                onClick={() => setExpanded(prev => {
                  const next = new Set(prev);
                  isExpanded ? next.delete(a.id) : next.add(a.id);
                  return next;
                })}
                style={{ marginTop: 4, fontSize: 11, color: accentColor, background: "none", border: "none", cursor: "pointer", padding: 0, fontWeight: 600 }}
              >
                {isExpanded ? "Show less" : "Read more"}
              </button>
            )}

            {/* Expiry */}
            {a.expiresAt && (
              <div style={{ marginTop: 6, fontSize: 10, color: C.m }}>
                Expires {new Date(a.expiresAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
