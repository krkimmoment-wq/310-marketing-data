// 기수 매출 계산 (순수 함수) — kpi.ts에서 사용, Node 테스트에서 직접 불러씀
export type RegLike = { payment?: string | null; is_refund?: boolean | null; is_transfer?: boolean | null; amount?: number | null; refund_amount?: number | null };
export type RevLike = { total_paid?: number | null; refund?: number | null };

// 명단 1줄 매출: 부분환불 잔액 반영(amount−refund_amount). is_refund인데 환불액 미지정(0)이면 전액환불로 간주(0)
export const regNet = (r: RegLike) =>
  r.is_refund && (r.refund_amount ?? 0) === 0 ? 0 : (r.amount ?? 0) - (r.refund_amount ?? 0);

// 매출 표(명단 없는 13기) 1줄: 결제 − 환불. 환불은 +/− 어느 부호로 적혀 있어도 뺀다 (13기 표에 둘 다 있음)
export const channelNet = (v: RevLike) => (v.total_paid ?? 0) - Math.abs(v.refund ?? 0);

// regs = 이 기수 명단, arrivals = transfer_to가 이 기수인 행(같은 기수 들어옴 포함), revs = 매출 표(명단 없을 때만 사용)
export function cohortRevenue(regs: RegLike[], arrivals: RegLike[], revs: RevLike[]): number {
  // 이전자는 도착 기수로 귀속되므로 own에서 제외
  const arrivalRevenue = arrivals.filter((r) => r.payment === "입금완료").reduce((s, r) => s + regNet(r), 0);
  if (regs.length > 0) return regs.filter((r) => r.payment === "입금완료" && !r.is_transfer).reduce((s, r) => s + regNet(r), 0) + arrivalRevenue;
  return revs.reduce((s, v) => s + channelNet(v), 0) + arrivalRevenue;
}
