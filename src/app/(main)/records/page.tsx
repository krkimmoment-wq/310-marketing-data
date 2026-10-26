// ④ 집행 기록 — 탭: 광고비 / 카톡 메시지 / 콘텐츠 기록 (화면 내용은 _views 그대로)
import TabShell from "@/components/TabShell";
import { MENUS, resolveTab } from "@/lib/nav";
import AdSpendPage from "../_views/ad-spend/page";
import KakaoMessagePage from "../_views/kakao-message/page";
import ContentPage from "../_views/content/page";

export const dynamic = "force-dynamic";

type SP = Promise<Record<string, string | string[] | undefined>>;

export default async function RecordsMenu({ searchParams }: { searchParams: SP }) {
  const sp = await searchParams;
  const menu = MENUS[3];
  const tab = resolveTab(menu, sp.tab);
  const cohort = typeof sp.cohort === "string" ? sp.cohort : undefined;
  const view = searchParams as never;
  return (
    <>
      <TabShell menu={menu} active={tab} cohort={cohort} />
      {tab === "kakao" ? (
        <KakaoMessagePage searchParams={view} />
      ) : tab === "content" ? (
        <ContentPage searchParams={view} />
      ) : (
        <AdSpendPage searchParams={view} />
      )}
    </>
  );
}
