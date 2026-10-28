// 수정·삭제 기록 계산 (순수 함수 — DB·Next 의존 없음, Node로 바로 테스트 가능)
// 삭제 기록(delete_log)에 남길 값·요약 + 등록 명단 상태(주문취소 포함)

export type AuditTable = "registrations" | "ad_spend" | "kakao_message" | "content_log" | "plan_items";

// 지운 값에서 빼는 칸 = DB 규칙(delete_log_snapshot_no_personal)과 같은 목록. 이름·연락처·자유 글·담당자·수정자 이메일
export const BLOCKED_KEYS = ["name", "phone", "email", "contact", "tel", "note", "memo", "title", "content", "owner", "updated_by"] as const;

export function safeSnapshot(row: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(row)) if (!(BLOCKED_KEYS as readonly string[]).includes(k.toLowerCase())) out[k] = v;
  return out;
}

// 등록 상태 (입금완료·미입금·주문취소·환불·기수이전)
type RegLike = { payment: string; is_refund?: boolean | null; is_transfer?: boolean | null };
export function statusLabel(r: RegLike): string {
  if (r.is_transfer) return "기수이전";
  if (r.is_refund) return "환불";
  if (r.payment === "주문취소") return "주문취소";
  if (r.payment === "미입금") return "미입금";
  return "입금완료";
}

// 등록 명단에서 기본으로 숨기는 행: 미입금·주문취소 ("취소·미입금 보기"로 켬)
export function isHiddenByDefault(r: RegLike): boolean {
  return !r.is_refund && !r.is_transfer && (r.payment === "미입금" || r.payment === "주문취소");
}

const md = (d: unknown) => (typeof d === "string" && d.length >= 10 ? `${Number(d.slice(5, 7))}/${Number(d.slice(8, 10))}` : "날짜 없음");
const won = (n: unknown) => `${Number(n ?? 0).toLocaleString("ko-KR")}원`;
const KIND_LABEL: Record<string, string> = { lecture: "특강", live: "챌린지 라이브", kakao: "카톡", ad: "광고", keycon: "키콘", promo_short: "홍보쇼츠", support: "응대", openchat: "오픈채팅 공지", teaser: "특강 예고", recruit: "특강 모집", replay: "다시보기 마감", etc: "기타" };
const STATUS_LABEL: Record<string, string> = { planned: "계획", done: "완료", canceled: "취소" };

// 삭제 기록 한 줄 요약 — 기수·날짜·금액·상태 같은 값만 (이름·제목·메모 같은 자유 글은 넣지 않음)
export function deleteSummary(table: AuditTable, row: Record<string, unknown>, cohortName?: string): string {
  const head = cohortName ? `${cohortName} · ` : "";
  switch (table) {
    case "registrations":
      return `${head}${md(row.reg_date)} · ${won(row.amount)} · ${statusLabel(row as RegLike)}`;
    case "ad_spend":
      return `${head}${row.platform === "instagram" ? "인스타" : "유튜브"} · ${md(row.period_start)} 시작 · ${won(row.cost)}`;
    case "kakao_message":
      return `${head}${md(row.sent_date)} 발송 · 발송 ${Number(row.sent_count ?? 0).toLocaleString("ko-KR")} · 클릭 ${Number(row.click_count ?? 0).toLocaleString("ko-KR")}`;
    case "content_log":
      return `${head}${md(row.pub_date)} · ${row.category ?? "종류 없음"} · ${row.platform ?? "플랫폼 없음"}`;
    case "plan_items":
      return `${head}${md(row.plan_date)} · ${KIND_LABEL[String(row.kind)] ?? String(row.kind)} · ${STATUS_LABEL[String(row.status)] ?? String(row.status)}`;
  }
}
