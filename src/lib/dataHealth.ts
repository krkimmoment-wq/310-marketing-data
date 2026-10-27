// 데이터 점검 — 수집 중단·입력 누락·품질 이상을 매 접속 시 자동 검사해 대시보드 카드로 알린다.
// 웹에 신경 쓸 시간이 없어도 "무엇이 빠졌는지"를 웹이 먼저 짚어주기 위한 기능 (2026-10-21)
import { createClient } from "@/lib/supabase/server";
import { getCohortsChrono, pickCurrentCohort, kstToday } from "@/lib/cohorts";

export type HealthLevel = "red" | "yellow" | "info";
export type HealthItem = { level: HealthLevel; title: string; detail?: string; href?: string };

type Cohort = {
  id: number;
  name: string;
  pre_open: string | null;
  eb1_open: string | null;
  eb1_close: string | null;
  eb2_open: string | null;
  eb2_close: string | null;
  reg_open: string | null;
  reg_close: string | null;
  ended_at: string | null;
  class_start: string | null;
};
type Reg = {
  cohort_id: number;
  name: string;
  reg_date: string | null;
  section: string | null;
  payment: string;
  is_refund: boolean | null;
  is_transfer: boolean | null;
  transfer_to_cohort_id: number | null;
  refund_amount: number | null;
};

const days = (from: string, to: string) => Math.round((Date.parse(to) - Date.parse(from)) / 86400000);
const addDays = (d: string, n: number) => new Date(Date.parse(d) + n * 86400000).toISOString().slice(0, 10);

// 결제일이 기수 일정상 어느 구간인지 (경계 inclusive, 등록관리 구간명과 동일)
function bandOf(c: Cohort, d: string): string {
  if (c.eb1_open && d < c.eb1_open) return "사전등록";
  if (c.eb1_close && d <= c.eb1_close) return "1차EB";
  if (c.eb2_open && d < c.eb2_open) return "대기1";
  if (c.eb2_close && d <= c.eb2_close) return "2차EB";
  if (c.reg_open && d < c.reg_open) return "대기2";
  if (c.reg_close && d <= c.reg_close) return "정규";
  return "추가";
}

