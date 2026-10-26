// ② 기수 비교 — 탭: Day 비교 / 구간 요약 / 기수별 비교 / 유입·전환 (화면 내용은 _views 그대로)
import TabShell from "@/components/TabShell";
import { MENUS, resolveTab } from "@/lib/nav";
import DailyPage from "../_views/daily/page";
import PhasesPage from "../_views/phases/page";
import CohortComparePage from "../_views/compare/page";
import InsightsPage from "../_views/insights/page";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function CompareMenu({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const menu = MENUS[1];
  // 옛 "기수별 비교" 주소(?a=·?b=)로 탭 없이 들어오면 기수별 비교 탭
  const tab = !sp.tab && (sp.a || sp.b) ? "cohort" : resolveTab(menu, sp.tab);
  const cohort = typeof sp.cohort === "string" ? sp.cohort : undefined;
  const view = searchParams as never;
  return (
    <>
      <TabShell menu={menu} active={tab} cohort={cohort} />
      {tab === "phase" ? (
        <PhasesPage searchParams={view} />
      ) : tab === "cohort" ? (
        <CohortComparePage searchParams={view} />
      ) : tab === "funnel" ? (
        <InsightsPage searchParams={view} />
      ) : (
        <DailyPage searchParams={view} />
      )}
    </>
  );
}
