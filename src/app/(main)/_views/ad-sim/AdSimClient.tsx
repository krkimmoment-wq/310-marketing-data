"use client";
// 광고 시뮬레이터 화면 — 손잡이를 바꾸면 4,000번 다시 계산 (계산은 adSimCore, 시드 고정)
import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  NRUN, SEED, EVENT_GOAL, DEFAULT_LEVERS, type Levers, type Band, type Fixed, type CohortKey,
  metaDraws, sumAt, sigAt, entAt, reverseBudget, costPerEntry, metaShare, spreadParts, quant,
  fixPrediction, bandOf, scenarioOf, postRange, regSim, backtest, BT, SEG,
} from "@/lib/adSimCore";

export type Sensor = { name: string; state: "on" | "part" | "offl"; label: string; note: string };

const fmt = (n: number) => Math.round(n).toLocaleString("ko-KR");
const man = (b: number) => (b >= 10000 ? `${fmt(b / 10000)}만` : fmt(b)) + " 원";
type BadgeKind = "data" | "as" | "none" | "in";
const BADGE: Record<BadgeKind, [string, string]> = { data: ["bd-data", "DATA"], as: ["bd-as", "가정"], none: ["bd-none", "없음"], in: ["bd-ex", "입력"] };
const Badge = ({ k }: { k: BadgeKind }) => <span className={`bd ${BADGE[k][0]}`}>{BADGE[k][1]}</span>;

type LeverKey = keyof Levers;
type LeverDef = { g: string; id: string; lab: string; min: number; max: number; step: number; b: BadgeKind; why: string; pair?: [LeverKey, LeverKey]; show: (s: Levers) => string };
const LEVERS: LeverDef[] = [
  { g: "메타 광고", id: "budget", lab: "메타 광고비 (특강 모집 기간 합계)", min: 0, max: 1000000, step: 10000, b: "in", why: "질문 ①의 10만/30만/50만 원은 위 빠른 선택으로", show: (s) => man(s.budget) },
  { g: "메타 광고", id: "days", lab: "특강 모집 기간", min: 1, max: 7, step: 1, b: "in", why: "11/13~15 확정 (3일)", show: (s) => `${s.days}일` },
  { g: "메타 광고", id: "cpc", lab: "클릭당 비용 범위", pair: ["cpcLo", "cpcHi"], min: 50, max: 1500, step: 10, b: "as", why: "우리 인스타 광고 16기 146원 · 14기 432원(DATA)을 넓힌 값. 업계(LocaliQ 건강·피트니스 $0.64)는 방향 참고만", show: (s) => `${fmt(s.cpcLo)}~${fmt(s.cpcHi)}원` },
  { g: "특강 신청", id: "cs", lab: "클릭 → 메타 신청률 범위", pair: ["csLo", "csHi"], min: 1, max: 90, step: 1, b: "none", why: "메타 기록 0건. 신청 폼 칸(이름·연락처·사전 질문·식단 질문)이 많을수록 낮아짐. 시험 비행으로 가장 먼저 좁힐 값", show: (s) => `${s.csLo}~${s.csHi}%` },
  { g: "특강 신청", id: "se", lab: "신청 → 오픈채팅 입장 비율 범위", pair: ["seLo", "seHi"], min: 5, max: 100, step: 1, b: "as", why: "박민수님 가정 56%(가운데). 오픈채팅은 링크별로 셀 수 없어 시험 비행 뒤에도 가정으로 남음", show: (s) => `${s.seLo}~${s.seHi}%` },
  { g: "참고", id: "base", lab: "평소 오픈채팅 증가 (하루)", min: 0, max: 80, step: 1, b: "data", why: "혜진T 시트 10/22~28 하루 약 24명(박민수님 확인값). 특강 기간엔 홍보가 겹쳐 더 커지므로 광고 몫 계산에는 쓰지 않고 참고 줄에만 씀", show: (s) => `${s.base}명/일` },
  { g: "11/17 판단표", id: "cpcDrift", lab: "다른 날 흔들림 · 클릭당 비용", min: 0, max: 80, step: 5, b: "as", why: "특강1에서 본 값이 특강2 때 얼마나 달라질지 (로그 기준 표준편차)", show: (s) => `±${s.cpcDrift}%` },
  { g: "11/17 판단표", id: "drift", lab: "다른 날 흔들림 · 신청률", min: 0, max: 80, step: 5, b: "as", why: "3일 결과가 학습 기간 중 성과일 수 있어 넓게 둠", show: (s) => `±${s.drift}%` },
];
const NAMES: Record<string, string> = { budget: "메타 광고비", days: "기간", cpcLo: "클릭당 비용(하한)", cpcHi: "클릭당 비용(상한)", csLo: "신청률(하한)", csHi: "신청률(상한)", seLo: "입장 비율(하한)", seHi: "입장 비율(상한)", base: "평소 증가", cpcDrift: "흔들림·비용", drift: "흔들림·신청률", target: "목표" };
const PAIRS: [LeverKey, LeverKey][] = [["cpcLo", "cpcHi"], ["csLo", "csHi"], ["seLo", "seHi"]];
const CAND = [100000, 300000, 500000, 1000000];
const BANDN: Record<Band, [string, string]> = { below: ["아래", "p-below"], in: ["범위 안", "p-in"], above: ["위", "p-above"] };
const READ: Record<Band, string> = {
  below: "원인부터 진단: 클릭 단계(소재·타깃)인지 신청 단계(폼 길이·안내문)인지. 같은 금액으로 한 번 더 시험하거나 멈춤",
  in: "예측대로. 아래 후보 중 목표 입장 수에 맞는 금액 선택. 거꾸로 찾기 참고",
  above: "예측보다 좋음. 늘리는 후보 검토. 단 금액을 크게 늘리면 효율이 떨어지는 현상은 아직 반영 안 됨",
};
const pColor = (p: number) => (p >= 0.7 ? "var(--cyan)" : p >= 0.4 ? "var(--amber)" : "var(--red)");
const verdictOf = (p: number) => (p >= 0.7 ? "GO" : p >= 0.4 ? "CAUTION" : "NO GO");

