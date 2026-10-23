"use client";
// 구간 요약표 — 구간별 총등록·환불·미입금·이전·실등록·비틀리·전환율·광고비 + 같은 구간 다른 기수 + "잘 된 액션" 메모(phase_memo)
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { PhaseRow } from "@/lib/dashboardCore";
import { PhaseBadge, md } from "./ui";

const won = (n: number) => (n ? `₩${n.toLocaleString("ko-KR")}` : "—");
const num = (n: number) => n.toLocaleString("ko-KR");

export default function PhaseTable({
  cohortId,
  rows,
  compareNames,
  arrivals,
  hasRoster,
  memos,
}: {
  cohortId: number;
  rows: PhaseRow[];
  compareNames: string[];
  arrivals: number;
  hasRoster: boolean;
  memos: Record<string, string> | null;
}) {
  const [saved, setSaved] = useState<Record<string, "saving" | "ok" | "err">>({});
  const shown = rows.filter((r) => r.total || r.real || r.clicks || r.ad || Object.values(r.others).some(Boolean) || ["사전등록", "1차EB", "대기1", "2차EB", "대기2", "정규"].includes(r.phase));
  const sum = (k: "total" | "refund" | "unpaid" | "transfer" | "real" | "clicks" | "ad") => rows.reduce((s, r) => s + r[k], 0);
  const realWithArrivals = sum("real") + arrivals;
  const clickRows = rows.filter((r) => r.clicks > 0);
  const convAll = clickRows.length ? clickRows.reduce((s, r) => s + r.real, 0) / clickRows.reduce((s, r) => s + r.clicks, 0) : null;

  async function save(phase: string, memo: string) {
    if (memos === null) return;
    setSaved((s) => ({ ...s, [phase]: "saving" }));
    const sb = createClient();
    const { error } = await sb.from("phase_memo").upsert({ cohort_id: cohortId, phase, memo, updated_at: new Date().toISOString() });
    setSaved((s) => ({ ...s, [phase]: error ? "err" : "ok" }));
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
        <table className="w-full min-w-[1080px] border-collapse text-[13px] tabular-nums">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-gray-700">
              <th className="px-2.5 py-2.5 text-left font-bold">구간</th>
              <th className="px-2.5 py-2.5 text-left font-medium">기간</th>
              <th className="px-2.5 py-2.5 text-right font-medium">총등록</th>
              <th className="px-2.5 py-2.5 text-right font-medium">환불</th>
              <th className="px-2.5 py-2.5 text-right font-medium">미입금</th>
              <th className="px-2.5 py-2.5 text-right font-medium">이전</th>
              <th className="px-2.5 py-2.5 text-right font-black text-gray-900">실등록</th>
              <th className="px-2.5 py-2.5 text-right font-medium">비틀리</th>
              <th className="px-2.5 py-2.5 text-right font-medium">전환율</th>
              <th className="px-2.5 py-2.5 text-right font-medium">광고비*</th>
              {compareNames.map((n, i) => (
                <th key={n} className={`px-2.5 py-2.5 text-right font-medium ${i === 0 ? "border-l border-gray-200" : ""}`}>{n}</th>
              ))}
              <th className="min-w-[220px] border-l border-gray-200 px-2.5 py-2.5 text-left font-bold">잘 된 액션 (직접 입력)</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((r) => (
              <tr key={r.phase} className="border-b border-gray-100">
                <td className="px-2.5 py-2.5"><PhaseBadge phase={r.phase} /></td>
                <td className="whitespace-nowrap px-2.5 py-2.5 text-gray-600">{r.from || r.to ? `${r.from ? md(r.from) : ""}~${r.to ? md(r.to) : ""}` : "—"}</td>
                <td className="px-2.5 py-2.5 text-right">{hasRoster ? r.total : "—"}</td>
                <td className="px-2.5 py-2.5 text-right">{hasRoster ? r.refund : "—"}</td>
                <td className="px-2.5 py-2.5 text-right">{hasRoster ? r.unpaid : "—"}</td>
                <td className="px-2.5 py-2.5 text-right">{hasRoster ? r.transfer : "—"}</td>
                <td className="px-2.5 py-2.5 text-right text-[15px] font-black">{hasRoster ? r.real : "—"}</td>
                <td className="px-2.5 py-2.5 text-right">{r.clicks ? num(r.clicks) : "—"}</td>
                <td className="px-2.5 py-2.5 text-right">{r.clicks >= 100 && hasRoster ? `${((r.real / r.clicks) * 100).toFixed(2)}%` : "—"}</td>
                <td className="px-2.5 py-2.5 text-right text-gray-700">{won(r.ad)}</td>
                {compareNames.map((n, i) => (
                  <td key={n} className={`px-2.5 py-2.5 text-right text-gray-700 ${i === 0 ? "border-l border-gray-200" : ""}`}>{r.others[n] ?? 0}</td>
                ))}
                <td className="border-l border-gray-200 px-2.5 py-2">
                  <label className="flex items-center gap-2">
                    <span className="sr-only">{r.phase} 잘 된 액션</span>
                    <input
                      type="text"
                      defaultValue={memos?.[r.phase] ?? ""}
                      disabled={memos === null}
                      placeholder={memos === null ? "SQL 실행 후 입력 가능" : "예: 18만원 할인 카톡 (당일 17명)"}
                      onBlur={(e) => {
                        if (e.target.value !== (memos?.[r.phase] ?? "")) save(r.phase, e.target.value);
                      }}
                      className="min-h-8 w-full rounded-md border border-gray-200 bg-stone-50 px-2 py-1 text-[12px] text-gray-800 disabled:text-gray-400"
                    />
                    <span className="w-10 shrink-0 text-[11px] text-gray-500">
                      {saved[r.phase] === "saving" ? "저장중" : saved[r.phase] === "ok" ? "저장됨" : saved[r.phase] === "err" ? "실패" : ""}
                    </span>
                  </label>
                </td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-200 bg-gray-50 font-bold">
              <td className="px-2.5 py-2.5">합계</td>
              <td className="px-2.5 py-2.5 font-normal text-gray-600">{arrivals ? `+ 이전(들어옴) ${arrivals}명` : ""}</td>
              <td className="px-2.5 py-2.5 text-right">{hasRoster ? sum("total") : "—"}</td>
              <td className="px-2.5 py-2.5 text-right">{hasRoster ? sum("refund") : "—"}</td>
              <td className="px-2.5 py-2.5 text-right">{hasRoster ? sum("unpaid") : "—"}</td>
              <td className="px-2.5 py-2.5 text-right">{hasRoster ? sum("transfer") : "—"}</td>
              <td className="px-2.5 py-2.5 text-right text-[16px] font-black">{hasRoster ? realWithArrivals : "—"}</td>
              <td className="px-2.5 py-2.5 text-right">{num(sum("clicks"))}</td>
              <td className="px-2.5 py-2.5 text-right">{convAll !== null && hasRoster ? `${(convAll * 100).toFixed(2)}%` : "—"}</td>
              <td className="px-2.5 py-2.5 text-right">{won(sum("ad"))}</td>
              {compareNames.map((n, i) => (
                <td key={n} className={`px-2.5 py-2.5 text-right ${i === 0 ? "border-l border-gray-200" : ""}`}>{rows.reduce((s, r) => s + (r.others[n] ?? 0), 0)}</td>
              ))}
              <td className="border-l border-gray-200 px-2.5 py-2.5" />
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-[12px] leading-relaxed text-gray-600">
        결제일 기준 · 실등록 = 총등록 − 환불 − 미입금 − 이전(나감) · 합계 실등록은 다른 기수에서 옮겨온 인원 포함(= 대시보드 실등록) ·
        * 광고비 = 캠페인 시작일이 속한 구간에 합산(일별 집행액이 없어서) · 비틀리 = 유튜브 결제링크 클릭(클릭 100 미만 구간은 전환율 생략) · 다른 기수 열 = 같은 구간 실등록(다른 기수에서 옮겨온 인원 제외)
        {memos === null && " · 잘 된 액션 칸은 SQL(phase_memo) 실행 후 저장됩니다."}
      </p>
    </div>
  );
}
