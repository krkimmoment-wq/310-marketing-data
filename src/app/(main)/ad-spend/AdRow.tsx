"use client";
// 광고비 행 — [수정] 버튼으로 행 전체 편집 (플랫폼·캠페인·집행일·광고비·노출·조회·클릭) + 삭제
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PLATFORMS = [
  { value: "youtube", label: "▶️ 유튜브" },
  { value: "instagram", label: "📷 인스타" },
];
const PLATFORM_LABEL: Record<string, string> = {
  youtube: "▶️ 유튜브",
  instagram: "📷 인스타",
};

export type Ad = {
  id: number;
  platform: string;
  campaign: string | null;
  period_start: string | null;
  cost: number | null;
  impressions: number | null;
  views: number | null;
  clicks: number | null;
};

const inputCls = "w-full px-2 py-1 rounded border border-blue-300 outline-none focus:border-blue-500 text-xs";

export default function AdRow({ a }: { a: Ad }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    platform: a.platform,
    campaign: a.campaign ?? "",
    period_start: a.period_start ?? "",
    cost: a.cost ?? 0,
    impressions: a.impressions ?? 0,
    views: a.views ?? 0,
    clicks: a.clicks ?? 0,
  });
  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    const sb = createClient();
    const { error } = await sb
      .from("ad_spend")
      .update({
        platform: form.platform,
        campaign: form.campaign || null,
        period_start: form.period_start || null,
        cost: Number(form.cost) || 0,
        impressions: Number(form.impressions) || 0,
        views: Number(form.views) || 0,
        clicks: Number(form.clicks) || 0,
      })
      .eq("id", a.id);
    setSaving(false);
    if (error) {
      alert("저장 실패: " + error.message);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`이 광고비(${PLATFORM_LABEL[a.platform] ?? a.platform} · ${a.campaign ?? "캠페인 없음"})를 삭제할까요?`)) return;
    setSaving(true);
    const sb = createClient();
    const { error } = await sb.from("ad_spend").delete().eq("id", a.id);
    setSaving(false);
    if (error) {
      alert("삭제 실패: " + error.message);
      return;
    }
    router.refresh();
  }

  function cancel() {
    setForm({
      platform: a.platform,
      campaign: a.campaign ?? "",
      period_start: a.period_start ?? "",
      cost: a.cost ?? 0,
      impressions: a.impressions ?? 0,
      views: a.views ?? 0,
      clicks: a.clicks ?? 0,
    });
    setEditing(false);
  }

  if (!editing) {
    return (
      <tr className="border-t border-slate-100">
        <td className="px-4 py-2 text-slate-700">{PLATFORM_LABEL[a.platform] ?? a.platform}</td>
        <td className="px-4 py-2 text-slate-600 max-w-xs truncate" title={a.campaign ?? ""}>{a.campaign ?? "-"}</td>
        <td className="px-4 py-2 text-slate-600">{a.period_start ?? "-"}</td>
        <td className="px-4 py-2 font-medium text-slate-800">{(a.cost ?? 0).toLocaleString("ko-KR")}원</td>
        <td className="px-4 py-2 text-slate-600">{(a.impressions ?? 0).toLocaleString("ko-KR")}</td>
        <td className="px-4 py-2 text-slate-600">{(a.views ?? 0).toLocaleString("ko-KR")}</td>
        <td className="px-4 py-2 text-slate-600">{(a.clicks ?? 0).toLocaleString("ko-KR")}</td>
        <td className="px-4 py-2 whitespace-nowrap">
          <button onClick={() => setEditing(true)} className="px-2.5 py-1 rounded border border-slate-300 text-slate-600 text-xs hover:bg-slate-100">✏️ 수정</button>
          <button onClick={remove} disabled={saving} className="ml-1 px-2.5 py-1 rounded border border-rose-200 text-rose-500 text-xs hover:bg-rose-50 disabled:opacity-50">🗑️</button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-blue-200 bg-blue-50/40">
      <td className="px-3 py-2">
        <select value={form.platform} onChange={(e) => set("platform", e.target.value)} className={inputCls}>
          {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </td>
      <td className="px-3 py-2"><input value={form.campaign} onChange={(e) => set("campaign", e.target.value)} className={inputCls} /></td>
      <td className="px-3 py-2"><input type="date" value={form.period_start} onChange={(e) => set("period_start", e.target.value)} className={inputCls} /></td>
      <td className="px-3 py-2"><input type="number" value={form.cost} onChange={(e) => set("cost", Number(e.target.value))} className={inputCls} /></td>
      <td className="px-3 py-2"><input type="number" value={form.impressions} onChange={(e) => set("impressions", Number(e.target.value))} className={inputCls} /></td>
      <td className="px-3 py-2"><input type="number" value={form.views} onChange={(e) => set("views", Number(e.target.value))} className={inputCls} /></td>
      <td className="px-3 py-2"><input type="number" value={form.clicks} onChange={(e) => set("clicks", Number(e.target.value))} className={inputCls} /></td>
      <td className="px-3 py-2 whitespace-nowrap">
        <button onClick={save} disabled={saving} className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-bold disabled:opacity-50">{saving ? "..." : "저장"}</button>
        <button onClick={cancel} className="ml-1 px-2 py-1 rounded border border-slate-300 text-slate-500 text-xs">취소</button>
      </td>
    </tr>
  );
}
