// 유입·전환 핵심 브리핑 카드 — 데이터 기반 자동 진단 + 처방
import type { InsightBrief } from "@/lib/insightbrief";

const verdictStyle: Record<string, { color: string; icon: string }> = {
  "전환 문제": { color: "text-rose-300", icon: "🎯" },
  "트래픽 문제": { color: "text-amber-300", icon: "⚠️" },
  "양호": { color: "text-emerald-300", icon: "✅" },
};

export default function InsightBriefView({ data }: { data: NonNullable<InsightBrief> }) {
  const v = verdictStyle[data.verdict] ?? verdictStyle["양호"];
  return (
    <div className="jarvis-card jarvis-accent p-6">
      <div className="flex items-center gap-2 mb-1 flex-wrap">
        <span className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80">핵심 브리핑 · {data.aName} vs {data.bName}</span>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border border-current ${v.color}`}>{v.icon} {data.verdict}</span>
      </div>
      <div className="text-[11px] text-slate-500 mb-3">현재 {data.aName}가 완료한 구간까지만 동일 비교 (진행중·미래 구간은 {data.bName} 완주와 불공정하므로 제외)</div>

      <div className="text-lg md:text-xl font-black text-white leading-snug mb-4 jarvis-glow">
        {data.headline}
      </div>

      {/* 근거 4지표 (14기 vs 13기) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {data.points.map((p) => (
          <div key={p.label} className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
            <div className="text-[11px] text-slate-400">{p.label}</div>
            <div className={`font-hud text-lg font-black ${p.good ? "text-emerald-300" : "text-rose-300"}`}>
              {p.a} {p.good ? "▲" : "▼"}
            </div>
            <div className="text-[11px] text-amber-200/70">{data.bName} {p.b}</div>
          </div>
        ))}
      </div>

      {data.worst && (
        <div className="text-sm text-slate-300 mb-3">
          가장 무너진 구간: <span className="font-bold text-rose-300">{data.worst.section}</span>
          <span className="text-slate-400"> — 전환율 {data.aName} {data.worst.a}% vs {data.bName} {data.worst.b}% </span>
          <span className="text-rose-300 font-bold">({data.worst.b > 0 ? Math.round((data.worst.a / data.worst.b) * 100) : 0}%)</span>
        </div>
      )}

      {/* 처방 */}
      <div className="border-t border-slate-700/60 pt-3">
        <div className="text-[11px] uppercase tracking-wider text-cyan-400/70 mb-1.5 font-hud">처방</div>
        <ul className="space-y-1">
          {data.prescription.map((p, i) => (
            <li key={i} className="text-sm text-slate-200 flex gap-2">
              <span className="text-cyan-400">→</span><span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
