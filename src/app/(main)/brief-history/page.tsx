import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const DARK_BG: React.CSSProperties = {
  background:
    "radial-gradient(1200px 600px at 80% -10%, rgba(0,229,255,0.10), transparent), radial-gradient(900px 500px at 0% 110%, rgba(59,130,246,0.10), transparent), #070b16",
};

type Metrics = {
  realRegs?: number; progressPct?: number; roas?: number;
  cac?: number; currentPace?: number; projectedFinal?: number; sameOther?: number;
};
type Row = { snapshot_date: string; insights: { tone: string; text: string }[]; metrics: Metrics };

const toneColor: Record<string, string> = {
  good: "text-emerald-300 border-emerald-400/40",
  warn: "text-amber-300 border-amber-400/40",
  info: "text-cyan-200 border-cyan-400/40",
};
const toneIcon: Record<string, string> = { good: "✅", warn: "⚠️", info: "▸" };

// 전일 대비 증감 표시
function delta(cur?: number, prev?: number, unit = "", digits = 0) {
  if (cur == null || prev == null) return null;
  const d = cur - prev;
  if (Math.abs(d) < Math.pow(10, -digits) / 2) return <span className="text-slate-500">―</span>;
  const cls = d > 0 ? "text-emerald-300" : "text-rose-300";
  return <span className={cls}>{d > 0 ? "▲" : "▼"}{Math.abs(d).toFixed(digits)}{unit}</span>;
}

export default async function BriefHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort: cohortName } = await searchParams;
  const sb = await createClient();
  const { data: c } = await sb.from("cohorts").select("id").eq("name", cohortName ?? "14기").single();
  const { data: rows } = await sb
    .from("brief_history")
    .select("snapshot_date, insights, metrics")
    .eq("cohort_id", c?.id)
    .order("snapshot_date", { ascending: true });

  const list = (rows ?? []) as Row[];
  const desc = [...list].reverse(); // 최근이 위로

  return (
    <div style={DARK_BG} className="scanlines min-h-screen p-6 md:p-8 text-slate-100">
      <div className="mb-6">
        <h1 className="font-hud text-2xl md:text-3xl font-black tracking-widest jarvis-glow jarvis-neon">
          📈 브리핑 추세
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          매일 AI 브리핑과 핵심지표를 기록 · {list.length}일치 누적
        </p>
      </div>

      {list.length === 0 ? (
        <div className="jarvis-card p-6 text-sm leading-relaxed text-slate-300">
          아직 기록이 없습니다. <br />
          <code className="text-cyan-300">brief_history</code> 테이블 생성(SQL) 후, 대시보드를 열면
          그날 브리핑이 자동으로 쌓이기 시작합니다. 하루 이틀 지나면 추세가 보입니다.
        </div>
      ) : (
        <>
          {/* 핵심지표 추세 표 */}
          <div className="jarvis-card p-5 mb-6 overflow-x-auto">
            <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80 mb-3">
              핵심지표 일별 추세 (전일 대비)
            </div>
            <table className="w-full text-sm whitespace-nowrap">
              <thead className="text-slate-400 text-left">
                <tr>
                  <th className="py-1.5 pr-4">날짜</th>
                  <th className="py-1.5 px-3 text-right">실등록</th>
                  <th className="py-1.5 px-3 text-right">진척%</th>
                  <th className="py-1.5 px-3 text-right">ROAS</th>
                  <th className="py-1.5 px-3 text-right">페이스</th>
                  <th className="py-1.5 px-3 text-right">예상최종</th>
                  <th className="py-1.5 px-3 text-right">13기 동시점</th>
                </tr>
              </thead>
              <tbody>
                {desc.map((r, i) => {
                  const prev = desc[i + 1]?.metrics; // 하루 전
                  const m = r.metrics ?? {};
                  return (
                    <tr key={r.snapshot_date} className="border-t border-slate-800">
                      <td className="py-1.5 pr-4 text-slate-300 font-mono">{r.snapshot_date.slice(5)}</td>
                      <td className="py-1.5 px-3 text-right font-hud text-cyan-200">{m.realRegs ?? "-"} <span className="text-[10px]">{delta(m.realRegs, prev?.realRegs, "명")}</span></td>
                      <td className="py-1.5 px-3 text-right text-slate-200">{m.progressPct ?? "-"}% <span className="text-[10px]">{delta(m.progressPct, prev?.progressPct, "", 1)}</span></td>
                      <td className="py-1.5 px-3 text-right text-slate-200">{m.roas ?? "-"}배 <span className="text-[10px]">{delta(m.roas, prev?.roas, "", 1)}</span></td>
                      <td className="py-1.5 px-3 text-right text-slate-200">{m.currentPace ?? "-"} <span className="text-[10px]">{delta(m.currentPace, prev?.currentPace, "", 2)}</span></td>
                      <td className="py-1.5 px-3 text-right text-slate-200">{m.projectedFinal ?? "-"}명</td>
                      <td className="py-1.5 px-3 text-right text-amber-200">{m.sameOther ?? "-"}명</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 날짜별 브리핑 타임라인 */}
          <div className="space-y-4">
            {desc.map((r) => (
              <div key={r.snapshot_date} className="jarvis-card p-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="font-hud text-sm text-cyan-300">{r.snapshot_date}</div>
                  <div className="text-[11px] text-slate-400">
                    실등록 {r.metrics?.realRegs ?? "-"}명 · ROAS {r.metrics?.roas ?? "-"}배
                  </div>
                </div>
                <div className="space-y-2">
                  {(r.insights ?? []).map((ins, j) => (
                    <div key={j} className={`flex items-start gap-2 text-sm border-l-2 pl-3 ${toneColor[ins.tone] ?? toneColor.info}`}>
                      <span>{toneIcon[ins.tone] ?? "▸"}</span>
                      <span className="text-slate-100">{ins.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
