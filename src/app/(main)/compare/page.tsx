import { getKpi } from "@/lib/kpi";
import { getDayComparison } from "@/lib/comparison";
import { sectionDailyRows } from "@/lib/daily";
import { createClient } from "@/lib/supabase/server";
import DayComparisonChart from "@/components/DayComparisonChart";
import CompareSelector from "./CompareSelector";

export const dynamic = "force-dynamic";

const DARK_BG: React.CSSProperties = {
  background:
    "radial-gradient(1200px 600px at 80% -10%, rgba(0,229,255,0.10), transparent), radial-gradient(900px 500px at 0% 110%, rgba(59,130,246,0.10), transparent), #070b16",
};

const CH = [
  { key: "ig", label: "인스타", color: "#e1306c" },
  { key: "yt", label: "유튜브", color: "#ff5e57" },
  { key: "kk", label: "카카오", color: "#ffd23f" },
  { key: "direct", label: "다이렉트", color: "#4d8cff" },
  { key: "tt", label: "틱톡", color: "#22d3ee" },
  { key: "other", label: "기타", color: "#a0a4b8" },
] as const;

const BITLY_ORDER = ["사전등록", "1차 얼리버드", "얼리버드 간 대기", "2차 얼리버드", "정규모집 전 대기", "정규모집", "추가등록"];
const DAILY_ORDER = ["사전등록", "1차EB", "대기1", "2차EB", "대기2", "정규", "추가"];
// 비틀리 구간명 → 등록(cohort_daily) 구간명 매핑 (전환율 계산용)
const SEC_MAP: Record<string, string> = {
  사전등록: "사전등록", "1차 얼리버드": "1차EB", "얼리버드 간 대기": "대기1",
  "2차 얼리버드": "2차EB", "정규모집 전 대기": "대기2", 정규모집: "정규", 추가등록: "추가",
};

type Row = { cohort_id: number; section: string; total?: number; new_count?: number; refund_count?: number; date?: string; [k: string]: unknown };

// 구간별 채널 비중 (한 기수, 한 구간)
function mix(s: Row | undefined) {
  if (!s) return null;
  const tot = (s.total as number) || 0;
  const chans = CH.map((c) => ({ ...c, clicks: (s[c.key] as number) ?? 0, pct: tot ? Math.round((((s[c.key] as number) ?? 0) / tot) * 100) : 0 }))
    .filter((c) => c.clicks > 0)
    .sort((a, b) => b.clicks - a.clicks);
  return { total: tot, chans, top: chans.slice(0, 3).map((c) => `${c.label} ${c.pct}%`).join(" · ") };
}

// 구간별 일평균 등록 (cohort_daily: 순등록 ÷ 구간 기간일수)
function dailyAvg(rows: Row[], cohortId: number) {
  const by: Record<string, { net: number; dates: Set<string> }> = {};
  for (const r of rows.filter((r) => r.cohort_id === cohortId)) {
    const s = (r.section ?? "").replace(/\s/g, "");
    by[s] = by[s] || { net: 0, dates: new Set() };
    by[s].net += ((r.new_count as number) ?? 0) - ((r.refund_count as number) ?? 0);
    if (r.date) by[s].dates.add(r.date);
  }
  const out: Record<string, number> = {};
  for (const [s, o] of Object.entries(by)) {
    const ds = [...o.dates].sort();
    const days = ds.length > 1 ? (new Date(ds[ds.length - 1]).getTime() - new Date(ds[0]).getTime()) / 86400000 + 1 : 1;
    out[s] = Math.round((o.net / days) * 10) / 10;
  }
  return out;
}

