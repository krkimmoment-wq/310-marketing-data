// ③ (가장 최근 기수) 계획 — 탭: 계획 캘린더 / 광고 예산 / 광고 시뮬레이터 / 기록 캘린더
// 광고 시뮬레이터를 뺀 세 탭은 왼쪽 기수 선택(?cohort=)을 따름. 선택이 없으면 가장 최근 등록 기수. 화면 제목 = 고른 기수, 왼쪽 메뉴 이름 = 가장 최근 기수
import TabShell from "@/components/TabShell";
import { MENUS, resolveTab } from "@/lib/nav";
import { resolvePlanCohort } from "@/lib/planCore";
import { createClient } from "@/lib/supabase/server";
import PlanBoardPage from "../_views/plan-board/PlanBoardView";
import PlanBudgetPage from "../_views/plan-budget/PlanBudgetView";
import AdSimPage from "../_views/ad-sim/AdSimView";
import CalendarPage from "../_views/calendar/page";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function PlanMenu({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const menu = MENUS[2];
  const tab = resolveTab(menu, sp.tab);
  const cohort = typeof sp.cohort === "string" ? sp.cohort : undefined;
  const sb = await createClient();
  const { data } = await sb.from("cohorts").select("id,name,pre_open,class_start");
  const selected = resolvePlanCohort(data ?? [], cohort)?.name;
  return (
    <>
      <TabShell menu={menu} active={tab} cohort={cohort} latestName={selected} />
      {tab === "plan" ? (
        <PlanBoardPage cohortName={selected} />
      ) : tab === "budget" ? (
        <PlanBudgetPage cohortName={selected} />
      ) : tab === "sim" ? (
        <AdSimPage />
      ) : (
        <CalendarPage searchParams={Promise.resolve({ cohort: selected })} />
      )}
    </>
  );
}
