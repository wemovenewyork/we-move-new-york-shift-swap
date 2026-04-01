import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/AuthContext";

export const metadata: Metadata = {
  title: "We Move New York — Shift Swap",
  description: "Peer-to-peer shift swap platform for NYC MTA bus operators",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.cdnfonts.com/css/resolve" rel="stylesheet" />
      </head>
      <body>
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
