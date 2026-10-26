"use client";
// 등록 상태 인라인 수정 — 입금완료/미입금/환불/기수이전 드롭다운 → 해당 컬럼 자동 update
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const STATUSES = [
  { key: "입금완료", label: "✅ 입금", cls: "text-emerald-600" },
  { key: "미입금", label: "⏳ 미입금", cls: "text-amber-600" },
  { key: "환불", label: "↩️ 환불", cls: "text-rose-600" },
  { key: "기수이전", label: "🔄 기수이전", cls: "text-slate-500" },
] as const;

// 상태 → 컬럼 매핑 (payment / is_refund / is_transfer)
const MAP: Record<string, { payment: string; is_refund: boolean; is_transfer: boolean }> = {
  입금완료: { payment: "입금완료", is_refund: false, is_transfer: false },
  미입금: { payment: "미입금", is_refund: false, is_transfer: false },
  환불: { payment: "입금완료", is_refund: true, is_transfer: false },
  기수이전: { payment: "입금완료", is_refund: false, is_transfer: true },
};

// 행 데이터 → 현재 상태 라벨
export function statusOf(r: { payment: string; is_refund?: boolean; is_transfer?: boolean }) {
  if (r.is_transfer) return "기수이전";
  if (r.is_refund) return "환불";
  if (r.payment === "미입금") return "미입금";
  return "입금완료";
}

export default function StatusCell({ id, status }: { id: number; status: string }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const cls = STATUSES.find((s) => s.key === status)?.cls ?? "text-slate-600";

  async function change(next: string) {
    if (next === status) return;
    setSaving(true);
    const sb = createClient();
    const { error } = await sb.from("registrations").update(MAP[next]).eq("id", id);
    setSaving(false);
    if (error) {
      alert("저장 실패: " + error.message);
      return;
    }
    router.refresh(); // 목록·대시보드(실등록·매출·ROAS) 즉시 갱신
  }

  return (
    <select
      value={status}
      disabled={saving}
      onChange={(e) => change(e.target.value)}
      className={`text-xs font-medium bg-transparent border border-slate-200 rounded px-1.5 py-1 outline-none focus:border-blue-400 cursor-pointer ${cls} disabled:opacity-50`}
    >
      {STATUSES.map((s) => (
        <option key={s.key} value={s.key} className="text-slate-700">
          {s.label}
        </option>
      ))}
    </select>
  );
}
