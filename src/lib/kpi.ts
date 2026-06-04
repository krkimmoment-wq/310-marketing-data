// 대시보드 KPI 계산 + 자동 인사이트 + 예측
import { createClient } from "@/lib/supabase/server";

export type Insight = { tone: "good" | "warn" | "info"; text: string };

export type Kpi = {
  cohortName: string;
  goal: number;
  realRegs: number;
  progressPct: number;
  totalAd: number;
  totalRevenue: number;
  roas: number;
  cac: number;
  bySection: Record<string, number>;
  preOpen: string | null;
  eb1Open: string | null;
  endedAt: string | null;
  // 페이스/예측
  daysElapsed: number;
  daysLeft: number;
  currentPace: number;
  requiredPace: number;
  projectedFinal: number;
  ddayLabel: string;
  insights: Insight[];
};

const KST_TODAY = () => {
  // 서버 UTC → KST 근사 (날짜만)
  const now = new Date();
  return new Date(now.getTime() + 9 * 3600 * 1000);
};

const diffDays = (a: Date, b: Date) =>
  Math.round((a.getTime() - b.getTime()) / 86400000);

export async function getKpi(cohortName = "14기"): Promise<Kpi | null> {
  const sb = await createClient();
  const { data: cohort } = await sb.from("cohorts").select("*").eq("name", cohortName).single();
  if (!cohort) return null;

  const [{ data: regs }, { data: ads }, { data: revs }] = await Promise.all([
    sb.from("registrations").select("section, payment, is_refund").eq("cohort_id", cohort.id),
    sb.from("ad_spend").select("cost").eq("cohort_id", cohort.id),
    sb.from("revenue").select("total_paid").eq("cohort_id", cohort.id),
  ]);

  const real = (regs ?? []).filter((r) => r.payment === "입금완료" && !r.is_refund);
  const bySection: Record<string, number> = {};
  for (const r of real) bySection[r.section] = (bySection[r.section] ?? 0) + 1;

  const totalAd = (ads ?? []).reduce((s, a) => s + (a.cost ?? 0), 0);
  const totalRevenue = (revs ?? []).reduce((s, r) => s + (r.total_paid ?? 0), 0);
  const realRegs = real.length;
  const roas = totalAd ? Math.round((totalRevenue / totalAd) * 10) / 10 : 0;
  const cac = realRegs ? Math.round(totalAd / realRegs) : 0;
  const progressPct = cohort.goal ? Math.round((realRegs / cohort.goal) * 1000) / 10 : 0;

  // 페이스 계산
  const today = KST_TODAY();
  const start = cohort.pre_open ? new Date(cohort.pre_open + "T00:00:00Z") : today;
  const end = cohort.ended_at ? new Date(cohort.ended_at + "T00:00:00Z") : today;
  const daysElapsed = Math.max(diffDays(today, start), 1);
  const daysLeft = Math.max(diffDays(end, today), 0);
  const currentPace = Math.round((realRegs / daysElapsed) * 100) / 100;
  const remaining = Math.max(cohort.goal - realRegs, 0);
  const requiredPace = daysLeft ? Math.round((remaining / daysLeft) * 100) / 100 : 0;
  const projectedFinal = Math.round(realRegs + currentPace * daysLeft);

  // 다음 분기점
  const milestones: [string, string][] = [
    [cohort.eb1_open, "1차 EB OPEN"],
    [cohort.eb1_close, "1차 EB 마감"],
    [cohort.eb2_open, "2차 EB OPEN"],
    [cohort.eb2_close, "2차 EB 마감"],
    [cohort.reg_open, "정규 OPEN"],
    [cohort.reg_close, "정규 마감"],
    [cohort.extra_close, "추가 마감"],
  ].filter(([d]) => d) as [string, string][];
  let ddayLabel = "캠페인 진행 중";
  for (const [d, label] of milestones) {
    const md = new Date(d + "T00:00:00Z");
    const dd = diffDays(md, today);
    if (dd >= 0) {
      ddayLabel = dd === 0 ? `오늘 ${label}` : `D-${dd} · ${label}`;
      break;
    }
  }

  // 자동 인사이트 브리핑 (규칙 기반)
  const insights: Insight[] = [];
  insights.push({
    tone: roas >= 30 ? "good" : "info",
    text: `현재 ROAS ${roas}배 — 광고비 ₩1로 매출 ₩${roas}를 회수 중입니다.`,
  });
  if (currentPace >= requiredPace && requiredPace > 0) {
    insights.push({ tone: "good", text: `현재 페이스 ${currentPace}명/일로 목표 달성 궤도에 있습니다.` });
  } else if (requiredPace > 0) {
    const gap = Math.round((1 - currentPace / requiredPace) * 100);
    insights.push({
      tone: "warn",
      text: `목표까지 일평균 ${requiredPace}명 필요하나 현재 ${currentPace}명 — ${gap}% 부족. 페이스 가속이 필요합니다.`,
    });
  }
  insights.push({
    tone: projectedFinal >= cohort.goal ? "good" : "warn",
    text: `현재 페이스 유지 시 최종 예상 ${projectedFinal}명 (목표 ${cohort.goal}명).`,
  });

  return {
    cohortName: cohort.name, goal: cohort.goal, realRegs, progressPct,
    totalAd, totalRevenue, roas, cac, bySection,
    preOpen: cohort.pre_open, eb1Open: cohort.eb1_open, endedAt: cohort.ended_at,
    daysElapsed, daysLeft, currentPace, requiredPace, projectedFinal, ddayLabel, insights,
  };
}
