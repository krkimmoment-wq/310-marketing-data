// 프로모션(YouTube 유료광고) 기수 대조 — ad_spend(platform=youtube) 기반
import { createClient } from "@/lib/supabase/server";

export type Promo = { campaign: string; cost: number; impressions: number; views: number; webVisits: number };
export type PromoSide = { name: string; promos: Promo[]; cost: number; impressions: number; views: number; webVisits: number };
export type PromotionData = { a: PromoSide; b: PromoSide } | null;

type Co = { id: number; name: string; pre_open: string | null; eb1_open: string | null };

export async function getPromotions(curName = "14기"): Promise<PromotionData> {
  const sb = await createClient();
  const { data: cohorts } = await sb.from("cohorts").select("id,name,pre_open,eb1_open").order("id");
  if (!cohorts || cohorts.length < 2) return null;
  const startOf = (c: Co) => (c.pre_open ?? c.eb1_open) ?? "";
  const cur = (cohorts as Co[]).find((c) => c.name === curName);
  if (!cur) return null;
  const prev = (cohorts as Co[]).filter((c) => c.id !== cur.id && startOf(c) < startOf(cur)).sort((a, b) => startOf(b).localeCompare(startOf(a)))[0];
  if (!prev) return null;

  const { data: ads } = await sb
    .from("ad_spend")
    .select("cohort_id,campaign,cost,impressions,views,clicks")
    .eq("platform", "youtube")
    .in("cohort_id", [cur.id, prev.id]);

  const side = (c: Co): PromoSide => {
    const promos: Promo[] = (ads ?? [])
      .filter((a) => a.cohort_id === c.id)
      .map((a) => ({ campaign: a.campaign ?? "", cost: a.cost ?? 0, impressions: a.impressions ?? 0, views: a.views ?? 0, webVisits: a.clicks ?? 0 }))
      .sort((x, y) => y.cost - x.cost);
    return {
      name: c.name,
      promos,
      cost: promos.reduce((s, p) => s + p.cost, 0),
      impressions: promos.reduce((s, p) => s + p.impressions, 0),
      views: promos.reduce((s, p) => s + p.views, 0),
      webVisits: promos.reduce((s, p) => s + p.webVisits, 0),
    };
  };

  return { a: side(cur), b: side(prev) };
}
