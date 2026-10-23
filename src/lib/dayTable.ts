// 기수 × Day 비교표 데이터 로더 — 계산은 dayTableCore(순수 함수)에 위임
import { createClient } from "@/lib/supabase/server";
import { getCohortsChrono, kstToday } from "@/lib/cohorts";
import { cohortDailyRows } from "@/lib/daily";
import { buildDayTable, rankVideos, type CohortFull, type DayRaw, type DayTableData, type VideoRank } from "@/lib/dayTableCore";

const COHORT_COLS = "id,name,pre_open,eb1_open,eb1_close,eb2_open,eb2_close,reg_open,reg_close,extra_close,ended_at,class_start";

// names 미지정 시 기본 = 모집을 이미 시작한 기수 중 최근 4개. 열 순서는 최신 → 과거.
export async function getDayTable(
  names?: string[]
): Promise<{ data: DayTableData; all: string[]; chosen: string[]; ranks: VideoRank[]; raw: DayRaw | null }> {
  const sb = await createClient();
  const today = kstToday();
  const chrono = await getCohortsChrono();
  const all = chrono.map((c) => c.name);
  const key = (c: { pre_open: string | null; class_start: string | null }) => c.pre_open ?? c.class_start ?? "";
  const started = chrono.filter((c) => key(c) !== "" && key(c) <= today);
  const wanted = names && names.length ? names : started.slice(0, 4).map((c) => c.name);
  const chosenRows = chrono.filter((c) => wanted.includes(c.name));
  const ids = chosenRows.map((c) => c.id);
  const chosen = chosenRows.map((c) => c.name);
  if (!ids.length) return { data: { columns: [], maxDay: 0, today }, all, chosen, ranks: [], raw: null };

  const { data: cohortsRaw } = await sb.from("cohorts").select(COHORT_COLS).in("id", ids);
  const cohorts = (cohortsRaw ?? []) as CohortFull[];
  const startDates = cohorts.map((c) => c.pre_open).filter((d): d is string => !!d).sort();
  const endDates = cohorts.map((c) => c.class_start ?? c.ended_at ?? today).sort();
  const minDate = startDates[0] ?? today;
  const maxDate = endDates[endDates.length - 1] ?? today;

  const [dailyEntries, arrivalsRaw, ads, videos, bitly, kakao, content] = await Promise.all([
    Promise.all(ids.map(async (id) => [id, await cohortDailyRows(sb, id)] as const)),
    // 다른 기수에서 이 기수로 옮겨온 인원(입금완료·미환불) — 대시보드 실등록과 같은 기준으로 누적에 포함
    sb.from("registrations").select("transfer_to_cohort_id").in("transfer_to_cohort_id", ids).eq("payment", "입금완료").eq("is_refund", false),
    sb.from("yt_traffic_daily").select("day,views").eq("source", "ADVERTISING").gte("day", minDate).lte("day", maxDate).range(0, 9999),
    sb.from("yt_video").select("video_id,pub_date,kind,title,views").gte("pub_date", minDate).lte("pub_date", maxDate).range(0, 9999),
    sb.from("bitly_daily").select("click_date,clicks").gte("click_date", minDate).lte("click_date", maxDate).range(0, 9999),
    sb.from("kakao_message").select("cohort_id,sent_date,title,sent_count,click_count").in("cohort_id", ids),
    sb.from("content_log").select("cohort_id,pub_date,category,title").in("cohort_id", ids),
  ]);

  // 영상별 일별 조회(발행 후 14일)·인스타 게시물 — 테이블이 아직 없으면 오류 대신 빈 값
  const vidIds = ((videos.data ?? []) as { video_id: string }[]).map((v) => v.video_id);
  const [videoDaily, ig] = await Promise.all([
    vidIds.length
      ? sb.from("yt_video_daily").select("video_id,day,views").in("video_id", vidIds).range(0, 19999)
      : Promise.resolve({ data: [] as unknown[] }),
    sb.from("ig_media").select("post_date,media_type,caption,permalink,like_count,comments_count").gte("post_date", minDate).lte("post_date", maxDate).range(0, 9999),
  ]);

  const arrivals: Record<number, number> = {};
  for (const r of (arrivalsRaw.data ?? []) as { transfer_to_cohort_id: number }[])
    arrivals[r.transfer_to_cohort_id] = (arrivals[r.transfer_to_cohort_id] ?? 0) + 1;

  const raw: DayRaw = {
    cohorts,
    daily: Object.fromEntries(dailyEntries),
    arrivals,
    ads: (ads.data ?? []) as DayRaw["ads"],
    videos: (videos.data ?? []) as DayRaw["videos"],
    bitly: (bitly.data ?? []) as DayRaw["bitly"],
    kakao: (kakao.data ?? []) as DayRaw["kakao"],
    content: (content.data ?? []) as DayRaw["content"],
    videoDaily: (videoDaily.data ?? []) as NonNullable<DayRaw["videoDaily"]>,
    ig: (ig.data ?? []) as NonNullable<DayRaw["ig"]>,
  };
  const data = buildDayTable(raw, ids, today);
  return { data, all, chosen, ranks: rankVideos(raw, data), raw };
}
