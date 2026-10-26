// 기수 계획판 데이터 로더 — 계산은 planCore(순수 함수)에 위임
import { createClient } from "@/lib/supabase/server";
import { getCohortsChrono, kstToday } from "@/lib/cohorts";
import { cohortDailyRows } from "@/lib/daily";
import { latestCohortName } from "@/lib/nav";
import type { CohortFull } from "@/lib/dayTableCore";
import { addDays, pastBuckets, settleOf, type ExecRecords, type PastBucket, type PlanItem } from "@/lib/planCore";

const COHORT_COLS = "id,name,goal,pre_open,eb1_open,eb1_close,eb2_open,eb2_close,reg_open,reg_close,extra_close,ended_at,class_start";
export type PlanCohort = CohortFull & { goal: number | null };
const PLAN_COLS =
  "id,cohort_id,plan_date,end_date,plan_time,kind,title,owner,memo,status,ready,optional,ad_channel,ad_amount,source,rule_key";

// 계획판 기수 = 기수 관리에 등록된 가장 최근 기수 (③ 메뉴 이름과 같은 기준)
export async function getPlanCohort(): Promise<PlanCohort | null> {
  const sb = await createClient();
  const { data } = await sb.from("cohorts").select(COHORT_COLS);
  const list = (data ?? []) as PlanCohort[];
  const name = latestCohortName(list);
  return list.find((c) => c.name === name) ?? null;
}

export async function getPlanBoard(): Promise<{ cohort: PlanCohort; items: PlanItem[]; records: ExecRecords; today: string } | null> {
  const cohort = await getPlanCohort();
  if (!cohort) return null;
  const sb = await createClient();
  const today = kstToday();
  const from = cohort.pre_open ?? today;
  const to = cohort.class_start ? settleOf(cohort.class_start) : addDays(from, 120);
  const [items, kakao, ads, content, videos] = await Promise.all([
    sb.from("plan_items").select(PLAN_COLS).eq("cohort_id", cohort.id).order("plan_date").range(0, 4999),
    sb.from("kakao_message").select("sent_date").eq("cohort_id", cohort.id),
    sb.from("ad_spend").select("period_start,platform").eq("cohort_id", cohort.id),
    sb.from("content_log").select("pub_date,category").eq("cohort_id", cohort.id),
    sb.from("yt_video").select("pub_date,kind").gte("pub_date", addDays(from, -7)).lte("pub_date", to).range(0, 4999),
  ]);
  const records: ExecRecords = {
    kakao: ((kakao.data ?? []) as { sent_date: string | null }[]).map((k) => k.sent_date).filter((d): d is string => !!d),
    ads: ((ads.data ?? []) as { period_start: string | null; platform: string }[])
      .filter((a) => a.period_start)
      .map((a) => ({ date: a.period_start as string, platform: a.platform })),
    content: ((content.data ?? []) as { pub_date: string | null; category: string | null }[])
      .filter((c) => c.pub_date)
      .map((c) => ({ date: c.pub_date as string, category: c.category })),
    videos: ((videos.data ?? []) as { pub_date: string; kind: string | null }[]).map((v) => ({ date: v.pub_date, kind: v.kind })),
  };
  return { cohort, items: (items.data ?? []) as PlanItem[], records, today };
}

export type BudgetRow = {
  cohort_id: number;
  total_amount: number;
  share_eb1: number;
  share_eb2: number;
  share_regular: number;
  lecture_amount: number;
  memo: string | null;
};

// 광고 예산 탭: 저장값 + 지난 기수(클래스 시작한 최근 4개) 같은 구간 광고비·등록 수
export async function getBudgetView(): Promise<{
  cohort: PlanCohort;
  saved: BudgetRow | null;
  past: { name: string; buckets: PastBucket[]; settled: boolean }[];
  today: string;
} | null> {
  const cohort = await getPlanCohort();
  if (!cohort) return null;
  const sb = await createClient();
  const today = kstToday();
  const chrono = await getCohortsChrono();
  const pastNames = chrono.filter((c) => c.id !== cohort.id && c.class_start).slice(0, 4).map((c) => c.id);
  const [{ data: saved }, { data: cos }, { data: ads }] = await Promise.all([
    sb.from("plan_ad_budget").select("cohort_id,total_amount,share_eb1,share_eb2,share_regular,lecture_amount,memo").eq("cohort_id", cohort.id).maybeSingle(),
    sb.from("cohorts").select(COHORT_COLS).in("id", pastNames),
    sb.from("ad_spend").select("cohort_id,period_start,platform,cost").in("cohort_id", pastNames),
  ]);
  const past = await Promise.all(
    pastNames.map(async (id) => {
      const c = ((cos ?? []) as PlanCohort[]).find((x) => x.id === id)!;
      const daily = await cohortDailyRows(sb, id);
      const regs = daily.map((r) => ({ date: r.date, net: (r.new_count ?? 0) - (r.refund_count ?? 0) }));
      const mine = ((ads ?? []) as { cohort_id: number; period_start: string | null; platform: string; cost: number | null }[]).filter((a) => a.cohort_id === id);
      return { name: c.name, buckets: pastBuckets(c, mine, regs), settled: !!c.class_start && settleOf(c.class_start) < today };
    })
  );
  return { cohort, saved: (saved as BudgetRow | null) ?? null, past, today };
}

// 판단판 경고용: 내일 계획 (모든 기수)
export async function getTomorrowPlans(today = kstToday()) {
  const sb = await createClient();
  const { data } = await sb
    .from("plan_items")
    .select("id,cohort_id,plan_date,kind,title,status,ready,owner")
    .eq("plan_date", addDays(today, 1));
  return (data ?? []) as Pick<PlanItem, "id" | "cohort_id" | "plan_date" | "kind" | "title" | "status" | "ready" | "owner">[];
}
