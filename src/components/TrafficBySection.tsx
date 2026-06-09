// YouTube 트래픽 소스 구간별 대조 — 의도/알고리즘/기타 3그룹으로 단순화 (13기 vs 14기)
import type { TrafficBySection, TrafficMix } from "@/lib/ytanalytics";

const GROUPS = [
  { key: "high", label: "의도(검색·구독)", color: "#22c55e" },
  { key: "algo", label: "알고리즘(쇼츠피드·추천)", color: "#a855f7" },
  { key: "rest", label: "광고·외부", color: "#64748b" },
] as const;

function grouped(mix: TrafficMix): Record<string, number> {
  const g: Record<string, number> = { high: 0, algo: 0, rest: 0 };
  for (const r of mix.rows) {
    if (r.intent === "high") g.high += r.pct;
    else if (r.intent === "algo") g.algo += r.pct;
    else g.rest += r.pct;
  }
  return g;
}

function GBar({ mix }: { mix: TrafficMix }) {
  if (mix.total === 0) return <div className="h-5 rounded bg-slate-800/60 flex items-center px-2 text-[9px] text-slate-500 flex-1">데이터 없음</div>;
  const g = grouped(mix);
  return (
    <div className="flex h-5 rounded overflow-hidden bg-slate-800 flex-1">
      {GROUPS.map((grp) => g[grp.key] >= 1 ? (
        <div key={grp.key} className="h-full flex items-center justify-center" style={{ width: `${g[grp.key]}%`, background: grp.color }}
          title={`${grp.label} ${Math.round(g[grp.key])}%`}>
          {g[grp.key] >= 14 && <span className="text-[9px] text-white font-bold">{Math.round(g[grp.key])}%</span>}
        </div>
      ) : null)}
    </div>
  );
}

export default function TrafficBySectionView({ data }: { data: NonNullable<TrafficBySection> }) {
  const { aName, bName, sections } = data;
  return (
    <div className="jarvis-card p-5">
      <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80 mb-1">
        YouTube 트래픽 질 · 구간별 ({aName} vs {bName})
      </div>
      <div className="text-[11px] text-slate-500 mb-4">
        <b className="text-emerald-300">의도(검색·구독)</b>가 클수록 등록 가능성 높은 트래픽 · <b className="text-purple-300">알고리즘(쇼츠피드)</b>은 스쳐가는 트래픽. {aName} 의도 비중이 {bName}보다 낮으면 ⚠️.
      </div>

      <div className="divide-y divide-slate-800">
        {sections.map((sec) => {
          const ah = sec.a ? Math.round(grouped(sec.a).high) : null;
          const bh = sec.b ? Math.round(grouped(sec.b).high) : null;
          const drop = ah != null && bh != null && ah < bh - 5;
          return (
            <div key={sec.section} className="py-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <span className="font-bold text-slate-200 text-sm">{sec.section}</span>
                {ah != null && bh != null && (
                  <span className={`text-[11px] font-bold ${drop ? "text-rose-300" : "text-slate-400"}`}>
                    의도 {aName} {ah}% vs {bName} {bh}%{drop ? " ⚠️" : ""}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {sec.a && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-cyan-400 w-7 shrink-0">{aName.replace("기", "")}</span>
                    <GBar mix={sec.a} />
                  </div>
                )}
                {sec.b && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-amber-400 w-7 shrink-0">{bName.replace("기", "")}</span>
                    <GBar mix={sec.b} />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 text-[10px] text-slate-400 mt-3 pt-3 border-t border-slate-800">
        {GROUPS.map((g) => (
          <span key={g.key}><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: g.color }} />{g.label}</span>
        ))}
      </div>
    </div>
  );
}
