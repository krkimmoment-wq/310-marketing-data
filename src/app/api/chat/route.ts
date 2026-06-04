// AI 어시스턴트 — 실시간 14기 데이터를 보고 베테랑 마케터 시각으로 답변
// Gemini 2.5 Flash (무료). 멀티턴 대화 지원.
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { getKpi } from "@/lib/kpi";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY 미설정" }, { status: 200 });
  }

  const body = await req.json().catch(() => ({}));
  const history: { role: string; text: string }[] = body.history ?? [];
  const question: string = body.question ?? "";
  if (!question.trim()) return NextResponse.json({ answer: "" });

  const kpi = await getKpi("14기");

  // 실시간 데이터를 시스템 지시문에 주입 (질문할 때마다 최신)
  const dataContext = kpi
    ? `현재 14기 운영 데이터 (실시간):
- 실등록: ${kpi.realRegs}명 / 목표 ${kpi.goal}명 (${kpi.progressPct}%)
- ROAS: ${kpi.roas}배 / 매출 ₩${kpi.totalRevenue.toLocaleString("ko-KR")} / 광고비 ₩${kpi.totalAd.toLocaleString("ko-KR")}
- CAC: ₩${kpi.cac.toLocaleString("ko-KR")}
- 현재 페이스 ${kpi.currentPace}명/일 / 필요 ${kpi.requiredPace}명/일 / 예상 최종 ${kpi.projectedFinal}명
- 다음 분기점: ${kpi.ddayLabel}
- 구간별 실등록: ${Object.entries(kpi.bySection).map(([k, v]) => `${k} ${v}명`).join(", ") || "사전등록만"}`
    : "현재 데이터를 불러올 수 없습니다.";

  const SYSTEM = `당신은 "310 다이어트 클래스"의 베테랑 그로스 마케터 AI 어시스턴트입니다.
박민수(마케팅 플래너)의 질문에 답합니다.

성격·어조:
- 검증된 베테랑. 결론 먼저, 근거는 그 다음. 회피·모호한 답변 금지.
- 데이터 기반으로만 단언. 모르면 "데이터에 없습니다"라고 솔직히.
- 숫자를 사람 단위로 번역 ("ROAS 30배" → "광고 ₩1로 매출 ₩30").
- 표·번호·3옵션+추천 패턴 선호. 한국어. 너무 길지 않게.

운영 맥락:
- 코호트(기수) 기반 온라인 다이어트 코칭, 매 기수 3개월. 14기 목표 150명.
- 분기점: 사전등록 → 1차EB(5/22) → 2차EB(6/5) → 정규(6/19) → 6/28 종료. D-Day=1차EB OPEN.
- 13기 베이스라인: 실등록 113명, ROAS 30.81배, CAC ₩30,846.

${dataContext}

위 데이터를 근거로 박민수님 질문에 베테랑 시각으로 답하세요.`;

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: SYSTEM,
    });

    // 멀티턴 history → Gemini 형식 (첫 메시지는 user여야 함)
    const contents = history
      .filter((m) => m.text?.trim())
      .map((m) => ({
        role: m.role === "ai" ? "model" : "user",
        parts: [{ text: m.text }],
      }));
    contents.push({ role: "user", parts: [{ text: question }] });

    const result = await model.generateContent({ contents });
    const answer = result.response.text().trim();
    return NextResponse.json({ answer });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "답변 생성 실패";
    return NextResponse.json({ error: msg, answer: "" }, { status: 200 });
  }
}
