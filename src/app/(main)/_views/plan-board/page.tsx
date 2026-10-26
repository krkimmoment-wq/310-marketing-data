// ③ 계획 › 계획 캘린더 — 가장 최근 등록 기수의 계획판
import { getPlanBoard } from "@/lib/plan";
import PlanBoard from "./PlanBoard";

export default async function PlanBoardPage() {
  const data = await getPlanBoard();
  if (!data) return <div className="min-h-screen bg-[#F6F6F3] p-8 text-gray-700">계획할 기수가 없습니다. 기수 관리에서 기수를 먼저 등록하세요.</div>;
  return (
    <div className="min-h-screen bg-[#F6F6F3] px-4 pb-10 pt-2 text-gray-800 md:px-8">
      <PlanBoard cohort={data.cohort} items={data.items} records={data.records} today={data.today} />
    </div>
  );
}
