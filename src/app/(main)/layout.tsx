import Sidebar from "@/components/Sidebar";
import FloatingChat from "@/components/FloatingChat";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const sb = await createClient();
  // 인증 가드 (Next 16 middleware Vercel 404 버그 회피 — middleware 대신 layout에서 보호)
  const { data: { user } } = await sb.auth.getUser();
  if (!user) redirect("/login");

  const { data: cohorts } = await sb.from("cohorts").select("id,name").order("id");

  return (
    <div className="flex min-h-screen">
      <Sidebar cohorts={cohorts ?? []} />
      {/* 배경·패딩은 각 페이지가 직접 결정 (대시보드=다크 / 입력=밝게) */}
      <main className="flex-1 overflow-x-auto min-w-0">{children}</main>
      {/* 우측 하단 플로팅 AI 챗봇 (모든 페이지) */}
      <FloatingChat />
    </div>
  );
}
