"use client";
// 전역 기수 선택기 — 선택 시 ?cohort= 로 모든 화면에 반영 (15기 추가돼도 자동)
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function CohortSelector({ cohorts }: { cohorts: { id: number; name: string }[] }) {
  const path = usePathname();
  const router = useRouter();
  const sp = useSearchParams();
  const current = sp.get("cohort") ?? cohorts[0]?.name ?? "14기";

  function change(name: string) {
    const params = new URLSearchParams(sp.toString());
    params.set("cohort", name);
    router.push(`${path}?${params.toString()}`);
    router.refresh();
  }

  if (cohorts.length === 0) return null;

  return (
    <div className="px-3 pb-2">
      <div className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">기수 선택</div>
      <select
        value={current}
        onChange={(e) => change(e.target.value)}
        className="w-full bg-slate-800 text-slate-100 text-sm font-bold rounded-lg px-3 py-2 border border-slate-700 outline-none focus:border-blue-500 cursor-pointer"
      >
        {cohorts.map((c) => (
          <option key={c.id} value={c.name}>
            {c.name}
          </option>
        ))}
      </select>
    </div>
  );
}
