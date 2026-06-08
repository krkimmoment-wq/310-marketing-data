// 기수 일별 등록 데이터 — registrations 있으면 그걸로(등록관리 연동), 없으면 cohort_daily(집계)
// 14기처럼 개별 명단이 있는 기수: 등록 추가/수정 시 캘린더·비교차트 즉시 반영
// 13기처럼 명단 없는 기수: cohort_daily 집계 사용
import type { SupabaseClient } from "@supabase/supabase-js";

export type DailyRow = { date: string; new_count: number; refund_count: number; section: string | null };

export async function cohortDailyRows(sb: SupabaseClient, cohortId: number): Promise<DailyRow[]> {
  const { data: regs } = await sb
    .from("registrations")
    .select("reg_date, section, payment, is_refund, is_transfer")
    .eq("cohort_id", cohortId);

  if (regs && regs.length > 0) {
    // 실등록(입금완료 & 미환불 & 미기수이전)을 등록일별로 집계
    const byDate = new Map<string, DailyRow>();
    for (const r of regs) {
      if (r.payment !== "입금완료" || r.is_refund || r.is_transfer) continue;
      if (!r.reg_date) continue;
      const e = byDate.get(r.reg_date) ?? { date: r.reg_date, new_count: 0, refund_count: 0, section: r.section };
      e.new_count += 1;
      byDate.set(r.reg_date, e);
    }
    return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  }

  // 명단 없는 기수: cohort_daily 집계
  const { data } = await sb
    .from("cohort_daily")
    .select("date, new_count, refund_count, section")
    .eq("cohort_id", cohortId)
    .order("date");
  return (data ?? []) as DailyRow[];
}

// 구간별·날짜별 순등록 행 — 비교 화면(구간별 일평균·전환율)용
// registrations 있으면 그걸로(등록관리 연동), 없으면 cohort_daily 집계
export type SectionDailyRow = {
  cohort_id: number;
  section: string;
  new_count: number;
  refund_count: number;
  date: string;
};

export async function sectionDailyRows(sb: SupabaseClient, cohortId: number): Promise<SectionDailyRow[]> {
  const { data: regs } = await sb
    .from("registrations")
    .select("reg_date, section, payment, is_refund, is_transfer")
    .eq("cohort_id", cohortId);

  if (regs && regs.length > 0) {
    // 실등록 1명 = 1행. 구간·날짜는 dailyAvg/전환율 쪽에서 집계
    return regs
      .filter((r) => r.payment === "입금완료" && !r.is_refund && !r.is_transfer && r.reg_date)
      .map((r) => ({
        cohort_id: cohortId,
        section: r.section ?? "",
        new_count: 1,
        refund_count: 0,
        date: r.reg_date as string,
      }));
  }

  const { data } = await sb
    .from("cohort_daily")
    .select("cohort_id, section, new_count, refund_count, date")
    .eq("cohort_id", cohortId);
  return (data ?? []) as SectionDailyRow[];
}
