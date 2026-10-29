// ③ 계획 › 광고 시뮬레이터 — 데이터 센서 상태만 서버에서 읽고, 계산은 브라우저에서 (adSimCore)
// A안(10/29 승인 목업 v0.2): 메타 광고비 → 메타 신청(Tally source=meta) → 오픈채팅 입장. 날짜별 데이터가 쌓이면 센서가 켜짐(B안)
import { createClient } from "@/lib/supabase/server";
import AdSimClient, { type Sensor } from "./AdSimClient";
import "./adsim.css";

async function tableCount(sb: Awaited<ReturnType<typeof createClient>>, table: string) {
  const { count, error } = await sb.from(table).select("*", { count: "exact", head: true });
  return error ? null : count ?? 0; // null = 표 없음(또는 권한 없음)
}

export default async function AdSimPage() {
  const sb = await createClient();
  const [adNull, daily, links, oc, ocLast] = await Promise.all([
    sb.from("ad_spend").select("id", { count: "exact", head: true }).is("ad_type", null).then((r) => (r.error ? null : r.count ?? 0)),
    tableCount(sb, "ad_spend_daily"),
    tableCount(sb, "bitly_links"),
    tableCount(sb, "openchat_daily"),
    sb.from("openchat_daily").select("day,members").order("day", { ascending: false }).limit(1).then((r) => (r.error ? null : r.data?.[0] ?? null)),
  ]);
  const sensors: Sensor[] = [
    { name: "13~16기 등록·구간", state: "on", label: "ONLINE", note: "결제일·구간 100%. 기수 정답 119 / 100 / 101 / 101(임시)" },
    { name: "결제 링크 클릭 (비틀리 1개)", state: "on", label: "ONLINE", note: "14~16기 175행(10/28). 채널 구분 없음" },
    daily === null
      ? { name: "광고비 날짜별 (ad_spend_daily)", state: "offl", label: "표 없음", note: "SQL 실행 대기 — 11/2 전에 실행해야 첫날부터 쌓임" }
      : { name: "광고비 날짜별 (ad_spend_daily)", state: daily > 0 ? "on" : "part", label: daily > 0 ? "ONLINE" : "입력 대기", note: `${daily}줄` },
    adNull === null
      ? { name: "애즈 / 프로모션 구분", state: "offl", label: "확인 실패", note: "광고 장부를 읽지 못함" }
      : adNull === 0
        ? { name: "애즈 / 프로모션 구분", state: "on", label: "ONLINE", note: "광고 장부 종류 칸 빈칸 0줄 (유튜브 = 스튜디오 프로모션, 인스타 = 메타)" }
        : { name: "애즈 / 프로모션 구분", state: "part", label: "SQL 실행 대기", note: `종류 칸 빈칸 ${adNull}줄 · fill_ad_type_by_platform.sql` },
    links === null
      ? { name: "링크별 클릭 (비틀리 v2)", state: "offl", label: "표 없음", note: "v2 SQL 실행 + 매일 가져오는 코드 대기" }
      : { name: "링크별 클릭 (비틀리 v2)", state: links > 0 ? "on" : "part", label: links > 0 ? "ONLINE" : "링크 등록 대기", note: `등록된 링크 ${links}개` },
    { name: "특강 신청 수 (Tally)", state: "offl", label: "폼 생성 전", note: "숨은 필드 source=meta로 메타 신청을 따로 셈. 날짜별 건수 + 유입 경로만 가져옴" },
    oc === null
      ? { name: "오픈채팅 인원 일별", state: "offl", label: "표 없음", note: "읽기 전용 인증 + create_openchat_daily.sql + 매일 읽는 코드" }
      : { name: "오픈채팅 인원 일별", state: oc > 0 ? "on" : "part", label: oc > 0 ? "ONLINE" : "수집 대기", note: ocLast ? `${oc}일 · 최근 ${ocLast.day} ${Number(ocLast.members).toLocaleString("ko-KR")}명` : "아직 0행" },
    { name: "메타 시험 실제 값", state: "part", label: "11/13~15 이후", note: "광고관리자에서 광고비·클릭을 옮겨 적음" },
  ];
  return <AdSimClient sensors={sensors} />;
}
