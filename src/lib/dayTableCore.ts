// 기수 × Day 비교표 계산 (순수 함수 — DB·Next 의존 없음, Node로 바로 테스트 가능)
// Day 1 = 각 기수의 사전등록 오픈일(기수 관리에서 수정하면 자동 반영). 그보다 앞선 결제는 "Day 1 이전"으로 모은다.

export type CohortFull = {
  id: number;
  name: string;
  pre_open: string | null;
  eb1_open: string | null;
  eb1_close: string | null;
  eb2_open: string | null;
  eb2_close: string | null;
  reg_open: string | null;
  reg_close: string | null;
  extra_close: string | null;
  ended_at: string | null;
  class_start: string | null;
};

export type ActionKind = "special" | "pool" | "short" | "long" | "kakao" | "community" | "memo";

export type DayAction = { kind: ActionKind; text: string };

export type DayCell = {
  day: number;
  date: string;
  net: number | null; // 당일 순등록 (미래 날짜는 null)
  cum: number | null; // 누적 (Day 1 이전 포함)
  phase: string; // 결제일 구간 (사전등록/1차EB/대기1/2차EB/대기2/정규/추가)
  phaseStart: string | null; // 이 날 시작한 구간 이름
  clicks: number | null; // 링크 클릭 (Bitly 일별)
  actions: DayAction[];
  isToday: boolean;
};

export type DayColumn = {
  cohortId: number;
  name: string;
  day1: string;
  lastDay: number;
  pre: number; // Day 1 이전 결제
  maxNet: number;
  ongoing: boolean;
  cells: DayCell[]; // index 0 = Day 1
};

export type DayTableData = { columns: DayColumn[]; maxDay: number; today: string };

export type DayRaw = {
  cohorts: CohortFull[];
  daily: Record<number, { date: string; new_count: number; refund_count: number }[]>;
  ads: { day: string; views: number | null }[]; // 유튜브 트래픽 ADVERTISING 일별 조회
  videos: { pub_date: string; kind: string | null; title: string | null; views: number | null }[];
  bitly: { click_date: string; clicks: number | null }[];
  kakao: { cohort_id: number; sent_date: string | null; title: string | null; sent_count: number | null; click_count: number | null }[];
  content: { cohort_id: number; pub_date: string | null; category: string | null; title: string | null }[];
};

const DAY_MS = 86400000;
const toMs = (d: string) => Date.parse(d + "T00:00:00Z");
const addDays = (d: string, n: number) => new Date(toMs(d) + n * DAY_MS).toISOString().slice(0, 10);
const diffDays = (a: string, b: string) => Math.round((toMs(b) - toMs(a)) / DAY_MS);
const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString("ko-KR");

// 결제일이 기수 일정상 어느 구간인지 (경계 inclusive, 등록관리 구간명과 동일)
export function bandOf(c: CohortFull, d: string): string {
  if (c.eb1_open && d < c.eb1_open) return "사전등록";
  if (c.eb1_close && d <= c.eb1_close) return "1차EB";
  if (c.eb2_open && d < c.eb2_open) return "대기1";
  if (c.eb2_close && d <= c.eb2_close) return "2차EB";
  if (c.reg_open && d < c.reg_open) return "대기2";
  if (c.reg_close && d <= c.reg_close) return "정규";
  return "추가";
}

export function buildDayTable(raw: DayRaw, cohortIds: number[], today: string): DayTableData {
  const adsByDay = new Map<string, number>();
  for (const a of raw.ads) if ((a.views ?? 0) > 0) adsByDay.set(a.day, (adsByDay.get(a.day) ?? 0) + (a.views ?? 0));
  const vidsByDay = new Map<string, DayRaw["videos"]>();
  for (const v of raw.videos) vidsByDay.set(v.pub_date, [...(vidsByDay.get(v.pub_date) ?? []), v]);
  const clicksByDay = new Map<string, number>();
  for (const b of raw.bitly) clicksByDay.set(b.click_date, b.clicks ?? 0);

  const columns: DayColumn[] = [];
  for (const id of cohortIds) {
    const c = raw.cohorts.find((x) => x.id === id);
    if (!c || !c.pre_open) continue;
    const day1 = c.pre_open;
    const end = c.class_start ?? c.ended_at ?? (today >= day1 ? today : day1);
    const lastDay = Math.max(1, diffDays(day1, end) + 1);

    // 날짜별 순등록
    const netByDate = new Map<string, number>();
    for (const r of raw.daily[id] ?? []) netByDate.set(r.date, (netByDate.get(r.date) ?? 0) + (r.new_count ?? 0) - (r.refund_count ?? 0));
    let pre = 0;
    for (const [d, n] of netByDate) if (d < day1) pre += n;

    // 구간 시작일 → 라벨
    const starts = new Map<string, string>();
    const startDefs: [string | null, string][] = [
      [c.pre_open, "사전등록"],
      [c.eb1_open, "1차EB"],
      [c.eb1_close ? addDays(c.eb1_close, 1) : null, "대기1"],
      [c.eb2_open, "2차EB"],
      [c.eb2_close ? addDays(c.eb2_close, 1) : null, "대기2"],
      [c.reg_open, "정규"],
      [c.reg_close ? addDays(c.reg_close, 1) : null, "추가"],
    ];
    for (const [d, lab] of startDefs) if (d) starts.set(d, lab);

    const cohortKakao = raw.kakao.filter((k) => k.cohort_id === id && k.sent_date);
    const cohortContent = raw.content.filter((x) => x.cohort_id === id && x.pub_date);

    const cells: DayCell[] = [];
    let cum = pre;
    let maxNet = 0;
    for (let i = 1; i <= lastDay; i++) {
      const date = addDays(day1, i - 1);
      const future = date > today;
      const net = future ? null : netByDate.get(date) ?? 0;
      if (net !== null) {
        cum += net;
        maxNet = Math.max(maxNet, net);
      }

      const actions: DayAction[] = [];
      const adv = adsByDay.get(date);
      if (adv) actions.push({ kind: "pool", text: `유튜브 유료 노출(프로모션·광고) 조회 ${fmt(adv)}` });
      for (const v of vidsByDay.get(date) ?? [])
        actions.push({ kind: v.kind === "롱폼" ? "long" : "short", text: `${v.kind ?? "영상"} · ${v.title ?? ""} (현재 조회 ${fmt(v.views)})` });
      for (const k of cohortKakao.filter((k) => k.sent_date === date)) {
        const isSpecial = (k.title ?? "").includes("특강");
        actions.push({
          kind: isSpecial ? "special" : "kakao",
          text: `카톡 · ${k.title ?? ""} (발송 ${fmt(k.sent_count)} · 클릭 ${fmt(k.click_count)})`,
        });
      }
      for (const x of cohortContent.filter((x) => x.pub_date === date)) {
        const kind: ActionKind = x.category === "특강" ? "special" : x.category === "커뮤니티" ? "community" : "memo";
        actions.push({ kind, text: `${x.category ?? "기록"} · ${x.title ?? ""}` });
      }

      cells.push({
        day: i,
        date,
        net,
        cum: future ? null : cum,
        phase: bandOf(c, date),
        phaseStart: starts.get(date) ?? null,
        clicks: future ? null : clicksByDay.get(date) ?? null,
        actions,
        isToday: date === today,
      });
    }

    columns.push({
      cohortId: id,
      name: c.name,
      day1,
      lastDay,
      pre,
      maxNet,
      ongoing: day1 <= today && today <= end,
      cells,
    });
  }
  return { columns, maxDay: Math.max(0, ...columns.map((c) => c.lastDay)), today };
}
