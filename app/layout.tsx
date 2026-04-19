import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sports & Fitness AI Coach",
  description: "Real-time AI-powered sports coaching and fitness tracking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <main className="min-h-screen text-slate-100 selection:bg-cyan-500/30">
            {children}
        </main>
      </body>
    </html>
  );
}
