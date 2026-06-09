"use client";
// 일별 등록 D-N 비교 — 현재 기수 vs 직전 기수 누적 곡선 + hover 툴팁
import { useState } from "react";
import type { RegDaily } from "@/lib/regdaily";

const W = 760, H = 300, PAD = { l: 38, r: 16, t: 16, b: 28 };

export default function RegCompareChart({ data }: { data: NonNullable<RegDaily> }) {
  const { curName, prevName, curToday, curTotal, prevTotal, prevAtToday, rows } = data;
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

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxCum * f));
  const gap = prevAtToday - curTotal;

  return (
    <div className="jarvis-card p-5">
      <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80 mb-1">
        일별 등록 D-N 비교 · {curName} vs {prevName} (클래스 시작일=D-Day)
      </div>
      <div className="text-[11px] text-slate-500 mb-3">
        가로축 = 클래스 시작까지 남은 일수(D-N), 세로축 = 누적 등록. 같은 시점끼리 봐야 정확합니다.
        <b className={gap > 0 ? "text-rose-300" : "text-emerald-300"}> 오늘(D{curToday}) {curName} {curTotal}명 vs {prevName} 같은시점 {prevAtToday}명 ({gap > 0 ? `${gap}명 뒤` : `${-gap}명 앞`})</b>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" onMouseMove={onMove} onMouseLeave={() => setHi(null)}>
        {/* 그리드 + y축 */}
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)} stroke="#1e293b" strokeWidth={1} />
            <text x={PAD.l - 6} y={y(t) + 3} textAnchor="end" fontSize={9} fill="#64748b">{t}</text>
          </g>
        ))}
        {/* x축 D-N 눈금 */}
        {rows.filter((r) => r.dn % 10 === 0).map((r) => (
          <text key={r.dn} x={x(r.dn)} y={H - 10} textAnchor="middle" fontSize={9} fill="#64748b">D{r.dn}</text>
        ))}
        {/* 오늘 세로선 */}
        <line x1={x(curToday)} x2={x(curToday)} y1={PAD.t} y2={H - PAD.b} stroke="#22d3ee" strokeWidth={1} strokeDasharray="3 3" opacity={0.5} />
        <text x={x(curToday)} y={PAD.t + 2} textAnchor="middle" fontSize={9} fill="#22d3ee">오늘</text>

        {/* 직전 기수: 오늘까지 실선, 이후 점선(미래 참고) */}
        <polyline points={prevSolid} fill="none" stroke="#f59e0b" strokeWidth={2} />
        <polyline points={prevDashed} fill="none" stroke="#f59e0b" strokeWidth={2} strokeDasharray="4 4" opacity={0.55} />
        {/* 현재 기수 */}
        <polyline points={curLine} fill="none" stroke="#22d3ee" strokeWidth={2.5} />

        {/* hover */}
        {hr && (
          <g>
            <line x1={x(hr.dn)} x2={x(hr.dn)} y1={PAD.t} y2={H - PAD.b} stroke="#475569" strokeWidth={1} />
            {hr.curCum != null && <circle cx={x(hr.dn)} cy={y(hr.curCum)} r={3.5} fill="#22d3ee" />}
            <circle cx={x(hr.dn)} cy={y(hr.prevCum)} r={3.5} fill="#f59e0b" />
          </g>
        )}
      </svg>

      {/* 툴팁 정보 */}
      <div className="flex items-center justify-between mt-2 text-xs">
        <div className="flex gap-4">
          <span className="text-cyan-300">● {curName}</span>
          <span className="text-amber-300">● {prevName}</span>
        </div>
        {hr ? (
          <div className="text-slate-300">
            <b className="text-slate-100">D{hr.dn}</b> ·
            <span className="text-cyan-300"> {curName} {hr.curCum != null ? `${hr.curCum}명(+${hr.curDay})` : "미도래"}</span> ·
            <span className="text-amber-300"> {prevName} {hr.prevCum}명(+{hr.prevDay})</span>
          </div>
        ) : (
          <div className="text-slate-500">그래프에 커서를 올리면 그 시점 누적·일별 등록</div>
        )}
      </div>
      <div className="text-[10px] text-slate-500 mt-2 leading-relaxed">
        {curName} 실선은 오늘까지. {prevName} 점선 구간 = {curName}가 아직 안 온 미래 시점(직전 기수가 그때 어땠는지 참고).
        {prevName} 막판(D-10~D-1) 급등이 보이면 = 클래스 임박 등록 폭발. {curName}도 그 구간이 관건.
      </div>
    </div>
  );
}
