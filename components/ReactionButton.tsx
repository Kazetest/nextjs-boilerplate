"use client";

import { useState, useTransition } from "react";
import { toggleReaction } from "@/app/post/actions";

export function ReactionButton({
  postId,
  initialReacted,
  initialCount,
}: {
  postId: string;
  initialReacted: boolean;
  initialCount: number;
}) {
  const [reacted, setReacted] = useState(initialReacted);
  const [count, setCount] = useState(initialCount);
  const [, startTransition] = useTransition();

  function handle() {
    const next = !reacted;
    setReacted(next);
    setCount((c) => c + (next ? 1 : -1));
    startTransition(async () => {
      const r = await toggleReaction(postId);
      if (r.error) {
        setReacted(!next);
        setCount((c) => c + (next ? -1 : 1));
      }
    });
  }

  return (
    <button
      onClick={handle}
      className={`flex items-center gap-2 text-sm font-serif transition-colors ${
        reacted ? "text-ink" : "text-ink-faint hover:text-ink"
      }`}
    >
      <span className={`text-lg ${reacted ? "" : "grayscale opacity-60"}`}>
        🙇
      </span>
      <span className="tabular-nums">{count} 묵례</span>
    </button>
  );
}
