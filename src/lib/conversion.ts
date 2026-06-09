// 구간별 전환 퍼널 — YouTube 조회 → 비틀리 클릭 → 등록 (13기 vs 14기)
import { createClient } from "@/lib/supabase/server";

type Cohort = {
  id: number; name: string;
  pre_open: string | null; eb1_open: string | null; eb1_close: string | null;
  eb2_open: string | null; eb2_close: string | null; reg_open: string | null;
  reg_close: string | null; extra_close: string | null; ended_at: string | null;
};

const SEC: { key: string; s: keyof Cohort; e: keyof Cohort; bitly: string }[] = [
  { key: "사전등록", s: "pre_open", e: "eb1_open", bitly: "사전등록" },
  { key: "1차EB", s: "eb1_open", e: "eb1_close", bitly: "1차 얼리버드" },
  { key: "대기1", s: "eb1_close", e: "eb2_open", bitly: "얼리버드 간 대기" },
  { key: "2차EB", s: "eb2_open", e: "eb2_close", bitly: "2차 얼리버드" },
  { key: "대기2", s: "eb2_close", e: "reg_open", bitly: "정규모집 전 대기" },
  { key: "정규", s: "reg_open", e: "reg_close", bitly: "정규모집" },
  { key: "추가", s: "reg_close", e: "ended_at", bitly: "추가등록" },
];

export type FunnelStage = { views: number; viewsPerDay: number; days: number; clicks: number; regs: number; conv: number | null }; // conv = 등록/클릭 %

const dayCount = (start: string, end: string) =>
  Math.max(1, Math.round((new Date(end + "T00:00:00Z").getTime() - new Date(start + "T00:00:00Z").getTime()) / 86400000) + 1);
export type FunnelRow = { section: string; a: FunnelStage; b: FunnelStage };
export type ConversionFunnel = { aName: string; bName: string; rows: FunnelRow[] } | null;

export async function getConversionFunnel(curName = "14기"): Promise<ConversionFunnel> {
  const sb = await createClient();
  const { data: cohorts } = await sb
    .from("cohorts")
    .select("id,name,pre_open,eb1_open,eb1_close,eb2_open,eb2_close,reg_open,reg_close,extra_close,ended_at")
    .order("id");
  if (!cohorts || cohorts.length < 2) return null;
  const startOf = (c: Cohort) => (c.pre_open ?? c.eb1_open) ?? "";
  const cur = (cohorts as Cohort[]).find((c) => c.name === curName);
  if (!cur) return null;
  const prev = (cohorts as Cohort[]).filter((c) => c.id !== cur.id && startOf(c) < startOf(cur)).sort((a, b) => startOf(b).localeCompare(startOf(a)))[0];
  if (!prev) return null;

  // yt_traffic (페이지네이션 — 1000행 제한 회피)
  const traffic: { day: string; views: number }[] = [];
  for (let from = 0; from < 50000; from += 1000) {
    const { data } = await sb.from("yt_traffic_daily").select("day, views").range(from, from + 999);
    if (!data || data.length === 0) break;
    traffic.push(...(data as { day: string; views: number }[]));
    if (data.length < 1000) break;
  }
  const [{ data: bitly }, { data: regsCur }, { data: dailyAll }] = await Promise.all([
    sb.from("bitly_section").select("cohort_id, section, total"),
    sb.from("registrations").select("section, payment, is_refund, is_transfer").eq("cohort_id", cur.id),
    sb.from("cohort_daily").select("cohort_id, section, new_count, refund_count"),
  ]);

  const ytViews = (c: Cohort, s: keyof Cohort, e: keyof Cohort) => {
    const st = c[s] as string | null, en = c[e] as string | null;
    if (!st || !en) return 0;
    return traffic.filter((t) => t.day >= st && t.day <= en).reduce((acc, t) => acc + (t.views ?? 0), 0);
  };
  const clicksOf = (cid: number, bsec: string) => (bitly ?? []).find((x) => x.cohort_id === cid && x.section === bsec)?.total ?? 0;
  // 등록: cur는 registrations(실등록), prev는 cohort_daily(순등록)
  const regsCurBy = (sec: string) => (regsCur ?? []).filter((r) => r.section === sec && r.payment === "입금완료" && !r.is_refund && !r.is_transfer).length;
  const regsDailyBy = (cid: number, sec: string) =>
    (dailyAll ?? []).filter((d) => d.cohort_id === cid && (d.section ?? "").replace(/\s/g, "") === sec).reduce((acc, d) => acc + ((d.new_count ?? 0) - (d.refund_count ?? 0)), 0);

  const stage = (c: Cohort, isCur: boolean, sec: (typeof SEC)[number]): FunnelStage => {
    const st = c[sec.s] as string | null, en = c[sec.e] as string | null;
    const days = st && en ? dayCount(st, en) : 1;
    const views = ytViews(c, sec.s, sec.e);
    const clicks = clicksOf(c.id, sec.bitly);
    const regs = isCur ? regsCurBy(sec.key) : regsDailyBy(c.id, sec.key);
    return { views, viewsPerDay: Math.round(views / days), days, clicks, regs, conv: clicks ? Math.round((regs / clicks) * 1000) / 10 : null };
  };

  const rows: FunnelRow[] = SEC.map((sec) => ({
    section: sec.key,
    a: stage(cur, true, sec),
    b: stage(prev, false, sec),
  })).filter((r) => r.a.views || r.a.clicks || r.a.regs || r.b.views || r.b.clicks || r.b.regs);

  return { aName: cur.name, bName: prev.name, rows };
}
