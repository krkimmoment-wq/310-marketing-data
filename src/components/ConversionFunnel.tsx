// 구간별 전환 퍼널 — 조회→클릭→등록 + 전환율, 13기 vs 14기
import type { ConversionFunnel } from "@/lib/conversion";

const fmt = (n: number) => n.toLocaleString("ko-KR");

export default function ConversionFunnelView({ data }: { data: NonNullable<ConversionFunnel> }) {
  const { aName, bName, rows } = data;
  return (
    <div className="jarvis-card p-5 overflow-x-auto">
      <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80 mb-1">
        구간별 전환 퍼널 · {aName} vs {bName}
      </div>
      <div className="text-[11px] text-slate-500 mb-4">
        YouTube 조회(채널 화력) → 비틀리 클릭(EB링크 유입) → 등록(전환). <b className="text-cyan-300">전환율 = 등록 ÷ 클릭</b>. 트래픽 많아도 전환율 낮으면 = 동선·오퍼 문제.
      </div>
      <table className="w-full text-sm whitespace-nowrap">
        <thead className="text-slate-400 text-left">
          <tr className="border-b border-slate-800">
            <th className="py-2 pr-3">구간</th>
            <th className="py-2 px-2 text-right">조회</th>
            <th className="py-2 px-2 text-right">클릭</th>
            <th className="py-2 px-2 text-right">등록</th>
            <th className="py-2 px-2 text-right">전환율</th>
            <th className="py-2 px-3 text-center text-slate-500">기수</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const ca = r.a.conv, cb = r.b.conv;
            const worse = ca != null && cb != null && ca < cb; // 현재 기수 전환율이 더 낮음
            return (
              <tr key={r.section} className="border-b border-slate-800/60">
                <td className="py-2 pr-3 font-bold text-slate-200 align-middle" rowSpan={1}>
                  {r.section}
                </td>
                <td className="py-1.5 px-2 text-right">
                  <div className="text-cyan-200">{fmt(r.a.views)}</div>
                  <div className="text-amber-200/70 text-xs">{fmt(r.b.views)}</div>
                </td>
                <td className="py-1.5 px-2 text-right">
                  <div className="text-cyan-200">{fmt(r.a.clicks)}</div>
                  <div className="text-amber-200/70 text-xs">{fmt(r.b.clicks)}</div>
                </td>
                <td className="py-1.5 px-2 text-right">
                  <div className="text-cyan-200 font-bold">{fmt(r.a.regs)}</div>
                  <div className="text-amber-200/70 text-xs">{fmt(r.b.regs)}</div>
                </td>
                <td className="py-1.5 px-2 text-right">
                  <div className={`font-hud font-black ${worse ? "text-rose-300" : "text-emerald-300"}`}>
                    {ca != null ? `${ca}%` : "—"}{worse ? " ▼" : ""}
                  </div>
                  <div className="text-amber-200/70 text-xs">{cb != null ? `${cb}%` : "—"}</div>
                </td>
                <td className="py-1.5 px-3 text-center text-[10px] leading-tight">
                  <div className="text-cyan-400">{aName}</div>
                  <div className="text-amber-400">{bName}</div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <div className="text-[10px] text-slate-500 mt-3 leading-relaxed">
        각 칸 위=<span className="text-cyan-300">{aName}</span> / 아래=<span className="text-amber-300">{bName}</span>. 🔴빨강 전환율 = {aName}가 {bName}보다 낮은 구간(전환 동선 점검 필요).
        {aName} 등록은 실등록(입금완료), {bName} 등록은 집계 순등록.
      </div>
    </div>
  );
}
