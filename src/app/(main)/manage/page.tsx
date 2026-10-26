// ⑤ 등록·기수 관리 — 탭: 등록 명단 / 기수 설정 / SNS·채널 (화면 내용은 _views 그대로)
import TabShell from "@/components/TabShell";
import { MENUS, resolveTab } from "@/lib/nav";
import RegistrationsPage from "../_views/registrations/page";
import CohortsPage from "../_views/cohorts/page";
import SnsPage from "../_views/sns/page";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function ManageMenu({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const menu = MENUS[4];
  const tab = resolveTab(menu, sp.tab);
  const cohort = typeof sp.cohort === "string" ? sp.cohort : undefined;
  const view = searchParams as never;
  return (
    <>
      <TabShell menu={menu} active={tab} cohort={cohort} />
      {tab === "cohorts" ? (
        <CohortsPage />
      ) : tab === "sns" ? (
        <SnsPage searchParams={view} />
      ) : (
        <RegistrationsPage searchParams={view} />
      )}
    </>
  );
}
