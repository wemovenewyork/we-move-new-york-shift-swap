"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/lib/api";
import { C } from "@/constants/colors";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!pw || !pw2) { setError("Fill in both fields"); return; }
    if (pw.length < 12) { setError("Password must be at least 12 characters"); return; }
    if (pw !== pw2) { setError("Passwords do not match"); return; }
    setSubmitting(true); setError("");
    try {
      await api.post("/auth/reset-password", { token, newPassword: pw });
      setDone(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Reset failed — the link may have expired");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main id="main-content" tabIndex={-1} style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
      <div style={{ maxWidth: 400, width: "100%", background: "rgba(255,255,255,.02)", backdropFilter: "blur(16px)", borderRadius: 28, border: "1px solid rgba(255,255,255,.06)", padding: 32, boxShadow: "0 24px 80px rgba(0,0,0,.3)" }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: C.white, marginBottom: 8 }}>Reset Password</h1>

        {done ? (
          <div role="status" aria-live="polite">
            <div style={{ padding: "16px 18px", borderRadius: 14, background: "rgba(0,201,167,.08)", border: "1px solid rgba(0,201,167,.25)", marginBottom: 16, fontSize: 14, color: "#00C9A7", lineHeight: 1.6 }}>
              Password updated! You can now sign in with your new password.
            </div>
            <button onClick={() => router.push("/login")} style={{ width: "100%", padding: 14, borderRadius: 14, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${C.gold},${C.gold}dd)`, fontSize: 15, fontWeight: 700, color: C.bg }}>
              Go to Sign In
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            <p style={{ fontSize: 14, color: C.m, margin: 0, lineHeight: 1.6 }}>
              Choose a new password. Must be at least 12 characters.
            </p>

            {error && (
              <div role="alert" aria-live="assertive" style={{ padding: "10px 14px", borderRadius: 12, background: C.red + "15", border: `1px solid ${C.red}33`, fontSize: 13, color: C.red }}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="reset-pw" style={{ display: "block", marginBottom: 8, fontSize: 12, fontWeight: 600, color: C.m, letterSpacing: 2, textTransform: "uppercase" }}>
                New Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  id="reset-pw"
                  type={showPw ? "text" : "password"}
                  value={pw}
                  onChange={e => { setPw(e.target.value); setError(""); }}
                  placeholder="Min 12 characters"
                  style={{ paddingRight: 44 }}
                />
                <button type="button" aria-label={showPw ? "Hide password" : "Show password"} onClick={() => setShowPw(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.m, fontSize: 13, fontWeight: 600, padding: "4px 6px" }}>
                  {showPw ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="reset-pw2" style={{ display: "block", marginBottom: 8, fontSize: 12, fontWeight: 600, color: C.m, letterSpacing: 2, textTransform: "uppercase" }}>
                Confirm Password
              </label>
              <input
                id="reset-pw2"
                type={showPw ? "text" : "password"}
                value={pw2}
                onChange={e => { setPw2(e.target.value); setError(""); }}
                placeholder="Re-enter password"
                onKeyDown={e => e.key === "Enter" && handleSubmit()}
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={submitting}
              style={{ padding: 16, borderRadius: 14, border: "none", cursor: "pointer", background: `linear-gradient(135deg,${C.gold},${C.gold}dd)`, fontSize: 15, fontWeight: 700, color: C.bg, opacity: submitting ? 0.7 : 1 }}
            >
              {submitting ? "Updating..." : "Update Password"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
