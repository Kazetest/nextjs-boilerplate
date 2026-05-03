"use client";

import { useState } from "react";
import Link from "next/link";
import { addComment } from "@/app/post/actions";
import { CaptionEditor } from "./CaptionEditor";
import type { KeystrokeRecord } from "@/lib/keystroke";

type Comment = {
  id: string;
  body: string;
  created_at: string;
  author: { username: string } | null;
};

export function CommentSection({
  postId,
  comments: initial,
  currentUsername,
}: {
  postId: string;
  comments: Comment[];
  currentUsername: string;
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
          author: { username: currentUsername },
        },
      ]);
      setBody("");
      setEditorKey((k) => k + 1);
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4">
      <h3 className="text-[10px] tracking-[0.3em] text-ink-faint uppercase font-serif">
        댓글 (한 줄, 키스트로크 인증)
      </h3>

      <div className="space-y-3">
        {comments.length === 0 ? (
          <p className="text-center text-sm text-ink-faint font-serif py-4">
            첫 댓글을 남겨보세요
          </p>
        ) : (
          comments.map((c) => (
            <div
              key={c.id}
              className="border-b border-line pb-2 last:border-0"
            >
              <Link
                href={`/profile/${c.author?.username ?? "unknown"}`}
                className="font-serif text-xs text-ink-soft hover:text-ink"
              >
                @{c.author?.username ?? "unknown"}
              </Link>
              <p className="font-serif text-base text-ink mt-1">{c.body}</p>
            </div>
          ))
        )}
      </div>

      <div className="space-y-2 pt-4 border-t border-line">
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
          <p className="text-sm text-warn font-serif">⚠ {error}</p>
        )}
        <button
          onClick={handle}
          disabled={submitting || !body.trim()}
          className="px-4 py-2 bg-ink text-bg hover:bg-ink-soft disabled:opacity-40 transition-colors font-serif text-sm"
        >
          {submitting ? "..." : "남기기"}
        </button>
      </div>
    </div>
  );
}
