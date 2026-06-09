import { createClient } from "@/lib/supabase/server";
import PubCompareChart from "@/components/PubCompareChart";
import PubBySectionView from "@/components/PubBySection";
import PromotionTracker from "@/components/PromotionTracker";
import DailyCockpit from "@/components/DailyCockpit";
import TrafficCompareView from "@/components/TrafficCompare";
import TrafficBySectionView from "@/components/TrafficBySection";
import ConversionFunnelView from "@/components/ConversionFunnel";
import InsightBriefView from "@/components/InsightBrief";
import { getTrafficCompare, getTrafficBySection } from "@/lib/ytanalytics";
import { getConversionFunnel } from "@/lib/conversion";
import { getInsightBrief } from "@/lib/insightbrief";
import { getRegDaily } from "@/lib/regdaily";
import { getPubDaily } from "@/lib/pubdaily";
import { getPubBySection } from "@/lib/pubsection";
import { getPromotions } from "@/lib/promotion";
import { kstTodayStr } from "@/lib/date";

export const dynamic = "force-dynamic";

const DARK_BG: React.CSSProperties = {
  background:
    "radial-gradient(1200px 600px at 80% -10%, rgba(0,229,255,0.10), transparent), radial-gradient(900px 500px at 0% 110%, rgba(59,130,246,0.10), transparent), #070b16",
};

// STEP 헤더 (텍스트 최소 — 질문 한 줄만). 모듈 레벨로 둬서 render 중 컴포넌트 정의 회피
function StepHead({ n, q }: { n: string; q: string }) {
  return (
    <div className="mb-3 mt-9 flex items-center gap-2 flex-wrap">
      <span className="font-hud text-[11px] font-black bg-cyan-500/20 text-cyan-300 px-2.5 py-1 rounded-lg border border-cyan-500/30">{n}</span>
      <span className="font-bold text-slate-100 text-base md:text-lg">{q}</span>
    </div>
  );
}

// KPI 카드 (숫자 1개 + 13기 대비)
function Kpi({ label, val, sub, good }: { label: string; val: string; sub?: string; good?: boolean }) {
  return (
    <div className="jarvis-card p-4">
      <div className="text-[11px] text-slate-400 leading-tight">{label}</div>
      <div className={`font-hud text-2xl font-black mt-1 ${good === undefined ? "text-white" : good ? "text-emerald-300" : "text-rose-300"}`}>
        {val}{good !== undefined ? (good ? " ▲" : " ▼") : ""}
      </div>
      {sub && <div className="text-[10px] text-amber-200/70 mt-0.5">{sub}</div>}
    </div>
  );
}

