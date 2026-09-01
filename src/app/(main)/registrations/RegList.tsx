"use client";
// 등록자 목록 — 실시간 검색 + 구간(카테고리)별 그룹 정리 + 구간 소계
import { Fragment, useState } from "react";
import RegRow from "./RegRow";
import { statusOf } from "./StatusCell";

type Reg = {
  id: number;
  cohort_id?: number;
  name: string;
  reg_date: string;
  section: string;
  amount: number | null;
  channel: string;
  sns_channel: string | null;
  pay_platform?: string | null;
  payment: string;
  is_refund?: boolean;
  is_transfer?: boolean;
  transfer_to_cohort_id?: number | null;
  refund_amount?: number | null;
};

// 구간 정렬 순서 (캠페인 흐름순)
const SECTION_ORDER = ["사전등록", "1차EB", "대기1", "2차EB", "대기2", "정규", "추가"];
const sectionRank = (s: string) => {
  const i = SECTION_ORDER.indexOf(s);
  return i === -1 ? 99 : i;
};

const PAY_OPTS = ["전체", "홈페이지", "유튜브", "기타"];
const STATUS_OPTS = ["전체", "입금완료", "미입금", "환불", "기수이전"];
const CH_OPTS: { v: string; label: string }[] = [
  { v: "전체", label: "전체 채널" },
  { v: "kakao_direct", label: "🅱️ 카카오" },
  { v: "tally", label: "🅰️ Tally" },
];
const selCls = "px-3 py-2.5 rounded-lg border border-slate-700 bg-slate-900/60 text-slate-100 text-sm outline-none focus:border-cyan-400";

export default function RegList({ regs, cohorts, cohortId }: { regs: Reg[]; cohorts: { id: number; name: string }[]; cohortId?: number }) {
  const [q, setQ] = useState("");
  const [pay, setPay] = useState("전체");
  const [status, setStatus] = useState("전체");
  const [ch, setCh] = useState("전체");
  const kw = q.trim().toLowerCase();

  // 드롭다운 필터 (AND) → 그 다음 검색어
  const base = regs.filter(
    (r) =>
      (pay === "전체" || (r.pay_platform ?? "홈페이지") === pay) &&
      (status === "전체" || statusOf(r) === status) &&
      (ch === "전체" || r.channel === ch)
  );
  const filtered = kw
    ? base.filter((r) =>
        [
          r.name,
          r.section,
          r.sns_channel ?? "",
          r.channel === "tally" ? "tally 🅰" : "카카오 🅱",
          r.pay_platform ?? "",
          statusOf(r),
          String(r.amount ?? ""),
        ]
          .join(" ")
          .toLowerCase()
          .includes(kw)
      )
    : base;

  // 구간별 그룹 (캠페인 흐름순, 구간 내부는 등록일순)
  const groups = SECTION_ORDER.map((sec) => {
    const rows = filtered
      .filter((r) => r.section === sec)
      .sort((a, b) => a.reg_date.localeCompare(b.reg_date));
    return { sec, rows };
  }).filter((g) => g.rows.length > 0);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px] max-w-sm">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="이름·구간·SNS 검색…"
            className="w-full pl-9 pr-9 py-2.5 rounded-lg bg-slate-900/60 border border-slate-700 text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400"
          />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200" title="검색 지우기">✕</button>
          )}
        </div>
        <select value={pay} onChange={(e) => setPay(e.target.value)} className={selCls} title="결제처 필터">
          {PAY_OPTS.map((p) => <option key={p} value={p}>{p === "전체" ? "💳 전체 결제처" : p}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className={selCls} title="상태 필터">
          {STATUS_OPTS.map((s) => <option key={s} value={s}>{s === "전체" ? "전체 상태" : s}</option>)}
        </select>
        <select value={ch} onChange={(e) => setCh(e.target.value)} className={selCls} title="채널 필터">
          {CH_OPTS.map((c) => <option key={c.v} value={c.v}>{c.label}</option>)}
        </select>
        {(pay !== "전체" || status !== "전체" || ch !== "전체" || q) && (
          <button onClick={() => { setPay("전체"); setStatus("전체"); setCh("전체"); setQ(""); }}
            className="px-3 py-2.5 rounded-lg border border-slate-600 text-slate-300 text-sm hover:bg-slate-800">필터 초기화</button>
        )}
      </div>

      <div className="jarvis-card overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-800 font-bold text-slate-200">
          등록자 목록 ({filtered.length}
          {filtered.length !== regs.length ? ` / 전체 ${regs.length}` : ""}명)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-900/40 text-slate-400">
              <tr>
                <th className="px-4 py-2 text-left">이름</th>
                <th className="px-4 py-2 text-left">등록일</th>
                <th className="px-4 py-2 text-left">구간</th>
                <th className="px-4 py-2 text-left">금액</th>
                <th className="px-4 py-2 text-left">채널</th>
                <th className="px-4 py-2 text-left">SNS</th>
                <th className="px-4 py-2 text-left">결제처</th>
                <th className="px-4 py-2 text-left">상태</th>
                <th className="px-4 py-2 text-left">수정</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(({ sec, rows }) => {
                // 실매출 = Σ(원결제−환불액), 입금완료·미이전 (부분환불 잔액 포함, 전액환불 0)
                // 인원(realCount)은 환불자 제외 — 매출과 분리
                const subtotal = rows
                  .filter((r) => r.payment === "입금완료" && !r.is_transfer)
                  .reduce((s, r) => {
                    const eff = r.is_refund ? ((r.refund_amount ?? 0) > 0 ? (r.refund_amount ?? 0) : (r.amount ?? 0)) : 0;
                    return s + ((r.amount ?? 0) - eff);
                  }, 0);
                const realCount = rows.filter((r) => statusOf(r) === "입금완료").length;
                return (
                  <Fragment key={sec}>
                    <tr className="bg-slate-800/60 border-t border-slate-800">
                      <td colSpan={9} className="px-4 py-2 font-bold text-slate-200">
                        {sec}
                        <span className="ml-2 font-normal text-slate-400">
                          · {rows.length}명(입금 {realCount}) · 실매출 {subtotal.toLocaleString("ko-KR")}원
                        </span>
                      </td>
                    </tr>
                    {rows.map((r) => (
                      <RegRow key={r.id} r={r} cohorts={cohorts} cohortId={cohortId} />
                    ))}
                  </Fragment>
                );
              })}
              {groups.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-500">
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
