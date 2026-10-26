// 메뉴 5개와 화면 탭 정의 — 왼쪽 메뉴·화면 위 탭·옛 주소 자동 연결(next.config)이 모두 이 표를 쓴다.
// 다른 모듈을 import 하지 않는 순수 파일 (next.config.ts와 테스트에서 그대로 불러옴)

export type TabDef = { key: string; label: string; short?: string; ready?: boolean };
export type MenuDef = { href: string; num: string; label: string; tabs: TabDef[]; defaultTab: string; dynamicLabel?: boolean };

export const MENUS: MenuDef[] = [
  {
    href: "/", num: "①", label: "판단판", defaultTab: "today",
    tabs: [{ key: "today", label: "오늘 판단판" }, { key: "brief", label: "AI 브리핑 추세" }],
  },
  {
    href: "/compare", num: "②", label: "기수 비교", defaultTab: "day",
    tabs: [
      { key: "day", label: "Day 비교" },
      { key: "phase", label: "구간 요약" },
      { key: "cohort", label: "기수별 비교", short: "기수별" },
      { key: "funnel", label: "유입·전환" },
    ],
  },
  {
    // 메뉴 이름 = 기수 관리에 등록된 가장 최근 기수 + " 계획" (예: 17기 계획)
    href: "/plan", num: "③", label: "계획", defaultTab: "plan", dynamicLabel: true,
    tabs: [
      { key: "plan", label: "계획 캘린더" },
      { key: "budget", label: "광고 예산" },
      { key: "records", label: "기록 캘린더" },
    ],
  },
  {
    href: "/records", num: "④", label: "집행 기록", defaultTab: "ad",
    tabs: [{ key: "ad", label: "광고비" }, { key: "kakao", label: "카톡 메시지" }, { key: "content", label: "콘텐츠 기록" }],
  },
  {
    href: "/manage", num: "⑤", label: "등록·기수 관리", defaultTab: "registrations",
    tabs: [{ key: "registrations", label: "등록 명단" }, { key: "cohorts", label: "기수 설정" }, { key: "sns", label: "SNS·채널" }],
  },
];

// 옛 주소 → 새 탭 (임시 연결 307). 주소 뒤 ?cohort= 같은 값은 Next.js가 그대로 붙여 준다.
// "/" 와 "/compare" 는 주소가 그대로라 연결이 필요 없음
export const LEGACY_REDIRECTS: { source: string; destination: string; permanent: false }[] = [
  { source: "/daily", destination: "/compare?tab=day", permanent: false },
  { source: "/phases", destination: "/compare?tab=phase", permanent: false },
  { source: "/insights", destination: "/compare?tab=funnel", permanent: false },
  { source: "/brief-history", destination: "/?tab=brief", permanent: false },
  { source: "/calendar", destination: "/plan?tab=records", permanent: false },
  { source: "/ad-spend", destination: "/records?tab=ad", permanent: false },
  { source: "/kakao-message", destination: "/records?tab=kakao", permanent: false },
  { source: "/content", destination: "/records?tab=content", permanent: false },
  { source: "/registrations", destination: "/manage?tab=registrations", permanent: false },
  { source: "/cohorts", destination: "/manage?tab=cohorts", permanent: false },
  { source: "/sns", destination: "/manage?tab=sns", permanent: false },
  { source: "/assistant", destination: "/", permanent: false },
];

// 왼쪽 메뉴 아래 작은 글씨 (탭 이름을 · 로 연결)
export function sidebarTabs(m: MenuDef): string {
  return m.tabs.map((t) => t.short ?? t.label).join(" · ");
}

// 메뉴 이름 — ③은 가장 최근 기수 이름을 붙임
export function menuLabel(m: MenuDef, latestName?: string): string {
  if (!m.dynamicLabel) return m.label;
  return `${latestName ?? "다음 기수"} ${m.label}`;
}

// 가장 최근에 등록된 기수: 날짜가 아직 없는 기수(방금 등록한 다음 기수)를 가장 최근으로 보고,
// 나머지는 사전등록 오픈일(없으면 클래스 시작일) 늦은 순. 같으면 나중에 등록한(id 큰) 쪽.
export function latestCohortName(
  cohorts: { id: number; name: string; pre_open: string | null; class_start?: string | null }[]
): string | undefined {
  const key = (c: (typeof cohorts)[number]) => c.pre_open ?? c.class_start ?? "";
  return cohorts
    .slice()
    .sort((a, b) => {
      const ka = key(a), kb = key(b);
      if ((ka === "") !== (kb === "")) return ka === "" ? -1 : 1;
      return kb.localeCompare(ka) || b.id - a.id;
    })[0]?.name;
}

// 탭 주소 — 기수 선택(?cohort=)을 유지
export function tabHref(href: string, tab: string, cohort?: string): string {
  const p = new URLSearchParams({ tab });
  if (cohort) p.set("cohort", cohort);
  return `${href}?${p.toString()}`;
}

// 주소의 tab 값을 실제 탭으로 (없거나 잘못되면 기본 탭)
export function resolveTab(m: MenuDef, raw: string | string[] | undefined): string {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return m.tabs.some((t) => t.key === v) ? (v as string) : m.defaultTab;
}
