"use client";

import { useState, useTransition } from "react";
import { toggleFollow } from "@/app/post/actions";

export function FollowButton({
  targetId,
  initialFollowing,
}: {
  targetId: string;
  initialFollowing: boolean;
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
      onClick={handle}
      disabled={pending}
      className={`px-6 py-2 font-serif text-sm transition-colors disabled:opacity-50 ${
        following
          ? "border border-line text-ink hover:border-ink"
          : "bg-ink text-bg hover:bg-ink-soft"
      }`}
    >
      {following ? "팔로잉" : "팔로우"}
    </button>
  );
}
