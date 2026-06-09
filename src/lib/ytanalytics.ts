// YouTube 트래픽 소스 — 기수 모집기간 대조 (13기 vs 14기)
import { createClient } from "@/lib/supabase/server";

// 트래픽 소스 매핑 (의도 높음=따뜻한 신뢰색 / 알고리즘=보라 / 외부=주황)
const SRC: Record<string, { label: string; color: string; order: number; intent: "high" | "algo" | "ext" | "etc" }> = {
  YT_SEARCH: { label: "검색", color: "#22c55e", order: 0, intent: "high" },
  SUBSCRIBER: { label: "구독피드/홈", color: "#3b82f6", order: 1, intent: "high" },
  RELATED_VIDEO: { label: "추천영상", color: "#06b6d4", order: 2, intent: "algo" },
  SHORTS: { label: "Shorts", color: "#a855f7", order: 3, intent: "algo" },
  ADVERTISING: { label: "광고", color: "#64748b", order: 4, intent: "etc" },
  EXT_URL: { label: "외부링크", color: "#f59e0b", order: 5, intent: "ext" },
  EXTERNAL: { label: "외부링크", color: "#f59e0b", order: 5, intent: "ext" },
};
const OTHER = { label: "기타", color: "#475569", order: 9, intent: "etc" as const };

export type TrafficRow = { key: string; label: string; color: string; views: number; pct: number; intent: string };
export type TrafficMix = { name: string; start: string; end: string; total: number; rows: TrafficRow[] };
export type TrafficCompare = { a: TrafficMix; b: TrafficMix } | null;

export async function getTrafficCompare(curName = "14기"): Promise<TrafficCompare> {
  const sb = await createClient();
  const { data: cohorts } = await sb.from("cohorts").select("id, name, pre_open, eb1_open, ended_at").order("id");
  if (!cohorts || cohorts.length < 2) return null;
  const cur = cohorts.find((c) => c.name === curName);
  if (!cur) return null;
  // 직전 기수 = 시작일(pre_open/eb1_open)이 현재보다 이른 기수 중 가장 가까운 것 (id 순서 아님!)
  const startOf = (c: { pre_open: string | null; eb1_open: string | null }) => (c.pre_open ?? c.eb1_open) ?? "";
  const curStart = startOf(cur);
  const prev = cohorts
    .filter((c) => c.id !== cur.id && startOf(c) < curStart)
    .sort((a, b) => startOf(b).localeCompare(startOf(a)))[0];
  if (!prev) return null;

  const { data: traffic } = await sb.from("yt_traffic_daily").select("day, source, views");
  const rowsAll = traffic ?? [];

  function mix(c: { name: string; pre_open: string | null; eb1_open: string | null; ended_at: string | null }): TrafficMix {
    const start = (c.pre_open ?? c.eb1_open) as string;
    const end = c.ended_at as string;
    const inRange = rowsAll.filter((t) => t.day >= start && t.day <= end);
    const by = new Map<string, number>();
    for (const t of inRange) {
      const key = SRC[t.source] ? t.source : "OTHER";
      by.set(key, (by.get(key) ?? 0) + (t.views ?? 0));
    }
    const total = [...by.values()].reduce((s, v) => s + v, 0) || 1;
    const rows: TrafficRow[] = [...by.entries()]
      .map(([key, views]) => {
        const m = key === "OTHER" ? OTHER : SRC[key];
        return { key, label: m.label, color: m.color, views, pct: Math.round((views / total) * 1000) / 10, intent: m.intent };
      })
      .sort((a, b) => b.views - a.views);
    return { name: c.name, start, end, total, rows };
  }

  return { a: mix(cur), b: mix(prev) };
}
