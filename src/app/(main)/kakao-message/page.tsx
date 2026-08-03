import { createClient } from "@/lib/supabase/server";
import KakaoMsgForm from "./KakaoMsgForm";
import KakaoMsgRow from "./KakaoMsgRow";

export const dynamic = "force-dynamic";

const DARK_BG: React.CSSProperties = {
  background:
    "radial-gradient(1200px 600px at 80% -10%, rgba(0,229,255,0.10), transparent), radial-gradient(900px 500px at 0% 110%, rgba(59,130,246,0.10), transparent), #070b16",
};

export default async function KakaoMessagePage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort: cohortName } = await searchParams;
  const sb = await createClient();
  const { data: cohort } = await sb.from("cohorts").select("id").eq("name", cohortName ?? "14기").single();
  const { data: msgs } = await sb
    .from("kakao_message")
    .select("*")
    .eq("cohort_id", cohort?.id)
    .order("sent_date", { ascending: true });

  const list = msgs ?? [];
  const totalCost = list.reduce((s, m) => s + (m.total_cost ?? 0), 0);

  // 파생지표 — 클릭률(클릭/발송) / CPC(비용/클릭) / 총 발송수 / 총 발송비용
  const sent = list.reduce((s, m) => s + (m.sent_count ?? 0), 0);
  const clk = list.reduce((s, m) => s + (m.click_count ?? 0), 0);
  const ctr = sent ? Math.round((clk / sent) * 1000) / 10 : 0; // 클릭 ÷ 발송
  const cpc = clk ? Math.round(totalCost / clk) : 0; // 비용 ÷ 클릭
  const won = (n: number) => n.toLocaleString("ko-KR");
  const cards = [
    { label: "클릭률 · 클릭/발송", value: `${ctr}%`, sub: `클릭 ${won(clk)} / 발송 ${won(sent)}` },
    { label: "CPC · 클릭당 비용", value: `₩${won(cpc)}`, sub: `클릭 ${won(clk)}회` },
    { label: "총 발송수", value: won(sent), sub: `메시지 ${list.length}건` },
    { label: "총 발송비용", value: `₩${won(totalCost)}`, sub: "누적 발송비" },
  ];

  return (
    <div style={DARK_BG} className="scanlines min-h-screen p-6 md:p-8 space-y-6 text-slate-100">
      <div className="flex items-center justify-between">
        <h1 className="font-hud text-2xl md:text-3xl font-black tracking-widest jarvis-glow jarvis-neon">💬 {cohortName ?? "14기"} 카카오 메시지</h1>
        <div className="text-right">
          <div className="text-xs text-slate-400">총 발송비용</div>
          <div className="text-xl font-extrabold text-slate-100">{totalCost.toLocaleString("ko-KR")}원</div>
        </div>
      </div>

      {/* 파생지표 요약 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((c, i) => (
          <div key={c.label} className={`jarvis-card${i === 0 ? " jarvis-accent" : ""} p-5`}>
            <div className="text-xs text-slate-400">{c.label}</div>
            <div className="font-hud text-2xl font-black text-cyan-300 mt-2 jarvis-glow">{c.value}</div>
            <div className="text-[11px] text-slate-400 mt-1">{c.sub}</div>
          </div>
        ))}
      </div>

      <KakaoMsgForm cohortId={cohort?.id} />

      <div className="jarvis-card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 font-bold text-slate-200">
          카카오 메시지 목록 ({list.length}건)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/40 text-slate-400">
              <tr>
                <th className="px-4 py-2 text-left">제목</th>
                <th className="px-4 py-2 text-left">발송일</th>
                <th className="px-4 py-2 text-left">발송수</th>
                <th className="px-4 py-2 text-left">노출</th>
                <th className="px-4 py-2 text-left">클릭</th>
                <th className="px-4 py-2 text-left">클릭률</th>
                <th className="px-4 py-2 text-left">발송비용</th>
                <th className="px-4 py-2 text-left">관리</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <KakaoMsgRow key={m.id} m={m} />
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                    카카오 메시지 내역이 없습니다. 위에서 추가하세요.
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
