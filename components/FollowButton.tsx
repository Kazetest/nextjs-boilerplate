"use client";

import { Loader2, UserCheck, UserPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { toggleFollow } from "@/app/post/actions";

export function FollowButton({
  targetId,
  initialFollowing,
  compact = false,
}: {
  targetId: string;
  initialFollowing: boolean;
  compact?: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  function handle() {
    const next = !following;
    setFollowing(next);
    startTransition(async () => {
      const r = await toggleFollow(targetId);
      if (r.error) setFollowing(!next);
    });
  }

  return (
    <button
      type="button"
      onClick={handle}
      disabled={pending}
      className={`inline-flex items-center gap-2 font-sans transition-colors disabled:opacity-60 ${
        compact ? "h-8 px-2 text-xs" : "h-10 px-4 text-sm"
      } ${
        following
          ? "border border-line bg-bg-card text-ink hover:border-ink"
          : "bg-ink text-bg hover:bg-ink-soft"
      }`}
      aria-pressed={following}
    >
      {pending ? (
        <Loader2 size={16} className="animate-spin" />
      ) : following ? (
        <UserCheck size={16} />
      ) : (
        <UserPlus size={16} />
      )}
      {pending ? "처리 중" : following ? "팔로잉" : "팔로우"}
    </button>
  );
}
