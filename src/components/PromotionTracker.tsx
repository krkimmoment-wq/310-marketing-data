// 프로모션(YouTube 유료광고) 기수 대조 위젯 — 비용·노출·조회·웹방문 13 vs 14 + 집행 목록
import type { PromotionData, PromoSide } from "@/lib/promotion";

const won = (n: number) => "₩" + n.toLocaleString("ko-KR");
const num = (n: number) => n.toLocaleString("ko-KR");

function Metric({ label, a, b, aName, bName, fmt, lowerBad }: {
  label: string; a: number; b: number; aName: string; bName: string; fmt: (n: number) => string; lowerBad?: boolean;
}) {
  const ratio = b ? Math.round((a / b) * 100) : null;
  const bad = lowerBad && ratio != null && ratio < 90;
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
      <div className="text-[11px] text-slate-400">{label}</div>
      <div className="font-hud text-xl font-black text-cyan-300 mt-1">{fmt(a)}</div>
      <div className="text-[10px] text-amber-200/70 mt-0.5">{bName} {fmt(b)}{ratio != null && <span className={`ml-1 font-bold ${bad ? "text-rose-300" : "text-slate-400"}`}>({ratio}%)</span>}</div>
    </div>
  );
}

function PromoList({ side, accent }: { side: PromoSide; accent: boolean }) {
  return (
    <div>
      <div className={`text-[11px] font-bold mb-1.5 ${accent ? "text-cyan-300" : "text-amber-300"}`}>{side.name} · {side.promos.length}건 · 총 {won(side.cost)}</div>
      <div className="space-y-1">
        {side.promos.map((p, i) => (
          <div key={i} className="text-[11px] flex justify-between gap-2 border-b border-slate-800/60 pb-1">
            <span className="truncate text-slate-300">{p.campaign}</span>
            <span className="shrink-0 text-slate-400 tabular-nums">{won(p.cost)} · 웹{num(p.webVisits)}</span>
          </div>
        ))}
        {side.promos.length === 0 && <div className="text-[11px] text-slate-600">집행 없음</div>}
      </div>
    </div>
  );
}

export default function PromotionTracker({ data }: { data: NonNullable<PromotionData> }) {
  const { a, b } = data;
  return (
    <div className="jarvis-card p-5">
      <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80 mb-1">YouTube 프로모션 · {a.name} vs {b.name}</div>
      <div className="text-[11px] text-slate-500 mb-4">유료광고 집행 비교. <b className="text-cyan-300">웹사이트 방문 = 홈페이지 유입(등록 동선 입구)</b>. 길게 풀면 알고리즘이 오가닉 조회를 추가로 태움(풀링).</div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Metric label="총 비용" a={a.cost} b={b.cost} aName={a.name} bName={b.name} fmt={won} />
        <Metric label="노출" a={a.impressions} b={b.impressions} aName={a.name} bName={b.name} fmt={num} />
        <Metric label="프로모션 조회" a={a.views} b={b.views} aName={a.name} bName={b.name} fmt={num} />
        <Metric label="웹사이트 방문" a={a.webVisits} b={b.webVisits} aName={a.name} bName={b.name} fmt={num} lowerBad />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <PromoList side={a} accent />
        <PromoList side={b} accent={false} />
      </div>

      <div className="text-[10px] text-slate-500 mt-3 leading-relaxed border-t border-slate-800 pt-2">
        ※ 풀링 배수(유료 조회 대비 영상 총조회)는 프로모션↔영상 연결이 필요해 다음 단계. 현재 분석상 13기 대표영상(2/21)은 프로모션 21.6만 조회 → 총 122만(5.6배), 14기 갱년기영상은 4.3만 → 15.9만(3.7배).
      </div>
    </div>
  );
}
