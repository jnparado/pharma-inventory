import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppShell } from "@/components/app-shell";
import { TopBarWrapper } from "@/components/top-bar-wrapper";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PharmaStock — Pharmacy Inventory",
  description:
    "Pharmacy inventory with POS, sales reports, AI forecasting, and stock management.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full overflow-x-hidden bg-[#f4f7fe] font-sans text-slate-900">
        <AppShell>
          <TopBarWrapper />
          <main className="min-w-0 flex-1 p-4 sm:p-6 md:p-8">{children}</main>
        </AppShell>
      </body>
    </html>
  );
}
