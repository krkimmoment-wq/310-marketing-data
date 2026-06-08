import { getSnsData } from "@/lib/sns";
import SnsTrendChart from "@/components/SnsTrendChart";
import SnsForm from "./SnsForm";
import SnsSnapshotRow from "./SnsSnapshotRow";

const SNAPSHOT_CHANNELS = [
  { key: "youtube", label: "유튜브" },
  { key: "instagram", label: "인스타" },
  { key: "tiktok", label: "틱톡" },
  { key: "navertv", label: "네이버TV" },
  { key: "kakao", label: "카카오" },
];

export const dynamic = "force-dynamic";

const DARK_BG: React.CSSProperties = {
  background:
    "radial-gradient(1200px 600px at 80% -10%, rgba(0,229,255,0.10), transparent), radial-gradient(900px 500px at 0% 110%, rgba(59,130,246,0.10), transparent), #070b16",
};

export default async function SnsPage({
  searchParams,
}: {
  searchParams: Promise<{ cohort?: string }>;
}) {
  const { cohort } = await searchParams;
  const data = await getSnsData(cohort ?? "14기");

  if (!data) {
    return (
      <div style={DARK_BG} className="min-h-screen p-8 text-slate-300">
        <h1 className="font-hud text-2xl font-black jarvis-neon jarvis-glow mb-3">SNS · 채널 추이</h1>
        <div className="jarvis-card p-6 text-sm leading-relaxed">
          아직 SNS 데이터가 없습니다. <br />
          Supabase SQL Editor에서 <code className="text-cyan-300">sns_followers</code> 테이블을 생성한 뒤
          이전 스크립트(<code className="text-cyan-300">migrate_sns_kakao.py</code>)를 실행하면 표시됩니다.
        </div>
      </div>
    );
  }

  const { channels, dates, weeks, snapshots, kakao, bitly, bitlyTotal, tallyChannels, sections } = data;
  const weeksDesc = [...weeks].reverse(); // 최근 주가 위로
  const maxClicks = Math.max(1, ...bitly.map((b) => b.clicks));
  const TALLY_COLOR: Record<string, string> = {
    유튜브: "#ff0000",
    인스타그램: "#e1306c",
    네이버TV: "#03c75a",
    틱톡: "#22d3ee",
    기타: "#94a3b8",
  };

  return (
    <div style={DARK_BG} className="scanlines min-h-screen p-6 md:p-8 text-slate-100">
      <div className="mb-6">
        <h1 className="font-hud text-2xl md:text-3xl font-black tracking-widest jarvis-glow jarvis-neon">
          SNS · 채널 추이
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          채널별 주간 구독자 추이 · {dates[0]?.slice(5)} ~ {dates[dates.length - 1]?.slice(5)}
        </p>
      </div>

      {/* 주간 스냅샷 입력 */}
      <div className="mb-6">
        <SnsForm />
      </div>

      {/* 주간 스냅샷 관리 (수정·삭제) */}
      <div className="jarvis-card p-5 mb-6">
        <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80 mb-3">
          주간 스냅샷 관리 (입력값 수정·삭제)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="text-slate-400 text-left">
              <tr>
                <th className="py-1.5 pr-4">날짜</th>
                {SNAPSHOT_CHANNELS.map((c) => (
                  <th key={c.key} className="py-1.5 px-3 text-right">{c.label}</th>
                ))}
                <th className="py-1.5 pl-3">관리</th>
              </tr>
            </thead>
            <tbody>
              {snapshots.map((s) => (
                <SnsSnapshotRow key={s.date} date={s.date} values={s.values} />
              ))}
              {snapshots.length === 0 && (
                <tr>
                  <td colSpan={SNAPSHOT_CHANNELS.length + 2} className="py-6 text-center text-slate-500">
                    스냅샷이 없습니다. 위에서 추가하세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bitly 클릭 추이 + Tally 채널 인입 */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Bitly 일별 클릭 */}
        <div className="jarvis-card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80">
              Bitly 일별 클릭 (EB 링크)
            </div>
            <div className="text-[11px] text-slate-400">
              누적 <span className="font-hud text-cyan-300">{bitlyTotal.toLocaleString("ko-KR")}</span>
            </div>
          </div>
          {bitly.length === 0 ? (
            <div className="text-sm text-slate-400">클릭 데이터가 없습니다.</div>
          ) : (
            <div className="flex items-end gap-0.5 h-36">
              {bitly.map((b) => (
                <div key={b.date} className="flex-1 flex flex-col items-center justify-end group" title={`${b.date.slice(5)} · ${b.clicks}클릭`}>
                  <div
                    className="w-full rounded-t bar-glow anim-fy"
                    style={{ height: `${Math.max((b.clicks / maxClicks) * 100, 2)}%`, background: "linear-gradient(180deg,#00e5ff,#1e3a8a)" }}
                  />
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-between text-[9px] text-slate-500 font-mono mt-1">
            <span>{bitly[0]?.date.slice(5)}</span>
            <span>{bitly[bitly.length - 1]?.date.slice(5)}</span>
          </div>
        </div>

        {/* Tally 채널 인입 */}
        <div className="jarvis-card p-5">
          <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80 mb-3">
            Tally 채널 인입 (신청자가 본 SNS)
          </div>
          {tallyChannels.length === 0 ? (
            <div className="text-sm text-slate-400">Tally 채널 데이터가 없습니다.</div>
          ) : (
            <div className="space-y-3">
              {tallyChannels.map((c) => (
                <div key={c.channel}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-slate-200">{c.channel}</span>
                    <span className="text-slate-400">
                      {c.count}명 · <span className="font-hud text-cyan-300">{c.pct}%</span>
                    </span>
                  </div>
                  <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full anim-fx"
                      style={{ width: `${c.pct}%`, background: TALLY_COLOR[c.channel] ?? "#64748b" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 구간별 비틀리 트래픽 (채널 비중) */}
      {sections.length > 0 && (
        <div className="jarvis-card p-5 mb-6">
          <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80 mb-4">
            구간별 비틀리 트래픽 · 채널 비중 (EB 링크 referrer)
          </div>
          <div className="space-y-4">
            {sections.map((s) => (
              <div key={s.section}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-200 font-medium">{s.section}</span>
                  <span className="text-slate-400">
                    {s.total.toLocaleString("ko-KR")}회 · 1위 <span className="text-cyan-300">{s.top}</span>
                  </span>
                </div>
                <div className="flex h-5 rounded-md overflow-hidden bg-slate-800 anim-fx">
                  {s.channels.map((c) => (
                    <div
                      key={c.key}
                      className="h-full flex items-center justify-center"
                      style={{ width: `${c.pct}%`, background: c.color }}
                      title={`${c.label} ${c.clicks.toLocaleString("ko-KR")}회 (${c.pct}%)`}
                    >
                      {c.pct >= 12 && <span className="text-[9px] text-white font-bold">{c.label} {c.pct}%</span>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-3 mt-3 text-[10px] text-slate-400">
            <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: "#e1306c" }} />인스타</span>
            <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: "#ff5e57" }} />유튜브</span>
            <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: "#ffd23f" }} />카카오</span>
            <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: "#4d8cff" }} />다이렉트</span>
            <span><span className="inline-block w-2 h-2 rounded-full mr-1" style={{ background: "#22d3ee" }} />틱톡</span>
          </div>
        </div>
      )}

      {/* 채널별 현재 카드 */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {channels.map((c) => (
          <div key={c.key} className="jarvis-card p-4">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: c.color }} />
              {c.label}
            </div>
            <div className="font-hud text-xl font-black text-white mt-2">{c.latest.toLocaleString("ko-KR")}</div>
            <div className={`text-[11px] mt-0.5 ${c.growthPct >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
              {c.growthPct >= 0 ? "▲ +" : "▼ "}
              {c.growthPct}% (기간)
            </div>
          </div>
        ))}
      </div>

      {/* 성장지수 멀티라인 차트 */}
      <div className="mb-6">
        <SnsTrendChart channels={channels} dates={dates} />
      </div>

      {/* 주간 증감 표 (최근 주가 위) */}
      <div className="jarvis-card p-5 mb-6">
        <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80 mb-3">
          주간 채널별 추이 (구독자 · 전주 대비 증감)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="text-slate-400 text-left">
              <tr>
                <th className="py-1.5 pr-4">주차</th>
                {channels.map((c) => (
                  <th key={c.key} className="py-1.5 px-3 text-right">
                    <span className="inline-flex items-center gap-1">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: c.color }} />
                      {c.label}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {weeksDesc.map((w) => (
                <tr key={w.date} className="border-t border-slate-800">
                  <td className="py-1.5 pr-4 text-slate-300 font-mono">{w.date.slice(2)}</td>
                  {channels.map((c) => {
                    const cell = w.cells[c.key];
                    if (!cell) return <td key={c.key} className="py-1.5 px-3 text-right text-slate-600">-</td>;
                    return (
                      <td key={c.key} className="py-1.5 px-3 text-right">
                        <span className="font-hud text-slate-100">{cell.value.toLocaleString("ko-KR")}</span>
                        {cell.delta != null && (
                          <span
                            className={`ml-1.5 text-[11px] ${
                              cell.delta > 0 ? "text-emerald-300" : cell.delta < 0 ? "text-rose-300" : "text-slate-500"
                            }`}
                          >
                            {cell.delta > 0 ? "+" : ""}
                            {cell.delta.toLocaleString("ko-KR")}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 카카오 일별 추이 */}
      <div className="jarvis-card p-5">
        <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80 mb-3">
          카카오채널 친구수 일별 (모집기간)
        </div>
        {kakao.length === 0 ? (
          <div className="text-sm text-slate-400">카카오 일별 데이터가 없습니다.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-slate-400 text-left">
                <tr>
                  <th className="py-1.5 pr-4">날짜</th>
                  <th className="py-1.5 pr-4">친구수</th>
                  <th className="py-1.5 pr-4">증감</th>
                  <th className="py-1.5">특이사항</th>
                </tr>
              </thead>
              <tbody>
                {kakao.map((k, i) => {
                  const prev = i > 0 ? kakao[i - 1].friends : k.friends;
                  const delta = k.friends - prev;
                  return (
                    <tr key={k.friend_date} className="border-t border-slate-800">
                      <td className="py-1.5 pr-4 text-slate-300 font-mono">{k.friend_date.slice(5)}</td>
                      <td className="py-1.5 pr-4 font-hud text-white">{k.friends.toLocaleString("ko-KR")}</td>
                      <td className={`py-1.5 pr-4 ${delta >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                        {i === 0 ? "-" : `${delta >= 0 ? "+" : ""}${delta.toLocaleString("ko-KR")}`}
                      </td>
                      <td className="py-1.5 text-slate-400">{k.note ?? "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