function Gauge({ p }: { p: number }) {
  const cx = 130, cy = 130, col = pColor(p), R = 94, len = 2 * Math.PI * R;
  return (
    <svg viewBox="0 0 260 260" style={{ width: 240, maxWidth: "100%", aspectRatio: "1" }} role="img" aria-label={`목표 달성 확률 ${Math.round(p * 100)}%`}>
      {Array.from({ length: 72 }, (_, i) => {
        const a = (i / 72) * Math.PI * 2 - Math.PI / 2, r1 = i % 6 === 0 ? 118 : 122;
        return <line key={i} x1={cx + r1 * Math.cos(a)} y1={cy + r1 * Math.sin(a)} x2={cx + 126 * Math.cos(a)} y2={cy + 126 * Math.sin(a)} stroke={i / 72 < p ? col : "var(--off)"} strokeWidth={i % 6 === 0 ? 2 : 1} />;
      })}
      <circle className="spin" cx={cx} cy={cy} r={108} fill="none" stroke="var(--cyan-dim)" strokeDasharray="2 6" />
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="var(--off)" strokeWidth={10} opacity={0.6} />
      <circle cx={cx} cy={cy} r={R} fill="none" stroke={col} strokeWidth={10} strokeDasharray={`${len * p} ${len}`} transform={`rotate(-90 ${cx} ${cy})`} />
      <text x={cx} y={cy + 8} textAnchor="middle" fontSize={52} fill="var(--ink)" style={{ fontFamily: "var(--f-hud)", fontWeight: 700 }}>{Math.round(p * 100)}%</text>
      <text x={cx} y={cy + 34} textAnchor="middle" fontSize={11} fill="var(--muted)">{fmt(Math.round(p * NRUN))} / {fmt(NRUN)} 성공</text>
      <text x={cx} y={cy - 40} textAnchor="middle" fontSize={10} fill={col} style={{ fontFamily: "var(--f-hud)", letterSpacing: ".2em" }}>{verdictOf(p)}</text>
    </svg>
  );
}

