"use client";
// 기수 계획판 — 월 달력(칸 배경 = 구간 색), 종류별 칩, 칩 끌어서 날짜 옮기기, 오른쪽 편집 창, 규칙 초안 미리보기, 계획 대비 실행 확인
// 끌어서 옮기기: @atlaskit/pragmatic-drag-and-drop (Apache-2.0)
import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { draggable, dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/adapter/element-adapter";
import { createClient } from "@/lib/supabase/client";
import { deleteWithLog, withEditor } from "@/lib/audit";
import {
  AD_CHANNEL_LABEL, KIND_META, PLAN_PHASE_BG, STATUS_LABEL,
  addDays, adActualPeriod, adOnDates, checkExecution, dayNumber, diffDays, draftDiff, generateDraft, monthWeeks, phaseStartLabel, planMonths, planPhase,
  type ActualChip, type AdChannel, type DraftItem, type ExecRecords, type ExecStatus, type PlanItem, type PlanKind, type PlanStatus,
} from "@/lib/planCore";
import type { PlanCohort } from "@/lib/plan";

const WD = ["일", "월", "화", "수", "목", "금", "토"];
const KINDS = Object.keys(KIND_META) as PlanKind[];
const md = (d: string) => `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}`;
const wd = (d: string) => WD[new Date(d + "T00:00:00Z").getUTCDay()];
const EXEC_STYLE: Record<ExecStatus, { mark: string; cls: string }> = {
  예정: { mark: "", cls: "bg-gray-100 text-gray-700" },
  완료: { mark: "✓", cls: "bg-green-100 text-green-800" },
  "완료(직접)": { mark: "✓", cls: "bg-green-50 text-green-800" },
  유예: { mark: "…", cls: "bg-amber-100 text-amber-800" },
  누락: { mark: "!", cls: "bg-red-100 text-red-800" },
  "사람 확인": { mark: "?", cls: "bg-sky-100 text-sky-800" },
  "끄기 확인": { mark: "!", cls: "bg-orange-100 text-orange-800" },
  취소: { mark: "", cls: "bg-gray-100 text-gray-500" },
};

type Form = Omit<PlanItem, "id" | "cohort_id" | "source" | "rule_key"> & { id?: number; source?: PlanItem["source"]; rule_key?: string | null };
const emptyForm = (date: string): Form => ({
  plan_date: date, end_date: null, plan_time: null, kind: "kakao", title: "", owner: "", memo: "", status: "planned",
  ready: false, optional: false, ad_channel: null, ad_amount: null,
});

function DraggableChip({ item, exec, selected, onClick }: { item: PlanItem; exec: ExecStatus; selected: boolean; onClick: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [dragging, setDragging] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    return draggable({ element: el, getInitialData: () => ({ planId: item.id }), onDragStart: () => setDragging(true), onDrop: () => setDragging(false) });
  }, [item.id]);
  const k = KIND_META[item.kind];
  const ex = EXEC_STYLE[exec];
  return (
    <button
      ref={ref}
      type="button"
      onClick={onClick}
      title={`${k.label} · ${item.title ?? ""} — 끌어서 날짜 옮기기`}
      className={`flex w-full min-h-6 items-center gap-1 rounded px-1 py-0.5 text-left text-[11px] leading-tight cursor-grab ${dragging ? "opacity-40" : ""} ${selected ? "ring-2 ring-blue-700" : ""}`}
      style={{
        background: k.bg,
        color: k.fg,
        border: `1.5px ${item.optional ? "dotted" : "dashed"} ${k.border}`, // 계획 = 점선 (선택 항목 = 점 테두리)
        textDecoration: item.status === "canceled" ? "line-through" : undefined,
        opacity: item.status === "canceled" ? 0.55 : undefined,
      }}
    >
      <span className="font-bold shrink-0">{k.label}</span>
      <span className="truncate">{item.title}</span>
      {ex.mark && <span className={`ml-auto shrink-0 rounded px-0.5 font-bold ${ex.cls}`}>{ex.mark}</span>}
    </button>
  );
}

