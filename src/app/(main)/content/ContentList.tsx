"use client";
// 콘텐츠 목록 — 실시간 검색 + 카테고리별 그룹 + 그룹 클릭 소계
import { Fragment, useState } from "react";
import ContentRow, { type Content, CATEGORIES } from "./ContentRow";

export default function ContentList({ items }: { items: Content[] }) {
  const [q, setQ] = useState("");
  const kw = q.trim().toLowerCase();

  const filtered = kw
    ? items.filter((r) =>
        [r.title, r.category, r.platform, r.reaction, r.status, r.note]
          .filter(Boolean).join(" ").toLowerCase().includes(kw))
    : items;

  // 카테고리 그룹 (표준 순서 + 기타). 그룹 내부는 발행일순
  const cats = [...CATEGORIES, "(기타)"];
  const groups = cats
    .map((cat) => {
      const rows = filtered
        .filter((r) => (cat === "(기타)" ? !CATEGORIES.includes(r.category ?? "") : r.category === cat))
        .sort((a, b) => (a.pub_date ?? "").localeCompare(b.pub_date ?? ""));
      return { cat, rows };
    })
    .filter((g) => g.rows.length > 0);

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">🔍</span>
        <input value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="제목·카테고리·플랫폼·반응 검색…"
          className="w-full pl-9 pr-9 py-2.5 rounded-lg border border-slate-300 outline-none focus:border-blue-500" />
        {q && (
          <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600" title="검색 지우기">✕</button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 font-bold text-slate-700">
          콘텐츠 목록 ({filtered.length}{kw && filtered.length !== items.length ? ` / 전체 ${items.length}` : ""}건)
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-2 text-left">발행일</th>
                <th className="px-4 py-2 text-left">카테고리</th>
                <th className="px-4 py-2 text-left">플랫폼</th>
                <th className="px-4 py-2 text-left">제목 / 내용</th>
                <th className="px-4 py-2 text-right">클릭</th>
                <th className="px-4 py-2 text-left">반응</th>
                <th className="px-4 py-2 text-left">상태</th>
                <th className="px-4 py-2 text-left">관리</th>
              </tr>
            </thead>
            <tbody>
              {groups.map(({ cat, rows }) => {
                const clickSum = rows.reduce((s, r) => s + (r.bitly_clicks ?? 0), 0);
                return (
                  <Fragment key={cat}>
                    <tr className="bg-slate-100/80 border-t border-slate-200">
                      <td colSpan={8} className="px-4 py-2 font-bold text-slate-700">
                        {cat}
                        <span className="ml-2 font-normal text-slate-500">· {rows.length}건 · 클릭 {clickSum.toLocaleString("ko-KR")}</span>
                      </td>
                    </tr>
                    {rows.map((r) => <ContentRow key={r.id} c={r} />)}
                  </Fragment>
                );
              })}
              {groups.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-slate-400">
                    {kw ? `"${q}" 검색 결과가 없습니다.` : "콘텐츠 기록이 없습니다. 위에서 추가하세요."}
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
