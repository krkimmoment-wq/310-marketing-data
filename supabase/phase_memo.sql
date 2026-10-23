-- ============================================================
-- 구간 요약 "잘 된 액션" 메모 (기수 × 구간 한 줄) — 2026-10-23
-- Supabase SQL Editor 에 통째로 붙여넣고 [Run] 한 번 실행
-- ============================================================
create table if not exists phase_memo (
  cohort_id  bigint not null references cohorts(id) on delete cascade,
  phase      text   not null,              -- Day1이전 / 사전등록 / 1차EB / 대기1 / 2차EB / 대기2 / 정규 / 추가
  memo       text,
  updated_at timestamptz not null default now(),
  primary key (cohort_id, phase)
);
alter table phase_memo enable row level security;
create policy "read"  on phase_memo for select to authenticated using (true);
create policy "write" on phase_memo for all    to authenticated using (true) with check (true);

notify pgrst, 'reload schema';
