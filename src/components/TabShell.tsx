// 메뉴 화면 위쪽 — 메뉴 이름 + 둥근 탭 버튼 (지금 탭 = 진한 파랑). 탭을 바꿔도 기수 선택(?cohort=)은 유지
import Link from "next/link";
import { type MenuDef, menuLabel, tabHref } from "@/lib/nav";

export default function TabShell({
  menu,
  active,
  cohort,
  latestName,
}: {
  menu: MenuDef;
  active: string;
  cohort?: string;
  latestName?: string;
}) {
  const title = `${menu.num} ${menuLabel(menu, latestName)}`;
  return (
    <div className="bg-[#F6F6F3] px-6 md:px-8 pt-6 pb-2 flex flex-col gap-3">
      <h1 className="text-xl font-black tracking-tight text-gray-900">{title}</h1>
      <nav aria-label={`${title} 탭`} className="flex flex-wrap gap-2">
        {menu.tabs.map((t) => {
          const on = t.key === active;
          return (
            <Link
              key={t.key}
              href={tabHref(menu.href, t.key, cohort)}
              aria-current={on ? "page" : undefined}
              className={`inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 py-2 text-sm transition ${
                on
                  ? "border-[#1E3A8A] bg-[#1E3A8A] font-bold text-white"
                  : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              {t.label}
              {t.ready === false && (
                <span className={`text-[11px] font-normal ${on ? "text-blue-100" : "text-gray-500"}`}>준비 중</span>
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
