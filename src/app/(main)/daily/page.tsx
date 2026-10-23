import { getDayTable } from "@/lib/dayTable";
import { boardCohorts } from "@/lib/board";
import CompareTable from "@/components/board/CompareTable";
import DayCohortPicker from "@/components/DayCohortPicker";

export const dynamic = "force-dynamic";

// Day 비교 — 첫 열(가장 최근 기수) = 기준, 나머지 = 비교 기수. ?cohorts=16기,15기 … 로 조합 선택
export default async function DailyPage({ searchParams }: { searchParams: Promise<{ cohorts?: string }> }) {
  const { cohorts } = await searchParams;
  const picked = cohorts?.split(",").map((s) => s.trim()).filter(Boolean);
  const { focus, compare, chrono } = await boardCohorts();
  const { data, all, chosen } = await getDayTable(picked?.length ? picked : focus ? [focus, ...compare] : undefined, chrono);

  return (
    <div className="min-h-screen bg-[#F6F6F3] text-gray-800">
      <div className="flex flex-col gap-4 px-4 py-6 pt-16 md:px-8 md:pt-7">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-black tracking-tight">Day 비교</h1>
          <span className="text-[13px] text-gray-600">Day 1 = 각 기수 사전등록 오픈일(등록 시작) · 첫 열 기수 = 기준, 나머지 = 비교 기수 · 누적 = 공식 인원 기준</span>
        </header>
        <DayCohortPicker all={all} chosen={chosen} />
        <CompareTable data={data} />
      </div>
    </div>
  );
}
