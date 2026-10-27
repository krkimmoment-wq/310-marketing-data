"use client";
// 광고비 행 — [수정] 버튼으로 행 전체 편집 (플랫폼·캠페인·집행일·광고비·노출·조회·클릭) + 삭제
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { deleteWithLog, withEditor } from "@/lib/audit";
import { AD_CHANNEL_LABEL, adLedgerDisplay, adTypeOptions } from "@/lib/planCore";

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
  ad_type: string | null; // 종류 (옛 기록은 빈칸 = 확인 필요)
  campaign: string | null;
  period_start: string | null;
  period_end: string | null; // 종료일 (빈칸 = 진행 중, 옛 기록은 확인 필요)
  cost: number | null;
  impressions: number | null;
  views: number | null;
  clicks: number | null;
};

const inputCls = "w-full px-2 py-1 rounded bg-slate-900/60 border border-slate-700 text-slate-100 outline-none focus:border-cyan-400 text-xs";

// 클릭률(CTR) = 클릭 ÷ 노출 (광고 표준, 상단 카드와 동일 정의)
function ctrOf(m: { clicks: number | null; impressions: number | null }) {
  const imp = m.impressions ?? 0;
  const clk = m.clicks ?? 0;
  return imp ? `${Math.round((clk / imp) * 1000) / 10}%` : "-";
}

export default function AdRow({ a, cohortName }: { a: Ad; cohortName?: string }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const initial = () => ({
    platform: a.platform,
    ad_type: a.ad_type ?? "",
    campaign: a.campaign ?? "",
    period_start: a.period_start ?? "",
    period_end: a.period_end ?? "",
    cost: a.cost ?? 0,
    impressions: a.impressions ?? 0,
    views: a.views ?? 0,
    clicks: a.clicks ?? 0,
  });
  const [form, setForm] = useState(initial);
  const shown = adLedgerDisplay(a.ad_type, a.period_end);
  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    const sb = createClient();
    const { error } = await sb
      .from("ad_spend")
      .update(await withEditor({
        platform: form.platform,
        ad_type: form.ad_type || null,
        campaign: form.campaign || null,
        period_start: form.period_start || null,
        period_end: form.period_end || null,
        cost: Number(form.cost) || 0,
        impressions: Number(form.impressions) || 0,
        views: Number(form.views) || 0,
        clicks: Number(form.clicks) || 0,
      }, sb))
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
    if (!confirm(`이 광고비(${PLATFORM_LABEL[a.platform] ?? a.platform} · ${a.campaign ?? "캠페인 없음"})를 삭제할까요?
· 삭제하면 누가·언제·무엇을 지웠는지 기록이 남습니다`)) return;
    setSaving(true);
    const { error, logError } = await deleteWithLog("ad_spend", a, cohortName);
    setSaving(false);
    if (error) {
      alert("삭제 실패: " + error);
      return;
    }
    if (logError) alert("삭제는 됐지만 삭제 기록을 남기지 못했습니다: " + logError);
    router.refresh();
  }

  function cancel() {
    setForm(initial());
    setEditing(false);
  }
  const needCheck = "text-amber-300"; // "확인 필요" 표시 색

  if (!editing) {
    return (
      <tr className="border-t border-slate-800">
        <td className="px-4 py-2 text-slate-200">{PLATFORM_LABEL[a.platform] ?? a.platform}</td>
        <td className={`px-4 py-2 ${a.ad_type ? "text-slate-200" : needCheck}`}>{shown.type}</td>
        <td className="px-4 py-2 text-slate-300 max-w-xs truncate" title={a.campaign ?? ""}>{a.campaign ?? "-"}</td>
        <td className="px-4 py-2 text-slate-300">{a.period_start ?? "-"}</td>
        <td className={`px-4 py-2 ${shown.end === "확인 필요" ? needCheck : "text-slate-300"}`}>{shown.end}</td>
        <td className="px-4 py-2 font-medium text-slate-100">{(a.cost ?? 0).toLocaleString("ko-KR")}원</td>
        <td className="px-4 py-2 text-slate-300">{(a.impressions ?? 0).toLocaleString("ko-KR")}</td>
        <td className="px-4 py-2 text-slate-300">{(a.views ?? 0).toLocaleString("ko-KR")}</td>
        <td className="px-4 py-2 text-slate-300">{(a.clicks ?? 0).toLocaleString("ko-KR")}</td>
        <td className="px-4 py-2 font-medium text-cyan-300">{ctrOf(a)}</td>
        <td className="px-4 py-2 whitespace-nowrap">
          <button onClick={() => setEditing(true)} className="px-2.5 py-1 rounded border border-slate-600 text-slate-300 text-xs hover:bg-slate-800">✏️ 수정</button>
          <button onClick={remove} disabled={saving} className="ml-1 px-2.5 py-1 rounded border border-rose-500/30 text-rose-300 text-xs hover:bg-rose-500/10 disabled:opacity-50">🗑️</button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-cyan-500/30 bg-cyan-500/5">
      <td className="px-3 py-2">
        <select
          value={form.platform}
          onChange={(e) => {
            const p = e.target.value;
            // 매체를 바꾸면 종류도 그 매체에 맞는 값으로 (DB 규칙: 인스타 ↔ 인스타, 유튜브 ↔ Google Ads·스튜디오 프로모션)
            setForm((f) => ({ ...f, platform: p, ad_type: f.ad_type && adTypeOptions(p).includes(f.ad_type as never) ? f.ad_type : "" }));
          }}
          className={inputCls}
        >
          {PLATFORMS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        <select value={form.ad_type} onChange={(e) => set("ad_type", e.target.value)} className={inputCls} aria-label="종류">
          <option value="">확인 필요</option>
          {adTypeOptions(form.platform).map((t) => <option key={t} value={t}>{AD_CHANNEL_LABEL[t]}</option>)}
        </select>
      </td>
      <td className="px-3 py-2"><input value={form.campaign} onChange={(e) => set("campaign", e.target.value)} className={inputCls} /></td>
      <td className="px-3 py-2"><input type="date" value={form.period_start} onChange={(e) => set("period_start", e.target.value)} className={inputCls} /></td>
      <td className="px-3 py-2"><input type="date" value={form.period_end} min={form.period_start} onChange={(e) => set("period_end", e.target.value)} className={inputCls} aria-label="종료일 (진행 중이면 빈칸)" title="진행 중이면 빈칸" /></td>
      <td className="px-3 py-2"><input type="number" value={form.cost} onChange={(e) => set("cost", Number(e.target.value))} className={inputCls} /></td>
      <td className="px-3 py-2"><input type="number" value={form.impressions} onChange={(e) => set("impressions", Number(e.target.value))} className={inputCls} /></td>
      <td className="px-3 py-2"><input type="number" value={form.views} onChange={(e) => set("views", Number(e.target.value))} className={inputCls} /></td>
      <td className="px-3 py-2"><input type="number" value={form.clicks} onChange={(e) => set("clicks", Number(e.target.value))} className={inputCls} /></td>
      <td className="px-3 py-2 text-cyan-300 text-xs">{ctrOf({ clicks: form.clicks, impressions: form.impressions })}</td>
      <td className="px-3 py-2 whitespace-nowrap">
        <button onClick={save} disabled={saving} className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-bold disabled:opacity-50">{saving ? "..." : "저장"}</button>
        <button onClick={cancel} className="ml-1 px-2 py-1 rounded border border-slate-600 text-slate-300 text-xs">취소</button>
      </td>
    </tr>
  );
}
