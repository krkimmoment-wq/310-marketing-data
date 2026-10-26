"use client";
// SNS 주간 스냅샷 추가 — 한 날짜에 5채널 구독자수 입력 → upsert (같은 날 재입력 시 갱신)
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CHANNELS = [
  { key: "youtube", label: "유튜브" },
  { key: "instagram", label: "인스타" },
  { key: "tiktok", label: "틱톡" },
  { key: "navertv", label: "네이버TV" },
  { key: "kakao", label: "카카오채널" },
];

export default function SnsForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [vals, setVals] = useState<Record<string, number>>({});

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const rows = CHANNELS.filter((c) => (vals[c.key] ?? 0) > 0).map((c) => ({
      snapshot_date: date,
      channel: c.key,
      followers: vals[c.key],
    }));
    if (rows.length === 0) {
      alert("최소 한 채널의 구독자수를 입력하세요.");
      return;
    }
    setSaving(true);
    const sb = createClient();
    const { error } = await sb
      .from("sns_followers")
      .upsert(rows, { onConflict: "snapshot_date,channel" });
    setSaving(false);
    if (error) {
      alert("저장 실패: " + error.message);
      return;
    }
    setVals({});
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2.5 rounded-lg bg-cyan-500/90 text-slate-900 font-bold hover:bg-cyan-400"
      >
        + 주간 스냅샷 추가
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="jarvis-card p-5 space-y-4">
      <div className="font-hud text-sm text-cyan-300">SNS 주간 스냅샷 추가</div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <label className="text-sm">
          <span className="text-slate-400">날짜</span>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-100 outline-none focus:border-cyan-400"
          />
        </label>
        {CHANNELS.map((c) => (
          <label key={c.key} className="text-sm">
            <span className="text-slate-400">{c.label} 구독자</span>
            <input
              type="number"
              value={vals[c.key] ?? ""}
              placeholder="0"
              onChange={(e) => setVals((v) => ({ ...v, [c.key]: Number(e.target.value) }))}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-100 outline-none focus:border-cyan-400"
            />
          </label>
        ))}
      </div>
      <div className="text-[11px] text-slate-500">
        입력한 채널만 저장됩니다. 같은 날짜를 다시 입력하면 값이 갱신됩니다.
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-cyan-500/90 text-slate-900 font-bold hover:bg-cyan-400 disabled:opacity-50"
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
