import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";
import MeshBackground from "@/components/ui/MeshBackground";

export const metadata: Metadata = {
  title: "We Move New York — Shift Swap",
  description: "Peer-to-peer shift swap platform for NYC MTA bus operators",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "WeMoveNY",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="theme-color" content="#010028" />
      </head>
      <body>
        <MeshBackground />
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <AuthProvider>
          <div style={{ position: "relative", zIndex: 1 }}>
            {children}
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
