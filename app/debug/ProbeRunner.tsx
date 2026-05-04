"use client";

import { useState } from "react";

type Step = {
  stage: string;
  ok: boolean;
  detail: string;
  hint?: string;
  ms?: number;
};

type ProbeResult = { ok: boolean; totalMs: number; steps: Step[] };

export function ProbeRunner() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<ProbeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setRunning(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/debug/probe", { method: "POST" });
      if (!res.ok) {
        setError(`HTTP ${res.status} ${res.statusText}`);
        return;
      }
      const data: ProbeResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "probe failed");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={run}
        disabled={running}
        className="px-5 py-2.5 bg-ink text-bg hover:bg-ink-soft disabled:opacity-50 transition-colors text-sm font-serif"
      >
        {running ? "실행 중..." : "▶ 게시/스토리 동선 시뮬 실행"}
      </button>

      {error && (
        <div className="px-3 py-2 border border-warn/40 bg-warn/5 text-warn text-sm font-serif">
          ⚠ {error}
        </div>
      )}

      {result && (
        <div className="border border-line">
          <div
            className={`px-3 py-2 text-xs font-serif border-b border-line ${
              result.ok
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-warn/10 text-warn"
            }`}
          >
            {result.ok ? "✓ 모든 단계 통과" : "❌ 막힘 발생"} ·{" "}
            <span className="text-ink-faint">총 {result.totalMs}ms</span>
          </div>
          <ul className="divide-y divide-line">
            {result.steps.map((s) => (
              <li key={s.stage} className="px-3 py-2.5">
                <div className="flex items-start gap-3">
                  <span
                    className={`shrink-0 mt-0.5 w-5 text-center ${
                      s.ok ? "text-emerald-400" : "text-warn"
                    }`}
                  >
                    {s.ok ? "✓" : "✕"}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                      <span className="font-serif text-sm">{s.stage}</span>
                      {typeof s.ms === "number" && (
                        <span className="text-[11px] text-ink-faint tabular-nums">
                          {s.ms}ms
                        </span>
                      )}
                    </div>
                    <div
                      className={`mt-1 text-[13px] font-serif break-all ${
                        s.ok ? "text-ink-soft" : "text-warn"
                      }`}
                    >
                      {s.detail}
                    </div>
                    {s.hint && (
                      <div className="mt-1 text-[11px] text-ink-faint font-serif">
                        ↳ {s.hint}
                      </div>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
