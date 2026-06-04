"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV = [
  { href: "/", label: "대시보드", icon: "📊" },
  { href: "/registrations", label: "등록 관리", icon: "📝" },
];

export default function Sidebar() {
  const path = usePathname();
  const router = useRouter();

  async function logout() {
    const sb = createClient();
    await sb.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="w-56 shrink-0 bg-slate-900 text-slate-100 min-h-screen flex flex-col">
      <div className="p-5 border-b border-slate-700">
        <div className="font-extrabold text-lg">310 워크스페이스</div>
        <div className="text-xs text-slate-400 mt-0.5">모멘트핏 운영</div>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {NAV.map((n) => {
          const active = path === n.href;
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition ${
                active ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800"
              }`}
            >
              <span>{n.icon}</span> {n.label}
            </Link>
          );
        })}
      </nav>
      <button
        onClick={logout}
        className="m-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 text-left"
      >
        🚪 로그아웃
      </button>
    </aside>
  );
}
