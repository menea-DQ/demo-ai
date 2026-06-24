import type { Metadata } from "next";
import { Sora, Unbounded } from "next/font/google";
import "./globals.css";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora", display: "swap" });
const unbounded = Unbounded({
  subsets: ["latin"],
  variable: "--font-unbounded",
  weight: ["400", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Aurora Finance — Dati finanziari AI · powered by Donq",
  description: "Demo: interroga i dati finanziari aziendali. Realizzato da Donq.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className={`${sora.variable} ${unbounded.variable}`}>
      <body>{children}</body>
    </html>
  );
}
