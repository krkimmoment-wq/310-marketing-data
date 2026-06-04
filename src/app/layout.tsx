import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "310 운영 워크스페이스",
  description: "모멘트핏 다이어트 클래스 운영 대시보드",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
