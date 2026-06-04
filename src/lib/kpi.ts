// 대시보드 KPI 계산 (Supabase 데이터 → 지표)
import { createClient } from "@/lib/supabase/server";

export type Kpi = {
  cohortName: string;
  goal: number;
  realRegs: number; // 실등록 (입금완료, 환불X)
  progressPct: number;
  totalAd: number;
  totalRevenue: number;
  roas: number;
  cac: number;
  bySection: Record<string, number>;
  eb1Open: string | null;
  endedAt: string | null;
};

export async function getKpi(cohortName = "14기"): Promise<Kpi | null> {
  const sb = await createClient();

  const { data: cohort } = await sb
    .from("cohorts")
    .select("*")
    .eq("name", cohortName)
    .single();
  if (!cohort) return null;

  const { data: regs } = await sb
    .from("registrations")
    .select("section, payment, is_refund")
    .eq("cohort_id", cohort.id);

  const { data: ads } = await sb
    .from("ad_spend")
    .select("cost")
    .eq("cohort_id", cohort.id);

  const { data: revs } = await sb
    .from("revenue")
    .select("total_paid")
    .eq("cohort_id", cohort.id);

  const real = (regs ?? []).filter(
    (r) => r.payment === "입금완료" && !r.is_refund
  );
  const bySection: Record<string, number> = {};
  for (const r of real) bySection[r.section] = (bySection[r.section] ?? 0) + 1;

  const totalAd = (ads ?? []).reduce((s, a) => s + (a.cost ?? 0), 0);
  const totalRevenue = (revs ?? []).reduce((s, r) => s + (r.total_paid ?? 0), 0);
  const realRegs = real.length;

  return {
    cohortName: cohort.name,
    goal: cohort.goal,
    realRegs,
    progressPct: cohort.goal ? Math.round((realRegs / cohort.goal) * 1000) / 10 : 0,
    totalAd,
    totalRevenue,
    roas: totalAd ? Math.round((totalRevenue / totalAd) * 10) / 10 : 0,
    cac: realRegs ? Math.round(totalAd / realRegs) : 0,
    bySection,
    eb1Open: cohort.eb1_open,
    endedAt: cohort.ended_at,
  };
}
