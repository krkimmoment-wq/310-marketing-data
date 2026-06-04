import { getKpi } from "@/lib/kpi";

export const dynamic = "force-dynamic";

const won = (n: number) => "₩" + n.toLocaleString("ko-KR");

const SECTIONS = ["사전등록", "1차EB", "대기1", "2차EB", "대기2", "정규", "추가"];

export default async function Dashboard() {
  const kpi = await getKpi("14기");
  if (!kpi) {
    return <div className="text-slate-500">14기 데이터를 찾을 수 없습니다.</div>;
  }

  const cards = [
    { label: "실등록", value: `${kpi.realRegs}명`, sub: `목표 ${kpi.goal}명 · ${kpi.progressPct}%`, color: "text-blue-600" },
    { label: "ROAS", value: `${kpi.roas}배`, sub: `광고 ₩1 → 매출 ₩${kpi.roas}`, color: "text-emerald-600" },
    { label: "매출", value: won(kpi.totalRevenue), sub: `광고비 ${won(kpi.totalAd)}`, color: "text-slate-800" },
    { label: "CAC", value: won(kpi.cac), sub: "1명 등록당 광고비", color: "text-amber-600" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">📊 {kpi.cohortName} 운영 대시보드</h1>
          <p className="text-sm text-slate-500 mt-1">실시간 · Supabase 연동</p>
        </div>
      </div>

      {/* 진척 게이지 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-2">
          <span className="font-bold text-slate-700">목표 달성률</span>
          <span className="text-sm text-slate-500">{kpi.realRegs} / {kpi.goal}명</span>
        </div>
        <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-600 transition-all"
            style={{ width: `${Math.min(kpi.progressPct, 100)}%` }}
          />
        </div>
        <div className="text-right text-2xl font-extrabold text-blue-600 mt-2">{kpi.progressPct}%</div>
      </div>

      {/* KPI 카드 4개 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-5">
            <div className="text-sm text-slate-500">{c.label}</div>
            <div className={`text-2xl font-extrabold mt-1 ${c.color}`}>{c.value}</div>
            <div className="text-xs text-slate-400 mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      {/* 구간별 등록 */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="font-bold text-slate-700 mb-4">구간별 실등록</div>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {SECTIONS.map((s) => (
            <div key={s} className="text-center p-3 rounded-xl bg-slate-50">
              <div className="text-xs text-slate-500">{s}</div>
              <div className="text-xl font-bold text-slate-800 mt-1">{kpi.bySection[s] ?? 0}</div>
            </div>
          ))}
        </div>
      </div>

      <p className="text-xs text-slate-400">
        ※ 1차 EB OPEN: {kpi.eb1Open} · 기수 종료: {kpi.endedAt}
      </p>
    </div>
  );
}
