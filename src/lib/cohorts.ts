// 기수 순서 해석 — "최신 기수"와 "그 직전 기수"를 시간순으로 계산
// id 순서는 시간순이 아니므로(14기=1·13기=2·15기=4) pre_open(없으면 class_start)로 정렬한다.
import { createClient } from "@/lib/supabase/server";

export type CohortRow = { id: number; name: string; pre_open: string | null; class_start: string | null };

// 시간순 정렬 키: pre_open 우선, 없으면 class_start, 둘 다 없으면 빈 문자열(가장 과거로)
function chronoKey(c: CohortRow) {
  return c.pre_open ?? c.class_start ?? "";
}

// 최신 → 과거 내림차순으로 정렬된 기수 목록
// 1차 기준 = pre_open(없으면 class_start). 같거나 둘 다 없으면 id 큰 쪽(나중 생성)을 최신으로.
export async function getCohortsChrono(): Promise<CohortRow[]> {
  const sb = await createClient();
  const { data } = await sb.from("cohorts").select("id,name,pre_open,class_start");
  const list = (data ?? []) as CohortRow[];
  return list.sort((a, b) => {
    const byDate = chronoKey(b).localeCompare(chronoKey(a));
    return byDate !== 0 ? byDate : b.id - a.id;
  });
}

// 선택된 기수(없으면 최신)와 그 직전(시간상 바로 이전) 기수를 반환
export async function resolveCohortPair(selected?: string): Promise<{
  chrono: CohortRow[];
  latest: string;
  currentName: string;
  previousName: string | null;
}> {
  const chrono = await getCohortsChrono(); // 최신 → 과거
  const latest = chrono[0]?.name ?? "14기";
  const currentName = selected ?? latest;
  const idx = chrono.findIndex((c) => c.name === currentName);
  const previousName = idx >= 0 && idx + 1 < chrono.length ? chrono[idx + 1].name : null;
  return { chrono, latest, currentName, previousName };
}
