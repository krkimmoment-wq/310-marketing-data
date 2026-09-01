// AI 브리핑 — 마케팅 운영 데이터 → 베테랑 마케터 시각의 한국어 인사이트
// Google Gemini (무료 티어). 키 없으면 규칙 기반 fallback으로 자동 전환.
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getKpi } from "@/lib/kpi";
import { getDayComparison } from "@/lib/comparison";
import { withRetry } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";
import { getLatestCohortName, resolveCohortPair } from "@/lib/cohorts";

// 브리핑 + 핵심지표를 그날치로 저장 (히스토리·추세용). 실패해도 브리핑엔 영향 없음
async function saveHistory(cohortName: string, insights: { tone: string; text: string }[], metrics: Record<string, number>) {
  try {
    const sb = await createClient();
    const { data: c } = await sb.from("cohorts").select("id").eq("name", cohortName).single();
    if (!c) return;
    const today = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
    await sb.from("brief_history").upsert(
      { cohort_id: c.id, snapshot_date: today, insights, metrics },
      { onConflict: "cohort_id,snapshot_date" }
    );
  } catch {
    /* 히스토리 저장 실패는 무시 (브리핑 자체는 정상 반환) */
  }
}

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `당신은 "310 다이어트 클래스"의 베테랑 그로스 마케터입니다.
- 시니어가 아닌 검증된 베테랑 어조. 결론 먼저, 근거는 그 다음.
- 회피·모호한 컨설팅 어조 금지. 데이터 기반으로만 단언.
- 숫자를 사람 단위로 번역 ("ROAS 30배" → "광고 ₩1로 매출 ₩30 회수").
- 직전 기수 대비 비교 관점 중시. 기수 비교는 반드시 '클래스 시작 = D-Day' 기준의 같은 진행시점 값으로.

운영 맥락:
- 코호트(기수) 기반 온라인 다이어트 코칭, 매 기수 3개월.
- 대상 기수·목표·분기점·직전 기수 수치는 모두 아래 데이터 블록에 실시간으로 제공됨. 그 값만 사용하세요.

출력 형식: 정확히 3개의 인사이트를 JSON 배열로만 출력.
각 인사이트: {"tone": "good"|"warn"|"info", "text": "한국어 한 문장, 구체적 숫자 포함"}
- good: 긍정 신호 / warn: 주의·경고 / info: 중립 정보
JSON 배열만 출력. 코드블록(\`\`\`)·다른 텍스트 금지.`;

export async function GET(req: Request) {
  // 인증 가드 — 비로그인 호출 차단 (Gemini 키 소진·컨텍스트 유출 방지)
  const sbAuth = await createClient();
  const { data: { user } } = await sbAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized", insights: [] }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY 미설정", insights: [] });
  }

  // 대상 기수 = 쿼리(?cohort=) 또는 최신 기수. 비교 대상 = 시간순 직전 기수 (하드코딩 제거)
  const cohortName = new URL(req.url).searchParams.get("cohort") || (await getLatestCohortName());
  const { previousName } = await resolveCohortPair(cohortName);

  const kpi = await getKpi(cohortName);
  if (!kpi) return NextResponse.json({ insights: [] });
  const kPrev = previousName ? await getKpi(previousName) : null;

  // 같은 D-Day(클래스 시작) 시점 비교 — 직전 기수 최종누적이 아니라 같은 시점 누적으로
  const cmp = previousName ? await getDayComparison([cohortName, previousName]) : null;
  const meDay = cmp?.series.find((s) => s.name === cohortName)?.lastDay ?? null;
  const atDay = (name: string) =>
    meDay != null ? cmp?.series.find((s) => s.name === name)?.points.find((p) => p.x === meDay)?.y ?? null : null;
  const vMeNow = atDay(cohortName);
  const vPrevSame = previousName ? atDay(previousName) : null;

  const dataBlock = `다음은 ${cohortName} 현재 운영 데이터입니다. 베테랑 그로스 시각의 인사이트 3개를 생성하세요.
각 인사이트는 "현상+의미" 또는 "위험+대안" 형태로. 막연한 칭찬·뻔한 말 금지. 페이스 부족·전환 하락 같은 위험 신호를 우선 짚으세요.

- 실등록: ${kpi.realRegs}명 / 목표 ${kpi.goal}명 (${kpi.progressPct}%)
- ROAS: ${kpi.roas}배 / 매출 ₩${kpi.totalRevenue.toLocaleString("ko-KR")} / 광고비 ₩${kpi.totalAd.toLocaleString("ko-KR")}
- CAC: ₩${kpi.cac.toLocaleString("ko-KR")}
- 현재 페이스: ${kpi.currentPace}명/일 / 필요 페이스: ${kpi.requiredPace}명/일 ${kpi.currentPace < kpi.requiredPace ? "(⚠️부족)" : "(궤도)"}
- 현재 페이스 유지 시 예상 최종: ${kpi.projectedFinal}명
- 다음 분기점: ${kpi.ddayLabel}
- 구간별 실등록: ${Object.entries(kpi.bySection).map(([k, v]) => `${k} ${v}명`).join(", ") || "사전등록만 진행"}
${
  previousName && meDay != null && vPrevSame != null
    ? `- ★같은 D${meDay >= 0 ? "+" : ""}${meDay} 시점(클래스 시작 기준) 누적 비교: ${cohortName} ${vMeNow}명 vs ${previousName} ${vPrevSame}명. ⚠️비교·진척률·우열은 반드시 이 '같은 시점 ${previousName} ${vPrevSame}명'으로 하세요. ${previousName} 최종 완주 누적(${kPrev?.realRegs}명)과 비교하면 절대 안 됩니다.`
    : ""
}
${kPrev ? `- ${previousName} 효율(참고): ROAS ${kPrev.roas ?? "-"}배, CAC ₩${(kPrev.cac ?? 0).toLocaleString("ko-KR")}` : ""}`;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });
    const result = await withRetry(() => model.generateContent(dataBlock));
    let raw = result.response.text().trim();
    // 코드블록 감싸기 제거
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let insights: { tone: string; text: string }[] = [];
    try {
      insights = JSON.parse(raw);
    } catch {
      insights = [{ tone: "info", text: raw.slice(0, 200) }];
    }

    await saveHistory(cohortName, insights, {
      realRegs: kpi.realRegs,
      progressPct: kpi.progressPct,
      roas: kpi.roas,
      cac: kpi.cac,
      currentPace: kpi.currentPace,
      projectedFinal: kpi.projectedFinal,
      sameOther: vPrevSame ?? 0,
    });
    return NextResponse.json({ insights, model: "gemini-2.5-flash" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI 브리핑 생성 실패";
    return NextResponse.json({ error: msg, insights: [] });
  }
}
