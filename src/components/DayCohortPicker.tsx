"use client";
// Day 비교 기수 선택 — 쌓인 기수 중 아무 조합이나 꺼내 보기 (?cohorts=16기,15기 …). 가장 최근 기수가 기준(첫 열)
import { useRouter, useSearchParams } from "next/navigation";

export default function DayCohortPicker({ all, chosen }: { all: string[]; chosen: string[] }) {
  const router = useRouter();
  const sp = useSearchParams();
  // ② 기수 비교 › Day 비교 탭 주소. 왼쪽 메뉴의 기수 선택(?cohort=)은 유지
  const href = (list?: string[]) => {
    const p = new URLSearchParams({ tab: "day" });
    const cohort = sp.get("cohort");
    if (cohort) p.set("cohort", cohort);
    if (list?.length) p.set("cohorts", list.join(","));
    return `/compare?${p.toString()}`;
  };
  const go = (list: string[]) => {
    const ordered = all.filter((n) => list.includes(n)); // 최신 → 과거 순 유지
    router.push(href(ordered));
  };
  const toggle = (n: string) => go(chosen.includes(n) ? chosen.filter((x) => x !== n) : [...chosen, n]);
  const focus = all.find((n) => chosen.includes(n));

  return (
    <div role="group" aria-label="비교 기수 선택" className="flex flex-wrap items-center gap-2 text-[13px]">
      <span className="text-[12px] text-gray-600">기수</span>
      {all.map((n) => {
        const on = chosen.includes(n);
        return (
          <button
            key={n}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(n)}
            className={`min-h-9 rounded-full border px-3 py-1.5 ${
              n === focus
                ? "border-gray-900 bg-gray-900 font-bold text-white"
                : on
                  ? "border-gray-400 bg-white font-bold text-gray-900"
                  : "border-dashed border-gray-300 bg-transparent text-gray-500 hover:bg-white"
            }`}
          >
            {n}
            {n === focus ? " · 기준" : on ? " ✓" : ""}
          </button>
        );
      })}
      <button type="button" onClick={() => router.push(href())} className="text-[12px] text-gray-600 underline hover:text-gray-900">
        기본으로
      </button>
    </div>
  );
}
