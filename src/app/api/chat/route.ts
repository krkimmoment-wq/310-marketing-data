// AI 어시스턴트 — 실시간 14기 데이터를 보고 베테랑 마케터 시각으로 답변
// Gemini 2.5 Flash (무료). 멀티턴 대화 지원.
import { GoogleGenerativeAI } from "@google/generative-ai";
import { NextResponse } from "next/server";
import { buildFullContext } from "@/lib/context";
import { withRetry } from "@/lib/gemini";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  // 인증 가드 — 비로그인 호출 차단
  const sbAuth = await createClient();
  const { data: { user } } = await sbAuth.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized", answer: "" }, { status: 401 });

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ error: "GEMINI_API_KEY 미설정" }, { status: 200 });
  }

  const body = await req.json().catch(() => ({}));
  const history: { role: string; text: string }[] = body.history ?? [];
  const question: string = body.question ?? "";
  if (!question.trim()) return NextResponse.json({ answer: "" });

  // 상세 데이터 컨텍스트 (KPI + 등록자 명단 + 광고 + 매출 + 콘텐츠 + 비틀리)
  const dataContext = await buildFullContext("14기");

  const SYSTEM = `당신은 "310 다이어트 클래스"의 베테랑 그로스 마케터 AI 어시스턴트입니다.
박민수(마케팅 플래너)의 질문에 답합니다.

성격·어조:
- 검증된 베테랑. 결론 먼저, 근거는 그 다음. 회피·모호한 답변 금지.
- 데이터 기반으로만 단언. 모르면 "데이터에 없습니다"라고 솔직히.
- 숫자를 사람 단위로 번역 ("ROAS 30배" → "광고 ₩1로 매출 ₩30").
- 표·번호·3옵션+추천 패턴 선호. 한국어. 너무 길지 않게.

운영 맥락:
- 코호트(기수) 기반 온라인 다이어트 코칭, 매 기수 3개월. 14기 목표 150명.
- 분기점: 사전등록 → 1차EB(5/22) → 2차EB(6/5) → 정규(6/19) → 6/28 모집종료 → 6/29 클래스 시작. D-Day=클래스 시작(6/29). 비교차트는 클래스 시작 기준 정렬(13기=4/27).
- 13기 베이스라인: 실등록 113명, ROAS 30.81배, CAC ₩30,846.

답변 방식 (그로스 고도화):
- 단순 숫자 나열 금지. 항상 "①무엇을 의미하나(인사이트) → ②그래서 뭘 해야 하나(액션)"까지 연결.
- "왜"를 채널 믹스·전환율·페이스로 설명. 예: "인스타 클릭은 많은데(2,626) 전환율은 0.6%로 13기 1.4%의 절반 → 트래픽은 끌었지만 랜딩/오퍼가 약함. 랜딩 카피·후기 보강 제안."
- 기수 비교는 절대값(완주 vs 진행중)이 아니라 같은 D-Day 시점·효율(ROAS·CAC·전환율)로.
- 위험 신호(페이스 부족·전환 하락·특정 채널 급감)는 먼저 짚고 대안 제시.

${dataContext}

위 데이터를 근거로 박민수님 질문에 베테랑 그로스 마케터 시각으로, 인사이트와 실행 제안까지 답하세요.`;

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

    const result = await withRetry(() => model.generateContent({ contents }));
    const answer = result.response.text().trim();
    return NextResponse.json({ answer });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "답변 생성 실패";
    return NextResponse.json({ error: msg, answer: "" }, { status: 200 });
  }
}
