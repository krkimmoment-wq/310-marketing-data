-- ============================================================
-- 부분환불 금액 컬럼 — 2026-09-01
-- Supabase SQL Editor 에 붙여넣고 [Run] 한 번 실행
-- ============================================================
-- "환불받은 금액". 부분환불이면 잔액 = amount − refund_amount 가 매출에 반영됨.
-- is_refund=true인데 refund_amount=0이면 코드가 '전액환불'로 간주(매출 0).
alter table registrations
  add column if not exists refund_amount bigint not null default 0;

-- ※ RLS: 컬럼 추가는 기존 테이블 정책이 그대로 적용 → 새 정책 불필요.
