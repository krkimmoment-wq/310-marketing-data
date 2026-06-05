import { createClient } from "@/lib/supabase/server";
import CohortForm from "./CohortForm";

export const dynamic = "force-dynamic";

export default async function CohortsPage() {
  const sb = await createClient();
  const { data: cohorts } = await sb.from("cohorts").select("*").order("id");
  const list = cohorts ?? [];

  return (
    <div className="bg-slate-50 min-h-screen p-6 md:p-8 space-y-6">
      <h1 className="text-2xl font-extrabold text-slate-800">⚙️ 기수 관리</h1>
      <p className="text-sm text-slate-500 -mt-3">
        새 기수를 추가하면 사이드바 기수 선택기·비교·모든 화면에 자동으로 나타납니다.
      </p>

      <CohortForm />

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 font-bold text-slate-700">기수 목록 ({list.length}개)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">기수</th>
                <th className="px-4 py-2 text-left">목표</th>
                <th className="px-4 py-2 text-left">사전등록</th>
                <th className="px-4 py-2 text-left">1차 EB</th>
                <th className="px-4 py-2 text-left">2차 EB</th>
                <th className="px-4 py-2 text-left">정규</th>
                <th className="px-4 py-2 text-left">종료</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className="border-t border-slate-100">
                  <td className="px-4 py-2 font-bold text-slate-800">{c.name}</td>
                  <td className="px-4 py-2 text-slate-600">{c.goal ?? "-"}명</td>
                  <td className="px-4 py-2 text-slate-600">{c.pre_open ?? "-"}</td>
                  <td className="px-4 py-2 text-slate-600">{c.eb1_open ?? "-"}</td>
                  <td className="px-4 py-2 text-slate-600">{c.eb2_open ?? "-"}</td>
                  <td className="px-4 py-2 text-slate-600">{c.reg_open ?? "-"}</td>
                  <td className="px-4 py-2 text-slate-600">{c.ended_at ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-[12px] text-slate-500 leading-relaxed bg-white rounded-xl border border-slate-200 p-4">
        <b className="text-slate-700">새 기수 추가 후 데이터 채우는 법</b><br />
        ① 등록자 → <b>등록 관리</b> 화면에서 입력 · ② 광고비 → <b>광고비</b> 화면 · ③ 비틀리·일별 → sync 실행 (또는 시트 연동)<br />
        기수 선택기에서 새 기수를 고르면 그 기수 데이터만 표시됩니다.
      </div>
    </div>
  );
}
