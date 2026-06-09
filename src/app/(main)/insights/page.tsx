import { createClient } from "@/lib/supabase/server";
import YtRegChart from "@/components/YtRegChart";
import TrafficCompareView from "@/components/TrafficCompare";
import TrafficBySectionView from "@/components/TrafficBySection";
import { getTrafficCompare, getTrafficBySection } from "@/lib/ytanalytics";
import { kstTodayStr } from "@/lib/date";

export const dynamic = "force-dynamic";

const DARK_BG: React.CSSProperties = {
  background:
    "radial-gradient(1200px 600px at 80% -10%, rgba(0,229,255,0.10), transparent), radial-gradient(900px 500px at 0% 110%, rgba(59,130,246,0.10), transparent), #070b16",
};

export type DayPoint = {
  date: string;
  regs: number;
  videos: { title: string; views: number; kind: string }[];
};

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort: cohortName } = await searchParams;
  const sb = await createClient();
  const { data: co } = await sb
    .from("cohorts")
    .select("id, pre_open, class_start")
    .eq("name", cohortName ?? "14기")
    .single();

  const [{ data: regs }, { data: yts }] = await Promise.all([
    sb.from("registrations").select("reg_date, payment, is_refund, is_transfer").eq("cohort_id", co?.id),
    sb.from("yt_video").select("pub_date, title, views, kind").eq("cohort_id", co?.id).order("pub_date"),
  ]);

  // 일별 집계
  const real = (regs ?? []).filter((r) => r.payment === "입금완료" && !r.is_refund && !r.is_transfer && r.reg_date);
  const regBy: Record<string, number> = {};
  for (const r of real) regBy[r.reg_date] = (regBy[r.reg_date] ?? 0) + 1;
  const vidBy: Record<string, { title: string; views: number; kind: string }[]> = {};
  for (const v of yts ?? []) {
    if (!v.pub_date) continue;
    (vidBy[v.pub_date] ||= []).push({ title: v.title ?? "", views: v.views ?? 0, kind: v.kind ?? "롱폼" });
  }

  // 날짜축: pre_open ~ 오늘(KST)
  const start = co?.pre_open ?? Object.keys(regBy).sort()[0];
  const todayKst = kstTodayStr();
  const days: DayPoint[] = [];
  if (start) {
    for (let d = new Date(start + "T00:00:00Z"); d.toISOString().slice(0, 10) <= todayKst; d.setUTCDate(d.getUTCDate() + 1)) {
      const ds = d.toISOString().slice(0, 10);
      days.push({ date: ds, regs: regBy[ds] ?? 0, videos: vidBy[ds] ?? [] });
    }
  }

  const traffic = await getTrafficCompare(cohortName ?? "14기");
  const trafficSec = await getTrafficBySection(cohortName ?? "14기");

  const totalReg = real.length;
  const totalVid = (yts ?? []).length;
  const shortN = (yts ?? []).filter((v) => v.kind === "숏폼").length;
  const longN = totalVid - shortN;
  const totalViews = (yts ?? []).reduce((s, v) => s + (v.views ?? 0), 0);

  return (
    <div style={DARK_BG} className="scanlines min-h-screen p-6 md:p-8 text-slate-100">
      <div className="mb-5 pt-10 md:pt-0">
        <h1 className="font-hud text-2xl md:text-3xl font-black tracking-widest jarvis-glow jarvis-neon">
          유입·전환 분석
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {cohortName ?? "14기"} · 일별 등록 ↔ YouTube 영상 발행 대조 (발행일에 어떤 콘텐츠가 전환을 끌었나)
        </p>
      </div>

      <div className="grid grid-cols-3 gap-5 mb-6">
        <div className="jarvis-card jarvis-accent p-5"><div className="text-[11px] text-slate-400">기간 실등록</div><div className="font-hud text-3xl font-black text-cyan-300 mt-2 jarvis-glow">{totalReg}명</div></div>
        <div className="jarvis-card p-5"><div className="text-[11px] text-slate-400">발행 영상</div><div className="font-hud text-3xl font-black text-white mt-2">{totalVid}개</div><div className="text-[11px] mt-1"><span className="text-rose-300">▶롱폼 {longN}</span> · <span className="text-purple-300">⚡숏폼 {shortN}</span></div></div>
        <div className="jarvis-card p-5"><div className="text-[11px] text-slate-400">영상 누적 조회</div><div className="font-hud text-3xl font-black text-white mt-2">{totalViews.toLocaleString("ko-KR")}</div></div>
      </div>

      {days.length === 0 ? (
        <div className="jarvis-card p-6 text-sm text-slate-300">아직 데이터가 없습니다. sync 후 표시됩니다.</div>
      ) : (
        <YtRegChart days={days} />
      )}

      {/* YouTube 트래픽 소스 — 구간별 대조 (핵심) */}
      {trafficSec && (
        <div className="mt-6">
          <TrafficBySectionView data={trafficSec} />
        </div>
      )}

      {/* YouTube 트래픽 소스 — 모집기간 전체 대조 (요약) */}
      {traffic && (
        <div className="mt-6">
          <TrafficCompareView data={traffic} />
        </div>
      )}

      <div className="text-[11px] text-slate-500 mt-3 leading-relaxed">
        ▶ = 그날 발행한 YouTube 영상 (마커에 커서 → 제목·조회수). 막대 = 일별 실등록.
        영상 조회수는 누적값이라 &quot;그날 조회 추이&quot;는 다음 단계(YouTube Analytics 연동)에서 추가됩니다.
      </div>
    </div>
  );
}
