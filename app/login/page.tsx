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
  const [mode, setMode] = useState<"signin" | "register">(() =>
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("invite") ? "register" : "signin"
  );
  const [em, setEm] = useState(""); const [pw, setPw] = useState("");
  const [fn, setFn] = useState(""); const [ln, setLn] = useState(""); const [pw2, setPw2] = useState("");
  const [invCode, setInvCode] = useState(() =>
    typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("invite") ?? "") : ""
  );
  const [depotId, setDepotId] = useState("");
  const [depots, setDepots] = useState<Depot[]>([]);
  const [showPw, setShowPw] = useState(false); const [showPw2, setShowPw2] = useState(false);
  const [err, setErr] = useState(""); const [shaking, setShaking] = useState(false); const [submitting, setSubmitting] = useState(false);
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [termsChecked, setTermsChecked] = useState(false);
  const [acceptingTerms, setAcceptingTerms] = useState(false);
  const CURRENT_TERMS_VERSION = "2026-04-02";

  const setErrWithShake = (msg: string) => {
    setErr(msg);
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  };

  useEffect(() => {
    if (!loading && user && !showDisclaimer && !showTerms) {
      if (user.termsVersion !== CURRENT_TERMS_VERSION) {
        setShowTerms(true);
      } else {
        router.replace("/depots");
      }
    }
  }, [user, loading, router, showDisclaimer, showTerms]);

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
      setShowDisclaimer(true);
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

      {showDisclaimer && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="disclaimer-title"
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(1,0,40,.97)", backdropFilter: "blur(24px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 28px" }}
        >
          <div style={{ maxWidth: 400, width: "100%" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: C.gold + "18", border: `1.5px solid ${C.gold}44`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M12 2L2 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7L12 2z" stroke={C.gold} strokeWidth="1.8" strokeLinejoin="round"/>
                <path d="M12 8v4M12 16h.01" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
            </div>

            <h2 id="disclaimer-title" style={{ fontSize: 22, fontWeight: 800, color: C.white, textAlign: "center", marginBottom: 16 }}>
              Before You Continue
            </h2>

            <div style={{ background: "rgba(255,255,255,.04)", border: `1px solid rgba(255,255,255,.08)`, borderRadius: 16, padding: "20px 18px", marginBottom: 24, fontSize: 13, color: C.m, lineHeight: 1.75 }}>
              <p style={{ margin: "0 0 12px" }}>
                <strong style={{ color: C.white }}>We Move NY</strong> is an unofficial peer-to-peer tool for MTA bus operators to coordinate shift swaps among themselves.
              </p>
              <p style={{ margin: "0 0 12px" }}>
                This platform is <strong style={{ color: C.white }}>not affiliated with, endorsed by, or operated by the MTA</strong>, any transit agency, or any labor union.
              </p>
              <p style={{ margin: "0 0 12px" }}>
                All swap agreements are <strong style={{ color: C.white }}>between operators only</strong>. It is your responsibility to ensure any swap complies with your collective bargaining agreement, depot rules, and all applicable MTA policies before submitting to your dispatcher.
              </p>
              <p style={{ margin: 0 }}>
                By continuing, you confirm you are an authorized MTA bus operator and agree to use this app in accordance with your employment obligations.
              </p>
            </div>

            <button
              onClick={() => { setShowDisclaimer(false); setShowTerms(true); }}
              autoFocus
              style={{ width: "100%", padding: 16, borderRadius: 14, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${C.gold},${C.gold}cc)`, fontSize: 16, fontWeight: 800, color: C.bg }}
            >
              I Understand
            </button>
          </div>
        </div>
      )}

      {showTerms && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="terms-title"
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(1,0,40,.97)", backdropFilter: "blur(24px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "28px 20px" }}
        >
          <div style={{ maxWidth: 440, width: "100%", display: "flex", flexDirection: "column", maxHeight: "90vh" }}>
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: C.gold + "18", border: `1.5px solid ${C.gold}44`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 14px" }}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path d="M9 12h6M9 16h6M9 8h4M5 4h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1z" stroke={C.gold} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <h2 id="terms-title" style={{ fontSize: 20, fontWeight: 800, color: C.white, margin: 0 }}>Terms of Use</h2>
              <p style={{ fontSize: 12, color: C.m, margin: "6px 0 0" }}>Please read and agree to continue</p>
            </div>

            {/* Scrollable terms body */}
            <div style={{ flex: 1, overflowY: "auto", background: "rgba(255,255,255,.03)", border: `1px solid rgba(255,255,255,.08)`, borderRadius: 16, padding: "18px 16px", marginBottom: 18, fontSize: 12, color: "rgba(255,255,255,.7)", lineHeight: 1.75 }}>
              {[
                { title: "1. Acceptance of Terms", body: 'By accessing or using We Move New York ("WMNY"), you agree to be bound by these Terms of Use. If you do not agree, do not use the App.' },
                { title: "2. Who Can Use This App", body: "WMNY is intended exclusively for active NYC bus operators. By registering you confirm you are a current bus operator, the information you provide is accurate, you will not share your credentials, and you are at least 18 years of age." },
                { title: "3. Shift Swap Coordination", body: "WMNY is a coordination tool only. It does not replace any MTA, TWU, or union collective bargaining agreements. All shift swaps must comply with your depot's official procedures and receive supervisor approval. WMNY makes no guarantee a swap will be approved by management." },
                { title: "4. User Conduct", body: "You agree not to post false or fraudulent swap listings, harass or threaten other users, share others' personal information without consent, use the App for commercial gain, attempt unauthorized access, or post discriminatory content. Violations may result in immediate account suspension." },
                { title: "5. Reputation System", body: "Reviews must be honest and based on actual swap experiences. Manipulating ratings — including self-reviewing or fake reviews — is prohibited and may result in account termination." },
                { title: "6. Invite Codes", body: "You are responsible for who you invite. Do not share invite codes publicly or with non-MTA personnel. Misuse may result in suspension of your account and the invited account." },
                { title: "7. Disclaimer of Liability", body: "WMNY is provided as-is without warranties. We are not responsible for disputes, missed shifts, denied swaps, or disciplinary actions arising from use of this platform." },
                { title: "8. Changes to Terms", body: "We reserve the right to update these Terms at any time. Continued use after changes are posted constitutes acceptance of the revised terms." },
              ].map(({ title, body }) => (
                <div key={title} style={{ marginBottom: 14 }}>
                  <div style={{ fontWeight: 700, color: C.gold, fontSize: 10, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 4 }}>{title}</div>
                  <p style={{ margin: 0 }}>{body}</p>
                </div>
              ))}
            </div>

            {/* Checkbox */}
            <label style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 16, cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={termsChecked}
                onChange={e => setTermsChecked(e.target.checked)}
                style={{ marginTop: 2, width: 18, height: 18, accentColor: C.gold, cursor: "pointer", flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, color: "rgba(255,255,255,.75)", lineHeight: 1.5 }}>
                I have read and agree to the <strong style={{ color: C.white }}>Terms of Use</strong>
              </span>
            </label>

            <button
              onClick={async () => {
                if (!termsChecked || acceptingTerms) return;
                setAcceptingTerms(true);
                try {
                  await api.post("/auth/accept-terms", { version: CURRENT_TERMS_VERSION });
                } catch { /* non-fatal — proceed anyway */ }
                window.location.href = "/depots";
              }}
              disabled={!termsChecked || acceptingTerms}
              style={{ width: "100%", padding: 16, borderRadius: 14, border: "none", cursor: termsChecked ? "pointer" : "not-allowed", background: termsChecked ? `linear-gradient(135deg,${C.gold},${C.gold}cc)` : "rgba(255,255,255,.08)", fontSize: 16, fontWeight: 800, color: termsChecked ? C.bg : C.m, transition: "all .2s" }}
            >
              {acceptingTerms ? "Saving..." : "I Agree"}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
