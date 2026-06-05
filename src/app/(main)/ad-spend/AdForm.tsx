"use client";
// 광고비 추가 폼 — 입력 즉시 Supabase 저장 + 대시보드 ROAS 자동 반영
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const PLATFORMS = [
  { value: "youtube", label: "유튜브" },
  { value: "instagram", label: "인스타" },
];

export default function AdForm({ cohortId }: { cohortId?: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    platform: "youtube",
    campaign: "",
    period_start: new Date().toISOString().slice(0, 10),
    cost: 0,
    impressions: 0,
    views: 0,
    clicks: 0,
    landing_views: 0,
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!cohortId) return;
    setSaving(true);
    const sb = createClient();
    const { error } = await sb.from("ad_spend").insert({
      cohort_id: cohortId,
      platform: form.platform,
      campaign: form.campaign || null,
      period_start: form.period_start,
      cost: Number(form.cost) || 0,
      impressions: Number(form.impressions) || 0,
      views: Number(form.views) || 0,
      clicks: Number(form.clicks) || 0,
      landing_views: Number(form.landing_views) || 0,
    });
    setSaving(false);
    if (error) {
      alert("저장 실패: " + error.message);
    } else {
      setForm((f) => ({ ...f, campaign: "", cost: 0, impressions: 0, views: 0, clicks: 0, landing_views: 0 }));
      setOpen(false);
      router.refresh();
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700"
      >
        + 광고비 추가
      </button>
    );
  }

  const num = (k: keyof typeof form, label: string) => (
    <label className="text-sm">
      <span className="text-slate-500">{label}</span>
      <input
        type="number"
        value={form[k] as number}
        onChange={(e) => set(k, Number(e.target.value) as never)}
        className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500"
      />
    </label>
  );

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <div className="font-bold text-slate-700">광고비 추가</div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <label className="text-sm">
          <span className="text-slate-500">플랫폼</span>
          <select
            value={form.platform}
            onChange={(e) => set("platform", e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500"
          >
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-500">캠페인명</span>
          <input
            value={form.campaign}
            onChange={(e) => set("campaign", e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">집행 시작일</span>
          <input
            type="date"
            value={form.period_start}
            onChange={(e) => set("period_start", e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500"
          />
        </label>
        {num("cost", "광고비 (원)")}
        {num("impressions", "노출수")}
        {num("views", "조회/도달")}
        {num("clicks", "클릭/방문")}
        {num("landing_views", "랜딩뷰")}
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
          className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
        >
          취소
        </button>
      </div>
    </form>
  );
}
