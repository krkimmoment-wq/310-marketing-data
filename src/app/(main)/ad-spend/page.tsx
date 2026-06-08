import { createClient } from "@/lib/supabase/server";
import AdForm from "./AdForm";
import AdRow from "./AdRow";

export const dynamic = "force-dynamic";

export default async function AdSpendPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort: cohortName } = await searchParams;
  const sb = await createClient();
  const { data: cohort } = await sb.from("cohorts").select("id").eq("name", cohortName ?? "14기").single();
  const [{ data: ads }, { data: regs }] = await Promise.all([
    sb.from("ad_spend").select("*").eq("cohort_id", cohort?.id).order("period_start", { ascending: true }),
    sb.from("registrations").select("payment, is_refund, is_transfer").eq("cohort_id", cohort?.id),
  ]);

  const list = ads ?? [];
  const total = list.reduce((s, a) => s + (a.cost ?? 0), 0);

  // 파생지표 — CPC(클릭당) / CTR(클릭률) / CPM(1000노출당) / CAC(등록당)
  const imp = list.reduce((s, a) => s + (a.impressions ?? 0), 0);
  const clk = list.reduce((s, a) => s + (a.clicks ?? 0), 0);
  const realN = (regs ?? []).filter((r) => r.payment === "입금완료" && !r.is_refund && !r.is_transfer).length;
  const cpc = clk ? Math.round(total / clk) : 0;
  const ctr = imp ? Math.round((clk / imp) * 1000) / 10 : 0;
  const cpm = imp ? Math.round((total / imp) * 1000) : 0;
  const cac = realN ? Math.round(total / realN) : 0;
  const won = (n: number) => n.toLocaleString("ko-KR");
  const cards = [
    { label: "CPC · 클릭당 비용", value: `₩${won(cpc)}`, sub: `클릭 ${won(clk)}회` },
    { label: "CTR · 클릭률", value: `${ctr}%`, sub: `노출 ${won(imp)}` },
    { label: "CPM · 1천노출당", value: `₩${won(cpm)}`, sub: "노출 효율" },
    { label: "CAC · 등록당 비용", value: `₩${won(cac)}`, sub: `실등록 ${realN}명` },
  ];

  return (
    <div className="bg-slate-50 min-h-screen p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-800">💸 {cohortName ?? "14기"} 광고비</h1>
        <div className="text-right">
          <div className="text-xs text-slate-500">총 광고비</div>
          <div className="text-xl font-extrabold text-slate-800">{total.toLocaleString("ko-KR")}원</div>
        </div>
      </div>

      {/* 파생지표 요약 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-2xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500">{c.label}</div>
            <div className="text-xl font-extrabold text-slate-800 mt-1">{c.value}</div>
            <div className="text-[11px] text-slate-400 mt-0.5">{c.sub}</div>
          </div>
        ))}
      </div>

      <AdForm cohortId={cohort?.id} />

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 font-bold text-slate-700">
          광고 집행 목록 ({list.length}건)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">플랫폼</th>
                <th className="px-4 py-2 text-left">캠페인</th>
                <th className="px-4 py-2 text-left">집행 시작</th>
                <th className="px-4 py-2 text-left">광고비</th>
                <th className="px-4 py-2 text-left">노출</th>
                <th className="px-4 py-2 text-left">조회/도달</th>
                <th className="px-4 py-2 text-left">클릭/방문</th>
                <th className="px-4 py-2 text-left">관리</th>
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <AdRow key={a.id} a={a} />
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    광고비 내역이 없습니다. 위에서 추가하세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
