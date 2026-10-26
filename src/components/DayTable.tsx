"use client";
// 기수 × Day 일별 등록 비교표 — 첫 열·머리글 고정, 당일 등록 히트맵, 액션 뱃지, 칸 클릭 시 상세
import { useState } from "react";
import Link from "next/link";
import type { ActionKind, DayCell, DayTableData } from "@/lib/dayTableCore";

const BADGE: Record<ActionKind, { icon: string; label: string }> = {
  special: { icon: "🎤", label: "특강" },
  live: { icon: "🔴", label: "챌린지 라이브" },
  pool: { icon: "💰", label: "유튜브 유료 노출" },
  short: { icon: "⚡", label: "숏폼" },
  long: { icon: "📺", label: "롱폼" },
  community: { icon: "📝", label: "커뮤니티" },
  kakao: { icon: "💬", label: "카톡 발송" },
  memo: { icon: "📌", label: "기타 기록" },
};
const ORDER: ActionKind[] = ["special", "live", "pool", "long", "short", "community", "kakao", "memo"];
const PHASE_COLOR: Record<string, string> = {
  사전등록: "#64748b",
  "1차EB": "#22d3ee",
  대기1: "#334155",
  "2차EB": "#3b82f6",
  대기2: "#334155",
  정규: "#f59e0b",
  추가: "#a78bfa",
};

type Sel = { col: number; day: number | "pre" } | null;

