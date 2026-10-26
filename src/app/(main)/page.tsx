// ① 판단판 — 탭: 오늘 판단판 / AI 브리핑 추세 (화면 내용은 _views 그대로)
import TabShell from "@/components/TabShell";
import { MENUS, resolveTab } from "@/lib/nav";
import TodayPage from "./_views/today/page";
import BriefHistoryPage from "./_views/brief-history/page";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function JudgmentMenu({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const menu = MENUS[0];
  const tab = resolveTab(menu, sp.tab);
  const cohort = typeof sp.cohort === "string" ? sp.cohort : undefined;
  const view = searchParams as never;
  return (
    <>
      <TabShell menu={menu} active={tab} cohort={cohort} />
      {tab === "brief" ? <BriefHistoryPage searchParams={view} /> : <TodayPage searchParams={view} />}
    </>
  );
}