export default async function ComparePage({ searchParams }: { searchParams: Promise<{ a?: string; b?: string }> }) {
  const sb = await createClient();
  const { data: cohorts } = await sb.from("cohorts").select("id, name").order("id");
  const list = cohorts ?? [];
  const { a: aParam, b: bParam } = await searchParams;
  const aName = aParam ?? list[0]?.name ?? "14기";
  const bName = bParam ?? list[1]?.name ?? "13기";
  const aId = list.find((c) => c.name === aName)?.id;
  const bId = list.find((c) => c.name === bName)?.id;

  const [a, b, cmp, { data: sections }, aRows, bRows] = await Promise.all([
    getKpi(aName),
    getKpi(bName),
    getDayComparison([aName, bName]),
    sb.from("bitly_section").select("*"),
    aId ? sectionDailyRows(sb, aId) : Promise.resolve([]),
    bId ? sectionDailyRows(sb, bId) : Promise.resolve([]),
  ]);

  const secRows = (sections ?? []) as Row[];
  // 등록관리 연동: 각 기수 registrations 있으면 그걸로, 없으면 cohort_daily (sectionDailyRows 내부 분기)
  const dayRows = [...aRows, ...bRows] as Row[];
  const won = (n: number) => "₩" + n.toLocaleString("ko-KR");

  const metrics = a && b ? [
    { label: "실등록", a: `${a.realRegs}명`, b: `${b.realRegs}명` },
    { label: "매출", a: won(a.totalRevenue), b: won(b.totalRevenue) },
    { label: "ROAS", a: `${a.roas}배`, b: `${b.roas}배` },
    { label: "CAC", a: won(a.cac), b: won(b.cac) },
  ] : [];

  // 구간별 비틀리 (union)
  const bitlySecs = BITLY_ORDER.filter((sec) => secRows.some((r) => r.section === sec));
  // 구간별 일평균
  const avgA = dailyAvg(dayRows, aId ?? -1);
  const avgB = dailyAvg(dayRows, bId ?? -1);
  const sameSel = aName === bName;

  return (
    <div style={DARK_BG} className="scanlines min-h-screen p-6 md:p-8 text-slate-100">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <h1 className="font-hud text-2xl md:text-3xl font-black tracking-widest jarvis-glow jarvis-neon">기수별 비교</h1>
        <CompareSelector cohorts={list} a={aName} b={bName} />
      </div>

      {sameSel ? (
        <div className="jarvis-card p-6 text-slate-300">서로 다른 두 기수를 선택하세요.</div>
      ) : (
        <>
          {cmp && <div className="mb-6"><DayComparisonChart data={cmp} /></div>}

          {/* KPI 비교 */}
          <div className="jarvis-card p-5 mb-6">
            <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80 mb-4">KPI 비교</div>
            <table className="w-full text-sm">
              <thead className="text-slate-400"><tr className="text-left">
                <th className="py-2">지표</th><th className="py-2 text-right text-cyan-300">{aName}</th><th className="py-2 text-right text-amber-300">{bName}</th>
              </tr></thead>
              <tbody>
                {metrics.map((m) => (
                  <tr key={m.label} className="border-t border-slate-800">
                    <td className="py-2.5 text-slate-300">{m.label}</td>
                    <td className="py-2.5 text-right font-hud text-cyan-200">{m.a}</td>
                    <td className="py-2.5 text-right font-hud text-amber-200">{m.b}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* 구간별 일평균 등록 */}
          <div className="jarvis-card p-5 mb-6">
            <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80 mb-4">구간별 일평균 등록 (명/일)</div>
            <div className="space-y-2.5">
              {DAILY_ORDER.filter((s) => avgA[s] != null || avgB[s] != null).map((s) => {
                const va = avgA[s] ?? 0, vb = avgB[s] ?? 0;
                const max = Math.max(va, vb, 1);
                const diff = vb > 0 ? Math.round(((va - vb) / vb) * 100) : null;
                return (
                  <div key={s} className="grid grid-cols-[64px_1fr_56px] items-center gap-2">
                    <span className="text-xs text-slate-300">{s}</span>
                    <div className="space-y-1">
                      <div className="h-4 rounded bg-slate-800 overflow-hidden flex items-center" title={`${aName} ${va}`}>
                        <div className="h-full bg-cyan-500/80 flex items-center px-1.5 anim-fx" style={{ width: `${(va / max) * 100}%`, minWidth: va ? 40 : 0 }}>
                          <span className="text-[9px] text-white whitespace-nowrap">{aName} {va}</span>
                        </div>
                      </div>
                      <div className="h-4 rounded bg-slate-800 overflow-hidden flex items-center" title={`${bName} ${vb}`}>
                        <div className="h-full bg-amber-500/70 flex items-center px-1.5 anim-fx" style={{ width: `${(vb / max) * 100}%`, minWidth: vb ? 40 : 0 }}>
                          <span className="text-[9px] text-white whitespace-nowrap">{bName} {vb}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-[11px] text-right font-bold ${diff == null ? "text-slate-500" : diff >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                      {va === 0 ? "시작 전" : diff == null ? "신규" : `${diff >= 0 ? "+" : ""}${diff}%`}
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="text-[10px] text-slate-500 mt-2">{aName} 일평균 vs {bName} 일평균 · cohort_daily 순등록÷구간기간</div>
          </div>

          {/* 구간별 비틀리 트래픽 비교 */}
          <div className="jarvis-card p-5">
            <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80 mb-4">구간별 비틀리 트래픽 비교 (채널 비중)</div>
            <div className="space-y-4">
              {bitlySecs.map((sec) => {
                const ma = mix(secRows.find((r) => r.cohort_id === aId && r.section === sec));
                const mb = mix(secRows.find((r) => r.cohort_id === bId && r.section === sec));
                const diff = ma && mb && mb.total > 0 ? Math.round(((ma.total - mb.total) / mb.total) * 100) : null;
                return (
                  <div key={sec}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-slate-200 font-medium">{sec}</span>
                      <span className="text-slate-400 text-xs">
                        {aName} {ma ? ma.total.toLocaleString("ko-KR") : "—"} / {bName} {mb ? mb.total.toLocaleString("ko-KR") : "—"}
                        {diff != null && <span className={diff >= 0 ? " text-emerald-300" : " text-rose-300"}> ({diff >= 0 ? "+" : ""}{diff}%)</span>}
                      </span>
                    </div>
                    {[{ n: aName, m: ma }, { n: bName, m: mb }].map(({ n, m }) =>
                      m ? (
                        <div key={n} className="flex h-4 rounded overflow-hidden bg-slate-800 mb-1 anim-fx">
                          {m.chans.filter((c) => c.pct > 0).map((c) => (
                            <div key={c.key} className="h-full flex items-center justify-center" style={{ width: `${c.pct}%`, background: c.color }} title={`${n} ${c.label} ${c.clicks}회 (${c.pct}%)`}>
                              {c.pct >= 14 && <span className="text-[8px] text-white font-bold">{c.pct}%</span>}
                            </div>
                          ))}
                        </div>
                      ) : null
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-slate-400">
              {CH.map((c) => (<span key={c.key}><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: c.color }} />{c.label}</span>))}
            </div>
          </div>

          {/* 클릭 → 등록 전환율 (그로스: 트래픽이 등록으로 얼마나) */}
          <div className="jarvis-card p-5 mt-6">
            <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80 mb-4">
              클릭 → 등록 전환율 (구간별 · 비틀리 클릭 대비 등록)
            </div>
            <table className="w-full text-sm">
              <thead className="text-slate-400"><tr className="text-left">
                <th className="py-2">구간</th>
                <th className="py-2 text-right text-cyan-300">{aName} (등록/클릭)</th>
                <th className="py-2 text-right text-amber-300">{bName} (등록/클릭)</th>
              </tr></thead>
              <tbody>
                {bitlySecs.map((bsec) => {
                  const dsec = SEC_MAP[bsec];
                  const click = (id?: number) => (secRows.find((r) => r.cohort_id === id && r.section === bsec)?.total as number) ?? 0;
                  const reg = (id?: number) =>
                    dayRows.filter((r) => r.cohort_id === id && (r.section ?? "").replace(/\s/g, "") === dsec)
                      .reduce((s, r) => s + (((r.new_count as number) ?? 0) - ((r.refund_count as number) ?? 0)), 0);
                  const conv = (id?: number) => { const c = click(id); return c ? Math.round((reg(id) / c) * 1000) / 10 : null; };
                  const ca = conv(aId), cb = conv(bId);
                  const fmt = (id?: number, v?: number | null) => (v == null ? "—" : `${reg(id)}/${click(id).toLocaleString("ko-KR")} = ${v}%`);
                  return (
                    <tr key={bsec} className="border-t border-slate-800">
                      <td className="py-2.5 text-slate-300">{bsec}</td>
                      <td className="py-2.5 text-right font-hud text-cyan-200 text-xs">{fmt(aId, ca)}</td>
                      <td className="py-2.5 text-right font-hud text-amber-200 text-xs">{fmt(bId, cb)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <div className="text-[10px] text-slate-500 mt-2">
              전환율 = 구간 순등록 ÷ 비틀리 클릭. 높을수록 트래픽이 등록으로 잘 전환된 것 (콘텐츠·랜딩 효율).
            </div>
          </div>
        </>
      )}
    </div>
  );
}
