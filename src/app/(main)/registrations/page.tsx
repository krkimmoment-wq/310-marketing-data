import { createClient } from "@/lib/supabase/server";
import RegForm from "./RegForm";
import RegList from "./RegList";

export const dynamic = "force-dynamic";

const DARK_BG: React.CSSProperties = {
  background:
    "radial-gradient(1200px 600px at 80% -10%, rgba(0,229,255,0.10), transparent), radial-gradient(900px 500px at 0% 110%, rgba(59,130,246,0.10), transparent), #070b16",
};

export default async function RegistrationsPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort: cohortName } = await searchParams;
  const sb = await createClient();
  const { data: cohort } = await sb.from("cohorts").select("id").eq("name", cohortName ?? "14기").single();
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
    <div style={DARK_BG} className="scanlines min-h-screen p-6 md:p-8 space-y-6 text-slate-100">
      <h1 className="font-hud text-2xl md:text-3xl font-black tracking-widest jarvis-glow jarvis-neon">📝 {cohortName ?? "14기"} 등록 관리</h1>

      {/* 결제 플랫폼별 매출 요약 */}
      <div className="jarvis-card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 font-bold text-slate-200">💳 결제 플랫폼별 매출</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/40 text-slate-400">
              <tr>
                <th className="px-4 py-2 text-left">결제처</th>
                <th className="px-4 py-2 text-right">매출액</th>
                <th className="px-4 py-2 text-right">환불</th>
                <th className="px-4 py-2 text-right">순매출</th>
              </tr>
            </thead>
            <tbody>
              {platRows.map((p) => (
                <tr key={p.plat} className="border-t border-slate-800">
                  <td className="px-4 py-2 font-medium text-slate-200">{p.plat}</td>
                  <td className="px-4 py-2 text-right text-slate-200">{won(p.gross)}원</td>
                  <td className="px-4 py-2 text-right text-rose-400">{p.refund ? "-" + won(p.refund) : "0"}</td>
                  <td className="px-4 py-2 text-right font-bold text-emerald-300">{won(p.net)}원</td>
                </tr>
              ))}
              <tr className="border-t-2 border-slate-700 bg-slate-800/60 font-bold">
                <td className="px-4 py-2 text-slate-100">총 합계</td>
                <td className="px-4 py-2 text-right text-slate-100">{won(tot.gross)}원</td>
                <td className="px-4 py-2 text-right text-rose-300">{tot.refund ? "-" + won(tot.refund) : "0"}</td>
                <td className="px-4 py-2 text-right text-emerald-300">{won(tot.net)}원</td>
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
