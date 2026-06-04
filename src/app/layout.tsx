import type { Metadata } from "next";
import { Orbitron } from "next/font/google";
import "./globals.css";

const orbitron = Orbitron({
  subsets: ["latin"],
  variable: "--font-orbitron",
  weight: ["500", "700", "900"],
});

export const metadata: Metadata = {
  title: "310 MARKETING DATA",
  description: "모멘트핏 다이어트 클래스 운영 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`h-full antialiased ${orbitron.variable}`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