export default function DayTable({ data, moreHref }: { data: DayTableData; moreHref?: string }) {
  const [sel, setSel] = useState<Sel>(null);
  const { columns, maxDay } = data;
  const hasPre = columns.some((c) => c.pre !== 0);

  if (!columns.length) return <div className="jarvis-card p-5 text-sm text-slate-400">표시할 기수가 없습니다.</div>;

  const selCol = sel ? columns[sel.col] : null;
  const selCell: DayCell | null = sel && selCol && sel.day !== "pre" ? selCol.cells[sel.day - 1] ?? null : null;

  return (
    <div className="jarvis-card p-4 md:p-5 mb-6 fade-up">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80">🧮 기수 × Day 일별 등록</div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
          {ORDER.map((k) => (
            <span key={k}>
              {BADGE[k].icon} {BADGE[k].label}
            </span>
          ))}
          {moreHref && (
            <Link href={moreHref} className="text-cyan-300 hover:text-cyan-200">
              기수 골라 보기 →
            </Link>
          )}
        </div>
      </div>

      {/* 선택한 칸 상세 (모바일은 hover가 없어 탭으로 연다) */}
      {sel && selCol && (
        <div className="mb-3 rounded-lg border border-cyan-500/30 bg-slate-900/80 p-3 text-xs text-slate-200">
          <div className="flex items-start justify-between gap-2">
            <div className="font-bold text-cyan-200">
              {selCol.name} ·{" "}
              {sel.day === "pre"
                ? `Day 1 이전 결제 ${selCol.pre}명`
                : `Day ${sel.day} (${selCell?.date}) · ${selCell?.phase}`}
            </div>
            <button onClick={() => setSel(null)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
          {selCell && (
            <>
              <div className="mt-1 text-slate-300">
                당일 {selCell.net ?? "-"}명 · 누적 {selCell.cum ?? "-"}명 · 링크 클릭 {selCell.clicks ?? "기록 없음"}
              </div>
              <ul className="mt-2 space-y-1">
                {selCell.actions.length === 0 && <li className="text-slate-500">기록된 액션 없음</li>}
                {[...selCell.actions]
                  .sort((a, b) => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind))
                  .map((a, i) => (
                    <li key={i}>
                      {BADGE[a.kind].icon} {a.text}
                    </li>
                  ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="overflow-auto max-h-[70vh] rounded-lg border border-slate-800">
        <table className="border-separate border-spacing-0 text-xs w-max min-w-full">
          <thead>
            <tr>
              <th className="sticky top-0 left-0 z-30 bg-slate-950 px-2 py-2 text-left text-slate-400 border-b border-slate-800">Day</th>
              {columns.map((c) => (
                <th
                  key={c.cohortId}
                  colSpan={2}
                  className="sticky top-0 z-20 bg-slate-950 px-2 py-2 text-left border-b border-l border-slate-800 whitespace-nowrap"
                >
                  <div className={`font-bold ${c.ongoing ? "text-cyan-300" : "text-slate-200"}`}>
                    {c.name}
                    {c.ongoing && <span className="ml-1 text-[10px] text-rose-300">진행중</span>}
                  </div>
                  <div className="text-[10px] font-normal text-slate-500">
                    Day1 {c.day1.slice(5)} · 당일 / 누적
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hasPre && (
              <tr>
                <td className="sticky left-0 z-10 bg-slate-950 px-2 py-1 text-slate-400 whitespace-nowrap border-b border-slate-800/60">Day 1 이전</td>
                {columns.map((c, ci) => (
                  <PreCells key={c.cohortId} pre={c.pre} onClick={() => setSel({ col: ci, day: "pre" })} />
                ))}
              </tr>
            )}
            {Array.from({ length: maxDay }, (_, i) => i + 1).map((d) => (
              <tr key={d}>
                <td className="sticky left-0 z-10 bg-slate-950 px-2 py-1 text-slate-400 whitespace-nowrap border-b border-slate-800/60">Day {d}</td>
                {columns.map((c, ci) => {
                  const cell = c.cells[d - 1];
                  if (!cell)
                    return (
                      <td key={c.cohortId} colSpan={2} className="border-b border-l border-slate-800/60 bg-slate-900/40" />
                    );
                  const ratio = cell.net && c.maxNet ? cell.net / c.maxNet : 0;
                  const kinds = ORDER.filter((k) => cell.actions.some((a) => a.kind === k));
                  const selected = sel?.col === ci && sel.day === d;
                  return (
                    <DayCells
                      key={c.cohortId}
                      cell={cell}
                      ratio={ratio}
                      kinds={kinds}
                      selected={selected}
                      onClick={() => setSel({ col: ci, day: d })}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
        Day 1 = 기수별 사전등록 오픈일(기수 관리에서 수정 시 자동 반영) · 당일 = 결제일 기준 실등록(환불·미입금·기수이전 제외) · 누적에는 Day 1 이전 결제 포함 ·
        💰 = 유튜브 유료 노출 조회(구글 애즈와 스튜디오 프로모션이 합쳐진 값, 금액 아님) · 영상 조회수는 현재 누적값 · 칸 왼쪽 색 = 모집 구간
      </p>
    </div>
  );
}

function PreCells({ pre, onClick }: { pre: number; onClick: () => void }) {
  return (
    <>
      <td onClick={onClick} className="cursor-pointer border-b border-l border-slate-800/60 px-2 py-1 text-right text-slate-200">
        {pre || ""}
      </td>
      <td className="border-b border-slate-800/60 px-2 py-1 text-right text-slate-400">{pre || ""}</td>
    </>
  );
}

function DayCells({
  cell,
  ratio,
  kinds,
  selected,
  onClick,
}: {
  cell: DayCell;
  ratio: number;
  kinds: ActionKind[];
  selected: boolean;
  onClick: () => void;
}) {
  const bg = ratio > 0 ? `rgba(0,229,255,${(0.12 + 0.55 * ratio).toFixed(2)})` : undefined;
  return (
    <>
      <td
        onClick={onClick}
        title={cell.actions.map((a) => `${BADGE[a.kind].icon} ${a.text}`).join("\n")}
        className={`cursor-pointer border-b border-l border-slate-800/60 px-2 py-1 whitespace-nowrap ${
          cell.isToday ? "outline outline-1 outline-rose-400" : ""
        } ${selected ? "ring-1 ring-inset ring-cyan-300" : ""}`}
        style={{ background: bg, borderLeft: `3px solid ${PHASE_COLOR[cell.phase] ?? "#334155"}` }}
      >
        {cell.phaseStart && (
          <span className="mr-1 rounded px-1 text-[9px] font-bold text-slate-900" style={{ background: PHASE_COLOR[cell.phaseStart] ?? "#94a3b8" }}>
            {cell.phaseStart}
          </span>
        )}
        <span className={cell.net === null ? "text-slate-600" : cell.net ? "font-bold text-white" : "text-slate-500"}>
          {cell.net === null ? "·" : cell.net}
        </span>
        {kinds.length > 0 && <span className="ml-1">{kinds.map((k) => BADGE[k].icon).join("")}</span>}
      </td>
      <td className="border-b border-slate-800/60 px-2 py-1 text-right text-slate-400">{cell.cum ?? ""}</td>
    </>
  );
}
