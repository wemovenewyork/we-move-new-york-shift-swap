"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { Depot, Swap } from "@/types";
import { C, CM, SWAP_TYPES } from "@/constants/colors";
import DepotBadge from "@/components/ui/DepotBadge";
import Icon from "@/components/ui/Icon";
import Toast from "@/components/ui/Toast";

const lb: React.CSSProperties = { display: "block", marginBottom: 8, fontSize: 12, fontWeight: 600, color: C.m, letterSpacing: 2, textTransform: "uppercase" };

const DAYS = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];

function getDayFromDate(dateStr: string): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T12:00");
  return DAYS[d.getDay() === 0 ? 6 : d.getDay() - 1] ?? "";
}

interface FormState {
  category: "work" | "daysoff" | "vacation";
  details: string; contact: string;
  date: string; run: string; route: string;
  startTime: string; clearTime: string; swingStart: string; swingEnd: string;
  fromDate: string; toDate: string;
  vacationHave: string; vacationWant: string;
}

function ShiftFields({ f, sF }: { f: FormState; sF: (v: FormState) => void }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
      <div><label style={lb}>Run</label><input value={f.run} onChange={e => sF({ ...f, run: e.target.value })} placeholder="401" /></div>
      <div><label style={lb}>Route</label><input value={f.route} onChange={e => sF({ ...f, route: e.target.value })} placeholder="Bx1" /></div>
      <div><label style={lb}>Start Time</label><input type="time" value={f.startTime} onChange={e => sF({ ...f, startTime: e.target.value })} /></div>
      <div><label style={lb}>Clear Time</label><input type="time" value={f.clearTime} onChange={e => sF({ ...f, clearTime: e.target.value })} /></div>
      <div><label style={lb}>Swing Start</label><input type="time" value={f.swingStart} onChange={e => sF({ ...f, swingStart: e.target.value })} /></div>
      <div><label style={lb}>Swing End</label><input type="time" value={f.swingEnd} onChange={e => sF({ ...f, swingEnd: e.target.value })} /></div>
    </div>
  );
}

