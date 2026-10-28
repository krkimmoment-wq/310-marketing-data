// 기수 계획판 계산 (순수 함수 — DB·Next 의존 없음, Node로 바로 테스트 가능)
// 규칙 초안 · 칸 구간 색 · 달력 · 광고 ON 띠 · 계획 대비 실행 확인 · 내일 준비 경고 · 광고 예산
import type { CohortFull } from "./dayTableCore";

export type PlanKind = "lecture" | "live" | "kakao" | "ad" | "keycon" | "promo_short" | "support" | "openchat" | "teaser" | "recruit" | "replay" | "etc";
export type PlanStatus = "planned" | "done" | "canceled";
export type AdChannel = "google_ads" | "studio_promotion" | "instagram";

export type PlanItem = {
  id: number;
  cohort_id: number;
  plan_date: string;
  end_date: string | null;
  plan_time: string | null;
  kind: PlanKind;
  title: string | null;
  owner: string | null;
  memo: string | null;
  status: PlanStatus;
  ready: boolean;
  optional: boolean;
  ad_channel: AdChannel | null;
  ad_amount: number | null;
  source: "manual" | "rule";
  rule_key: string | null;
};

export type DraftItem = Pick<PlanItem, "plan_date" | "end_date" | "plan_time" | "kind" | "title" | "optional" | "memo" | "source"> & { rule_key: string };

// 종류별 이름·색 (특강 보라 / 챌린지 라이브 주황 / 카톡 노랑 / 광고 빨강 / 키콘 초록 / 홍보쇼츠 파랑 / 응대 청록 / 오픈채팅 공지 분홍
//   / 특강 예고 연보라 / 특강 모집 남색 / 다시보기 마감 회청)
export const KIND_META: Record<PlanKind, { label: string; bg: string; fg: string; border: string }> = {
  lecture: { label: "특강", bg: "#EDE9FE", fg: "#5B21B6", border: "#8B5CF6" },
  live: { label: "챌린지 라이브", bg: "#FFEDD5", fg: "#9A3412", border: "#F97316" },
  kakao: { label: "카톡", bg: "#FEF9C3", fg: "#713F12", border: "#EAB308" },
  ad: { label: "광고", bg: "#FEE2E2", fg: "#991B1B", border: "#EF4444" },
  keycon: { label: "키콘", bg: "#DCFCE7", fg: "#166534", border: "#22C55E" },
  promo_short: { label: "홍보쇼츠", bg: "#DBEAFE", fg: "#1E40AF", border: "#3B82F6" },
  support: { label: "응대", bg: "#CCFBF1", fg: "#115E59", border: "#14B8A6" },
  openchat: { label: "오픈채팅 공지", bg: "#FCE7F3", fg: "#9D174D", border: "#EC4899" },
  teaser: { label: "특강 예고", bg: "#F5F3FF", fg: "#6D28D9", border: "#A78BFA" },
  recruit: { label: "특강 모집", bg: "#E0E7FF", fg: "#3730A3", border: "#6366F1" },
  replay: { label: "다시보기 마감", bg: "#E2E8F0", fg: "#334155", border: "#64748B" },
  etc: { label: "기타", bg: "#F3F4F6", fg: "#374151", border: "#9CA3AF" },
};
export const AD_CHANNEL_LABEL: Record<AdChannel, string> = { google_ads: "Google Ads", studio_promotion: "스튜디오 프로모션", instagram: "인스타" };
export const STATUS_LABEL: Record<PlanStatus, string> = { planned: "계획", done: "완료", canceled: "취소" };

// 칸 배경 = 구간 색 (사전등록 회색 / 1차EB 연파랑 / 대기 흰색 / 2차EB 파랑 / 정규 노랑 / 추가 보라 / 클래스 첫 주 초록)
export const PLAN_PHASE_BG: Record<string, string> = {
  사전등록: "#F3F4F6",
  "1차EB": "#E0F2FE",
  대기: "#FFFFFF",
  "2차EB": "#BFDBFE",
  정규: "#FEF3C7",
  추가: "#EDE9FE",
  "클래스 첫 주": "#DCFCE7",
};

