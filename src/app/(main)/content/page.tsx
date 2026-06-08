import { createClient } from "@/lib/supabase/server";
import ContentForm from "./ContentForm";
import ContentList from "./ContentList";

export const dynamic = "force-dynamic";

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort: cohortName } = await searchParams;
  const sb = await createClient();
  const { data: cohort } = await sb.from("cohorts").select("id").eq("name", cohortName ?? "14기").single();
  const { data: items } = await sb
    .from("content_log")
    .select("*")
    .eq("cohort_id", cohort?.id)
    .order("pub_date", { ascending: true });

  const list = items ?? [];
  const clickSum = list.reduce((s, c) => s + (c.bitly_clicks ?? 0), 0);

  return (
    <div className="bg-slate-50 min-h-screen p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-800">🎬 {cohortName ?? "14기"} 콘텐츠 기록</h1>
        <div className="text-right">
          <div className="text-xs text-slate-500">총 {list.length}건 · 누적 클릭</div>
          <div className="text-xl font-extrabold text-slate-800">{clickSum.toLocaleString("ko-KR")}</div>
        </div>
      </div>
      <p className="text-sm text-slate-500 -mt-3">
        발행한 콘텐츠를 기록하면 비교차트 📌액션 핀과 AI 분석에 자동 반영됩니다. (마케팅 액션 메모는 여기 한 곳만 사용)
      </p>

      <ContentForm cohortId={cohort?.id} />

      <ContentList items={list} />
    </div>
  );
}
