// SNS 채널 추이 + 카카오 일별 데이터 가공
import { createClient } from "@/lib/supabase/server";

export type SnsChannel = {
  key: string;
  label: string;
  color: string;
  points: { date: string; value: number; index: number }[]; // index = 시작=100 기준 성장지수
  first: number;
  latest: number;
  growthPct: number;
};

export type KakaoDay = { friend_date: string; friends: number; note: string | null };

// 주간 행: 날짜 + 채널별 {구독자, 전주대비 증감}
export type WeekRow = {
  date: string;
  cells: Record<string, { value: number; delta: number | null }>;
};

export type BitlyDay = { date: string; clicks: number };
export type TallyChannel = { channel: string; count: number; pct: number };
export type SectionChannel = { key: string; label: string; color: string; clicks: number; pct: number };
export type BitlySection = { section: string; total: number; channels: SectionChannel[]; top: string };

export type SnsData = {
  channels: SnsChannel[];
  dates: string[];
  weeks: WeekRow[];
  kakao: KakaoDay[];
  bitly: BitlyDay[];
  bitlyTotal: number;
  tallyChannels: TallyChannel[];
  sections: BitlySection[];
};

// 비틀리 구간 정렬 순서 + 채널 메타
const SECTION_ORDER = ["사전등록", "1차 얼리버드", "얼리버드 간 대기", "2차 얼리버드", "정규모집 전 대기", "정규모집", "추가등록"];
const SECTION_CH: { key: string; label: string; color: string }[] = [
  { key: "ig", label: "인스타", color: "#e1306c" },
  { key: "yt", label: "유튜브", color: "#ff5e57" },
  { key: "kk", label: "카카오", color: "#ffd23f" },
  { key: "direct", label: "다이렉트", color: "#4d8cff" },
  { key: "tt", label: "틱톡", color: "#22d3ee" },
  { key: "other", label: "기타", color: "#a0a4b8" },
];

const META: Record<string, { label: string; color: string; order: number }> = {
  youtube: { label: "유튜브", color: "#ff0000", order: 0 },
  instagram: { label: "인스타", color: "#e1306c", order: 1 },
  tiktok: { label: "틱톡", color: "#22d3ee", order: 2 },
  navertv: { label: "네이버TV", color: "#03c75a", order: 3 },
  kakao: { label: "카카오채널", color: "#fbbf24", order: 4 },
  threads: { label: "쓰레드", color: "#94a3b8", order: 5 },
};

export async function getSnsData(cohortName = "14기"): Promise<SnsData | null> {
  const sb = await createClient();
  // 구간별 비틀리는 기수별 (그 외 채널 구독자·일별·카카오는 기수 무관 공통)
  const { data: cohort } = await sb.from("cohorts").select("id").eq("name", cohortName).single();
  const cohortId = cohort?.id ?? 1;
  const [{ data: rows }, { data: kakaoRows }, { data: bitlyRows }, { data: tallyRows }, { data: sectionRows }] =
    await Promise.all([
      sb.from("sns_followers").select("snapshot_date, channel, followers").order("snapshot_date"),
      sb.from("kakao_daily").select("friend_date, friends, note").order("friend_date"),
      sb.from("bitly_daily").select("click_date, clicks").order("click_date"),
      sb.from("tally_channel").select("channel, count").order("count", { ascending: false }),
      sb.from("bitly_section").select("*").eq("cohort_id", cohortId),
    ]);
  if (!rows || rows.length === 0) return null;

  // 구간별 비틀리 (정렬 + 채널 비중)
  const sectionMap = new Map((sectionRows ?? []).map((s) => [s.section, s]));
  const sections: BitlySection[] = SECTION_ORDER.filter((name) => sectionMap.has(name)).map((name) => {
    const s = sectionMap.get(name)!;
    const channels = SECTION_CH.map((c) => ({
      ...c,
      clicks: s[c.key] ?? 0,
      pct: s.total ? Math.round(((s[c.key] ?? 0) / s.total) * 100) : 0,
    }))
      .filter((c) => c.clicks > 0)
      .sort((a, b) => b.clicks - a.clicks);
    return { section: name, total: s.total ?? 0, channels, top: channels[0]?.label ?? "-" };
  });

  const bitly = (bitlyRows ?? []).map((b) => ({ date: b.click_date, clicks: b.clicks ?? 0 }));
  const bitlyTotal = bitly.reduce((s, b) => s + b.clicks, 0);
  const tallySum = (tallyRows ?? []).reduce((s, r) => s + (r.count ?? 0), 0) || 1;
  const tallyChannels = (tallyRows ?? []).map((r) => ({
    channel: r.channel,
    count: r.count ?? 0,
    pct: Math.round(((r.count ?? 0) / tallySum) * 1000) / 10,
  }));

  const dates = [...new Set(rows.map((r) => r.snapshot_date))].sort();

  const byChannel = new Map<string, { date: string; value: number }[]>();
  for (const r of rows) {
    if (!byChannel.has(r.channel)) byChannel.set(r.channel, []);
    byChannel.get(r.channel)!.push({ date: r.snapshot_date, value: r.followers });
  }

  const channels: SnsChannel[] = [];
  for (const [key, pts] of byChannel) {
    const meta = META[key] ?? { label: key, color: "#64748b", order: 9 };
    pts.sort((a, b) => a.date.localeCompare(b.date));
    const first = pts[0]?.value || 1;
    const latest = pts[pts.length - 1]?.value || 0;
    channels.push({
      key,
      label: meta.label,
      color: meta.color,
      points: pts.map((p) => ({ ...p, index: (p.value / first) * 100 })),
      first,
      latest,
      growthPct: Math.round(((latest - first) / first) * 1000) / 10,
    });
  }
  channels.sort((a, b) => (META[a.key]?.order ?? 9) - (META[b.key]?.order ?? 9));

  // 주간 매트릭스 (날짜별 채널 구독자 + 전주 대비 증감)
  const weeks: WeekRow[] = dates.map((d, di) => {
    const cells: Record<string, { value: number; delta: number | null }> = {};
    for (const ch of channels) {
      const pt = ch.points.find((p) => p.date === d);
      if (!pt) continue;
      const prev = di > 0 ? ch.points.find((p) => p.date === dates[di - 1]) : null;
      cells[ch.key] = { value: pt.value, delta: prev ? pt.value - prev.value : null };
    }
    return { date: d, cells };
  });

  return { channels, dates, weeks, kakao: kakaoRows ?? [], bitly, bitlyTotal, tallyChannels, sections };
}
