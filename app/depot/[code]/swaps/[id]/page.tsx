"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { Swap, SwapAgreement } from "@/types";
import { C, CM, STC, SWAP_TYPES } from "@/constants/colors";
import Icon from "@/components/ui/Icon";
import RepBadge from "@/components/ui/RepBadge";
import MsgModal from "@/components/ui/MsgModal";
import Toast from "@/components/ui/Toast";
import ConfirmModal from "@/components/ui/ConfirmModal";
import AgreementPanel from "@/components/ui/AgreementPanel";

const ft = (t?: string | null) => { if (!t) return "—"; const [h, m] = t.split(":"); const hr = +h; return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`; };
const timeAgo = (d: string) => { const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000); if (s < 60) return "just now"; if (s < 3600) return Math.floor(s/60) + "m ago"; if (s < 86400) return Math.floor(s/3600) + "h ago"; return Math.floor(s/86400) + "d ago"; };

export default function SwapDetailPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const params = useParams<{ code: string; id: string }>();
  const { code, id } = params;

  const [swap, setSwap] = useState<Swap | null>(null);
  const [agreement, setAgreement] = useState<SwapAgreement | null>(null);
  const [agreeLoaded, setAgreeLoaded] = useState(false);
  const [proposeModal, setProposeModal] = useState(false);
  const [proposeNote, setProposeNote] = useState("");
  const [proposeBusy, setProposeBusy] = useState(false);
  const [msgModal, setMsgModal] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; text: string; action: () => void } | null>(null);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!id || !user) return;
    api.get<Swap>(`/swaps/${id}`).then(setSwap).catch(() => router.replace(`/depot/${code}/swaps`));
    api.get<SwapAgreement>(`/swaps/${id}/agreement`)
      .then(setAgreement)
      .catch(() => {})
      .finally(() => setAgreeLoaded(true));
  }, [id, user, code, router]);

  const handlePropose = async () => {
    if (!id) return;
    setProposeBusy(true);
    try {
      const a = await api.post<SwapAgreement>(`/swaps/${id}/agreement`, { note: proposeNote || undefined });
      setAgreement(a);
      setProposeModal(false);
      setProposeNote("");
      showToast("Agreement proposed!");
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Failed to propose"); }
    setProposeBusy(false);
  };

  const handleSend = async (s: Swap, text: string) => {
    try {
      await api.post(`/swaps/${s.id}/interest`, { text });
      showToast("Message sent!");
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Send failed"); }
    setMsgModal(false);
  };

  const handleReport = () => {
    setConfirm({ title: "Report Swap", text: "Report this swap as inappropriate or spam?", action: async () => {
      try { await api.post(`/swaps/${id}/report`, {}); showToast("Reported. Thank you."); } catch {}
      setConfirm(null);
    }});
  };

  if (!swap) return null;
  const m = CM[swap.category] ?? CM.work;
  const co = SWAP_TYPES.find(x => x.id === swap.category);
  const st2 = STC[swap.status] ?? STC.open;
  const own = user && swap.userId === user.id;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(1,0,40,.8)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.push(`/depot/${code}/swaps`)} aria-label="Go back" style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid " + C.bd, background: C.s, color: C.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n="back" s={16} /></button>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: C.white }}>Swap Details</div>
        {!own && <button onClick={handleReport} aria-label="Report this swap" style={{ width: 36, height: 36, borderRadius: 10, border: "1px solid " + C.bd, background: C.s, color: C.m, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n="inf" s={14} /></button>}
      </div>

      <main id="main-content" style={{ maxWidth: 520, margin: "0 auto", padding: "24px 20px 100px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: m.c }}>
            <Icon n={co?.ic || "swap"} s={18} />
            <span style={{ fontSize: 13, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{co?.f}</span>
          </div>
          <span style={{ padding: "4px 12px", borderRadius: 8, background: st2.bg, border: "1px solid " + st2.bd, fontSize: 11, fontWeight: 700, color: st2.c, textTransform: "uppercase", boxShadow: "0 0 8px " + st2.c + "22", letterSpacing: 1 }}>{swap.status}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 24 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", background: `linear-gradient(135deg,${C.navy},${C.blue})`, display: "flex", alignItems: "center", justifyContent: "center", border: "2px solid " + C.gold + "44", flexShrink: 0 }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: C.gold }}>{swap.posterName.split(" ").map(w => w[0]).join("").substring(0, 2)}</span>
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: C.white }}>{swap.posterName}</div>
            <div style={{ fontSize: 12, color: C.m, marginTop: 2 }}>Posted {timeAgo(swap.createdAt)}</div>
          </div>
        </div>

        <RepBadge rep={swap.reputation} size="full" />

        <div style={{ background: "rgba(255,255,255,.03)", backdropFilter: "blur(12px)", borderRadius: 16, padding: 20, border: "1px solid rgba(255,255,255,.06)", marginBottom: 20, marginTop: 20 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: C.m, textTransform: "uppercase", letterSpacing: 2, marginBottom: 10 }}>Details</div>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,.8)", lineHeight: 1.7 }}>{swap.details}</p>
        </div>

        {swap.category === "work" && (
          <div style={{ background: "rgba(255,255,255,.03)", borderRadius: 16, padding: 20, border: "1px solid " + C.blue + "22", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
              <Icon n="tmr" s={16} c={C.blue} />
              <span style={{ fontSize: 11, fontWeight: 700, color: C.blue, textTransform: "uppercase", letterSpacing: 2 }}>Shift Details</span>
            </div>
            {/* Run + Route */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 10 }}>
              {[{ l: "Run Number", v: swap.run || "—" }, { l: "Route", v: swap.route || "—" }].map(t => (
                <div key={t.l} style={{ padding: 14, borderRadius: 12, background: C.blue + "0a", border: "1px solid " + C.blue + "18" }}>
                  <div style={{ fontSize: 10, color: C.blue, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{t.l}</div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: C.white }}>{t.v}</div>
                </div>
              ))}
            </div>
            {/* Start → Clear */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: (swap.swingStart || swap.swingEnd) ? 10 : 0 }}>
              <div style={{ flex: 1, padding: 14, borderRadius: 12, background: C.blue + "0a", border: "1px solid " + C.blue + "18" }}>
                <div style={{ fontSize: 10, color: C.blue, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Start Time</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.white }}>{ft(swap.startTime) || "—"}</div>
              </div>
              <Icon n="arr" s={18} c={C.m} />
              <div style={{ flex: 1, padding: 14, borderRadius: 12, background: C.blue + "0a", border: "1px solid " + C.blue + "18" }}>
                <div style={{ fontSize: 10, color: C.blue, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Clear Time</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: C.white }}>{ft(swap.clearTime) || "—"}</div>
              </div>
            </div>
            {/* Swing times — only shown when present */}
            {(swap.swingStart || swap.swingEnd) && (
              <div style={{ padding: 14, borderRadius: 12, background: "rgba(255,255,255,.02)", border: "1px solid " + C.blue + "18" }}>
                <div style={{ fontSize: 10, color: C.m, textTransform: "uppercase", letterSpacing: 1, marginBottom: 10 }}>Swing Break</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: C.blue, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Swing In</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.white }}>{ft(swap.swingStart) || "—"}</div>
                  </div>
                  <Icon n="arr" s={16} c={C.m} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, color: C.blue, textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>Swing Out</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: C.white }}>{ft(swap.swingEnd) || "—"}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {swap.category === "daysoff" && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "stretch", marginBottom: 14 }}>
              <div style={{ padding: 16, borderRadius: 14, background: C.gs, border: "1px solid " + C.gg }}>
                <div style={{ fontSize: 10, color: C.gold, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Swapping From</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.white }}>{swap.fromDay || "—"}</div>
                {swap.fromDate && <div style={{ fontSize: 12, color: C.m, marginTop: 4 }}>{new Date(swap.fromDate + "T12:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>}
              </div>
              <div style={{ display: "flex", alignItems: "center" }}><Icon n="swap" s={20} c={C.m} /></div>
              <div style={{ padding: 16, borderRadius: 14, background: C.blue + "12", border: "1px solid " + C.blue + "22" }}>
                <div style={{ fontSize: 10, color: C.blue, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>Swapping To</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: C.white }}>{swap.toDay || "—"}</div>
                {swap.toDate && <div style={{ fontSize: 12, color: C.m, marginTop: 4 }}>{new Date(swap.toDate + "T12:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</div>}
              </div>
            </div>
          </div>
        )}

        {swap.category === "vacation" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 10, alignItems: "stretch", marginBottom: 20 }}>
            <div style={{ padding: 20, borderRadius: 14, background: "rgba(0,201,167,.06)", border: "1px solid rgba(0,201,167,.2)", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: "#00C9A7", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Week You Have</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.white }}>{swap.vacationHave || "—"}</div>
            </div>
            <div style={{ display: "flex", alignItems: "center" }}><Icon n="swap" s={20} c={C.m} /></div>
            <div style={{ padding: 20, borderRadius: 14, background: C.blue + "12", border: "1px solid " + C.blue + "22", textAlign: "center" }}>
              <div style={{ fontSize: 10, color: C.blue, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>Week You Want</div>
              <div style={{ fontSize: 24, fontWeight: 800, color: C.white }}>{swap.vacationWant || "—"}</div>
            </div>
          </div>
        )}

        {swap.contact && (
          <div style={{ background: "rgba(255,255,255,.03)", borderRadius: 14, padding: 16, border: "1px solid rgba(255,255,255,.06)", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
            <Icon n="ph" s={18} c={C.gold} />
            <div>
              <div style={{ fontSize: 10, color: C.m, textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Contact</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: C.white }}>{swap.contact}</div>
            </div>
          </div>
        )}

        {!own && swap.status === "open" && (
          <button onClick={() => setMsgModal(true)} style={{ width: "100%", padding: 18, borderRadius: 16, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${m.c},${m.c}cc)`, fontSize: 16, fontWeight: 700, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 20px " + m.c + "33" }}>
            I&apos;m Interested <Icon n="arr" s={18} c="#fff" />
          </button>
        )}

        {!own && agreeLoaded && (
          <AgreementPanel
            swapId={swap.id}
            agreement={agreement}
            isOwner={false}
            currentUserId={user?.id ?? ""}
            onUpdate={setAgreement}
            onPropose={() => setProposeModal(true)}
          />
        )}

        {own && agreeLoaded && agreement && (
          <AgreementPanel
            swapId={swap.id}
            agreement={agreement}
            isOwner={true}
            currentUserId={user?.id ?? ""}
            onUpdate={setAgreement}
            onPropose={() => {}}
          />
        )}
      </main>

      {msgModal && swap && <MsgModal swap={swap} onSend={handleSend} onClose={() => setMsgModal(false)} />}
      {confirm && <ConfirmModal title={confirm.title} text={confirm.text} onConfirm={confirm.action} onCancel={() => setConfirm(null)} />}
      {toast && <Toast message={toast} />}

      {proposeModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.7)", display: "flex", alignItems: "flex-end", zIndex: 200 }} onClick={() => setProposeModal(false)}>
          <div style={{ width: "100%", background: "rgb(6,5,50)", borderRadius: "20px 20px 0 0", padding: "24px 20px 40px", maxWidth: 520, margin: "0 auto" }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 16, fontWeight: 800, color: C.white, marginBottom: 6 }}>Propose Formal Agreement</div>
            <div style={{ fontSize: 12, color: C.m, lineHeight: 1.6, marginBottom: 16 }}>This creates a timestamped record. Both operators must confirm to complete the swap.</div>
            <textarea
              value={proposeNote}
              onChange={e => setProposeNote(e.target.value)}
              placeholder="Add a note (optional)"
              maxLength={300}
              rows={3}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.bd}`, background: "rgba(255,255,255,.04)", color: C.white, fontSize: 14, resize: "none", fontFamily: "inherit", marginBottom: 14, boxSizing: "border-box" }}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button onClick={() => setProposeModal(false)} style={{ padding: 14, borderRadius: 14, border: `1px solid ${C.bd}`, background: "transparent", cursor: "pointer", fontSize: 14, fontWeight: 600, color: C.m }}>Cancel</button>
              <button onClick={handlePropose} disabled={proposeBusy} style={{ padding: 14, borderRadius: 14, border: "none", background: "linear-gradient(135deg,#00C9A7,#00C9A7cc)", cursor: "pointer", fontSize: 14, fontWeight: 700, color: "#fff", opacity: proposeBusy ? 0.7 : 1 }}>
                {proposeBusy ? "Proposing..." : "Propose"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
