"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CohortSelector from "./CohortSelector";
import { MENUS, menuLabel, sidebarTabs } from "@/lib/nav";

// 메뉴 5개 (각 메뉴 안의 화면은 탭) — 정의는 src/lib/nav.ts
export default function Sidebar({
  cohorts = [],
  defaultCohort,
  latestName,
}: {
  cohorts?: { id: number; name: string }[];
  defaultCohort?: string;
  latestName?: string;
}) {
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
      <nav aria-label="메뉴" className="flex-1 p-3 flex flex-col gap-1">
        {MENUS.map((m) => {
          const active = path === m.href;
          return (
            <Link
              key={m.href}
              href={`${m.href}${q}`}
              onClick={() => setOpen(false)}
              aria-current={active ? "page" : undefined}
              className={`flex flex-col gap-0.5 px-3 py-2.5 rounded-lg transition ${
                active ? "bg-indigo-50 text-indigo-900" : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              <span className={`text-sm ${active ? "font-black" : "font-bold"}`}>
                {m.num} {menuLabel(m, latestName)}
              </span>
              <span className={`text-[11px] leading-snug ${active ? "text-indigo-800" : "text-gray-600"}`}>{sidebarTabs(m)}</span>
            </Link>
          );
        })}
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
