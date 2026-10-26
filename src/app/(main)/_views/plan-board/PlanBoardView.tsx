// ③ 계획 › 계획 캘린더 — 왼쪽에서 고른 기수의 계획판 (선택 없으면 가장 최근 등록 기수)
import { getPlanBoard } from "@/lib/plan";
import PlanBoard from "./PlanBoard";

export default async function PlanBoardPage({ cohortName }: { cohortName?: string }) {
  const data = await getPlanBoard(cohortName);
  if (!data) return <div className="min-h-screen bg-[#F6F6F3] p-8 text-gray-700">계획할 기수가 없습니다. 기수 관리에서 기수를 먼저 등록하세요.</div>;
  return (
    <div className="min-h-screen bg-[#F6F6F3] px-4 pb-10 pt-2 text-gray-800 md:px-8">
      {/* key = 기수: 기수를 바꾸면 달·편집 창 등 화면 상태를 새로 시작 */}
      <PlanBoard key={data.cohort.id} cohort={data.cohort} items={data.items} records={data.records} actual={data.actual} isPast={data.isPast} today={data.today} />
    </div>
  );
}
