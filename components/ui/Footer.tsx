"use client";
import Link from "next/link";
import { C } from "@/constants/colors";

export default function Footer() {
  return (
    <footer style={{ background: "rgba(1,0,40,.9)", borderTop: "1px solid " + C.bd, padding: "24px 20px 32px", marginTop: 40 }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: `linear-gradient(135deg,${C.navy},${C.blue})`, border: "1.5px solid " + C.gold, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <span style={{ fontSize: 8, fontWeight: 800, color: C.gold, textAlign: "center", lineHeight: 1.1 }}>WM<br />NY</span>
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.white, letterSpacing: 2 }}>WE MOVE NEW YORK</div>
            <div style={{ fontSize: 10, color: C.gold, letterSpacing: 3, textTransform: "uppercase" }}>Shift Swap</div>
          </div>
        </div>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,.4)", lineHeight: 1.7, marginBottom: 8 }}>
          We Move New York Shift Swap is not affiliated with New York City Transit or any agency governed or controlled by the Metropolitan Transportation Authority.
        </p>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,.4)", lineHeight: 1.7, marginBottom: 8 }}>
          This platform is an unofficial, peer-to-peer tool intended solely to assist operators in coordinating shift swaps. It does not replace or override any official procedures.
        </p>
        <p style={{ fontSize: 10, color: "rgba(255,255,255,.4)", lineHeight: 1.7, marginBottom: 12 }}>
          All shift swaps must be formally approved in accordance with depot rules, regulations, union guidelines, and the direction of supervisors or management. Failure to follow proper approval procedures is not permitted.
        </p>
        <div style={{ borderTop: "1px solid " + C.bd, paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ fontSize: 10, color: "rgba(255,255,255,.35)" }}>© {new Date().getFullYear()} We Move New York. All rights reserved.</div>
          <div style={{ display: "flex", gap: 16 }}>
            <Link href="/privacy" style={{ fontSize: 10, color: "rgba(255,255,255,.45)", textDecoration: "none" }}>Privacy Policy</Link>
            <Link href="/terms" style={{ fontSize: 10, color: "rgba(255,255,255,.45)", textDecoration: "none" }}>Terms of Use</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
