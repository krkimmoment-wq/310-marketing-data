// YouTube 트래픽 소스 기수 대조 — 두 기수 stacked 막대 + 핵심 변화
import type { TrafficCompare, TrafficMix } from "@/lib/ytanalytics";

function Bar({ mix, accent }: { mix: TrafficMix; accent: boolean }) {
  return (
    <div>
      <div className="flex justify-between text-sm mb-1.5">
        <span className={accent ? "text-cyan-300 font-bold" : "text-amber-300 font-bold"}>{mix.name}</span>
        <span className="text-slate-400 text-xs">{mix.start.slice(5)}~{mix.end.slice(5)} · 총 {mix.total.toLocaleString("ko-KR")} 조회</span>
      </div>
      <div className="flex h-7 rounded-lg overflow-hidden bg-slate-800 anim-fx">
        {mix.rows.filter((r) => r.pct >= 1).map((r) => (
          <div key={r.key} className="h-full flex items-center justify-center" style={{ width: `${r.pct}%`, background: r.color }}
            title={`${r.label} ${r.views.toLocaleString("ko-KR")} (${r.pct}%)`}>
            {r.pct >= 9 && <span className="text-[9px] text-white font-bold whitespace-nowrap px-1">{r.label} {r.pct}%</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TrafficCompareView({ data }: { data: NonNullable<TrafficCompare> }) {
  const { a, b } = data; // a=현재기수(14기), b=직전(13기)

  // 핵심 소스 변화 (a - b, %p)
  const pctOf = (mix: typeof a, key: string) => mix.rows.find((r) => r.key === key)?.pct ?? 0;
  const keys = ["SHORTS", "EXT_URL", "EXTERNAL", "YT_SEARCH", "SUBSCRIBER"];
  const deltas = [
    { label: "Shorts", a: pctOf(a, "SHORTS"), b: pctOf(b, "SHORTS"), warn: true },
    { label: "외부링크", a: pctOf(a, "EXT_URL") + pctOf(a, "EXTERNAL"), b: pctOf(b, "EXT_URL") + pctOf(b, "EXTERNAL"), warn: true },
    { label: "검색", a: pctOf(a, "YT_SEARCH"), b: pctOf(b, "YT_SEARCH"), warn: false },
    { label: "구독피드/홈", a: pctOf(a, "SUBSCRIBER"), b: pctOf(b, "SUBSCRIBER"), warn: false },
  ];

  return (
    <div className="jarvis-card p-5">
      <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80 mb-4">
        YouTube 트래픽 소스 · {a.name} vs {b.name} (모집기간 채널 전체)
      </div>

      <div className="space-y-4 mb-5">
        <Bar mix={a} accent />
        <Bar mix={b} accent={false} />
      </div>

      {/* 핵심 변화 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
        {deltas.map((d) => {
          const diff = Math.round((d.a - d.b) * 10) / 10;
          const bad = d.warn ? diff > 0 : diff < 0; // 알고리즘/외부 증가 or 의도채널 감소 = 경고
          return (
            <div key={d.label} className="rounded-lg border border-slate-700 bg-slate-900/40 p-2.5">
              <div className="text-[11px] text-slate-400">{d.label}</div>
              <div className="font-hud text-lg font-black text-slate-100">{d.a}%</div>
              <div className={`text-[11px] font-bold ${bad ? "text-rose-300" : "text-emerald-300"}`}>
                {a.name.replace("기", "")}기 {diff >= 0 ? "▲+" : "▼"}{Math.abs(diff)}%p <span className="text-slate-500">(vs {d.b}%)</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap gap-3 text-[10px] text-slate-400">
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: "#22c55e" }} />검색(의도↑)</span>
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: "#3b82f6" }} />구독피드/홈(의도↑)</span>
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: "#a855f7" }} />Shorts(알고리즘)</span>
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: "#f59e0b" }} />외부링크</span>
        <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: "#64748b" }} />광고</span>
      </div>
      <div className="text-[10px] text-slate-500 mt-2 leading-relaxed">
        🔴 Shorts·외부 비중 증가 또는 검색·구독피드 감소 = 트래픽 &quot;질&quot; 하락 신호(광범위 노출↑·의도 시청자↓). 채널 전체 기준이라 모객 환경 추세 참고.
      </div>
    </div>
  );
}
