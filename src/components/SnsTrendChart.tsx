"use client";
// SNS 채널별 성장지수(시작=100) 멀티라인 차트 — 스케일 차이 무시하고 성장속도 비교
import type { SnsChannel } from "@/lib/sns";

const W = 820;
const H = 320;
const PAD = { l: 40, r: 60, t: 20, b: 30 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;

export default function SnsTrendChart({ channels, dates }: { channels: SnsChannel[]; dates: string[] }) {
  if (channels.length === 0 || dates.length < 2) return null;

  const maxIndex = Math.max(
    110,
    ...channels.flatMap((c) => c.points.map((p) => p.index))
  );
  const minIndex = Math.min(95, ...channels.flatMap((c) => c.points.map((p) => p.index)));

  const xOf = (i: number) => PAD.l + (i / (dates.length - 1)) * PLOT_W;
  const yOf = (v: number) => PAD.t + (1 - (v - minIndex) / (maxIndex - minIndex)) * PLOT_H;
  const dateIdx = (d: string) => dates.indexOf(d);

  // y 눈금
  const yTicks: number[] = [];
  const step = maxIndex - minIndex > 80 ? 25 : 10;
  for (let v = Math.ceil(minIndex / step) * step; v <= maxIndex; v += step) yTicks.push(v);

  // x 눈금 (4~5개)
  const xStep = Math.ceil(dates.length / 5);
  const fmt = (d: string) => d.slice(5).replace("-", "/");

  return (
    <div className="jarvis-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80">
          SNS 채널 성장지수 (시작 = 100)
        </div>
        <div className="flex flex-wrap items-center gap-3 text-[11px]">
          {channels.map((c) => (
            <span key={c.key} className="flex items-center gap-1.5 text-slate-300">
              <span className="inline-block w-3 h-3 rounded-full" style={{ background: c.color }} />
              {c.label}
              <span className={c.growthPct >= 0 ? "text-emerald-300" : "text-rose-300"}>
                {c.growthPct >= 0 ? "+" : ""}
                {c.growthPct}%
              </span>
            </span>
          ))}
        </div>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="SNS 채널 성장지수 추이">
        {/* y 그리드 */}
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} y1={yOf(v)} x2={W - PAD.r} y2={yOf(v)} stroke="#1e293b" strokeWidth={1} strokeDasharray="3 4" />
            <text x={PAD.l - 6} y={yOf(v) + 3} textAnchor="end" fontSize={10} fill="#64748b" fontFamily="monospace">
              {v}
            </text>
          </g>
        ))}
        {/* 기준선 100 */}
        <line x1={PAD.l} y1={yOf(100)} x2={W - PAD.r} y2={yOf(100)} stroke="#475569" strokeWidth={1} />

        {/* x 눈금 */}
        {dates.map((d, i) =>
          i % xStep === 0 || i === dates.length - 1 ? (
            <text key={d} x={xOf(i)} y={H - PAD.b + 16} textAnchor="middle" fontSize={9} fill="#64748b" fontFamily="monospace">
              {fmt(d)}
            </text>
          ) : null
        )}

        {/* 채널 라인 + 끝점 라벨 */}
        {channels.map((c) => {
          const path = c.points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(dateIdx(p.date))} ${yOf(p.index)}`)
            .join(" ");
          const end = c.points[c.points.length - 1];
          return (
            <g key={c.key}>
              <path d={path} fill="none" stroke={c.color} className="anim-draw" strokeWidth={2.2} strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={xOf(dateIdx(end.date))} cy={yOf(end.index)} r={3.5} fill={c.color} />
              <text
                x={xOf(dateIdx(end.date)) + 6}
                y={yOf(end.index) + 3}
                fontSize={10}
                fill={c.color}
                fontFamily="monospace"
                fontWeight="bold"
              >
                {c.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="text-[10px] text-slate-500 mt-1 text-right font-mono">
        성장지수 = 각 채널 시작 시점 대비 % · 출처 SNS 채널 추이 시트
      </div>
    </div>
  );
}
