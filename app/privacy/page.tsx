"use client";

import { useRouter } from "next/navigation";
import { C } from "@/constants/colors";
import Icon from "@/components/ui/Icon";

const s = {
  page: { minHeight: "100vh", color: C.white } as React.CSSProperties,
  header: { position: "sticky" as const, top: 0, zIndex: 100, background: "rgba(1,0,40,.85)", backdropFilter: "blur(24px)", borderBottom: `1px solid ${C.bd}`, padding: "14px 20px", display: "flex", alignItems: "center", gap: 12 },
  content: { maxWidth: 680, margin: "0 auto", padding: "32px 24px 80px" },
  h1: { fontSize: 26, fontWeight: 800, color: C.white, marginBottom: 6 },
  updated: { fontSize: 12, color: C.m, marginBottom: 36 },
  section: { marginBottom: 32 },
  h2: { fontSize: 15, fontWeight: 700, color: C.gold, textTransform: "uppercase" as const, letterSpacing: 2, marginBottom: 12 },
  p: { fontSize: 14, color: "rgba(255,255,255,.75)", lineHeight: 1.8, marginBottom: 12 },
  li: { fontSize: 14, color: "rgba(255,255,255,.75)", lineHeight: 1.8, marginBottom: 6 },
  divider: { borderColor: C.bd, margin: "28px 0" },
};

export default function PrivacyPage() {
  const router = useRouter();
  return (
    <div style={s.page}>
      <div style={s.header}>
        <button onClick={() => router.back()} aria-label="Go back" style={{ width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.bd}`, background: C.s, color: C.gold, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Icon n="back" s={16} />
        </button>
        <div style={{ fontSize: 15, fontWeight: 700, color: C.white }}>Privacy Policy</div>
      </div>

      <main id="main-content" style={s.content}>
        <h1 style={s.h1}>Privacy Policy</h1>
        <p style={s.updated}>Last updated: April 1, 2026</p>

        <div style={s.section}>
          <h2 style={s.h2}>1. Overview</h2>
          <p style={s.p}>We Move New York ("WMNY," "we," "us") is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data. By using the App, you agree to the practices described in this policy.</p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <h2 style={s.h2}>2. Information We Collect</h2>
          <p style={s.p}><strong style={{ color: C.white }}>Account Information:</strong> When you register, we collect your name, email address, depot assignment, and a hashed (encrypted) password. We never store your password in plain text.</p>
          <p style={s.p}><strong style={{ color: C.white }}>Swap Listings:</strong> Content you post — including shift details, run numbers, routes, and dates — is visible to other verified users at your depot.</p>
          <p style={s.p}><strong style={{ color: C.white }}>Messages:</strong> Messages sent through the platform are stored to facilitate swap coordination. Messages are only visible to the sender and recipient.</p>
          <p style={s.p}><strong style={{ color: C.white }}>Reputation & Reviews:</strong> Ratings and completion history are stored and displayed to other users to build trust in the platform.</p>
          <p style={s.p}><strong style={{ color: C.white }}>Usage Data:</strong> We may collect basic usage data such as pages visited and features used to improve the App. We do not sell this data.</p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <h2 style={s.h2}>3. How We Use Your Information</h2>
          <ul style={{ listStyle: "disc", paddingLeft: 24, marginBottom: 12 }}>
            <li style={s.li}>To operate and maintain the swap coordination platform.</li>
            <li style={s.li}>To display your profile, reputation, and listings to other verified users.</li>
            <li style={s.li}>To send you messages from other operators about your swap posts.</li>
            <li style={s.li}>To enforce our Terms of Use and investigate reported content.</li>
            <li style={s.li}>To improve the App&apos;s features and user experience.</li>
          </ul>
          <p style={s.p}>We do not sell, rent, or share your personal information with third parties for marketing purposes.</p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <h2 style={s.h2}>4. Who Can See Your Information</h2>
          <p style={s.p}><strong style={{ color: C.white }}>Other verified users</strong> can see your name, depot, swap listings, and reputation score.</p>
          <p style={s.p}><strong style={{ color: C.white }}>Your contact information</strong> (phone number) is only visible if you choose to include it on a swap post.</p>
          <p style={s.p}><strong style={{ color: C.white }}>Messages</strong> are private between sender and recipient only.</p>
          <p style={s.p}><strong style={{ color: C.white }}>Your email address</strong> is never displayed publicly on the platform.</p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <h2 style={s.h2}>5. Data Security</h2>
          <p style={s.p}>We use industry-standard security measures including password hashing (bcrypt), JWT-based authentication with short-lived tokens, and encrypted database connections. While we work hard to protect your data, no method of transmission over the internet is 100% secure.</p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <h2 style={s.h2}>6. Data Retention</h2>
          <p style={s.p}>Swap listings are automatically expired after 90 days of inactivity. You may delete your own swap posts at any time. To request deletion of your account and associated data, contact us through the App.</p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <h2 style={s.h2}>7. Cookies & Local Storage</h2>
          <p style={s.p}>We use browser local storage to maintain your login session (access and refresh tokens). We do not use third-party tracking cookies or advertising cookies. No data is shared with advertisers.</p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <h2 style={s.h2}>8. Your Rights</h2>
          <p style={s.p}>You have the right to:</p>
          <ul style={{ listStyle: "disc", paddingLeft: 24, marginBottom: 12 }}>
            <li style={s.li}>Access and update your personal information via your Profile page.</li>
            <li style={s.li}>Delete your swap posts at any time.</li>
            <li style={s.li}>Request deletion of your account and all associated data.</li>
            <li style={s.li}>Opt out of non-essential communications.</li>
          </ul>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <h2 style={s.h2}>9. Changes to This Policy</h2>
          <p style={s.p}>We may update this Privacy Policy from time to time. We will notify users of material changes through the App. Continued use after changes are posted means you accept the updated policy.</p>
        </div>

        <hr style={s.divider} />

        <div style={s.section}>
          <h2 style={s.h2}>10. Contact</h2>
          <p style={s.p}>For privacy-related questions or data requests, contact us through the App or reach out to your depot representative.</p>
        </div>
      </main>
    </div>
  );
}
