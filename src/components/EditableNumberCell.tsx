"use client";
// 범용 숫자 인라인 수정 셀 — 어느 테이블/필드든 클릭 → 입력 → update → 즉시 갱신
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function EditableNumberCell({
  table,
  id,
  field,
  value,
  suffix = "원",
}: {
  table: string;
  id: number;
  field: string;
  value: number | null;
  suffix?: string;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(value ?? 0);
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const sb = createClient();
    const { error } = await sb
      .from(table)
      .update({ [field]: Number(val) || 0 })
      .eq("id", id);
    setSaving(false);
    if (error) {
      alert("저장 실패: " + error.message);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button
        onClick={() => setEditing(true)}
        className="group inline-flex items-center gap-1 text-slate-700 hover:text-blue-600"
        title="클릭해서 수정"
      >
        {(value ?? 0).toLocaleString("ko-KR")}
        {suffix}
        <span className="opacity-0 group-hover:opacity-100 text-xs">✎</span>
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="number"
        value={val}
        autoFocus
        onChange={(e) => setVal(Number(e.target.value))}
        onKeyDown={(e) => {
          if (e.key === "Enter") save();
          if (e.key === "Escape") {
            setEditing(false);
            setVal(value ?? 0);
          }
        }}
        className="w-28 px-2 py-1 rounded border border-blue-400 outline-none"
      />
      <button
        onClick={save}
        disabled={saving}
        className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-bold disabled:opacity-50"
      >
        {saving ? "..." : "저장"}
      </button>
      <button
        onClick={() => {
          setEditing(false);
          setVal(value ?? 0);
        }}
        className="px-2 py-1 rounded border border-slate-300 text-slate-500 text-xs"
      >
        취소
      </button>
    </span>
  );
}
