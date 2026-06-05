// 13기 vs 14기 Day(D-Day)별 비교 데이터
// day_num = 1차 EB OPEN(D-Day) 기준 상대일 → 두 기수를 같은 출발선에 정렬
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
};

// cohort 이름 → 색상 (14기 = 현재/시안, 13기 = 지난 기수/앰버)
const STYLE: Record<string, { color: string; order: number }> = {
  "14기": { color: "#00e5ff", order: 0 },
  "13기": { color: "#fbbf24", order: 1 },
};

export async function getDayComparison(
  cohortNames: string[] = ["14기", "13기"]
): Promise<DayComparison | null> {
  const sb = await createClient();

  const { data: cohorts } = await sb
    .from("cohorts")
    .select("id,name,pre_open,eb1_open,eb1_close,eb2_open,eb2_close,reg_open,reg_close,extra_close")
    .in("name", cohortNames);
  if (!cohorts || cohorts.length === 0) return null;

  let globalMin = Infinity;
  let maxY = 0;
  const series: DaySeries[] = [];

  for (const c of cohorts) {
    const st = STYLE[c.name] ?? { color: "#94a3b8", order: 9 };
    // registrations 있으면 등록관리 연동, 없으면 cohort_daily 집계
    const mine = await cohortDailyRows(sb, c.id);
    if (mine.length === 0) continue;
    const eb1 = c.eb1_open ? new Date(c.eb1_open + "T00:00:00Z").getTime() : 0;

    // day_num(1차 EB OPEN 기준)별 순증감 합산
    const agg = new Map<number, number>();
    for (const r of mine) {
      const dayNum = Math.round((new Date(r.date + "T00:00:00Z").getTime() - eb1) / 86400000);
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
    (a, b) => (STYLE[a.name]?.order ?? 9) - (STYLE[b.name]?.order ?? 9)
  );

  const maxDay = Math.max(...series.map((s) => s.lastDay));

  // 14기 기준 분기점·액션 (day_num = 1차 EB OPEN 기준)
  const c14 = cohorts.find((c) => c.name === "14기");
  const milestones: Milestone[] = [];
  const actions: DayAction[] = [];
  if (c14?.eb1_open) {
    const eb1 = new Date(c14.eb1_open + "T00:00:00Z").getTime();
    const toDay = (d: string) =>
      Math.round((new Date(d + "T00:00:00Z").getTime() - eb1) / 86400000);
    const ms: [string | null, string][] = [
      [c14.pre_open, "사전"],
      [c14.eb1_open, "1차EB"],
      [c14.eb1_close, "1차마감"],
      [c14.eb2_open, "2차EB"],
      [c14.eb2_close, "2차마감"],
      [c14.reg_open, "정규"],
      [c14.reg_close, "정규마감"],
      [c14.extra_close, "종료"],
    ];
    for (const [d, label] of ms) {
      if (d) milestones.push({ day: toDay(d), label });
    }
    const { data: contentRows } = await sb
      .from("content_log")
      .select("pub_date, title")
      .eq("cohort_id", c14.id)
      .order("pub_date");
    for (const r of contentRows ?? []) {
      if (r.pub_date && r.title) actions.push({ day: toDay(r.pub_date), text: r.title });
    }
  }

  return { minDay: globalMin, maxDay, maxY, series, milestones, actions };
}
