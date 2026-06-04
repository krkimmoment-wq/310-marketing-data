import { getKpi } from "@/lib/kpi";
import CountUp from "@/components/CountUp";
import AiBriefing from "@/components/AiBriefing";

export const dynamic = "force-dynamic";

const SECTIONS = ["사전등록", "1차EB", "대기1", "2차EB", "대기2", "정규", "추가"];

const DARK_BG: React.CSSProperties = {
  background:
    "radial-gradient(1200px 600px at 80% -10%, rgba(0,229,255,0.10), transparent), radial-gradient(900px 500px at 0% 110%, rgba(59,130,246,0.10), transparent), #070b16",
};

export default async function Dashboard() {
  const kpi = await getKpi("14기");
  if (!kpi)
    return (
      <div style={DARK_BG} className="min-h-screen p-8 text-slate-300">
        14기 데이터를 찾을 수 없습니다.
      </div>
    );

  const maxSection = Math.max(1, ...SECTIONS.map((s) => kpi.bySection[s] ?? 0));

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
      <AiBriefing fallback={kpi.insights} />

      {/* KPI 4카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { d: 0.1, label: "실등록", main: <CountUp value={kpi.realRegs} suffix="명" />, sub: `목표 ${kpi.goal} · ${kpi.progressPct}%` },
          { d: 0.15, label: "ROAS", main: <CountUp value={kpi.roas} decimals={1} suffix="배" />, sub: `광고 ₩1 → ₩${kpi.roas}` },
          { d: 0.2, label: "매출", main: <CountUp value={kpi.totalRevenue} prefix="₩" />, sub: `광고비 ₩${kpi.totalAd.toLocaleString("ko-KR")}` },
          { d: 0.25, label: "예상 최종", main: <CountUp value={kpi.projectedFinal} suffix="명" />, sub: `페이스 ${kpi.currentPace}명/일` },
        ].map((m) => (
          <div key={m.label} className="jarvis-card p-5 fade-up" style={{ animationDelay: `${m.d}s` }}>
            <div className="font-hud text-[11px] uppercase tracking-[0.2em] text-cyan-400/70">{m.label}</div>
            <div className="font-hud text-2xl font-black text-white mt-2 jarvis-glow">{m.main}</div>
            <div className="text-[11px] text-slate-400 mt-1">{m.sub}</div>
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
            className="h-full rounded-full bar-glow"
            style={{ width: `${Math.min(kpi.progressPct, 100)}%`, background: "linear-gradient(90deg,#00e5ff,#3b82f6)" }}
          />
        </div>
        <div className="font-hud text-right text-3xl font-black jarvis-neon jarvis-glow mt-2">
          <CountUp value={kpi.progressPct} decimals={1} suffix="%" />
        </div>
      </div>

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
                  className="w-full rounded-t-md bar-glow transition-all"
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
