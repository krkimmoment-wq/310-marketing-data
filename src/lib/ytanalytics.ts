// YouTube 트래픽 소스 — 기수 모집기간 + 구간별 대조 (13기 vs 14기)
import { createClient } from "@/lib/supabase/server";

const SRC: Record<string, { label: string; color: string; intent: "high" | "algo" | "ext" | "etc" }> = {
  YT_SEARCH: { label: "검색", color: "#22c55e", intent: "high" },
  SUBSCRIBER: { label: "구독피드/홈", color: "#3b82f6", intent: "high" },
  RELATED_VIDEO: { label: "추천영상", color: "#06b6d4", intent: "algo" },
  SHORTS: { label: "쇼츠피드", color: "#a855f7", intent: "algo" },
  ADVERTISING: { label: "광고", color: "#64748b", intent: "etc" },
  EXT_URL: { label: "외부링크", color: "#f59e0b", intent: "ext" },
  EXTERNAL: { label: "외부링크", color: "#f59e0b", intent: "ext" },
};
const OTHER = { label: "기타", color: "#475569", intent: "etc" as const };

export type TrafficRow = { key: string; label: string; color: string; views: number; pct: number; intent: string };
export type TrafficMix = { name: string; start: string; end: string; days: number; total: number; perDay: number; rows: TrafficRow[] };

const dayCount = (start: string, end: string) =>
  Math.max(1, Math.round((new Date(end + "T00:00:00Z").getTime() - new Date(start + "T00:00:00Z").getTime()) / 86400000) + 1);
export type TrafficCompare = { a: TrafficMix; b: TrafficMix } | null;

type TrafficDay = { day: string; source: string; views: number };
type Cohort = {
  id: number; name: string;
  pre_open: string | null; eb1_open: string | null; eb1_close: string | null;
  eb2_open: string | null; eb2_close: string | null; reg_open: string | null;
  reg_close: string | null; extra_close: string | null; ended_at: string | null;
};

function mixRange(rows: TrafficDay[], name: string, start: string, end: string): TrafficMix {
  const inRange = rows.filter((t) => t.day >= start && t.day <= end);
  const by = new Map<string, number>();
  for (const t of inRange) {
    const key = SRC[t.source] ? t.source : "OTHER";
    by.set(key, (by.get(key) ?? 0) + (t.views ?? 0));
  }
  const total = [...by.values()].reduce((s, v) => s + v, 0);
  const out: TrafficRow[] = [...by.entries()]
    .map(([key, views]) => {
      const m = key === "OTHER" ? OTHER : SRC[key];
      return { key, label: m.label, color: m.color, views, pct: total ? Math.round((views / total) * 1000) / 10 : 0, intent: m.intent };
    })
    .sort((a, b) => b.views - a.views);
  const days = dayCount(start, end);
  return { name, start, end, days, total, perDay: Math.round(total / days), rows: out };
}

const startOf = (c: Cohort) => (c.pre_open ?? c.eb1_open) ?? "";

async function loadPair(curName: string): Promise<{ cur: Cohort; prev: Cohort; rows: TrafficDay[] } | null> {
  const sb = await createClient();
  const { data: cohorts } = await sb
    .from("cohorts")
    .select("id,name,pre_open,eb1_open,eb1_close,eb2_open,eb2_close,reg_open,reg_close,extra_close,ended_at")
    .order("id");
  if (!cohorts || cohorts.length < 2) return null;
  const cur = (cohorts as Cohort[]).find((c) => c.name === curName);
  if (!cur) return null;
  const prev = (cohorts as Cohort[])
    .filter((c) => c.id !== cur.id && startOf(c) < startOf(cur))
    .sort((a, b) => startOf(b).localeCompare(startOf(a)))[0];
  if (!prev) return null;
  // PostgREST 기본 1000행 제한 회피 — 페이지네이션으로 전체 수집
  const rows: TrafficDay[] = [];
  for (let from = 0; from < 50000; from += 1000) {
    const { data } = await sb.from("yt_traffic_daily").select("day, source, views").range(from, from + 999);
    if (!data || data.length === 0) break;
    rows.push(...(data as TrafficDay[]));
    if (data.length < 1000) break;
  }
  return { cur, prev, rows };
}

// 모집기간 전체 대조
export async function getTrafficCompare(curName = "14기"): Promise<TrafficCompare> {
  const p = await loadPair(curName);
  if (!p) return null;
  const { cur, prev, rows } = p;
  return {
    a: mixRange(rows, cur.name, startOf(cur), cur.ended_at ?? "2099-12-31"),
    b: mixRange(rows, prev.name, startOf(prev), prev.ended_at ?? "2099-12-31"),
  };
}

// 구간별 대조 (사전등록·1차EB·대기1·2차EB·대기2·정규·추가)
const SECTIONS: { key: string; s: keyof Cohort; e: keyof Cohort }[] = [
  { key: "사전등록", s: "pre_open", e: "eb1_open" },
  { key: "1차EB", s: "eb1_open", e: "eb1_close" },
  { key: "대기1", s: "eb1_close", e: "eb2_open" },
  { key: "2차EB", s: "eb2_open", e: "eb2_close" },
  { key: "대기2", s: "eb2_close", e: "reg_open" },
  { key: "정규", s: "reg_open", e: "reg_close" },
  { key: "추가", s: "reg_close", e: "ended_at" },
];
export type SectionTraffic = { section: string; a: TrafficMix | null; b: TrafficMix | null };
export type TrafficBySection = { aName: string; bName: string; sections: SectionTraffic[] } | null;

export async function getTrafficBySection(curName = "14기"): Promise<TrafficBySection> {
  const p = await loadPair(curName);
  if (!p) return null;
  const { cur, prev, rows } = p;
  const one = (c: Cohort, s: keyof Cohort, e: keyof Cohort): TrafficMix | null => {
    const start = c[s] as string | null;
    const end = c[e] as string | null;
    if (!start || !end) return null;
    return mixRange(rows, c.name, start, end);
  };
  const sections: SectionTraffic[] = SECTIONS.map((sec) => ({
    section: sec.key,
    a: one(cur, sec.s, sec.e),
    b: one(prev, sec.s, sec.e),
  })).filter((x) => x.a || x.b);
  return { aName: cur.name, bName: prev.name, sections };
}
