"use client";

import { useState, useRef, useEffect } from "react";

type Msg = { role: "user" | "ai"; text: string };

const DARK_BG: React.CSSProperties = {
  background:
    "radial-gradient(1200px 600px at 80% -10%, rgba(0,229,255,0.10), transparent), radial-gradient(900px 500px at 0% 110%, rgba(59,130,246,0.10), transparent), #070b16",
};

const SUGGESTIONS = [
  "지금 14기 상황 한 줄로 요약해줘",
  "이번 페이스로 목표 달성 가능해?",
  "13기랑 비교하면 어때?",
  "지금 가장 시급한 액션 3개는?",
];

export default function AssistantPage() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, loading]);

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
        body: JSON.stringify({ question: text, history }),
      });
      const d = await r.json();
      setMsgs((m) => [...m, { role: "ai", text: d.answer || d.error || "(응답 없음)" }]);
    } catch {
      setMsgs((m) => [...m, { role: "ai", text: "오류가 발생했습니다. 다시 시도해주세요." }]);
    }
    setLoading(false);
  }

  return (
    <div style={DARK_BG} className="scanlines jarvis-grid-line min-h-screen flex flex-col p-6 md:p-8 text-slate-100">
      <div className="mb-4">
        <h1 className="font-hud text-2xl font-black tracking-widest jarvis-glow jarvis-neon">
          AI 어시스턴트
        </h1>
        <p className="text-sm text-slate-400 mt-1">실시간 14기 데이터 기반 · 베테랑 마케터 AI</p>
      </div>

      {/* 대화 영역 */}
      <div className="flex-1 jarvis-card p-5 overflow-y-auto mb-4 space-y-4" style={{ minHeight: "50vh" }}>
        {msgs.length === 0 && (
          <div className="text-center text-slate-400 py-8">
            <div className="text-4xl mb-3">🤖</div>
            <p className="mb-4">14기 운영에 대해 무엇이든 물어보세요.</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="text-xs px-3 py-2 rounded-lg border border-cyan-400/30 text-cyan-200 hover:bg-cyan-400/10"
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
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed ${
                m.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-slate-800/70 border border-cyan-400/20 text-slate-100 rounded-bl-sm"
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="px-4 py-3 rounded-2xl bg-slate-800/70 border border-cyan-400/20 text-cyan-300 text-sm">
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
        className="flex gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="14기 운영에 대해 질문하세요..."
          disabled={loading}
          className="flex-1 px-4 py-3 rounded-xl bg-slate-800/60 border border-cyan-400/20 text-slate-100 placeholder-slate-500 outline-none focus:border-cyan-400/50"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-5 py-3 rounded-xl font-bold text-white disabled:opacity-40"
          style={{ background: "linear-gradient(90deg,#00e5ff,#3b82f6)" }}
        >
          전송
        </button>
      </form>
    </div>
  );
}
