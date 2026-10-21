-- ============================================================
-- 영상별 일별 조회 + 인스타 게시물 — 2026-10-21
-- Supabase SQL Editor 에 통째로 붙여넣고 [Run] 한 번 실행
-- ============================================================

-- ① 유튜브 영상별 일별 조회 (발행 후 14일치) → "발행 후 첫 7일 조회" 순위
create table if not exists yt_video_daily (
  video_id    text not null,
  day         date not null,
  views       int  not null default 0,
  updated_at  timestamptz default now(),
  primary key (video_id, day)
);
alter table yt_video_daily enable row level security;
create policy "read" on yt_video_daily for select to authenticated using (true);

-- ② 인스타 게시물 (피드 이미지·캐러셀 = 커뮤니티 글)
create table if not exists ig_media (
  media_id        text primary key,
  posted_at       timestamptz not null,
  post_date       date not null,          -- 한국 날짜
  media_type      text,                   -- IMAGE / CAROUSEL_ALBUM / VIDEO
  caption         text,                   -- 인스타 로그인 방식에선 비어 있을 수 있음
  permalink       text,
  like_count      int,
  comments_count  int,
  updated_at      timestamptz default now()
);
alter table ig_media enable row level security;
create policy "read" on ig_media for select to authenticated using (true);

-- 쓰기는 수집 스크립트(service_role)만 하므로 쓰기 정책은 두지 않음.
notify pgrst, 'reload schema';
