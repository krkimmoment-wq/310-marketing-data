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
  const cmp = f.rows.filter((r) => r.b.clicks > 0 || r.b.regs > 0); // 직전 기수 비교 가능 구간만
  if (cmp.length === 0) return null;

  const sum = (sel: (r: (typeof cmp)[number]) => number) => cmp.reduce((s, r) => s + sel(r), 0);
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
    headline = `유입은 ${f.aName}가 ${f.bName} 이상인데 전환율이 붕괴 — 범인은 "클릭 이후"(랜딩·오퍼·결제)`;
    prescription = [
      `얼리버드 랜딩·오퍼·가격을 ${f.bName} 수준과 직접 비교 점검 (혜택·할인폭이 약해졌나)`,
      `후기·신뢰 요소 강화 — 특히 2차EB는 망설이는 층이라 치명적`,
      `콘텐츠 더 만들기·트래픽 키우기는 헛다리. 유입은 이미 ${f.bName} 이상`,
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
    { label: "채널 조회 (유입 화력)", a: t14.toLocaleString("ko-KR"), b: t13.toLocaleString("ko-KR"), good: t14 >= t13 },
    { label: "EB링크 클릭 (유입)", a: c14.toLocaleString("ko-KR"), b: c13.toLocaleString("ko-KR"), good: c14 >= c13 },
    { label: "등록 (전환)", a: g14.toLocaleString("ko-KR") + "명", b: g13.toLocaleString("ko-KR") + "명", good: g14 >= g13 },
    { label: "전환율 (등록÷클릭)", a: cv14.toFixed(2) + "%", b: cv13.toFixed(2) + "%", good: cv14 >= cv13 },
  ];

  return { aName: f.aName, bName: f.bName, verdict, headline, points, worst: worst ? { section: worst.section, a: worst.a, b: worst.b } : null, prescription };
}
