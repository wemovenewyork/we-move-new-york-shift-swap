"use client";

import React from "react";
import { C } from "@/constants/colors";

const lb: React.CSSProperties = {
  display: "block", marginBottom: 6, fontSize: 11, fontWeight: 600,
  color: C.m, letterSpacing: 1.5, textTransform: "uppercase",
};
const subLb: React.CSSProperties = {
  display: "block", marginBottom: 4, fontSize: 9, fontWeight: 700,
  color: "rgba(255,255,255,.35)", letterSpacing: 1, textTransform: "uppercase",
};

function getToday(): string {
  // Use local date, not UTC, so EST users get the correct "today"
  const d = new Date();
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

interface TimePickerProps {
  /** 24-h "HH:mm" string. Empty string means "no value yet". */
  value: string;
  onChange: (v: string) => void;
  label: string;
  id: string;
  /** Optional YYYY-MM-DD date the time is for. When this matches today, the
   *  picker hides hours / minutes that are already in the past. */
  dateStr?: string;
}

/**
 * Two native <select> drum pickers (HR 00-23, MIN 00-59) bound together to
 * produce a 24-hour "HH:mm" string. Used everywhere we ask the operator to
 * choose a clock time — posting a swap, proposing an agreement, etc.
 *
 * Mobile browsers render native selects as scroll drums, which is exactly
 * what we want.
 */
export default function TimePicker({
  value, onChange, label, id, dateStr,
}: TimePickerProps) {
  const today = getToday();
  const isToday = !!dateStr && dateStr === today;
  const now = new Date();
  const nowH = now.getHours();
  const nowM = now.getMinutes();

  const selH = value ? value.split(":")[0] : "";
  const selM = value ? value.split(":")[1] : "";

  const commit = (h: string, m: string) => {
    if (!h || !m) { onChange(""); return; }
    onChange(`${h}:${m}`);
  };

  const selStyle: React.CSSProperties = {
    padding: "12px 8px",
    fontSize: 16,
    fontWeight: 600,
    width: "100%",
    textAlign: "center",
    paddingRight: 28,
    backgroundPosition: "right 6px center",
  };

  // When today is selected, only show hours from now onward.
  // When the current hour is selected on today, only show minutes from now+1 onward.
  const minHour = isToday ? nowH : 0;
  const minMin  = (isToday && selH !== "" && parseInt(selH, 10) === nowH) ? nowM + 1 : 0;

  // If the current selection is now in the past (e.g. date changed to today),
  // clear it so the user has to re-pick.
  const selHNum = selH !== "" ? parseInt(selH, 10) : -1;
  const selMNum = selM !== "" ? parseInt(selM, 10) : -1;
  const selIsPast =
    isToday &&
    selH !== "" &&
    (selHNum < minHour || (selHNum === nowH && selMNum < minMin));

  return (
    <div>
      <label htmlFor={`${id}-hr`} style={lb}>{label}</label>
      {selIsPast && (
        <div style={{ fontSize: 10, color: C.red, marginBottom: 4 }}>
          Selected time is in the past — please choose again
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <span style={subLb}>Hour (00–23)</span>
          <select
            id={`${id}-hr`}
            value={selIsPast ? "" : selH}
            onChange={e => commit(e.target.value, selM || "00")}
            style={selStyle}
          >
            <option value="">--</option>
            {Array.from({ length: 24 - minHour }, (_, i) => {
              const h = (i + minHour).toString().padStart(2, "0");
              return <option key={h} value={h}>{h}</option>;
            })}
          </select>
        </div>
        <div>
          <span style={subLb}>Minute</span>
          <select
            id={`${id}-min`}
            value={selIsPast ? "" : selM}
            onChange={e => commit(selH || "00", e.target.value)}
            style={selStyle}
          >
            <option value="">--</option>
            {Array.from({ length: 60 - minMin }, (_, i) => {
              const m = (i + minMin).toString().padStart(2, "0");
              return <option key={m} value={m}>{m}</option>;
            })}
          </select>
        </div>
      </div>
    </div>
  );
}
