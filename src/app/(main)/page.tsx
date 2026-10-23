import { Suspense } from "react";
import Link from "next/link";
import { getKpi, type Kpi } from "@/lib/kpi";
import { getDayComparison } from "@/lib/comparison";
import { getLatestCohortName, resolveCohortPair } from "@/lib/cohorts";
import { getDataHealth } from "@/lib/dataHealth";
import { getBoard } from "@/lib/board";
import { bandOf } from "@/lib/dayTableCore";
import DataHealthCard from "@/components/DataHealthCard";
import CountUp from "@/components/CountUp";
import AiBriefing from "@/components/AiBriefing";
import DayComparisonChart from "@/components/DayComparisonChart";
import { Chips, Diff, PhaseBadge, Sparkline, daysAgo, md } from "@/components/board/ui";

export const dynamic = "force-dynamic";

const SECTIONS = ["사전등록", "1차EB", "대기1", "2차EB", "대기2", "정규", "추가"];
const WD = ["일", "월", "화", "수", "목", "금", "토"];
const LEVEL = {
  act: { label: "오늘 조치", chip: "bg-red-700", row: "bg-red-50" },
  check: { label: "확인", chip: "bg-amber-700", row: "bg-orange-50" },
  good: { label: "좋음", chip: "bg-green-700", row: "bg-green-50" },
} as const;


