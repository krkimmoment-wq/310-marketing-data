-- ============================================================
-- 기수이전 도착 기수 컬럼 — 2026-09-01
-- Supabase SQL Editor 에 붙여넣고 [Run] 한 번 실행
-- ============================================================
-- "이 이전자가 도착하는 기수의 cohort_id". is_transfer=false면 null.
alter table registrations
  add column if not exists transfer_to_cohort_id bigint references cohorts(id);

-- ※ RLS: 컬럼 추가는 기존 테이블 정책(행 단위)이 그대로 적용됨 → 새 정책 불필요.
--   (registrations는 이미 authenticated 읽기/쓰기 정책 보유)
