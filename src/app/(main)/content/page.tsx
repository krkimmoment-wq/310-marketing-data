import { createClient } from "@/lib/supabase/server";
import { getLatestCohortName } from "@/lib/cohorts";
import ContentForm from "./ContentForm";
import ContentList from "./ContentList";

export const dynamic = "force-dynamic";

const DARK_BG: React.CSSProperties = {
  background:
    "radial-gradient(1200px 600px at 80% -10%, rgba(0,229,255,0.10), transparent), radial-gradient(900px 500px at 0% 110%, rgba(59,130,246,0.10), transparent), #070b16",
};

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort: cohortName } = await searchParams;
  const name = cohortName ?? (await getLatestCohortName());
  const sb = await createClient();
  const { data: cohort } = await sb.from("cohorts").select("id").eq("name", name).single();
  const { data: items } = await sb
    .from("content_log")
    .select("*")
    .eq("cohort_id", cohort?.id)
    .order("pub_date", { ascending: true });

  const list = items ?? [];
  const clickSum = list.reduce((s, c) => s + (c.bitly_clicks ?? 0), 0);

  return (
    <div style={DARK_BG} className="scanlines min-h-screen p-6 md:p-8 space-y-6 text-slate-100">
      <div className="flex items-center justify-between">
        <h1 className="font-hud text-2xl md:text-3xl font-black tracking-widest jarvis-glow jarvis-neon">🎬 {name} 콘텐츠 기록</h1>
        <div className="text-right">
          <div className="text-xs text-slate-400">총 {list.length}건 · 누적 클릭</div>
          <div className="text-xl font-extrabold text-slate-100">{clickSum.toLocaleString("ko-KR")}</div>
        </div>
      </div>
      <p className="text-sm text-slate-400 -mt-3">
        발행한 콘텐츠를 기록하면 비교차트 📌액션 핀과 AI 분석에 자동 반영됩니다. (마케팅 액션 메모는 여기 한 곳만 사용)
      </p>

      <ContentForm cohortId={cohort?.id} />

      <ContentList items={list} />
    </div>
  );
}
