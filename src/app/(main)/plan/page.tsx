// ③ (가장 최근 기수) 계획 — 탭: 계획 캘린더 / 광고 예산 / 기록 캘린더
import TabShell from "@/components/TabShell";
import { MENUS, resolveTab, latestCohortName } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import PlanBoardPage from "../_views/plan-board/page";
import PlanBudgetPage from "../_views/plan-budget/page";
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
  const latestName = latestCohortName(data ?? []);
  return (
    <>
      <TabShell menu={menu} active={tab} cohort={cohort} latestName={latestName} />
      {tab === "plan" ? <PlanBoardPage /> : tab === "budget" ? <PlanBudgetPage /> : <CalendarPage searchParams={searchParams as never} />}
    </>
  );
}
