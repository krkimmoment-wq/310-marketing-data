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
  dn: number | null; // 클래스 시작까지 남은 일수 (class_start 없으면 null)
  actions: DayAction[];
  isToday: boolean;
};

export type DayColumn = {
  cohortId: number;
  name: string;
  day1: string;
  classStart: string | null;
  lastDay: number;
  pre: number; // Day 1 이전 결제 + 다른 기수에서 이전해 온 인원 (누적이 대시보드 실등록과 같아지도록)
  maxNet: number;
  ongoing: boolean;
  cells: DayCell[]; // index 0 = Day 1
};

export type DayTableData = { columns: DayColumn[]; maxDay: number; today: string };

export type DayRaw = {
  cohorts: CohortFull[];
  daily: Record<number, { date: string; new_count: number; refund_count: number }[]>;
  arrivals?: Record<number, number>; // 기수별 '도착' 기수이전 인원 (입금완료·미환불) — Day 1 이전에 합산
  ads: { day: string; views: number | null }[]; // 유튜브 트래픽 ADVERTISING 일별 조회
  videos: { video_id: string; pub_date: string; kind: string | null; title: string | null; views: number | null }[];
  videoDaily?: { video_id: string; day: string; views: number | null }[]; // 영상별 일별 조회 (발행 후 14일)
  ig?: { post_date: string; media_type: string | null; caption: string | null; permalink: string | null; like_count: number | null; comments_count: number | null }[];
  bitly: { click_date: string; clicks: number | null }[];
  kakao: { cohort_id: number; sent_date: string | null; title: string | null; sent_count: number | null; click_count: number | null }[];
  content: { cohort_id: number; pub_date: string | null; category: string | null; title: string | null }[];
};

const DAY_MS = 86400000;
const toMs = (d: string) => Date.parse(d + "T00:00:00Z");
const addDays = (d: string, n: number) => new Date(toMs(d) + n * DAY_MS).toISOString().slice(0, 10);
const diffDays = (a: string, b: string) => Math.round((toMs(b) - toMs(a)) / DAY_MS);
const fmt = (n: number | null | undefined) => (n ?? 0).toLocaleString("ko-KR");

// 광고 칩 기준 = 판단판 경고와 같은 "유튜브 광고 조회 1,000회 이상"
export const AD_DAY_MIN_VIEWS = 1000;

// 최종 집계일 = 클래스 시작일 '이후' 첫 일요일 (10/8 미팅 "클리어스텝 1주차 일요일까지"). 시작일이 일요일이면 다음 일요일
export function settleDate(classStart: string): string {
  const dow = new Date(toMs(classStart)).getUTCDay(); // 일0 … 토6
  return addDays(classStart, (7 - dow) % 7 || 7);
}

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

// 영상별 "발행 후 첫 7일 조회" (발행일 포함 7일). 7일째 데이터가 아직 없으면 complete=false
export function firstWeekViews(raw: DayRaw): Map<string, { views: number; complete: boolean }> {
  const pub = new Map(raw.videos.map((v) => [v.video_id, v.pub_date]));
  const out = new Map<string, { views: number; complete: boolean }>();
  for (const r of raw.videoDaily ?? []) {
    const p = pub.get(r.video_id);
    if (!p) continue;
    const k = diffDays(p, r.day);
    if (k < 0 || k > 6) continue;
    const cur = out.get(r.video_id) ?? { views: 0, complete: false };
    cur.views += r.views ?? 0;
    if (k === 6) cur.complete = true;
    out.set(r.video_id, cur);
  }
  return out;
}

