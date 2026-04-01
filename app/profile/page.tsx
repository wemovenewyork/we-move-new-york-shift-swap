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

const lb: React.CSSProperties = { display: "block", marginBottom: 8, fontSize: 12, fontWeight: 600, color: C.m, letterSpacing: 2, textTransform: "uppercase" };

export default function ProfilePage() {
  const { user, logout, updateUser, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<"profile" | "security">("profile");
  const [fn, setFn] = useState(""); const [ln, setLn] = useState(""); const [email, setEmail] = useState(""); const [lang, setLang] = useState("en");
  const [curPw, setCurPw] = useState(""); const [newPw, setNewPw] = useState(""); const [newPw2, setNewPw2] = useState("");
  const [toast, setToast] = useState<string | null>(null); const [pwErr, setPwErr] = useState("");
  const [depots, setDepots] = useState<Depot[]>([]); const [saving, setSaving] = useState(false);

  const showToast = useCallback((msg: string) => { setToast(msg); setTimeout(() => setToast(null), 2500); }, []);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (user) { setFn(user.firstName); setLn(user.lastName); setEmail(user.email); setLang(user.language); }
    api.get<Depot[]>("/depots").then(setDepots).catch(() => {});
  }, [user]);

  const saveProfile = async () => {
    setSaving(true);
    try {
      const data = await api.put("/users/me", { firstName: fn, lastName: ln, email, language: lang });
      updateUser(data as Parameters<typeof updateUser>[0]);
      showToast("Saved!");
    } catch (e: unknown) { showToast(e instanceof Error ? e.message : "Save failed"); }
    setSaving(false);
  };

  const changePassword = async () => {
    setPwErr("");
    if (!curPw || !newPw || !newPw2) { setPwErr("Fill in all fields"); return; }
    if (newPw.length < 6) { setPwErr("Min 6 characters"); return; }
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

  return (
    <div style={{ minHeight: "100vh", background: C.bg }}>
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: "rgba(1,0,40,.8)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 }}>
        <button onClick={() => router.back()} aria-label="Go back" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Icon n="back" s={16} /></button>
        <div style={{ flex: 1, fontSize: 14, fontWeight: 700, color: C.white }}>My Profile</div>
      </div>

      <main id="main-content" style={{ maxWidth: 440, margin: "0 auto", padding: "24px 20px 80px" }}>
        {/* Avatar */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ width: 90, height: 90, borderRadius: "50%", background: `linear-gradient(135deg,${C.navy},${C.blue})`, display: "inline-flex", alignItems: "center", justifyContent: "center", border: `3px solid ${C.gold}`, marginBottom: 12, boxShadow: `0 0 24px ${C.gold}22` }}>
            <span style={{ fontSize: 32, fontWeight: 800, color: C.gold }}>{fn.charAt(0)}{ln.charAt(0)}</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.white }}>{fn} {ln}</div>
          <div style={{ fontSize: 12, color: C.m, marginTop: 4 }}>{email}</div>
          <div style={{ marginTop: 8 }}><RepBadge rep={user.reputation} size="small" /></div>
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
              <div><label style={lb}>First Name</label><input value={fn} onChange={e => setFn(e.target.value)} /></div>
              <div><label style={lb}>Last Name</label><input value={ln} onChange={e => setLn(e.target.value)} /></div>
            </div>
            <div><label style={lb}>Email Address</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} /></div>
            <div>
              <label style={lb}>Language</label>
              <select value={lang} onChange={e => setLang(e.target.value)} style={{ appearance: "auto", cursor: "pointer" }}>
                <option value="en">English</option>
                <option value="es">Español</option>
                <option value="ht">Kreyòl Ayisyen</option>
                <option value="zh">中文</option>
              </select>
            </div>
            {depot && (
              <div>
                <label style={lb}>Home Depot</label>
                <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", borderRadius: 14, background: C.s, border: `1px solid ${C.bd}` }}>
                  <DepotBadge depot={depot} size={32} />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: C.white }}>{depot.name}</div>
                    <div style={{ fontSize: 11, color: C.m }}>{depot.operator} · {depot.borough}</div>
                  </div>
                </div>
              </div>
            )}
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
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            <div><label style={lb}>Current Password</label><input type="password" value={curPw} onChange={e => { setCurPw(e.target.value); setPwErr(""); }} placeholder="Enter current password" /></div>
            <div><label style={lb}>New Password</label><input type="password" value={newPw} onChange={e => { setNewPw(e.target.value); setPwErr(""); }} placeholder="Min 6 characters" /></div>
            <div><label style={lb}>Confirm New Password</label><input type="password" value={newPw2} onChange={e => { setNewPw2(e.target.value); setPwErr(""); }} placeholder="Re-enter new password" /></div>
            {pwErr && <div style={{ padding: "10px 14px", borderRadius: 12, background: C.red + "15", border: `1px solid ${C.red}33`, fontSize: 13, color: C.red }}>{pwErr}</div>}
            <button onClick={changePassword} style={{ padding: 16, borderRadius: 14, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${C.gold},${C.gold}dd)`, fontSize: 15, fontWeight: 700, color: C.bg }}>Update Password</button>
          </div>
        )}

        <button onClick={handleLogout} style={{ marginTop: 20, padding: 16, borderRadius: 14, border: `1px solid ${C.red}33`, background: C.red + "12", cursor: "pointer", fontSize: 15, fontWeight: 600, color: C.red, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, width: "100%" }}>
          <Icon n="out" s={16} c={C.red} /> Sign Out
        </button>
      </main>
      {toast && <Toast message={toast} />}
    </div>
  );
}
