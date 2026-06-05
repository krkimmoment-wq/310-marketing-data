import { getCalendar } from "@/lib/calendar";
import CalDayCell from "./CalDayCell";

export const dynamic = "force-dynamic";

const DARK_BG: React.CSSProperties = {
  background:
    "radial-gradient(1200px 600px at 80% -10%, rgba(0,229,255,0.10), transparent), radial-gradient(900px 500px at 0% 110%, rgba(59,130,246,0.10), transparent), #070b16",
};

const DOW = ["일", "월", "화", "수", "목", "금", "토"];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort } = await searchParams;
  const data = await getCalendar(cohort ?? "14기");
  if (!data) {
    return (
      <div style={DARK_BG} className="min-h-screen p-8 text-slate-300">
        14기 데이터를 찾을 수 없습니다.
      </div>
    );
  }

  return (
    <div style={DARK_BG} className="scanlines min-h-screen p-6 md:p-8 text-slate-100">
      <div className="mb-6">
        <h1 className="font-hud text-2xl md:text-3xl font-black tracking-widest jarvis-glow jarvis-neon">
          {data.cohortName} 모집 캘린더
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          일별 등록 · 누적 · 분기점 · 누적 등록 {data.total}명 (등록관리 실시간 연동)
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {data.months.map((mo) => (
          <div key={`${mo.year}-${mo.month}`} className="jarvis-card p-4">
            <div className="font-hud text-sm text-cyan-300 mb-3">{mo.label}</div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {DOW.map((d, i) => (
                <div
                  key={d}
                  className={`text-[11px] font-hud pb-1 ${
                    i === 0 ? "text-rose-400/80" : i === 6 ? "text-cyan-400/80" : "text-slate-500"
                  }`}
                >
                  {d}
                </div>
              ))}
              {mo.weeks.map((wk, wi) =>
                wk.map((cell, ci) =>
                  cell ? (
                    <CalDayCell key={cell.date} cohortId={data.cohortId} cell={cell} dow={ci} />
                  ) : (
                    <div key={`${wi}-${ci}`} className="aspect-square" />
                  )
                )
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="text-[11px] text-slate-500 mt-4 flex flex-wrap gap-4">
        <span className="text-amber-300">📝 날짜 클릭 → 특이사항·액션 입력</span>
        <span><span className="text-emerald-300">+N</span> 신규 등록</span>
        <span><span className="text-rose-300">-N</span> 환불</span>
        <span className="text-slate-500">우상단 = 누적</span>
        <span><span className="text-cyan-300">파란 칸</span> = 분기점</span>
        <span>출처 cohort_daily (일별 등록 흐름)</span>
      </div>
    </div>
  );
}
