// YouTube 트래픽 소스 구간별 대조 — 각 구간마다 13기 vs 14기 (총량 배수 + 소스 막대)
import type { TrafficBySection, TrafficMix } from "@/lib/ytanalytics";

function MiniBar({ mix }: { mix: TrafficMix }) {
  if (mix.total === 0) return <div className="h-5 rounded bg-slate-800/60 flex items-center px-2 text-[9px] text-slate-500">데이터 없음</div>;
  return (
    <div className="flex h-5 rounded overflow-hidden bg-slate-800 anim-fx flex-1">
      {mix.rows.filter((r) => r.pct >= 2).map((r) => (
        <div key={r.key} className="h-full flex items-center justify-center" style={{ width: `${r.pct}%`, background: r.color }}
          title={`${r.label} ${r.views.toLocaleString("ko-KR")} (${r.pct}%)`}>
          {r.pct >= 16 && <span className="text-[9px] text-white font-bold whitespace-nowrap px-1">{r.label} {r.pct}%</span>}
        </div>
      ))}
    </div>
  );
}

export default function TrafficBySectionView({ data }: { data: NonNullable<TrafficBySection> }) {
  const { aName, bName, sections } = data;
  return (
    <div className="jarvis-card p-5">
      <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80 mb-1">
        YouTube 트래픽 · 구간별 대조 ({aName} vs {bName})
      </div>
      <div className="text-[11px] text-slate-500 mb-4">구간별 채널 조회 총량(화력)과 소스 믹스(질)를 지난 기수와 비교. 빨강 = {aName} 화력 부족 구간.</div>

      <div className="divide-y divide-slate-800">
        {sections.map((sec) => {
          const at = sec.a?.total ?? 0;
          const bt = sec.b?.total ?? 0;
          const ratio = bt ? at / bt : null;
          const weak = ratio != null && ratio < 0.7; // 14기 화력 30%+ 부족
          return (
            <div key={sec.section} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="font-bold text-slate-200">{sec.section}</span>
                <span className="text-xs">
                  <span className="text-cyan-300">{aName} {at.toLocaleString("ko-KR")}</span>
                  <span className="text-slate-500"> vs </span>
                  <span className="text-amber-300">{bName} {bt.toLocaleString("ko-KR")}</span>
                  {ratio != null && (
                    <span className={`ml-1.5 font-bold ${weak ? "text-rose-300" : "text-slate-400"}`}>
                      ({Math.round(ratio * 100)}%{weak ? " ⚠️" : ""})
                    </span>
                  )}
                </span>
              </div>
              <div className="space-y-1">
                {sec.a && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-cyan-400 w-7 shrink-0">{aName.replace("기", "")}</span>
                    <MiniBar mix={sec.a} />
                  </div>
                )}
                {sec.b && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-amber-400 w-7 shrink-0">{bName.replace("기", "")}</span>
                    <MiniBar mix={sec.b} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 text-[10px] text-slate-400 mt-3 pt-3 border-t border-slate-800">
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: "#22c55e" }} />검색(의도↑)</span>
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: "#3b82f6" }} />구독피드/홈(의도↑)</span>
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: "#a855f7" }} />Shorts(알고리즘)</span>
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: "#f59e0b" }} />외부</span>
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: "#64748b" }} />광고</span>
      </div>
    </div>
  );
}
