// 구간별 전환 퍼널 — 전환율 막대 시각화 (13기 vs 14기). 클릭은 왔는데 전환 실패한 구간이 한눈에
import type { ConversionFunnel } from "@/lib/conversion";

const fmt = (n: number) => n.toLocaleString("ko-KR");

function ConvBar({ name, clicks, regs, conv, maxConv, accent, worse }: {
  name: string; clicks: number; regs: number; conv: number | null; maxConv: number; accent: boolean; worse: boolean;
}) {
  const w = conv != null ? Math.max(1.5, (conv / maxConv) * 100) : 0;
  const barColor = accent ? (worse ? "#fb7185" : "#22d3ee") : "#f59e0b";
  const convColor = accent ? (worse ? "text-rose-300" : "text-cyan-300") : "text-amber-300";
  return (
    <div className="flex items-center gap-2 my-1 text-xs">
      <span className={`w-9 shrink-0 font-bold ${accent ? "text-cyan-300" : "text-amber-300"}`}>{name}</span>
      <span className="text-slate-400 w-24 shrink-0 text-right tabular-nums">{fmt(clicks)}→{fmt(regs)}</span>
      <div className="flex-1 h-4 bg-slate-800/70 rounded overflow-hidden">
        <div className="h-full rounded" style={{ width: `${w}%`, background: barColor }} />
      </div>
      <span className={`font-hud font-black w-14 shrink-0 text-right ${convColor}`}>{conv != null ? `${conv}%` : "—"}</span>
    </div>
  );
}

export default function ConversionFunnelView({ data }: { data: NonNullable<ConversionFunnel> }) {
  const { aName, bName, rows } = data;
  const maxConv = Math.max(...rows.flatMap((r) => [r.a.conv ?? 0, r.b.conv ?? 0]), 0.1);
  return (
    <div className="jarvis-card p-5">
      <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80 mb-1">
        구간별 전환 퍼널 · {aName} vs {bName}
      </div>
      <div className="text-[11px] text-slate-500 mb-4">
        막대 길이 = <b className="text-cyan-300">전환율(등록÷클릭)</b> · 숫자 = 클릭→등록. {aName} 막대가 짧고 빨강이면 = 클릭은 왔는데 전환 실패.
      </div>

      <div className="divide-y divide-slate-800">
        {rows.map((r) => {
          const inc = r.status !== "done";
          const worse = r.a.conv != null && r.b.conv != null && r.a.conv < r.b.conv;
          const ratio = r.a.conv != null && r.b.conv != null && r.b.conv > 0 ? Math.round((r.a.conv / r.b.conv) * 100) : null;
          return (
            <div key={r.section} className={`py-3 ${inc ? "opacity-40" : ""}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="font-bold text-slate-200 text-sm">
                  {r.section}
                  {r.status === "ongoing" && <span className="ml-1 text-[9px] text-amber-400">진행중</span>}
                  {r.status === "future" && <span className="ml-1 text-[9px] text-slate-500">예정</span>}
                </span>
                {ratio != null && !inc && (
                  <span className={`text-[11px] font-bold ${worse ? "text-rose-300" : "text-emerald-300"}`}>
                    {aName} 전환율 = {bName}의 {ratio}%
                  </span>
                )}
              </div>
              <ConvBar name={aName} clicks={r.a.clicks} regs={r.a.regs} conv={r.a.conv} maxConv={maxConv} accent worse={worse} />
              <ConvBar name={bName} clicks={r.b.clicks} regs={r.b.regs} conv={r.b.conv} maxConv={maxConv} accent={false} worse={false} />
            </div>
          );
        })}
      </div>
      <div className="text-[10px] text-slate-500 mt-3">
        {aName} 등록=실등록(입금완료) · {bName} 등록=집계 순등록. 진행중·예정 구간은 흐리게(직전 기수 완주와 직접 비교 부적절).
      </div>
    </div>
  );
}
