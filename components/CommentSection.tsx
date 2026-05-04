"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, SendHorizontal } from "lucide-react";
import { addComment } from "@/app/post/actions";
import { CaptionEditor } from "./CaptionEditor";
import { HumanAvatar } from "./HumanAvatar";
import type { KeystrokeRecord } from "@/lib/keystroke";

type Comment = {
  id: string;
  body: string;
  created_at: string;
  author: { username: string; avatar_url?: string | null } | null;
};

export function CommentSection({
  postId,
  comments: initial,
  currentUsername,
  currentAvatarUrl,
}: {
  postId: string;
  comments: Comment[];
  currentUsername: string;
  currentAvatarUrl?: string | null;
}) {
  const [comments, setComments] = useState<Comment[]>(initial);
  const [body, setBody] = useState("");
  const [keystrokes, setKeystrokes] = useState<KeystrokeRecord | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editorKey, setEditorKey] = useState(0);

  async function handle() {
    if (!body.trim() || !keystrokes) return;
    setSubmitting(true);
    setError(null);

    const r = await addComment(postId, body, JSON.stringify(keystrokes));

    if (r.error) {
      setError(r.error);
      setSubmitting(false);
    } else {
      setComments([
        ...comments,
        {
          id: crypto.randomUUID(),
          body,
          created_at: new Date().toISOString(),
          author: { username: currentUsername, avatar_url: currentAvatarUrl },
        },
      ]);
      setBody("");
      setEditorKey((k) => k + 1);
      setSubmitting(false);
    }
  }

  return (
    <section id="comments" className="scroll-mt-20 space-y-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h3 className="font-sans text-sm font-medium text-ink">
            댓글 {comments.length}
          </h3>
          <p className="mt-1 font-serif text-xs text-ink-faint">
            붙여넣기 없이 직접 쓴 한 줄만 올라갑니다.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 border border-line bg-bg-card px-2 py-1 font-sans text-[11px] text-ink-soft">
          <CheckCircle2 size={13} />
          직타 인증
        </span>
      </div>

      <div className="space-y-4">
        {comments.length === 0 ? (
          <div className="border border-dashed border-line bg-bg-card px-4 py-8 text-center">
            <p className="font-serif text-sm text-ink-soft">
              아직 댓글이 없습니다.
            </p>
            <p className="mt-1 font-serif text-xs text-ink-faint">
              첫 반응도 직접 타이핑으로 남겨주세요.
            </p>
          </div>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="flex gap-3 border-b border-line pb-4 last:border-0"
            >
              <Link href={`/profile/${c.author?.username ?? "unknown"}`}>
                <HumanAvatar
                  username={c.author?.username ?? "??"}
                  avatarUrl={c.author?.avatar_url}
                  size="sm"
                />
              </Link>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link
                    href={`/profile/${c.author?.username ?? "unknown"}`}
                    className="font-sans text-sm font-medium text-ink hover:text-ink-soft"
                  >
                    @{c.author?.username ?? "unknown"}
                  </Link>
                  <span className="font-serif text-xs text-ink-faint">
                    {timeAgo(c.created_at)}
                  </span>
                  <span className="inline-flex items-center gap-1 font-sans text-[11px] text-ink-faint">
                    <CheckCircle2 size={12} />
                    직접 입력
                  </span>
                </div>
                <p className="mt-1 whitespace-pre-wrap font-serif text-base leading-relaxed text-ink">
                  {c.body}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t border-line pt-4">
        <div className="mb-3 flex items-center gap-3">
          <HumanAvatar
            username={currentUsername}
            avatarUrl={currentAvatarUrl}
            size="sm"
          />
          <div className="min-w-0">
            <p className="truncate font-sans text-sm font-medium text-ink">
              @{currentUsername}
            </p>
            <p className="font-serif text-xs text-ink-faint">
              직접 입력 흔적이 함께 저장됩니다.
            </p>
          </div>
        </div>
        <CaptionEditor
          key={editorKey}
          value={body}
          onChange={setBody}
          onRecordChange={setKeystrokes}
          placeholder="한 줄로 직접 입력 (140자)"
          maxLength={140}
          minHeight="min-h-16"
        />
        {error && (
          <p className="mt-2 font-serif text-sm text-warn">{error}</p>
        )}
        <button
          onClick={handle}
          disabled={submitting || !body.trim()}
          className="mt-3 inline-flex h-10 items-center gap-2 bg-ink px-4 font-sans text-sm text-bg transition-colors hover:bg-ink-soft disabled:opacity-40"
        >
          <SendHorizontal size={16} />
          {submitting ? "등록 중" : "남기기"}
        </button>
      </div>
    </section>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}
