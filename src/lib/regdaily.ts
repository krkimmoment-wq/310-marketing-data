// 일별 등록 D-N 비교 — 현재 기수(실등록) vs 직전 기수(집계), 클래스 시작일 기준 정렬
import { createClient } from "@/lib/supabase/server";

export type RegPoint = { dn: number; curDay: number; curCum: number | null; prevDay: number; prevCum: number };
export type RegDaily = {
  curName: string;
  prevName: string;
  curToday: number; // 현재 기수 오늘의 D-N
  curTotal: number;
  prevTotal: number;
  prevAtToday: number; // 같은 D-N 시점의 직전 기수 누적
  rows: RegPoint[];
} | null;

type Co = { id: number; name: string; pre_open: string | null; eb1_open: string | null; class_start: string | null };

const dnOf = (d: string, cs: string) => Math.round((Date.parse(d) - Date.parse(cs)) / 86400000);

export async function getRegDaily(curName = "14기"): Promise<RegDaily> {
  const sb = await createClient();
  const { data: cohorts } = await sb.from("cohorts").select("id,name,pre_open,eb1_open,class_start").order("id");
  if (!cohorts || cohorts.length < 2) return null;
  const startOf = (c: Co) => (c.pre_open ?? c.eb1_open) ?? "";
  const cur = (cohorts as Co[]).find((c) => c.name === curName);
  if (!cur || !cur.class_start) return null;
  const prev = (cohorts as Co[]).filter((c) => c.id !== cur.id && startOf(c) < startOf(cur)).sort((a, b) => startOf(b).localeCompare(startOf(a)))[0];
  if (!prev || !prev.class_start) return null;

  const [{ data: regs }, { data: cd }] = await Promise.all([
    sb.from("registrations").select("reg_date,payment,is_refund,is_transfer").eq("cohort_id", cur.id),
    sb.from("cohort_daily").select("date,new_count,refund_count").eq("cohort_id", prev.id),
  ]);

  const curBy: Record<number, number> = {};
  for (const r of regs ?? []) {
    if (r.payment !== "입금완료" || r.is_refund || r.is_transfer || !r.reg_date) continue;
    const k = dnOf(r.reg_date, cur.class_start);
    curBy[k] = (curBy[k] ?? 0) + 1;
  }
  const prevBy: Record<number, number> = {};
  for (const r of cd ?? []) {
    const k = dnOf(r.date, prev.class_start);
    prevBy[k] = (prevBy[k] ?? 0) + (r.new_count ?? 0) - (r.refund_count ?? 0);
  }

  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const curToday = dnOf(today, cur.class_start);

  const keys = [...new Set([...Object.keys(curBy), ...Object.keys(prevBy)].map(Number))].sort((a, b) => a - b);
  let cc = 0, pc = 0, prevAtToday = 0;
  const rows: RegPoint[] = keys.map((dn) => {
    cc += curBy[dn] ?? 0;
    pc += prevBy[dn] ?? 0;
    if (dn <= curToday) prevAtToday = pc;
    return { dn, curDay: curBy[dn] ?? 0, curCum: dn <= curToday ? cc : null, prevDay: prevBy[dn] ?? 0, prevCum: pc };
  });

  return { curName: cur.name, prevName: prev.name, curToday, curTotal: cc, prevTotal: pc, prevAtToday, rows };
}
