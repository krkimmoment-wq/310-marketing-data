import { getPhaseData } from "@/lib/phases";
import PhaseTable from "@/components/board/PhaseTable";

export const dynamic = "force-dynamic";

// 구간 요약 — 기수는 왼쪽 메뉴의 기수 선택(?cohort=)을 따른다
export default async function PhasesPage({ searchParams }: { searchParams: Promise<{ cohort?: string }> }) {
  const { cohort } = await searchParams;
  const d = await getPhaseData(cohort);

  return (
    <div className="min-h-screen bg-[#F6F6F3] text-gray-800">
      <div className="flex flex-col gap-4 px-4 py-6 pt-16 md:px-8 md:pt-7">
        <header className="flex flex-col gap-1">
          <h1 className="text-2xl font-black tracking-tight">구간 요약{d ? ` · ${d.cohort.name}` : ""}</h1>
          <span className="text-[13px] text-gray-600">
            결제일 기준 · 오른쪽 = 같은 구간 다른 기수 실등록{d?.compareNames.length ? ` (${d.compareNames.join("·")})` : ""} · 기수는 왼쪽 메뉴에서 선택
          </span>
        </header>
        {d ? (
          <PhaseTable
            cohortId={d.cohort.id}
            rows={d.rows}
            compareNames={d.compareNames}
            arrivals={d.arrivals}
            hasRoster={d.hasRoster}
            memos={d.memos}
          />
        ) : (
          <div className="rounded-xl border border-gray-200 bg-white p-5 text-sm text-gray-600">{cohort ?? "현재 기수"} 데이터를 찾을 수 없습니다.</div>
        )}
      </div>
    </div>
  );
}
