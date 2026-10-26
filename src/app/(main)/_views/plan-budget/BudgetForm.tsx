"use client";
// 광고 예산 — 총액 + 비중(1차EB·2차EB·정규~첫 주) → 금액, 특강·라이브 홍보는 별도 금액. 저장 = plan_ad_budget
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { budgetSplit } from "@/lib/planCore";
import type { BudgetRow } from "@/lib/plan";

const won = (n: number) => `₩${Math.round(n).toLocaleString("ko-KR")}`;

export default function BudgetForm({ cohortId, cohortName, saved }: { cohortId: number; cohortName: string; saved: BudgetRow | null }) {
  const router = useRouter();
  const [total, setTotal] = useState(saved?.total_amount ?? 0);
  const [s, setS] = useState({ eb1: saved?.share_eb1 ?? 15, eb2: saved?.share_eb2 ?? 35, regular: saved?.share_regular ?? 50 });
  const [lecture, setLecture] = useState(saved?.lecture_amount ?? 0);
  const [memo, setMemo] = useState(saved?.memo ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const shareSum = s.eb1 + s.eb2 + s.regular;
  const split = budgetSplit(total, s);

  async function save() {
    if (shareSum > 100) return setMsg("비중 합계가 100%를 넘습니다.");
    setBusy(true);
    const sb = createClient();
    const { data } = await sb.auth.getSession();
    const { error } = await sb.from("plan_ad_budget").upsert(
      {
        cohort_id: cohortId,
        total_amount: total,
        share_eb1: s.eb1,
        share_eb2: s.eb2,
        share_regular: s.regular,
        lecture_amount: lecture,
        memo: memo || null,
        updated_at: new Date().toISOString(),
        updated_by: data.session?.user.email ?? null,
      },
      { onConflict: "cohort_id" }
    );
    setBusy(false);
    if (error) return setMsg("저장 실패: " + error.message);
    setMsg("저장했습니다.");
    router.refresh();
  }

  const num = (v: string) => (v === "" ? 0 : Math.max(0, Number(v)));
  const rows: [keyof typeof s, string, number][] = [
    ["eb1", "1차EB", split.eb1],
    ["eb2", "2차EB", split.eb2],
    ["regular", "정규~클래스 첫 주", split.regular],
  ];
  return (
    <section aria-label={`${cohortName} 광고 예산`} className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4 text-[14px]">
      <h2 className="text-[16px] font-black">{cohortName} 광고 예산</h2>
      <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        <span className="w-40 font-bold">할인 구간 광고 총액</span>
        <input type="number" inputMode="numeric" min={0} step={10000} value={total || ""} placeholder="예: 3000000" onChange={(e) => setTotal(num(e.target.value))} className="min-h-10 w-56 rounded-lg border border-gray-300 px-2" />
        <span className="text-gray-600">{won(total)}</span>
      </label>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-[14px]">
          <thead>
            <tr className="bg-gray-50 text-left text-gray-700">
              <th className="px-2 py-1.5">구간</th><th className="px-2 py-1.5">비중(%)</th><th className="px-2 py-1.5 text-right">금액</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([k, label, amt]) => (
              <tr key={k} className="border-t border-gray-100">
                <td className="px-2 py-1.5 font-bold">{label}</td>
                <td className="px-2 py-1.5">
                  <input type="number" min={0} max={100} value={s[k]} aria-label={`${label} 비중`} onChange={(e) => setS({ ...s, [k]: num(e.target.value) })} className="min-h-9 w-20 rounded-lg border border-gray-300 px-2" />
                </td>
                <td className="px-2 py-1.5 text-right tabular-nums">{won(amt)}</td>
              </tr>
            ))}
            <tr className="border-t-2 border-gray-200 font-bold">
              <td className="px-2 py-1.5">합계</td>
              <td className={`px-2 py-1.5 ${shareSum === 100 ? "" : "text-red-700"}`}>{shareSum}%{shareSum === 100 ? "" : " (100%가 아님)"}</td>
              <td className="px-2 py-1.5 text-right tabular-nums">{won(split.sum)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <label className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-3">
        <span className="w-40 font-bold">특강·라이브 홍보 (별도)</span>
        <input type="number" inputMode="numeric" min={0} step={10000} value={lecture || ""} placeholder="0" onChange={(e) => setLecture(num(e.target.value))} className="min-h-10 w-56 rounded-lg border border-gray-300 px-2" />
        <span className="text-gray-600">{won(lecture)}</span>
      </label>
      <p className="font-bold">전체 계획 = {won(split.sum + lecture)} <span className="font-normal text-gray-600">(할인 구간 {won(split.sum)} + 특강·라이브 홍보 {won(lecture)})</span></p>
      <label className="flex flex-col gap-1">메모
        <textarea rows={2} value={memo} onChange={(e) => setMemo(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1" />
      </label>
      <div className="flex items-center gap-3">
        <button type="button" disabled={busy} onClick={save} className="min-h-10 rounded-lg bg-[#1E3A8A] px-4 font-bold text-white disabled:opacity-50">저장</button>
        {msg && <span role="status" className="font-bold text-blue-800">{msg}</span>}
      </div>
    </section>
  );
}
