import { getKpi } from "@/lib/kpi";
import CountUp from "@/components/CountUp";

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

  const toneColor: Record<string, string> = {
    good: "text-emerald-300 border-emerald-400/40",
    warn: "text-amber-300 border-amber-400/40",
    info: "text-cyan-200 border-cyan-400/40",
  };

  return (
    <div style={DARK_BG} className="jarvis-grid-line min-h-screen p-6 md:p-8 text-slate-100">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight jarvis-glow jarvis-neon">
            310 MARKETING DATA
          </h1>
          <p className="text-sm text-slate-400 mt-1">
            {kpi.cohortName} 운영 상황판 · {kpi.ddayLabel}
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-cyan-300">
          <span className="live-dot" /> 실시간 모니터링
        </div>
      </div>

      {/* 자동 브리핑 */}
      <div className="jarvis-card p-5 mb-6">
        <div className="text-xs uppercase tracking-widest text-cyan-400/80 mb-3">⚡ 자동 브리핑</div>
        <div className="space-y-2.5">
          {kpi.insights.map((ins, i) => (
            <div key={i} className={`flex items-start gap-2 text-sm border-l-2 pl-3 ${toneColor[ins.tone]}`}>
              <span>{ins.tone === "good" ? "✅" : ins.tone === "warn" ? "⚠️" : "▸"}</span>
              <span className="text-slate-100">{ins.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* KPI 4카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Metric label="실등록" main={<CountUp value={kpi.realRegs} suffix="명" />} sub={`목표 ${kpi.goal} · ${kpi.progressPct}%`} />
        <Metric label="ROAS" main={<CountUp value={kpi.roas} decimals={1} suffix="배" />} sub={`광고 ₩1 → ₩${kpi.roas}`} />
        <Metric label="매출" main={<CountUp value={kpi.totalRevenue} prefix="₩" />} sub={`광고비 ₩${kpi.totalAd.toLocaleString("ko-KR")}`} />
        <Metric label="예상 최종" main={<CountUp value={kpi.projectedFinal} suffix="명" />} sub={`현재 페이스 ${kpi.currentPace}명/일`} />
      </div>

      {/* 진척 게이지 */}
      <div className="jarvis-card p-5 mb-6">
        <div className="flex justify-between text-sm mb-2">
          <span className="text-slate-200">목표 달성률</span>
          <span className="text-cyan-300">{kpi.realRegs} / {kpi.goal}명</span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(kpi.progressPct, 100)}%`,
              background: "linear-gradient(90deg,#00e5ff,#3b82f6)",
              boxShadow: "0 0 12px rgba(0,229,255,0.6)",
            }}
          />
        </div>
        <div className="text-right text-3xl font-extrabold jarvis-neon jarvis-glow mt-2">
          <CountUp value={kpi.progressPct} decimals={1} suffix="%" />
        </div>
      </div>

      {/* 구간별 */}
      <div className="jarvis-card p-5">
        <div className="text-xs uppercase tracking-widest text-cyan-400/80 mb-4">구간별 실등록</div>
        <div className="grid grid-cols-4 lg:grid-cols-7 gap-3">
          {SECTIONS.map((s) => (
            <div key={s} className="text-center p-3 rounded-xl bg-slate-800/60 border border-cyan-400/15">
              <div className="text-[11px] text-slate-400">{s}</div>
              <div className="text-xl font-bold text-cyan-200 mt-1">{kpi.bySection[s] ?? 0}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, main, sub }: { label: string; main: React.ReactNode; sub: string }) {
  return (
    <div className="jarvis-card p-5">
      <div className="text-xs uppercase tracking-widest text-cyan-400/70">{label}</div>
      <div className="text-2xl font-extrabold text-white mt-1 jarvis-glow">{main}</div>
      <div className="text-[11px] text-slate-400 mt-1">{sub}</div>
    </div>
  );
}
