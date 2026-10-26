// 구간 요약 데이터 로더 — 계산은 dashboardCore.phaseSummary(순수 함수)
import { createClient } from "@/lib/supabase/server";
import { kstToday } from "@/lib/cohorts";
import { cohortDailyRows } from "@/lib/daily";
import { boardCohorts } from "@/lib/board";
import { phaseSummary, type PhaseRow } from "@/lib/dashboardCore";
import type { CohortFull } from "@/lib/dayTableCore";

const COHORT_COLS = "id,name,pre_open,eb1_open,eb1_close,eb2_open,eb2_close,reg_open,reg_close,extra_close,ended_at,class_start,goal";

export type PhaseData = {
  cohort: CohortFull & { goal: number | null };
  all: string[];
  compareNames: string[];
  rows: PhaseRow[];
  arrivals: number;
  hasRoster: boolean; // 개별 등록 명단이 있는 기수인지 (13기는 집계만 있어 총등록·환불 등이 비어 있음)
};

export async function getPhaseData(selected?: string): Promise<PhaseData | null> {
  const today = kstToday();
  const { focus, compare, all } = await boardCohorts(selected, today);
  if (!focus) return null;
  const sb = await createClient();
  const { data: cs } = await sb.from("cohorts").select(COHORT_COLS).in("name", [focus, ...compare]);
  const byName = new Map(((cs ?? []) as (CohortFull & { goal: number | null })[]).map((c) => [c.name, c]));
  const cohort = byName.get(focus);
  if (!cohort) return null;

  const [regs, clicks, ads, arrivals, others] = await Promise.all([
    sb.from("registrations").select("reg_date,payment,is_refund,is_transfer,transfer_to_cohort_id").eq("cohort_id", cohort.id),
    sb.from("bitly_daily").select("click_date,clicks").gte("click_date", cohort.pre_open ?? today).range(0, 9999),
    sb.from("ad_spend").select("period_start,cost").eq("cohort_id", cohort.id),
    sb.from("registrations").select("id", { count: "exact", head: true }).eq("transfer_to_cohort_id", cohort.id).eq("payment", "입금완료").eq("is_refund", false),
    Promise.all(
      compare
        .map((n) => byName.get(n))
        .filter((c): c is CohortFull & { goal: number | null } => !!c)
        .map(async (c) => ({ name: c.name, cohort: c, daily: await cohortDailyRows(sb, c.id) }))
    ),
  ]);

  const rows = phaseSummary(cohort, regs.data ?? [], clicks.data ?? [], ads.data ?? [], today, others);
  return {
    cohort,
    all,
    compareNames: others.map((o) => o.name),
    rows,
    arrivals: arrivals.count ?? 0,
    hasRoster: (regs.data ?? []).length > 0,
  };
}