const DAY_MS = 86400000;
const toMs = (d: string) => Date.parse(d + "T00:00:00Z");
export const addDays = (d: string, n: number) => new Date(toMs(d) + n * DAY_MS).toISOString().slice(0, 10);
export const diffDays = (a: string, b: string) => Math.round((toMs(b) - toMs(a)) / DAY_MS);
const dow = (d: string) => new Date(toMs(d)).getUTCDay(); // 일0 … 토6

// 최종 집계일 = 클래스 시작일 이후 첫 일요일 (dayTableCore.settleDate와 같은 규칙)
export function settleOf(classStart: string): string {
  return addDays(classStart, (7 - dow(classStart)) % 7 || 7);
}

export function dayNumber(c: Pick<CohortFull, "pre_open">, date: string): number | null {
  if (!c.pre_open || date < c.pre_open) return null;
  return diffDays(c.pre_open, date) + 1;
}

// 칸 구간 (모집 기간 밖이면 null). 일정이 아직 비어 있으면 사전등록 이후는 모두 '사전등록'
export function planPhase(c: CohortFull, date: string): string | null {
  if (!c.pre_open || date < c.pre_open) return null;
  if (c.class_start && date >= c.class_start) return date <= settleOf(c.class_start) ? "클래스 첫 주" : null;
  // 경계 날짜가 비어 있으면 그 구간에 머문다 (다음 날짜 입력 전)
  if (!c.eb1_open || date < c.eb1_open) return "사전등록";
  if (!c.eb1_close || date <= c.eb1_close) return "1차EB";
  if (!c.eb2_open || date < c.eb2_open) return "대기";
  if (!c.eb2_close || date <= c.eb2_close) return "2차EB";
  if (!c.reg_open || date < c.reg_open) return "대기";
  if (!c.reg_close || date <= c.reg_close) return "정규";
  return "추가";
}

export function phaseStartLabel(c: CohortFull, date: string): string | null {
  const defs: [string | null, string][] = [
    [c.pre_open, "사전등록 시작"],
    [c.eb1_open, "1차EB 오픈"],
    [c.eb1_close ? addDays(c.eb1_close, 1) : null, "대기 시작"],
    [c.eb2_open, "2차EB 오픈"],
    [c.eb2_close ? addDays(c.eb2_close, 1) : null, "대기 시작"],
    [c.reg_open, "정규 오픈"],
    [c.reg_close ? addDays(c.reg_close, 1) : null, "추가 모집"],
    [c.class_start, "클래스 시작"],
    [c.class_start ? settleOf(c.class_start) : null, "최종 집계"],
  ];
  for (const [d, label] of defs) if (d === date) return label;
  return null;
}

