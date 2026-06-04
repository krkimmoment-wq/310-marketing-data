-- ============================================================
-- 310 다이어트 클래스 운영 워크스페이스 — DB 스키마 v1
-- 2026-06-04 박민수님 확정
-- Supabase SQL Editor에 붙여넣어 실행
-- ============================================================

-- 1) 기수 (13기·14기·15기...)
create table if not exists cohorts (
  id            bigint generated always as identity primary key,
  name          text not null,                 -- "14기"
  goal          int  not null default 150,      -- 목표 인원
  pre_open      date,                            -- 사전등록 시작
  eb1_open      date, eb1_close date,            -- 1차 EB
  eb2_open      date, eb2_close date,            -- 2차 EB
  reg_open      date, reg_close date,            -- 정규
  extra_close   date,                            -- 추가등록 마감
  ended_at      date,                            -- 기수 종료
  created_at    timestamptz default now()
);

-- 2) 등록자 (MVP 핵심) — 좌측 명단 + 우측 위젯 + 구간 집계 통합
create table if not exists registrations (
  id            bigint generated always as identity primary key,
  cohort_id     bigint references cohorts(id) on delete cascade,
  name          text not null,
  reg_date      date not null,                   -- 등록일
  section       text not null,                   -- 사전등록/1차EB/대기1/2차EB/대기2/정규/추가
  channel       text,                            -- tally / kakao_direct
  sns_channel   text,                            -- 유튜브/인스타/네이버TV/틱톡
  payment       text not null default '입금완료', -- 입금완료 / 미입금
  is_refund     boolean not null default false,  -- 환불 여부
  is_transfer   boolean not null default false,  -- 기수이전 여부
  submitted_at  timestamptz,                     -- Tally 제출 일시 (있으면)
  note          text,
  created_at    timestamptz default now()
);
create index if not exists idx_reg_cohort on registrations(cohort_id);
create index if not exists idx_reg_section on registrations(cohort_id, section);

-- 3) 광고비 (YouTube 프로모션 + 인스타 광고)
create table if not exists ad_spend (
  id            bigint generated always as identity primary key,
  cohort_id     bigint references cohorts(id) on delete cascade,
  platform      text not null,                   -- youtube / instagram
  campaign      text,                            -- 캠페인명
  period_start  date,                            -- 집행 시작
  cost          int  not null default 0,         -- 광고비(원)
  impressions   int  not null default 0,         -- 노출
  views         int  not null default 0,         -- 조회(YT) / 도달(IG)
  clicks        int  not null default 0,         -- 웹방문(YT) / 링크클릭(IG)
  landing_views int  not null default 0,         -- 랜딩뷰(IG)
  updated_at    timestamptz default now()
);
create index if not exists idx_ad_cohort on ad_spend(cohort_id);

-- 4) 매출 (채널별 결제·환불)
create table if not exists revenue (
  id            bigint generated always as identity primary key,
  cohort_id     bigint references cohorts(id) on delete cascade,
  channel       text not null,                   -- 홈페이지 / 유튜브스토어 / 기타
  total_paid    int  not null default 0,         -- 총 결제
  refund        int  not null default 0,         -- 환불(음수 가능)
  updated_at    timestamptz default now()
);
create index if not exists idx_rev_cohort on revenue(cohort_id);

-- 5) 콘텐츠 기록
create table if not exists content_log (
  id            bigint generated always as identity primary key,
  cohort_id     bigint references cohorts(id) on delete cascade,
  pub_date      date not null,                   -- 발행일
  category      text,                            -- 커뮤니티/특강/카카오/이벤트/외부협업/영상
  platform      text,                            -- 유튜브/인스타/틱톡...
  title         text,                            -- 제목·주제
  reach         text,                            -- 참여·노출
  reaction      text,                            -- 반응·클릭
  bitly_clicks  int,                             -- 발행일 당일 비틀리 (자동, 보존)
  matched_regs  int,                             -- 매칭 등록자
  status        text default '완료',
  note          text,
  created_at    timestamptz default now()
);
create index if not exists idx_content_cohort on content_log(cohort_id);

-- 6) 비틀리 일별 (보존 영구 — 30일 절벽 대응)
create table if not exists bitly_daily (
  click_date    date primary key,                -- 일자(유일)
  clicks        int  not null default 0,         -- 당일 클릭 (max 보존)
  yt int default 0, kk int default 0, ig int default 0,
  direct int default 0, tt int default 0, etc int default 0,
  updated_at    timestamptz default now()
);

-- 7) 카카오 일별 친구수
create table if not exists kakao_daily (
  friend_date   date primary key,
  friends       int  not null default 0,         -- 친구수 (직접 입력)
  note          text,
  updated_at    timestamptz default now()
);

-- ============================================================
-- 초기 데이터: 14기 기수 (설정 시트 기준)
-- ============================================================
insert into cohorts (name, goal, pre_open, eb1_open, eb1_close, eb2_open, eb2_close, reg_open, reg_close, extra_close, ended_at)
values ('14기', 150, '2026-04-29', '2026-05-22', '2026-05-24', '2026-06-05', '2026-06-07', '2026-06-19', '2026-06-21', '2026-06-28', '2026-06-28')
on conflict do nothing;

insert into cohorts (name, goal, eb1_open, eb1_close, eb2_open, eb2_close, reg_open, reg_close, ended_at)
values ('13기', 120, '2026-03-20', '2026-03-22', '2026-04-03', '2026-04-05', '2026-04-17', '2026-04-21', '2026-04-30')
on conflict do nothing;
