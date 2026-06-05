"use client";
// 새 기수 추가 폼 — 저장 시 기수 선택기·비교·모든 화면에 자동 반영
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const DATE_FIELDS: { key: string; label: string }[] = [
  { key: "pre_open", label: "사전등록 오픈" },
  { key: "eb1_open", label: "1차 EB 오픈" },
  { key: "eb1_close", label: "1차 EB 마감" },
  { key: "eb2_open", label: "2차 EB 오픈" },
  { key: "eb2_close", label: "2차 EB 마감" },
  { key: "reg_open", label: "정규 오픈" },
  { key: "reg_close", label: "정규 마감" },
  { key: "extra_close", label: "추가 마감" },
  { key: "ended_at", label: "기수 종료" },
];

export default function CohortForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ name: "", goal: "150" });

  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const payload: Record<string, unknown> = { name: form.name.trim(), goal: Number(form.goal) || 0 };
    for (const f of DATE_FIELDS) if (form[f.key]) payload[f.key] = form[f.key];
    const sb = createClient();
    const { error } = await sb.from("cohorts").insert(payload);
    setSaving(false);
    if (error) {
      alert("저장 실패: " + error.message);
      return;
    }
    setForm({ name: "", goal: "150" });
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="px-4 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700">
        ➕ 새 기수 추가
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <div className="font-bold text-slate-700">새 기수 추가</div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <label className="text-sm">
          <span className="text-slate-500">기수명 *</span>
          <input required value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="예: 15기"
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500" />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">목표 인원</span>
          <input type="number" value={form.goal} onChange={(e) => set("goal", e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500" />
        </label>
        {DATE_FIELDS.map((f) => (
          <label key={f.key} className="text-sm">
            <span className="text-slate-500">{f.label}</span>
            <input type="date" value={form[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)}
              className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500" />
          </label>
        ))}
      </div>
      <div className="text-[11px] text-slate-500">기수명만 필수입니다. 날짜는 나중에 수정해도 됩니다.</div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50">
          {saving ? "저장 중..." : "기수 생성"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50">
          취소
        </button>
      </div>
    </form>
  );
}
