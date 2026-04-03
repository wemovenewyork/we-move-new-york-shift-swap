"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { Depot } from "@/types";
import { C } from "@/constants/colors";
import Icon from "@/components/ui/Icon";
import RepBadge from "@/components/ui/RepBadge";
import DepotBadge from "@/components/ui/DepotBadge";
import Toast from "@/components/ui/Toast";
import NotifToggle from "@/components/ui/NotifToggle";
import InboxIcon from "@/components/ui/InboxIcon";
import NotifIcon from "@/components/ui/NotifIcon";
import CountUp from "@/components/ui/CountUp";
import ProgressRing from "@/components/ui/ProgressRing";

const lb: React.CSSProperties = { display: "block", marginBottom: 8, fontSize: 12, fontWeight: 600, color: C.m, letterSpacing: 2, textTransform: "uppercase" };

export default function ProfilePage() {
  const { user, logout, updateUser, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"profile" | "security">("profile");
  const [fn, setFn] = useState(""); const [ln, setLn] = useState(""); const [email, setEmail] = useState(""); const [lang, setLang] = useState("en"); const [depotId, setDepotId] = useState("");
  const [curPw, setCurPw] = useState(""); const [newPw, setNewPw] = useState(""); const [newPw2, setNewPw2] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePw, setDeletePw] = useState(""); const [deleteErr, setDeleteErr] = useState(""); const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null); const [pwErr, setPwErr] = useState("");
  const [depots, setDepots] = useState<Depot[]>([]); const [saving, setSaving] = useState(false);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) { setFn(user.firstName); setLn(user.lastName); setEmail(user.email); setLang(user.language); setDepotId(user.depotId ?? ""); }
    api.get<Depot[]>("/depots").then(setDepots).catch(() => {});
  }, [user]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const data = await api.put("/users/me", { firstName: fn, lastName: ln, email, language: lang, depotId });
      updateUser(data as Parameters<typeof updateUser>[0]);
      showToast("Saved!");
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Save failed"); }
    setSaving(false);
  };

  const changePassword = async () => {
    setPwErr("");
    if (!curPw || !newPw || !newPw2) { setPwErr("Fill in all fields"); return; }
    if (newPw.length < 12) { setPwErr("Min 12 characters"); return; }
    if (newPw !== newPw2) { setPwErr("Passwords do not match"); return; }
    try {
      await api.put("/auth/password", { currentPassword: curPw, newPassword: newPw });
      setCurPw(""); setNewPw(""); setNewPw2("");
      showToast("Password updated!");
    } catch (e: unknown) { setPwErr(e instanceof Error ? e.message : "Failed"); }
  };

  const handleLogout = () => { logout(); router.replace("/login"); };

  if (!user) return null;
  const depot = user.depot ?? depots.find(d => d.id === user.depotId) ?? null;

  const depotLocked = (() => {
    if (!user.depotSetAt || !user.depotId) return false;
    if (user.role === "admin" || user.role === "subAdmin") return false;
    return (Date.now() - new Date(user.depotSetAt).getTime()) < 7 * 24 * 60 * 60 * 1000;
  })();
  const depotUnlocksAt = user.depotSetAt
    ? new Date(new Date(user.depotSetAt).getTime() + 7 * 24 * 60 * 60 * 1000)
    : null;

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(1,0,40,.8)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.push(user?.depot?.code ? `/depot/${user.depot.code}` : "/depots")} aria-label="Go back" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n="back" s={16} /></button>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: C.white }}>My Profile</div>
        <NotifIcon />
        <InboxIcon />
      </div>

      <main id="main-content" style={{ maxWidth: 440, margin: "0 auto", padding: "24px 20px 80px" }}>
        {/* Avatar */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 90, height: 90, borderRadius: "50%", background: `linear-gradient(135deg,${C.navy},${C.blue})`, display: "inline-flex", alignItems: "center", justifyContent: "center", border: `3px solid ${C.gold}`, marginBottom: 12, boxShadow: `0 0 24px ${C.gold}22` }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: C.gold }}>{fn.charAt(0)}{ln.charAt(0)}</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.white }}>{fn} {ln}</div>
          <div style={{ fontSize: 12, color: C.m, marginTop: 4 }}>{email}</div>
          <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 8 }}>
            <ProgressRing score={user.reputation?.score ?? 0} size={48} strokeWidth={4} />
            <RepBadge rep={user.reputation} size="small" />
          </div>
          {depot && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginTop: 8, padding: "4px 12px", borderRadius: 8, background: C.s, border: `1px solid ${C.bd}` }}>
              <DepotBadge depot={depot} size={20} />
              <span style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>{depot.name}</span>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, background: C.s, borderRadius: 12, padding: 4, marginBottom: 20 }}>
          {(["profile", "security"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ padding: 10, borderRadius: 10, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: tab === t ? C.gold : "transparent", color: tab === t ? C.bg : C.m }}>
              {t === "profile" ? "Profile" : "Security"}
            </button>
          ))}
        </div>

        {tab === "profile" ? (
          <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label htmlFor="prof-fn" style={lb}>First Name</label><input id="prof-fn" value={fn} onChange={e => setFn(e.target.value)} /></div>
              <div><label htmlFor="prof-ln" style={lb}>Last Name</label><input id="prof-ln" value={ln} onChange={e => setLn(e.target.value)} /></div>
            </div>
            <div><label htmlFor="prof-email" style={lb}>Email Address</label><input id="prof-email" type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div>
              <label style={lb}>Language</label>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {([
                  { code: "en", label: "English" },
                  { code: "es", label: "Español" },
                  { code: "zh", label: "中文" },
                  { code: "ht", label: "Kreyòl" },
                ] as const).map(({ code, label }) => (
                  <button
                    key={code}
                    type="button"
                    onClick={async () => {
                      setLang(code);
                      try {
                        const data = await api.put("/users/me", { firstName: fn, lastName: ln, email, language: code, depotId });
                        updateUser(data as Parameters<typeof updateUser>[0]);
                        showToast("Language updated!");
                      } catch (e: unknown) {
                        showToast(e instanceof Error ? e.message : "Failed to update language");
                      }
                    }}
                    style={{
                      padding: "8px 18px",
                      borderRadius: 20,
                      border: "none",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: 700,
                      background: lang === code ? C.gold : "rgba(255,255,255,.06)",
                      color: lang === code ? C.bg : C.m,
                      transition: "all .2s",
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="prof-depot" style={lb}>Home Depot</label>
              <select
                id="prof-depot"
                value={depotId}
                onChange={e => setDepotId(e.target.value)}
                disabled={depotLocked}
                style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.bd}`, background: C.s, color: depotId ? C.white : C.m, fontSize: 14, cursor: depotLocked ? "not-allowed" : "pointer", appearance: "auto", opacity: depotLocked ? 0.6 : 1 }}
              >
                <option value="">— Select your home depot —</option>
                {["Manhattan","Brooklyn","Bronx","Queens","Staten Island"].map(borough => {
                  const bd = depots.filter(d => d.borough === borough);
                  if (!bd.length) return null;
                  return (
                    <optgroup key={borough} label={borough}>
                      {bd.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                    </optgroup>
                  );
                })}
              </select>
              {depotLocked && depotUnlocksAt && (
                <div style={{ fontSize: 11, color: C.gold, marginTop: 6, lineHeight: 1.5 }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{display:"inline",verticalAlign:"middle",marginRight:4}}><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg> Locked until {depotUnlocksAt.toLocaleDateString("en-US", { month: "long", day: "numeric" })}
                </div>
              )}
            </div>
            <button onClick={saveProfile} disabled={saving} style={{ padding: 16, borderRadius: 14, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${C.gold},${C.gold}dd)`, fontSize: 15, fontWeight: 700, color: C.bg }}>
              {saving ? "Saving..." : "Save Changes"}
            </button>

            {/* Invite codes */}
            <div style={{ marginTop: 8, background: "rgba(255,255,255,.03)", borderRadius: 14, padding: 16, border: "1px solid " + C.bd }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: 2 }}>My Invite Codes</div>
                <div style={{ fontSize: 10, color: C.m }}>{(user.inviteCodes ?? []).filter(c => c.isValid).length} remaining</div>
              </div>
              <div style={{ fontSize: 11, color: C.m, lineHeight: 1.6, marginBottom: 12 }}>
                To protect the integrity of this site, invite codes must only be shared with verified bus operators. Under no circumstances are invite codes to be distributed to anyone who is not authorized to access this site.
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                {(user.inviteCodes ?? []).map(cd => (
                  <div key={cd.code} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderRadius: 10, background: !cd.isValid ? "rgba(255,255,255,.02)" : C.gold + "08", border: "1px solid " + (!cd.isValid ? C.bd : C.gold + "22") }}>
                    <span style={{ fontSize: 14, fontWeight: 700, color: !cd.isValid ? C.m : C.white, letterSpacing: 2, textDecoration: !cd.isValid ? "line-through" : "none" }}>{cd.code}</span>
                    <span style={{ fontSize: 9, fontWeight: 700, color: !cd.isValid ? C.m : "#2ED573", textTransform: "uppercase", letterSpacing: 1 }}>{!cd.isValid ? "Used" : "Active"}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ marginTop: 8 }}><RepBadge rep={user.reputation} size="full" /></div>

            {/* Push Notifications */}
            <div style={{ background: "rgba(255,255,255,.03)", borderRadius: 14, padding: 14, border: `1px solid ${C.bd}` }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: 2 }}>Notifications</div>
                <button
                  onClick={() => router.push("/notifications")}
                  style={{ background: "none", border: `1px solid ${C.bd}`, borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontSize: 11, fontWeight: 600, color: C.m, display: "flex", alignItems: "center", gap: 6 }}
                >
                  <Icon n="bell" s={12} c={C.m} />
                  View all
                </button>
              </div>
              <NotifToggle />
            </div>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            <div><label htmlFor="sec-curpw" style={lb}>Current Password</label><input id="sec-curpw" type="password" value={curPw} onChange={e => { setCurPw(e.target.value); setPwErr(""); }} placeholder="Enter current password" /></div>
            <div><label htmlFor="sec-newpw" style={lb}>New Password</label><input id="sec-newpw" type="password" value={newPw} onChange={e => { setNewPw(e.target.value); setPwErr(""); }} placeholder="Min 12 characters" /></div>
            <div><label htmlFor="sec-newpw2" style={lb}>Confirm New Password</label><input id="sec-newpw2" type="password" value={newPw2} onChange={e => { setNewPw2(e.target.value); setPwErr(""); }} placeholder="Re-enter new password" /></div>
            {pwErr && <div role="alert" aria-live="assertive" style={{ padding: "10px 14px", borderRadius: 12, background: C.red + "15", border: `1px solid ${C.red}33`, fontSize: 13, color: C.red }}>{pwErr}</div>}
            <button onClick={changePassword} style={{ padding: 16, borderRadius: 14, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${C.gold},${C.gold}dd)`, fontSize: 15, fontWeight: 700, color: C.bg }}>Update Password</button>
          </div>
        )}

        <button
          onClick={() => {
            const a = document.createElement("a");
            a.href = "/api/users/me/export";
            a.click();
          }}
          style={{ marginTop: 20, padding: 16, borderRadius: 14, border: `1px solid ${C.bd}`, background: "rgba(255,255,255,.04)", cursor: "pointer", fontSize: 14, fontWeight: 600, color: C.m, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}
        >
          <Icon n="dl" s={16} c={C.m} /> Download My Data
        </button>

        <button onClick={handleLogout} style={{ marginTop: 10, padding: 16, borderRadius: 14, border: `1px solid ${C.red}33`, background: C.red + "12", cursor: "pointer", fontSize: 15, fontWeight: 600, color: C.red, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}>
          <Icon n="out" s={16} c={C.red} /> Sign Out
        </button>

        {/* Delete Account */}
        <div style={{ marginTop: 32, padding: "16px", borderRadius: 14, border: `1px solid ${C.red}22`, background: C.red + "08" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: C.red, textTransform: "uppercase", letterSpacing: 2, marginBottom: 8 }}>Danger Zone</div>
          {!showDeleteConfirm ? (
            <button onClick={() => setShowDeleteConfirm(true)} style={{ padding: "12px 16px", borderRadius: 12, border: `1px solid ${C.red}44`, background: "transparent", cursor: "pointer", fontSize: 13, fontWeight: 600, color: C.red, width: "100%" }}>
              Delete My Account
            </button>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,.6)", lineHeight: 1.6, margin: 0 }}>
                This will permanently anonymize your account. Your swap history remains but your name and email will be removed. This cannot be undone.
              </p>
              <input type="password" value={deletePw} onChange={e => { setDeletePw(e.target.value); setDeleteErr(""); }} placeholder="Enter your password to confirm" style={{ borderColor: C.red + "44" }} />
              {deleteErr && <div style={{ fontSize: 12, color: C.red }}>{deleteErr}</div>}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <button onClick={() => { setShowDeleteConfirm(false); setDeletePw(""); setDeleteErr(""); }} style={{ padding: 12, borderRadius: 12, border: `1px solid ${C.bd}`, background: C.s, cursor: "pointer", fontSize: 13, color: C.m }}>Cancel</button>
                <button
                  disabled={deleting || !deletePw}
                  onClick={async () => {
                    setDeleting(true); setDeleteErr("");
                    try {
                      await api.post("/users/me/delete", { password: deletePw });
                      logout();
                      router.replace("/login");
                    } catch (e: unknown) {
                      setDeleteErr(e instanceof Error ? e.message : "Failed");
                    } finally { setDeleting(false); }
                  }}
                  style={{ padding: 12, borderRadius: 12, border: "none", background: C.red, cursor: deleting || !deletePw ? "not-allowed" : "pointer", fontSize: 13, fontWeight: 700, color: "#fff", opacity: deleting || !deletePw ? 0.6 : 1 }}
                >
                  {deleting ? "Deleting..." : "Delete Account"}
                </button>
              </div>
            </div>
          )}
        </div>
      </main>
      {toast && <Toast message={toast} />}
    </div>
  );
}
