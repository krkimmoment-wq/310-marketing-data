"use client";
// 기수 행 — [수정] 누르면 행이 전체 필드 폼으로 펼쳐짐 (이름·목표·9개 날짜) + 삭제
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
  { key: "ended_at", label: "모집 종료" },
  { key: "class_start", label: "클래스 시작 (D-Day 기준)" },
];

export type Cohort = {
  id: number;
  name: string;
  goal: number | null;
  pre_open: string | null;
  eb1_open: string | null;
  eb1_close: string | null;
  eb2_open: string | null;
  eb2_close: string | null;
  reg_open: string | null;
  reg_close: string | null;
  extra_close: string | null;
  ended_at: string | null;
  class_start: string | null;
};

const inputCls = "mt-1 w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400 text-sm";

export default function CohortRow({ c }: { c: Cohort }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const initial = () => ({
    name: c.name,
    goal: String(c.goal ?? 0),
    ...Object.fromEntries(DATE_FIELDS.map((f) => [f.key, (c[f.key as keyof Cohort] as string) ?? ""])),
  });
  const [form, setForm] = useState<Record<string, string>>(initial);
  function set(k: string, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    if (!form.name.trim()) return;
    setSaving(true);
    const payload: Record<string, unknown> = { name: form.name.trim(), goal: Number(form.goal) || 0 };
    for (const f of DATE_FIELDS) payload[f.key] = form[f.key] || null;
    const sb = createClient();
    const { error } = await sb.from("cohorts").update(payload).eq("id", c.id);
    setSaving(false);
    if (error) {
      alert("저장 실패: " + error.message);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`${c.name}를 삭제할까요?\n⚠️ 이 기수의 등록자·광고비 등 연결 데이터가 있으면 삭제가 막힐 수 있습니다.`)) return;
    setSaving(true);
    const sb = createClient();
    const { error } = await sb.from("cohorts").delete().eq("id", c.id);
    setSaving(false);
    if (error) {
      alert("삭제 실패: " + error.message + "\n(연결된 등록자·광고비 데이터가 있으면 먼저 정리해야 합니다.)");
      return;
    }
    router.refresh();
  }

  if (!editing) {
    return (
      <tr className="border-t border-slate-800">
        <td className="px-4 py-2 font-bold text-slate-100">{c.name}</td>
        <td className="px-4 py-2 text-slate-300">{c.goal ?? "-"}명</td>
        <td className="px-4 py-2 text-slate-300">{c.pre_open ?? "-"}</td>
        <td className="px-4 py-2 text-slate-300">{c.eb1_open ?? "-"}</td>
        <td className="px-4 py-2 text-slate-300">{c.eb2_open ?? "-"}</td>
        <td className="px-4 py-2 text-slate-300">{c.reg_open ?? "-"}</td>
        <td className="px-4 py-2 text-slate-300">{c.ended_at ?? "-"}</td>
        <td className="px-4 py-2 whitespace-nowrap">
          <button onClick={() => setEditing(true)} className="px-2.5 py-1 rounded border border-slate-600 text-slate-300 text-xs hover:bg-slate-800">✏️ 수정</button>
          <button onClick={remove} disabled={saving} className="ml-1 px-2.5 py-1 rounded border border-rose-500/30 text-rose-300 text-xs hover:bg-rose-500/10 disabled:opacity-50">🗑️</button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-cyan-500/30 bg-cyan-500/5">
      <td colSpan={8} className="px-4 py-4">
        <div className="font-bold text-slate-200 mb-3">✏️ {c.name} 수정</div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <label className="text-sm">
            <span className="text-slate-400">기수명 *</span>
            <input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} />
          </label>
          <label className="text-sm">
            <span className="text-slate-400">목표 인원</span>
            <input type="number" value={form.goal} onChange={(e) => set("goal", e.target.value)} className={inputCls} />
          </label>
          {DATE_FIELDS.map((f) => (
            <label key={f.key} className="text-sm">
              <span className="text-slate-400">{f.label}</span>
              <input type="date" value={form[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} className={inputCls} />
            </label>
          ))}
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50">{saving ? "저장 중..." : "저장"}</button>
          <button onClick={() => { setForm(initial()); setEditing(false); }} className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800">취소</button>
        </div>
      </td>
    </tr>
  );
}
