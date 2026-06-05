import { createClient } from "@/lib/supabase/server";
import AdForm from "./AdForm";
import EditableNumberCell from "@/components/EditableNumberCell";

export const dynamic = "force-dynamic";

const PLATFORM_LABEL: Record<string, string> = {
  youtube: "▶️ 유튜브",
  instagram: "📷 인스타",
};

export default async function AdSpendPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort: cohortName } = await searchParams;
  const sb = await createClient();
  const { data: cohort } = await sb.from("cohorts").select("id").eq("name", cohortName ?? "14기").single();
  const { data: ads } = await sb
    .from("ad_spend")
    .select("*")
    .eq("cohort_id", cohort?.id)
    .order("period_start", { ascending: true });

  const list = ads ?? [];
  const total = list.reduce((s, a) => s + (a.cost ?? 0), 0);

  return (
    <div className="bg-slate-50 min-h-screen p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-slate-800">💸 {cohortName ?? "14기"} 광고비</h1>
        <div className="text-right">
          <div className="text-xs text-slate-500">총 광고비</div>
          <div className="text-xl font-extrabold text-slate-800">{total.toLocaleString("ko-KR")}원</div>
        </div>
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
              </tr>
            </thead>
            <tbody>
              {list.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 text-slate-700">{PLATFORM_LABEL[a.platform] ?? a.platform}</td>
                  <td className="px-4 py-2 text-slate-600 max-w-xs truncate" title={a.campaign ?? ""}>
                    {a.campaign ?? "-"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{a.period_start ?? "-"}</td>
                  <td className="px-4 py-2 font-medium">
                    <EditableNumberCell table="ad_spend" id={a.id} field="cost" value={a.cost ?? 0} />
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    <EditableNumberCell table="ad_spend" id={a.id} field="impressions" value={a.impressions ?? 0} suffix="" />
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    <EditableNumberCell table="ad_spend" id={a.id} field="views" value={a.views ?? 0} suffix="" />
                  </td>
                  <td className="px-4 py-2 text-slate-600">
                    <EditableNumberCell table="ad_spend" id={a.id} field="clicks" value={a.clicks ?? 0} suffix="" />
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
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
