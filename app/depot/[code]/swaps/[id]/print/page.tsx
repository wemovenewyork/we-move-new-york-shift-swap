"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { Swap, SwapAgreement } from "@/types";

const ft = (t?: string | null) => {
  if (!t) return "—";
  const [h, m] = t.split(":");
  const hr = +h;
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
};

const fdate = (d?: string | Date | null) => {
  if (!d) return "—";
  return new Date(typeof d === "string" && !d.includes("T") ? d + "T12:00" : d)
    .toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
};

export default function PrintAgreementPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { id } = useParams<{ code: string; id: string }>();
  const [swap, setSwap] = useState<Swap | null>(null);
  const [agreement, setAgreement] = useState<SwapAgreement | null>(null);
  const [gateError, setGateError] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
    if (!loading && user && !user.depotId) router.replace("/setup-profile");
  }, [user, loading, router]);

  useEffect(() => {
    if (!id || !user) return;
    Promise.all([
      api.get<Swap>(`/swaps/${id}`),
      api.get<SwapAgreement>(`/swaps/${id}/agreement`).catch(() => null),
    ]).then(([s, a]) => {
      if (!a || a.status !== "completed") {
        setGateError("The agreement for this swap has not been confirmed yet. The PDF is only available after both parties confirm.");
        return;
      }
      setSwap(s);
      setAgreement(a);
    }).catch(() => setGateError("Could not load agreement."));
  }, [id, user]);

  useEffect(() => {
    if (swap && agreement) setTimeout(() => window.print(), 600);
  }, [swap, agreement]);

  if (gateError) return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: 480, margin: "80px auto", padding: 40, textAlign: "center", color: "#333" }}>
      <div style={{ fontSize: 40, marginBottom: 16 }}>🔒</div>
      <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 10 }}>Agreement not confirmed</div>
      <div style={{ fontSize: 13, color: "#666", lineHeight: 1.6, marginBottom: 28 }}>{gateError}</div>
      <button onClick={() => window.close()} style={{ padding: "10px 24px", borderRadius: 8, border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: 14 }}>Close</button>
    </div>
  );

  if (!swap || !agreement) return (
    <div style={{ fontFamily: "Arial, sans-serif", padding: 40, color: "#333" }}>Loading…</div>
  );

  const categoryLabel = { work: "Work Day Swap", daysoff: "Days Off Swap", vacation: "Vacation Week Swap", open_work: "Open Work" }[swap.category] ?? swap.category;

  return (
    <>
      <style>{`
        @media print {
          body { margin: 0; }
          .no-print { display: none !important; }
        }
        body { font-family: Arial, sans-serif; color: #111; background: #fff; margin: 0; }
        .page { max-width: 680px; margin: 0 auto; padding: 40px 32px; }
        h1 { font-size: 22px; margin: 0 0 4px; }
        .sub { font-size: 13px; color: #666; margin: 0 0 28px; }
        .section { margin-bottom: 24px; }
        .section-title { font-size: 10px; font-weight: 700; color: #888; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 8px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .field { background: #f8f8f8; border-radius: 8px; padding: 12px 14px; }
        .field-label { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
        .field-value { font-size: 15px; font-weight: 700; color: #111; }
        .badge { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; background: #f0f0f0; color: #333; }
        .badge.completed { background: #e8f8f0; color: #1a8a4a; }
        .badge.pending { background: #fff8e0; color: #a07000; }
        .sig-box { border: 1px dashed #ccc; border-radius: 8px; padding: 20px; min-height: 60px; margin-top: 8px; }
        .divider { border: none; border-top: 1px solid #eee; margin: 24px 0; }
        .footer { font-size: 10px; color: #bbb; text-align: center; margin-top: 40px; }
        .header-bar { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; padding-bottom: 16px; border-bottom: 2px solid #111; }
        .logo { font-weight: 900; font-size: 14px; letter-spacing: 2px; }
      `}</style>

      <div className="page">
        <div className="header-bar">
          <div className="logo">WE MOVE NEW YORK</div>
          <div style={{ fontSize: 11, color: "#888" }}>Shift Swap Agreement</div>
        </div>

        <h1>{categoryLabel}</h1>
        <p className="sub">Generated {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>

        {/* Both parties */}
        <div className="section">
          <div className="section-title">Parties</div>
          <div className="grid">
            <div className="field">
              <div className="field-label">Poster (Owner)</div>
              <div className="field-value">{agreement.userB ? `${agreement.userB.firstName} ${agreement.userB.lastName}` : swap.posterName}</div>
              {agreement.userBAt && <div style={{ fontSize: 10, color: "#1a8a4a", marginTop: 6, fontWeight: 600 }}>✓ Confirmed {new Date(agreement.userBAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>}
            </div>
            <div className="field">
              <div className="field-label">Interested Party</div>
              <div className="field-value">{agreement.userA ? `${agreement.userA.firstName} ${agreement.userA.lastName}` : "—"}</div>
              {agreement.userAAt && <div style={{ fontSize: 10, color: "#1a8a4a", marginTop: 6, fontWeight: 600 }}>✓ Confirmed {new Date(agreement.userAAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</div>}
            </div>
          </div>
        </div>

        {/* Swap details */}
        {swap.category === "work" && (
          <div className="section">
            <div className="section-title">Shift Details</div>
            <div className="grid">
              {swap.run && <div className="field"><div className="field-label">Run Number</div><div className="field-value">{swap.run}</div></div>}
              {swap.route && <div className="field"><div className="field-label">Route</div><div className="field-value">{swap.route}</div></div>}
              {swap.startTime && <div className="field"><div className="field-label">Start Time</div><div className="field-value">{ft(swap.startTime)}</div></div>}
              {swap.clearTime && <div className="field"><div className="field-label">Clear Time</div><div className="field-value">{ft(swap.clearTime)}</div></div>}
              {swap.swingStart && <div className="field"><div className="field-label">Swing In</div><div className="field-value">{ft(swap.swingStart)}</div></div>}
              {swap.swingEnd && <div className="field"><div className="field-label">Swing Out</div><div className="field-value">{ft(swap.swingEnd)}</div></div>}
              {swap.date && <div className="field"><div className="field-label">Date</div><div className="field-value">{fdate(swap.date)}</div></div>}
            </div>
          </div>
        )}

        {swap.category === "daysoff" && (
          <div className="section">
            <div className="section-title">Days Off Details</div>
            <div className="grid">
              <div className="field"><div className="field-label">Swapping From</div><div className="field-value">{swap.fromDay || "—"}{swap.fromDate ? ` · ${fdate(swap.fromDate)}` : ""}</div></div>
              <div className="field"><div className="field-label">Swapping To</div><div className="field-value">{swap.toDay || "—"}{swap.toDate ? ` · ${fdate(swap.toDate)}` : ""}</div></div>
            </div>
          </div>
        )}

        {swap.category === "vacation" && (
          <div className="section">
            <div className="section-title">Vacation Week Details</div>
            <div className="grid">
              <div className="field"><div className="field-label">Week You Have</div><div className="field-value">{swap.vacationHave || "—"}</div></div>
              <div className="field"><div className="field-label">Week You Want</div><div className="field-value">{swap.vacationWant || "—"}</div></div>
            </div>
          </div>
        )}

        <div className="section">
          <div className="section-title">Description</div>
          <div className="field"><div className="field-value" style={{ fontWeight: 400, fontSize: 13 }}>{swap.details}</div></div>
        </div>

        {swap.contact && (
          <div className="section">
            <div className="section-title">Contact</div>
            <div className="field"><div className="field-value">{swap.contact}</div></div>
          </div>
        )}

        <hr className="divider" />

        {/* Agreement */}
        <div className="section">
          <div className="section-title">Swap Agreement</div>
          {agreement ? (
            <>
              <div className="grid" style={{ marginBottom: 16 }}>
                <div className="field">
                  <div className="field-label">Status</div>
                  <div className="field-value">
                    <span className={`badge ${agreement.status === "completed" ? "completed" : "pending"}`}>
                      {agreement.status.replace("_", " ").toUpperCase()}
                    </span>
                  </div>
                </div>
                <div className="field">
                  <div className="field-label">Initiated</div>
                  <div className="field-value" style={{ fontSize: 13, fontWeight: 400 }}>{new Date(agreement.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                </div>
                {agreement.completedAt && (
                  <div className="field">
                    <div className="field-label">Completed</div>
                    <div className="field-value" style={{ fontSize: 13, fontWeight: 400 }}>{new Date(agreement.completedAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}</div>
                  </div>
                )}
              </div>
              {agreement.userANote && (
                <div className="field" style={{ marginBottom: 12 }}>
                  <div className="field-label">Interested Party&apos;s Schedule / Note</div>
                  <div className="field-value" style={{ fontWeight: 400, fontSize: 13, whiteSpace: "pre-line" }}>{agreement.userANote}</div>
                </div>
              )}
              {agreement.userBNote && (
                <div className="field" style={{ marginBottom: 12 }}>
                  <div className="field-label">Owner&apos;s Note</div>
                  <div className="field-value" style={{ fontWeight: 400, fontSize: 13 }}>{agreement.userBNote}</div>
                </div>
              )}
            </>
          ) : (
            <p style={{ color: "#888", fontSize: 13 }}>No swap agreement on file.</p>
          )}
        </div>

        <hr className="divider" />

        {/* Signature lines */}
        <div className="section">
          <div className="section-title">Signatures</div>
          <div className="grid">
            <div>
              <div className="field-label" style={{ marginBottom: 6 }}>Operator 1 Signature</div>
              <div className="sig-box" />
              <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>Print Name / Badge # / Date</div>
            </div>
            <div>
              <div className="field-label" style={{ marginBottom: 6 }}>Operator 2 Signature</div>
              <div className="sig-box" />
              <div style={{ fontSize: 11, color: "#888", marginTop: 6 }}>Print Name / Badge # / Date</div>
            </div>
          </div>
        </div>

        <div className="footer">
          We Move New York — Unofficial peer-to-peer shift swap tool — Not affiliated with the MTA or any transit union<br />
          Generated from wemoveny.app · Swap ID: {swap.id}
        </div>

        <div className="no-print" style={{ marginTop: 32, textAlign: "center" }}>
          <button onClick={() => window.print()} style={{ padding: "12px 28px", borderRadius: 12, border: "none", background: "#010028", color: "#D1AD38", fontSize: 14, fontWeight: 700, cursor: "pointer" }}>
            Save / Print PDF
          </button>
          <button onClick={() => window.close()} style={{ marginLeft: 12, padding: "12px 20px", borderRadius: 12, border: "1px solid #ccc", background: "#fff", fontSize: 14, cursor: "pointer" }}>
            Close
          </button>
        </div>
      </div>
    </>
  );
}
