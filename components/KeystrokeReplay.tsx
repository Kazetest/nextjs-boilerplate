"use client";

import { useEffect, useRef, useState } from "react";
import { reconstructAt } from "@/lib/keystroke-replay";
import type { KeystrokeRecord } from "@/lib/keystroke";

const SPEED = 5; // 5배속

export function KeystrokeReplay({
  record,
  finalText,
}: {
  record: KeystrokeRecord;
  finalText: string;
}) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const startRef = useRef(0);
  const frameRef = useRef<number>(0);

  const totalMs = Math.max(500, record.durationMs / SPEED);

  useEffect(() => {
    if (!playing) return;
    startRef.current = Date.now();

    function tick() {
      const elapsed = Date.now() - startRef.current;
      const p = Math.min(1, elapsed / totalMs);
      setProgress(p);
      if (p < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        setPlaying(false);
      }
    }
    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [playing, totalMs]);

  const currentMs = progress * record.durationMs;
  const text =
    playing || (progress > 0 && progress < 1)
      ? reconstructAt(record, currentMs)
      : finalText;

  return (
    <div className="space-y-3">
      <div className="bg-bg-card border border-line p-4 min-h-32">
        <p className="font-serif text-base whitespace-pre-wrap leading-relaxed">
          {text}
          {playing && (
            <span className="inline-block w-[2px] h-5 bg-ink animate-pulse ml-px align-middle" />
          )}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={() => {
            setProgress(0);
            setPlaying(true);
          }}
          disabled={playing}
          className="px-3 py-1.5 bg-ink text-bg text-sm font-serif hover:bg-ink-soft disabled:opacity-50"
        >
          {playing ? "재생 중" : "▶ 타이핑 재생"}
        </button>
        <div className="flex-1 h-[2px] bg-line">
          <div
            className="h-full bg-ink transition-[width] duration-100"
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <span className="text-xs text-ink-faint font-serif tabular-nums">
          {Math.round(record.durationMs / 1000)}s
        </span>
      </div>

      <dl className="text-xs text-ink-faint font-serif grid grid-cols-3 gap-2 pt-2 border-t border-line">
        <div>
          <dt className="text-[10px] uppercase tracking-wider">키스트로크</dt>
          <dd className="text-ink mt-0.5">{record.totalKeys}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider">붙여넣기 차단</dt>
          <dd className="text-ink mt-0.5">{record.pasteBlocked}</dd>
        </div>
        <div>
          <dt className="text-[10px] uppercase tracking-wider">속도</dt>
          <dd className="text-ink mt-0.5">{SPEED}배속</dd>
        </div>
      </dl>
    </div>
  );
}
