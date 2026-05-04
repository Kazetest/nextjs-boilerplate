"use client";

import { Bookmark } from "lucide-react";
import { useState, useTransition } from "react";
import { toggleSave } from "@/app/post/actions";

export function SaveButton({
  postId,
  initialSaved,
}: {
  postId: string;
  initialSaved: boolean;
}) {
  const [saved, setSaved] = useState(initialSaved);
  const [pending, startTransition] = useTransition();

  function handle() {
    const next = !saved;
    setSaved(next);
    startTransition(async () => {
      const result = await toggleSave(postId);
      if (result.error) setSaved(!next);
    });
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      className={`inline-flex h-10 items-center gap-2 px-3 font-sans text-sm transition-colors disabled:opacity-50 ${
        saved ? "text-ink" : "text-ink-soft hover:text-ink"
      }`}
      aria-pressed={saved}
      aria-label={saved ? "저장 취소" : "저장"}
    >
      <Bookmark size={20} fill={saved ? "currentColor" : "none"} />
      {saved ? "저장됨" : "저장"}
    </button>
  );
}
