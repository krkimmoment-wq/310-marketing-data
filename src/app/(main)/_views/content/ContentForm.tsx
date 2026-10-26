"use client";
// 콘텐츠 추가 — 한 게시물을 여러 플랫폼에 동시 발행(복수 선택) 가능. 저장 즉시 비교차트·AI 반영
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CATEGORIES, PLATFORMS, STATUSES } from "./ContentRow";

export default function ContentForm({ cohortId }: { cohortId?: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    pub_date: new Date().toISOString().slice(0, 10),
    category: "공지",
    platforms: [] as string[],
    title: "",
    bitly_clicks: 0,
    reaction: "",
    reach: "",
    status: "✅ 완료",
    note: "",
  });
  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function togglePlat(p: string) {
    setForm((f) => ({ ...f, platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p] }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!cohortId) return;
    if (!form.title.trim()) { alert("제목/내용을 입력하세요."); return; }
    setSaving(true);
    const sb = createClient();
    const { error } = await sb.from("content_log").insert({
      cohort_id: cohortId,
      pub_date: form.pub_date,
      category: form.category,
      platform: form.platforms.join(", ") || null,
      title: form.title,
      bitly_clicks: Number(form.bitly_clicks) || 0,
      reaction: form.reaction || null,
      reach: form.reach || null,
      status: form.status,
      note: form.note || null,
    });
    setSaving(false);
    if (error) { alert("저장 실패: " + error.message); return; }
    setForm((f) => ({ ...f, title: "", platforms: [], bitly_clicks: 0, reaction: "", reach: "", note: "" }));
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="px-4 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700">
        + 콘텐츠 추가
      </button>
    );
  }

  const inputCls = "mt-1 w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400";
  return (
    <form onSubmit={submit} className="jarvis-card p-5 space-y-4">
      <div className="font-bold text-slate-200">콘텐츠 추가</div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <label className="text-sm"><span className="text-slate-400">발행일</span>
          <input type="date" value={form.pub_date} onChange={(e) => set("pub_date", e.target.value)} className={inputCls} /></label>
        <label className="text-sm"><span className="text-slate-400">카테고리</span>
          <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
            {CATEGORIES.map((x) => <option key={x}>{x}</option>)}
          </select></label>
        <label className="text-sm"><span className="text-slate-400">상태</span>
          <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
            {STATUSES.map((x) => <option key={x}>{x}</option>)}
          </select></label>
        <label className="text-sm md:col-span-3"><span className="text-slate-400">제목 / 내용</span>
          <input required value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} /></label>
        <div className="text-sm md:col-span-3">
          <span className="text-slate-400">플랫폼 <span className="text-slate-500">(여러 개 동시 선택 — 한 게시물을 여러 채널에 올린 경우)</span></span>
          <div className="mt-1 flex flex-wrap gap-2">
            {PLATFORMS.map((p) => (
              <button key={p} type="button" onClick={() => togglePlat(p)}
                className={`px-3 py-1.5 rounded-lg border text-xs ${form.platforms.includes(p) ? "bg-blue-600 text-white border-blue-600" : "border-slate-600 text-slate-300 hover:bg-slate-800"}`}>
                {form.platforms.includes(p) ? "✓ " : ""}{p}
              </button>
            ))}
          </div>
        </div>
        <label className="text-sm"><span className="text-slate-400">비틀리 클릭 <span className="text-slate-500">(sync가 자동 채움)</span></span>
          <input type="number" value={form.bitly_clicks} onChange={(e) => set("bitly_clicks", Number(e.target.value))} className={inputCls} /></label>
        <label className="text-sm"><span className="text-slate-400">반응 (예: 좋아요 54)</span>
          <input value={form.reaction} onChange={(e) => set("reaction", e.target.value)} className={inputCls} /></label>
        <label className="text-sm"><span className="text-slate-400">도달 (선택)</span>
          <input value={form.reach} onChange={(e) => set("reach", e.target.value)} className={inputCls} /></label>
        <label className="text-sm md:col-span-3"><span className="text-slate-400">비고 (선택)</span>
          <input value={form.note} onChange={(e) => set("note", e.target.value)} className={inputCls} /></label>
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50">{saving ? "저장 중..." : "저장"}</button>
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800">취소</button>
      </div>
    </form>
  );
}
