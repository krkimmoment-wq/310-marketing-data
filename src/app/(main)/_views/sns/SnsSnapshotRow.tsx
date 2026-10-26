"use client";
// 주간 스냅샷 행 — [수정]으로 날짜·채널 구독자 편집 + 그 날짜 스냅샷 전체 삭제
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const CHANNELS = [
  { key: "youtube", label: "유튜브" },
  { key: "instagram", label: "인스타" },
  { key: "tiktok", label: "틱톡" },
  { key: "navertv", label: "네이버TV" },
  { key: "kakao", label: "카카오" },
];

const inputCls = "w-full px-2 py-1 rounded border border-cyan-400/60 bg-slate-900/60 text-slate-100 outline-none focus:border-cyan-300 text-xs";

export default function SnsSnapshotRow({ date, values }: { date: string; values: Record<string, number> }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vals, setVals] = useState<Record<string, string>>(
    Object.fromEntries(CHANNELS.map((c) => [c.key, values[c.key] != null ? String(values[c.key]) : ""]))
  );

  async function save() {
    setSaving(true);
    const sb = createClient();
    // 값이 있는 채널은 upsert, 비운 채널은 그 날짜에서 삭제
    const upserts = CHANNELS.filter((c) => vals[c.key] !== "" && Number(vals[c.key]) > 0).map((c) => ({
      snapshot_date: date,
      channel: c.key,
      followers: Number(vals[c.key]),
    }));
    const clears = CHANNELS.filter((c) => vals[c.key] === "" || Number(vals[c.key]) <= 0).map((c) => c.key);

    if (upserts.length > 0) {
      const { error } = await sb.from("sns_followers").upsert(upserts, { onConflict: "snapshot_date,channel" });
      if (error) { setSaving(false); alert("저장 실패: " + error.message); return; }
    }
    if (clears.length > 0) {
      await sb.from("sns_followers").delete().eq("snapshot_date", date).in("channel", clears);
    }
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`${date} 스냅샷 전체를 삭제할까요?`)) return;
    setSaving(true);
    const sb = createClient();
    const { error } = await sb.from("sns_followers").delete().eq("snapshot_date", date);
    setSaving(false);
    if (error) { alert("삭제 실패: " + error.message); return; }
    router.refresh();
  }

  if (!editing) {
    return (
      <tr className="border-t border-slate-800">
        <td className="py-1.5 pr-4 text-slate-300 font-mono">{date.slice(2)}</td>
        {CHANNELS.map((c) => (
          <td key={c.key} className="py-1.5 px-3 text-right font-hud text-slate-100">
            {values[c.key] != null ? values[c.key].toLocaleString("ko-KR") : <span className="text-slate-600">-</span>}
          </td>
        ))}
        <td className="py-1.5 pl-3 whitespace-nowrap">
          <button onClick={() => setEditing(true)} className="px-2 py-1 rounded border border-slate-600 text-slate-300 text-xs hover:bg-slate-800">✏️ 수정</button>
          <button onClick={remove} disabled={saving} className="ml-1 px-2 py-1 rounded border border-rose-500/40 text-rose-300 text-xs hover:bg-rose-500/10 disabled:opacity-50">🗑️</button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-cyan-500/30 bg-cyan-500/5">
      <td className="py-1.5 pr-4 text-slate-300 font-mono">{date.slice(2)}</td>
      {CHANNELS.map((c) => (
        <td key={c.key} className="py-1.5 px-2">
          <input type="number" value={vals[c.key]} placeholder="-" onChange={(e) => setVals((v) => ({ ...v, [c.key]: e.target.value }))} className={inputCls} />
        </td>
      ))}
      <td className="py-1.5 pl-3 whitespace-nowrap">
        <button onClick={save} disabled={saving} className="px-2 py-1 rounded bg-cyan-500/90 text-slate-900 text-xs font-bold disabled:opacity-50">{saving ? "..." : "저장"}</button>
        <button onClick={() => setEditing(false)} className="ml-1 px-2 py-1 rounded border border-slate-600 text-slate-400 text-xs">취소</button>
      </td>
    </tr>
  );
}
