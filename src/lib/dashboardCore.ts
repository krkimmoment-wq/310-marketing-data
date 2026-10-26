// 판단판·Day 비교·구간 요약 계산 (순수 함수 — DB·Next 의존 없음, Node로 바로 테스트 가능)
// 기준 기수 = 표의 첫 열(columns[0]), 비교 기수 = 나머지 열
// 타입만 가져온다(실행 시 지워짐) — Node 테스트가 경로 별칭 없이 이 파일을 바로 읽도록
import type { CohortFull, DayCell, DayTableData } from "./dayTableCore";

// 결제일 구간 — dayTableCore.bandOf와 같은 규칙(경계 inclusive) + 사전등록 오픈 전은 "Day1이전"
function phaseOf(c: CohortFull, d: string): string {
  if (c.pre_open && d < c.pre_open) return "Day1이전";
  if (c.eb1_open && d < c.eb1_open) return "사전등록";
  if (c.eb1_close && d <= c.eb1_close) return "1차EB";
  if (c.eb2_open && d < c.eb2_open) return "대기1";
  if (c.eb2_close && d <= c.eb2_close) return "2차EB";
  if (c.reg_open && d < c.reg_open) return "대기2";
  if (c.reg_close && d <= c.reg_close) return "정규";
  return "추가";
}

const DAY_MS = 86400000;
const toMs = (d: string) => Date.parse(d + "T00:00:00Z");
const addDays = (d: string, n: number) => new Date(toMs(d) + n * DAY_MS).toISOString().slice(0, 10);
const diffDays = (a: string, b: string) => Math.round((toMs(b) - toMs(a)) / DAY_MS);
const round1 = (n: number) => Math.round(n * 10) / 10;

// ── Day 비교: 같은 Day의 비교 기수 누적 평균과 기준 기수와의 차이
export type CompareRow = { day: number; cells: (DayCell | null)[]; avg: number | null; diff: number | null };

export function compareRows(table: DayTableData): CompareRow[] {
  const rows: CompareRow[] = [];
  for (let day = 1; day <= table.maxDay; day++) {
    const cells = table.columns.map((c) => c.cells[day - 1] ?? null);
    const others = cells.slice(1).map((c) => c?.cum).filter((v): v is number => v !== null && v !== undefined);
    const avg = others.length ? round1(others.reduce((s, v) => s + v, 0) / others.length) : null;
    const focus = cells[0]?.cum ?? null;
    rows.push({ day, cells, avg, diff: focus !== null && avg !== null ? round1(focus - avg) : null });
  }
  return rows;
}

// ── 구간 순 보기: 같은 구간의 n일차끼리 한 줄로 맞추고, 구간 끝마다 "구간 합계" 줄
// 구간 길이가 기수마다 달라 짧은 기수 칸은 비움(null). 평균 누적·차이는 값 있는 비교 기수만.
export const PHASE_ORDER = ["사전등록", "1차EB", "대기1", "2차EB", "대기2", "정규", "추가", "클래스 후"] as const;
export type PhaseSum = { sum: number; days: number; elapsed: number; perDay: number | null };
export type PhaseViewRow =
  | { kind: "day"; phase: string; n: number; cells: (DayCell | null)[]; avg: number | null; diff: number | null }
  | { kind: "sum"; phase: string; sums: (PhaseSum | null)[]; avgPerDay: number | null; diffPerDay: number | null };

export function phaseView(table: DayTableData): PhaseViewRow[] {
  const rows: PhaseViewRow[] = [];
  for (const phase of PHASE_ORDER) {
    const byCol = table.columns.map((c) => c.cells.filter((x) => x.phase === phase));
    const len = Math.max(0, ...byCol.map((l) => l.length));
    if (!len) continue;
    for (let n = 1; n <= len; n++) {
      const cells = byCol.map((l) => l[n - 1] ?? null);
      const others = cells.slice(1).map((c) => c?.cum).filter((v): v is number => v !== null && v !== undefined);
      const avg = others.length ? round1(others.reduce((s, v) => s + v, 0) / others.length) : null;
      const focus = cells[0]?.cum ?? null;
      rows.push({ kind: "day", phase, n, cells, avg, diff: focus !== null && avg !== null ? round1(focus - avg) : null });
    }
    const sums: (PhaseSum | null)[] = byCol.map((l) => {
      if (!l.length) return null;
      const known = l.filter((x) => x.net !== null);
      const sum = known.reduce((s, x) => s + (x.net ?? 0), 0);
      return { sum, days: l.length, elapsed: known.length, perDay: known.length ? round1(sum / known.length) : null };
    });
    const otherPer = sums.slice(1).map((s) => s?.perDay).filter((v): v is number => v !== null && v !== undefined);
    const avgPerDay = otherPer.length ? round1(otherPer.reduce((s, v) => s + v, 0) / otherPer.length) : null;
    const focusPer = sums[0]?.perDay ?? null;
    rows.push({ kind: "sum", phase, sums, avgPerDay, diffPerDay: focusPer !== null && avgPerDay !== null ? round1(focusPer - avgPerDay) : null });
  }
  return rows;
}