export default async function InsightsPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort: cohortName } = await searchParams;
  const cohort = cohortName ?? "14기";
  const sb = await createClient();
  const { data: co } = await sb.from("cohorts").select("id, pre_open, class_start").eq("name", cohort).single();

  const [{ data: regs }, { data: yts }] = await Promise.all([
    sb.from("registrations").select("reg_date, payment, is_refund, is_transfer").eq("cohort_id", co?.id),
    sb.from("yt_video").select("views, kind").eq("cohort_id", co?.id),
  ]);
  const real = (regs ?? []).filter((r) => r.payment === "입금완료" && !r.is_refund && !r.is_transfer && r.reg_date);

  const traffic = await getTrafficCompare(cohort);
  const trafficSec = await getTrafficBySection(cohort);
  const funnel = await getConversionFunnel(cohort);
  const brief = await getInsightBrief(cohort);
  const regDaily = await getRegDaily(cohort);
  const pubDaily = await getPubDaily(cohort);
  const pubSec = await getPubBySection(cohort);
  const promo = await getPromotions(cohort);

  const totalReg = real.length;
  const totalVid = (yts ?? []).length;
  const totalViews = (yts ?? []).reduce((s, v) => s + (v.views ?? 0), 0);

  // 코크핏
  const TARGET = 150;
  const todayKst = kstTodayStr();
  const yesterdayKst = new Date(Date.parse(todayKst) - 86400000).toISOString().slice(0, 10);
  const todayNew = real.filter((r) => r.reg_date === todayKst).length;
  const yesterdayNew = real.filter((r) => r.reg_date === yesterdayKst).length;
  const dDay = regDaily ? -regDaily.curToday : co?.class_start ? -Math.round((Date.parse(todayKst) - Date.parse(co.class_start)) / 86400000) : null;

  // STEP1 핵심 6지표 (조회·클릭·등록·전환율 + 발행·누적조회)
  const kpis: { label: string; val: string; sub?: string; good?: boolean }[] = [
    ...(brief?.points ?? []).map((p) => ({ label: p.label, val: p.a, sub: `${brief!.bName} ${p.b}`, good: p.good })),
    { label: "발행 영상", val: `${totalVid}개`, sub: pubDaily ? `${pubDaily.prevName} 같은시점 ${pubDaily.prevAtToday}개` : undefined, good: pubDaily ? totalVid >= pubDaily.prevAtToday : undefined },
    { label: "영상 누적 조회", val: totalViews.toLocaleString("ko-KR") },
  ];

  return (
    <div style={DARK_BG} className="scanlines min-h-screen p-6 md:p-8 text-slate-100">
      <div className="mb-4 pt-10 md:pt-0">
        <h1 className="font-hud text-2xl md:text-3xl font-black tracking-widest jarvis-glow jarvis-neon">유입·전환 분석</h1>
      </div>

      {/* 채널 탭 — 현재 YouTube 단일. 인스타 연동 시 탭 추가 */}
      <div className="flex gap-1 mb-5 border-b border-slate-800">
        <div className="px-4 py-2 border-b-2 border-cyan-400 text-cyan-300 font-bold text-sm flex items-center gap-1.5"><span>📺</span> YouTube</div>
        <div className="px-4 py-2 text-slate-600 text-sm flex items-center gap-1.5 cursor-not-allowed" title="인스타 API 연동 후 활성화됩니다"><span className="opacity-50">📷</span> Instagram <span className="text-[10px] border border-slate-700 rounded px-1 py-0.5">연동 예정</span></div>
      </div>

      {/* 상단 고정 — AI 브리핑 (텍스트 진단은 여기 한 곳에만) */}
      {brief && <div className="mb-5"><InsightBriefView data={brief} /></div>}

      {/* 코크핏 — 오늘 현황 (숫자) */}
      <DailyCockpit
        cohortName={cohort}
        channel="YouTube"
        dDay={dDay}
        total={totalReg}
        target={TARGET}
        todayNew={todayNew}
        yesterdayNew={yesterdayNew}
        prevName={regDaily?.prevName ?? null}
        prevAtToday={regDaily?.prevAtToday ?? null}
      />

      {/* STEP 1 — 핵심 지표 */}
      <StepHead n="STEP 1" q="핵심 지표 (13기 대비)" />
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {kpis.map((k) => <Kpi key={k.label} {...k} />)}
      </div>

      {/* STEP 2 — 전환 퍼널 */}
      <StepHead n="STEP 2" q="어느 구간에서 전환이 무너졌나" />
      {funnel && <ConversionFunnelView data={funnel} />}

      {/* STEP 3 — 트래픽 질 */}
      <StepHead n="STEP 3" q="유입 트래픽의 질 — 검색·구독 = 의도 / 쇼츠피드 = 스침" />
      {trafficSec && <TrafficBySectionView data={trafficSec} />}

      {/* STEP 4 — 발행 13기 vs 14기 */}
      <StepHead n="STEP 4" q="콘텐츠 발행 13기 vs 14기 — 막판까지 멈췄나" />
      {pubDaily ? <PubCompareChart data={pubDaily} /> : <div className="jarvis-card p-5 text-sm text-slate-400">비교할 직전 기수 발행 데이터가 부족합니다.</div>}
      {pubSec && <PubBySectionView data={pubSec} />}

      {/* STEP 5 — 프로모션 (유료광고) */}
      <StepHead n="STEP 5" q="프로모션(유료광고) 13기 vs 14기 — 길게 풀었나, 끊었나" />
      {promo ? <PromotionTracker data={promo} /> : <div className="jarvis-card p-5 text-sm text-slate-400">프로모션 데이터가 없습니다.</div>}

      {/* 부록 — 전체 트래픽 소스 */}
      <StepHead n="부록" q="모집기간 전체 트래픽 소스 (참고)" />
      {traffic && <TrafficCompareView data={traffic} />}
    </div>
  );
}
