// 유입·전환 핵심 브리핑 — 트래픽/클릭/전환을 13기와 자동 대조해 "범인" 판정
import { getConversionFunnel } from "@/lib/conversion";

export type BriefPoint = { label: string; a: string; b: string; good: boolean };
export type InsightBrief = {
  aName: string;
  bName: string;
  verdict: "전환 문제" | "트래픽 문제" | "양호";
  headline: string;
  points: BriefPoint[];
  worst: { section: string; a: number; b: number } | null;
  prescription: string[];
} | null;

export async function getInsightBrief(curName = "14기"): Promise<InsightBrief> {
  const f = await getConversionFunnel(curName);
  if (!f) return null;
  // 같은 진행 시점 비교 — 현재 기수가 '완료한' 구간만 (진행중·미래 구간은 직전 기수 완주와 불공정하므로 제외)
  const cmp = f.rows.filter((r) => r.status === "done" && (r.b.clicks > 0 || r.b.regs > 0));
  if (cmp.length === 0) return null;

  const sum = (sel: (r: (typeof cmp)[number]) => number) => cmp.reduce((s, r) => s + sel(r), 0);
  // 같은 분기점 구간끼리 합산이라 기간 동일 — 구간 총량으로 판정 (전환율은 비율이라 기간 무관)
  const t14 = sum((r) => r.a.views), t13 = sum((r) => r.b.views);
  const c14 = sum((r) => r.a.clicks), c13 = sum((r) => r.b.clicks);
  const g14 = sum((r) => r.a.regs), g13 = sum((r) => r.b.regs);
  const cv14 = c14 ? (g14 / c14) * 100 : 0;
  const cv13 = c13 ? (g13 / c13) * 100 : 0;

  const trafficUp = t14 >= t13 * 0.9;
  const clickUp = c14 >= c13 * 0.9;
  const convDown = cv14 < cv13 * 0.9;

  let verdict: NonNullable<InsightBrief>["verdict"];
  let headline: string;
  let prescription: string[];
  if (clickUp && convDown) {
    verdict = "전환 문제";
    headline = `유입은 ${f.aName}가 ${f.bName} 이상인데 전환율이 붕괴 — 오퍼·할인이 동일하다면 범인은 "클릭의 질"(유료 프로모션 공백 → 타겟 유입이 쇼츠피드 스침으로 대체)`;
    prescription = [
      `오퍼·할인·기간이 ${f.bName}와 동일하다면 랜딩은 변수 아님 → 범인은 클릭의 "질". STEP3에서 광고·검색·구독(의도↑)이 줄고 쇼츠피드(쇼츠탭 스침)가 늘었는지 확인`,
      `유료 프로모션을 길게 풀링 + 승인 나는 소재로 (3일 단발·비승인 공백 X) — 타겟 유입 회복이 핵심 레버`,
      `후기·신뢰 강화 (특히 2차EB 망설이는 층). 콘텐츠 '양' 늘리기·트래픽 키우기는 헛다리 — 유입은 이미 ${f.bName} 이상`,
    ];
  } else if (!trafficUp) {
    verdict = "트래픽 문제";
    headline = `유입(채널 조회)이 ${f.bName}보다 약함 — 콘텐츠 화력부터 점검`;
    prescription = [`조회·노출을 끌어오는 콘텐츠(주제·썸네일) 강화`, `${f.bName} 모집기에 터진 영상 패턴 복제`];
  } else {
    verdict = "양호";
    headline = `유입·전환 모두 ${f.bName} 수준 이상 — 현 전략 유지`;
    prescription = [`현 흐름 유지하며 페이스 관리`];
  }

  const convRows = cmp
    .filter((r) => r.a.conv != null && r.b.conv != null && r.b.conv! > 0)
    .map((r) => ({ section: r.section, ratio: r.a.conv! / r.b.conv!, a: r.a.conv!, b: r.b.conv! }));
  const worst = convRows.sort((a, b) => a.ratio - b.ratio)[0];

  const points: BriefPoint[] = [
    { label: "채널 조회 (화력)", a: t14.toLocaleString("ko-KR"), b: t13.toLocaleString("ko-KR"), good: t14 >= t13 },
    { label: "EB링크 클릭 (유입)", a: c14.toLocaleString("ko-KR"), b: c13.toLocaleString("ko-KR"), good: c14 >= c13 },
    { label: "등록 (전환 결과)", a: g14.toLocaleString("ko-KR") + "명", b: g13.toLocaleString("ko-KR") + "명", good: g14 >= g13 },
    { label: "전환율 (등록÷클릭) ★핵심", a: cv14.toFixed(2) + "%", b: cv13.toFixed(2) + "%", good: cv14 >= cv13 },
  ];

  return { aName: f.aName, bName: f.bName, verdict, headline, points, worst: worst ? { section: worst.section, a: worst.a, b: worst.b } : null, prescription };
}
