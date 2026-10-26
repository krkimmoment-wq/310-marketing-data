"use client";
// 광고비 추가 폼 — 입력 즉시 Supabase 저장 + 대시보드 ROAS 자동 반영
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AD_CHANNEL_LABEL, adTypeOptions } from "@/lib/planCore";

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
    ad_type: "google_ads", // 종류: 매체에 맞춰 선택 (유튜브 → Google Ads·스튜디오 프로모션, 인스타 → 인스타)
    campaign: "",
    period_start: new Date().toISOString().slice(0, 10),
    period_end: "", // 종료일: 진행 중이면 빈칸
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
      ad_type: form.ad_type || null,
      campaign: form.campaign || null,
      period_start: form.period_start,
      period_end: form.period_end || null,
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
      // 연속 입력: 폼 유지하고 입력값만 비움
      setForm((f) => ({ ...f, campaign: "", period_end: "", cost: 0, impressions: 0, views: 0, clicks: 0, landing_views: 0 }));
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
      <div className="font-bold text-slate-200">광고비 추가</div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <label className="text-sm">
          <span className="text-slate-400">플랫폼</span>
          <select
            value={form.platform}
            onChange={(e) => setForm((f) => ({ ...f, platform: e.target.value, ad_type: adTypeOptions(e.target.value)[0] }))}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400"
          >
            {PLATFORMS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-400">종류</span>
          <select
            value={form.ad_type}
            onChange={(e) => set("ad_type", e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400"
          >
            {adTypeOptions(form.platform).map((t) => (
              <option key={t} value={t}>
                {AD_CHANNEL_LABEL[t]}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-400">캠페인명</span>
          <input
            value={form.campaign}
            onChange={(e) => set("campaign", e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-400">집행 시작일</span>
          <input
            type="date"
            value={form.period_start}
            onChange={(e) => set("period_start", e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-400">종료일</span>
          <input
            type="date"
            value={form.period_end}
            min={form.period_start}
            onChange={(e) => set("period_end", e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400"
          />
          <span className="mt-1 block text-[11px] text-slate-400">진행 중이면 빈칸</span>
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
          className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 hover:bg-slate-800"
        >
          취소
        </button>
      </div>
    </form>
  );
}
