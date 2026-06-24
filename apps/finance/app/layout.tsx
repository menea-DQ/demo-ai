import type { Metadata } from "next";
import { Space_Grotesk, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display-f", weight: ["500", "600", "700"], display: "swap" });
const sans = Inter({ subsets: ["latin"], variable: "--font-sans-f", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-f", weight: ["400", "500", "600"], display: "swap" });

export const metadata: Metadata = {
  title: "Vertex Finance — Intelligence finanziaria · powered by Donq",
  description: "Demo: esplora i dati finanziari di Vertex Group e interroga l'assistente AI. Realizzato da Donq.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="it" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
