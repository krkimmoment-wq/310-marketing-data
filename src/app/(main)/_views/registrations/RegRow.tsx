"use client";
// 등록자 행 — [수정] 버튼으로 행 전체 편집 (이름·등록일·구간·금액·채널·SNS·상태)
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { statusOf } from "./StatusCell";

const SECTIONS = ["사전등록", "1차EB", "대기1", "2차EB", "대기2", "정규", "추가"];
const SNS = ["", "유튜브", "인스타", "네이버TV", "틱톡"];
const PAY_PLATFORMS = ["홈페이지", "유튜브", "기타"];
const STATUSES = ["입금완료", "미입금", "환불", "기수이전"];

// 상태 → 컬럼 매핑
const STATUS_MAP: Record<string, { payment: string; is_refund: boolean; is_transfer: boolean }> = {
  입금완료: { payment: "입금완료", is_refund: false, is_transfer: false },
  미입금: { payment: "미입금", is_refund: false, is_transfer: false },
  환불: { payment: "입금완료", is_refund: true, is_transfer: false },
  기수이전: { payment: "입금완료", is_refund: false, is_transfer: true },
};
const STATUS_VIEW: Record<string, { label: string; cls: string }> = {
  입금완료: { label: "✅ 입금", cls: "text-emerald-300" },
  미입금: { label: "⏳ 미입금", cls: "text-amber-300" },
  환불: { label: "↩️ 환불", cls: "text-rose-300" },
  기수이전: { label: "🔄 기수이전", cls: "text-slate-400" },
};

