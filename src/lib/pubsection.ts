// 구간별 발행 분해 — 각 모집 구간에 발행된 영상 목록·조회수 (현재 기수 vs 직전 기수)
import { createClient } from "@/lib/supabase/server";

type Co = {
  id: number; name: string; pre_open: string | null; eb1_open: string | null; eb1_close: string | null;
  eb2_open: string | null; eb2_close: string | null; reg_open: string | null; reg_close: string | null; ended_at: string | null;
};

const SEC: { key: string; s: keyof Co; e: keyof Co }[] = [
  { key: "사전등록", s: "pre_open", e: "eb1_open" },
  { key: "1차EB", s: "eb1_open", e: "eb1_close" },
  { key: "대기1", s: "eb1_close", e: "eb2_open" },
  { key: "2차EB", s: "eb2_open", e: "eb2_close" },
  { key: "대기2", s: "eb2_close", e: "reg_open" },
  { key: "정규", s: "reg_open", e: "reg_close" },
  { key: "추가", s: "reg_close", e: "ended_at" },
];

function secOf(c: Co, pub: string): string | null {
  for (const sec of SEC) {
    const st = c[sec.s] as string | null, en = c[sec.e] as string | null;
    if (st && en && st <= pub && pub <= en) return sec.key;
  }
  if (c.eb1_open && pub < c.eb1_open) return "사전등록"; // 직전 기수 pre_open 없을 때
  return null;
}

export type PubVid = { title: string; views: number; kind: string; pub_date: string };
export type PubSecSide = { count: number; views: number; vids: PubVid[] };
export type PubSecRow = { section: string; a: PubSecSide; b: PubSecSide };
export type PubBySection = { aName: string; bName: string; rows: PubSecRow[] } | null;

export async function getPubBySection(curName = "14기"): Promise<PubBySection> {
  const sb = await createClient();
  const { data: cohorts } = await sb
    .from("cohorts")
    .select("id,name,pre_open,eb1_open,eb1_close,eb2_open,eb2_close,reg_open,reg_close,ended_at")
    .order("id");
  if (!cohorts || cohorts.length < 2) return null;
  const startOf = (c: Co) => (c.pre_open ?? c.eb1_open) ?? "";
  const cur = (cohorts as Co[]).find((c) => c.name === curName);
  if (!cur) return null;
  const prev = (cohorts as Co[]).filter((c) => c.id !== cur.id && startOf(c) < startOf(cur)).sort((a, b) => startOf(b).localeCompare(startOf(a)))[0];
  if (!prev) return null;

  const { data: vids } = await sb.from("yt_video").select("cohort_id,pub_date,title,views,kind").in("cohort_id", [cur.id, prev.id]);

  const side = (c: Co): Record<string, PubSecSide> => {
    const m: Record<string, PubSecSide> = {};
    for (const v of vids ?? []) {
      if (v.cohort_id !== c.id || !v.pub_date) continue;
      const k = secOf(c, v.pub_date);
      if (!k) continue;
      (m[k] ||= { count: 0, views: 0, vids: [] });
      m[k].count++;
      m[k].views += v.views ?? 0;
      m[k].vids.push({ title: v.title ?? "", views: v.views ?? 0, kind: v.kind ?? "롱폼", pub_date: v.pub_date });
    }
    for (const k of Object.keys(m)) m[k].vids.sort((x, y) => y.views - x.views);
    return m;
  };
  const aM = side(cur), bM = side(prev);
  const empty: PubSecSide = { count: 0, views: 0, vids: [] };

  const rows: PubSecRow[] = SEC.map((sec) => ({ section: sec.key, a: aM[sec.key] ?? empty, b: bM[sec.key] ?? empty }))
    .filter((r) => r.a.count || r.b.count);

  return { aName: cur.name, bName: prev.name, rows };
}
