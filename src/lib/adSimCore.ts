// 광고 시뮬레이터 계산 — 순수 함수 (React·DB 없음, 테스트에서 그대로 불러옴)
// 흐름: 메타 광고비 → 클릭(클릭당 비용) → 메타 신청(Tally 숨은 필드 source=meta) → 오픈채팅 입장(신청 → 입장 비율)
// 목업 v0.2(2026-10-29 승인)와 같은 시드면 같은 숫자가 나와야 함 — 난수를 뽑는 순서를 바꾸지 말 것

export const NRUN = 4000;
export const SEED = 20261029;
export const EVENT_GOAL = 5300; // 행사당 오픈채팅 목표 약 5,300명 (박민수님 10/29)
const Z90 = 1.6448536;

export type Levers = {
  budget: number; days: number;
  cpcLo: number; cpcHi: number; // 클릭당 비용 범위(원, 90%)
  csLo: number; csHi: number;   // 클릭 → 메타 신청률(%, 90%)
  seLo: number; seHi: number;   // 신청 → 오픈채팅 입장 비율(%, 90%)
  base: number;                 // 평소 오픈채팅 증가(하루) — 참고 줄에만 씀
  cpcDrift: number; drift: number; // 특강2 때 흔들림(%, 로그 기준 표준편차)
};
export const DEFAULT_LEVERS: Levers = {
  budget: 300000, days: 3, cpcLo: 100, cpcHi: 600, csLo: 10, csHi: 40, seLo: 45, seHi: 70, base: 24, cpcDrift: 25, drift: 35,
};

