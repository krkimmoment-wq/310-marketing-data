"use client";
// Day 비교표 (밝은 테마) — 칸 = 누적·신규·구간 띠·액션 칩, 평균·차이 열, 칸 누르면 오른쪽 상세
// [Day 순] 기본 / [구간 순] 같은 구간의 n일차끼리 맞추고 구간 끝마다 "구간 합계" 줄 (대기1·대기2는 기본 접힘)
import { useState } from "react";
import type { DayCell, DayTableData } from "@/lib/dayTableCore";
import { compareRows, phaseView, type PhaseSum } from "@/lib/dashboardCore";
import { Chips, ChipLegend, Diff, PHASE_STYLE, PhaseBadge, md } from "./ui";

type Sel = { col: number; day: number } | null;
type Mode = "day" | "phase";
const WD = ["일", "월", "화", "수", "목", "금", "토"];
const wd = (d: string) => WD[new Date(d + "T00:00:00Z").getUTCDay()];
const FOLDED_BY_DEFAULT = ["대기1", "대기2"];

function CellButton({ cell, selected, onClick }: { cell: DayCell; selected: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full flex-col gap-0.5 rounded-lg px-2 py-1 text-left ${selected ? "bg-blue-50 outline outline-2 outline-blue-600" : "bg-stone-50 hover:bg-stone-100"}`}
      style={{ borderLeft: `4px solid ${PHASE_STYLE[cell.phase]?.strip ?? "#E5E7EB"}` }}
    >
      {cell.cum === null ? (
        <span className="text-[12px] text-gray-400">{md(cell.date)} · 아직</span>
      ) : (
        <>
          <span className="flex items-baseline justify-between gap-2">
            <span className="text-[15px] font-black text-gray-900">{cell.cum}</span>
            <span className={`text-[12px] ${cell.net ? "font-bold text-gray-800" : "text-gray-400"}`}>{cell.net ? `+${cell.net}` : "0"}</span>
          </span>
          <span className="text-[11px] text-gray-600">{md(cell.date)}({wd(cell.date)}) · {cell.phase}</span>
          <Chips cell={cell} size="xs" />
        </>
      )}
    </button>
  );
}

function SumCell({ s }: { s: PhaseSum | null }) {
  if (!s) return <span className="block px-2 py-1 text-[12px] text-gray-300">—</span>;
  return (
    <span className="flex flex-col gap-0.5 rounded-lg bg-gray-100 px-2 py-1">
      <span className="text-[14px] font-black text-gray-900">+{s.sum}</span>
      <span className="text-[11px] text-gray-700">
        {s.days}일{s.elapsed < s.days ? ` (진행 ${s.elapsed}일)` : ""} · 하루 {s.perDay === null ? "—" : s.perDay.toFixed(1)}
      </span>
    </span>
  );
}

export default function CompareTable({ data }: { data: DayTableData }) {
  const { columns, today } = data;
  const rows = compareRows(data);
  const focusToday = columns[0]?.cells.find((c) => c.date === today)?.day ?? null;
  const [sel, setSel] = useState<Sel>(focusToday ? { col: 0, day: focusToday } : null);
  const [mode, setMode] = useState<Mode>("day");
  const [open, setOpen] = useState<string[]>([]); // 펼친 대기 구간
  if (!columns.length) return <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">표시할 기수가 없습니다.</div>;

  const selCol = sel ? columns[sel.col] : null;
  const selCell: DayCell | null = sel && selCol ? selCol.cells[sel.day - 1] ?? null : null;
  const hasPre = columns.some((c) => c.pre !== 0);
  const preAvg = columns.length > 1 ? columns.slice(1).reduce((s, c) => s + c.pre, 0) / (columns.length - 1) : null;
  const pRows = mode === "phase" ? phaseView(data) : [];
  const folded = (phase: string) => FOLDED_BY_DEFAULT.includes(phase) && !open.includes(phase);
  const toggle = (phase: string) => setOpen((o) => (o.includes(phase) ? o.filter((x) => x !== phase) : [...o, phase]));

  return (
    <div className="flex flex-col gap-3">
      <div role="group" aria-label="보기 방식" className="flex items-center gap-2 text-[13px]">
        {(
          [
            ["day", "Day 순"],
            ["phase", "구간 순"],
          ] as const
        ).map(([m, label]) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => setMode(m)}
            className={`min-h-9 rounded-lg border px-3 py-1.5 ${mode === m ? "border-gray-900 bg-gray-900 font-bold text-white" : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"}`}
          >
            {label}
          </button>
        ))}
        <span className="text-[12px] text-gray-600">
          {mode === "day" ? "같은 Day(사전등록 오픈 후 n일째)끼리 비교" : "같은 구간의 n일차끼리 비교 · 구간 끝 = 구간 합계(신규 합·일수·하루 평균)"}
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-gray-700">
        <span className="font-bold">구간 색</span>
        {(["1차EB", "2차EB", "정규", "추가", "클래스 후"] as const).map((p) => (
          <span key={p} className="inline-flex items-center gap-1">
            <span className="h-3 w-3 rounded-sm" style={{ background: PHASE_STYLE[p].strip }} />
            {p}
          </span>
        ))}
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-sm" style={{ background: PHASE_STYLE["대기1"].strip }} />
          사전·대기
        </span>
        <ChipLegend />
      </div>

      <div className="flex flex-wrap items-start gap-4">
        <div className="min-w-0 flex-[999_1_720px] overflow-auto max-h-[75vh] rounded-xl border border-gray-200 bg-white">
          <table className="w-full min-w-[860px] border-separate border-spacing-0 text-[13px] tabular-nums">
            <thead>
              <tr className="text-gray-700">
                <th className="sticky left-0 top-0 z-30 border-b border-gray-200 bg-gray-50 px-2 py-2.5 text-left font-bold">{mode === "day" ? "Day" : "구간 · n일차"}</th>
                {columns.map((c, i) => (
                  <th key={c.cohortId} className={`sticky top-0 z-20 border-b border-gray-200 bg-gray-50 px-2 py-2.5 text-left ${i === 0 ? "font-black text-red-700" : "font-medium"}`}>
                    {c.name}
                    <span className="ml-1 text-[11px] font-normal text-gray-500">Day1 {md(c.day1)}</span>
                  </th>
                ))}
                <th className="sticky top-0 z-20 border-b border-gray-200 bg-gray-50 px-2 py-2.5 text-right font-medium">평균</th>
                <th className="sticky top-0 z-20 border-b border-gray-200 bg-gray-50 px-2 py-2.5 text-right font-bold">차이</th>
              </tr>
            </thead>
            <tbody>
              {hasPre && (
                <tr>
                  <td className="sticky left-0 z-10 whitespace-nowrap border-b border-gray-100 bg-white px-2 py-2 text-gray-600">Day 1 이전</td>
                  {columns.map((c) => (
                    <td key={c.cohortId} className="border-b border-gray-100 px-2 py-2 font-bold">{c.pre}</td>
                  ))}
                  <td className="border-b border-gray-100 px-2 py-2 text-right text-gray-700">{preAvg === null ? "—" : preAvg.toFixed(1)}</td>
                  <td className="border-b border-gray-100 px-2 py-2 text-right"><Diff v={preAvg === null ? null : Math.round((columns[0].pre - preAvg) * 10) / 10} /></td>
                </tr>
              )}
              {mode === "day" &&
                rows.map((r) => {
                  const isToday = r.day === focusToday;
                  return (
                    <tr key={r.day} className={isToday ? "bg-yellow-50" : ""}>
                      <td className={`sticky left-0 z-10 whitespace-nowrap border-b border-gray-100 px-2 py-1.5 align-top font-bold ${isToday ? "bg-yellow-50" : "bg-white"}`}>
                        {r.day}
                        {isToday && <span className="ml-1 text-[10px] font-bold text-red-700">오늘</span>}
                      </td>
                      {r.cells.map((cell, ci) => (
                        <td key={columns[ci].cohortId} className="border-b border-gray-100 px-1.5 py-1 align-top">
                          {cell ? (
                            <CellButton cell={cell} selected={sel?.col === ci && sel.day === r.day} onClick={() => setSel({ col: ci, day: r.day })} />
                          ) : (
                            <span className="block px-2 py-1 text-[12px] text-gray-300">—</span>
                          )}
                        </td>
                      ))}
                      <td className="border-b border-gray-100 px-2 py-1.5 text-right align-top text-gray-700">{r.avg === null ? "—" : r.avg.toFixed(1)}</td>
                      <td className="border-b border-gray-100 px-2 py-1.5 text-right align-top"><Diff v={r.diff} /></td>
                    </tr>
                  );
                })}
              {mode === "phase" &&
                pRows.map((r) => {
                  if (r.kind === "day") {
                    if (folded(r.phase)) return null;
                    const isToday = r.cells[0]?.date === today;
                    return (
                      <tr key={`${r.phase}-${r.n}`} className={isToday ? "bg-yellow-50" : ""}>
                        <td className={`sticky left-0 z-10 whitespace-nowrap border-b border-gray-100 px-2 py-1.5 align-top ${isToday ? "bg-yellow-50" : "bg-white"}`}>
                          <PhaseBadge phase={r.phase} /> <b>{r.n}일차</b>
                          {isToday && <span className="ml-1 text-[10px] font-bold text-red-700">오늘</span>}
                        </td>
                        {r.cells.map((cell, ci) => (
                          <td key={columns[ci].cohortId} className="border-b border-gray-100 px-1.5 py-1 align-top">
                            {cell ? (
                              <CellButton cell={cell} selected={sel?.col === ci && sel.day === cell.day} onClick={() => setSel({ col: ci, day: cell.day })} />
                            ) : (
                              <span className="block px-2 py-1 text-[12px] text-gray-300">—</span>
                            )}
                          </td>
                        ))}
                        <td className="border-b border-gray-100 px-2 py-1.5 text-right align-top text-gray-700">{r.avg === null ? "—" : r.avg.toFixed(1)}</td>
                        <td className="border-b border-gray-100 px-2 py-1.5 text-right align-top"><Diff v={r.diff} /></td>
                      </tr>
                    );
                  }
                  const canFold = FOLDED_BY_DEFAULT.includes(r.phase);
                  return (
                    <tr key={`${r.phase}-sum`} className="bg-gray-50">
                      <td className="sticky left-0 z-10 whitespace-nowrap border-b-2 border-gray-200 bg-gray-50 px-2 py-2 align-top">
                        <span className="flex flex-col gap-1">
                          <span>
                            <PhaseBadge phase={r.phase} /> <b>구간 합계</b>
                          </span>
                          {canFold && (
                            <button type="button" onClick={() => toggle(r.phase)} aria-expanded={!folded(r.phase)} className="w-fit text-[12px] font-bold text-blue-700 underline hover:text-blue-900">
                              {folded(r.phase) ? "날짜별 펼치기 ▸" : "접기 ▾"}
                            </button>
                          )}
                        </span>
                      </td>
                      {r.sums.map((s, ci) => (
                        <td key={columns[ci].cohortId} className="border-b-2 border-gray-200 px-1.5 py-1.5 align-top">
                          <SumCell s={s} />
                        </td>
                      ))}
                      <td className="border-b-2 border-gray-200 px-2 py-2 text-right align-top text-gray-700">{r.avgPerDay === null ? "—" : `하루 ${r.avgPerDay.toFixed(1)}`}</td>
                      <td className="border-b-2 border-gray-200 px-2 py-2 text-right align-top"><Diff v={r.diffPerDay} /></td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>

        <aside aria-label="선택한 칸 상세" className="flex flex-[1_1_260px] flex-col gap-2.5 rounded-xl border-2 border-blue-600 bg-white p-4 text-[13px] lg:sticky lg:top-4">
          <span className="text-[12px] font-bold text-blue-700">칸을 누르면 여기에 상세</span>
          {selCol && selCell ? (
            <>
              <h2 className="text-[16px] font-black">
                {selCol.name} · Day {selCell.day} · {md(selCell.date)}({wd(selCell.date)})
              </h2>
              <span className="flex flex-wrap items-center gap-2 text-gray-700">
                <PhaseBadge phase={selCell.phase} />
                신규 {selCell.net ?? "—"} · 누적 {selCell.cum ?? "—"} · 링크 클릭 {selCell.clicks ?? "기록 없음"}
              </span>
              <ul className="flex flex-col gap-1.5 leading-relaxed">
                {selCell.actions.length === 0 && <li className="text-gray-500">기록된 액션 없음</li>}
                {selCell.actions.map((a, i) => (
                  <li key={i}>{a.text}</li>
                ))}
              </ul>
            </>
          ) : (
            <span className="text-gray-500">표에서 칸을 선택하세요.</span>
          )}
        </aside>
      </div>
      <p className="text-[12px] leading-relaxed text-gray-600">
        Day 1 = 각 기수 사전등록 오픈일(등록 시작) · 표 끝 = 최종 집계일(클래스 시작 후 첫 일요일) · 누적 = 공식 인원 기준(결제일 기준 실등록 + 다른 기수에서 옮겨온 인원을 Day 1 이전에 포함) · 평균 = 비교 기수({columns.slice(1).map((c) => c.name).join("·")})의 같은 Day 누적 평균 · 광고 칩 = 유튜브 광고 노출(구글 애즈+스튜디오 프로모션, 금액 아님)
        {mode === "phase" && " · 구간 순: 평균 누적·차이 = 값이 있는 비교 기수만, 기준 기수 칸이 비면 차이 '—' · 구간 합계 줄의 평균·차이 = 하루 평균 기준"}
      </p>
    </div>
  );
}
