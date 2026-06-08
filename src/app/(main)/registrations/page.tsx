import { createClient } from "@/lib/supabase/server";
import RegForm from "./RegForm";
import RegList from "./RegList";

export const dynamic = "force-dynamic";

export default async function RegistrationsPage() {
  const sb = await createClient();
  const { data: cohort } = await sb.from("cohorts").select("id").eq("name", "14기").single();
  const { data: regs } = await sb
    .from("registrations")
    .select("*")
    .eq("cohort_id", cohort?.id)
    .order("reg_date", { ascending: true });

  const list = regs ?? [];

  // 결제 플랫폼별 매출 (사진 재현): 매출=입금완료&미기수이전(환불 포함) / 환불=is_refund 차감 / 순매출=매출-환불
  const PLATFORMS = ["홈페이지", "유튜브", "기타"];
  const platRow = (plat: string) => {
    const rows = list.filter((r) => (r.pay_platform ?? "홈페이지") === plat);
    const gross = rows.filter((r) => r.payment === "입금완료" && !r.is_transfer).reduce((s, r) => s + (r.amount ?? 0), 0);
    const refund = rows.filter((r) => r.is_refund && !r.is_transfer).reduce((s, r) => s + (r.amount ?? 0), 0);
    return { plat, gross, refund, net: gross - refund };
  };
  const platRows = PLATFORMS.map(platRow);
  const tot = platRows.reduce((a, p) => ({ gross: a.gross + p.gross, refund: a.refund + p.refund, net: a.net + p.net }), { gross: 0, refund: 0, net: 0 });
  const won = (n: number) => n.toLocaleString("ko-KR");

  return (
    <div className="bg-slate-50 min-h-screen p-6 md:p-8 space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-800">📝 14기 등록 관리</h1>

      {/* 결제 플랫폼별 매출 요약 */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 font-bold text-slate-700">💳 결제 플랫폼별 매출</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">결제처</th>
                <th className="px-4 py-2 text-right">매출액</th>
                <th className="px-4 py-2 text-right">환불</th>
                <th className="px-4 py-2 text-right">순매출</th>
              </tr>
            </thead>
            <tbody>
              {platRows.map((p) => (
                <tr key={p.plat} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-700">{p.plat}</td>
                  <td className="px-4 py-2 text-right text-slate-700">{won(p.gross)}원</td>
                  <td className="px-4 py-2 text-right text-rose-500">{p.refund ? "-" + won(p.refund) : "0"}</td>
                  <td className="px-4 py-2 text-right font-bold text-emerald-600">{won(p.net)}원</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-200 bg-slate-50 font-bold">
                <td className="px-4 py-2 text-slate-800">총 합계</td>
                <td className="px-4 py-2 text-right text-slate-800">{won(tot.gross)}원</td>
                <td className="px-4 py-2 text-right text-rose-600">{tot.refund ? "-" + won(tot.refund) : "0"}</td>
                <td className="px-4 py-2 text-right text-emerald-700">{won(tot.net)}원</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <RegForm cohortId={cohort?.id} />

      <RegList regs={list} />
    </div>
  );
}