function Hist({ a, tgt, lo, hi }: { a: number[]; tgt: number; lo: number; hi: number }) {
  const W = 640, H = 220, pl = 34, pr = 12, pt = 16, pb = 28;
  const x1 = Math.max(10, Math.ceil(quant(a, 0.99) / 10) * 10), bw = Math.max(1, Math.ceil(x1 / 44));
  const bins: { x: number; c: number }[] = [];
  for (let x = 0; x < x1; x += bw) bins.push({ x, c: 0 });
  a.forEach((t) => { const i = Math.floor(t / bw); if (i >= 0 && i < bins.length) bins[i].c++; });
  const mx = Math.max(1, ...bins.map((b) => b.c)), X = (v: number) => pl + (v / x1) * (W - pl - pr), Y = (c: number) => H - pb - (c / mx) * (H - pt - pb);
  const step = [10, 20, 50, 100, 200, 500, 1000].find((s) => x1 / s <= 8) ?? 2000;
  const ticks: number[] = []; for (let v = 0; v <= x1; v += step) ticks.push(v);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="메타로 들어온 입장 분포">
      {[1, 2, 3].map((k) => <line key={k} x1={pl} x2={W - pr} y1={H - pb - (k / 4) * (H - pt - pb)} y2={H - pb - (k / 4) * (H - pt - pb)} stroke="var(--line)" strokeDasharray="2 4" />)}
      <rect x={X(lo)} y={pt} width={Math.max(1, X(hi) - X(lo))} height={H - pt - pb} fill="var(--cyan)" opacity={0.05} />
      <line x1={pl} x2={W - pr} y1={H - pb} y2={H - pb} stroke="var(--cyan-dim)" />
      {ticks.map((v) => <text key={v} x={X(v)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--muted)">{fmt(v)}</text>)}
      {bins.filter((b) => b.c).map((b) => (
        <rect key={b.x} x={X(b.x) + 1} y={Y(b.c)} width={Math.max(1, X(b.x + bw) - X(b.x) - 2)} height={H - pb - Y(b.c)} fill={b.x >= tgt ? "var(--cyan)" : "var(--off)"}>
          <title>{`${fmt(b.x)}~${fmt(b.x + bw - 1)}명 · ${b.c}번`}</title>
        </rect>
      ))}
      {tgt > 0 && X(tgt) <= W - pr && (
        <g>
          <line x1={X(tgt)} x2={X(tgt)} y1={pt - 6} y2={H - pb} stroke="var(--ink)" strokeWidth={1.5} strokeDasharray="4 3" />
          <text x={Math.min(X(tgt) + 5, W - pr - 70)} y={pt + 4} fontSize={11.5} fill="var(--ink)">목표 {fmt(tgt)}</text>
        </g>
      )}
    </svg>
  );
}

function Spread({ parts }: { parts: [string, number][] }) {
  const W = 560, pl = 130, tot = parts.reduce((s, p) => s + p[1] * p[1], 0) || 1, cols = ["var(--cyan)", "var(--amber)", "var(--muted)"];
  return (
    <svg viewBox={`0 0 ${W} ${parts.length * 30 + 6}`} width="100%" role="img" aria-label="범위가 넓은 이유">
      {parts.map(([name, s], i) => {
        const y = 6 + i * 30, sh = (s * s) / tot;
        return (
          <g key={name}>
            <text x={pl - 8} y={y + 13} textAnchor="end" fontSize={12} fill="var(--ink)">{name}</text>
            <rect x={pl} y={y + 3} width={W - pl - 60} height={12} fill="var(--off)" />
            <rect x={pl} y={y + 3} width={Math.max(1, (W - pl - 60) * sh)} height={12} fill={cols[i]} />
            <text x={W - 54} y={y + 13} fontSize={11.5} fill="var(--muted)">{Math.round(sh * 100)}%</text>
          </g>
        );
      })}
    </svg>
  );
}

type LogRow = { n: number; ch: string[]; warn: boolean; B: number; med: number; lo: number; hi: number; p: number };

export default function AdSimClient({ sensors }: { sensors: Sensor[] }) {
  const [lv, setLv] = useState<Levers>(DEFAULT_LEVERS);
  const [target, setTarget] = useState(200);
  const [prob, setProb] = useState(80);
  const [clk, setClk] = useState<CohortKey>(16);
  const [flight, setFlight] = useState({ fB: 300000, fC: 1500, fS: 150, fT: 330 });
  const [fixed, setFixed] = useState<Fixed & { auto: boolean }>(() => ({ ...fixPrediction(DEFAULT_LEVERS, 300000), auto: true }));
  const [log, setLog] = useState<LogRow[]>([]);
  const prevSnap = useRef<Record<string, number> | null>(null);

  const s = useDeferredValue(lv);
  const tgt = useDeferredValue(target);
  const calc = useMemo(() => {
    const D = metaDraws(s, NRUN, SEED);
    const e = sumAt(D, s.budget, tgt, entAt), sig = sumAt(D, s.budget, 0, sigAt);
    const cmp = [100000, 300000, 500000].map((B) => ({ B, e: sumAt(D, B, tgt, entAt), s: sumAt(D, B, 0, sigAt) }));
    return { D, e, sig, cmp, cpe: costPerEntry(D), share: metaShare(e) };
  }, [s, tgt]);
  const rev = useMemo(() => reverseBudget(calc.D, tgt, Math.min(0.99, Math.max(0.1, prob / 100))), [calc.D, tgt, prob]);

  // 시험 기록: 손잡이가 0.6초 멈추면 한 줄
  useEffect(() => {
    const t = setTimeout(() => {
      const snap: Record<string, number> = { ...s, target: tgt };
      const prev = prevSnap.current;
      const ch = prev ? Object.keys(snap).filter((k) => snap[k] !== prev[k]) : [];
      if (prev && !ch.length) return;
      prevSnap.current = snap;
      setLog((L) => [{ n: (L[0]?.n ?? 0) + 1, ch: prev ? ch.map((k) => `${NAMES[k]} ${prev[k]}→${snap[k]}`) : ["첫 시험 (기본값)"], warn: ch.length > 1, B: s.budget, med: calc.e.med, lo: calc.e.lo, hi: calc.e.hi, p: calc.e.p }, ...L].slice(0, 12));
    }, 600);
    return () => clearTimeout(t);
  }, [s, tgt, calc]);

  // 시험 비행 판정 · 11/17 판단표
  const S = Math.max(0, Math.round(flight.fS)), fC = Math.max(1, flight.fC);
  const band = bandOf(fixed, S), cpcObs = flight.fB / fC, csObs = S / fC;
  const judge = useMemo(() => (["below", "in", "above"] as Band[]).map((k, ri) => {
    const real = k === band, sc = scenarioOf(fixed, k);
    const c0 = real ? cpcObs : sc.cpc, S0 = real ? S : sc.S, cl = real ? fC : sc.clicks;
    return { k, real, c0, S0, cl, cells: CAND.map((B, j) => postRange(s, c0, S0, cl, B, tgt, SEED + ri * 10 + j)) };
  }), [fixed, band, cpcObs, S, fC, s, tgt]);

  const reg = useMemo(() => regSim([14, 15, 16], { eb1: BT[clk].eb1[0], eb2: BT[clk].eb2[0], reg: BT[clk].reg[0] }, SEED + 1), [clk]);
  const bts = useMemo(() => ([14, 15, 16] as CohortKey[]).map(backtest), []);
  const btPass = bts.filter((b) => b.k !== 16 && b.pass).length;

  const setKey = (k: LeverKey, v: number) => setLv((o) => {
    const n = { ...o, [k]: v };
    PAIRS.forEach(([a, b]) => { if (k === a && n[a] > n[b]) n[b] = n[a]; if (k === b && n[b] < n[a]) n[a] = n[b]; });
    return n;
  });
  const onSensors = sensors.filter((x) => x.state === "on").length;
  const nat = fixed.days * fixed.base;
  const inC = cpcObs >= fixed.cpcLo && cpcObs <= fixed.cpcHi, inS = csObs * 100 >= fixed.csLo && csObs * 100 <= fixed.csHi;

  return (
    <div className="adsim">
      <div className="wrap">
        <header className="top">
          <div style={{ display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>
            <span className="hud" style={{ fontSize: 11, color: "var(--cyan)" }}>SIM-AD // 17기 · A안</span>
            <h1>17기 광고 시뮬레이터</h1>
            <p className="muted" style={{ fontSize: 13.5, maxWidth: "72ch", margin: 0 }}>
              메타 광고비 → 특강 신청(Tally 숨은 필드 <span className="num">meta</span>) → 오픈채팅 입장을 <b>4,000번</b> 돌려 <b>범위</b>로 보여 줍니다. 특강1(11/13~15) 메타 광고는 시험 비행처럼 실제 신청 수를 넣어 예측과 비교합니다.
            </p>
          </div>
          <div className="chips">
            <span className="chip">단계 <b>A안</b></span>
            <span className="chip">RUNS <b>{fmt(NRUN)}</b></span>
            <span className="chip">SEED <b>고정</b></span>
          </div>
        </header>

        <p className="small muted" style={{ margin: 0 }}>
          근거 배지: <Badge k="data" /> 10/28 DB 조회·확인값 · <Badge k="as" /> 근거는 있으나 크기는 추정 · <Badge k="none" /> 기록 없음 · <span className="bd bd-pass">통과</span> 맞히기 시험 통과 · <span className="bd bd-ex">예시</span> 실제 아님
        </p>

        <section className="stage" aria-label="A안에서 B안으로">
          <div className="st-box now"><span className="hud" style={{ fontSize: 11, color: "var(--cyan)" }}>지금 · A안</span><b>범위를 정직하게 보여 주기</b><span className="small muted">광고 → 결과 숫자는 모두 가정. 메타 시험 비행으로 첫 실제 값을 얻음</span></div>
          <span className="arrow num" aria-hidden="true" style={{ fontSize: 22, color: "var(--cyan-dim)" }}>▸</span>
          <div className="st-box"><span className="hud" style={{ fontSize: 11, color: "var(--cyan)" }}>11/2부터 · B안</span><b>날짜별 데이터로 배지가 DATA로 바뀜</b><span className="small muted">준비 <span className="num">{onSensors} / {sensors.length}</span> · 아래 데이터 센서</span><div className="meter"><i style={{ width: `${(onSensors / sensors.length) * 100}%` }} /></div></div>
        </section>

        <div className="sec hud">㉮ <b>메타 → 특강 신청 → 오픈채팅 · 특강 모집 광고</b></div>

        <section className="hero">
          <div className="pn" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
            <div className="pn-h" style={{ width: "100%" }}><h2>목표 달성 확률</h2><span className="code hud">P(≥TARGET)</span></div>
            <Gauge p={calc.e.p} />
            <label className="field" htmlFor="as-target">메타로 들어온 입장 목표 <input id="as-target" type="number" value={target} min={0} step={10} onChange={(e) => setTarget(Math.max(0, Number(e.target.value) || 0))} /> 명 <span className="bd bd-ex">예시</span></label>
          </div>
          <div className="pn">
            <div className="pn-h"><h2>판독값</h2><span className="code hud">{man(s.budget)} · {s.days}일</span></div>
            <div className="reads">
              <div className="rd"><div className="l">메타로 들어온 입장 · 가장 흔한 값</div><div className="v">{fmt(calc.e.med)}</div><div className="s">명 (중앙값)</div></div>
              <div className="rd"><div className="l">입장 · 10번 중 8번은 이 안</div><div className="v">{fmt(calc.e.lo)}~{fmt(calc.e.hi)}</div><div className="s">명</div></div>
              <div className="rd"><div className="l">메타 신청 · 10번 중 8번</div><div className="v">{fmt(calc.sig.lo)}~{fmt(calc.sig.hi)}</div><div className="s">명 · Tally로 실제로 셀 수 있는 숫자</div></div>
              <div className="rd"><div className="l">입장 1명당 광고비</div><div className="v">{fmt(calc.cpe[0])}~{fmt(calc.cpe[1])}</div><div className="s">원 (80% 범위)</div></div>
              <div className="share">
                <b>메타는 보조</b> · 행사당 목표 약 {fmt(EVENT_GOAL)}명 중 메타 몫 <span className="num" style={{ color: "var(--cyan)" }}>{calc.share[1]}%</span> <span className="muted">({calc.share[0]}~{calc.share[2]}%)</span> = 입장 {fmt(calc.e.med)}명 ({fmt(calc.e.lo)}~{fmt(calc.e.hi)})
              </div>
              <div className="verdict" style={{ borderColor: pColor(calc.e.p) }}>
                <b style={{ color: pColor(calc.e.p) }}>{verdictOf(calc.e.p)} ·</b>{" "}
                {calc.e.p >= 0.7 ? "목표를 넘을 가능성이 높습니다. 다만 입력이 모두 가정이라 시험 비행으로 확인하세요." : calc.e.p >= 0.4 ? `열 번 중 ${Math.round(calc.e.p * 10)}번 정도 목표를 넘습니다. 입력이 모두 가정입니다.` : `열 번 중 ${Math.round(calc.e.p * 10)}번만 목표를 넘습니다. 금액을 올리거나 목표를 다시 보세요.`}
              </div>
            </div>
          </div>
          <div className="pn">
            <div className="pn-h"><h2>광고비 빠른 선택</h2><span className="code hud">PRESET</span></div>
            <div className="qb" role="group" aria-label="메타 광고비">
              {[100000, 300000, 500000].map((B) => (
                <button key={B} type="button" aria-pressed={lv.budget === B} onClick={() => setKey("budget", B)}>메타 {fmt(B / 10000)}만 원 <span className="num muted" style={{ fontSize: 11 }}>3일</span></button>
              ))}
            </div>
            <p className="small muted" style={{ marginTop: 10 }}>질문 ① &quot;10만/30만/50만 원이면 몇 명?&quot;은 아래 <b>금액별 비교</b> 표에 한 번에 나옵니다.</p>
          </div>
        </section>

        <section className="main">
          <div className="pn">
            <div className="pn-h"><h2>손잡이</h2><span className="code hud">CONTROL</span></div>
            {LEVERS.map((l, i) => {
              const head = i === 0 || LEVERS[i - 1].g !== l.g ? <div className="grp hud">{l.g}</div> : null;
              return (
                <div key={l.id}>
                  {head}
                  <div className="lv">
                    <div className="row"><span className="lab">{l.lab} <Badge k={l.b} /></span><span className="val">{l.show(lv)}</span></div>
                    {l.pair ? (
                      <div className="pair">
                        {l.pair.map((k, i) => (
                          <span key={k} style={{ display: "contents" }}>
                            <label htmlFor={`as-${k}`}>{i ? "상한" : "하한"}</label>
                            <input id={`as-${k}`} type="range" min={l.min} max={l.max} step={l.step} value={lv[k]} onChange={(e) => setKey(k, Number(e.target.value))} />
                          </span>
                        ))}
                      </div>
                    ) : (
                      <input id={`as-${l.id}`} aria-label={l.lab} type="range" min={l.min} max={l.max} step={l.step} value={lv[l.id as LeverKey]} onChange={(e) => setKey(l.id as LeverKey, Number(e.target.value))} />
                    )}
                    <span className="why">{l.why}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="col">
            <div className="pn">
              <div className="pn-h"><h2>4,000개의 결과 · 메타로 들어온 입장</h2><span className="code hud">DISTRIBUTION</span></div>
              <p className="small muted" style={{ margin: 0 }}>막대 하나 = 그 인원으로 끝난 횟수. 목표선 오른쪽(밝은 막대)이 목표를 넘은 결과입니다.</p>
              <Hist a={calc.e.a} tgt={tgt} lo={calc.e.lo} hi={calc.e.hi} />
            </div>
            <div className="two">
              <div className="pn">
                <div className="pn-h"><h2>금액별 비교 · 질문 ①</h2><span className="code hud">BUDGET</span></div>
                <div className="tbl"><table>
                  <thead><tr><th>메타 3일</th><th className="r">신청 80%</th><th className="r">입장 가장 흔한 값</th><th className="r">입장 80%</th><th className="r">목표 확률</th></tr></thead>
                  <tbody>{calc.cmp.map(({ B, e, s: y }) => (
                    <tr key={B} className={B === s.budget ? "hl" : ""}><td>{man(B)}</td><td className="r">{fmt(y.lo)}~{fmt(y.hi)}</td><td className="r">{fmt(e.med)}명</td><td className="r">{fmt(e.lo)}~{fmt(e.hi)}</td><td className="r">{Math.round(e.p * 100)}%</td></tr>
                  ))}</tbody>
                </table></div>
                <p className="small muted" style={{ marginTop: 8 }}>같은 4,000개 무작위 값에 금액만 바꿔 넣었습니다. 금액을 늘리면 효율이 떨어지는 현상(포화)은 아직 넣지 않았습니다.</p>
              </div>
              <div className="pn">
                <div className="pn-h"><h2>거꾸로 찾기</h2><span className="code hud">REVERSE</span></div>
                <label className="field" htmlFor="as-prob">목표를 넘을 확률 <input id="as-prob" type="number" value={prob} min={10} max={99} step={5} onChange={(e) => setProb(Number(e.target.value) || 80)} /> % 이상</label>
                <div className="rd" style={{ marginTop: 10 }}>
                  <div className="l">필요한 최소 메타 광고비</div>
                  <div className="v">{rev === null ? "1,000만 원 초과" : man(rev)}</div>
                  <div className="s">{rev === null ? `1,000만 원으로도 입장 ${fmt(tgt)}명을 ${prob}% 확률로 넘지 못합니다` : `입장 ${fmt(tgt)}명 이상을 ${prob}% 확률로 넘기는 최소 금액 (만 원 단위 올림)`}</div>
                </div>
                <p className="warnline" style={{ marginTop: 8 }}>A안에서는 입력이 모두 가정이라 결정용이 아닙니다. 시험 비행 뒤에 다시 보세요.</p>
              </div>
            </div>
            <div className="pn">
              <div className="pn-h"><h2>범위가 넓은 이유</h2><span className="code hud">UNCERTAINTY</span></div>
              <p className="small muted" style={{ margin: 0 }}>결과 흔들림 중 어느 손잡이 몫이 큰지(로그 기준 분산 비율). 큰 쪽을 시험 비행으로 먼저 좁힙니다.</p>
              <Spread parts={spreadParts(s)} />
            </div>
          </div>
        </section>

        <div className="sec hud">시험 비행 <b>특강1 메타 결과 → 11/17 판단표</b></div>

        <section className="pn">
          <div className="pn-h"><h2>시험 비행 칸 · 특강1 메타 3일(11/13~15) 실제 값</h2><span className="code hud">TEST FLIGHT</span></div>
          <p className="small muted" style={{ margin: 0 }}>시험 <b>전에</b> 예측을 고정하고, 끝난 뒤 실제 값을 넣습니다. 처음 칸의 숫자는 <span className="bd bd-ex">예시</span>이며 저장되지 않습니다.</p>
          <div className="flight" style={{ marginTop: 10 }}>
            {([["fB", "실제 메타 광고비 (원)", 10000], ["fC", "메타 광고 클릭", 10], ["fS", "메타 신청 수 (Tally source=meta)", 1], ["fT", "참고 · 3일 오픈채팅 총 증가", 1]] as const).map(([k, lab, step]) => (
              <label key={k} htmlFor={`as-${k}`}>{lab}<input id={`as-${k}`} type="number" step={step} value={flight[k]} onChange={(e) => setFlight((f) => ({ ...f, [k]: Number(e.target.value) || 0 }))} /></label>
            ))}
            <div style={{ display: "flex", flexDirection: "column", gap: 6, justifyContent: "flex-end" }}>
              <button type="button" className="btn" onClick={() => setFixed({ ...fixPrediction(lv, flight.fB), auto: false })}>지금 손잡이로 예측 고정</button>
              <span className="small muted">{fixed.auto ? "예시로 자동 고정" : "고정함"} · {man(fixed.B)} → 메타 신청 {fmt(fixed.sLo)}~{fmt(fixed.sHi)}명 (가장 흔한 값 {fmt(fixed.sMed)})</span>
            </div>
          </div>
          <div className="diag">
            <div className="dg"><div className="l">메타 신청 (Tally source=meta)</div><div className="v">{fmt(S)}명 <span className={`pill ${BANDN[band][1]}`}>예측보다 {BANDN[band][0]}</span></div><div className="l">고정한 예측 {fmt(fixed.sLo)}~{fmt(fixed.sHi)}명</div></div>
            <div className="dg"><div className="l">단계 진단 ① 클릭당 비용</div><div className="v">{fmt(cpcObs)}원 <span className={`pill ${inC ? "p-in" : "p-warn"}`}>{inC ? "가정 범위 안" : "가정 범위 밖"}</span></div><div className="l">가정 {fmt(fixed.cpcLo)}~{fmt(fixed.cpcHi)}원</div></div>
            <div className="dg"><div className="l">단계 진단 ② 클릭 → 신청률</div><div className="v">{(csObs * 100).toFixed(1)}% <span className={`pill ${inS ? "p-in" : "p-warn"}`}>{inS ? "가정 범위 안" : "가정 범위 밖"}</span></div><div className="l">가정 {fixed.csLo}~{fixed.csHi}%</div></div>
            <div className="dg"><div className="l">메타로 들어온 입장 (추정) = 신청 × 입장 비율 {fixed.seLo}~{fixed.seHi}%</div><div className="v">{fmt((S * Math.sqrt(fixed.seLo * fixed.seHi)) / 100)}명 <span className="small muted">({fmt((S * fixed.seLo) / 100)}~{fmt((S * fixed.seHi) / 100)})</span></div><div className="l">입장 비율은 가정으로 남음</div></div>
            <div className="dg ref"><div className="l">참고 줄 · 3일 총 증가 − 평소 증가({fmt(nat)}명)</div><div className="v muted">{fmt(flight.fT - nat)}명</div><div className="l">특강 홍보(유튜브·커뮤니티)가 겹쳐 광고 몫이 부풀려짐. 판정에 쓰지 않음</div></div>
          </div>
        </section>

        <section className="pn">
          <div className="pn-h"><h2>11/17 판단표 · 특강2 광고비 후보별 입장 범위</h2><span className="code hud">DECISION TABLE</span></div>
          <p className="small muted" style={{ margin: 0 }}>특강1 메타 신청이 고정한 예측보다 <b>아래 / 범위 안 / 위</b>일 때 특강2(3일) 광고비 후보별로 메타로 들어올 입장 수(= 메타 신청 × 신청→입장 비율)입니다. 실제 결과 줄은 밝게 표시되고, 나머지 줄은 가상의 결과로 미리 계산한 값입니다. <b>결정은 박민수님이 고릅니다</b>(자동 기준 없음).</p>
          <div className="tbl" style={{ marginTop: 8 }}><table>
            <thead><tr><th>특강1 결과</th><th>가정한 특강1 값</th>{CAND.map((B) => <th key={B} className="r">{fmt(B / 10000)}만</th>)}<th>읽는 법 (제안)</th><th>선택</th></tr></thead>
            <tbody>{judge.map((r) => (
              <tr key={r.k} className={r.real ? "hl" : ""}>
                <td><span className={`pill ${BANDN[r.k][1]}`}>{BANDN[r.k][0]}</span>{r.real && <> <span className="bd bd-ex">입력값</span></>}</td>
                <td className="small">신청 <span className="num">{fmt(r.S0)}명</span> · 클릭 {fmt(r.cl)} · {fmt(r.c0)}원{!r.real && <span className="muted"> (가상)</span>}</td>
                {r.cells.map((c, j) => <td key={j} className="r"><div className="cell"><span className="m">{fmt(c.med)}명</span><span className="rg">{fmt(c.lo)}~{fmt(c.hi)}</span></div></td>)}
                <td className="small muted" style={{ minWidth: 200 }}>{READ[r.k]}</td>
                <td><select className="pick" aria-label={`${BANDN[r.k][0]}일 때 특강2 광고비 선택`} defaultValue="미정"><option>미정</option>{CAND.map((B) => <option key={B}>{man(B)}</option>)}<option>한 번 더 시험</option><option>멈춤</option></select></td>
              </tr>
            ))}</tbody>
          </table></div>
          <p className="small muted" style={{ marginTop: 8 }}>특강2 계산: 특강1에서 본 클릭당 비용과 신청률을 바탕으로, 날이 바뀌면 흔들리는 폭(손잡이 &quot;다른 날 흔들림&quot;, <Badge k="as" />)을 더했습니다. 칸 = 가장 흔한 값 · 아래 줄 = 80% 범위. 선택은 아직 저장되지 않습니다.</p>
        </section>

        <section className="pn">
          <div className="pn-h"><h2>시험 기록</h2><span className="code hud">TEST LOG</span></div>
          <p className="small muted" style={{ margin: 0 }}>손잡이가 멈출 때마다 한 줄씩 쌓입니다. <b>한 번에 하나만</b> 바꿔야 무엇 때문에 달라졌는지 알 수 있습니다. 화면을 닫으면 사라집니다.</p>
          <div className="tbl" style={{ marginTop: 8 }}><table>
            <thead><tr><th className="r">#</th><th>바뀐 손잡이</th><th className="r">메타</th><th className="r">입장 가장 흔한 값</th><th className="r">80% 범위</th><th className="r">목표 확률</th><th /></tr></thead>
            <tbody>{log.map((r, i) => (
              <tr key={r.n} className={i === 0 ? "hl" : ""}><td className="r">{r.n}</td><td className="small">{r.ch.join(" · ")}</td><td className="r">{man(r.B)}</td><td className="r">{fmt(r.med)}</td><td className="r">{fmt(r.lo)}~{fmt(r.hi)}</td><td className="r">{Math.round(r.p * 100)}%</td><td>{r.warn && <span className="pill p-warn">두 개 이상 바뀜</span>}</td></tr>
            ))}</tbody>
          </table></div>
        </section>

        <div className="sec hud">㉯ <b>등록 갈래 · 할인 3구간</b></div>

        <section className="two">
          <div className="pn">
            <div className="pn-h"><h2>할인 3구간 등록 범위</h2><span className="code hud">REGISTRATION</span></div>
            <div className="lv">
              <div className="row"><span className="lab"><label htmlFor="as-clk">결제 링크 클릭 수준</label> <Badge k="data" /></span><span className="val">{fmt(BT[clk].eb1[0] + BT[clk].eb2[0] + BT[clk].reg[0])} 클릭</span></div>
              <select id="as-clk" value={clk} onChange={(e) => setClk(Number(e.target.value) as CohortKey)}>
                <option value={14}>14기처럼 (클릭 많음)</option><option value={15}>15기처럼</option><option value={16}>16기처럼 (클릭 적음)</option>
              </select>
              <span className="why">구간별 실제 클릭 (bitly_daily, 10/28). 클릭 → 등록률은 14~16기 중 <b>기수를 먼저 뽑고</b> 그 기수의 비율로 뽑습니다(2단 추첨).</span>
            </div>
            <div className="tbl"><table>
              <thead><tr><th>구간</th><th className="r">클릭</th><th className="r">가장 흔한 값</th><th className="r">80% 범위</th></tr></thead>
              <tbody>
                {SEG.map(([k, n]) => <tr key={k}><td>{n}</td><td className="r">{fmt(BT[clk][k][0])}</td><td className="r">{reg[k].med}</td><td className="r">{reg[k].lo}~{reg[k].hi}</td></tr>)}
                <tr><td><b>3구간 합</b></td><td className="r">{fmt(BT[clk].eb1[0] + BT[clk].eb2[0] + BT[clk].reg[0])}</td><td className="r"><b>{reg.tot.med}</b></td><td className="r"><b>{reg.tot.lo}~{reg.tot.hi}</b></td></tr>
              </tbody>
            </table></div>
            <div className="lv locked" style={{ marginTop: 6 }}>
              <div className="row"><span className="lab">광고비 → 등록 효과 <Badge k="none" /></span></div>
              <div className="lockbar">잠금 · 날짜·채널·링크 어느 단위로도 귀속 불가 (10/28 점검). B안에서 엶</div>
            </div>
          </div>
          <div className="pn">
            <div className="pn-h"><h2>맞히기 시험 · 한 기수 빼고</h2><span className="code hud">BACKTEST</span></div>
            <p className="small muted" style={{ margin: 0 }}>뺀 기수의 실제 클릭을 주고 나머지 기수의 등록률로 맞혀 봅니다. 통과 = 할인 3구간 합이 80% 범위 안 + 구간 3개 중 2개 이상 범위 안.</p>
            <div className="tbl" style={{ marginTop: 8 }}><table>
              <thead><tr><th>뺀 기수</th><th className="r">실제</th><th className="r">80% 범위</th><th className="r">구간</th><th>판정</th></tr></thead>
              <tbody>{bts.map((b) => (
                <tr key={b.k}><td>{b.k}기{b.k === 16 && <span className="muted small"> 집계 중</span>}</td><td className="r">{b.tot}명</td><td className="r">{b.range.lo}~{b.range.hi}</td><td className="r">{b.segIn}/3</td>
                  <td>{b.k === 16 ? <span className="pill p-warn">참고 (임시)</span> : b.pass ? <span className="bd bd-pass">통과</span> : <span className="pill p-below">실패</span>}</td></tr>
              ))}</tbody>
            </table></div>
            <p className="small" style={{ marginTop: 8 }}>
              {btPass === 2 ? <><span className="bd bd-pass">통과</span> 14·15기 모두 통과. 기수가 2개뿐이라 신뢰도는 낮습니다.</> : <><span className="warnline">통과 {btPass}/2.</span> 클릭 → 등록률이 기수마다 5배 넘게 달라 한 기수를 빼면 잘 맞지 않습니다. 이 갈래는 <b>가정</b> 배지를 유지합니다. 무엇이 등록률을 바꿨는지(다른 결제 경로 등)는 확인 필요.</>}
            </p>
          </div>
        </section>

        <div className="sec hud">유튜브 <b>Google Ads · 스튜디오 프로모션(키콘) 따로</b></div>

        <section className="pn">
          <div className="pn-h"><h2>유튜브 광고 · 종류 확정, 날짜별 대기</h2><span className="code hud">LOCKED</span></div>
          <div className="two" style={{ gap: 12 }}>
            <div className="lv locked"><div className="row"><span className="lab">유튜브 Google Ads 하루 광고비 <Badge k="none" /></span><span className="val">—</span></div><input type="range" disabled aria-label="유튜브 Google Ads 하루 광고비" /><div className="lockbar">과거 기록 없음 · 13~16기 유튜브 광고는 전부 스튜디오 프로모션(10/29 확정)이라 사전 값이 0줄</div></div>
            <div className="lv locked"><div className="row"><span className="lab">스튜디오 프로모션(키콘) 하루 광고비 <Badge k="none" /></span><span className="val">—</span></div><input type="range" disabled aria-label="스튜디오 프로모션 하루 광고비" /><div className="lockbar">날짜별 광고비 대기 · ad_spend_daily 11/2부터. 질문 ② &quot;하루 얼마면 대기 기간 등록 유지&quot;는 17기 대기1이 끝난 뒤 판독</div></div>
          </div>
          <p className="small muted" style={{ marginTop: 6 }}>두 종류는 합치지 않습니다. 날짜별 광고비가 쌓이기 전까지는 아래처럼 <b>광고 한 줄씩만</b> 보여 주고, &quot;유튜브 합계&quot; 줄은 만들지 않습니다.</p>
          <div className="tbl"><table>
            <thead><tr><th>기수 · 광고 줄</th><th>종류</th><th className="r">클릭률</th><th className="r">클릭당 비용</th></tr></thead>
            <tbody>
              {[["13기 · 4/2", "3.65%", "108원"], ["14기 · 6/4", "3.58%", "87원"], ["15기 · 8/2", "3.57%", "62원"], ["16기 · 10/5", "3.81%", "75원"]].map(([a, b, c]) => (
                <tr key={a}><td>{a}</td><td>프로모션</td><td className="r">{b}</td><td className="r">{c}</td></tr>
              ))}
            </tbody>
          </table></div>
        </section>

        <section className="pn">
          <div className="pn-h"><h2>데이터 센서 · B안으로 넘어가려면</h2><span className="code hud">SENSOR GRID</span></div>
          <div className="sensors">
            {sensors.map((x) => (
              <div key={x.name} className="sn"><div className="h"><b>{x.name}</b><span className={`st ${x.state}`}>{x.label}</span></div><p>{x.note}</p></div>
            ))}
          </div>
          <p className="small" style={{ marginTop: 10 }}><b>한계:</b> 메타 광고 기록이 0건이라 ㉮의 입력은 모두 가정입니다. 메타 몫은 Tally 숨은 필드로 <b>신청</b>까지만 따로 셀 수 있고, 오픈채팅 입장은 링크별로 셀 수 없어 신청 → 입장 비율(56%)은 가정으로 남습니다. &quot;총 증가 − 평소 증가&quot;는 특강 홍보가 겹쳐 부풀려지므로 참고 줄로만 둡니다. 3일 결과는 메타 광고의 학습 기간 중 성과일 수 있습니다(제3자 출처, 가설).</p>
        </section>

        <footer className="small muted" style={{ borderTop: "1px solid var(--line)", paddingTop: 10 }}>
          근거: 10/28 DB 조회(읽기 전용) — 광고 32줄, 비틀리 일별 175행, 등록 333행 · 인스타 광고 클릭당 비용 14기 432원·16기 146원 · 평소 오픈채팅 증가 하루 약 24명(혜진T 시트 10/22~28) · 설계 문서 「광고시뮬레이터_조사설계_20261028」. 계산은 이 화면 안에서만 합니다(시드 고정, 목업 v0.2와 같은 숫자).
        </footer>
      </div>
    </div>
  );
}