export default function PostSwapPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ code: string }>();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const code = params.code;

  const [depot, setDepot] = useState<Depot | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [f, sF] = useState<FormState>({ category: "work", details: "", contact: "", date: "", run: "", route: "", startTime: "", clearTime: "", swingStart: "", swingEnd: "", fromDate: "", toDate: "", vacationHave: "", vacationWant: "" });

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!code) return;
    api.get<Depot>(`/depots/${code}`).then(setDepot).catch(() => router.replace("/depots"));
    if (editId) {
      api.get<Swap>(`/swaps/${editId}`).then(sw => {
        sF({
          category: sw.category,
          details: sw.details,
          contact: sw.contact ?? "",
          date: sw.date ? sw.date.split("T")[0] : "",
          run: sw.run ?? "",
          route: sw.route ?? "",
          startTime: sw.startTime ?? "",
          clearTime: sw.clearTime ?? "",
          swingStart: sw.swingStart ?? "",
          swingEnd: sw.swingEnd ?? "",
          fromDate: sw.fromDate ? sw.fromDate.split("T")[0] : "",
          toDate: sw.toDate ? sw.toDate.split("T")[0] : "",
          vacationHave: sw.vacationHave ?? "",
          vacationWant: sw.vacationWant ?? "",
        });
      }).catch(() => {});
    }
  }, [code, editId, router]);

  const fromDay = getDayFromDate(f.fromDate);
  const toDay = getDayFromDate(f.toDate);

  const validate = () => {
    if (!f.details.trim()) return false;
    if (f.category === "work" && !f.date) return false;
    if (f.category === "daysoff" && !f.fromDate) return false;
    if (f.category === "vacation" && (!f.vacationHave || !f.vacationWant)) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!validate()) { setShowErrors(true); return; }
    setSubmitting(true);
    try {
      const payload = {
        category: f.category,
        details: f.details.trim(),
        contact: f.contact.trim() || undefined,
        date: f.category === "work" ? f.date : undefined,
        run: f.run || undefined,
        route: f.route || undefined,
        startTime: f.startTime || undefined,
        clearTime: f.clearTime || undefined,
        swingStart: f.swingStart || undefined,
        swingEnd: f.swingEnd || undefined,
        fromDay: f.category === "daysoff" ? fromDay : undefined,
        fromDate: f.category === "daysoff" ? f.fromDate : undefined,
        toDay: f.category === "daysoff" ? toDay : undefined,
        toDate: f.category === "daysoff" ? f.toDate : undefined,
        vacationHave: f.category === "vacation" ? f.vacationHave : undefined,
        vacationWant: f.category === "vacation" ? f.vacationWant : undefined,
      };

      if (editId) {
        await api.put(`/swaps/${editId}`, payload);
        showToast("Swap updated!");
      } else {
        await api.post("/swaps", payload);
        showToast("Swap posted!");
      }
      setTimeout(() => router.push(`/depot/${code}/swaps`), 600);
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : "Failed to post swap");
    } finally { setSubmitting(false); }
  };

  if (!depot) return null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(1,0,40,.75)", borderBottom: `1px solid ${C.bd}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.push(`/depot/${code}`)} aria-label="Go back" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n="back" s={16} /></button>
        <DepotBadge depot={depot} size={38} />
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: C.white }}>{depot.name}</div>
      </div>

      <main id="main-content" style={{ maxWidth: 480, margin: "0 auto", padding: "24px 20px 50px" }}>
        <h2 style={{ fontSize: 26, fontWeight: 800, background: `linear-gradient(135deg,${C.white},${C.gold}88)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 16 }}>
          {editId ? "Edit Swap" : "Post a Swap"}
        </h2>

        <div style={{ display: "grid", gap: 16 }}>
          {/* Swap type */}
          <div>
            <label style={lb}>Swap Type</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
              {SWAP_TYPES.map(sc => {
                const sel = f.category === sc.id;
                const m = CM[sc.id as keyof typeof CM];
                return (
                  <button key={sc.id} onClick={() => sF({ ...f, category: sc.id as FormState["category"] })} style={{ padding: "14px 10px", borderRadius: 14, border: "none", cursor: "pointer", textAlign: "center", background: sel ? m.bg : C.s, boxShadow: sel ? `inset 0 0 0 2px ${m.c}` : `inset 0 0 0 1px ${C.bd}` }}>
                    <div style={{ display: "flex", justifyContent: "center", marginBottom: 6, color: sel ? m.c : C.m }}><Icon n={sc.ic} s={20} /></div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: sel ? m.c : C.m }}>{sc.l}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Work fields */}
          {f.category === "work" && (
            <>
              <div>
                <label style={lb}>Date {showErrors && !f.date && <span style={{ color: C.red, fontSize: 10 }}>Required</span>}</label>
                <input type="date" value={f.date} onChange={e => sF({ ...f, date: e.target.value })} style={showErrors && !f.date ? { borderColor: C.red + "66" } : {}} />
              </div>
              <div style={{ background: "rgba(2,73,181,.04)", borderRadius: 16, border: "1px solid rgba(2,73,181,.12)", padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12 }}>Shift Details</div>
                <ShiftFields f={f} sF={sF} />
              </div>
            </>
          )}

          {/* Days off fields */}
          {f.category === "daysoff" && (
            <>
              <div style={{ background: "rgba(209,173,56,.04)", borderRadius: 16, border: "1px solid rgba(209,173,56,.12)", padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
                  Swapping From (Day You Are Working)
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={lb}>Date {showErrors && !f.fromDate && <span style={{ color: C.red, fontSize: 10 }}>Required</span>}</label>
                  <input type="date" value={f.fromDate} onChange={e => sF({ ...f, fromDate: e.target.value })} style={showErrors && !f.fromDate ? { borderColor: C.red + "66" } : {}} />
                  {fromDay && <div style={{ fontSize: 12, color: C.gold, marginTop: 6, fontWeight: 600 }}>📅 {fromDay}</div>}
                </div>
                <ShiftFields f={f} sF={sF} />
              </div>
              <div style={{ background: "rgba(2,73,181,.04)", borderRadius: 16, border: "1px solid rgba(2,73,181,.12)", padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>
                  Swapping To (Day You Want To Work)
                </div>
                <label style={lb}>Date</label>
                <input type="date" value={f.toDate} onChange={e => sF({ ...f, toDate: e.target.value })} />
                {toDay && <div style={{ fontSize: 12, color: C.blue, marginTop: 6, fontWeight: 600 }}>📅 {toDay}</div>}
              </div>
            </>
          )}

          {/* Vacation fields */}
          {f.category === "vacation" && (
            <>
              <div style={{ background: "rgba(0,201,167,.04)", borderRadius: 16, border: "1px solid rgba(0,201,167,.12)", padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#00C9A7", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Vacation Week You Have</div>
                <select value={f.vacationHave} onChange={e => sF({ ...f, vacationHave: e.target.value })} style={{ appearance: "auto", cursor: "pointer" }}>
                  <option value="">Select week...</option>
                  {Array.from({ length: 52 }, (_, i) => <option key={i} value={`Week ${i + 1}`}>Week {i + 1}</option>)}
                </select>
              </div>
              <div style={{ background: "rgba(2,73,181,.04)", borderRadius: 16, border: "1px solid rgba(2,73,181,.12)", padding: 18 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.blue, letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Vacation Week You Want</div>
                <select value={f.vacationWant} onChange={e => sF({ ...f, vacationWant: e.target.value })} style={{ appearance: "auto", cursor: "pointer" }}>
                  <option value="">Select week...</option>
                  {Array.from({ length: 52 }, (_, i) => <option key={i} value={`Week ${i + 1}`}>Week {i + 1}</option>)}
                </select>
              </div>
            </>
          )}

          {/* Details */}
          <div>
            <label style={lb}>
              Details {showErrors && !f.details.trim() && <span style={{ color: C.red, fontSize: 10 }}>Required</span>}
            </label>
            <textarea value={f.details} onChange={e => sF({ ...f, details: e.target.value })} placeholder="Details about this swap..." rows={3} style={{ resize: "vertical", ...(showErrors && !f.details.trim() ? { borderColor: C.red + "66" } : {}) }} maxLength={500} />
            <div style={{ fontSize: 10, color: f.details.length > 450 ? C.red : C.m, textAlign: "right", marginTop: 4 }}>{f.details.length}/500</div>
          </div>

          {/* Contact */}
          <div>
            <label style={lb}>Contact (optional)</label>
            <input value={f.contact} onChange={e => sF({ ...f, contact: e.target.value })} placeholder="Phone or see dispatcher" />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 10, marginTop: 8 }}>
            <button onClick={() => router.push(`/depot/${code}`)} style={{ padding: 16, borderRadius: 14, border: `1px solid ${C.bd}`, background: "transparent", color: C.m, cursor: "pointer", fontSize: 15, fontWeight: 600 }}>Cancel</button>
            <button onClick={handleSubmit} disabled={submitting} style={{ padding: 16, borderRadius: 14, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${C.gold},${C.gold}dd)`, fontSize: 15, fontWeight: 700, color: C.bg, opacity: submitting ? 0.7 : 1 }}>
              {submitting ? "Saving..." : editId ? "Save Changes" : "Publish Swap"}
            </button>
          </div>
        </div>
      </main>
      {toast && <Toast message={toast} />}
    </div>
  );
}