// 다음 일정 (마감·오픈 중 오늘 이후 가장 가까운 것)
function nextMilestone(c: { [k: string]: string | null }, today: string) {
  const list: [string | null, string][] = [
    [c.eb1_open, "1차EB 오픈"], [c.eb1_close, "1차EB 마감"], [c.eb2_open, "2차EB 오픈"], [c.eb2_close, "2차EB 마감"],
    [c.reg_open, "정규 오픈"], [c.reg_close, "정규 마감"], [c.class_start, "클래스 시작"],
  ];
  for (const [d, label] of list) {
    if (!d || d < today) continue;
    const dd = daysAgo(today, d) ?? 0;
    return { label, when: dd === 0 ? "오늘" : `D-${dd}`, today: dd === 0 };
  }
  return null;
}

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ cohort?: string }> }) {
  const { cohort } = await searchParams;
  // 판단판 데이터와 KPI(공식 인원·목표)는 서로 기다릴 필요가 없어 동시에 조회
  const [board, kpi] = await Promise.all([getBoard(cohort), (cohort ? Promise.resolve(cohort) : getLatestCohortName()).then((n) => getKpi(n))]);
  if (!board)
    return <div className="min-h-screen bg-[#F6F6F3] p-8 text-gray-700">{cohort ?? "현재 기수"} 데이터를 찾을 수 없습니다.</div>;

  const { cohort: c, today, conclusion: con, status } = board;
  const sameCohort = kpi?.cohortName === c.name;
  const goal = sameCohort ? kpi!.goal : 0;
  const official = sameCohort ? kpi!.realRegs : con?.current ?? 0;
  const ms = nextMilestone(c as unknown as Record<string, string | null>, today);
  const todayDate = new Date(today + "T00:00:00Z");
  const dn = c.class_start ? daysAgo(today, c.class_start) : null;
  const inRecruit = !!c.pre_open && c.pre_open <= today && (!c.class_start || today < c.class_start);
  const lastAgo = (d: string | null) => (d ? `${md(d)} · ${daysAgo(d, today) === 0 ? "오늘" : `${daysAgo(d, today)}일 전`}` : "없음");

  return (
    <div className="min-h-screen bg-[#F6F6F3] text-gray-800 tabular-nums">
      <div className="mx-auto flex max-w-[1080px] flex-col gap-5 px-4 py-6 pt-16 md:px-8 md:pt-7">
        <header className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-black tracking-tight">{c.name} 오늘 판단판</h1>
          <span className="text-[13px] text-gray-600">
            {md(today)}({WD[todayDate.getUTCDay()]}) · Day {con?.day ?? "—"}
            {dn !== null && dn >= 0 ? ` · 클래스 D-${dn}` : ""} · {inRecruit ? <PhaseBadge phase={bandOf(c, today)} /> : "모집 종료"}
          </span>
        </header>

        {/* 1. 결론 한 줄 */}
        {con && (
          <section aria-label="결론" className="flex flex-col gap-1.5 rounded-2xl bg-gray-900 px-6 py-5 text-gray-50">
            <span className="text-[13px] text-gray-300">결론</span>
            <p className="text-[20px] font-bold leading-snug md:text-[22px]">
              {c.name} <b className="text-[28px]">{official}명</b>
              {con.avg !== null && con.diff !== null && (
                <>
                  {" "}— 같은 Day {con.day} 평균 {con.avg}명보다{" "}
                  <span className={con.diff >= 0 ? "text-green-300" : "text-red-300"}>
                    {con.diff >= 0 ? "▲" : "▼"} {Math.abs(con.diff)}명 {con.diff >= 0 ? "앞섬" : "뒤처짐"}
                  </span>
                </>
              )}
              {" "}· 예상 최종 약 <b>{con.projection}명</b> / 목표 {goal}
            </p>
            <span className="text-[12px] text-gray-300">
              평균 = {board.compareNames.join("·")} 같은 Day 누적 평균 · 예상 최종 = 현재 + 비교 기수들의 &quot;오늘과 같은 D-N → 클래스 전날&quot; 증가분 평균
            </span>
          </section>
        )}

        {/* 2. 핵심 지표 4개 */}
        <section aria-label="핵심 지표" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <div className="flex flex-col gap-1.5 rounded-xl border border-gray-200 bg-white p-4">
            <span className="text-[12px] text-gray-600">실등록 (공식)</span>
            <span className="text-[30px] font-black leading-none">
              {official}<span className="text-[14px] font-medium text-gray-600"> / {goal}명</span>
            </span>
            <Sparkline values={board.spark} label={`최근 ${board.spark.length}일 누적 추세`} />
            <span className="text-[12px] text-gray-600">
              달성 {goal ? Math.round((official / goal) * 100) : 0}% · 최근 {board.spark.length}일 {board.spark[0]}→{board.spark[board.spark.length - 1]}
            </span>
          </div>
          <div className="flex flex-col gap-1.5 rounded-xl border border-gray-200 bg-white p-4">
            <span className="text-[12px] text-gray-600">오늘 신규</span>
            <span className={`text-[30px] font-black leading-none ${board.todayNew ? "text-green-700" : ""}`}>
              {board.todayNew === null ? "—" : `+${board.todayNew}`}<span className="text-[14px] font-medium text-gray-600">명</span>
            </span>
            <span className="text-[12px] text-gray-600">
              어제 {board.prevNews[0] === null ? "—" : `+${board.prevNews[0]}`} · 그제 {board.prevNews[1] === null ? "—" : `+${board.prevNews[1]}`}
            </span>
            <span className="text-[12px] text-gray-600">같은 Day 평균 {board.avgTodayNew === null ? "—" : `+${board.avgTodayNew}`}</span>
          </div>
          <div className="flex flex-col gap-1.5 rounded-xl border border-gray-200 bg-white p-4">
            <span className="text-[12px] text-gray-600">일정</span>
            <span className={`text-[22px] font-black leading-tight ${ms?.today ? "text-red-700" : ""}`}>{ms ? `${ms.label} ${ms.when}` : "모집 종료"}</span>
            <span className="text-[12px] text-gray-600">
              정규 {md(c.reg_open)}~{md(c.reg_close)} · 클래스 {md(c.class_start)}
            </span>
            <span className="text-[12px] text-gray-600">추가 모집 마감: {c.extra_close ? md(c.extra_close) : "미정"}</span>
          </div>
          <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4">
            <span className="text-[12px] text-gray-600">가동 상태 (마지막 날)</span>
            <div className="flex justify-between gap-2 text-[13px]"><span>카톡</span><b>{lastAgo(status.lastKakao)}</b></div>
            <div className="flex justify-between gap-2 text-[13px]"><span>유튜브 광고</span><b className={status.lastAd && (daysAgo(status.lastAd, today) ?? 0) >= 3 ? "text-amber-700" : ""}>{lastAgo(status.lastAd)}</b></div>
            <div className="flex justify-between gap-2 text-[13px]"><span>인스타 커뮤니티</span><b>{lastAgo(status.lastCommunity)}</b></div>
          </div>
        </section>

        {/* 3. 주의 신호 */}
        <section aria-label="주의 신호" className="flex flex-col gap-2.5 rounded-xl border border-gray-200 bg-white px-5 py-4">
          <h2 className="text-[15px] font-bold">
            주의 신호 <span className="text-[12px] font-normal text-gray-600">— 규칙에 걸린 것만 표시</span>
          </h2>
          {board.alerts.length === 0 && <span className="text-[13px] text-gray-500">지금 걸린 신호 없음</span>}
          {board.alerts.map((a, i) => (
            <div key={i} className={`flex items-start gap-3 rounded-lg px-3 py-2.5 ${LEVEL[a.level].row}`}>
              <span className={`shrink-0 rounded px-1.5 py-0.5 text-[11px] font-bold text-white ${LEVEL[a.level].chip}`}>{LEVEL[a.level].label}</span>
              <span className="text-[14px]">{a.text}</span>
            </div>
          ))}
        </section>

        {/* 4. 최근 7일 같은 Day 비교 */}
        <section aria-label="최근 7일 Day 비교" className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[15px] font-bold">최근 7일 · 같은 Day 비교</h2>
            <Link href="/daily" className="text-[13px] font-bold text-blue-700 hover:text-blue-900">
              전체 Day 비교 보기 →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-[13px]">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-600">
                  <th className="px-1.5 py-2 font-medium">Day</th>
                  <th className="px-1.5 py-2 font-medium">날짜</th>
                  <th className="px-1.5 py-2 font-medium">구간</th>
                  <th className="px-1.5 py-2 text-right font-medium">신규</th>
                  <th className="px-1.5 py-2 text-right font-medium">누적</th>
                  <th className="px-1.5 py-2 text-right font-medium">평균 누적</th>
                  <th className="px-1.5 py-2 text-right font-medium">차이</th>
                  <th className="px-1.5 py-2 font-medium">그날 한 일</th>
                </tr>
              </thead>
              <tbody>
                {board.recent.map((r) => {
                  const cell = r.cells[0];
                  return (
                    <tr key={r.day} className="border-b border-gray-100">
                      <td className="px-1.5 py-2 font-bold">{r.day}</td>
                      <td className="px-1.5 py-2">{cell ? md(cell.date) : "—"}</td>
                      <td className="px-1.5 py-2">{cell && <PhaseBadge phase={cell.phase} />}</td>
                      <td className="px-1.5 py-2 text-right">{cell?.net ? `+${cell.net}` : cell?.net === 0 ? "0" : "—"}</td>
                      <td className="px-1.5 py-2 text-right font-bold">{cell?.cum ?? "—"}</td>
                      <td className="px-1.5 py-2 text-right text-gray-600">{r.avg === null ? "—" : r.avg.toFixed(1)}</td>
                      <td className="px-1.5 py-2 text-right"><Diff v={r.diff} /></td>
                      <td className="px-1.5 py-2"><Chips cell={cell} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <span className="text-[12px] text-gray-600">오늘 칩이 비어 있으면 아직 동기화 전입니다 (유튜브·인스타 09:00·13:00 자동 수집, 카톡·콘텐츠는 입력 즉시)</span>
        </section>

        {/* 5. 더 보기 — 예전 첫 화면 카드들 (접힘) */}
        <details className="rounded-xl border border-gray-200 bg-white px-5 py-3.5">
          <summary className="cursor-pointer text-[14px] font-bold">더 보기: AI 브리핑 · 데이터 점검 · 일정 · 매출·ROAS · 페이스 · 차트</summary>
          {/* 본문을 먼저 보여주고, 무거운 예전 카드들은 뒤이어 불러온다 */}
          {kpi && kpi.cohortName === c.name && (
            <Suspense fallback={<div className="mt-3 h-40 animate-pulse rounded-xl bg-gray-100" />}>
              <Legacy kpi={kpi} cohortName={c.name} />
            </Suspense>
          )}
        </details>
      </div>
    </div>
  );
}

// 예전 첫 화면 카드들 — 지우지 않고 "더 보기" 안에서 그대로 보여줌(어두운 테마 유지)
async function Legacy({ kpi, cohortName }: { kpi: Kpi; cohortName: string }) {
  const [{ previousName }, health] = await Promise.all([resolveCohortPair(cohortName), getDataHealth()]);
  const dayCmp = await getDayComparison(previousName ? [cohortName, previousName] : [cohortName]);
  const maxSection = Math.max(1, ...SECTIONS.map((s) => kpi.bySection[s] ?? 0));
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
    <div className="theme-light mt-3 rounded-xl p-4 md:p-6 text-slate-100">
      <AiBriefing fallback={kpi.insights} cohort={cohortName} />
      <DataHealthCard items={health.items} />

      <div className="jarvis-card p-4 mb-6">
        <div className="font-hud text-[11px] uppercase tracking-[0.25em] text-cyan-400/70 mb-3">D-DAY 일정</div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {kpi.timeline.map((m) => (
            <div
              key={m.label}
              className={`flex-shrink-0 min-w-[88px] flex-1 rounded-lg p-2 text-center border ${
                m.status === "today" ? "border-rose-400 bg-rose-500/10" : m.status === "past" ? "border-slate-800 opacity-45" : "border-cyan-500/40 bg-cyan-500/5"
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

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        {[
          { label: "실등록", main: <CountUp value={kpi.realRegs} suffix="명" />, sub: `목표 ${kpi.goal} · ${kpi.progressPct}%` },
          { label: "ROAS", main: <CountUp value={kpi.roas} decimals={1} suffix="배" />, sub: `광고 ₩1 → ₩${kpi.roas}` },
          { label: "매출", main: <CountUp value={kpi.totalRevenue} prefix="₩" />, sub: `광고비 ₩${kpi.totalAd.toLocaleString("ko-KR")}` },
          { label: "예상 최종(페이스)", main: <CountUp value={kpi.projectedFinal} suffix="명" />, sub: `페이스 ${kpi.currentPace}명/일` },
        ].map((m) => (
          <div key={m.label} className="jarvis-card p-6">
            <div className="font-hud text-[11px] uppercase tracking-[0.2em] text-cyan-400/70">{m.label}</div>
            <div className="font-hud text-3xl font-black text-white mt-2.5 jarvis-glow">{m.main}</div>
            <div className="text-[11px] text-slate-400 mt-1.5">{m.sub}</div>
          </div>
        ))}
      </div>

      <div className="jarvis-card p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <span className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80">목표 페이스 비교</span>
          <span className={`text-sm font-bold ${paceLight.cls}`}>
            {paceLight.emoji} {paceLight.text} ({paceGapPct > 0 ? "+" : ""}{paceGapPct}%)
          </span>
        </div>
        <div className="flex items-center gap-3 mb-2">
          <span className="text-xs text-slate-400 w-10">필요</span>
          <div className="flex-1 h-7 bg-slate-800 rounded-md overflow-hidden">
            <div className="h-full rounded-md flex items-center px-2" style={{ width: "100%", background: "#3b82f6" }}>
              <span className="text-xs text-white font-bold">{kpi.requiredPace}명/일</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-slate-400 w-10">현재</span>
          <div className="flex-1 h-7 bg-slate-800 rounded-md overflow-hidden">
            <div className="h-full rounded-md flex items-center px-2" style={{ width: `${Math.min(paceRatio * 100, 100)}%`, background: paceLight.bar, minWidth: "70px" }}>
              <span className="text-xs text-white font-bold">{kpi.currentPace}명/일</span>
            </div>
          </div>
        </div>
        <div className="text-center text-sm text-cyan-200 mt-4 bg-cyan-500/10 rounded-md py-1.5">
          {needMore > 0 ? <>하루 <b className="text-white">{needMore}명</b> 더 등록되면 목표 달성 궤도</> : <>현재 페이스로 목표 달성 가능</>}
        </div>
      </div>

      {dayCmp && (
        <div className="mb-6">
          <DayComparisonChart data={dayCmp} />
        </div>
      )}

      <div className="jarvis-card p-5">
        <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80 mb-4">구간별 실등록</div>
        <div className="flex items-end gap-3 h-40">
          {SECTIONS.map((s) => {
            const val = kpi.bySection[s] ?? 0;
            const h = Math.max((val / maxSection) * 100, 4);
            return (
              <div key={s} className="flex-1 flex flex-col items-center justify-end gap-2">
                <div className="font-hud text-sm font-bold text-cyan-200">{val}</div>
                <div className="w-full rounded-t-md" style={{ height: `${h}%`, background: "linear-gradient(180deg,#00e5ff,#1e3a8a)", minHeight: "4px" }} />
                <div className="text-[10px] text-slate-400 text-center leading-tight">{s}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
