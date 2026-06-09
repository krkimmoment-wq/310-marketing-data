"use client";
// 콘텐츠 행 — 보기 / [수정] 펼침 폼(전체 필드) / 삭제. 등록관리·기수관리와 동일 패턴
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export const CATEGORIES = ["후기", "숏폼", "공지", "특강", "커뮤니티"];
export const PLATFORMS = ["유튜브", "인스타그램", "틱톡", "네이버TV", "카카오톡", "홈페이지"];
export const STATUSES = ["✅ 완료", "📝 예정", "🏃 진행"];

export type Content = {
  id: number;
  cohort_id: number;
  pub_date: string;
  category: string | null;
  platform: string | null;
  title: string | null;
  bitly_clicks: number | null;
  reaction: string | null;
  reach: string | null;
  status: string | null;
  note: string | null;
};

// "유튜브, 인스타그램" ↔ ["유튜브","인스타그램"]
export const splitPlat = (s: string | null) => (s ? s.split(/\s*,\s*/).filter(Boolean) : []);

const inputCls = "mt-1 w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400 text-sm";

export default function ContentRow({ c }: { c: Content }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const initial = () => ({
    pub_date: c.pub_date ?? "",
    category: c.category ?? "공지",
    platforms: splitPlat(c.platform),
    title: c.title ?? "",
    bitly_clicks: c.bitly_clicks ?? 0,
    reaction: c.reaction ?? "",
    reach: c.reach ?? "",
    status: c.status ?? "✅ 완료",
    note: c.note ?? "",
  });
  const [form, setForm] = useState(initial);
  function set<K extends keyof ReturnType<typeof initial>>(k: K, v: ReturnType<typeof initial>[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }
  function togglePlat(p: string) {
    setForm((f) => ({ ...f, platforms: f.platforms.includes(p) ? f.platforms.filter((x) => x !== p) : [...f.platforms, p] }));
  }

  async function save() {
    setSaving(true);
    const sb = createClient();
    const { error } = await sb
      .from("content_log")
      .update({
        pub_date: form.pub_date,
        category: form.category,
        platform: form.platforms.join(", ") || null,
        title: form.title || null,
        bitly_clicks: Number(form.bitly_clicks) || 0,
        reaction: form.reaction || null,
        reach: form.reach || null,
        status: form.status,
        note: form.note || null,
      })
      .eq("id", c.id);
    setSaving(false);
    if (error) { alert("저장 실패: " + error.message); return; }
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`콘텐츠 "${c.title ?? ""}"를 삭제할까요?`)) return;
    setSaving(true);
    const sb = createClient();
    const { error } = await sb.from("content_log").delete().eq("id", c.id);
    setSaving(false);
    if (error) { alert("삭제 실패: " + error.message); return; }
    router.refresh();
  }

  if (!editing) {
    return (
      <tr className="border-t border-slate-800">
        <td className="px-4 py-2 text-slate-300 whitespace-nowrap">{c.pub_date}</td>
        <td className="px-4 py-2 text-slate-200">{c.category ?? "-"}</td>
        <td className="px-4 py-2 text-slate-400 text-xs max-w-[140px] truncate" title={c.platform ?? ""}>{c.platform ?? "-"}</td>
        <td className="px-4 py-2 font-medium text-slate-100 max-w-xs truncate" title={c.title ?? ""}>{c.title ?? "-"}</td>
        <td className="px-4 py-2 text-slate-200 text-right">{(c.bitly_clicks ?? 0).toLocaleString("ko-KR")}</td>
        <td className="px-4 py-2 text-slate-400">{c.reaction || "-"}</td>
        <td className="px-4 py-2 text-slate-300 whitespace-nowrap">{c.status ?? "-"}</td>
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
        <div className="font-bold text-slate-200 mb-3">✏️ 콘텐츠 수정</div>
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
            <input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} /></label>
          <div className="text-sm md:col-span-3">
            <span className="text-slate-400">플랫폼 (복수 선택)</span>
            <div className="mt-1 flex flex-wrap gap-2">
              {PLATFORMS.map((p) => (
                <button key={p} type="button" onClick={() => togglePlat(p)}
                  className={`px-3 py-1.5 rounded-lg border text-xs ${form.platforms.includes(p) ? "bg-blue-600 text-white border-blue-600" : "border-slate-600 text-slate-300 hover:bg-slate-800"}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <label className="text-sm"><span className="text-slate-400">비틀리 클릭 (sync 자동)</span>
            <input type="number" value={form.bitly_clicks} onChange={(e) => set("bitly_clicks", Number(e.target.value))} className={inputCls} /></label>
          <label className="text-sm"><span className="text-slate-400">반응 (예: 좋아요 54)</span>
            <input value={form.reaction} onChange={(e) => set("reaction", e.target.value)} className={inputCls} /></label>
          <label className="text-sm"><span className="text-slate-400">도달 (선택)</span>
            <input value={form.reach} onChange={(e) => set("reach", e.target.value)} className={inputCls} /></label>
          <label className="text-sm md:col-span-3"><span className="text-slate-400">비고 (선택)</span>
            <input value={form.note} onChange={(e) => set("note", e.target.value)} className={inputCls} /></label>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50">{saving ? "저장 중..." : "저장"}</button>
          <button onClick={() => { setForm(initial()); setEditing(false); }} className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800">취소</button>
        </div>
      </td>
    </tr>
  );
}
