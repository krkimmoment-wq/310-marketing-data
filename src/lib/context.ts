// AI 어시스턴트용 상세 데이터 컨텍스트 (A: 컨텍스트 확장 + DB 검색)
// KPI 요약 + 등록자 명단 + 콘텐츠 + 광고 + 매출 + 비틀리 전체를 AI에게 제공
import { createClient } from "@/lib/supabase/server";
import { getKpi } from "@/lib/kpi";

export async function buildFullContext(cohortName = "14기"): Promise<string> {
  const sb = await createClient();
  const { data: cohort } = await sb
    .from("cohorts")
    .select("id")
    .eq("name", cohortName)
    .single();
  if (!cohort) return "데이터를 불러올 수 없습니다.";

  const kpi = await getKpi(cohortName);

  const [{ data: regs }, { data: ads }, { data: revs }, { data: contents }, { data: bitly }] =
    await Promise.all([
      sb.from("registrations").select("*").eq("cohort_id", cohort.id).order("reg_date"),
      sb.from("ad_spend").select("*").eq("cohort_id", cohort.id),
      sb.from("revenue").select("*").eq("cohort_id", cohort.id),
      sb.from("content_log").select("*").eq("cohort_id", cohort.id).order("pub_date"),
      sb.from("bitly_daily").select("*").order("click_date", { ascending: false }).limit(30),
    ]);

  const won = (n: number) => "₩" + (n ?? 0).toLocaleString("ko-KR");

  // KPI 요약
  let ctx = `## ${cohortName} 운영 데이터 (실시간)\n`;
  if (kpi) {
    ctx += `실등록 ${kpi.realRegs}명/목표 ${kpi.goal}명(${kpi.progressPct}%), ROAS ${kpi.roas}배, 매출 ${won(kpi.totalRevenue)}, 광고비 ${won(kpi.totalAd)}, CAC ${won(kpi.cac)}, 현재페이스 ${kpi.currentPace}명/일(필요 ${kpi.requiredPace}), 예상최종 ${kpi.projectedFinal}명, 다음분기점 ${kpi.ddayLabel}\n`;
  }

  // 등록자 명단 (개별)
  ctx += `\n## 등록자 명단 (${regs?.length ?? 0}명)\n`;
  for (const r of regs ?? []) {
    ctx += `- ${r.name} | ${r.reg_date} | ${r.section} | ${r.channel === "tally" ? "Tally" : "카카오직접"} | ${r.sns_channel ?? "SNS미상"} | ${r.payment}${r.is_refund ? " | 환불" : ""}\n`;
  }

  // 광고
  ctx += `\n## 광고 집행 (${ads?.length ?? 0}건)\n`;
  for (const a of ads ?? []) {
    ctx += `- ${a.platform} | ${a.campaign?.slice(0, 25) ?? ""} | 비용 ${won(a.cost)} | 노출 ${(a.impressions ?? 0).toLocaleString("ko-KR")} | 클릭 ${(a.clicks ?? 0).toLocaleString("ko-KR")}\n`;
  }

  // 매출
  ctx += `\n## 매출 채널 (${revs?.length ?? 0}건)\n`;
  for (const rv of revs ?? []) {
    ctx += `- ${rv.channel} | 결제 ${won(rv.total_paid)} | 환불 ${won(rv.refund)}\n`;
  }

  // 콘텐츠
  ctx += `\n## 콘텐츠 발행 (${contents?.length ?? 0}건)\n`;
  for (const c of contents ?? []) {
    ctx += `- ${c.pub_date} | ${c.platform ?? ""} | ${c.title?.slice(0, 30) ?? ""} | 비틀리클릭 ${c.bitly_clicks ?? "-"}\n`;
  }

  // 비틀리 일별 (최근)
  ctx += `\n## 비틀리 일별 클릭 (최근 ${bitly?.length ?? 0}일)\n`;
  ctx += (bitly ?? []).map((b) => `${b.click_date}: ${b.clicks}회`).join(" / ") + "\n";

  return ctx;
}