// 일요일 시작 달력 (빈 칸 = null)
export function monthWeeks(year: number, month: number): (string | null)[][] {
  const first = `${year}-${String(month).padStart(2, "0")}-01`;
  const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const cells: (string | null)[] = Array(dow(first)).fill(null);
  for (let i = 0; i < days; i++) cells.push(addDays(first, i));
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

// 보여줄 달 = 사전등록 달 ~ 최종 집계 달 (클래스 시작일이 없으면 사전등록 달부터 3개월)
export function planMonths(c: Pick<CohortFull, "pre_open" | "class_start">, today?: string): [number, number][] {
  const start = c.pre_open ?? today;
  if (!start) return [];
  const end = c.class_start ? settleOf(c.class_start) : null;
  let y = Number(start.slice(0, 4)), m = Number(start.slice(5, 7));
  const count = end ? (Number(end.slice(0, 4)) - y) * 12 + Number(end.slice(5, 7)) - m + 1 : 3;
  const out: [number, number][] = [];
  for (let i = 0; i < Math.max(1, count); i++) {
    out.push([y, m]);
    m++;
    if (m > 12) { m = 1; y++; }
  }
  return out;
}

// 끝나는 날(end_date)을 저장하는 종류 = 기간 띠 (광고 ON · 키콘 상시 · 응대 · 특강 모집)
export const BAND_KINDS: PlanKind[] = ["ad", "keycon", "support", "recruit"];
export const isBandKind = (k: PlanKind) => BAND_KINDS.includes(k);

// 라이브를 옮기면 같이 움직이는 칩 = 라이브 공지(오픈채팅) 3개 + 라이브 후 응대 (규칙 초안의 라이브 칩 기준)
export const LIVE_RULE_KEY = "live:main";
export const isLiveNotice = (x: Pick<PlanItem, "kind" | "rule_key">) => x.kind === "openchat" && !!x.rule_key?.startsWith("openchat:live:");
export const isLiveLinked = (x: Pick<PlanItem, "kind" | "rule_key">) => isLiveNotice(x) || x.rule_key === "support:live";

// 월·수·금 = 대표님 라이브 수업 → 라이브·대표님 출연 촬영은 피함 (화·목·토·일)
export const isMWF = (d: string) => [1, 3, 5].includes(dow(d));
const nextNotMWF = (d: string) => { let x = d; while (isMWF(x)) x = addDays(x, 1); return x; };
// 규칙 칩은 규칙키(:shoot)로, 직접 추가한 칩은 이름의 '촬영'으로 판별 ('촬영 쇼츠 재고 점검' 같은 규칙 칩은 제외)
export const needsNoMWF = (x: Pick<PlanItem, "kind" | "rule_key" | "title">) =>
  x.kind === "live" || (x.rule_key ? x.rule_key.endsWith(":shoot") : !!x.title?.includes("촬영"));
export function mwfWarning(x: Pick<PlanItem, "kind" | "rule_key" | "title">, date: string): string | null {
  if (!needsNoMWF(x) || !isMWF(date)) return null;
  return `⚠️ ${Number(date.slice(5, 7))}/${Number(date.slice(8, 10))}(${"일월화수목금토"[dow(date)]})은 월·수·금(대표님 라이브 수업)입니다 — 라이브·촬영은 화·목·토·일 권장`;
}

// 광고 ON 날짜 (취소 제외, 켜는 날 ~ 끄는 날)
export function adOnDates(items: Pick<PlanItem, "kind" | "plan_date" | "end_date" | "status">[]): Set<string> {
  const out = new Set<string>();
  for (const it of items) {
    if (it.kind !== "ad" || it.status === "canceled") continue;
    const end = it.end_date && it.end_date >= it.plan_date ? it.end_date : it.plan_date;
    for (let d = it.plan_date; d <= end; d = addDays(d, 1)) out.add(d);
  }
  return out;
}

// ── 어느 기수 계획판을 보여줄지: 왼쪽 기수 선택(이름) → 없거나 모르는 이름이면 가장 최근 등록 기수
// (가장 최근 = nav.latestCohortName과 같은 규칙: 날짜 없는 새 기수가 가장 최근, 나머지는 사전등록 오픈일 늦은 순, 같으면 id 큰 쪽)
export function resolvePlanCohort<T extends { id: number; name: string; pre_open: string | null; class_start?: string | null }>(
  list: T[],
  name?: string
): T | undefined {
  const picked = name ? list.find((c) => c.name === name) : undefined;
  if (picked) return picked;
  const key = (c: T) => c.pre_open ?? c.class_start ?? "";
  return list.slice().sort((a, b) => {
    const ka = key(a), kb = key(b);
    if ((ka === "") !== (kb === "")) return ka === "" ? -1 : 1;
    return kb.localeCompare(ka) || b.id - a.id;
  })[0];
}

// 지난 기수 = 클래스가 이미 시작한 기수 (초안 버튼에 확인 창)
export function isPastCohort(c: Pick<CohortFull, "class_start">, today: string): boolean {
  return !!c.class_start && c.class_start <= today;
}

// 실제 기록 → 실선 칩 (카톡·광고 시작·특강·라이브·콘텐츠 기록). 계획 칩(점선)과 함께 표시
export type ActualChip = { date: string; kind: PlanKind; label: string; title: string | null };
export function actualChips(rec: {
  kakao: { date: string; title: string | null }[];
  ads: { date: string; platform: string; campaign: string | null }[];
  content: { date: string; category: string | null; title: string | null }[];
}): ActualChip[] {
  const out: ActualChip[] = [
    ...rec.kakao.map((k) => ({ date: k.date, kind: "kakao" as PlanKind, label: "카톡", title: k.title })),
    ...rec.ads.map((a) => ({ date: a.date, kind: "ad" as PlanKind, label: `광고 시작 · ${a.platform === "instagram" ? "인스타" : "유튜브"}`, title: a.campaign })),
    ...rec.content.map((c) =>
      c.category === "특강" ? { date: c.date, kind: "lecture" as PlanKind, label: "특강", title: c.title }
      : c.category === "라이브" ? { date: c.date, kind: "live" as PlanKind, label: "라이브", title: c.title }
      : { date: c.date, kind: "etc" as PlanKind, label: `기록 · ${c.category ?? "콘텐츠"}`, title: c.title }
    ),
  ];
  return out.sort((a, b) => a.date.localeCompare(b.date)); // 같은 날은 넣은 순서 유지
}

// ── 규칙으로 초안 만들기
const NEED: [keyof CohortFull, string][] = [
  ["pre_open", "사전등록 오픈"], ["eb1_open", "1차EB 오픈"], ["eb1_close", "1차EB 마감"], ["eb2_open", "2차EB 오픈"],
  ["eb2_close", "2차EB 마감"], ["reg_open", "정규 오픈"], ["reg_close", "정규 마감"], ["class_start", "클래스 시작"],
];

// 날짜별 주의 메모 (할인 전날 알림에 붙임)
const DAY_NOTES: Record<string, string> = { "2026-11-19": "수능 날 — 짧게" };

// 공백(prev~next, 양끝 제외) 안에서 가운데에 가장 가까운 일요일 (게시 원칙: 일요일 저녁~월요일 아침). 없으면 가운데 날
function sundayNear(prev: string, next: string): string {
  const span = diffDays(prev, next);
  const mid = addDays(prev, Math.floor(span / 2));
  let best: string | null = null;
  for (let i = 1; i < span; i++) {
    const d = addDays(prev, i);
    if (dow(d) !== 0) continue;
    if (best === null || Math.abs(diffDays(mid, d)) < Math.abs(diffDays(mid, best))) best = d;
  }
  return best ?? mid;
}

export function generateDraft(c: CohortFull): { ok: true; items: DraftItem[] } | { ok: false; missing: string[] } {
  const missing = NEED.filter(([k]) => !c[k]).map(([, label]) => label);
  if (missing.length) return { ok: false, missing };
  const C = c as CohortFull & Record<(typeof NEED)[number][0], string>;
  const settle = settleOf(C.class_start);
  const items: DraftItem[] = [];
  const add = (rule_key: string, plan_date: string, kind: PlanKind, title: string, o: Partial<DraftItem> = {}) =>
    items.push({ rule_key, plan_date, end_date: null, plan_time: null, kind, title, optional: false, memo: null, source: "rule", ...o });

  const sales: [string, string, string, string][] = [
    ["eb1", "1차EB", C.eb1_open, C.eb1_close],
    ["eb2", "2차EB", C.eb2_open, C.eb2_close],
    ["reg", "정규", C.reg_open, C.reg_close],
  ];
  // 10/27 저녁 최종안: 할인 구간(1차EB·2차EB)마다 녹화 특강 1회 — 예고 → 모집(금~일) → 월요일 공개 → 응대, 할인 전날 알림
  // 정규 전 특강 없음. 모든 구간: 홍보쇼츠 촬영/발행 · 광고 · 소재 승인/재고 점검 · 카톡 오픈/중간/마감
  for (const [k, label, open, close] of sales) {
    if (k !== "reg") {
      const lec = addDays(open, -(dow(open) === 1 ? 7 : (dow(open) + 6) % 7)); // 할인 시작일 직전 월요일
      add(`lecture:${k}`, lec, "lecture", `${label} 특강 (녹화 공개)`, { plan_time: "20:00", memo: "링크는 오픈채팅에서만 공개" });
      add(`lecture:${k}:shoot`, nextNotMWF(addDays(lec, -7)), "lecture", `${label} 특강 녹화 촬영`); // 공개 7일 전, 월·수·금이면 다음 날
      const rs = addDays(lec, -3); // 모집 = 직전 금~일
      add(`recruit:${k}`, rs, "recruit", `${label} 특강 모집`, { end_date: addDays(lec, -1), memo: "일요일 자정 마감" });
      add(`teaser:${k}`, addDays(rs, -7), "teaser", `${label} 특강 예고`, { memo: "더보기 첫 줄·고정 댓글 교체" });
      add(`openchat:lecture:${k}:sat`, addDays(lec, -2), "openchat", `${label} 특강 모집 공지 (토)`);
      add(`openchat:lecture:${k}:sun`, addDays(lec, -1), "openchat", `${label} 특강 모집 마감일 공지 (일)`);
      add(`openchat:lecture:${k}:day`, lec, "openchat", `${label} 특강 공개 안내`);
      add(`kakao:${k}:notice`, rs, "kakao", "특강 안내", { memo: "친구 전체 발송 (카톡 발송 여부 결정 대기) → 오픈채팅 입장 유도" });
      add(`support:${k}`, addDays(lec, 1), "support", `${label} 특강 후 응대`, { end_date: addDays(lec, 3) }); // 공개 다음 날부터 3일
      const eve = addDays(open, -1);
      const eveMemo = DAY_NOTES[eve] ?? null;
      add(`kakao:${k}:eve`, eve, "kakao", `${label} 할인 전날 알림`, { memo: eveMemo });
      add(`openchat:${k}:eve`, eve, "openchat", `${label} 할인 전날 알림 (오픈채팅 공지)`, { memo: eveMemo });
    }
    // 홍보쇼츠: 촬영 = 발행 2일 전(월·수·금이면 3일 전) · 발행·광고 ON = 할인 전날 · 광고 OFF = 그 구간 마감 (정규는 아래 3칩으로 첫 주까지)
    const pub = addDays(open, -1);
    const shoot = isMWF(addDays(pub, -2)) ? addDays(pub, -3) : addDays(pub, -2);
    add(`promo_short:${k}:shoot`, shoot, "promo_short", `${label} 홍보쇼츠 촬영`);
    add(`promo_short:${k}`, pub, "promo_short", `${label} 홍보쇼츠 발행`);
    add(`ad:${k}`, pub, "ad", `${label} 홍보쇼츠 광고`, { end_date: close, memo: k === "reg" ? "정규 3일 집중, 이후 소액" : null });
    if (k === "reg") {
      // 정규 광고 3칩: 정규(전날~마감) / 추가(마감 다음 날~클래스 전날) / 클래스 첫 주(클래스 시작~첫 일요일)
      const extraFrom = addDays(close, 1), extraTo = addDays(C.class_start, -1);
      if (extraFrom <= extraTo) {
        add("ad:extra", extraFrom, "ad", "추가 모집 광고", { end_date: extraTo });
        add("kakao:extra:notice", extraFrom, "kakao", "추가 모집 안내");
      }
      add("ad:class", C.class_start, "ad", "클래스 첫 주 광고", { end_date: settle, memo: "결제 되는지 확인 후 유지" });
    }
    add(`etc:approve:${k}`, addDays(open, -7), "etc", "광고 소재 승인 확인"); // 할인 오픈 7일 전
    add(`etc:stock:${k}`, addDays(open, -7), "etc", "촬영 쇼츠 4개 재고 점검");
    add(`kakao:${k}:open`, open, "kakao", `${label} 오픈`);
    const mid = addDays(open, Math.floor(diffDays(open, close) / 2));
    if (open < mid && mid < close) add(`kakao:${k}:mid`, mid, "kakao", `${label} 중간`, { optional: true });
    add(`kakao:${k}:close`, close, "kakao", `${label} 마감`);
  }
  // 챌린지 라이브: 기수당 1회 (오픈채팅). 기본 = 정규 시작일, 월·수·금이면 다음 화·목·토·일. 칩을 끌면 공지 3개·응대도 같이 이동
  const live = nextNotMWF(C.reg_open);
  add(LIVE_RULE_KEY, live, "live", "챌린지 라이브 (오픈채팅)", { plan_time: "20:00" });
  add("openchat:live:d3", addDays(live, -3), "openchat", "라이브 공지 D-3 (오픈채팅)");
  add("openchat:live:d1", addDays(live, -1), "openchat", "라이브 공지 D-1 (오픈채팅)");
  add("openchat:live:day", live, "openchat", "라이브 공지 당일 (오픈채팅)");
  add("support:live", addDays(live, 1), "support", "라이브 후 응대", { end_date: addDays(live, 3) });
  // 키콘: 사전등록 첫날 ~ 최종 집계일 상시 띠 (키콘 ②는 시작일이 정해지면 직접 추가)
  add("keycon:1", C.pre_open, "keycon", "키콘 ① 40대 지방만 −14kg", { end_date: settle });
  // 특강 다시보기: 후기 작성자만 최종 집계일까지
  add("replay:close", settle, "replay", "특강 다시보기 마감", { memo: "후기 작성자만, 특강 2회분" });
  // 공백 채움 카톡: 사전등록(오픈일~첫 카톡)·대기 기간에 카톡 사이가 7일 넘게 비면 1통 (일요일 저녁)
  // 공백 채움은 사전등록·대기 기간만 → 추가 모집 안내는 계산에서 뺌
  const ks = items.filter((x) => x.kind === "kakao" && x.rule_key !== "kakao:extra:notice").map((x) => x.plan_date).sort();
  const gaps: [string, string, string][] = [
    ["pre", C.pre_open, "사전등록 공지 (공백 채움)"],
    ["wait1", addDays(C.eb1_close, 1), "대기 공지 (공백 채움)"],
    ["wait2", addDays(C.eb2_close, 1), "대기 공지 (공백 채움)"],
  ];
  for (const [g, start, title] of gaps) {
    const before = ks.filter((d) => d < start);
    const prev = g === "pre" ? C.pre_open : before[before.length - 1];
    const next = ks.find((d) => d >= start);
    if (!prev || !next) continue;
    if (diffDays(prev, next) > 7) add(`kakao:${g}:gap`, sundayNear(prev, next), "kakao", title, { plan_time: "20:00" });
  }
  return { ok: true, items: items.sort((a, b) => a.plan_date.localeCompare(b.plan_date) || a.rule_key.localeCompare(b.rule_key)) };
}

// 이미 있는 규칙 항목은 건너뜀 (덮어쓰지 않음)
export function draftDiff(existing: { rule_key: string | null }[], draft: DraftItem[]) {
  const have = new Set(existing.map((x) => x.rule_key).filter((k): k is string => !!k));
  return { add: draft.filter((d) => !have.has(d.rule_key)), skip: draft.filter((d) => have.has(d.rule_key)) };
}

// ── 계획 대비 실행 확인
export type ExecStatus = "예정" | "완료" | "완료(직접)" | "유예" | "누락" | "사람 확인" | "끄기 확인" | "취소";
export type AdRecord = { date: string; platform: string; ad_type?: string | null; period_end?: string | null };
export type ExecRecords = {
  kakao: string[]; // 그 기수 카톡 발송일
  ads: AdRecord[]; // 그 기수 광고비 시작일·매체·종류·종료일 (종류·종료일은 2026-10-26 칸 추가, 옛 기록은 빈칸)
  content: { date: string; category: string | null }[]; // 그 기수 콘텐츠 기록
  videos: { date: string; kind: string | null }[]; // 유튜브 영상 발행일·종류 (숏폼/롱폼)
};
export const GRACE_DAYS = 2;

// 계획 광고와 맞는 장부 기록: 시작일 ±1일 + (장부에 종류가 있으면 종류까지, 없으면 매체로) 같아야 함
export function matchAd(it: Pick<PlanItem, "plan_date" | "ad_channel">, ads: AdRecord[]): AdRecord | undefined {
  const want = it.ad_channel === "instagram" ? "instagram" : it.ad_channel ? "youtube" : null;
  return ads.find(
    (a) =>
      Math.abs(diffDays(it.plan_date, a.date)) <= 1 &&
      (a.ad_type && it.ad_channel ? a.ad_type === it.ad_channel : !want || a.platform === want)
  );
}

// 실제 집행 기간 표시 (계획판 실행 확인 표)
export function adActualPeriod(it: Pick<PlanItem, "plan_date" | "ad_channel">, rec: Pick<ExecRecords, "ads">): string | null {
  const a = matchAd(it, rec.ads);
  if (!a) return null;
  const md = (x: string) => `${Number(x.slice(5, 7))}/${Number(x.slice(8, 10))}`;
  if (a.period_end) return `실제 ${md(a.date)}~${md(a.period_end)}`;
  return a.ad_type ? `실제 ${md(a.date)}~ (진행 중)` : `실제 ${md(a.date)}~ (종료일 확인 필요)`;
}

// 광고 장부 '종류' 선택지 (매체에 맞춰): 유튜브 → Google Ads·스튜디오 프로모션, 인스타 → 인스타
export function adTypeOptions(platform: string): AdChannel[] {
  return platform === "instagram" ? ["instagram"] : ["google_ads", "studio_promotion"];
}

// 광고 장부 목록 표시: 옛 기록(종류 빈칸) = 확인 필요, 새 기록 종료일 빈칸 = 진행 중
export function adLedgerDisplay(adType: string | null, periodEnd: string | null): { type: string; end: string } {
  const type = adType ? AD_CHANNEL_LABEL[adType as AdChannel] ?? adType : "확인 필요";
  const end = periodEnd ?? (adType ? "진행 중" : "확인 필요");
  return { type, end };
}

export function checkExecution(
  it: Pick<PlanItem, "kind" | "plan_date" | "status" | "ad_channel"> & { end_date?: string | null; rule_key?: string | null },
  rec: ExecRecords,
  today: string
): ExecStatus {
  if (it.status === "canceled") return "취소";
  if (it.plan_date > today) return "예정";
  const d = it.plan_date;
  let matched = false;
  let human = false;
  if (it.kind === "kakao") matched = rec.kakao.includes(d);
  else if (it.kind === "ad") {
    const a = matchAd(it, rec.ads);
    matched = !!a;
    // 계획한 끄는 날이 지났는데 장부(새 기록)의 종료일이 비어 있으면 = 아직 켜져 있을 수 있음
    if (a && a.ad_type && !a.period_end && it.end_date && it.end_date < today) return "끄기 확인";
  } else if (it.kind === "lecture" && it.rule_key?.endsWith(":shoot")) human = true; // 특강 녹화 촬영 = 사람 확인
  else if (it.kind === "lecture") matched = rec.content.some((x) => x.date === d && x.category === "특강");
  else if (it.kind === "live") matched = rec.content.some((x) => x.date === d && x.category === "라이브");
  else if (it.kind === "promo_short") human = rec.videos.some((v) => v.date === d && v.kind === "숏폼");
  else if (it.kind === "keycon") human = rec.videos.some((v) => v.date === d && v.kind === "롱폼");
  else if (["support", "openchat", "teaser", "recruit", "replay"].includes(it.kind)) human = true; // 기록할 곳이 없음 = 사람 확인
  else human = true; // 기타 = 사람 확인
  if (matched) return "완료";
  if (it.status === "done") return "완료(직접)";
  if (human) return "사람 확인";
  return today <= addDays(d, GRACE_DAYS) ? "유예" : "누락";
}

// 판단판 경고: 내일 예정(계획 상태) N건 중 준비 완료 체크 안 된 M건
export function tomorrowWarning<T extends Pick<PlanItem, "plan_date" | "status" | "ready">>(items: T[], today: string) {
  const tomorrow = addDays(today, 1);
  const list = items.filter((x) => x.plan_date === tomorrow && x.status === "planned");
  return { tomorrow, total: list.length, notReady: list.filter((x) => !x.ready) };
}

// ── 광고 예산
export function budgetSplit(total: number, s: { eb1: number; eb2: number; regular: number }) {
  const eb1 = Math.round((total * s.eb1) / 100), eb2 = Math.round((total * s.eb2) / 100), regular = Math.round((total * s.regular) / 100);
  return { eb1, eb2, regular, sum: eb1 + eb2 + regular };
}

// 지난 기수 같은 구간 광고비(시작일 기준)·등록 수(결제일 기준). 광고 구간 = 오픈 3일 전 ~ 마감(정규는 최종 집계일)
export type PastBucket = { key: "eb1" | "eb2" | "regular" | "other"; label: string; youtube: number; instagram: number; count: number; regs: number | null };
export function pastBuckets(
  c: CohortFull,
  ads: { period_start: string | null; platform: string; cost: number | null }[],
  regs: { date: string; net: number }[]
): PastBucket[] {
  const settle = c.class_start ? settleOf(c.class_start) : null;
  const win: [PastBucket["key"], string, string | null, string | null, string | null, string | null][] = [
    ["eb1", "1차EB", c.eb1_open ? addDays(c.eb1_open, -3) : null, c.eb1_close, c.eb1_open, c.eb1_close],
    ["eb2", "2차EB", c.eb2_open ? addDays(c.eb2_open, -3) : null, c.eb2_close, c.eb2_open, c.eb2_close],
    ["regular", "정규~첫 주", c.reg_open ? addDays(c.reg_open, -3) : null, settle, c.reg_open, settle],
  ];
  const out: PastBucket[] = [
    ...win.map(([key, label]) => ({ key, label, youtube: 0, instagram: 0, count: 0, regs: 0 as number | null })),
    { key: "other", label: "그 외 (사전등록·대기 중 시작)", youtube: 0, instagram: 0, count: 0, regs: null },
  ];
  for (const a of ads) {
    if (!a.period_start) continue;
    const i = win.findIndex(([, , from, to]) => !!from && !!to && a.period_start! >= from && a.period_start! <= to);
    const b = out[i >= 0 ? i : 3];
    if (a.platform === "instagram") b.instagram += a.cost ?? 0;
    else b.youtube += a.cost ?? 0;
    b.count++;
  }
  win.forEach(([, , , , from, to], i) => {
    out[i].regs = from && to ? regs.filter((r) => r.date >= from && r.date <= to).reduce((s, r) => s + r.net, 0) : null;
  });
  return out;
}
