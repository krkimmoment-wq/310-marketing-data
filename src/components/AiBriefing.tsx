"use client";

import { useEffect, useState } from "react";

type Insight = { tone: string; text: string };

const toneColor: Record<string, string> = {
  good: "text-emerald-300 border-emerald-400/40",
  warn: "text-amber-300 border-amber-400/40",
  info: "text-cyan-200 border-cyan-400/40",
};
const toneIcon: Record<string, string> = { good: "✅", warn: "⚠️", info: "▸" };

export default function AiBriefing({ fallback, cohort }: { fallback: Insight[]; cohort?: string }) {
  const [insights, setInsights] = useState<Insight[]>(fallback);
  const [loading, setLoading] = useState(true);
  const [isAi, setIsAi] = useState(false);

  useEffect(() => {
    let alive = true;
    fetch(`/api/brief${cohort ? `?cohort=${encodeURIComponent(cohort)}` : ""}`)
      .then((r) => r.json())
      .then((d) => {
        if (!alive) return;
        if (d.insights && d.insights.length > 0) {
          setInsights(d.insights);
          setIsAi(true);
        }
        setLoading(false);
      })
      .catch(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [cohort]);

  return (
    <div className="jarvis-card p-5 mb-6 fade-up" style={{ animationDelay: "0.05s" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="font-hud text-xs uppercase tracking-[0.25em] text-cyan-400/80">
          ⚡ AI 브리핑
        </div>
        <div className="text-[10px] font-hud text-cyan-400/60">
          {loading ? "분석 중..." : isAi ? "GEMINI AI" : "규칙 기반"}
        </div>
      </div>
      <div className="space-y-2.5">
        {insights.map((ins, i) => (
          <div
            key={i}
            className={`flex items-start gap-2 text-sm border-l-2 pl-3 ${
              toneColor[ins.tone] ?? toneColor.info
            } ${loading ? "opacity-50" : ""}`}
          >
            <span>{toneIcon[ins.tone] ?? "▸"}</span>
            <span className="text-slate-100">{ins.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
