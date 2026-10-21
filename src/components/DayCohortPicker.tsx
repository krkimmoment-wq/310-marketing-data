"use client";
// Day별 비교 기수 선택 — 쌓인 기수 중 아무 조합이나 꺼내 보기 (?cohorts=16기,15기 …)
import { useRouter } from "next/navigation";

export default function DayCohortPicker({ all, chosen }: { all: string[]; chosen: string[] }) {
  const router = useRouter();
  const go = (list: string[]) => {
    const ordered = all.filter((n) => list.includes(n)); // 최신 → 과거 순 유지
    router.push(ordered.length ? `/daily?cohorts=${encodeURIComponent(ordered.join(","))}` : "/daily");
  };
  const toggle = (n: string) => go(chosen.includes(n) ? chosen.filter((x) => x !== n) : [...chosen, n]);

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4 text-sm">
      <span className="text-slate-400 text-xs">비교할 기수</span>
      {all.map((n) => (
        <label
          key={n}
          className={`cursor-pointer select-none rounded-lg border px-3 py-1.5 ${
            chosen.includes(n) ? "border-cyan-400 bg-cyan-500/15 text-cyan-200" : "border-slate-700 text-slate-400 hover:bg-slate-800"
          }`}
        >
          <input type="checkbox" className="hidden" checked={chosen.includes(n)} onChange={() => toggle(n)} />
          {n}
        </label>
      ))}
      <button onClick={() => router.push("/daily")} className="text-xs text-slate-400 hover:text-slate-200 underline">
        최근 4개로
      </button>
    </div>
  );
}
