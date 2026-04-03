"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/AuthContext";
import { api } from "@/lib/api";
import { Depot } from "@/types";
import { C } from "@/constants/colors";

const JOB_TITLES = ["Bus Operator", "Dispatcher", "Maintainer", "Cleaner", "Station Agent", "Train Operator", "Conductor", "Other"];
const BOROUGH_ORDER = ["Manhattan", "Brooklyn", "Bronx", "Queens", "Staten Island"];
const lb: React.CSSProperties = { display: "block", marginBottom: 8, fontSize: 12, fontWeight: 600, color: C.m, letterSpacing: 2, textTransform: "uppercase" };

export default function SetupProfilePage() {
  const { user, loading, refreshUser } = useAuth();
  const router = useRouter();
  const [depots, setDepots] = useState<Depot[]>([]);
  const [jobTitle, setJobTitle] = useState("");
  const [depotId, setDepotId] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [user, loading, router]);

  useEffect(() => {
    api.get<Depot[]>("/depots").then(setDepots).catch(() => {});
  }, []);

  const groupedDepots = BOROUGH_ORDER.map(borough => ({
    borough,
    depots: depots.filter(d => d.borough === borough),
  })).filter(g => g.depots.length > 0);

  const handleSave = async () => {
    if (!jobTitle) { setErr("Please select your job title"); return; }
    if (!depotId) { setErr("Please select your home depot"); return; }
    setSaving(true);
    setErr("");
    try {
      await api.put("/users/me", { jobTitle, depotId });
      await refreshUser();
      router.replace("/depots");
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  return (
    <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", background: C.bg }}>
      <div style={{ maxWidth: 400, width: "100%", background: "rgba(255,255,255,.02)", backdropFilter: "blur(16px)", borderRadius: 28, border: "1px solid rgba(255,255,255,.06)", padding: 32, boxShadow: "0 24px 80px rgba(0,0,0,.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ width: 64, height: 64, borderRadius: "50%", background: `conic-gradient(from 45deg,${C.navy},${C.blue},${C.navy})`, display: "inline-flex", alignItems: "center", justifyContent: "center", border: `2px solid ${C.gold}`, marginBottom: 14 }}>
            <div style={{ fontWeight: 800, fontSize: 11, color: C.gold, textAlign: "center", lineHeight: 1.1 }}>WM<br />NY</div>
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: C.white, marginBottom: 6 }}>Set Up Your Profile</h1>
          <p style={{ fontSize: 13, color: C.m, lineHeight: 1.5 }}>
            Hi {user.firstName}! Choose your job title and home depot to get started. Your home depot determines which swaps you see and post.
          </p>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <div>
            <label htmlFor="setup-job" style={lb}>Job Title</label>
            <select
              id="setup-job"
              value={jobTitle}
              onChange={e => { setJobTitle(e.target.value); setErr(""); }}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.bd}`, background: C.s, color: jobTitle ? C.white : C.m, fontSize: 16, cursor: "pointer" }}
            >
              <option value="">— Select your job title —</option>
              {JOB_TITLES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="setup-depot" style={lb}>Home Depot</label>
            <select
              id="setup-depot"
              value={depotId}
              onChange={e => { setDepotId(e.target.value); setErr(""); }}
              style={{ width: "100%", padding: "12px 14px", borderRadius: 12, border: `1px solid ${C.bd}`, background: C.s, color: depotId ? C.white : C.m, fontSize: 16, cursor: "pointer" }}
            >
              <option value="">— Select your home depot —</option>
              {groupedDepots.map(({ borough, depots: bd }) => (
                <optgroup key={borough} label={borough}>
                  {bd.map(d => <option key={d.id} value={d.id}>{d.name} ({d.code})</option>)}
                </optgroup>
              ))}
            </select>
            <div style={{ fontSize: 11, color: C.m, marginTop: 6, lineHeight: 1.5 }}>
              You can only see and post swaps in your home depot. Once set, this can only be changed once every 7 days.
            </div>
          </div>

          {err && (
            <div role="alert" style={{ padding: "10px 14px", borderRadius: 12, background: C.red + "15", border: `1px solid ${C.red}33`, fontSize: 13, color: C.red }}>
              {err}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            style={{ padding: 16, borderRadius: 14, border: "none", cursor: saving ? "not-allowed" : "pointer", background: `linear-gradient(135deg,${C.gold},${C.gold}dd)`, fontSize: 16, fontWeight: 700, color: C.bg, opacity: saving ? 0.7 : 1 }}
          >
            {saving ? "Saving..." : "Let's Go"}
          </button>
        </div>
      </div>
    </main>
  );
}
