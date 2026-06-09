import { createClient } from "@/lib/supabase/server";
import CohortForm from "./CohortForm";
import CohortRow from "./CohortRow";

export const dynamic = "force-dynamic";

const DARK_BG: React.CSSProperties = {
  background:
    "radial-gradient(1200px 600px at 80% -10%, rgba(0,229,255,0.10), transparent), radial-gradient(900px 500px at 0% 110%, rgba(59,130,246,0.10), transparent), #070b16",
};

export default async function CohortsPage() {
  const sb = await createClient();
  const { data: cohorts } = await sb.from("cohorts").select("*").order("id");
  const list = cohorts ?? [];

  return (
    <div style={DARK_BG} className="scanlines min-h-screen p-6 md:p-8 space-y-6 text-slate-100">
      <h1 className="font-hud text-2xl md:text-3xl font-black tracking-widest jarvis-glow jarvis-neon">⚙️ 기수 관리</h1>
      <p className="text-sm text-slate-400 -mt-3">
        새 기수를 추가하면 사이드바 기수 선택기·비교·모든 화면에 자동으로 나타납니다.
      </p>

      <CohortForm />

      <div className="jarvis-card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 font-bold text-slate-200">기수 목록 ({list.length}개)</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/40 text-slate-400">
              <tr>
                <th className="px-4 py-2 text-left">기수</th>
                <th className="px-4 py-2 text-left">목표</th>
                <th className="px-4 py-2 text-left">사전등록</th>
                <th className="px-4 py-2 text-left">1차 EB</th>
                <th className="px-4 py-2 text-left">2차 EB</th>
                <th className="px-4 py-2 text-left">정규</th>
                <th className="px-4 py-2 text-left">종료</th>
                <th className="px-4 py-2 text-left">관리</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <CohortRow key={c.id} c={c} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="text-[12px] text-slate-400 leading-relaxed jarvis-card p-4">
        <b className="text-slate-200">새 기수 추가 후 데이터 채우는 법</b><br />
        ① 등록자 → <b>등록 관리</b> 화면에서 입력 · ② 광고비 → <b>광고비</b> 화면 · ③ 비틀리·일별 → sync 실행 (또는 시트 연동)<br />
        기수 선택기에서 새 기수를 고르면 그 기수 데이터만 표시됩니다.
      </div>
    </div>
  );
}