// ── 결론 한 줄: 현재 · 같은 Day 평균 대비 · 예상 최종
// 예상 최종 = 현재 + 비교 기수들이 "오늘과 같은 D-N → 최종 집계일(표 마지막 날)" 사이에 늘어난 인원의 평균
// (기준 기수가 이미 집계일을 지났으면 현재값 그대로)
export type Conclusion = {
  cohort: string;
  day: number;
  dn: number | null;
  current: number;
  avg: number | null;
  diff: number | null;
  projection: number;
  incs: { name: string; inc: number }[]; // 예상 최종 근거: 비교 기수별 "같은 D-N → 집계일" 증가분
};

export function conclusion(table: DayTableData, today: string): Conclusion | null {
  const focus = table.columns[0];
  if (!focus) return null;
  const known = focus.cells.filter((c) => c.cum !== null);
  const last = known.find((c) => c.date === today) ?? known[known.length - 1];
  if (!last || last.cum === null) return null;
  const row = compareRows(table)[last.day - 1];
  let projection = last.cum;
  const focusEnd = focus.cells[focus.lastDay - 1]?.date;
  const incs: { name: string; inc: number }[] = [];
  if (last.dn !== null && focusEnd && today <= focusEnd) {
    for (const col of table.columns.slice(1)) {
      const at = col.cells.find((c) => c.dn === last.dn)?.cum;
      const end = col.cells[col.lastDay - 1]?.cum;
      if (at !== null && at !== undefined && end !== null && end !== undefined) incs.push({ name: col.name, inc: end - at });
    }
    if (incs.length) projection = Math.round(last.cum + incs.reduce((s, v) => s + v.inc, 0) / incs.length);
  }
  return { cohort: focus.name, day: last.day, dn: last.dn, current: last.cum, avg: row?.avg ?? null, diff: row?.diff ?? null, projection, incs };
}

// ── 구간 요약: 결제일 기준 구간별 총등록·환불·미입금·이전·실등록·비틀리·광고비 + 같은 구간 다른 기수 실등록
export const PHASES = ["Day1이전", "사전등록", "1차EB", "대기1", "2차EB", "대기2", "정규", "추가"] as const;

export type RegLite = {
  reg_date: string | null;
  payment: string | null;
  is_refund: boolean | null;
  is_transfer: boolean | null;
  transfer_to_cohort_id?: number | null;
};
export type PhaseRow = {
  phase: string;
  from: string | null;
  to: string | null;
  total: number;
  refund: number;
  unpaid: number;
  transfer: number;
  real: number;
  clicks: number;
  ad: number;
  others: Record<string, number>;
};

// 구간 기간(표시용) — 경계는 bandOf와 동일
function phaseRange(c: CohortFull, phase: string): [string | null, string | null] {
  const prev = (d: string | null) => (d ? addDays(d, -1) : null);
  const next = (d: string | null) => (d ? addDays(d, 1) : null);
  switch (phase) {
    case "Day1이전": return [null, prev(c.pre_open)];
    case "사전등록": return [c.pre_open, prev(c.eb1_open)];
    case "1차EB": return [c.eb1_open, c.eb1_close];
    case "대기1": return [next(c.eb1_close), prev(c.eb2_open)];
    case "2차EB": return [c.eb2_open, c.eb2_close];
    case "대기2": return [next(c.eb2_close), prev(c.reg_open)];
    case "정규": return [c.reg_open, c.reg_close];
    default: return [next(c.reg_close), c.class_start ? prev(c.class_start) : null];
  }
}

