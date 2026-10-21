// 데이터 점검 카드 — 수집 중단·입력 누락·품질 이상을 대시보드에서 바로 보여준다
import Link from "next/link";
import type { HealthItem } from "@/lib/dataHealth";

const STYLE: Record<HealthItem["level"], { icon: string; cls: string }> = {
  red: { icon: "🔴", cls: "border-rose-400/50 text-rose-200" },
  yellow: { icon: "🟡", cls: "border-amber-400/40 text-amber-100" },
  info: { icon: "ℹ️", cls: "border-slate-500/40 text-slate-300" },
};

export default function DataHealthCard({ items }: { items: HealthItem[] }) {
  const red = items.filter((i) => i.level === "red").length;
  const yellow = items.filter((i) => i.level === "yellow").length;
  const info = items.filter((i) => i.level === "info").length;

  if (items.length === 0) {
    return (
      <div className="jarvis-card p-4 mb-6 fade-up text-sm text-emerald-300">
        🩺 데이터 점검 — ✅ 수집·입력·품질 이상 없음
      </div>
    );
  }

  return (
    <details className="jarvis-card p-5 mb-6 fade-up group" open={red > 0}>
      <summary className="cursor-pointer select-none flex flex-wrap items-center justify-between gap-2">
        <span className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80">🩺 데이터 점검</span>
        <span className="text-xs text-slate-300">
          {red > 0 && <span className="text-rose-300 font-bold mr-2">🔴 {red}</span>}
          {yellow > 0 && <span className="text-amber-300 mr-2">🟡 {yellow}</span>}
          {info > 0 && <span className="text-slate-400 mr-2">ℹ️ {info}</span>}
          <span className="text-slate-500 group-open:hidden">▸ 펼치기</span>
        </span>
      </summary>
      <ul className="mt-4 space-y-2">
        {items.map((it, i) => (
          <li key={i} className={`border-l-2 pl-3 text-sm ${STYLE[it.level].cls}`}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span>
                {STYLE[it.level].icon} {it.title}
              </span>
              {it.href && (
                <Link href={it.href} className="text-[11px] text-cyan-300 hover:text-cyan-200 whitespace-nowrap">
                  바로가기 →
                </Link>
              )}
            </div>
            {it.detail && <div className="text-[11px] text-slate-400 mt-0.5">{it.detail}</div>}
          </li>
        ))}
      </ul>
    </details>
  );
}