// 실제 기록 칩 (실선·채움) — 카톡·광고 시작·특강·라이브·콘텐츠 기록
function RecordChip({ chip }: { chip: ActualChip }) {
  const k = KIND_META[chip.kind];
  return (
    <span
      title={`실제 기록 · ${chip.label}${chip.title ? ` · ${chip.title}` : ""}`}
      className="flex w-full min-h-5 items-center gap-1 rounded px-1 py-0.5 text-[10.5px] leading-tight"
      style={{ background: k.bg, color: k.fg, border: `1.5px solid ${k.border}` }}
    >
      <span className="font-bold shrink-0">{chip.label}</span>
      {chip.title && <span className="truncate">{chip.title}</span>}
    </span>
  );
}

function DayCell({
  date, cohort, adOn, items, actual, execOf, selectedId, onPick, onAdd, onDropItem,
}: {
  date: string | null;
  cohort: PlanCohort;
  adOn: boolean;
  items: PlanItem[];
  actual: ActualChip[];
  execOf: (it: PlanItem) => ExecStatus;
  selectedId: number | null;
  onPick: (it: PlanItem) => void;
  onAdd: (date: string) => void;
  onDropItem: (id: number, date: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [over, setOver] = useState(false);
  // 놓았을 때 부를 함수는 항상 최신 것으로 (끌어놓기 등록은 날짜가 바뀔 때만 다시)
  const dropRef = useRef(onDropItem);
  useEffect(() => {
    dropRef.current = onDropItem;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el || !date) return;
    return dropTargetForElements({
      element: el,
      getData: () => ({ date }),
      onDragEnter: () => setOver(true),
      onDragLeave: () => setOver(false),
      onDrop: ({ source }) => {
        setOver(false);
        const id = Number(source.data.planId);
        if (id) dropRef.current(id, date);
      },
    });
  }, [date]);
  if (!date) return <div className="min-h-28 rounded-md bg-transparent" />;
  const phase = planPhase(cohort, date);
  const startLabel = phaseStartLabel(cohort, date);
  const day = dayNumber(cohort, date);
  const dw = new Date(date + "T00:00:00Z").getUTCDay();
  const weekend = dw === 0 || dw === 5 || dw === 6; // 금·토·일 굵게
  return (
    <div
      ref={ref}
      className={`flex min-h-28 flex-col gap-1 rounded-md border p-1.5 ${over ? "border-blue-700 ring-2 ring-blue-300" : "border-gray-200"}`}
      style={{ background: phase ? PLAN_PHASE_BG[phase] : "#FAFAF9" }}
    >
      <div className="flex items-baseline gap-1">
        <span className={`text-[13px] ${weekend ? "font-black text-gray-900" : "text-gray-700"}`}>{Number(date.slice(8, 10))}</span>
        {day !== null && <span className="text-[10px] text-gray-500">Day {day}</span>}
        <button type="button" onClick={() => onAdd(date)} aria-label={`${md(date)} 항목 추가`} className="ml-auto rounded px-1 text-[13px] leading-none text-gray-500 hover:bg-white hover:text-gray-900">
          +
        </button>
      </div>
      {startLabel && <span className="w-fit rounded bg-white/80 px-1 text-[10px] font-bold text-gray-800">{startLabel}</span>}
      {adOn && <span className="rounded-sm bg-red-600 px-1 text-[10px] font-bold text-white">광고 ON</span>}
      <div className="flex flex-col gap-0.5">
        {actual.map((c, i) => (
          <RecordChip key={`r${i}`} chip={c} />
        ))}
        {items.map((it) => (
          <DraggableChip key={it.id} item={it} exec={execOf(it)} selected={selectedId === it.id} onClick={() => onPick(it)} />
        ))}
      </div>
    </div>
  );
}

export default function PlanBoard({
  cohort, items, records, actual, isPast, today,
}: {
  cohort: PlanCohort;
  items: PlanItem[];
  records: ExecRecords;
  actual: ActualChip[];
  isPast: boolean;
  today: string;
}) {
  const [showActual, setShowActual] = useState(true);
  const router = useRouter();
  const [list, setList] = useState<PlanItem[]>(items);
  // 저장 후 새로 받은 목록으로 맞춤 (렌더 중 이전 값과 비교하는 방식)
  const [prevItems, setPrevItems] = useState(items);
  if (items !== prevItems) {
    setPrevItems(items);
    setList(items);
  }
  const months = planMonths(cohort, today);
  const todayIdx = months.findIndex(([y, m]) => y === Number(today.slice(0, 4)) && m === Number(today.slice(5, 7)));
  const [mi, setMi] = useState(todayIdx >= 0 ? todayIdx : 0);
  const [hidden, setHidden] = useState<PlanKind[]>([]);
  const [form, setForm] = useState<Form | null>(null);
  const [preview, setPreview] = useState<{ add: DraftItem[]; skip: DraftItem[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const draft = useMemo(() => generateDraft(cohort), [cohort]);
  const adOn = useMemo(() => adOnDates(list), [list]);
  const execOf = (it: PlanItem) => checkExecution(it, records, today);
  const [y, m] = months[mi] ?? [Number(today.slice(0, 4)), Number(today.slice(5, 7))];
  const weeks = monthWeeks(y, m);
  const visible = list.filter((it) => !hidden.includes(it.kind));

  async function who() {
    const { data } = await createClient().auth.getSession();
    return data.session?.user.email ?? null;
  }
  async function save() {
    if (!form) return;
    if (!form.plan_date) return setMsg("날짜를 입력하세요.");
    setBusy(true);
    const sb = createClient();
    const row = {
      plan_date: form.plan_date,
      end_date: form.kind === "ad" ? form.end_date || null : null,
      plan_time: form.plan_time || null,
      kind: form.kind,
      title: form.title || null,
      owner: form.owner || null,
      memo: form.memo || null,
      status: form.status,
      ready: form.ready,
      optional: form.optional,
      ad_channel: form.kind === "ad" ? form.ad_channel : null,
      ad_amount: form.kind === "ad" && form.ad_amount !== null && !Number.isNaN(form.ad_amount) ? form.ad_amount : null,
      updated_at: new Date().toISOString(),
      updated_by: await who(),
    };
    const res = form.id
      ? await sb.from("plan_items").update(row).eq("id", form.id)
      : await sb.from("plan_items").insert({ ...row, cohort_id: cohort.id, source: "manual" });
    setBusy(false);
    if (res.error) return setMsg("저장 실패: " + res.error.message);
    setMsg(form.id ? "저장했습니다." : "추가했습니다.");
    setForm(null);
    router.refresh();
  }
  async function remove() {
    if (!form?.id) return;
    if (!window.confirm(`"${form.title ?? KIND_META[form.kind].label}" 항목을 삭제할까요?
· 삭제하면 누가·언제·무엇을 지웠는지 기록이 남습니다 (제목·담당·메모는 기록하지 않음)`)) return;
    const target = list.find((x) => x.id === form.id);
    setBusy(true);
    const { error, logError } = await deleteWithLog("plan_items", target ?? { id: form.id, cohort_id: cohort.id, plan_date: form.plan_date, kind: form.kind, status: form.status }, cohort.name);
    setBusy(false);
    if (error) return setMsg("삭제 실패: " + error);
    setList((l) => l.filter((x) => x.id !== form.id));
    setForm(null);
    setMsg(logError ? "삭제했습니다. (삭제 기록 실패: " + logError + ")" : "삭제했습니다.");
    router.refresh();
  }
  // 끌어서 날짜 옮기기 (광고는 끄는 날도 같은 만큼 이동)
  async function move(id: number, date: string) {
    const it = list.find((x) => x.id === id);
    if (!it || it.plan_date === date) return;
    const delta = diffDays(it.plan_date, date);
    const patch = { plan_date: date, end_date: it.end_date ? addDays(it.end_date, delta) : null };
    const before = list;
    setList((l) => l.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    const { error } = await createClient()
      .from("plan_items")
      .update({ ...patch, updated_at: new Date().toISOString(), updated_by: await who() })
      .eq("id", id);
    if (error) {
      setList(before);
      return setMsg("옮기기 실패: " + error.message);
    }
    setMsg(`${KIND_META[it.kind].label} "${it.title ?? ""}" → ${md(date)}(${wd(date)})로 옮김`);
    router.refresh();
  }
  async function addDraft() {
    if (!preview?.add.length) return;
    setBusy(true);
    const by = await who();
    const { error } = await createClient()
      .from("plan_items")
      .insert(preview.add.map((d) => ({ ...d, cohort_id: cohort.id, status: "planned", ready: false, updated_by: by })));
    setBusy(false);
    if (error) return setMsg("초안 추가 실패: " + error.message);
    setMsg(`규칙 초안 ${preview.add.length}개를 추가했습니다.`);
    setPreview(null);
    router.refresh();
  }

  const execRows = list.slice().sort((a, b) => a.plan_date.localeCompare(b.plan_date));
  const counts = execRows.reduce<Record<string, number>>((acc, it) => {
    const e = execOf(it);
    acc[e] = (acc[e] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="flex flex-col gap-4">
      {/* 위쪽 도구 */}
      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" disabled={mi === 0} onClick={() => setMi(mi - 1)} className="min-h-10 rounded-lg border border-gray-300 px-3 text-sm disabled:opacity-40" aria-label="이전 달">◀</button>
          <h2 className="text-lg font-black">{y}년 {m}월</h2>
          <button type="button" disabled={mi >= months.length - 1} onClick={() => setMi(mi + 1)} className="min-h-10 rounded-lg border border-gray-300 px-3 text-sm disabled:opacity-40" aria-label="다음 달">▶</button>
          <span className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!draft.ok || busy}
              onClick={() => {
                if (!draft.ok) return;
                if (isPast && !window.confirm(`${cohort.name}은 지난 기수입니다. 그래도 규칙 초안을 만들까요?`)) return;
                setPreview(draftDiff(list, draft.items));
              }}
              className="min-h-10 rounded-lg bg-[#1E3A8A] px-4 text-sm font-bold text-white disabled:bg-gray-300 disabled:text-gray-600"
            >
              규칙으로 초안 만들기
            </button>
            <button type="button" onClick={() => setForm(emptyForm(months[mi] ? `${y}-${String(m).padStart(2, "0")}-01` : today))} className="min-h-10 rounded-lg border border-gray-300 bg-white px-4 text-sm font-bold">
              + 항목 추가
            </button>
          </span>
        </div>
        {!draft.ok && (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
            {cohort.name} 일정이 아직 비어 있어 규칙 초안과 구간 색을 만들 수 없습니다 (비어 있음: {draft.missing.join(" · ")}).{" "}
            <Link href="/manage?tab=cohorts" className="font-bold underline">기수 관리에서 날짜 먼저 입력</Link>
          </p>
        )}
        <div role="group" aria-label="종류별 보기" className="flex flex-wrap items-center gap-2 text-[13px]">
          <span className="text-gray-600">보기</span>
          {KINDS.map((k) => {
            const on = !hidden.includes(k);
            return (
              <button
                key={k}
                type="button"
                aria-pressed={on}
                onClick={() => setHidden((h) => (on ? [...h, k] : h.filter((x) => x !== k)))}
                className="min-h-8 rounded-full px-3 py-1 font-bold"
                style={{ background: on ? KIND_META[k].bg : "#FFFFFF", color: on ? KIND_META[k].fg : "#6B7280", border: `1px ${on ? "solid" : "dashed"} ${KIND_META[k].border}` }}
              >
                {KIND_META[k].label}
              </button>
            );
          })}
          <button
            type="button"
            aria-pressed={showActual}
            onClick={() => setShowActual(!showActual)}
            className={`min-h-8 rounded-full border px-3 py-1 font-bold ${showActual ? "border-gray-800 bg-gray-800 text-white" : "border-gray-400 bg-white text-gray-600"}`}
          >
            실제 기록 {actual.length}건
          </button>
          <span className="text-[12px] text-gray-600">· 숏폼 1일 1개는 기본값이라 표시하지 않음</span>
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-gray-700">
          <span className="font-bold">칸 색</span>
          {Object.entries(PLAN_PHASE_BG).map(([p, bg]) => (
            <span key={p} className="inline-flex items-center gap-1">
              <span className="h-3 w-3 rounded-sm border border-gray-300" style={{ background: bg }} />
              {p}
            </span>
          ))}
          <span>· 점선 칩 = 계획 (점 테두리 = 선택 항목) · 실선 칩 = 실제 기록 · 칩 끝 표시: ✓ 완료 · … 2일 유예 · ! 누락 · ? 사람 확인</span>
        </div>
        {msg && <p role="status" className="text-[13px] font-bold text-blue-800">{msg}</p>}
      </div>

      {/* 규칙 초안 미리보기 */}
      {preview && (
        <section aria-label="규칙 초안 미리보기" className="flex flex-col gap-2 rounded-xl border-2 border-[#1E3A8A] bg-white p-4">
          <h3 className="text-[15px] font-black">
            {preview.add.length}개 추가 · 이미 있는 {preview.skip.length}개 건너뜀
          </h3>
          <ul className="grid gap-1 text-[13px] sm:grid-cols-2">
            {preview.add.map((d) => (
              <li key={d.rule_key} className="flex items-center gap-2">
                <span className="w-20 shrink-0 text-gray-600">{md(d.plan_date)}({wd(d.plan_date)})</span>
                <span className="rounded px-1 text-[11px] font-bold" style={{ background: KIND_META[d.kind].bg, color: KIND_META[d.kind].fg }}>{KIND_META[d.kind].label}</span>
                <span>{d.title}{d.end_date ? ` ~${md(d.end_date)}` : ""}{d.optional ? " (선택)" : ""}{d.memo ? ` · ${d.memo}` : ""}</span>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <button type="button" disabled={busy || !preview.add.length} onClick={addDraft} className="min-h-10 rounded-lg bg-[#1E3A8A] px-4 text-sm font-bold text-white disabled:opacity-50">추가</button>
            <button type="button" onClick={() => setPreview(null)} className="min-h-10 rounded-lg border border-gray-300 px-4 text-sm">닫기</button>
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-start gap-4">
        {/* 달력 */}
        <div className="min-w-0 flex-[999_1_720px] overflow-x-auto rounded-xl border border-gray-200 bg-white p-3">
          <div className="grid min-w-[760px] grid-cols-7 gap-1">
            {WD.map((d, i) => (
              <div key={d} className={`pb-1 text-center text-[12px] ${i === 0 || i >= 5 ? "font-black text-gray-900" : "text-gray-600"}`}>{d}</div>
            ))}
            {weeks.flat().map((date, i) => (
              <DayCell
                key={date ?? `x${i}`}
                date={date}
                cohort={cohort}
                adOn={!!date && adOn.has(date)}
                items={date ? visible.filter((it) => it.plan_date === date) : []}
                actual={date && showActual ? actual.filter((c) => c.date === date && !hidden.includes(c.kind)) : []}
                execOf={execOf}
                selectedId={form?.id ?? null}
                onPick={(it) => setForm({ ...it })}
                onAdd={(d) => setForm(emptyForm(d))}
                onDropItem={move}
              />
            ))}
          </div>
        </div>

        {/* 오른쪽 편집 창 */}
        <aside aria-label="항목 편집" className="flex flex-[1_1_300px] flex-col gap-3 rounded-xl border-2 border-[#1E3A8A] bg-white p-4 text-[13px] lg:sticky lg:top-4">
          {!form ? (
            <span className="text-gray-600">칩을 누르면 여기서 고칩니다. 칸의 + 또는 [+ 항목 추가]로 새 항목을 넣습니다.</span>
          ) : (
            <>
              <h3 className="text-[15px] font-black">{form.id ? "항목 고치기" : "새 항목"}</h3>
              {form.id && (
                <span className={`w-fit rounded px-2 py-0.5 text-[12px] font-bold ${EXEC_STYLE[execOf(form as PlanItem)].cls}`}>
                  실행 확인: {execOf(form as PlanItem)}
                </span>
              )}
              <label className="flex flex-col gap-1">종류
                <select value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as PlanKind })} className="min-h-10 rounded-lg border border-gray-300 px-2">
                  {KINDS.map((k) => <option key={k} value={k}>{KIND_META[k].label}</option>)}
                </select>
              </label>
              <div className="flex gap-2">
                <label className="flex flex-1 flex-col gap-1">날짜
                  <input type="date" value={form.plan_date} onChange={(e) => setForm({ ...form, plan_date: e.target.value })} className="min-h-10 rounded-lg border border-gray-300 px-2" />
                </label>
                <label className="flex w-28 flex-col gap-1">시간
                  <input value={form.plan_time ?? ""} placeholder="20:00" onChange={(e) => setForm({ ...form, plan_time: e.target.value })} className="min-h-10 rounded-lg border border-gray-300 px-2" />
                </label>
              </div>
              <label className="flex flex-col gap-1">제목
                <input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} className="min-h-10 rounded-lg border border-gray-300 px-2" />
              </label>
              <label className="flex flex-col gap-1">담당자
                <input value={form.owner ?? ""} onChange={(e) => setForm({ ...form, owner: e.target.value })} className="min-h-10 rounded-lg border border-gray-300 px-2" />
              </label>
              <fieldset className="flex flex-wrap gap-3">
                <legend className="mb-1">상태</legend>
                {(Object.keys(STATUS_LABEL) as PlanStatus[]).map((s) => (
                  <label key={s} className="inline-flex min-h-8 items-center gap-1">
                    <input type="radio" name="plan-status" checked={form.status === s} onChange={() => setForm({ ...form, status: s })} />
                    {STATUS_LABEL[s]}
                  </label>
                ))}
              </fieldset>
              <div className="flex flex-wrap gap-4">
                <label className="inline-flex min-h-8 items-center gap-1.5">
                  <input type="checkbox" checked={form.ready} onChange={(e) => setForm({ ...form, ready: e.target.checked })} /> 준비 완료
                </label>
                <label className="inline-flex min-h-8 items-center gap-1.5">
                  <input type="checkbox" checked={form.optional} onChange={(e) => setForm({ ...form, optional: e.target.checked })} /> 선택 항목
                </label>
              </div>
              {form.kind === "ad" && (
                <div className="flex flex-col gap-2 rounded-lg bg-red-50 p-2">
                  <label className="flex flex-col gap-1">광고 종류
                    <select value={form.ad_channel ?? ""} onChange={(e) => setForm({ ...form, ad_channel: (e.target.value || null) as AdChannel | null })} className="min-h-10 rounded-lg border border-gray-300 bg-white px-2">
                      <option value="">선택 안 함</option>
                      {(Object.keys(AD_CHANNEL_LABEL) as AdChannel[]).map((c) => <option key={c} value={c}>{AD_CHANNEL_LABEL[c]}</option>)}
                    </select>
                  </label>
                  <div className="flex gap-2">
                    <label className="flex flex-1 flex-col gap-1">금액(원)
                      <input type="number" inputMode="numeric" value={form.ad_amount ?? ""} onChange={(e) => setForm({ ...form, ad_amount: e.target.value === "" ? null : Number(e.target.value) })} className="min-h-10 rounded-lg border border-gray-300 bg-white px-2" />
                    </label>
                    <label className="flex flex-1 flex-col gap-1">끄는 날
                      <input type="date" value={form.end_date ?? ""} onChange={(e) => setForm({ ...form, end_date: e.target.value || null })} className="min-h-10 rounded-lg border border-gray-300 bg-white px-2" />
                    </label>
                  </div>
                </div>
              )}
              <label className="flex flex-col gap-1">메모
                <textarea value={form.memo ?? ""} rows={3} onChange={(e) => setForm({ ...form, memo: e.target.value })} className="rounded-lg border border-gray-300 px-2 py-1" />
              </label>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} onClick={save} className="min-h-10 rounded-lg bg-[#1E3A8A] px-4 font-bold text-white disabled:opacity-50">저장</button>
                {form.id && <button type="button" disabled={busy} onClick={remove} className="min-h-10 rounded-lg border border-red-300 px-4 font-bold text-red-700">삭제</button>}
                <button type="button" onClick={() => setForm(null)} className="min-h-10 rounded-lg border border-gray-300 px-4">닫기</button>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* 계획 대비 실행 확인 */}
      <section aria-label="계획 대비 실행 확인" className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-4">
        <h2 className="text-[15px] font-bold">
          계획 대비 실행 확인{" "}
          <span className="text-[12px] font-normal text-gray-600">
            — {execRows.length ? Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(" · ") : "계획 항목 없음"}
          </span>
        </h2>
        <p className="text-[12px] text-gray-600">
          카톡 = 카톡 메시지 발송일 · 광고 = 광고비 시작일 ±1일 + 종류(장부에 종류가 있으면 종류까지, 없으면 매체) · 끄는 날이 지났는데 장부 종료일이 빈칸이면 &quot;끄기 확인&quot; · 특강·라이브 = 콘텐츠 기록 종류(특강·라이브) · 홍보쇼츠·키콘 = 같은 날 숏폼·롱폼이 있으면 &quot;사람 확인&quot; · 기록이 없으면 2일 유예 후 누락
        </p>
        {execRows.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-[13px]">
              <thead>
                <tr className="bg-gray-50 text-left text-gray-700">
                  <th className="px-2 py-1.5">날짜</th><th className="px-2 py-1.5">종류</th><th className="px-2 py-1.5">제목</th>
                  <th className="px-2 py-1.5">담당</th><th className="px-2 py-1.5">상태</th><th className="px-2 py-1.5">준비</th><th className="px-2 py-1.5">실행 확인</th>
                </tr>
              </thead>
              <tbody>
                {execRows.map((it) => {
                  const e = execOf(it);
                  return (
                    <tr key={it.id} className="border-t border-gray-100">
                      <td className="px-2 py-1.5 whitespace-nowrap">{md(it.plan_date)}({wd(it.plan_date)}){it.end_date ? ` ~${md(it.end_date)}` : ""}</td>
                      <td className="px-2 py-1.5"><span className="rounded px-1 text-[11px] font-bold" style={{ background: KIND_META[it.kind].bg, color: KIND_META[it.kind].fg }}>{KIND_META[it.kind].label}</span></td>
                      <td className="px-2 py-1.5">
                        <button type="button" onClick={() => setForm({ ...it })} className="text-left underline-offset-2 hover:underline">{it.title ?? "—"}</button>
                      </td>
                      <td className="px-2 py-1.5">{it.owner ?? "—"}</td>
                      <td className="px-2 py-1.5">{STATUS_LABEL[it.status]}</td>
                      <td className="px-2 py-1.5">{it.ready ? "✓" : "—"}</td>
                      <td className="px-2 py-1.5">
                        <span className={`rounded px-1.5 py-0.5 text-[12px] font-bold ${EXEC_STYLE[e].cls}`}>{e}</span>
                        {it.kind === "ad" && adActualPeriod(it, records) && <span className="ml-1 text-[11px] text-gray-600">{adActualPeriod(it, records)}</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
