import { createClient } from "@/lib/supabase/server";
import YtRegChart from "@/components/YtRegChart";
import RegCompareChart from "@/components/RegCompareChart";
import TrafficCompareView from "@/components/TrafficCompare";
import TrafficBySectionView from "@/components/TrafficBySection";
import ConversionFunnelView from "@/components/ConversionFunnel";
import InsightBriefView from "@/components/InsightBrief";
import { getTrafficCompare, getTrafficBySection } from "@/lib/ytanalytics";
import { getConversionFunnel } from "@/lib/conversion";
import { getInsightBrief } from "@/lib/insightbrief";
import { getRegDaily } from "@/lib/regdaily";
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

// 스토리보드 STEP 헤더 (모듈 레벨 — render 중 컴포넌트 정의 회피)
function StepHead({ n, q, desc }: { n: string; q: string; desc: string }) {
  return (
    <div className="mb-3 mt-10">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="font-hud text-[11px] font-black bg-cyan-500/20 text-cyan-300 px-2.5 py-1 rounded-lg border border-cyan-500/30">{n}</span>
        <span className="font-bold text-slate-100 text-base md:text-lg">{q}</span>
      </div>
      <div className="text-xs text-slate-400 mt-1.5 leading-relaxed">{desc}</div>
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
  const { data: co } = await sb
    .from("cohorts")
    .select("id, pre_open, class_start")
    .eq("name", cohort)
    .single();

  const [{ data: regs }, { data: yts }] = await Promise.all([
    sb.from("registrations").select("reg_date, payment, is_refund, is_transfer").eq("cohort_id", co?.id),
    sb.from("yt_video").select("pub_date, title, views, kind").eq("cohort_id", co?.id).order("pub_date"),
  ]);

  const real = (regs ?? []).filter((r) => r.payment === "입금완료" && !r.is_refund && !r.is_transfer && r.reg_date);
  const regBy: Record<string, number> = {};
  for (const r of real) regBy[r.reg_date] = (regBy[r.reg_date] ?? 0) + 1;
  const vidBy: Record<string, { title: string; views: number; kind: string }[]> = {};
  for (const v of yts ?? []) {
    if (!v.pub_date) continue;
    (vidBy[v.pub_date] ||= []).push({ title: v.title ?? "", views: v.views ?? 0, kind: v.kind ?? "롱폼" });
  }

  const start = co?.pre_open ?? Object.keys(regBy).sort()[0];
  const todayKst = kstTodayStr();
  const days: DayPoint[] = [];
  if (start) {
    for (let d = new Date(start + "T00:00:00Z"); d.toISOString().slice(0, 10) <= todayKst; d.setUTCDate(d.getUTCDate() + 1)) {
      const ds = d.toISOString().slice(0, 10);
      days.push({ date: ds, regs: regBy[ds] ?? 0, videos: vidBy[ds] ?? [] });
    }
  }

  const traffic = await getTrafficCompare(cohort);
  const trafficSec = await getTrafficBySection(cohort);
  const funnel = await getConversionFunnel(cohort);
  const brief = await getInsightBrief(cohort);
  const regDaily = await getRegDaily(cohort);

  const totalReg = real.length;
  const totalVid = (yts ?? []).length;
  const shortN = (yts ?? []).filter((v) => v.kind === "숏폼").length;
  const longN = totalVid - shortN;
  const totalViews = (yts ?? []).reduce((s, v) => s + (v.views ?? 0), 0);

  return (
    <div style={DARK_BG} className="scanlines min-h-screen p-6 md:p-8 text-slate-100">
      <div className="mb-2 pt-10 md:pt-0">
        <h1 className="font-hud text-2xl md:text-3xl font-black tracking-widest jarvis-glow jarvis-neon">
          유입·전환 분석
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {cohort} 모객, 어디가 잘 됐고 어디서 무너졌나 — 위에서 아래로 따라 읽으면 결론이 나옵니다.
        </p>
      </div>

      {/* STEP 1 — 결론 */}
      <StepHead
        n="STEP 1 · 결론"
        q="지금 문제가 '유입'이냐 '전환'이냐?"
        desc="유입(조회·클릭)과 전환(등록)을 직전 기수와 같은 진행 시점까지 대조한 자동 진단. 빨강 지표가 무너진 곳입니다."
      />
      {brief ? (
        <InsightBriefView data={brief} />
      ) : (
        <div className="jarvis-card p-5 text-sm text-slate-400">비교할 직전 기수 데이터가 부족합니다.</div>
      )}

      {/* 요약 카드 */}
      <div className="grid grid-cols-3 gap-5 mt-5">
        <div className="jarvis-card jarvis-accent p-5"><div className="text-[11px] text-slate-400">기간 실등록</div><div className="font-hud text-3xl font-black text-cyan-300 mt-2 jarvis-glow">{totalReg}명</div></div>
        <div className="jarvis-card p-5"><div className="text-[11px] text-slate-400">발행 영상</div><div className="font-hud text-3xl font-black text-white mt-2">{totalVid}개</div><div className="text-[11px] mt-1"><span className="text-rose-300">▶롱폼 {longN}</span> · <span className="text-purple-300">⚡숏폼 {shortN}</span></div></div>
        <div className="jarvis-card p-5"><div className="text-[11px] text-slate-400">영상 누적 조회</div><div className="font-hud text-3xl font-black text-white mt-2">{totalViews.toLocaleString("ko-KR")}</div></div>
      </div>

      {/* STEP 2 — 어디서 */}
      <StepHead
        n="STEP 2 · 어디서"
        q="어느 구간에서 등록이 무너졌나?"
        desc="구간별 조회 → 클릭(EB링크 유입) → 등록 → 전환율. 클릭(유입)은 많은데 전환율이 빨강이면 = '온 사람을 못 잡은' 구간입니다."
      />
      {funnel && <ConversionFunnelView data={funnel} />}

      {/* STEP 3 — 왜 (트래픽 질) */}
      <StepHead
        n="STEP 3 · 왜"
        q="그 트래픽은 어떤 '질'이었나?"
        desc="여기 항목은 '영상 유형'(롱폼/쇼츠)이 아니라 '유입 경로'(어디서 봤나)입니다. 검색·구독피드 = 의도 높은 사람(찾아옴/팬) · 쇼츠피드 = 쇼츠 탭을 넘기다 스친 사람 · 광고 = 유료 프로모션. ※같은 쇼츠 영상도 검색으로 보면 '검색', 쇼츠 탭에서 보면 '쇼츠피드'로 잡힙니다. 롱폼 영상은 검색·추천·구독 경로에 포함됩니다."
      />
      {trafficSec && <TrafficBySectionView data={trafficSec} />}

      {/* STEP 4 — 13기 대비 등록 페이스 */}
      <StepHead
        n="STEP 4 · 페이스"
        q="직전 기수 대비 등록 '속도'가 어떤가?"
        desc="클래스 시작일(D-Day)을 기준으로 같은 시점끼리 누적 등록을 겹쳐 봅니다. 초반에 앞서도 클래스 임박 막판(D-10~D-1) 폭발에서 승부가 갈립니다. 같은 D-N끼리 봐야 정확합니다."
      />
      {regDaily ? (
        <RegCompareChart data={regDaily} />
      ) : (
        <div className="jarvis-card p-5 text-sm text-slate-400">비교할 직전 기수 일별 데이터가 부족합니다.</div>
      )}

      {/* STEP 5 — 콘텐츠 양 검증 */}
      <StepHead
        n="STEP 5 · 검증"
        q="콘텐츠 '양'은 영향이 있었나?"
        desc="발행 마커(▶롱폼·⚡숏폼)가 많은 날 vs 등록 막대. 발행이 많아도 등록이 안 늘면 = 양은 변수가 아니라는 증거입니다."
      />
      {days.length === 0 ? (
        <div className="jarvis-card p-6 text-sm text-slate-300">아직 데이터가 없습니다. sync 후 표시됩니다.</div>
      ) : (
        <YtRegChart days={days} />
      )}

      {/* 부록 — 전체 트래픽 소스 */}
      <StepHead
        n="부록"
        q="모집기간 전체 트래픽 소스 (참고)"
        desc="모집기간 길이가 기수마다 달라 총량 절대비교는 부정확 — 소스 믹스(비중%) 위주로만 참고하세요. 정확한 화력 비교는 STEP 3."
      />
      {traffic && <TrafficCompareView data={traffic} />}

      <div className="text-[11px] text-slate-500 mt-6 leading-relaxed jarvis-card p-4">
        💡 <b className="text-slate-300">읽는 법 요약</b> — STEP1(결론: 유입이냐 전환이냐) → STEP2(어느 구간) → STEP3(트래픽 질이 어땠나) → STEP4(콘텐츠 양은 무관 확인).
        오퍼·할인·기간이 기수 간 동일하다면, 전환 차이는 <b className="text-cyan-300">트래픽 질·프로모션 운영</b>에서 찾아야 합니다.
      </div>
    </div>
  );
}
