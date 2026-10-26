"use client";
// 카카오 메시지 추가 폼 — 입력 즉시 Supabase 저장 + 성과지표 자동 반영
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function KakaoMsgForm({ cohortId }: { cohortId?: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: "",
    content: "",
    sent_date: new Date().toISOString().slice(0, 10),
    sent_count: 0,
    impression_count: 0,
    click_count: 0,
    total_cost: 0,
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!cohortId) return;
    setSaving(true);
    const sb = createClient();
    const { error } = await sb.from("kakao_message").insert({
      cohort_id: cohortId,
      title: form.title || null,
      content: form.content || null,
      sent_date: form.sent_date,
      sent_count: Number(form.sent_count) || 0,
      impression_count: Number(form.impression_count) || 0,
      click_count: Number(form.click_count) || 0,
      total_cost: Number(form.total_cost) || 0,
    });
    setSaving(false);
    if (error) {
      alert("저장 실패: " + error.message);
    } else {
      // 연속 입력: 폼 유지하고 입력값만 비움
      setForm((f) => ({ ...f, title: "", content: "", sent_count: 0, impression_count: 0, click_count: 0, total_cost: 0 }));
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700"
      >
        + 카카오 메시지 추가
      </button>
    );
  }

  const num = (k: keyof typeof form, label: string) => (
    <label className="text-sm">
      <span className="text-slate-400">{label}</span>
      <input
        type="number"
        value={form[k] as number}
        onChange={(e) => set(k, Number(e.target.value) as never)}
        className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400"
      />
    </label>
  );

  return (
    <form onSubmit={submit} className="jarvis-card p-5 space-y-4">
      <div className="font-bold text-slate-200">카카오 메시지 추가</div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <label className="text-sm md:col-span-2">
          <span className="text-slate-400">제목</span>
          <input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-400">발송일</span>
          <input
            type="date"
            value={form.sent_date}
            onChange={(e) => set("sent_date", e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400"
          />
        </label>
        <label className="text-sm md:col-span-3">
          <span className="text-slate-400">내용</span>
          <textarea
            value={form.content}
            onChange={(e) => set("content", e.target.value)}
            rows={2}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400"
          />
        </label>
        {num("sent_count", "발송수")}
        {num("impression_count", "노출수(참고)")}
        {num("click_count", "클릭수")}
        {num("total_cost", "발송비용 (원)")}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800"
        >
          취소
        </button>
      </div>
    </form>
  );
}
