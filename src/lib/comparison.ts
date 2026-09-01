// 13기 vs 14기 Day(D-Day)별 비교 데이터
// day_num = 클래스 시작일(class_start) 기준 상대일 → 두 기수를 클래스 시작 시점에 정렬
// (14기 6/29, 13기 4/27. class_start 없으면 eb1_open으로 폴백)
import { createClient } from "@/lib/supabase/server";
import { cohortDailyRows } from "@/lib/daily";

export type DaySeries = {
  name: string;
  color: string;
  lastDay: number; // 데이터가 있는 마지막 day_num (진행 중 코호트의 '현재' 지점)
  total: number; // 최종 누적 순등록
  // 정수 day 축(minDay..lastDay)에 대해 forward-fill된 누적값. 그 외 구간은 null.
  points: { x: number; y: number }[];
};

export type Milestone = { day: number; label: string };
export type DayAction = { day: number; text: string };

export type DayComparison = {
  minDay: number;
  maxDay: number;
  maxY: number;
  series: DaySeries[];
  milestones: Milestone[];
  actions: DayAction[];
  todayDay: number | null; // 오늘(KST)의 day_num — 14기 클래스 시작 기준
};

export async function getDayComparison(
  cohortNames: string[] = ["14기", "13기"]
): Promise<DayComparison | null> {
  const sb = await createClient();

  // 색상·정렬은 이름이 아닌 "전달 순서"로 결정: [0]=현재(시안), [1]=직전(앰버)
  const styleFor = (name: string) => {
    const i = cohortNames.indexOf(name);
    return i === 0
      ? { color: "#00e5ff", order: 0 }
      : i === 1
        ? { color: "#fbbf24", order: 1 }
        : { color: "#94a3b8", order: 9 };
  };

  const { data: cohorts } = await sb
    .from("cohorts")
    .select("id,name,pre_open,eb1_open,eb1_close,eb2_open,eb2_close,reg_open,reg_close,extra_close,class_start")
    .in("name", cohortNames);
  if (!cohorts || cohorts.length === 0) return null;

  let globalMin = Infinity;
  let maxY = 0;
  const series: DaySeries[] = [];

  for (const c of cohorts) {
    const st = styleFor(c.name);
    // registrations 있으면 등록관리 연동, 없으면 cohort_daily 집계
    const mine = await cohortDailyRows(sb, c.id);
    if (mine.length === 0) continue;
    // 기준 = 클래스 시작일(없으면 1차 EB OPEN 폴백)
    const baseStr = c.class_start ?? c.eb1_open;
    const base = baseStr ? new Date(baseStr + "T00:00:00Z").getTime() : 0;

    // day_num(클래스 시작 기준)별 순증감 합산
    const agg = new Map<number, number>();
    for (const r of mine) {
      const dayNum = Math.round((new Date(r.date + "T00:00:00Z").getTime() - base) / 86400000);
      agg.set(dayNum, (agg.get(dayNum) ?? 0) + (r.new_count ?? 0) - (r.refund_count ?? 0));
    }
    const days = [...agg.keys()].sort((a, b) => a - b);
    const minDay = days[0];
    const lastDay = days[days.length - 1];
    globalMin = Math.min(globalMin, minDay);

    // 정수 축 forward-fill 누적
    const points: { x: number; y: number }[] = [];
    let cum = 0;
    for (let d = minDay; d <= lastDay; d++) {
      cum += agg.get(d) ?? 0;
      points.push({ x: d, y: cum });
    }
    maxY = Math.max(maxY, cum);
    series.push({ name: c.name, color: st.color, lastDay, total: cum, points });
  }

  if (series.length === 0) return null;
  series.sort(
    (a, b) => styleFor(a.name).order - styleFor(b.name).order
  );

  const maxDay = Math.max(...series.map((s) => s.lastDay));

  // 현재 기수(전달 순서 [0]) 기준 분기점·액션·오늘선 (day_num = 클래스 시작 기준)
  const cCur = cohorts.find((c) => c.name === cohortNames[0]);
  const milestones: Milestone[] = [];
  const actions: DayAction[] = [];
  let todayDay: number | null = null;
  const baseCurStr = cCur?.class_start ?? cCur?.eb1_open;
  if (baseCurStr) {
    const baseCurMs = new Date(baseCurStr + "T00:00:00Z").getTime();
    // 오늘(KST) day_num
    const nowKst = new Date(Date.now() + 9 * 3600 * 1000);
    const todayUtc = new Date(nowKst.toISOString().slice(0, 10) + "T00:00:00Z").getTime();
    todayDay = Math.round((todayUtc - baseCurMs) / 86400000);
  }
  if (cCur && baseCurStr) {
    const baseCur = new Date(baseCurStr + "T00:00:00Z").getTime();
    const toDay = (d: string) =>
      Math.round((new Date(d + "T00:00:00Z").getTime() - baseCur) / 86400000);
    const ms: [string | null, string][] = [
      [cCur.pre_open, "사전"],
      [cCur.eb1_open, "1차EB"],
      [cCur.eb1_close, "1차마감"],
      [cCur.eb2_open, "2차EB"],
      [cCur.eb2_close, "2차마감"],
      [cCur.reg_open, "정규"],
      [cCur.reg_close, "정규마감"],
      [cCur.extra_close, "모집종료"],
      [cCur.class_start, "클래스시작"],
    ];
    for (const [d, label] of ms) {
      if (d) milestones.push({ day: toDay(d), label });
    }
    const { data: contentRows } = await sb
      .from("content_log")
      .select("pub_date, title")
      .eq("cohort_id", cCur.id)
      .order("pub_date");
    for (const r of contentRows ?? []) {
      if (r.pub_date && r.title) actions.push({ day: toDay(r.pub_date), text: r.title });
    }
  }

  return { minDay: globalMin, maxDay, maxY, series, milestones, actions, todayDay };
}