// ---------- 난수 (시드 고정) ----------
function mulberry(seed: number) {
  return function () {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export type Rng = { r: () => number; N: () => number; Be: (a: number, b: number) => number; P: (l: number) => number; Bin: (n: number, p: number) => number };
export function mkR(seed: number): Rng {
  const r = mulberry(seed);
  let spare: number | null = null;
  const N = () => {
    if (spare !== null) { const s = spare; spare = null; return s; }
    let u = 0; while (u === 0) u = r();
    const v = r(), m = Math.sqrt(-2 * Math.log(u));
    spare = m * Math.sin(2 * Math.PI * v);
    return m * Math.cos(2 * Math.PI * v);
  };
  const G = (k: number): number => {
    if (k < 1) return G(k + 1) * Math.pow(r(), 1 / k);
    const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d);
    for (;;) {
      let x: number, v: number;
      do { x = N(); v = 1 + c * x; } while (v <= 0);
      v = v * v * v;
      const u = r();
      if (u < 1 - 0.0331 * x * x * x * x) return d * v;
      if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v;
    }
  };
  const Be = (a: number, b: number) => { const x = G(a), y = G(b); return x / (x + y); };
  const P = (l: number) => {
    if (l <= 0) return 0;
    if (l > 40) return Math.max(0, Math.round(l + Math.sqrt(l) * N()));
    const L = Math.exp(-l); let k = 0, p = 1;
    do { k++; p *= r(); } while (p > L);
    return k - 1;
  };
  const Bin = (n: number, p: number) => {
    const m = n * p;
    if (m < 30) return Math.min(n, P(m));
    return Math.max(0, Math.min(n, Math.round(m + Math.sqrt(m * (1 - p)) * N())));
  };
  return { r, N, Be, P, Bin };
}

export const lnP = (lo: number, hi: number): [number, number] =>
  [(Math.log(lo) + Math.log(hi)) / 2, Math.max(0, (Math.log(hi) - Math.log(lo)) / (2 * Z90))];
const srt = (a: number[]) => [...a].sort((x, y) => x - y);
export const quant = (s: number[], p: number) => s[Math.min(s.length - 1, Math.max(0, Math.floor(p * (s.length - 1))))];

// ---------- ㉮ 메타 갈래 ----------
// 한 번의 미래 = 클릭당 비용 · 신청률 · 입장 비율 각 1개 + 흔들림 2개. 금액만 바꿔 같은 미래에 다시 넣음
export type Draw = { cpc: number; cs: number; se: number; z1: number; z2: number };
export function metaDraws(s: Levers, n: number, seed: number): Draw[] {
  const R = mkR(seed);
  const [mc, sc] = lnP(s.cpcLo, s.cpcHi), [ma, sa] = lnP(s.csLo / 100, s.csHi / 100), [mb, sb] = lnP(s.seLo / 100, s.seHi / 100);
  const D: Draw[] = [];
  for (let i = 0; i < n; i++) {
    const cpc = Math.exp(mc + sc * R.N());
    const cs = Math.min(1, Math.exp(ma + sa * R.N()));
    const se = Math.min(1, Math.exp(mb + sb * R.N()));
    const z1 = R.N(), z2 = R.N();
    D.push({ cpc, cs, se, z1, z2 });
  }
  return D;
}
// 범위가 넓은 이유 — 손잡이별 로그 표준편차
export function spreadParts(s: Levers): [string, number][] {
  return [["클릭당 비용", lnP(s.cpcLo, s.cpcHi)[1]], ["클릭 → 신청률", lnP(s.csLo / 100, s.csHi / 100)[1]], ["신청 → 입장 비율", lnP(s.seLo / 100, s.seHi / 100)[1]]];
}
const draw = (m: number, p: number, z: number) => Math.max(0, Math.round(m + Math.sqrt(Math.max(0, m * (1 - p))) * z));
export const sigAt = (d: Draw, B: number) => draw((B / d.cpc) * d.cs, d.cs, d.z1);
export const entAt = (d: Draw, B: number) => draw(sigAt(d, B) * d.se, d.se, d.z2);

export type Summary = { a: number[]; lo: number; med: number; hi: number; p: number };
export function sumAt(D: Draw[], B: number, tgt: number, fn: (d: Draw, B: number) => number): Summary {
  const a = srt(D.map((d) => fn(d, B)));
  let hit = 0; for (const x of a) if (x >= tgt) hit++;
  return { a, lo: quant(a, 0.1), med: quant(a, 0.5), hi: quant(a, 0.9), p: hit / a.length };
}
export const costPerEntry = (D: Draw[]) => { const s = srt(D.map((d) => d.cpc / (d.cs * d.se))); return [quant(s, 0.1), quant(s, 0.9)]; };

// 거꾸로 찾기: 입장 tgt명을 확률 p 이상으로 넘는 최소 광고비 (만 원 단위 올림, 1,000만 원 넘으면 null)
export function reverseBudget(D: Draw[], tgt: number, p: number): number | null {
  const ok = (B: number) => { let h = 0; for (const d of D) if (entAt(d, B) >= tgt) h++; return h / D.length >= p; };
  const MAX = 10000000;
  if (tgt <= 0) return 0;
  if (!ok(MAX)) return null;
  let lo = 0, hi = MAX;
  for (let i = 0; i < 32 && hi - lo > 1000; i++) { const m = (lo + hi) / 2; if (ok(m)) hi = m; else lo = m; }
  return Math.ceil(hi / 10000) * 10000;
}

// 행사당 목표 대비 메타 몫(%, 소수 1자리) [하한, 중앙, 상한]
export const metaShare = (e: { lo: number; med: number; hi: number }, goal = EVENT_GOAL) =>
  [e.lo, e.med, e.hi].map((x) => Math.round((x / goal) * 1000) / 10);

// ---------- 시험 비행 · 11/17 판단표 ----------
export type Band = "below" | "in" | "above";
export type Fixed = { B: number; sLo: number; sMed: number; sHi: number; cpcLo: number; cpcHi: number; csLo: number; csHi: number; seLo: number; seHi: number; base: number; days: number };
export function fixPrediction(s: Levers, B: number): Fixed {
  const D = metaDraws(s, NRUN, SEED), x = sumAt(D, B, 0, sigAt);
  return { B, sLo: x.lo, sMed: x.med, sHi: x.hi, cpcLo: s.cpcLo, cpcHi: s.cpcHi, csLo: s.csLo, csHi: s.csHi, seLo: s.seLo, seHi: s.seHi, base: s.base, days: s.days };
}
export const bandOf = (f: Fixed, S: number): Band => (S < f.sLo ? "below" : S > f.sHi ? "above" : "in");
// 판단표 줄의 가정 결과: 아래 = 예측 하한×0.6 / 범위 안 = 중앙 / 위 = 상한×1.4 (클릭당 비용은 가정 범위 가운데)
export function scenarioOf(f: Fixed, k: Band) {
  const cpcMid = Math.sqrt(f.cpcLo * f.cpcHi), clicks = Math.round(f.B / cpcMid);
  const S = k === "below" ? Math.round(f.sLo * 0.6) : k === "in" ? f.sMed : Math.round(f.sHi * 1.4);
  return { cpc: cpcMid, S, clicks };
}
// 특강1에서 본 클릭당 비용·신청률 + 다른 날 흔들림, 입장 비율은 가정 그대로 → 특강2 금액 B의 입장 범위
export function postRange(s: Levers, cpc0: number, S: number, clicks: number, B: number, tgt: number, seed: number) {
  const R = mkR(seed), cd = s.cpcDrift / 100, rd = s.drift / 100, [mb, sb] = lnP(s.seLo / 100, s.seHi / 100), a: number[] = [];
  let hit = 0;
  for (let i = 0; i < 2000; i++) {
    const cpc = cpc0 * Math.exp(cd * R.N());
    const cs = Math.min(1, R.Be(S + 1, Math.max(1, clicks - S) + 1) * Math.exp(rd * R.N()));
    const se = Math.min(1, Math.exp(mb + sb * R.N()));
    const z1 = R.N(), z2 = R.N();
    const x = entAt({ cpc, cs, se, z1, z2 }, B);
    a.push(x); if (x >= tgt) hit++;
  }
  const so = srt(a);
  return { lo: quant(so, 0.1), med: quant(so, 0.5), hi: quant(so, 0.9), p: hit / 2000 };
}

// ---------- ㉯ 등록 갈래 (할인 3구간) ----------
// 실제 클릭·등록 (10/28 DB 조회 · 이전·Day1 이전 제외 · 16기 11/1 집계 전 임시)
export const BT = {
  14: { eb1: [2626, 13], eb2: [2851, 5], reg: [2248, 15] },
  15: { eb1: [988, 22], eb2: [2293, 23], reg: [964, 15] },
  16: { eb1: [693, 23], eb2: [595, 14], reg: [989, 12] },
} as const;
export type CohortKey = keyof typeof BT;
export const SEG = [["eb1", "1차EB"], ["eb2", "2차EB"], ["reg", "정규"]] as const;
type SegKey = (typeof SEG)[number][0];
export type Range = { lo: number; med: number; hi: number };
// 기수를 먼저 뽑고(2단 추첨) 그 기수의 구간별 클릭→등록률로 뽑음
export function regSim(pool: CohortKey[], clk: Record<SegKey, number>, seed: number): Record<SegKey | "tot", Range> {
  const R = mkR(seed), out: Record<SegKey | "tot", number[]> = { eb1: [], eb2: [], reg: [], tot: [] };
  for (let i = 0; i < NRUN; i++) {
    const k = pool[Math.floor(R.r() * pool.length)];
    let t = 0;
    SEG.forEach(([s]) => { const [c, r] = BT[k][s], cv = R.Be(r + 1, c - r + 1), x = R.Bin(clk[s], cv); out[s].push(x); t += x; });
    out.tot.push(t);
  }
  const S = {} as Record<SegKey | "tot", Range>;
  (Object.keys(out) as (SegKey | "tot")[]).forEach((k) => { const s = srt(out[k]); S[k] = { lo: quant(s, 0.1), med: quant(s, 0.5), hi: quant(s, 0.9) }; });
  return S;
}
// 한 기수 빼고 맞히기: 통과 = 3구간 합이 80% 범위 안 + 구간 3개 중 2개 이상 범위 안
export function backtest(k: CohortKey) {
  const pool = (Object.keys(BT).map(Number) as CohortKey[]).filter((x) => x !== k);
  const clk = { eb1: BT[k].eb1[0], eb2: BT[k].eb2[0], reg: BT[k].reg[0] };
  const S = regSim(pool, clk, SEED + k);
  const act = { eb1: BT[k].eb1[1], eb2: BT[k].eb2[1], reg: BT[k].reg[1] } as Record<SegKey, number>;
  const tot = act.eb1 + act.eb2 + act.reg;
  const segIn = SEG.filter(([s]) => act[s] >= S[s].lo && act[s] <= S[s].hi).length;
  const totIn = tot >= S.tot.lo && tot <= S.tot.hi;
  return { k, tot, range: S.tot, segIn, pass: totIn && segIn >= 2 };
}