export type Reg = {
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

const inputCls = "w-full px-2 py-1 rounded bg-slate-900/60 border border-slate-700 text-slate-100 outline-none focus:border-cyan-400 text-xs";

export default function RegRow({ r, cohorts, cohortId }: { r: Reg; cohorts: { id: number; name: string }[]; cohortId?: number }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const cohortName = (id?: number | null) => cohorts.find((c) => c.id === id)?.name ?? "?";
  // 현재 보는 기수(cohortId) 기준 분류: 떠난 이전자(원 기수) vs 도착 이전자(다른 기수에서 옴)
  const isDeparted = r.is_transfer && !!r.transfer_to_cohort_id && r.cohort_id === cohortId && r.transfer_to_cohort_id !== cohortId;
  const isArrival = r.transfer_to_cohort_id === cohortId && r.cohort_id !== cohortId;
  const [form, setForm] = useState({
    name: r.name,
    reg_date: r.reg_date,
    section: r.section,
    amount: r.amount ?? 0,
    channel: r.channel,
    sns_channel: r.sns_channel ?? "",
    pay_platform: r.pay_platform ?? "홈페이지",
    status: statusOf(r),
    transfer_to: r.transfer_to_cohort_id ? String(r.transfer_to_cohort_id) : "",
    refund_amount: r.refund_amount ? String(r.refund_amount) : "",
  });
  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save() {
    setSaving(true);
    const sb = createClient();
    const { error } = await sb
      .from("registrations")
      .update({
        name: form.name,
        reg_date: form.reg_date,
        section: form.section,
        amount: Number(form.amount) || 0,
        channel: form.channel,
        sns_channel: form.sns_channel || null,
        pay_platform: form.pay_platform,
        ...STATUS_MAP[form.status],
        // 기수이전일 때만 도착 기수 저장, 그 외엔 null
        transfer_to_cohort_id: form.status === "기수이전" ? Number(form.transfer_to) || null : null,
        // 환불일 때만 환불액 저장(미입력=0=전액환불), 그 외엔 0
        refund_amount: form.status === "환불" ? Number(form.refund_amount) || 0 : 0,
      })
      .eq("id", r.id);
    setSaving(false);
    if (error) {
      alert("저장 실패: " + error.message);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm(`등록자 "${r.name}"를 삭제할까요?\n(환불·기수이전이면 삭제 대신 상태 수정을 권장합니다)`)) return;
    setSaving(true);
    const sb = createClient();
    const { error } = await sb.from("registrations").delete().eq("id", r.id);
    setSaving(false);
    if (error) {
      alert("삭제 실패: " + error.message);
      return;
    }
    router.refresh();
  }

  // 기수이전 취소(실수 되돌리기) — is_transfer 해제 + 도착 기수 제거 → 원 기수 정상 등록으로 복귀
  async function cancelTransfer() {
    if (!confirm(`"${r.name}"의 기수이전을 취소하고 ${cohortName(r.cohort_id)} 정상 등록으로 되돌릴까요?`)) return;
    setSaving(true);
    const sb = createClient();
    const { error } = await sb.from("registrations").update({ is_transfer: false, transfer_to_cohort_id: null }).eq("id", r.id);
    setSaving(false);
    if (error) {
      alert("이전 취소 실패: " + error.message);
      return;
    }
    router.refresh();
  }

  function cancel() {
    setForm({
      name: r.name,
      reg_date: r.reg_date,
      section: r.section,
      amount: r.amount ?? 0,
      channel: r.channel,
      sns_channel: r.sns_channel ?? "",
      pay_platform: r.pay_platform ?? "홈페이지",
      status: statusOf(r),
      transfer_to: r.transfer_to_cohort_id ? String(r.transfer_to_cohort_id) : "",
      refund_amount: r.refund_amount ? String(r.refund_amount) : "",
    });
    setEditing(false);
  }

  // 실제 환불액(부분환불이면 refund_amount, 전액환불로 미입력이면 원결제 전액) · 잔액
  const effRefund = r.is_refund ? ((r.refund_amount ?? 0) > 0 ? (r.refund_amount ?? 0) : (r.amount ?? 0)) : 0;
  const balance = (r.amount ?? 0) - effRefund;

  if (!editing) {
    const st = STATUS_VIEW[statusOf(r)];
    return (
      <tr className={`border-t border-slate-800 ${isDeparted ? "opacity-45 bg-slate-800/30" : ""}`}>
        <td className="px-4 py-2 font-medium text-slate-100">
          {r.name}
          {isArrival && (
            <span className="ml-1.5 text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 whitespace-nowrap">
              ↩️ {cohortName(r.cohort_id)}에서 이전
            </span>
          )}
        </td>
        <td className="px-4 py-2 text-slate-300">{r.reg_date}</td>
        <td className="px-4 py-2 text-slate-300">{r.section}</td>
        <td className="px-4 py-2 text-slate-200">
          {r.amount ? r.amount.toLocaleString("ko-KR") + "원" : "-"}
          {r.is_refund && (
            <div className="text-[10px] mt-0.5 leading-tight">
              <span className="text-rose-400">환불 −{effRefund.toLocaleString("ko-KR")}</span>
              {balance > 0
                ? <span className="text-emerald-400"> · 잔액 {balance.toLocaleString("ko-KR")}</span>
                : <span className="text-slate-500"> · 전액환불</span>}
            </div>
          )}
        </td>
        <td className="px-4 py-2 text-slate-300">{r.channel === "tally" ? "🅰️ Tally" : "🅱️ 카카오"}</td>
        <td className="px-4 py-2 text-slate-300">{r.sns_channel ?? "-"}</td>
        <td className="px-4 py-2 text-slate-300">{r.pay_platform ?? "홈페이지"}</td>
        <td className={`px-4 py-2 font-medium ${st.cls}`}>
          {isDeparted
            ? `🔄 ${cohortName(r.transfer_to_cohort_id)}로 이전`
            : isArrival
              ? `↩️ ${cohortName(r.cohort_id)}에서 이전`
              : st.label}
        </td>
        <td className="px-4 py-2">
          {isDeparted ? (
            <button
              onClick={cancelTransfer}
              disabled={saving}
              className="px-2.5 py-1 rounded border border-amber-500/40 text-amber-300 text-xs hover:bg-amber-500/10 disabled:opacity-50"
              title={`${cohortName(r.transfer_to_cohort_id)}로 이전됨 — 이 기수에서는 읽기전용. 취소하면 되돌아옵니다.`}
            >
              ↩️ 이전취소
            </button>
          ) : (
          <>
          <button
            onClick={() => setEditing(true)}
            className="px-2.5 py-1 rounded border border-slate-600 text-slate-300 text-xs hover:bg-slate-800"
          >
            ✏️ 수정
          </button>
          <button
            onClick={remove}
            disabled={saving}
            className="ml-1 px-2.5 py-1 rounded border border-rose-500/30 text-rose-300 text-xs hover:bg-rose-500/10 disabled:opacity-50"
          >
            🗑️
          </button>
          </>
          )}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-cyan-500/30 bg-cyan-500/5">
      <td className="px-3 py-2"><input value={form.name} onChange={(e) => set("name", e.target.value)} className={inputCls} /></td>
      <td className="px-3 py-2"><input type="date" value={form.reg_date} onChange={(e) => set("reg_date", e.target.value)} className={inputCls} /></td>
      <td className="px-3 py-2">
        <select value={form.section} onChange={(e) => set("section", e.target.value)} className={inputCls}>
          {SECTIONS.map((s) => <option key={s}>{s}</option>)}
        </select>
      </td>
      <td className="px-3 py-2"><input type="number" value={form.amount} onChange={(e) => set("amount", Number(e.target.value))} className={inputCls} /></td>
      <td className="px-3 py-2">
        <select value={form.channel} onChange={(e) => set("channel", e.target.value)} className={inputCls}>
          <option value="kakao_direct">🅱️ 카카오</option>
          <option value="tally">🅰️ Tally</option>
        </select>
      </td>
      <td className="px-3 py-2">
        <select value={form.sns_channel} onChange={(e) => set("sns_channel", e.target.value)} className={inputCls}>
          {SNS.map((s) => <option key={s} value={s}>{s || "(없음)"}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        <select value={form.pay_platform} onChange={(e) => set("pay_platform", e.target.value)} className={inputCls}>
          {PAY_PLATFORMS.map((p) => <option key={p}>{p}</option>)}
        </select>
      </td>
      <td className="px-3 py-2">
        <select value={form.status} onChange={(e) => set("status", e.target.value)} className={inputCls}>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        {form.status === "기수이전" && (
          <select
            value={form.transfer_to}
            onChange={(e) => set("transfer_to", e.target.value)}
            className={`${inputCls} mt-1`}
            title="도착 기수 (이 이전자의 매출·인원이 귀속될 기수)"
          >
            <option value="">도착 기수…</option>
            {cohorts.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
        {form.status === "환불" && (
          <div className="mt-1">
            <input
              type="number"
              value={form.refund_amount}
              onChange={(e) => set("refund_amount", e.target.value)}
              placeholder="환불액 (0=전액환불)"
              className={inputCls}
              title="환불받은 금액. 비우면 전액환불(잔액 0)"
            />
            <div className="text-[10px] mt-0.5 text-slate-400">
              잔액 <span className="text-emerald-300">
                {Math.max(0, (Number(form.amount) || 0) - (Number(form.refund_amount) || 0)).toLocaleString("ko-KR")}
              </span>
              {(Number(form.refund_amount) || 0) === 0 && " (전액환불)"}
            </div>
          </div>
        )}
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <button onClick={save} disabled={saving} className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-bold disabled:opacity-50">
          {saving ? "..." : "저장"}
        </button>
        <button onClick={cancel} className="ml-1 px-2 py-1 rounded border border-slate-600 text-slate-300 text-xs">취소</button>
      </td>
    </tr>
  );
}
