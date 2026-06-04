"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const SECTIONS = ["사전등록", "1차EB", "대기1", "2차EB", "대기2", "정규", "추가"];
const SNS = ["", "유튜브", "인스타", "네이버TV", "틱톡"];

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
    payment: "입금완료",
  });

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
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
      payment: form.payment,
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
            onChange={(e) => set("section", e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500"
          >
            {SECTIONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
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
