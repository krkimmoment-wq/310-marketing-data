// KST(한국시간) 오늘 날짜 문자열 (서버 컴포넌트 render 중 Date.now() 직접 호출 회피용)
export function kstTodayStr(): string {
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}
