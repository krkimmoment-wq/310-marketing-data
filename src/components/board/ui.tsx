// 판단판·Day 비교·구간 요약 공통 부품 (밝은 테마) — 훅 없음, 서버·클라이언트 모두 사용 가능
import type { DayCell } from "@/lib/dayTableCore";
import { KIND_META, type PlanKind } from "@/lib/planCore";

// 구간 색: 칸 왼쪽 띠(strip) + 배지(bg/fg)
export const PHASE_STYLE: Record<string, { strip: string; bg: string; fg: string }> = {
  Day1이전: { strip: "#E5E7EB", bg: "#F3F4F6", fg: "#374151" },
  사전등록: { strip: "#E5E7EB", bg: "#F3F4F6", fg: "#374151" },
  "1차EB": { strip: "#67E8F9", bg: "#CFFAFE", fg: "#155E75" },
  대기1: { strip: "#E5E7EB", bg: "#F3F4F6", fg: "#374151" },
  "2차EB": { strip: "#93C5FD", bg: "#DBEAFE", fg: "#1E3A8A" },
  대기2: { strip: "#E5E7EB", bg: "#F3F4F6", fg: "#374151" },
  정규: { strip: "#FCD34D", bg: "#FEF3C7", fg: "#92400E" },
  추가: { strip: "#C4B5FD", bg: "#EDE9FE", fg: "#5B21B6" },
  "클래스 후": { strip: "#9CA3AF", bg: "#E5E7EB", fg: "#374151" }, // 클래스 시작 ~ 최종 집계일
};
const phaseStyle = (p: string) => PHASE_STYLE[p] ?? PHASE_STYLE["대기1"];

export function PhaseBadge({ phase }: { phase: string }) {
  const s = phaseStyle(phase);
  return (
    <span className="inline-block rounded px-1.5 py-0.5 text-[11px] font-bold whitespace-nowrap" style={{ background: s.bg, color: s.fg }}>
      {phase}
    </span>
  );
}

// 그날 한 일 → 짧은 칩 (카톡·특강·광고·숏n·롱n·커뮤·기록). 긴 제목은 상세에서만
const CHIP_COLOR: Record<string, [string, string]> = {
  카톡: ["#FEF9C3", "#713F12"],
  특강: ["#EDE9FE", "#5B21B6"],
  라이브: ["#FFEDD5", "#9A3412"],
  광고: ["#FFEDD5", "#9A3412"],
  커뮤: ["#FCE7F3", "#9D174D"],
  기록: ["#F3F4F6", "#374151"],
};
export function chipsOf(cell: DayCell | null): string[] {
  if (!cell) return [];
  const n = (k: string) => cell.actions.filter((a) => a.kind === k).length;
  const out: string[] = [];
  if (n("kakao")) out.push("카톡");
  if (n("special")) out.push("특강");
  if (n("live")) out.push("라이브");
  if (n("pool")) out.push("광고");
  if (n("short")) out.push(`숏${n("short")}`);
  if (n("long")) out.push(`롱${n("long")}`);
  if (n("community")) out.push("커뮤");
  if (n("memo")) out.push("기록");
  return out;
}
export function Chips({ cell, size = "sm" }: { cell: DayCell | null; size?: "sm" | "xs" }) {
  const chips = chipsOf(cell);
  if (!chips.length) return null;
  return (
    <span className="flex flex-wrap gap-[3px]">
      {chips.map((c) => {
        const [bg, fg] = CHIP_COLOR[c] ?? ["#E0F2FE", "#075985"]; // 숏n·롱n = 하늘색
        return (
          <span key={c} className={`rounded px-1 font-bold ${size === "xs" ? "text-[10px]" : "text-[11px]"}`} style={{ background: bg, color: fg }}>
            {c}
          </span>
        );
      })}
    </span>
  );
}

// 계획판 계획 → 점선 칩 (실제 기록 칩과 구분). 계획이 없으면 아무것도 그리지 않음
export function PlanChips({ cell, size = "sm" }: { cell: DayCell | null; size?: "sm" | "xs" }) {
  if (!cell?.plans?.length) return null;
  const kinds = [...new Set(cell.plans.map((p) => p.kind))] as PlanKind[];
  return (
    <span className="flex flex-wrap gap-[3px]">
      {kinds.map((k) => {
        const m = KIND_META[k] ?? KIND_META.etc;
        return (
          <span key={k} className={`rounded px-1 font-bold ${size === "xs" ? "text-[10px]" : "text-[11px]"}`} style={{ color: m.fg, border: `1px dashed ${m.border}`, background: "#FFFFFF" }}>
            {m.label}
          </span>
        );
      })}
    </span>
  );
}

export function ChipLegend() {
  return (
    <span className="text-[12px] text-gray-600">
      칩: 카톡 · 특강 · 광고(유튜브 광고 노출) · 숏n/롱n(영상 수) · 커뮤(인스타 커뮤니티) · 기록(콘텐츠 기록)
    </span>
  );
}

// 앞서면 초록 ▲, 뒤지면 빨강 ▼ (색 + 화살표로 구분)
export function Diff({ v }: { v: number | null }) {
  if (v === null) return <span className="text-gray-400">—</span>;
  const up = v >= 0;
  return <span className={`font-black ${up ? "text-green-700" : "text-red-700"}`}>{up ? "▲" : "▼"} {Math.abs(v).toFixed(1)}</span>;
}

// 작은 추세선 (최근 누적)
export function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null;
  const lo = Math.min(...values), hi = Math.max(...values);
  const span = hi - lo || 1;
  const pts = values.map((v, i) => `${((i / (values.length - 1)) * 130).toFixed(1)},${(32 - ((v - lo) / span) * 30).toFixed(1)}`).join(" ");
  return (
    <svg width="100%" height="34" viewBox="0 0 130 34" preserveAspectRatio="none" role="img" aria-label={label}>
      <polyline points={pts} fill="none" stroke="#2563EB" strokeWidth="2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

export const md = (d: string | null) => (d ? `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}` : "—");
export const daysAgo = (d: string | null, today: string) =>
  d ? Math.round((Date.parse(today + "T00:00:00Z") - Date.parse(d + "T00:00:00Z")) / 86400000) : null;
