"use client";

import { MessageCircle } from "lucide-react";
import { ReactionButton } from "@/components/ReactionButton";
import { SaveButton } from "@/components/SaveButton";
import { ShareButton } from "@/components/ShareButton";

type PostActionBarProps = {
  postId: string;
  initialReacted: boolean;
  initialReactionCount: number;
  commentCount: number;
  initialSaved: boolean;
  shareTitle: string;
  shareText: string;
};

export function PostActionBar({
  postId,
  initialReacted,
  initialReactionCount,
  commentCount,
  initialSaved,
  shareTitle,
  shareText,
}: PostActionBarProps) {
  return (
    <section className="border-y border-line bg-bg-card/75 px-2 py-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1">
          <ReactionButton
            postId={postId}
            initialReacted={initialReacted}
            initialCount={initialReactionCount}
          />
          <a
            href="#comments"
            className="inline-flex h-10 items-center gap-2 px-3 font-sans text-sm text-ink-soft transition-colors hover:text-ink"
            aria-label="댓글로 이동"
          >
            <MessageCircle size={20} />
            <span className="tabular-nums">{commentCount}</span>
            <span>댓글</span>
          </a>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <SaveButton postId={postId} initialSaved={initialSaved} />
          <ShareButton
            url={`/post/${postId}`}
            title={shareTitle}
            text={shareText}
          />
        </div>
      </div>
    </section>
  );
}
