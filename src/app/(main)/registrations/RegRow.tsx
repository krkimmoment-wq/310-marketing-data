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
  입금완료: { label: "✅ 입금", cls: "text-emerald-600" },
  미입금: { label: "⏳ 미입금", cls: "text-amber-600" },
  환불: { label: "↩️ 환불", cls: "text-rose-600" },
  기수이전: { label: "🔄 기수이전", cls: "text-slate-500" },
};

export type Reg = {
  id: number;
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
};

const inputCls = "w-full px-2 py-1 rounded border border-blue-300 outline-none focus:border-blue-500 text-xs";

export default function RegRow({ r }: { r: Reg }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: r.name,
    reg_date: r.reg_date,
    section: r.section,
    amount: r.amount ?? 0,
    channel: r.channel,
    sns_channel: r.sns_channel ?? "",
    pay_platform: r.pay_platform ?? "홈페이지",
    status: statusOf(r),
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
    });
    setEditing(false);
  }

  if (!editing) {
    const st = STATUS_VIEW[statusOf(r)];
    return (
      <tr className="border-t border-slate-100">
        <td className="px-4 py-2 font-medium text-slate-800">{r.name}</td>
        <td className="px-4 py-2 text-slate-600">{r.reg_date}</td>
        <td className="px-4 py-2 text-slate-600">{r.section}</td>
        <td className="px-4 py-2 text-slate-700">{r.amount ? r.amount.toLocaleString("ko-KR") + "원" : "-"}</td>
        <td className="px-4 py-2 text-slate-600">{r.channel === "tally" ? "🅰️ Tally" : "🅱️ 카카오"}</td>
        <td className="px-4 py-2 text-slate-600">{r.sns_channel ?? "-"}</td>
        <td className="px-4 py-2 text-slate-600">{r.pay_platform ?? "홈페이지"}</td>
        <td className={`px-4 py-2 font-medium ${st.cls}`}>{st.label}</td>
        <td className="px-4 py-2">
          <button
            onClick={() => setEditing(true)}
            className="px-2.5 py-1 rounded border border-slate-300 text-slate-600 text-xs hover:bg-slate-100"
          >
            ✏️ 수정
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-blue-200 bg-blue-50/40">
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
      </td>
      <td className="px-3 py-2 whitespace-nowrap">
        <button onClick={save} disabled={saving} className="px-2 py-1 rounded bg-blue-600 text-white text-xs font-bold disabled:opacity-50">
          {saving ? "..." : "저장"}
        </button>
        <button onClick={cancel} className="ml-1 px-2 py-1 rounded border border-slate-300 text-slate-500 text-xs">취소</button>
      </td>
    </tr>
  );
}
