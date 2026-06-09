// 데일리 코크핏 — 매일 보는 운영 현황 (오늘 변화·D-Day·13기 갭·목표 페이스·자동 진단)
type Props = {
  cohortName: string;
  channel: string; // "YouTube" 등 — 현재 보고 있는 채널
  dDay: number | null; // 클래스 시작까지 남은 일수
  total: number;
  target: number;
  todayNew: number;
  yesterdayNew: number;
  prevName: string | null;
  prevAtToday: number | null; // 직전 기수 같은 시점 누적
};

export default function DailyCockpit({ cohortName, channel, dDay, total, target, todayNew, yesterdayNew, prevName, prevAtToday }: Props) {
  const gap = prevAtToday != null ? prevAtToday - total : null; // +면 뒤, -면 앞
  const pct = Math.min(100, Math.round((total / target) * 100));
  const need = dDay != null && dDay > 0 ? Math.max(0, Math.ceil(((target - total) / dDay) * 10) / 10) : null;

  let diag = "";
  if (gap != null && prevName) {
    if (gap > 0) diag = `${prevName} 같은 시점보다 ${gap}명 뒤. `;
    else if (gap < 0) diag = `${prevName} 같은 시점보다 ${-gap}명 앞. `;
    else diag = `${prevName}와 동률. `;
  }
  if (dDay != null) {
    if (dDay <= 0) diag += `클래스 시작. 모집 마감 국면.`;
    else if (dDay <= 10) diag += `클래스 D-${dDay} — 막판 등록 폭발 구간(${prevName ?? "직전"}는 이때 급등). 지금이 승부처.`;
    else if (dDay <= 21) diag += `클래스 D-${dDay} — 막판 전환 구간 임박.`;
    else diag += `클래스까지 D-${dDay} — 아직 초·중반.`;
  }
  const todayTrend = todayNew > yesterdayNew ? "text-emerald-300" : todayNew < yesterdayNew ? "text-rose-300" : "text-slate-300";

  return (
    <div className="jarvis-card jarvis-accent p-6">
      <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
        <div className="flex items-center gap-2">
          <span className="font-hud text-base md:text-lg font-black text-white jarvis-glow">🎯 {cohortName} 데일리 코크핏</span>
          <span className="text-[11px] text-slate-400 border border-slate-700 rounded px-1.5 py-0.5">{channel} 기준</span>
        </div>
        {dDay != null && (
          <span className="font-hud text-sm font-black text-cyan-300">클래스까지 <span className="text-2xl">D-{dDay}</span></span>
        )}
      </div>

      {/* 진척 */}
      <div className="mb-4">
        <div className="flex items-end justify-between mb-1.5">
          <span className="font-hud text-3xl font-black text-cyan-300 jarvis-glow">{total}<span className="text-lg text-slate-400"> / {target}명</span></span>
          <span className="text-sm text-slate-400 font-bold">{pct}%</span>
        </div>
        <div className="h-3 rounded-full bg-slate-800 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-500 to-blue-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* 3지표 */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
          <div className="text-[11px] text-slate-400">오늘 신규</div>
          <div className={`font-hud text-2xl font-black ${todayTrend}`}>+{todayNew}</div>
          <div className="text-[10px] text-slate-500">어제 +{yesterdayNew}</div>
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
          <div className="text-[11px] text-slate-400">{prevName ?? "직전"} 같은 시점</div>
          <div className="font-hud text-2xl font-black text-amber-300">{prevAtToday ?? "—"}명</div>
          {gap != null && <div className={`text-[10px] font-bold ${gap > 0 ? "text-rose-300" : "text-emerald-300"}`}>{gap > 0 ? `▼ ${gap}명 뒤` : gap < 0 ? `▲ ${-gap}명 앞` : "동률"}</div>}
        </div>
        <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3">
          <div className="text-[11px] text-slate-400">목표 달성 페이스</div>
          <div className="font-hud text-2xl font-black text-white">{need != null ? `${need}명` : "—"}</div>
          <div className="text-[10px] text-slate-500">{dDay != null && dDay > 0 ? `남은 ${dDay}일 · 하루 필요` : "마감 국면"}</div>
        </div>
      </div>

      {/* 자동 진단 */}
      <div className="border-t border-slate-700/60 pt-3 flex gap-2">
        <span className="text-cyan-400">💬</span>
        <span className="text-sm text-slate-200 leading-relaxed"><b className="text-cyan-300">오늘의 진단:</b> {diag}</span>
      </div>
    </div>
  );
}
