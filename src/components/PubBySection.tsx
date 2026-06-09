"use client";
// 구간별 발행 영상 분해 — 구간 클릭 시 발행 영상·조회수 펼침 (현재 vs 직전 기수)
import { useState } from "react";
import type { PubBySection, PubSecRow, PubVid } from "@/lib/pubsection";

const fmt = (n: number) => n.toLocaleString("ko-KR");

function VidList({ vids, color }: { vids: PubVid[]; color: string }) {
  return (
    <div className="space-y-0.5">
      {vids.slice(0, 8).map((v, i) => (
        <div key={i} className="flex justify-between gap-2 text-[11px]">
          <span className="truncate text-slate-300">{v.kind === "숏폼" ? "⚡" : "▶"} {v.title}</span>
          <span className={`shrink-0 tabular-nums ${color}`}>{fmt(v.views)}</span>
        </div>
      ))}
      {vids.length > 8 && <div className="text-[10px] text-slate-500">+{vids.length - 8}개 더</div>}
    </div>
  );
}

function Row({ row, aName, bName }: { row: PubSecRow; aName: string; bName: string }) {
  const [open, setOpen] = useState(false);
  const { section, a, b } = row;
  return (
    <div className="py-2.5 border-b border-slate-800">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between gap-2 text-left">
        <span className="font-bold text-slate-200 text-sm flex items-center gap-1">
          <span className="text-slate-500 text-xs w-3">{open ? "▼" : "▶"}</span>{section}
        </span>
        <span className="text-xs flex gap-3 flex-wrap justify-end">
          <span className="text-cyan-300">{aName} {a.count}개·{fmt(a.views)}</span>
          <span className="text-amber-300">{bName} {b.count}개·{fmt(b.views)}</span>
        </span>
      </button>
      {open && (
        <div className="grid md:grid-cols-2 gap-4 mt-2 pl-4">
          <div>
            <div className="text-[10px] text-cyan-400 mb-1 font-bold">{aName} ({a.count}개)</div>
            {a.vids.length ? <VidList vids={a.vids} color="text-cyan-300/80" /> : <div className="text-[10px] text-slate-600">발행 없음</div>}
          </div>
          <div>
            <div className="text-[10px] text-amber-400 mb-1 font-bold">{bName} ({b.count}개)</div>
            {b.vids.length ? <VidList vids={b.vids} color="text-amber-300/80" /> : <div className="text-[10px] text-slate-600">발행 없음</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PubBySectionView({ data }: { data: NonNullable<PubBySection> }) {
  const { aName, bName, rows } = data;
  return (
    <div className="jarvis-card p-5 mt-4">
      <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80 mb-1">구간별 발행 영상 · {aName} vs {bName}</div>
      <div className="text-[11px] text-slate-500 mb-3">구간을 클릭하면 그 구간에 발행한 영상·조회수(조회순)가 펼쳐집니다 — 어느 구간에 무엇을 깔았나.</div>
      <div>{rows.map((r) => <Row key={r.section} row={r} aName={aName} bName={bName} />)}</div>
    </div>
  );
}
