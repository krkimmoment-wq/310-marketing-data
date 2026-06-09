// 일별 발행 D-N 비교 — 현재 기수 vs 직전 기수 영상 발행, 클래스 시작일 기준 정렬
import { createClient } from "@/lib/supabase/server";

export type PubPoint = { dn: number; curDay: number; curCum: number | null; prevDay: number; prevCum: number };
export type PubDaily = {
  curName: string;
  prevName: string;
  curToday: number;
  curTotal: number;
  prevTotal: number;
  prevAtToday: number; // 직전 기수 같은 D-N 시점 누적 발행
  curShort: number; curLong: number;
  prevShort: number; prevLong: number;
  rows: PubPoint[];
} | null;

type Co = { id: number; name: string; pre_open: string | null; eb1_open: string | null; class_start: string | null };
const dnOf = (d: string, cs: string) => Math.round((Date.parse(d) - Date.parse(cs)) / 86400000);

export async function getPubDaily(curName = "14기"): Promise<PubDaily> {
  const sb = await createClient();
  const { data: cohorts } = await sb.from("cohorts").select("id,name,pre_open,eb1_open,class_start").order("id");
  if (!cohorts || cohorts.length < 2) return null;
  const startOf = (c: Co) => (c.pre_open ?? c.eb1_open) ?? "";
  const cur = (cohorts as Co[]).find((c) => c.name === curName);
  if (!cur || !cur.class_start) return null;
  const prev = (cohorts as Co[]).filter((c) => c.id !== cur.id && startOf(c) < startOf(cur)).sort((a, b) => startOf(b).localeCompare(startOf(a)))[0];
  if (!prev || !prev.class_start) return null;

  const { data: vids } = await sb.from("yt_video").select("cohort_id,pub_date,kind").in("cohort_id", [cur.id, prev.id]);

  const curBy: Record<number, number> = {}, prevBy: Record<number, number> = {};
  let curShort = 0, curLong = 0, prevShort = 0, prevLong = 0;
  for (const v of vids ?? []) {
    if (!v.pub_date) continue;
    if (v.cohort_id === cur.id) {
      curBy[dnOf(v.pub_date, cur.class_start)] = (curBy[dnOf(v.pub_date, cur.class_start)] ?? 0) + 1;
      if (v.kind === "숏폼") curShort++; else curLong++;
    } else {
      prevBy[dnOf(v.pub_date, prev.class_start)] = (prevBy[dnOf(v.pub_date, prev.class_start)] ?? 0) + 1;
      if (v.kind === "숏폼") prevShort++; else prevLong++;
    }
  }

  const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const curToday = dnOf(today, cur.class_start);
  const keys = [...new Set([...Object.keys(curBy), ...Object.keys(prevBy)].map(Number))].sort((a, b) => a - b);
  let cc = 0, pc = 0, prevAtToday = 0;
  const rows: PubPoint[] = keys.map((dn) => {
    cc += curBy[dn] ?? 0;
    pc += prevBy[dn] ?? 0;
    if (dn <= curToday) prevAtToday = pc;
    return { dn, curDay: curBy[dn] ?? 0, curCum: dn <= curToday ? cc : null, prevDay: prevBy[dn] ?? 0, prevCum: pc };
  });

  return { curName: cur.name, prevName: prev.name, curToday, curTotal: cc, prevTotal: pc, prevAtToday, curShort, curLong, prevShort, prevLong, rows };
}
