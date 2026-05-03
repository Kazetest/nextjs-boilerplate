"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[NOai]", error);
  }, [error]);

  return (
    <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-20 max-w-md mx-auto text-center w-full">
      <div className="text-[10px] tracking-[0.4em] text-ink-faint uppercase mb-4">
        ERROR
      </div>
      <h1 className="font-serif text-4xl mb-6">문제가 발생했습니다</h1>
      <p className="text-sm text-ink-soft font-serif mb-2">
        {error.message || "알 수 없는 오류"}
      </p>
      {error.digest && (
        <p className="text-xs text-ink-faint mb-10 font-mono">
          ref: {error.digest}
        </p>
      )}
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="px-6 py-3 border border-line hover:border-ink transition-colors font-serif"
        >
          다시 시도
        </button>
        <Link
          href="/feed"
          className="px-6 py-3 bg-ink text-bg hover:bg-ink-soft transition-colors font-serif"
        >
          피드로 →
        </Link>
      </div>
    </main>
  );
}
