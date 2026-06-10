// 구간별 전환 퍼널 — 전환율 막대 시각화 (13기 vs 14기). 클릭은 왔는데 전환 실패한 구간이 한눈에
import type { ConversionFunnel } from "@/lib/conversion";

const fmt = (n: number) => n.toLocaleString("ko-KR");

function ConvBar({ name, clicks, clicksYt, regs, conv, maxConv, accent, worse }: {
  name: string; clicks: number; clicksYt: number; regs: number; conv: number | null; maxConv: number; accent: boolean; worse: boolean;
}) {
  const w = conv != null ? Math.max(1.5, (conv / maxConv) * 100) : 0;
  const barColor = accent ? (worse ? "#fb7185" : "#22d3ee") : "#f59e0b";
  const convColor = accent ? (worse ? "text-rose-300" : "text-cyan-300") : "text-amber-300";
  return (
    <div className="flex items-center gap-2 my-1 text-xs">
      <span className={`w-9 shrink-0 font-bold ${accent ? "text-cyan-300" : "text-amber-300"}`}>{name}</span>
      <span className="text-slate-400 w-32 shrink-0 text-right tabular-nums"><span className="text-purple-300">📺{fmt(clicksYt)}</span>/{fmt(clicks)}→{fmt(regs)}</span>
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
  // 완료 구간 유튜브 클릭 합 — 유튜브 채널력 비교 (멀티채널 중 유튜브만)
  const done = rows.filter((r) => r.status === "done");
  const ytA = done.reduce((s, r) => s + r.a.clicksYt, 0);
  const ytB = done.reduce((s, r) => s + r.b.clicksYt, 0);
  const totA = done.reduce((s, r) => s + r.a.clicks, 0);
  const totB = done.reduce((s, r) => s + r.b.clicks, 0);
  const ytRatio = ytB ? Math.round((ytA / ytB) * 100) : null;
  return (
    <div className="jarvis-card p-5">
      <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80 mb-1">
        구간별 전환 퍼널 · {aName} vs {bName}
      </div>
      <div className="text-[11px] text-slate-500 mb-3">
        막대 길이 = <b className="text-cyan-300">전환율(등록÷전체클릭)</b> · 숫자 = <span className="text-purple-300">📺유튜브클릭</span>/전체클릭→등록. ⚠️ 비틀리 클릭은 멀티채널(유튜브+인스타+카카오)이라 전환율은 <b>전체 클릭 기준</b>(등록도 전 채널).
      </div>

      {/* 유튜브 채널력 — 멀티채널 중 유튜브만 따로 */}
      {ytRatio != null && (
        <div className={`rounded-lg border p-3 mb-4 ${ytRatio < 90 ? "border-rose-500/40 bg-rose-500/10" : "border-emerald-500/30 bg-emerald-500/10"}`}>
          <div className="text-[11px] text-slate-400">📺 유튜브 클릭만 (완료 구간 합) — 유튜브 채널력 비교</div>
          <div className="text-sm font-bold mt-1">
            <span className="text-purple-300">{aName} {fmt(ytA)}</span> vs <span className="text-amber-300">{bName} {fmt(ytB)}</span>
            <span className={`ml-2 font-hud font-black ${ytRatio < 90 ? "text-rose-300" : "text-emerald-300"}`}>{aName} = {bName}의 {ytRatio}%{ytRatio < 90 ? " ▼ 유튜브 약화" : ""}</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">전체 클릭({aName} {fmt(totA)} vs {bName} {fmt(totB)})은 비슷해도, 유튜브만 보면 차이가 큼 = 인스타가 메운 것.</div>
        </div>
      )}

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
              <ConvBar name={aName} clicks={r.a.clicks} clicksYt={r.a.clicksYt} regs={r.a.regs} conv={r.a.conv} maxConv={maxConv} accent worse={worse} />
              <ConvBar name={bName} clicks={r.b.clicks} clicksYt={r.b.clicksYt} regs={r.b.regs} conv={r.b.conv} maxConv={maxConv} accent={false} worse={false} />
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
