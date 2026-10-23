// 라우트 전환·서버 렌더 대기 시 표시되는 스켈레톤 (빈 화면 깜빡임 방지) — 밝은 테마
export default function Loading() {
  return (
    <div className="min-h-screen bg-[#F6F6F3] px-4 py-6 pt-16 md:px-8 md:pt-7">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-56 rounded-lg bg-gray-200" />
        <div className="h-24 rounded-2xl bg-gray-200" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-gray-200/80" />
          ))}
        </div>
        <div className="h-64 rounded-xl bg-gray-200/70" />
      </div>
    </div>
  );
}
