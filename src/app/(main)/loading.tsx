// 라우트 전환·서버 렌더 대기 시 표시되는 스켈레톤 (빈 화면 깜빡임 방지)
export default function Loading() {
  return (
    <div className="min-h-screen p-6 md:p-8" style={{ background: "#070b16" }}>
      <div className="animate-pulse space-y-4 pt-10 md:pt-0">
        <div className="h-8 w-56 rounded-lg bg-slate-700/40" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-24 rounded-2xl bg-slate-700/30" />
          ))}
        </div>
        <div className="h-72 rounded-2xl bg-slate-700/30" />
        <div className="h-40 rounded-2xl bg-slate-700/25" />
      </div>
    </div>
  );
}
