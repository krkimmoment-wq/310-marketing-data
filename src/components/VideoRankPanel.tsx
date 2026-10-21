// 발행 후 첫 7일 조회 순위 — "반응 좋았던 영상에 광고비를 쓸지" 판단용
// 누적 조회는 오래된 영상이 유리하므로, 모든 영상을 발행 후 같은 7일로 맞춰 비교한다.
import type { VideoRank } from "@/lib/dayTableCore";

function List({ title, items }: { title: string; items: VideoRank[] }) {
  return (
    <div className="min-w-0">
      <div className="text-xs font-bold text-slate-300 mb-2">{title}</div>
      {items.length === 0 ? (
        <div className="text-xs text-slate-500">집계 완료된 영상이 아직 없습니다.</div>
      ) : (
        <ol className="space-y-1.5">
          {items.map((v, i) => (
            <li key={v.video_id} className="flex items-baseline gap-2 text-xs">
              <span className="w-5 shrink-0 text-right font-hud text-cyan-300">{i + 1}</span>
              <a
                href={`https://youtu.be/${v.video_id}`}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-slate-200 hover:text-cyan-200"
                title={v.title}
              >
                {v.title}
              </a>
              <span className="shrink-0 text-[10px] text-slate-500">
                {v.cohort} Day {v.day}
              </span>
              <span className="w-16 shrink-0 text-right font-bold text-white">{v.first7.toLocaleString("ko-KR")}</span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

export default function VideoRankPanel({ ranks }: { ranks: VideoRank[] }) {
  const done = ranks.filter((v) => v.complete);
  const pending = ranks.length - done.length;
  if (ranks.length === 0) {
    return (
      <div className="jarvis-card p-5 mb-6 text-sm text-slate-400">
        🏆 발행 후 첫 7일 조회 순위 — 영상별 일별 조회 수집이 시작되면 표시됩니다.
      </div>
    );
  }
  return (
    <div className="jarvis-card p-5 mb-6 fade-up">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-4">
        <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80">🏆 발행 후 첫 7일 조회 순위</div>
        <div className="text-[11px] text-slate-500">
          선택한 기수의 모집 기간 발행분 · 집계 중 {pending}개 제외 · 숫자 = 발행일 포함 7일 조회
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-2">
        <List title="📺 롱폼 TOP 5" items={done.filter((v) => v.kind === "롱폼").slice(0, 5)} />
        <List title="⚡ 숏폼 TOP 10" items={done.filter((v) => v.kind !== "롱폼").slice(0, 10)} />
      </div>
      <p className="mt-4 text-[10px] leading-relaxed text-slate-500">
        첫 7일 조회에는 광고(유료 노출) 조회도 포함됩니다. 이미 광고를 붙인 영상은 숫자가 부풀려져 있을 수 있으니, 위 표의 💰 표시와 함께 보세요.
      </p>
    </div>
  );
}
