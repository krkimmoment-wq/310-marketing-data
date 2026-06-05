"use client";
// 비교 대상 A/B 기수 선택 (15기 생기면 15 vs 13 등 임의 조합)
import { useRouter, useSearchParams } from "next/navigation";

export default function CompareSelector({
  cohorts,
  a,
  b,
}: {
  cohorts: { id: number; name: string }[];
  a: string;
  b: string;
}) {
  const router = useRouter();
  const sp = useSearchParams();

  function set(key: "a" | "b", name: string) {
    const params = new URLSearchParams(sp.toString());
    params.set(key, name);
    router.push(`/compare?${params.toString()}`);
    router.refresh();
  }

  const selectCls =
    "bg-slate-800 text-slate-100 font-bold rounded-lg px-3 py-2 border border-slate-700 outline-none focus:border-cyan-400 cursor-pointer";

  return (
    <div className="flex items-center gap-3">
      <select value={a} onChange={(e) => set("a", e.target.value)} className={`${selectCls} text-cyan-200`}>
        {cohorts.map((c) => (
          <option key={c.id} value={c.name}>{c.name}</option>
        ))}
      </select>
      <span className="text-slate-500 font-hud">vs</span>
      <select value={b} onChange={(e) => set("b", e.target.value)} className={`${selectCls} text-amber-200`}>
        {cohorts.map((c) => (
          <option key={c.id} value={c.name}>{c.name}</option>
        ))}
      </select>
    </div>
  );
}
