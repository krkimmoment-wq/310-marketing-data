import Sidebar from "@/components/Sidebar";
import FloatingChat from "@/components/FloatingChat";
import { createClient } from "@/lib/supabase/server";
import { pickCurrentCohort } from "@/lib/cohorts";
import { latestCohortName } from "@/lib/nav";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const sb = await createClient();
  // 인증 가드 — getClaims()는 JWT 로컬 검증이라 매 전환 네트워크 왕복(getUser)을 없앰.
  // 실제 데이터 보호는 RLS가 담당하므로 이 가드는 redirect(UX)용으로 충분.
  const { data: claimsData } = await sb.auth.getClaims();
  if (!claimsData?.claims) redirect("/login");

  // 시간순(최신 우선) 정렬 — id 순서는 시간순이 아님(14기=1·13기=2·15기=4).
  // 목록은 최신순, 기본 선택은 "모집을 이미 시작한 기수 중 최신"(아직 시작 전인 다음 기수 제외)
  const { data: cohortsRaw } = await sb.from("cohorts").select("id,name,pre_open,class_start");
  const sorted = (cohortsRaw ?? [])
    .slice()
    .sort((a, b) => (b.pre_open ?? "").localeCompare(a.pre_open ?? ""));
  const cohorts = sorted.map((c) => ({ id: c.id, name: c.name }));
  const defaultCohort = pickCurrentCohort(sorted)?.name;
  // ③ 메뉴 이름에 붙는 "가장 최근에 등록된 기수" (모집 시작 전이어도 포함 — 예: 17기 계획)
  const latestName = latestCohortName(cohortsRaw ?? []);

  return (
    <div className="flex min-h-screen">
      <Sidebar cohorts={cohorts} defaultCohort={defaultCohort} latestName={latestName} />
      {/* 배경·패딩은 각 페이지가 직접 결정 (대시보드=다크 / 입력=밝게) */}
      <main className="flex-1 overflow-x-auto min-w-0">{children}</main>
      {/* 우측 하단 플로팅 AI 챗봇 (모든 페이지) */}
      <FloatingChat />
    </div>
  );
}
