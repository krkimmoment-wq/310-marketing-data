// AI 브리핑 — 마케팅 운영 데이터 → 베테랑 마케터 시각의 한국어 인사이트
// Google Gemini (무료 티어). 키 없으면 규칙 기반 fallback으로 자동 전환.
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getKpi } from "@/lib/kpi";

export const dynamic = "force-dynamic";

const SYSTEM_PROMPT = `당신은 "310 다이어트 클래스"의 베테랑 그로스 마케터입니다.
- 시니어가 아닌 검증된 베테랑 어조. 결론 먼저, 근거는 그 다음.
- 회피·모호한 컨설팅 어조 금지. 데이터 기반으로만 단언.
- 숫자를 사람 단위로 번역 ("ROAS 30배" → "광고 ₩1로 매출 ₩30 회수").
- 13기 대비 14기 비교 관점 중시 (1차 EB OPEN = D-Day 기준).

운영 맥락:
- 코호트(기수) 기반 온라인 다이어트 코칭, 매 기수 3개월.
- 14기 목표 150명. 분기점: 사전등록→1차EB(5/22)→2차EB(6/5)→정규(6/19)→6/28 종료.
- 13기 베이스라인: 실등록 113명, ROAS 30.81배, CAC ₩30,846.

출력 형식: 정확히 3개의 인사이트를 JSON 배열로만 출력.
각 인사이트: {"tone": "good"|"warn"|"info", "text": "한국어 한 문장, 구체적 숫자 포함"}
- good: 긍정 신호 / warn: 주의·경고 / info: 중립 정보
JSON 배열만 출력. 코드블록(\`\`\`)·다른 텍스트 금지.`;

export async function GET() {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY 미설정", insights: [] });
  }

  const kpi = await getKpi("14기");
  if (!kpi) return NextResponse.json({ insights: [] });

  const dataBlock = `다음은 14기 현재 운영 데이터입니다. 베테랑 시각의 인사이트 3개를 생성하세요.

- 실등록: ${kpi.realRegs}명 / 목표 ${kpi.goal}명 (${kpi.progressPct}%)
- ROAS: ${kpi.roas}배 / 매출 ₩${kpi.totalRevenue.toLocaleString("ko-KR")} / 광고비 ₩${kpi.totalAd.toLocaleString("ko-KR")}
- CAC: ₩${kpi.cac.toLocaleString("ko-KR")}
- 현재 페이스: ${kpi.currentPace}명/일 / 필요 페이스: ${kpi.requiredPace}명/일
- 현재 페이스 유지 시 예상 최종: ${kpi.projectedFinal}명
- 다음 분기점: ${kpi.ddayLabel}
- 구간별 실등록: ${Object.entries(kpi.bySection).map(([k, v]) => `${k} ${v}명`).join(", ") || "사전등록만 진행"}`;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM_PROMPT,
    });
    const result = await model.generateContent(dataBlock);
    let raw = result.response.text().trim();
    // 코드블록 감싸기 제거
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let insights: { tone: string; text: string }[] = [];
    try {
      insights = JSON.parse(raw);
    } catch {
      insights = [{ tone: "info", text: raw.slice(0, 200) }];
    }

    return NextResponse.json({ insights, model: "gemini-2.5-flash" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "AI 브리핑 생성 실패";
    return NextResponse.json({ error: msg, insights: [] });
  }
}
