"use client";

import { useState, useRef, useEffect } from "react";
import { useSearchParams } from "next/navigation";

type Msg = { role: "user" | "ai"; text: string };

const SUGGESTIONS = [
  "지금 상황 한 줄 요약",
  "목표 달성 가능해?",
  "유튜브로 들어온 등록자 누구야?",
  "가장 시급한 액션 3개",
];

export default function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const sp = useSearchParams();
  const cohort = sp.get("cohort") || ""; // 빈 값이면 서버가 최신 기수로 해석

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading, open]);

  async function send(text: string) {
    if (!text.trim() || loading) return;
    const history = msgs.map((m) => ({ role: m.role, text: m.text }));
    setMsgs((m) => [...m, { role: "user", text }]);
    setInput("");
    setLoading(true);
    try {
      const r = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: text, history, cohort }),
      });
      const d = await r.json();
      setMsgs((m) => [...m, { role: "ai", text: d.answer || d.error || "(응답 없음)" }]);
    } catch {
      setMsgs((m) => [...m, { role: "ai", text: "오류가 발생했습니다. 다시 시도해주세요." }]);
    }
    setLoading(false);
  }

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="AI 어시스턴트"
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full flex items-center justify-center text-2xl shadow-lg transition-transform hover:scale-110"
        style={{
          background: "linear-gradient(135deg,#00e5ff,#3b82f6)",
          boxShadow: "0 0 20px rgba(0,229,255,0.55)",
        }}
      >
        {open ? "✕" : "🤖"}
      </button>

      {/* 채팅 패널 */}
      {open && (
        <div
          className="fixed bottom-24 right-6 z-50 w-[min(92vw,400px)] h-[min(70vh,560px)] rounded-2xl flex flex-col overflow-hidden shadow-2xl"
          style={{
            background:
              "radial-gradient(600px 300px at 80% -10%, rgba(0,229,255,0.12), transparent), #0a1020",
            border: "1px solid rgba(0,229,255,0.25)",
          }}
        >
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-400/15">
            <div className="flex items-center gap-2">
              <span className="live-dot" />
              <span className="font-hud text-sm font-bold jarvis-neon tracking-wide">AI 어시스턴트</span>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white text-sm">
              ✕
            </button>
          </div>

          {/* 대화 */}
          <div className="flex-1 overflow-y-auto p-3 space-y-3">
            {msgs.length === 0 && (
              <div className="text-center text-slate-400 py-6 text-sm">
                <div className="text-3xl mb-2">🤖</div>
                <p className="mb-3">무엇이든 물어보세요</p>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      onClick={() => send(s)}
                      className="text-xs px-3 py-2 rounded-lg border border-cyan-400/25 text-cyan-200 hover:bg-cyan-400/10"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                    m.role === "user"
                      ? "bg-blue-600 text-white rounded-br-sm"
                      : "bg-slate-800/70 border border-cyan-400/15 text-slate-100 rounded-bl-sm"
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl bg-slate-800/70 border border-cyan-400/15 text-cyan-300 text-sm">
                  <span className="live-dot inline-block mr-2" /> 분석 중...
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* 입력 */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            className="flex gap-2 p-3 border-t border-cyan-400/15"
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="질문 입력..."
              disabled={loading}
              className="flex-1 px-3 py-2 rounded-lg bg-slate-800/60 border border-cyan-400/20 text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400/50 text-sm"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="px-4 py-2 rounded-lg font-bold text-white text-sm disabled:opacity-40"
              style={{ background: "linear-gradient(90deg,#00e5ff,#3b82f6)" }}
            >
              전송
            </button>
          </form>
        </div>
      )}
    </>
  );
}
