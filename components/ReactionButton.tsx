"use client";

import { HandHeart } from "lucide-react";
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
      type="button"
      onClick={handle}
      className={`inline-flex h-10 items-center gap-2 px-3 font-sans text-sm transition-colors disabled:opacity-50 ${
        reacted ? "text-ink" : "text-ink-soft hover:text-ink"
      }`}
      aria-pressed={reacted}
      aria-label={reacted ? "묵례 취소" : "묵례"}
    >
      <HandHeart size={20} fill={reacted ? "currentColor" : "none"} />
      <span className="tabular-nums">{count}</span>
      <span>묵례</span>
    </button>
  );
}
