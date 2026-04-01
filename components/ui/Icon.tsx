"use client";

interface IconProps { n: string; s?: number; c?: string; }

export default function Icon({ n, s = 20, c = "currentColor" }: IconProps) {
  const st: React.CSSProperties = { width: s, height: s, flexShrink: 0, display: "inline-block", verticalAlign: "middle" };
  const p = { fill: "none" as const, stroke: c, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const icons: Record<string, React.ReactNode> = {
    swap: <svg style={st} viewBox="0 0 24 24"><path {...p} d="M7 16l-4-4 4-4" /><path {...p} d="M3 12h18" /><path {...p} d="M17 8l4 4-4 4" /></svg>,
    cal: <svg style={st} viewBox="0 0 24 24"><rect {...p} x="3" y="4" width="18" height="18" rx="2" /><path {...p} d="M16 2v4M8 2v4M3 10h18" /></svg>,
    sun: <svg style={st} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="5" /><path {...p} d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>,
    srch: <svg style={st} viewBox="0 0 24 24"><circle {...p} cx="11" cy="11" r="8" /><path {...p} d="M21 21l-4.35-4.35" /></svg>,
    chev: <svg style={st} viewBox="0 0 24 24"><path {...p} d="M9 5l7 7-7 7" /></svg>,
    back: <svg style={st} viewBox="0 0 24 24"><path {...p} d="M19 12H5M12 19l-7-7 7-7" /></svg>,
    plus: <svg style={st} viewBox="0 0 24 24"><path {...p} d="M12 5v14M5 12h14" /></svg>,
    list: <svg style={st} viewBox="0 0 24 24"><path {...p} d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" /></svg>,
    edit: <svg style={st} viewBox="0 0 24 24"><path {...p} d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" /><path {...p} d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" /></svg>,
    clk: <svg style={st} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="10" /><path {...p} d="M12 6v6l4 2" /></svg>,
    ph: <svg style={st} viewBox="0 0 24 24"><path {...p} d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6A19.79 19.79 0 013.12 4.18 2 2 0 015.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" /></svg>,
    chk: <svg style={st} viewBox="0 0 24 24"><path {...p} d="M20 6L9 17l-5-5" /></svg>,
    arr: <svg style={st} viewBox="0 0 24 24"><path {...p} d="M5 12h14M12 5l7 7-7 7" /></svg>,
    tmr: <svg style={st} viewBox="0 0 24 24"><circle {...p} cx="12" cy="13" r="8" /><path {...p} d="M12 9v4l2 2M5 3l2 2M19 3l-2 2M12 1v2" /></svg>,
    del: <svg style={st} viewBox="0 0 24 24"><path {...p} d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" /></svg>,
    usr: <svg style={st} viewBox="0 0 24 24"><path {...p} d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle {...p} cx="12" cy="7" r="4" /></svg>,
    out: <svg style={st} viewBox="0 0 24 24"><path {...p} d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><path {...p} d="M16 17l5-5-5-5M21 12H9" /></svg>,
    inf: <svg style={st} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="10" /><path {...p} d="M12 16v-4M12 8h.01" /></svg>,
    mt: <svg style={st} viewBox="0 0 24 24"><path {...p} d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z" /><path {...p} d="M13 2v7h7" /></svg>,
    msg: <svg style={st} viewBox="0 0 24 24"><path {...p} d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>,
  };
  return (icons[n] ?? null) as React.ReactElement | null;
}