export function phaseSummary(
  c: CohortFull,
  regs: RegLite[],
  clicks: { click_date: string; clicks: number | null }[],
  ads: { period_start: string | null; cost: number | null }[],
  today: string,
  others: { name: string; cohort: CohortFull; daily: { date: string; new_count: number; refund_count: number }[] }[]
): PhaseRow[] {
  const rows = new Map<string, PhaseRow>(
    PHASES.map((p) => {
      const [from, to] = phaseRange(c, p);
      return [p, { phase: p, from, to, total: 0, refund: 0, unpaid: 0, transfer: 0, real: 0, clicks: 0, ad: 0, others: {} }];
    })
  );
  for (const r of regs) {
    if (!r.reg_date) continue;
    // 이 기수 안의 '다른 기수에서 들어옴' 행(이전 표시 + 도착 기수 = 이 기수)은 구간별 줄에서 빼고 합계의 '들어옴'으로만 센다
    if (r.is_transfer && r.transfer_to_cohort_id === c.id) continue;
    const row = rows.get(phaseOf(c, r.reg_date))!;
    row.total++;
    if (r.is_refund) row.refund++;
    else if (r.payment !== "입금완료") row.unpaid++;
    else if (r.is_transfer) row.transfer++;
    else row.real++;
  }
  const end = c.class_start && c.class_start < today ? c.class_start : today;
  for (const b of clicks)
    if (c.pre_open && b.click_date >= c.pre_open && b.click_date <= end) rows.get(phaseOf(c, b.click_date))!.clicks += b.clicks ?? 0;
  for (const a of ads) if (a.period_start) rows.get(phaseOf(c, a.period_start))!.ad += a.cost ?? 0;
  for (const o of others)
    for (const d of o.daily) {
      const row = rows.get(phaseOf(o.cohort, d.date))!;
      row.others[o.name] = (row.others[o.name] ?? 0) + (d.new_count ?? 0) - (d.refund_count ?? 0);
    }
  return [...rows.values()];
}

// ── 주의 신호: 규칙에 걸린 것만
export type Alert = { level: "act" | "check" | "good"; text: string };

const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;

export function buildAlerts(input: {
  today: string;
  cohort: CohortFull;
  kakaoDates: string[];
  adDays: { day: string; views: number | null }[];
  unpaid: number;
  diff: number | null;
  activeUntil?: string; // 카톡 공백·광고 끊김 경고를 이 날까지 유지 (= 최종 집계일). 없으면 클래스 시작 전날까지
}): Alert[] {
  const { today, cohort: c } = input;
  const out: Alert[] = [];
  const inRecruit =
    !!c.pre_open && c.pre_open <= today && (input.activeUntil ? today <= input.activeUntil : !c.class_start || today < c.class_start);
  const sent = input.kakaoDates.filter((d) => d <= today).sort();
  const closes: [string | null, string][] = [[c.eb1_close, "1차 얼리버드"], [c.eb2_close, "2차 얼리버드"], [c.reg_close, "정규 모집"]];
  const closing = closes.find(([d]) => d === today);
  if (closing && !sent.includes(today)) out.push({ level: "act", text: `오늘 ${closing[1]} 마감일인데 카톡 발송 기록이 없음` });
  if (inRecruit) {
    const lastK = sent[sent.length - 1];
    const gap = lastK ? diffDays(lastK, today) : null;
    if (gap === null || gap >= 7) out.push({ level: "check", text: gap === null ? "카톡 공백: 이번 기수 발송 기록 없음" : `카톡 공백 ${gap}일째 (마지막 ${md(lastK)})` });
    const adDays = input.adDays.filter((a) => (a.views ?? 0) >= 1000 && c.pre_open! <= a.day && a.day <= today).map((a) => a.day).sort(); // 광고 칩과 같은 1,000회 기준
    const lastAd = adDays[adDays.length - 1];
    const adGap = lastAd ? diffDays(lastAd, today) : null;
    if (adGap === null || adGap >= 3)
      out.push({ level: "check", text: `유튜브 광고 노출 ${lastAd ? `마지막 ${md(lastAd)} (${adGap}일 전)` : "없음"} · 분석 데이터는 2~3일 늦게 들어옴` });
  }
  if (input.unpaid > 0) out.push({ level: "check", text: `미입금 ${input.unpaid}명 — 개별 연락 필요` });
  if (input.diff !== null && input.diff <= -5) out.push({ level: "act", text: `같은 Day 평균보다 ${Math.abs(input.diff)}명 뒤처짐` });
  if (input.diff !== null && input.diff >= 5) out.push({ level: "good", text: `같은 Day 평균보다 ${input.diff}명 앞섬` });
  return out;
}
