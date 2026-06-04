import { createClient } from "@/lib/supabase/server";
import RegForm from "./RegForm";

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

  return (
    <div className="bg-slate-50 min-h-screen p-6 md:p-8 space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-800">📝 14기 등록 관리</h1>

      <RegForm cohortId={cohort?.id} />

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 font-bold text-slate-700">
          등록자 목록 ({list.length}명)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">이름</th>
                <th className="px-4 py-2 text-left">등록일</th>
                <th className="px-4 py-2 text-left">구간</th>
                <th className="px-4 py-2 text-left">채널</th>
                <th className="px-4 py-2 text-left">SNS</th>
                <th className="px-4 py-2 text-left">입금</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-medium text-slate-800">{r.name}</td>
                  <td className="px-4 py-2 text-slate-600">{r.reg_date}</td>
                  <td className="px-4 py-2 text-slate-600">{r.section}</td>
                  <td className="px-4 py-2 text-slate-600">
                    {r.channel === "tally" ? "🅰️ Tally" : "🅱️ 카카오"}
                  </td>
                  <td className="px-4 py-2 text-slate-600">{r.sns_channel ?? "-"}</td>
                  <td className="px-4 py-2">
                    {r.payment === "미입금" ? (
                      <span className="text-amber-600 font-medium">⏳ 미입금</span>
                    ) : (
                      <span className="text-emerald-600">✅ 입금</span>
                    )}
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    등록자가 없습니다. 위에서 추가하세요.
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
