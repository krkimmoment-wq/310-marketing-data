// Gemini 호출 재시도 — 503(서버 혼잡)·일시 rate·overload 시 짧은 백오프로 재시도
// 일일 한도(영구 429)면 재시도해도 동일하게 실패하므로 빠르게 빠져나감
export async function withRetry<T>(fn: () => Promise<T>, tries = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      const retryable = /503|overload|unavailable|high demand|try again|temporarily|rate/i.test(msg);
      if (!retryable || i === tries - 1) throw e;
      await new Promise((r) => setTimeout(r, 700 * (i + 1))); // 0.7s, 1.4s 백오프
    }
  }
  throw lastErr;
}
