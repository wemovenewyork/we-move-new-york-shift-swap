"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";
import { Depot } from "@/types";
import Footer from "@/components/ui/Footer";
import Intro from "@/components/screens/Intro";
import MagneticButton from "@/components/ui/MagneticButton";

const lb: React.CSSProperties = { display: "block", marginBottom: 8, fontSize: 12, fontWeight: 600, color: C.m, letterSpacing: 2, textTransform: "uppercase" };

const BOROUGH_ORDER = ["Manhattan", "Brooklyn", "Bronx", "Queens", "Staten Island"];

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [showIntro, setShowIntro] = useState(() => {
    if (typeof window === "undefined") return true;
    return !sessionStorage.getItem("intro-seen");
  });
  const [mode, setMode] = useState<"signin" | "register">("signin");
  const [em, setEm] = useState(""); const [pw, setPw] = useState("");
  const [fn, setFn] = useState(""); const [ln, setLn] = useState(""); const [pw2, setPw2] = useState(""); const [invCode, setInvCode] = useState("");
  const [depotId, setDepotId] = useState("");
  const [depots, setDepots] = useState<Depot[]>([]);
  const [showPw, setShowPw] = useState(false); const [showPw2, setShowPw2] = useState(false);
  const [err, setErr] = useState(""); const [shaking, setShaking] = useState(false); const [submitting, setSubmitting] = useState(false);

  const setErrWithShake = (msg: string) => {
    setErr(msg);
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  useEffect(() => {
    if (!loading && user) router.replace("/depots");
  }, [user, loading, router]);

  useEffect(() => {
    if (mode === "register" && depots.length === 0) {
      api.get<Depot[]>("/depots").then(setDepots).catch(() => {});
    }
  }, [mode, depots.length]);

  const doSignIn = async () => {
    if (!em || !pw) { setErrWithShake("Fill in all fields"); return; }
    setSubmitting(true); setErr("");
    try {
      const data = await api.post<{ accessToken: string; refreshToken: string; user: { id: string; firstName: string; lastName: string; email: string; depotId?: string | null; language: string } }>("/auth/login", { email: em, password: pw });
      login(data.accessToken, data.refreshToken, data.user as Parameters<typeof login>[2]);
      window.location.href = "/depots";
    } catch (e: unknown) {
      setErrWithShake(e instanceof Error ? e.message : "Login failed");
    } finally { setSubmitting(false); }
  };

  const doRegister = async () => {
    if (!fn || !ln || !em || !pw || !pw2 || !invCode) { setErrWithShake("Fill in all fields"); return; }
    if (!depotId) { setErrWithShake("Please select your home depot"); return; }
    if (pw !== pw2) { setErrWithShake("Passwords do not match"); return; }
    setSubmitting(true); setErr("");
    try {
      const data = await api.post<{ accessToken: string; refreshToken: string; user: { id: string; firstName: string; lastName: string; email: string; depotId?: string | null; role: string; language: string; flexibleMode: boolean } }>("/auth/register", { firstName: fn, lastName: ln, email: em, password: pw, inviteCode: invCode, depotId });
      login(data.accessToken, data.refreshToken, data.user as Parameters<typeof login>[2]);
      window.location.href = "/depots";
    } catch (e: unknown) {
      setErrWithShake(e instanceof Error ? e.message : "Registration failed");
    } finally { setSubmitting(false); }
  };

  const groupedDepots = BOROUGH_ORDER.map(borough => ({
    borough,
    depots: depots.filter(d => d.borough === borough),
  })).filter(g => g.depots.length > 0);

  if (showIntro) return <Intro onDone={() => { sessionStorage.setItem("intro-seen", "1"); setShowIntro(false); }} />;

  return (
    <main id="main-content" className="page-enter" style={{ minHeight: "100vh", display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "40px 20px", overflowY: "auto" }}>
      <div className={shaking ? "shake" : ""} style={{ maxWidth: 400, width: "100%", background: "rgba(255,255,255,.02)", backdropFilter: "blur(16px)", borderRadius: 28, border: "1px solid rgba(255,255,255,.06)", padding: 32, boxShadow: "0 24px 80px rgba(0,0,0,.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: `conic-gradient(from 45deg,${C.navy},${C.blue},${C.navy})`, display: "inline-flex", alignItems: "center", justifyContent: "center", border: `2px solid ${C.gold}`, marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 11, color: C.gold, textAlign: "center", lineHeight: 1.1 }}>WM<br />NY</div>
          </div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: C.white }}>{mode === "signin" ? "Sign In" : "Create Account"}</h1>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, background: C.s, borderRadius: 12, padding: 4, marginBottom: 18 }}>
          {(["signin", "register"] as const).map(t => (
            <button key={t} onClick={() => { setMode(t); setErr(""); }} style={{ padding: 10, borderRadius: 10, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 600, background: mode === t ? C.gold : "transparent", color: mode === t ? C.bg : C.m }}>
              {t === "signin" ? "Sign In" : "Register"}
            </button>
          ))}
        </div>

        {err && <div role="alert" aria-live="assertive" style={{ padding: "10px 14px", borderRadius: 12, background: C.red + "15", border: `1px solid ${C.red}33`, marginBottom: 14, fontSize: 13, color: C.red }}>{err}</div>}

        {mode === "signin" ? (
          <div style={{ display: "grid", gap: 14 }}>
            <div><label htmlFor="signin-email" style={lb}>Email</label><input id="signin-email" type="email" value={em} onChange={e => { setEm(e.target.value); setErr(""); }} placeholder="you@example.com" /></div>
            <div>
              <label htmlFor="signin-pw" style={lb}>Password</label>
              <div style={{ position: "relative" }}>
                <input id="signin-pw" type={showPw ? "text" : "password"} value={pw} onChange={e => { setPw(e.target.value); setErr(""); }} placeholder="Your password" onKeyDown={e => e.key === "Enter" && doSignIn()} style={{ paddingRight: 44 }} />
                <button type="button" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.m, fontSize: 13, fontWeight: 600, padding: "4px 6px" }}>{showPw ? "Hide" : "Show"}</button>
              </div>
            </div>
            <MagneticButton onClick={doSignIn} disabled={submitting} style={{ padding: 16, borderRadius: 14, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${C.gold},${C.gold}dd)`, fontSize: 16, fontWeight: 700, color: C.bg, opacity: submitting ? 0.7 : 1, width: "100%" }}>
              {submitting ? "Signing in..." : "Sign In"}
            </MagneticButton>
            <button type="button" onClick={() => router.push("/forgot-password")} style={{ background: "none", border: "none", cursor: "pointer", color: C.m, fontSize: 13, textAlign: "center", padding: "4px 0" }}>
              Forgot password?
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><label htmlFor="reg-fn" style={lb}>First Name</label><input id="reg-fn" value={fn} onChange={e => { setFn(e.target.value); setErr(""); }} placeholder="John" /></div>
              <div><label htmlFor="reg-ln" style={lb}>Last Name</label><input id="reg-ln" value={ln} onChange={e => { setLn(e.target.value); setErr(""); }} placeholder="Williams" /></div>
            </div>
            <div>
              <label htmlFor="reg-depot" style={lb}>Home Depot</label>
              <select id="reg-depot" value={depotId} onChange={e => { setDepotId(e.target.value); setErr(""); }} style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.bd}`, background: C.s, color: depotId ? C.white : C.m, fontSize: 14, cursor: "pointer" }}>
                <option value="">— Select your home depot —</option>
                {groupedDepots.map(({ borough, depots: bd }) => (
                  <optgroup key={borough} label={borough}>
                    {bd.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div><label htmlFor="reg-email" style={lb}>Email</label><input id="reg-email" type="email" value={em} onChange={e => { setEm(e.target.value); setErr(""); }} placeholder="you@example.com" /></div>
            <div>
              <label htmlFor="reg-pw" style={lb}>Create Password</label>
              <div style={{ position: "relative" }}>
                <input id="reg-pw" type={showPw ? "text" : "password"} value={pw} onChange={e => { setPw(e.target.value); setErr(""); }} placeholder="Min 12 chars" style={{ paddingRight: 44 }} />
                <button type="button" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.m, fontSize: 13, fontWeight: 600, padding: "4px 6px" }}>{showPw ? "Hide" : "Show"}</button>
              </div>
            </div>
            <div>
              <label htmlFor="reg-pw2" style={lb}>Verify Password</label>
              <div style={{ position: "relative" }}>
                <input id="reg-pw2" type={showPw2 ? "text" : "password"} value={pw2} onChange={e => { setPw2(e.target.value); setErr(""); }} placeholder="Re-enter" style={{ paddingRight: 44 }} />
                <button type="button" aria-label={showPw2 ? "Hide password" : "Show password"} onClick={() => setShowPw2(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.m, fontSize: 13, fontWeight: 600, padding: "4px 6px" }}>{showPw2 ? "Hide" : "Show"}</button>
              </div>
            </div>
            <div><label htmlFor="reg-invite" style={lb}>Invite Code</label><input id="reg-invite" value={invCode} onChange={e => { setInvCode(e.target.value.toUpperCase()); setErr(""); }} placeholder="e.g. WMNY-DEMO1" style={{ letterSpacing: 2, textTransform: "uppercase" }} /></div>
            <div style={{ padding: "10px 14px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid " + C.bd }}>
              <div style={{ fontSize: 10, color: C.m, lineHeight: 1.6 }}>Need an invite code? Ask a fellow operator who already uses the app, or use a seed code: WMNY-2024A, WMNY-2024B, WMNY-2024C</div>
            </div>
            <MagneticButton onClick={doRegister} disabled={submitting} style={{ padding: 16, borderRadius: 14, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${C.gold},${C.gold}dd)`, fontSize: 16, fontWeight: 700, color: C.bg, opacity: submitting ? 0.7 : 1, width: "100%" }}>
              {submitting ? "Creating account..." : "Create Account"}
            </MagneticButton>
          </div>
        )}

        <Footer />
      </div>
    </main>
  );
}
