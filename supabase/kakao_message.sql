-- ============================================================
-- 8) 카카오 채널 메시지 성과 (수동 입력) — 2026-08-03
--    Supabase SQL Editor 에 붙여넣고 [Run] 한 번 실행
-- ============================================================
create table if not exists kakao_message (
  id                bigint generated always as identity primary key,
  cohort_id         bigint references cohorts(id) on delete cascade,
  title             text,                       -- 메시지 제목
  content           text,                       -- 메시지 내용
  sent_count        int  not null default 0,    -- 발송수
  impression_count  int  not null default 0,    -- 노출수(참고, 핵심분모 아님)
  click_count       int  not null default 0,    -- 클릭수
  total_cost        int  not null default 0,    -- 발송비용(원)
  sent_date         date,                        -- 발송일
  created_at        timestamptz default now()
);
create index if not exists idx_kakao_msg_cohort on kakao_message(cohort_id);

-- ★ RLS 2줄 세트 (안 넣으면 authenticated 읽기 0건 → 화면 빈칸)
alter table kakao_message enable row level security;
create policy "read"  on kakao_message for select to authenticated using (true);
create policy "write" on kakao_message for all    to authenticated using (true) with check (true);
