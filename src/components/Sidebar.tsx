"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CohortSelector from "./CohortSelector";

// 메뉴 3묶음: 보기(매일 판단) / 분석(원인 찾기) / 입력·관리(기록)
const NAV_GROUPS: { title: string; items: { href: string; label: string }[] }[] = [
  {
    title: "보기",
    items: [
      { href: "/", label: "오늘 판단판" },
      { href: "/daily", label: "Day 비교" },
      { href: "/phases", label: "구간 요약" },
    ],
  },
  {
    title: "분석",
    items: [
      { href: "/compare", label: "기수별 비교" },
      { href: "/insights", label: "유입·전환 분석" },
      { href: "/brief-history", label: "브리핑 추세" },
      { href: "/sns", label: "SNS·채널" },
    ],
  },
  {
    title: "입력·관리",
    items: [
      { href: "/registrations", label: "등록 관리" },
      { href: "/ad-spend", label: "광고비" },
      { href: "/kakao-message", label: "카카오 메시지" },
      { href: "/content", label: "콘텐츠 기록" },
      { href: "/calendar", label: "캘린더" },
      { href: "/cohorts", label: "기수 관리" },
    ],
  },
];

export default function Sidebar({ cohorts = [], defaultCohort }: { cohorts?: { id: number; name: string }[]; defaultCohort?: string }) {
  const path = usePathname();
  const router = useRouter();
  const sp = useSearchParams();
  const cohort = sp.get("cohort") ?? defaultCohort ?? cohorts[0]?.name ?? "";
  const q = cohort ? `?cohort=${encodeURIComponent(cohort)}` : "";
  const [open, setOpen] = useState(false); // 모바일 드로어

  async function logout() {
    const sb = createClient();
    await sb.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
    {/* 모바일 햄버거 */}
    <button
      onClick={() => setOpen(true)}
      aria-label="메뉴 열기"
      className="md:hidden fixed top-3 left-3 z-30 w-10 h-10 rounded-lg bg-slate-900/90 text-white flex items-center justify-center shadow-lg backdrop-blur"
    >
      ☰
    </button>
    {/* 모바일 오버레이 */}
    {open && <div onClick={() => setOpen(false)} className="md:hidden fixed inset-0 bg-black/50 z-40" />}

    <aside
      className={`w-56 shrink-0 bg-white text-gray-800 border-r border-gray-200 min-h-screen flex flex-col
        fixed md:static inset-y-0 left-0 z-50 transform transition-transform duration-200
        ${open ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
    >
      <div className="p-5 border-b border-gray-200">
        <div className="font-black text-lg tracking-tight">310 마케팅</div>
        <div className="text-xs text-gray-600 mt-0.5">모멘트핏 운영</div>
      </div>
      <div className="pt-3">
        <CohortSelector cohorts={cohorts} defaultCohort={defaultCohort} />
      </div>
      <nav aria-label="메뉴" className="flex-1 p-3 flex flex-col gap-4">
        {NAV_GROUPS.map((g) => (
          <div key={g.title} className="flex flex-col gap-0.5">
            <span className="px-3 pb-1 text-[11px] font-bold tracking-wider text-gray-500">{g.title}</span>
            {g.items.map((n) => {
              const active = path === n.href;
              return (
                <Link
                  key={n.href}
                  href={`${n.href}${q}`}
                  onClick={() => setOpen(false)}
                  aria-current={active ? "page" : undefined}
                  className={`px-3 py-2 rounded-lg text-sm transition ${
                    active ? "bg-indigo-50 text-indigo-900 font-bold" : "text-gray-700 hover:bg-gray-100"
                  }`}
                >
                  {n.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
      <button
        onClick={logout}
        className="m-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 text-left"
      >
        로그아웃
      </button>
    </aside>
    </>
  );
}
