// ③ 계획 › 광고 예산 — 계획 금액 + 지난 기수 같은 구간 광고비·등록 수 (기수끼리 합치지 않음)
import { getBudgetView } from "@/lib/plan";
import BudgetForm from "./BudgetForm";

const won = (n: number) => `₩${n.toLocaleString("ko-KR")}`;

export default async function PlanBudgetPage({ cohortName }: { cohortName?: string }) {
  const data = await getBudgetView(cohortName);
  if (!data) return <div className="min-h-screen bg-[#F6F6F3] p-8 text-gray-700">계획할 기수가 없습니다.</div>;
  const { cohort, saved, past } = data;
  const keys = ["eb1", "eb2", "regular", "other"] as const;
  const label = { eb1: "1차EB", eb2: "2차EB", regular: "정규~첫 주", other: "그 외 (사전등록·대기 중 시작)" };
  return (
    <div className="min-h-screen bg-[#F6F6F3] px-4 pb-10 pt-2 text-gray-800 md:px-8">
      <div className="flex flex-wrap items-start gap-4">
        <div className="flex min-w-0 flex-[1_1_380px] flex-col">
          <BudgetForm key={cohort.id} cohortId={cohort.id} cohortName={cohort.name} saved={saved} />
        </div>
        <section aria-label="지난 기수 같은 구간" className="flex min-w-0 flex-[2_1_560px] flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4">
          <h2 className="text-[16px] font-black">지난 기수 같은 구간 — 광고비 · 등록 수</h2>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px] tabular-nums">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-700">
                  <th className="px-2 py-1.5">구간</th>
                  {past.map((p) => (
                    <th key={p.name} className="px-2 py-1.5">{p.name}{p.settled ? "" : " (집계 중)"}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keys.map((k) => (
                  <tr key={k} className="border-t border-gray-100 align-top">
                    <th scope="row" className="px-2 py-2 text-left font-bold">{label[k]}</th>
                    {past.map((p) => {
                      const b = p.buckets.find((x) => x.key === k)!;
                      return (
                        <td key={p.name} className="px-2 py-2">
                          <span className="block font-bold">{won(b.youtube + b.instagram)}</span>
                          <span className="block text-[12px] text-gray-600">유튜브 {won(b.youtube)} · 인스타 {won(b.instagram)} · {b.count}건</span>
                          {b.regs !== null && <span className="block text-[12px]">등록 {b.regs}명</span>}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                <tr className="border-t-2 border-gray-200">
                  <th scope="row" className="px-2 py-2 text-left font-bold">기수 광고비 합계</th>
                  {past.map((p) => (
                    <td key={p.name} className="px-2 py-2 font-bold">{won(p.buckets.reduce((s, b) => s + b.youtube + b.instagram, 0))}</td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
          <p className="text-[12px] leading-relaxed text-gray-600">
            광고비 = 캠페인 시작일 기준 (오픈 3일 전 ~ 마감, 정규는 최종 집계일까지 = 그 할인용으로 봄. 일별 집행액이 없어서) · 유튜브 = Google Ads·스튜디오 프로모션 구분 없음 (종류 확인 필요) · 등록 = 결제일 기준 실등록 (할인 기간, 정규는 정규 오픈 ~ 최종 집계일) · 기수끼리 더하지 않음
          </p>
        </section>
      </div>
    </div>
  );
}