export function buildDayTable(raw: DayRaw, cohortIds: number[], today: string): DayTableData {
  const adsByDay = new Map<string, number>();
  for (const a of raw.ads) if ((a.views ?? 0) > 0) adsByDay.set(a.day, (adsByDay.get(a.day) ?? 0) + (a.views ?? 0));
  const isSpecialText = (s: string | null | undefined) => (s ?? "").includes("특강");
  const vidsByDay = new Map<string, DayRaw["videos"]>();
  for (const v of raw.videos) vidsByDay.set(v.pub_date, [...(vidsByDay.get(v.pub_date) ?? []), v]);
  const week1 = firstWeekViews(raw);
  const igByDay = new Map<string, NonNullable<DayRaw["ig"]>>();
  for (const m of raw.ig ?? [])
    if (m.media_type === "IMAGE" || m.media_type === "CAROUSEL_ALBUM") igByDay.set(m.post_date, [...(igByDay.get(m.post_date) ?? []), m]);
  const clicksByDay = new Map<string, number>();
  for (const b of raw.bitly) clicksByDay.set(b.click_date, b.clicks ?? 0);

  const columns: DayColumn[] = [];
  for (const id of cohortIds) {
    const c = raw.cohorts.find((x) => x.id === id);
    if (!c || !c.pre_open) continue;
    const day1 = c.pre_open;
    // 표 끝 = 최종 집계일(클래스 시작 후 첫 일요일). 클래스 시작일이 없으면 모집 종료일·오늘
    const end = c.class_start ? settleDate(c.class_start) : c.ended_at ?? (today >= day1 ? today : day1);
    const lastDay = Math.max(1, diffDays(day1, end) + 1);

    // 날짜별 순등록
    const netByDate = new Map<string, number>();
    for (const r of raw.daily[id] ?? []) netByDate.set(r.date, (netByDate.get(r.date) ?? 0) + (r.new_count ?? 0) - (r.refund_count ?? 0));
    let pre = raw.arrivals?.[id] ?? 0;
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
      [c.class_start, "클래스 후"],
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
      if (adv && adv >= AD_DAY_MIN_VIEWS) actions.push({ kind: "pool", text: `유튜브 유료 노출(프로모션·광고) 조회 ${fmt(adv)}` });
      for (const v of vidsByDay.get(date) ?? []) {
        const w = week1.get(v.video_id);
        const viewTxt = w ? `첫 7일 조회 ${fmt(w.views)}${w.complete ? "" : " (집계 중)"}` : `현재 조회 ${fmt(v.views)}`;
        actions.push({ kind: v.kind === "롱폼" ? "long" : "short", text: `${v.kind ?? "영상"} · ${v.title ?? ""} (${viewTxt})` });
      }
      for (const k of cohortKakao.filter((k) => k.sent_date === date)) {
        const isSpecial = (k.title ?? "").includes("특강");
        actions.push({
          kind: isSpecial ? "special" : "kakao",
          text: `카톡 · ${k.title ?? ""} (발송 ${fmt(k.sent_count)} · 클릭 ${fmt(k.click_count)})`,
        });
      }
      for (const m of igByDay.get(date) ?? []) {
        const text = `인스타 커뮤니티 · ${m.caption ? m.caption.slice(0, 40) : "게시물"} (좋아요 ${fmt(m.like_count)} · 댓글 ${fmt(m.comments_count)})`;
        actions.push({ kind: "community", text });
        // 캡션에 "특강"이 있으면 특강 칩으로도 표시 (커뮤 칩은 그대로)
        if (isSpecialText(m.caption)) actions.push({ kind: "special", text: `특강 · ${text}` });
      }
      for (const x of cohortContent.filter((x) => x.pub_date === date)) {
        const kind: ActionKind =
          x.category === "특강" ? "special"
          : x.category === "커뮤니티" ? "community"
          : x.category === "프로모션" ? "pool"
          : x.category === "숏폼" ? "short"
          : x.category === "롱폼" ? "long"
          : "memo";
        actions.push({ kind, text: `${x.category ?? "기록"} · ${x.title ?? ""}` });
      }

      cells.push({
        day: i,
        date,
        net,
        cum: future ? null : cum,
        phase: c.class_start && date >= c.class_start ? "클래스 후" : bandOf(c, date),
        phaseStart: starts.get(date) ?? null,
        clicks: future ? null : clicksByDay.get(date) ?? null,
        dn: c.class_start ? diffDays(date, c.class_start) : null,
        actions,
        isToday: date === today,
      });
    }

    columns.push({
      cohortId: id,
      name: c.name,
      day1,
      classStart: c.class_start,
      lastDay,
      pre,
      maxNet,
      ongoing: day1 <= today && today <= end,
      cells,
    });
  }
  return { columns, maxDay: Math.max(0, ...columns.map((c) => c.lastDay)), today };
}

// 발행 후 첫 7일 조회 순위 — 표에 선택된 기수의 모집 기간에 발행된 영상만 (Day = 그 기수 기준)
export type VideoRank = {
  video_id: string;
  title: string;
  kind: string;
  pub_date: string;
  cohort: string;
  day: number;
  first7: number;
  complete: boolean;
};

export function rankVideos(raw: DayRaw, table: DayTableData): VideoRank[] {
  const w1 = firstWeekViews(raw);
  const out: VideoRank[] = [];
  for (const v of raw.videos) {
    const w = w1.get(v.video_id);
    if (!w) continue;
    const col = table.columns.find((c) => v.pub_date >= c.day1 && diffDays(c.day1, v.pub_date) + 1 <= c.lastDay);
    if (!col) continue;
    out.push({
      video_id: v.video_id,
      title: v.title ?? "",
      kind: v.kind ?? "영상",
      pub_date: v.pub_date,
      cohort: col.name,
      day: diffDays(col.day1, v.pub_date) + 1,
      first7: w.views,
      complete: w.complete,
    });
  }
  return out.sort((a, b) => b.first7 - a.first7);
}
