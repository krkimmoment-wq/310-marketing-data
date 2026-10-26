"use client";
// 카카오 메시지 행 — [수정] 버튼으로 행 전체 편집 (제목·발송일·발송수·노출·클릭·비용) + 삭제
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type KakaoMsg = {
  id: number;
  title: string | null;
  content: string | null;
  sent_date: string | null;
  sent_count: number | null;
  impression_count: number | null;
  click_count: number | null;
  total_cost: number | null;
};

const inputCls = "w-full px-2 py-1 rounded bg-slate-900/60 border border-slate-700 text-slate-100 outline-none focus:border-cyan-400 text-xs";

// 클릭률 = 클릭 ÷ 발송 (확정 정의, 노출 아님)
function ctrOf(m: { click_count: number | null; sent_count: number | null }) {
  const s = m.sent_count ?? 0;
  const c = m.click_count ?? 0;
  return s ? `${Math.round((c / s) * 1000) / 10}%` : "-";
}

export default function KakaoMsgRow({ m }: { m: KakaoMsg }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: m.title ?? "",
    content: m.content ?? "",
    sent_date: m.sent_date ?? "",
    sent_count: m.sent_count ?? 0,
    impression_count: m.impression_count ?? 0,
    click_count: m.click_count ?? 0,
    total_cost: m.total_cost ?? 0,
  });
  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    const sb = createClient();
    const { error } = await sb
      .from("kakao_message")
      .update({
        title: form.title || null,
        content: form.content || null,
        sent_date: form.sent_date || null,
        sent_count: Number(form.sent_count) || 0,
        impression_count: Number(form.impression_count) || 0,
        click_count: Number(form.click_count) || 0,
        total_cost: Number(form.total_cost) || 0,
      })
      .eq("id", m.id);
    setSaving(false);
    if (error) {
      alert("저장 실패: " + error.message);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`이 카카오 메시지(${m.title ?? "제목 없음"} · ${m.sent_date ?? "발송일 없음"})를 삭제할까요?`)) return;
    setSaving(true);
    const sb = createClient();
    const { error } = await sb.from("kakao_message").delete().eq("id", m.id);
    setSaving(false);
    if (error) {
      alert("삭제 실패: " + error.message);
      return;
    }
    router.refresh();
  }

  function cancel() {
    setForm({
      title: m.title ?? "",
      content: m.content ?? "",
      sent_date: m.sent_date ?? "",
      sent_count: m.sent_count ?? 0,
      impression_count: m.impression_count ?? 0,
      click_count: m.click_count ?? 0,
      total_cost: m.total_cost ?? 0,
    });
    setEditing(false);
  }

  if (!editing) {
    return (
      <tr className="border-t border-slate-800">
        <td className="px-4 py-2 text-slate-200 max-w-xs truncate" title={m.content ?? m.title ?? ""}>{m.title ?? "-"}</td>
        <td className="px-4 py-2 text-slate-300">{m.sent_date ?? "-"}</td>
        <td className="px-4 py-2 text-slate-300">{(m.sent_count ?? 0).toLocaleString("ko-KR")}</td>
        <td className="px-4 py-2 text-slate-300">{(m.impression_count ?? 0).toLocaleString("ko-KR")}</td>
        <td className="px-4 py-2 text-slate-300">{(m.click_count ?? 0).toLocaleString("ko-KR")}</td>
        <td className="px-4 py-2 font-medium text-cyan-300">{ctrOf(m)}</td>
        <td className="px-4 py-2 font-medium text-slate-100">{(m.total_cost ?? 0).toLocaleString("ko-KR")}원</td>
        <td className="px-4 py-2 whitespace-nowrap">
          <button onClick={() => setEditing(true)} className="px-2.5 py-1 rounded border border-slate-600 text-slate-300 text-xs hover:bg-slate-800">✏️ 수정</button>
          <button onClick={remove} disabled={saving} className="ml-1 px-2.5 py-1 rounded border border-rose-500/30 text-rose-300 text-xs hover:bg-rose-500/10 disabled:opacity-50">🗑️</button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-cyan-500/30 bg-cyan-500/5">
      <td className="px-3 py-2"><input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} placeholder="제목" /></td>
      <td className="px-3 py-2"><input type="date" value={form.sent_date} onChange={(e) => set("sent_date", e.target.value)} className={inputCls} /></td>
      <td className="px-3 py-2"><input type="number" value={form.sent_count} onChange={(e) => set("sent_count", Number(e.target.value))} className={inputCls} /></td>
      <td className="px-3 py-2"><input type="number" value={form.impression_count} onChange={(e) => set("impression_count", Number(e.target.value))} className={inputCls} /></td>
      <td className="px-3 py-2"><input type="number" value={form.click_count} onChange={(e) => set("click_count", Number(e.target.value))} className={inputCls} /></td>
      <td className="px-3 py-2 text-cyan-300 text-xs">{ctrOf({ click_count: form.click_count, sent_count: form.sent_count })}</td>
      <td className="px-3 py-2"><input type="number" value={form.total_cost} onChange={(e) => set("total_cost", Number(e.target.value))} className={inputCls} /></td>
      <td className="px-3 py-2 whitespace-nowrap">
        <button onClick={save} disabled={saving} className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-bold disabled:opacity-50">{saving ? "..." : "저장"}</button>
        <button onClick={cancel} className="ml-1 px-2 py-1 rounded border border-slate-600 text-slate-300 text-xs">취소</button>
      </td>
    </tr>
  );
}
