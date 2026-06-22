"use client";
// 캘린더 날짜 셀 — 클릭하면 일별 특이사항/액션 메모 입력 (📝 강조)
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { CalDay } from "@/lib/calendar";

export default function CalDayCell({
  cohortId,
  cell,
  dow,
}: {
  cohortId: number;
  cell: CalDay;
  dow: number; // 0=일
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState(cell.note ?? "");
  const [saving, setSaving] = useState(false);
  const hasReg = cell.newCount > 0 || cell.refund > 0;

  async function save() {
    setSaving(true);
    const sb = createClient();
    const text = val.trim();
    if (text) {
      await sb.from("calendar_note").upsert(
        { cohort_id: cohortId, note_date: cell.date, note: text },
        { onConflict: "cohort_id,note_date" }
      );
    } else {
      await sb.from("calendar_note").delete().eq("cohort_id", cohortId).eq("note_date", cell.date);
    }
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => {
          setVal(cell.note ?? "");
          setEditing(true);
        }}
        className={`aspect-square w-full rounded-md border p-1 flex flex-col text-left transition hover:border-cyan-400/70 ${
          cell.isToday
            ? "today-glow border-2 border-cyan-400"
            : cell.note
              ? "border-amber-400/70 bg-amber-500/10"
              : cell.milestone
                ? "border-cyan-400/60 bg-cyan-500/10"
                : hasReg
                  ? "border-slate-700 bg-slate-800/40"
                  : "border-slate-800/60"
        }`}
      >
        <div className="flex items-center justify-between leading-none">
          <span className={`text-[10px] ${cell.isToday ? "text-cyan-100 font-black" : dow === 0 ? "text-rose-400/80" : "text-slate-400"}`}>
            {cell.day}
            {cell.isToday && <span className="ml-0.5 text-[8px] font-black text-cyan-300 bg-cyan-500/30 rounded px-1 align-middle">오늘</span>}
          </span>
          {cell.cumulative > 0 && <span className="text-[8px] text-slate-500 font-mono">{cell.cumulative}</span>}
        </div>
        {cell.milestone && (
          <div className="text-[8px] text-cyan-300 leading-tight mt-0.5 truncate" title={cell.milestone}>
            {cell.milestone}
          </div>
        )}
        {cell.note && (
          <div className="text-[8px] text-amber-200 leading-tight mt-0.5 line-clamp-2" title={cell.note}>
            📝 {cell.note}
          </div>
        )}
        {(cell.events.content.length > 0 || cell.events.ad.length > 0) && (
          <div className="mt-0.5 flex flex-col gap-px leading-none">
            {cell.events.content.map((c, i) => (
              <span key={"c" + i} className="text-[10px] text-fuchsia-300 truncate" title={"콘텐츠: " + c}>📹{c}</span>
            ))}
            {cell.events.ad.map((a, i) => (
              <span key={"a" + i} className="text-[10px] text-amber-300 truncate" title={"광고: " + a}>💰{a}</span>
            ))}
          </div>
        )}
        <div className="mt-auto flex flex-col items-end gap-0.5 leading-none">
          {cell.newCount > 0 && <span className="text-[11px] font-hud text-emerald-300">+{cell.newCount}</span>}
          {cell.refund > 0 && <span className="text-[10px] text-rose-300">-{cell.refund}</span>}
        </div>
      </button>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={() => setEditing(false)}>
          <div className="w-full max-w-sm jarvis-card p-5" onClick={(e) => e.stopPropagation()}>
            <div className="font-hud text-sm text-cyan-300 mb-1">{cell.date} 특이사항 · 액션</div>
            <div className="text-[11px] text-slate-400 mb-3">예: 커뮤니티 발행, 특강 공지, 인스타 광고 시작</div>
            <textarea
              value={val}
              autoFocus
              onChange={(e) => setVal(e.target.value)}
              rows={4}
              placeholder="이 날 진행할 액션·메모를 입력하세요"
              className="w-full px-3 py-2 rounded-lg bg-slate-900/70 border border-slate-700 text-slate-100 text-sm outline-none focus:border-cyan-400"
            />
            <div className="flex gap-2 mt-3">
              <button onClick={save} disabled={saving} className="px-4 py-2 rounded-lg bg-cyan-500/90 text-slate-900 font-bold text-sm disabled:opacity-50">
                {saving ? "저장 중..." : "저장"}
              </button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 rounded-lg border border-slate-600 text-slate-300 text-sm">
                취소
              </button>
              {cell.note && (
                <button
                  onClick={() => { setVal(""); }}
                  className="ml-auto px-3 py-2 rounded-lg text-rose-300 text-sm hover:bg-rose-500/10"
                  title="비우고 저장하면 삭제"
                >
                  내용 지우기
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
