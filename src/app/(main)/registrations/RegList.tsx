"use client";
// 등록자 목록 — 실시간 검색 + 구간(카테고리)별 그룹 정리 + 구간 소계
import { Fragment, useState } from "react";
import RegRow from "./RegRow";
import { statusOf } from "./StatusCell";

type Reg = {
  id: number;
  name: string;
  reg_date: string;
  section: string;
  amount: number | null;
  channel: string;
  sns_channel: string | null;
  payment: string;
  is_refund?: boolean;
  is_transfer?: boolean;
};

// 구간 정렬 순서 (캠페인 흐름순)
const SECTION_ORDER = ["사전등록", "1차EB", "대기1", "2차EB", "대기2", "정규", "추가"];
const sectionRank = (s: string) => {
  const i = SECTION_ORDER.indexOf(s);
  return i === -1 ? 99 : i;
};

export default function RegList({ regs }: { regs: Reg[] }) {
  const [q, setQ] = useState("");
  const kw = q.trim().toLowerCase();

  const filtered = kw
    ? regs.filter((r) =>
        [
          r.name,
          r.section,
          r.sns_channel ?? "",
          r.channel === "tally" ? "tally 🅰" : "카카오 🅱",
          statusOf(r),
          String(r.amount ?? ""),
        ]
          .join(" ")
          .toLowerCase()
          .includes(kw)
      )
    : regs;

  // 구간별 그룹 (캠페인 흐름순, 구간 내부는 등록일순)
  const groups = SECTION_ORDER.map((sec) => {
    const rows = filtered
      .filter((r) => r.section === sec)
      .sort((a, b) => a.reg_date.localeCompare(b.reg_date));
    return { sec, rows };
  }).filter((g) => g.rows.length > 0);

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름·구간·SNS·채널 검색…"
          className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-slate-300 outline-none focus:border-blue-500"
        />
        {q && (
          <button
            onClick={() => setQ("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            title="검색 지우기"
          >
            ✕
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 font-bold text-slate-700">
          등록자 목록 ({filtered.length}
          {kw && filtered.length !== regs.length ? ` / 전체 ${regs.length}` : ""}명)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">이름</th>
                <th className="px-4 py-2 text-left">등록일</th>
                <th className="px-4 py-2 text-left">구간</th>
                <th className="px-4 py-2 text-left">금액</th>
                <th className="px-4 py-2 text-left">채널</th>
                <th className="px-4 py-2 text-left">SNS</th>
                <th className="px-4 py-2 text-left">상태</th>
                <th className="px-4 py-2 text-left">수정</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(({ sec, rows }) => {
                // 소계 = 실매출(입금완료&미환불&미기수이전)만 — 미입금·환불·기수이전 제외
                const subtotal = rows
                  .filter((r) => statusOf(r) === "입금완료")
                  .reduce((s, r) => s + (r.amount ?? 0), 0);
                const realCount = rows.filter((r) => statusOf(r) === "입금완료").length;
                return (
                  <Fragment key={sec}>
                    <tr className="bg-slate-100/80 border-t border-slate-200">
                      <td colSpan={8} className="px-4 py-2 font-bold text-slate-700">
                        {sec}
                        <span className="ml-2 font-normal text-slate-500">
                          · {rows.length}명(입금 {realCount}) · 실매출 {subtotal.toLocaleString("ko-KR")}원
                        </span>
                      </td>
                    </tr>
                    {rows.map((r) => (
                      <RegRow key={r.id} r={r} />
                    ))}
                  </Fragment>
                );
              })}
              {groups.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    {kw ? `"${q}" 검색 결과가 없습니다.` : "등록자가 없습니다. 위에서 추가하세요."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
