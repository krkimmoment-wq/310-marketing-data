"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const SECTIONS = ["사전등록", "1차EB", "대기1", "2차EB", "대기2", "정규", "추가"];
const SNS = ["", "유튜브", "인스타", "네이버TV", "틱톡"];
const PAY_PLATFORMS = ["홈페이지", "유튜브", "기타"]; // 결제처 (매출 집계용 — 인입채널과 별개)

// 구간별 자동 세팅 가격 (대기1·대기2·추가는 케이스별이라 수동 입력 → 매핑 없음)
const PRICE: Record<string, number> = {
  사전등록: 870000, // 1차 얼리버드와 동일
  "1차EB": 870000, // 1차 얼리버드
  "2차EB": 960000, // 2차 얼리버드
  정규: 1050000, // 정가
};

export default function RegForm({ cohortId }: { cohortId?: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    reg_date: new Date().toISOString().slice(0, 10),
    section: "1차EB",
    channel: "kakao_direct",
    sns_channel: "",
    pay_platform: "홈페이지",
    payment: "입금완료",
    amount: PRICE["1차EB"], // 기본 구간(1차EB)의 가격
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  // 구간 변경 시 매핑된 가격이 있으면 금액 자동 세팅 (대기·추가는 비워 수동 입력)
  function setSection(section: string) {
    setForm((f) => ({ ...f, section, amount: PRICE[section] ?? 0 }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!cohortId) return;
    setSaving(true);
    const sb = createClient();
    const { error } = await sb.from("registrations").insert({
      cohort_id: cohortId,
      name: form.name,
      reg_date: form.reg_date,
      section: form.section,
      channel: form.channel,
      sns_channel: form.sns_channel || null,
      pay_platform: form.pay_platform,
      payment: form.payment,
      amount: Number(form.amount) || 0,
    });
    setSaving(false);
    if (error) {
      alert("저장 실패: " + error.message);
    } else {
      setForm((f) => ({ ...f, name: "", sns_channel: "" }));
      setOpen(false);
      router.refresh(); // 목록·대시보드 즉시 갱신
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2.5 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700"
      >
        + 등록자 추가
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
      <div className="font-bold text-slate-700">신규 등록자 추가</div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <label className="text-sm">
          <span className="text-slate-500">이름</span>
          <input
            required
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">등록일</span>
          <input
            type="date"
            value={form.reg_date}
            onChange={(e) => set("reg_date", e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">구간</span>
          <select
            value={form.section}
            onChange={(e) => setSection(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500"
          >
            {SECTIONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-500">
            금액 (원){PRICE[form.section] == null && <span className="text-amber-500"> · 직접 입력</span>}
          </span>
          <input
            type="number"
            value={form.amount}
            onChange={(e) => set("amount", Number(e.target.value))}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500"
          />
        </label>
        <label className="text-sm">
          <span className="text-slate-500">채널</span>
          <select
            value={form.channel}
            onChange={(e) => set("channel", e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500"
          >
            <option value="kakao_direct">🅱️ 카카오 직접</option>
            <option value="tally">🅰️ Tally</option>
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-500">SNS 인입</span>
          <select
            value={form.sns_channel}
            onChange={(e) => set("sns_channel", e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500"
          >
            {SNS.map((s) => (
              <option key={s} value={s}>
                {s || "(없음)"}
              </option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-500">결제 플랫폼</span>
          <select
            value={form.pay_platform}
            onChange={(e) => set("pay_platform", e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500"
          >
            {PAY_PLATFORMS.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <span className="text-slate-500">입금 상태</span>
          <select
            value={form.payment}
            onChange={(e) => set("payment", e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500"
          >
            <option>입금완료</option>
            <option>미입금</option>
          </select>
        </label>
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 rounded-lg bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? "저장 중..." : "저장"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-50"
        >
          취소
        </button>
      </div>
    </form>
  );
}
