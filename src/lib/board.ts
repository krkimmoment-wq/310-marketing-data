// 판단판(첫 화면) 데이터 로더 — 계산은 dashboardCore(순수 함수)에 위임
import { createClient } from "@/lib/supabase/server";
import { getCohortsChrono, kstToday, pickCurrentCohort, type CohortRow } from "@/lib/cohorts";
import { getDayTable } from "@/lib/dayTable";
import { buildAlerts, compareRows, conclusion, type Alert, type CompareRow, type Conclusion } from "@/lib/dashboardCore";
import { AD_DAY_MIN_VIEWS, settleDate, type CohortFull, type DayTableData } from "@/lib/dayTableCore";

// 기준 기수(선택 없으면 모집 시작한 기수 중 최신) + 비교 기수(그보다 먼저 시작한 기수 중 최근 3개)
export async function boardCohorts(selected?: string, today = kstToday()) {
  const chrono = await getCohortsChrono(); // 최신 → 과거
  const focus = selected && chrono.some((c) => c.name === selected) ? selected : pickCurrentCohort(chrono, today)?.name;
  const idx = chrono.findIndex((c) => c.name === focus);
  const compare = idx >= 0 ? chrono.slice(idx + 1).filter((c) => (c.pre_open ?? c.class_start ?? "") !== "").slice(0, 3).map((c) => c.name) : [];
  return { focus: focus ?? null, focusId: idx >= 0 ? chrono[idx].id : null, compare, all: chrono.map((c) => c.name), chrono };
}

const unpaidCount = async (cohortId: number) => {
  const sb = await createClient();
  const { count } = await sb
    .from("registrations")
    .select("id", { count: "exact", head: true })
    .eq("cohort_id", cohortId)
    .neq("payment", "입금완료")
    .eq("is_refund", false)
    .eq("is_transfer", false);
  return count ?? 0;
};

export type BoardStatus = {
  lastKakao: string | null;
  lastAd: string | null;
  lastCommunity: string | null;
  unpaid: number;
};

export type BoardData = {
  cohort: CohortFull;
  compareNames: string[];
  today: string;
  table: DayTableData;
  rows: CompareRow[];
  recent: CompareRow[];
  conclusion: Conclusion | null;
  alerts: Alert[];
  status: BoardStatus;
  spark: number[];
  todayNew: number | null;
  prevNews: (number | null)[]; // 어제·그제 신규
  avgTodayNew: number | null;
};

export async function getBoard(selected?: string): Promise<BoardData | null> {
  const today = kstToday();
  const { focus, focusId, compare, chrono } = await boardCohorts(selected, today);
  if (!focus || focusId === null) return null;
  // 표와 미입금 수는 서로 기다릴 필요가 없어 동시에
  const [{ data: table, raw }, unpaid] = await Promise.all([getDayTable([focus, ...compare], chrono as CohortRow[]), unpaidCount(focusId)]);
  const col = table.columns[0];
  if (!col || !raw || col.name !== focus) return null;
  const cohort = raw.cohorts.find((c) => c.id === col.cohortId)!;

  const rows = compareRows(table);
  const con = conclusion(table, today);
  const kakaoDates = raw.kakao.filter((k) => k.cohort_id === cohort.id && k.sent_date).map((k) => k.sent_date as string);
  const alerts = buildAlerts({
    today,
    cohort,
    kakaoDates,
    adDays: raw.ads,
    unpaid: unpaid ?? 0,
    diff: con?.diff ?? null,
    activeUntil: cohort.class_start ? settleDate(cohort.class_start) : undefined, // 최종 집계일까지 경고 유지
  });

  const lastOf = (ds: string[]) => ds.filter((d) => d <= today && (!cohort.pre_open || d >= cohort.pre_open)).sort().pop() ?? null;
  const status: BoardStatus = {
    lastKakao: lastOf(kakaoDates),
    lastAd: lastOf(raw.ads.filter((a) => (a.views ?? 0) >= AD_DAY_MIN_VIEWS).map((a) => a.day)),
    lastCommunity: lastOf((raw.ig ?? []).filter((m) => m.media_type === "IMAGE" || m.media_type === "CAROUSEL_ALBUM").map((m) => m.post_date)),
    unpaid: unpaid ?? 0,
  };

  const known = col.cells.filter((c) => c.cum !== null);
  const lastDay = con?.day ?? known[known.length - 1]?.day ?? 1;
  const spark = known.slice(-14).map((c) => c.cum as number);
  const cellAt = (d: number) => col.cells[d - 1] ?? null;
  const others = rows[lastDay - 1]?.cells.slice(1).map((c) => c?.net).filter((v): v is number => v !== null && v !== undefined) ?? [];

  return {
    cohort,
    compareNames: table.columns.slice(1).map((c) => c.name),
    today,
    table,
    rows,
    recent: rows.slice(Math.max(0, lastDay - 7), lastDay),
    conclusion: con,
    alerts,
    status,
    spark,
    todayNew: cellAt(lastDay)?.net ?? null,
    prevNews: [cellAt(lastDay - 1)?.net ?? null, cellAt(lastDay - 2)?.net ?? null],
    avgTodayNew: others.length ? Math.round((others.reduce((s, v) => s + v, 0) / others.length) * 10) / 10 : null,
  };
}
