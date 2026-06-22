// 14기 모집 캘린더 — registrations(등록관리 연동) 또는 cohort_daily + cohorts 분기점으로 월별 달력 생성
import { createClient } from "@/lib/supabase/server";
import { cohortDailyRows } from "@/lib/daily";

export type CalDay = {
  date: string;
  day: number;
  newCount: number;
  refund: number;
  cumulative: number;
  section: string | null;
  milestone: string | null;
  note: string | null; // 일별 특이사항/액션 메모
  events: { content: string[]; ad: string[] }; // 콘텐츠 발행(📹)·광고 집행(💰) 마커 — 추가
  isToday: boolean; // 오늘(KST) 여부 — 불빛 모션
};

export type CalMonth = {
  year: number;
  month: number;
  label: string;
  weeks: (CalDay | null)[][]; // 일~토 7칸
};

export type CalendarData = {
  cohortName: string;
  cohortId: number;
  months: CalMonth[];
  total: number; // 최종 누적
};

const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (y: number, m: number, d: number) => `${y}-${pad(m)}-${pad(d)}`;
// 오늘(KST) yyyy-mm-dd
const kstToday = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);

export async function getCalendar(cohortName = "14기"): Promise<CalendarData | null> {
  const sb = await createClient();
  const { data: cohort } = await sb.from("cohorts").select("*").eq("name", cohortName).single();
  if (!cohort) return null;

  const [daily, { data: notes }, { data: content }, { data: ads }] = await Promise.all([
    cohortDailyRows(sb, cohort.id),
    sb.from("calendar_note").select("note_date, note").eq("cohort_id", cohort.id),
    sb.from("content_log").select("pub_date, category, title").eq("cohort_id", cohort.id),
    sb.from("ad_spend").select("period_start, platform").eq("cohort_id", cohort.id), // cohort_id=14기만 → 13기 제외
  ]);
  const rows = daily;
  const noteMap = new Map<string, string>();
  for (const n of notes ?? []) noteMap.set(n.note_date, n.note);
  // 콘텐츠·광고 이벤트 마커 (추가 — 기존 등록/분기점/note 로직과 무관)
  const PF: Record<string, string> = { youtube: "유튜브", instagram: "인스타", tiktok: "틱톡" };
  const eventMap = new Map<string, { content: string[]; ad: string[] }>();
  const evGet = (d: string) => { let e = eventMap.get(d); if (!e) { e = { content: [], ad: [] }; eventMap.set(d, e); } return e; };
  for (const c of content ?? []) if (c.pub_date) evGet(c.pub_date).content.push(c.category || "콘텐츠");
  for (const a of ads ?? []) if (a.period_start) { const lbl = (PF[a.platform] || a.platform) + " 광고"; const e = evGet(a.period_start); if (!e.ad.includes(lbl)) e.ad.push(lbl); } // 같은날 같은채널 1회·금액제외

  // 날짜별 집계 + 누적
  const dayMap = new Map<string, { newCount: number; refund: number; cumulative: number; section: string | null }>();
  let cum = 0;
  for (const r of rows) {
    cum += (r.new_count ?? 0) - (r.refund_count ?? 0);
    dayMap.set(r.date, {
      newCount: r.new_count ?? 0,
      refund: r.refund_count ?? 0,
      cumulative: cum,
      section: r.section ?? null,
    });
  }
  const total = cum;

  // 분기점 라벨
  const milestoneMap = new Map<string, string>();
  const ms: [string | null, string][] = [
    [cohort.pre_open, "사전등록 오픈"],
    [cohort.eb1_open, "1차 EB"],
    [cohort.eb1_close, "1차 마감"],
    [cohort.eb2_open, "2차 EB"],
    [cohort.eb2_close, "2차 마감"],
    [cohort.reg_open, "정규 오픈"],
    [cohort.reg_close, "정규 마감"],
    [cohort.extra_close, "추가 마감"],
  ];
  for (const [d, label] of ms) if (d) milestoneMap.set(d, label);

  // 표시 월 범위: pre_open ~ ended_at
  const startStr = cohort.pre_open ?? rows[0]?.date;
  const endStr = cohort.ended_at ?? rows[rows.length - 1]?.date;
  if (!startStr || !endStr) return { cohortName: cohort.name, cohortId: cohort.id, months: [], total };
  const start = new Date(startStr + "T00:00:00Z");
  const end = new Date(endStr + "T00:00:00Z");
  const todayStr = kstToday();

  const months: CalMonth[] = [];
  let y = start.getUTCFullYear();
  let m = start.getUTCMonth() + 1;
  const endY = end.getUTCFullYear();
  const endM = end.getUTCMonth() + 1;
  while (y < endY || (y === endY && m <= endM)) {
    months.push(buildMonth(y, m, dayMap, milestoneMap, noteMap, eventMap, todayStr));
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }

  return { cohortName: cohort.name, cohortId: cohort.id, months, total };
}

function buildMonth(
  year: number,
  month: number,
  dayMap: Map<string, { newCount: number; refund: number; cumulative: number; section: string | null }>,
  milestoneMap: Map<string, string>,
  noteMap: Map<string, string>,
  eventMap: Map<string, { content: string[]; ad: string[] }>,
  todayStr: string
): CalMonth {
  const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay(); // 0=일
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const cells: (CalDay | null)[] = [];
  for (let i = 0; i < firstDow; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    const date = ymd(year, month, d);
    const info = dayMap.get(date);
    cells.push({
      date,
      day: d,
      newCount: info?.newCount ?? 0,
      refund: info?.refund ?? 0,
      cumulative: info?.cumulative ?? 0,
      section: info?.section ?? null,
      milestone: milestoneMap.get(date) ?? null,
      note: noteMap.get(date) ?? null,
      events: eventMap.get(date) ?? { content: [], ad: [] },
      isToday: date === todayStr,
    });
  }
  const weeks: (CalDay | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    const wk = cells.slice(i, i + 7);
    while (wk.length < 7) wk.push(null);
    weeks.push(wk);
  }
  return { year, month, label: `${year}년 ${month}월`, weeks };
}
