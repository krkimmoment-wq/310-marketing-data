import { getKpi } from "@/lib/kpi";
import { getDayComparison } from "@/lib/comparison";
import { resolveCohortPair } from "@/lib/cohorts";
import CountUp from "@/components/CountUp";
import AiBriefing from "@/components/AiBriefing";
import DayComparisonChart from "@/components/DayComparisonChart";

export const dynamic = "force-dynamic";

const SECTIONS = ["사전등록", "1차EB", "대기1", "2차EB", "대기2", "정규", "추가"];

const DARK_BG: React.CSSProperties = {
  background:
    "radial-gradient(1200px 600px at 80% -10%, rgba(0,229,255,0.10), transparent), radial-gradient(900px 500px at 0% 110%, rgba(59,130,246,0.10), transparent), #070b16",
};

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort } = await searchParams;
  // 기본 = 최신 기수(시간순), 대조 = 그 직전 기수 (id 순서가 시간순이 아니라 pre_open 기준)
  const { currentName, previousName } = await resolveCohortPair(cohort);
  const kpi = await getKpi(currentName);
  if (!kpi)
    return (
      <div style={DARK_BG} className="min-h-screen p-8 text-slate-300">
        {currentName} 데이터를 찾을 수 없습니다.
      </div>
    );

  const maxSection = Math.max(1, ...SECTIONS.map((s) => kpi.bySection[s] ?? 0));
  const dayCmp = await getDayComparison(
    previousName ? [currentName, previousName] : [currentName]
  );

  // 페이스 비교 + 신호등
  const paceRatio = kpi.requiredPace > 0 ? kpi.currentPace / kpi.requiredPace : 1;
  const paceLight =
    paceRatio >= 1
      ? { emoji: "🟢", text: "목표 궤도", cls: "text-emerald-300", bar: "#22c55e" }
      : paceRatio >= 0.8
        ? { emoji: "🟡", text: "추격 필요", cls: "text-amber-300", bar: "#f59e0b" }
        : { emoji: "🔴", text: "큰 부족", cls: "text-rose-300", bar: "#ef4444" };
  const paceGapPct = Math.round((paceRatio - 1) * 100);
  const needMore = Math.max(0, Math.round((kpi.requiredPace - kpi.currentPace) * 100) / 100);

  return (
    <div style={DARK_BG} className="scanlines jarvis-grid-line min-h-screen p-6 md:p-8 text-slate-100">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6 fade-up">
        <div>
          <h1 className="font-hud text-2xl md:text-3xl font-black tracking-widest jarvis-glow jarvis-neon">
            310 MARKETING DATA
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {kpi.cohortName} 운영 상황판 · {kpi.ddayLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-hud text-cyan-300">
          <span className="live-dot" /> LIVE
        </div>
      </div>

      {/* AI 브리핑 (Gemini — 키 없으면 규칙 기반 fallback) */}
      <AiBriefing fallback={kpi.insights} cohort={currentName} />

      {/* D-Day 8분기점 타임라인 */}
      <div className="jarvis-card p-4 mb-6 fade-up" style={{ animationDelay: "0.08s" }}>
        <div className="font-hud text-[11px] uppercase tracking-[0.25em] text-cyan-400/70 mb-3">D-DAY 일정</div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {kpi.timeline.map((m) => (
            <div
              key={m.label}
              className={`flex-shrink-0 min-w-[88px] flex-1 rounded-lg p-2 text-center border ${
                m.status === "today"
                  ? "border-rose-400 bg-rose-500/10"
                  : m.status === "past"
                    ? "border-slate-800 opacity-45"
                    : "border-cyan-500/40 bg-cyan-500/5"
              }`}
            >
              <div className={`font-hud text-sm font-black ${m.status === "today" ? "text-rose-300" : m.status === "past" ? "text-slate-400" : "text-cyan-200"}`}>
                {m.status === "past" ? "완료" : m.dday === 0 ? "D-Day" : `D-${m.dday}`}
              </div>
              <div className="text-[10px] text-slate-300 mt-0.5 leading-tight">{m.label}</div>
              <div className="text-[9px] text-slate-500 mt-0.5">{m.date.slice(5)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* KPI 4카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {[
          { d: 0.1, label: "실등록", main: <CountUp value={kpi.realRegs} suffix="명" />, sub: `목표 ${kpi.goal} · ${kpi.progressPct}%`, accent: true },
          { d: 0.15, label: "ROAS", main: <CountUp value={kpi.roas} decimals={1} suffix="배" />, sub: `광고 ₩1 → ₩${kpi.roas}` },
          { d: 0.2, label: "매출", main: <CountUp value={kpi.totalRevenue} prefix="₩" />, sub: `광고비 ₩${kpi.totalAd.toLocaleString("ko-KR")}` },
          { d: 0.25, label: "예상 최종", main: <CountUp value={kpi.projectedFinal} suffix="명" />, sub: `페이스 ${kpi.currentPace}명/일` },
        ].map((m) => (
          <div key={m.label} className={`jarvis-card${m.accent ? " jarvis-accent" : ""} p-6 fade-up`} style={{ animationDelay: `${m.d}s` }}>
            <div className="font-hud text-[11px] uppercase tracking-[0.2em] text-cyan-400/70">{m.label}</div>
            <div className="font-hud text-3xl font-black text-white mt-2.5 jarvis-glow">{m.main}</div>
            <div className="text-[11px] text-slate-400 mt-1.5">{m.sub}</div>
          </div>
        ))}
      </div>

      {/* 진척 게이지 */}
      <div className="jarvis-card p-5 mb-6 fade-up" style={{ animationDelay: "0.3s" }}>
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-200">목표 달성률</span>
          <span className="font-hud text-cyan-300">{kpi.realRegs} / {kpi.goal}</span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bar-glow anim-fx"
            style={{ width: `${Math.min(kpi.progressPct, 100)}%`, background: "linear-gradient(90deg,#00e5ff,#3b82f6)" }}
          />
        </div>
        <div className="font-hud text-right text-3xl font-black jarvis-neon jarvis-glow mt-2">
          <CountUp value={kpi.progressPct} decimals={1} suffix="%" />
        </div>
      </div>

      {/* 페이스 비교 + 신호등 */}
      <div className="jarvis-card p-5 mb-6 fade-up" style={{ animationDelay: "0.32s" }}>
        <div className="flex items-center justify-between mb-4">
          <span className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80">목표 페이스 비교</span>
          <span className={`text-sm font-bold ${paceLight.cls}`}>
            {paceLight.emoji} {paceLight.text} ({paceGapPct > 0 ? "+" : ""}{paceGapPct}%)
          </span>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs text-slate-400 w-10">필요</span>
          <div className="flex-1 h-7 bg-slate-800 rounded-md overflow-hidden">
            <div className="h-full rounded-md flex items-center px-2 anim-fx" style={{ width: "100%", background: "#3b82f6" }}>
              <span className="text-xs text-white font-bold">{kpi.requiredPace}명/일</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 w-10">현재</span>
          <div className="flex-1 h-7 bg-slate-800 rounded-md overflow-hidden">
            <div
              className="h-full rounded-md flex items-center px-2 bar-glow anim-fx"
              style={{ width: `${Math.min(paceRatio * 100, 100)}%`, background: paceLight.bar, minWidth: "70px" }}
            >
              <span className="text-xs text-white font-bold">{kpi.currentPace}명/일</span>
            </div>
          </div>
        </div>
        <div className="text-center text-sm text-cyan-200 mt-4 bg-cyan-500/10 rounded-md py-1.5">
          {needMore > 0 ? (
            <>하루 <b className="text-white">{needMore}명</b> 더 등록되면 목표 달성 궤도</>
          ) : (
            <>현재 페이스로 목표 달성 가능 ✅</>
          )}
        </div>
        <div className="text-center text-[11px] text-slate-500 mt-1">
          남은 {kpi.daysLeft}일 · 목표까지 {Math.max(0, kpi.goal - kpi.realRegs)}명 (페이스 {kpi.currentPace} → 예상 최종 {kpi.projectedFinal}명)
        </div>
      </div>

      {/* 13기 vs 14기 D-Day별 비교 라인차트 */}
      {dayCmp && (
        <div className="mb-6">
          <DayComparisonChart data={dayCmp} />
        </div>
      )}

      {/* 구간별 바차트 */}
      <div className="jarvis-card p-5 fade-up" style={{ animationDelay: "0.35s" }}>
        <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80 mb-4">구간별 실등록</div>
        <div className="flex items-end gap-3 h-40">
          {SECTIONS.map((s) => {
            const val = kpi.bySection[s] ?? 0;
            const h = Math.max((val / maxSection) * 100, 4);
            return (
              <div key={s} className="flex-1 flex flex-col items-center justify-end gap-2">
                <div className="font-hud text-sm font-bold text-cyan-200">{val}</div>
                <div
                  className="w-full rounded-t-md bar-glow anim-fy"
                  style={{ height: `${h}%`, background: "linear-gradient(180deg,#00e5ff,#1e3a8a)", minHeight: "4px" }}
                />
                <div className="text-[10px] text-slate-400 text-center leading-tight">{s}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
