import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Inter } from "next/font/google";
import { TRPCProvider } from "@/components/providers";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: {
    default: "BlitzResponse — AI-Powered Restoration Dispatch",
    template: "%s | BlitzResponse",
  },
  description:
    "24/7 AI voice answering, emergency triage, instant quoting, and dispatch for water, fire, and mold restoration companies.",
  keywords: [
    "restoration",
    "water damage",
    "fire damage",
    "mold remediation",
    "AI dispatch",
    "emergency response",
    "IICRC",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={`${inter.variable} font-sans antialiased`}>
          <TRPCProvider>{children}</TRPCProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
