"use client";
// 13기 vs 14기 Day(D-Day)별 누적등록 비교 — 자비스 네온 SVG 라인차트
// 라이브러리 없이 순수 SVG (기존 바차트와 동일 기조)
// 마우스 hover → 세로 가이드 + 그 Day의 13기/14기 누적·차이·분기점·액션 툴팁
import { useRef, useState } from "react";
import type { DayComparison } from "@/lib/comparison";

const W = 820;
const H = 340;
const PAD = { l: 38, r: 18, t: 22, b: 30 };
const PLOT_W = W - PAD.l - PAD.r;
const PLOT_H = H - PAD.t - PAD.b;

const niceCeil = (v: number, step = 20) => Math.max(step, Math.ceil(v / step) * step);

export default function DayComparisonChart({ data }: { data: DayComparison }) {
  const { minDay, maxDay, series, milestones, actions, todayDay } = data;
  const maxY = niceCeil(data.maxY);
  const spanX = Math.max(1, maxDay - minDay);
  const inRange = (d: number) => d >= minDay && d <= maxDay;
  const allDays: number[] = [];
  for (let d = minDay; d <= maxDay; d++) allDays.push(d);

  const xOf = (d: number) => PAD.l + ((d - minDay) / spanX) * PLOT_W;
  const yOf = (v: number) => PAD.t + (1 - v / maxY) * PLOT_H;

  const svgRef = useRef<SVGSVGElement>(null);
  // hover: 마우스가 가리키는 day + 화면 픽셀 위치(툴팁 배치용)
  const [hover, setHover] = useState<{ day: number; px: number; py: number } | null>(null);

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const svg = svgRef.current;
    if (!svg) return;
    const rect = svg.getBoundingClientRect();
    const px = e.clientX - rect.left;
    const svgX = (px / rect.width) * W; // viewBox 좌표로 환산
    let day = Math.round(minDay + ((svgX - PAD.l) / PLOT_W) * spanX);
    day = Math.max(minDay, Math.min(maxDay, day));
    setHover({ day, px, py: e.clientY - rect.top });
  }

  const valOf = (name: string, day: number) =>
    series.find((s) => s.name === name)?.points.find((p) => p.x === day)?.y ?? null;

  // x축 눈금 (10일 간격, 0 포함)
  const xTicks: number[] = [];
  for (let d = Math.ceil(minDay / 10) * 10; d <= maxDay; d += 10) xTicks.push(d);
  if (!xTicks.includes(0) && minDay <= 0 && maxDay >= 0) xTicks.push(0);
  xTicks.sort((a, b) => a - b);

  // y축 눈금 (4분할)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(maxY * f));

  // 현재 = 전달 순서 [0], 직전 = [1] (이름 하드코딩 없이 최신/직전 어떤 기수든 대응)
  const cur = series[0];
  const prev = series[1];
  const curName = cur?.name ?? "";
  const prevName = prev?.name ?? "";
  // 같은 시점(현재 기수 마지막 day) 비교 요약
  let summary: { day: number; a: number; b: number; lead: number } | null = null;
  if (cur && prev) {
    const d = cur.lastDay;
    const a = cur.points.find((p) => p.x === d)?.y;
    const b = prev.points.find((p) => p.x === d)?.y;
    if (a != null && b != null && b > 0)
      summary = { day: d, a, b, lead: Math.round(((a - b) / b) * 100) };
  }

  return (
    <div className="jarvis-card p-5 fade-up" style={{ animationDelay: "0.4s" }}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80">
          {prevName ? `${prevName} vs ${curName}` : curName} · D-DAY별 누적 등록
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          {series.map((s) => (
            <span key={s.name} className="flex items-center gap-1.5 text-slate-300">
              <span
                className="inline-block w-4 h-[3px] rounded-full"
                style={{ background: s.color, boxShadow: `0 0 8px ${s.color}` }}
              />
              {s.name}
              <span className="text-slate-500">({s.total})</span>
            </span>
          ))}
        </div>
      </div>

      {summary && (
        <div className="text-[12px] text-slate-300 mb-2">
          같은 <span className="font-hud text-cyan-300">D{summary.day >= 0 ? "+" : ""}{summary.day}</span> 시점 ·
          {curName} <span className="font-hud text-cyan-300">{summary.a}</span> vs
          {prevName} <span className="font-hud text-amber-300"> {summary.b}</span> →{" "}
          {summary.lead >= 0 ? (
            <span className="text-emerald-300 font-semibold">{curName} +{summary.lead}% 우세</span>
          ) : (
            <span className="text-rose-300 font-semibold">{prevName} {-summary.lead}% 우세</span>
          )}
        </div>
      )}

      <div className="relative">
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full" role="img"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}
        aria-label={`${prevName} ${curName} D-Day별 누적 등록 비교 라인차트`}>
        <defs>
          {series.map((s) => (
            <filter key={s.name} id={`glow-${s.name}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          ))}
          <linearGradient id="area14" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00e5ff" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* y 그리드 + 라벨 */}
        {yTicks.map((v) => (
          <g key={v}>
            <line x1={PAD.l} y1={yOf(v)} x2={W - PAD.r} y2={yOf(v)}
              stroke="#1e293b" strokeWidth={1} strokeDasharray="3 4" />
            <text x={PAD.l - 6} y={yOf(v) + 3} textAnchor="end"
              fontSize={10} fill="#64748b" fontFamily="monospace">{v}</text>
          </g>
        ))}

        {/* x 그리드 + 라벨 */}
        {xTicks.map((d) => (
          <g key={d}>
            <line x1={xOf(d)} y1={PAD.t} x2={xOf(d)} y2={H - PAD.b}
              stroke={d === 0 ? "#22d3ee" : "#162033"} strokeWidth={d === 0 ? 1.2 : 1}
              strokeDasharray={d === 0 ? "4 3" : undefined} opacity={d === 0 ? 0.7 : 1} />
            <text x={xOf(d)} y={H - PAD.b + 14} textAnchor="middle"
              fontSize={10} fill={d === 0 ? "#22d3ee" : "#64748b"} fontFamily="monospace">
              {d === 0 ? "D-Day" : `D${d > 0 ? "+" : ""}${d}`}
            </text>
          </g>
        ))}
        {/* D-Day 주석 = 클래스 시작 */}
        <text x={xOf(0) + 4} y={PAD.t + 10} fontSize={9} fill="#22d3ee" fontFamily="monospace" opacity={0.8}>
          클래스 시작
        </text>

        {/* 분기점 세로선 (클래스시작=0은 D-Day축으로 이미 표시) */}
        {milestones
          .filter((m) => inRange(m.day) && m.label !== "클래스시작")
          .map((m) => (
            <g key={m.label}>
              <line x1={xOf(m.day)} y1={PAD.t + 8} x2={xOf(m.day)} y2={H - PAD.b}
                stroke="#f59e0b" strokeWidth={1} strokeDasharray="3 3" opacity={0.45} />
              <text x={xOf(m.day)} y={PAD.t + 4} textAnchor="middle" fontSize={8}
                fill="#fbbf24" fontFamily="monospace" opacity={0.85}>{m.label}</text>
            </g>
          ))}

        {/* 14기 영역 채움 */}
        {cur && cur.points.length > 1 && (
          <path
            d={
              `M ${xOf(cur.points[0].x)} ${yOf(0)} ` +
              cur.points.map((p) => `L ${xOf(p.x)} ${yOf(p.y)}`).join(" ") +
              ` L ${xOf(cur.points[cur.points.length - 1].x)} ${yOf(0)} Z`
            }
            fill="url(#area14)" stroke="none"
          />
        )}

        {/* 라인 + 끝점 */}
        {series.map((s) => {
          const path = s.points.map((p, i) => `${i === 0 ? "M" : "L"} ${xOf(p.x)} ${yOf(p.y)}`).join(" ");
          const end = s.points[s.points.length - 1];
          return (
            <g key={s.name} filter={`url(#glow-${s.name})`}>
              <path d={path} fill="none" stroke={s.color} className="anim-draw"
                strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
              <circle cx={xOf(end.x)} cy={yOf(end.y)} r={4} fill={s.color} />
              <text x={xOf(end.x) + 7} y={yOf(end.y) + 3} fontSize={11}
                fill={s.color} fontFamily="monospace" fontWeight="bold">{end.y}</text>
            </g>
          );
        })}

        {/* 마케팅 액션 핀 (14기 라인 위, 호버 시 액션 표시) */}
        {cur &&
          actions.filter((a) => inRange(a.day)).map((a, i) => {
            const pt = cur.points.find((p) => p.x === a.day);
            if (!pt) return null;
            return (
              <g key={i} style={{ cursor: "help" }}>
                <title>{`D${a.day >= 0 ? "+" : ""}${a.day} · ${a.text}`}</title>
                <circle cx={xOf(a.day)} cy={yOf(pt.y) - 11} r={5.5} fill="#ff9f43" stroke="#070b16" strokeWidth={1.5} />
                <text x={xOf(a.day)} y={yOf(pt.y) - 8} textAnchor="middle" fontSize={7}>📌</text>
              </g>
            );
          })}

        {/* 오늘 세로선 (KST 기준) */}
        {todayDay != null && inRange(todayDay) && (
          <g>
            <line x1={xOf(todayDay)} y1={PAD.t} x2={xOf(todayDay)} y2={H - PAD.b}
              stroke="#fb7185" strokeWidth={1.2} strokeDasharray="4 3" opacity={0.85} />
            <text x={xOf(todayDay)} y={H - PAD.b + 26} textAnchor="middle" fontSize={9}
              fill="#fb7185" fontFamily="monospace" fontWeight="bold">오늘</text>
          </g>
        )}

        {/* hover 세로 가이드 + 두 기수 강조점 */}
        {hover && (
          <g pointerEvents="none">
            <line x1={xOf(hover.day)} y1={PAD.t} x2={xOf(hover.day)} y2={H - PAD.b}
              stroke="#e2e8f0" strokeWidth={1} strokeDasharray="2 3" opacity={0.5} />
            {series.map((s) => {
              const v = s.points.find((p) => p.x === hover.day)?.y;
              if (v == null) return null;
              return <circle key={s.name} cx={xOf(hover.day)} cy={yOf(v)} r={4.5}
                fill="#070b16" stroke={s.color} strokeWidth={2.5} />;
            })}
          </g>
        )}
      </svg>

      {/* hover 툴팁 박스 (운영 대시보드 방식) */}
      {hover && (() => {
        const v14 = valOf(curName, hover.day);
        const v13 = prevName ? valOf(prevName, hover.day) : null;
        const diff = v14 != null && v13 != null ? v14 - v13 : null;
        const ms = milestones.find((m) => m.day === hover.day);
        const act = actions.find((a) => a.day === hover.day);
        const isToday = todayDay != null && hover.day === todayDay;
        // 오른쪽 끝에서는 왼쪽으로 펼침
        const flip = hover.px > 360;
        return (
          <div
            className="absolute z-20 pointer-events-none rounded-lg border border-slate-600/70 bg-slate-900/95 px-3 py-2 shadow-xl backdrop-blur-sm"
            style={{
              left: flip ? undefined : hover.px + 14,
              right: flip ? `calc(100% - ${hover.px - 14}px)` : undefined,
              top: Math.max(0, hover.py - 10),
              minWidth: 168,
            }}
          >
            <div className="font-hud text-cyan-300 text-xs font-bold mb-1.5">
              D{hover.day >= 0 ? "+" : ""}{hover.day}
              {isToday && <span className="ml-1 text-rose-300">(오늘)</span>}
              {ms && <span className="ml-1 text-amber-300">· {ms.label}</span>}
            </div>
            <div className="space-y-0.5 text-[11px]">
              <div className="flex justify-between gap-4">
                <span className="text-amber-300/90">{prevName} 누적</span>
                <span className="font-hud text-amber-200">{v13 != null ? `${v13}명` : "—"}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-cyan-300/90">{curName} 누적</span>
                <span className="font-hud text-cyan-200">{v14 != null ? `${v14}명` : "⏳ 진행 전"}</span>
              </div>
              <div className="flex justify-between gap-4 border-t border-slate-700 mt-1 pt-1">
                <span className="text-slate-400">차이</span>
                <span className={`font-hud font-bold ${diff == null ? "text-slate-500" : diff >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                  {diff == null ? "—" : `${diff >= 0 ? "+" : ""}${diff}명`}
                </span>
              </div>
            </div>
            {act && <div className="mt-1.5 text-[10px] text-orange-300 max-w-[200px]">📌 {act.text}</div>}
          </div>
        );
      })()}
      </div>

      <div className="text-[10px] text-slate-500 mt-1 text-right font-mono">
        x = D-Day(클래스 시작) 기준 상대일 · y = 누적 등록 ({curName}=현재{prevName ? ` · ${prevName}=직전` : ""})
      </div>

      {/* Day별 상세 표 (접기) */}
      <details className="mt-3 group">
        <summary className="cursor-pointer text-[11px] font-hud text-cyan-400/80 hover:text-cyan-300 select-none">
          ▸ Day별 상세 표 ({prevName ? `${prevName} vs ${curName}` : curName} · 분기점 · 📌액션)
        </summary>
        <div className="mt-2 max-h-80 overflow-y-auto rounded-lg border border-slate-800">
          <table className="w-full text-xs">
            <thead className="bg-slate-900/80 text-slate-400 sticky top-0">
              <tr>
                <th className="px-3 py-1.5 text-left">Day</th>
                <th className="px-3 py-1.5 text-right">{prevName || "직전"}</th>
                <th className="px-3 py-1.5 text-right">{curName}</th>
                <th className="px-3 py-1.5 text-right">차이</th>
                <th className="px-3 py-1.5 text-left">액션</th>
              </tr>
            </thead>
            <tbody>
              {allDays.map((d) => {
                const v14 = cur?.points.find((p) => p.x === d)?.y;
                const v13 = prev?.points.find((p) => p.x === d)?.y;
                const ms = milestones.find((m) => m.day === d);
                const act = actions.find((a) => a.day === d);
                const diff = v14 != null && v13 != null ? v14 - v13 : null;
                return (
                  <tr key={d} className={`border-t border-slate-800/60 ${ms ? "bg-amber-500/5" : ""}`}>
                    <td className="px-3 py-1.5 font-mono text-slate-300">
                      D{d >= 0 ? "+" : ""}{d}
                      {ms && <span className="ml-1.5 text-[9px] text-amber-400">{ms.label}</span>}
                    </td>
                    <td className="px-3 py-1.5 text-right text-amber-200/90">{v13 ?? "-"}</td>
                    <td className="px-3 py-1.5 text-right font-bold text-cyan-200">{v14 ?? "⏳"}</td>
                    <td className={`px-3 py-1.5 text-right ${diff == null ? "text-slate-600" : diff >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {diff == null ? "—" : `${diff >= 0 ? "+" : ""}${diff}`}
                    </td>
                    <td className="px-3 py-1.5 text-left text-slate-400 max-w-xs truncate" title={act?.text ?? ""}>
                      {act ? `📌 ${act.text}` : ""}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
