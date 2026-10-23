"use client";
// 전역 기수 선택기 — 선택 시 ?cohort= 로 모든 화면에 반영 (15기 추가돼도 자동)
import { usePathname, useRouter, useSearchParams } from "next/navigation";

export default function CohortSelector({ cohorts, defaultCohort }: { cohorts: { id: number; name: string }[]; defaultCohort?: string }) {
  const path = usePathname();
  const router = useRouter();
  const sp = useSearchParams();
  const current = sp.get("cohort") ?? defaultCohort ?? cohorts[0]?.name ?? "14기";

  function change(name: string) {
    const params = new URLSearchParams(sp.toString());
    params.set("cohort", name);
    router.push(`${path}?${params.toString()}`);
    router.refresh();
  }

  if (cohorts.length === 0) return null;

  return (
    <div className="px-3 pb-2">
      <label htmlFor="cohort-select" className="block text-[11px] font-bold tracking-wider text-gray-600 mb-1">기수 선택</label>
      <select
        id="cohort-select"
        value={current}
        onChange={(e) => change(e.target.value)}
        className="w-full bg-white text-gray-900 text-sm font-bold rounded-lg px-3 py-2 border border-gray-300 outline-none focus:border-blue-600 cursor-pointer"
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
