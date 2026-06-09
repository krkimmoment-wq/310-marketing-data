"use client";
// 일별 발행 D-N 비교 — 현재 기수 vs 직전 기수 누적 발행 곡선 + 유형(롱/숏) 총계 + hover
import { useState } from "react";
import type { PubDaily } from "@/lib/pubdaily";

const W = 760, H = 280, PAD = { l: 34, r: 16, t: 16, b: 28 };

export default function PubCompareChart({ data }: { data: NonNullable<PubDaily> }) {
  const { curName, prevName, curToday, curTotal, prevTotal, prevAtToday, curShort, curLong, prevShort, prevLong, rows } = data;
  const [hi, setHi] = useState<number | null>(null);

  const dns = rows.map((r) => r.dn);
  const minDn = Math.min(...dns), maxDn = Math.max(...dns);
  const maxCum = Math.max(...rows.map((r) => Math.max(r.prevCum, r.curCum ?? 0)), 1);
  const x = (dn: number) => PAD.l + ((dn - minDn) / (maxDn - minDn || 1)) * (W - PAD.l - PAD.r);
  const y = (v: number) => H - PAD.b - (v / maxCum) * (H - PAD.t - PAD.b);

  const curLine = rows.filter((r) => r.curCum != null).map((r) => `${x(r.dn)},${y(r.curCum!)}`).join(" ");
  const prevSolid = rows.filter((r) => r.dn <= curToday).map((r) => `${x(r.dn)},${y(r.prevCum)}`).join(" ");
  const prevDashed = rows.filter((r) => r.dn >= curToday).map((r) => `${x(r.dn)},${y(r.prevCum)}`).join(" ");

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best = rows[0]?.dn ?? null, bd = Infinity;
    for (const r of rows) { const d = Math.abs(x(r.dn) - px); if (d < bd) { bd = d; best = r.dn; } }
    setHi(best);
  };
  const hr = hi != null ? rows.find((r) => r.dn === hi) : null;
  const yTicks = [0, 0.5, 1].map((f) => Math.round(maxCum * f));
  const gap = prevAtToday - curTotal;

  return (
    <div className="jarvis-card p-5">
      <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80 mb-1">
        일별 발행 D-N 비교 · {curName} vs {prevName} (클래스 시작일=D-Day)
      </div>
      <div className="text-[11px] text-slate-500 mb-3">
        가로축 = 클래스까지 남은 일수(D-N), 세로축 = 누적 발행 영상 수.
        <b className={gap > 0 ? "text-rose-300" : "text-emerald-300"}> 오늘(D{curToday}) {curName} {curTotal}개 vs {prevName} 같은시점 {prevAtToday}개 ({gap > 0 ? `${gap}개 적음` : gap < 0 ? `${-gap}개 많음` : "동일"})</b>
      </div>

      {/* 유형 총계 */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <div className="rounded-lg border border-cyan-500/30 bg-slate-900/40 p-2.5">
          <div className="text-[11px] text-cyan-300 font-bold mb-0.5">{curName} (오늘까지)</div>
          <div className="text-sm"><span className="text-rose-300">▶롱폼 {curLong}</span> · <span className="text-purple-300">⚡숏폼 {curShort}</span></div>
        </div>
        <div className="rounded-lg border border-amber-500/30 bg-slate-900/40 p-2.5">
          <div className="text-[11px] text-amber-300 font-bold mb-0.5">{prevName} (전체 모집기)</div>
          <div className="text-sm"><span className="text-rose-300/80">▶롱폼 {prevLong}</span> · <span className="text-purple-300/80">⚡숏폼 {prevShort}</span></div>
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseMove={onMove} onMouseLeave={() => setHi(null)}>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#1e293b" strokeWidth={1} />
            <text x={PAD.l - 6} y={y(t) + 3} textAnchor="end" fontSize={9} fill="#64748b">{t}</text>
          </g>
        ))}
        {rows.filter((r) => r.dn % 10 === 0).map((r) => (
          <text key={r.dn} x={x(r.dn)} y={H - 10} textAnchor="middle" fontSize={9} fill="#64748b">D{r.dn}</text>
        ))}
        <line x1={x(curToday)} x2={x(curToday)} y1={PAD.t} y2={H - PAD.b} stroke="#22d3ee" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
        <text x={x(curToday)} y={PAD.t + 2} textAnchor="middle" fontSize={9} fill="#22d3ee">오늘</text>

        <polyline points={prevSolid} fill="none" stroke="#f59e0b" strokeWidth={2} />
        <polyline points={prevDashed} fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" opacity={0.55} />
        <polyline points={curLine} fill="none" stroke="#22d3ee" strokeWidth={2.5} />

        {hr && (
          <g>
            <line x1={x(hr.dn)} x2={x(hr.dn)} y1={PAD.t} y2={H - PAD.b} stroke="#475569" strokeWidth={1} />
            {hr.curCum != null && <circle cx={x(hr.dn)} cy={y(hr.curCum)} r={3.5} fill="#22d3ee" />}
            <circle cx={x(hr.dn)} cy={y(hr.prevCum)} r={3.5} fill="#f59e0b" />
          </g>
        )}
      </svg>

      <div className="flex items-center justify-between mt-2 text-xs">
        <div className="flex gap-4">
          <span className="text-cyan-300">● {curName}</span>
          <span className="text-amber-300">● {prevName}</span>
        </div>
        {hr ? (
          <div className="text-slate-300">
            <b className="text-slate-100">D{hr.dn}</b> ·
            <span className="text-cyan-300"> {curName} {hr.curCum != null ? `${hr.curCum}개(+${hr.curDay})` : "미도래"}</span> ·
            <span className="text-amber-300"> {prevName} {hr.prevCum}개(+{hr.prevDay})</span>
          </div>
        ) : (
          <div className="text-slate-500">커서를 올리면 그 시점 누적·당일 발행 수</div>
        )}
      </div>
      <div className="text-[10px] text-slate-500 mt-2 leading-relaxed">
        {prevName} 막판(D-10~D-1)까지 곡선이 계속 오르면 = 클래스 임박까지 발행을 멈추지 않았다는 뜻.
        {curName} 곡선이 오늘(점선) 이후 평평하면 = 막판 발행 공백 — 등록 페이스(STEP4)와 함께 보세요.
      </div>
    </div>
  );
}