export async function getDataHealth(): Promise<{ items: HealthItem[]; cohortName: string; today: string }> {
  const sb = await createClient();
  const today = kstToday();
  const items: HealthItem[] = [];
  const add = (level: HealthLevel, title: string, detail?: string, href?: string) => items.push({ level, title, detail, href });

  const [{ data: cosRaw }, chrono] = await Promise.all([
    sb.from("cohorts").select("id,name,pre_open,eb1_open,eb1_close,eb2_open,eb2_close,reg_open,reg_close,ended_at,class_start"),
    getCohortsChrono(),
  ]);
  const cos = (cosRaw ?? []) as Cohort[];
  const nameOf = new Map(cos.map((c) => [c.id, c.name]));
  const curRow = pickCurrentCohort(chrono, today);
  const cur = cos.find((c) => c.id === curRow?.id);
  const key = (c: Cohort) => c.pre_open ?? c.class_start ?? "";

  const latest = async (table: string, col: string) => {
    const { data } = await sb.from(table).select(col).order(col, { ascending: false }).limit(1);
    const row = (data?.[0] ?? null) as Record<string, unknown> | null;
    return row && row[col] ? String(row[col]).slice(0, 10) : null;
  };

  // ── 1) 자동 수집 신선도
  const [bitly, yt, sns] = await Promise.all([
    latest("bitly_daily", "click_date"),
    latest("yt_analytics_daily", "day"),
    latest("sns_followers", "snapshot_date"),
  ]);
  if (!bitly || days(bitly, today) > 2)
    add("red", `링크 클릭 수집 ${bitly ? days(bitly, today) : "?"}일째 멈춤`, `마지막 수집 ${bitly ?? "없음"} · 자동 동기화 확인 필요`, "/manage?tab=sns");
  if (!yt || days(yt, today) > 5)
    add("red", `유튜브 지표 수집 ${yt ? days(yt, today) : "?"}일째 멈춤`, `마지막 수집 ${yt ?? "없음"} · 유튜브 토큰 만료 가능성`, "/compare?tab=funnel");
  if (!sns || days(sns, today) > 9)
    add("yellow", `SNS 팔로워 주간 입력 ${sns ? days(sns, today) : "?"}일째 없음`, `마지막 입력 ${sns ?? "없음"}`, "/manage?tab=sns");

  // ── 2) 현재 기수 입력 누락 (모집 중 ~ 클래스 시작 후 7일까지만)
  if (cur) {
    const end = cur.class_start ?? cur.ended_at ?? today;
    const active = key(cur) <= today && today <= addDays(end, 7);
    if (active) {
      const checks: { table: string; col: string; label: string; href: string; needEb: boolean; staleCheck: boolean }[] = [
        { table: "content_log", col: "pub_date", label: "콘텐츠 기록", href: "/records?tab=content", needEb: false, staleCheck: true },
        { table: "kakao_message", col: "sent_date", label: "카톡 메시지 성과", href: "/records?tab=kakao", needEb: true, staleCheck: true },
        { table: "ad_spend", col: "period_start", label: "광고비", href: "/records?tab=ad", needEb: false, staleCheck: false },
      ];
      for (const ck of checks) {
        if (ck.needEb && (!cur.eb1_open || today < cur.eb1_open)) continue;
        const { data } = await sb.from(ck.table).select(ck.col).eq("cohort_id", cur.id).order(ck.col, { ascending: false }).limit(1);
        const row = (data?.[0] ?? null) as Record<string, unknown> | null;
        const href = `${ck.href}&cohort=${encodeURIComponent(cur.name)}`;
        if (!row) add("yellow", `${cur.name} ${ck.label} 0건`, "모집 중인데 기록이 없습니다", href);
        else if (ck.staleCheck) {
          const last = String(row[ck.col]).slice(0, 10);
          if (days(last, today) > 14) add("yellow", `${cur.name} ${ck.label} ${days(last, today)}일째 미입력`, `마지막 ${last}`, href);
        }
      }
    }
  }

  // ── 3) 다음 기수 일정 미입력 (사전등록 30일 전부터)
  const upcoming = cos.filter((c) => key(c) > today).sort((a, b) => key(a).localeCompare(key(b)))[0];
  if (upcoming?.pre_open) {
    const dueKeys = ["eb1_open", "eb1_close", "eb2_open", "eb2_close", "reg_open", "reg_close", "class_start"] as const;
    const miss = dueKeys.filter((k) => !upcoming[k]);
    const dleft = days(today, upcoming.pre_open);
    if (miss.length && dleft <= 30)
      add("yellow", `${upcoming.name} 일정 미입력 (사전등록 D-${dleft})`, `${miss.length}개 날짜가 비어 있습니다`, "/manage?tab=cohorts");
  }

  // ── 4) 등록 데이터 품질
  const { data: regsRaw } = await sb
    .from("registrations")
    .select("cohort_id,name,reg_date,section,payment,is_refund,is_transfer,transfer_to_cohort_id,refund_amount")
    .range(0, 9999);
  const regs = (regsRaw ?? []) as Reg[];
  const who = (rows: Reg[]) =>
    rows.slice(0, 6).map((r) => `${nameOf.get(r.cohort_id) ?? "?"} ${r.name}`).join(", ") + (rows.length > 6 ? ` 외 ${rows.length - 6}명` : "");

  const noDest = regs.filter((r) => r.is_transfer && !r.transfer_to_cohort_id);
  if (noDest.length) add("red", `도착 기수 없는 기수이전 ${noDest.length}건 (매출 누락)`, who(noDest), "/manage?tab=registrations");
  const noRefundAmt = regs.filter((r) => r.is_refund && !r.refund_amount);
  if (noRefundAmt.length) add("yellow", `환불액 미입력 ${noRefundAmt.length}건 (전액환불로 계산 중)`, who(noRefundAmt), "/manage?tab=registrations");
  const oldUnpaid = regs.filter((r) => r.payment === "미입금" && r.reg_date && days(r.reg_date, today) > 14);
  if (oldUnpaid.length) add("yellow", `2주 넘은 미입금 ${oldUnpaid.length}건`, who(oldUnpaid), "/manage?tab=registrations");
  const cnt = new Map<string, number>();
  for (const r of regs) cnt.set(`${r.cohort_id}|${r.name}`, (cnt.get(`${r.cohort_id}|${r.name}`) ?? 0) + 1);
  const dups = [...cnt.entries()].filter(([, n]) => n > 1);
  if (dups.length)
    add(
      "yellow",
      `같은 기수 중복 이름 ${dups.length}명`,
      dups.map(([k, n]) => `${nameOf.get(Number(k.split("|")[0])) ?? "?"} ${k.split("|")[1]}(${n}건)`).join(", ") + " · 동명이인이면 정상",
      "/manage?tab=registrations"
    );

  // ── 5) 구간 라벨 vs 결제일 구간 (현재 기수, 확인 권장)
  if (cur && cur.eb1_open && cur.eb1_close && cur.eb2_open && cur.eb2_close && cur.reg_open && cur.reg_close) {
    const mm = regs.filter((r) => r.cohort_id === cur.id && r.reg_date && r.section && bandOf(cur, r.reg_date) !== r.section);
    if (mm.length)
      add("info", `${cur.name} 구간 라벨과 결제일 구간이 다른 등록 ${mm.length}건`, "할인가를 유지한 채 늦게 입금한 경우면 정상", `/manage?tab=registrations&cohort=${encodeURIComponent(cur.name)}`);
  }

  const order: Record<HealthLevel, number> = { red: 0, yellow: 1, info: 2 };
  items.sort((a, b) => order[a.level] - order[b.level]);
  return { items, cohortName: cur?.name ?? "", today };
}
