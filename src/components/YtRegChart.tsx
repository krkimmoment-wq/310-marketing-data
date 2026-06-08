"use client";
// 일별 등록 막대 + YouTube 영상 발행 마커(▶) 대조 — 라이브러리 없이 순수 SVG
import { useRef, useState } from "react";
import type { DayPoint } from "@/app/(main)/insights/page";

const W = 880;
const H = 320;
const PAD = { l: 34, r: 14, t: 20, b: 46 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;

export default function YtRegChart({ days }: { days: DayPoint[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<{ i: number; px: number; py: number } | null>(null);

  const n = days.length;
  const maxReg = Math.max(1, ...days.map((d) => d.regs));
  const bw = PLOT_W / n;
  const xOf = (i: number) => PAD.l + i * bw + bw / 2;
  const yOf = (v: number) => PAD.t + (1 - v / maxReg) * PLOT_H;

  // x축 날짜 눈금 (약 8개)
  const step = Math.max(1, Math.round(n / 8));
  const ticks = days.map((_, i) => i).filter((i) => i % step === 0);

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const svgX = (px / rect.width) * W;
    let i = Math.floor((svgX - PAD.l) / bw);
    i = Math.max(0, Math.min(n - 1, i));
    setHover({ i, px, py: e.clientY - rect.top });
  }

  return (
    <div className="jarvis-card p-5">
      <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80 mb-3">
        일별 등록(막대) · ▶ YouTube 발행
      </div>
      <div className="relative">
        <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full"
          onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label="일별 등록 영상발행 대조">
          {/* y 그리드 */}
          {[0, 0.5, 1].map((f) => {
            const v = Math.round(maxReg * f);
            return (
              <g key={f}>
                <line x1={PAD.l} y1={yOf(v)} x2={W - PAD.r} y2={yOf(v)} stroke="#1e293b" strokeWidth={1} strokeDasharray="3 4" />
                <text x={PAD.l - 5} y={yOf(v) + 3} textAnchor="end" fontSize={9} fill="#64748b" fontFamily="monospace">{v}</text>
              </g>
            );
          })}
          {/* 등록 막대 */}
          {days.map((d, i) => d.regs > 0 && (
            <rect key={i} x={xOf(i) - bw * 0.32} y={yOf(d.regs)} width={bw * 0.64} height={PAD.t + PLOT_H - yOf(d.regs)}
              rx={1.5} className="anim-fy" style={{ transformOrigin: "bottom", fill: "#00e5ff", opacity: 0.85 }} />
          ))}
          {/* 발행 마커 ▶ (그날 영상 있으면 x축 위) */}
          {days.map((d, i) => d.videos.length > 0 && (
            <g key={`v${i}`} style={{ cursor: "help" }}>
              <circle cx={xOf(i)} cy={H - PAD.b + 14} r={7} fill="#ff5e57" stroke="#070b16" strokeWidth={1.5} />
              <text x={xOf(i)} y={H - PAD.b + 17} textAnchor="middle" fontSize={7} fill="#fff" fontWeight="bold">
                {d.videos.length > 1 ? d.videos.length : "▶"}
              </text>
            </g>
          ))}
          {/* x축 날짜 */}
          {ticks.map((i) => (
            <text key={i} x={xOf(i)} y={H - 6} textAnchor="middle" fontSize={9} fill="#64748b" fontFamily="monospace">
              {days[i].date.slice(5)}
            </text>
          ))}
          {/* hover 가이드 */}
          {hover && (
            <line x1={xOf(hover.i)} y1={PAD.t} x2={xOf(hover.i)} y2={H - PAD.b} stroke="#e2e8f0" strokeWidth={1} strokeDasharray="2 3" opacity={0.5} pointerEvents="none" />
          )}
        </svg>

        {/* hover 툴팁 */}
        {hover && (() => {
          const d = days[hover.i];
          const flip = hover.px > W * 0.55;
          return (
            <div className="absolute z-20 pointer-events-none rounded-lg border border-slate-600/70 bg-slate-900/95 px-3 py-2 shadow-xl backdrop-blur-sm"
              style={{ left: flip ? undefined : hover.px + 12, right: flip ? `calc(100% - ${hover.px - 12}px)` : undefined, top: Math.max(0, hover.py - 10), minWidth: 180, maxWidth: 280 }}>
              <div className="font-hud text-cyan-300 text-xs font-bold mb-1">{d.date}</div>
              <div className="text-[11px] text-slate-200 mb-1">실등록 <span className="font-hud text-cyan-200">{d.regs}명</span></div>
              {d.videos.length === 0 ? (
                <div className="text-[10px] text-slate-500">발행 영상 없음</div>
              ) : (
                <div className="space-y-1 border-t border-slate-700 pt-1">
                  <div className="text-[10px] text-rose-300">▶ 발행 {d.videos.length}건</div>
                  {d.videos.slice(0, 4).map((v, j) => (
                    <div key={j} className="text-[10px] text-slate-300 leading-snug">
                      · {v.title.slice(0, 28)}{v.title.length > 28 ? "…" : ""} <span className="text-slate-500">({v.views.toLocaleString("ko-KR")}회)</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
