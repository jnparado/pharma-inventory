import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Nav } from "@/components/nav";
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
    "Pharmacy inventory with AI forecasting, barcode scanning, multi-branch stock, prescription validation, and automated ordering.",
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
      <body className="min-h-full bg-slate-50 font-sans text-slate-900">
        <div className="flex min-h-screen">
          <aside className="fixed inset-y-0 left-0 hidden w-60 flex-col overflow-y-auto bg-slate-900 md:flex">
            <div className="flex items-center gap-2.5 px-5 py-5">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-600 text-lg font-bold text-white">
                +
              </div>
              <div>
                <p className="text-sm font-semibold text-white">PharmaStock</p>
                <p className="text-xs text-slate-400">Inventory System</p>
              </div>
            </div>
            <Nav />
          </aside>
          <div className="flex-1 md:pl-60">
            <header className="border-b border-slate-200 bg-slate-900 px-1 py-3 md:hidden">
              <p className="px-4 pb-2 text-sm font-semibold text-white">
                PharmaStock
              </p>
              <Nav />
            </header>
            <main className="mx-auto max-w-6xl px-4 py-8 md:px-8">
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
