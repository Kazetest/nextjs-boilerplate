"use client";

import { useState } from "react";
import {
  reportPost,
  blockUser,
  type ReportReason,
} from "@/app/post/actions";

const REASONS: { value: ReportReason; label: string }[] = [
  { value: "ai_suspect", label: "AI 생성 의심" },
  { value: "origin_missing", label: "원작 미표기" },
  { value: "spam_hate", label: "스팸 또는 혐오" },
  { value: "other", label: "기타" },
];

type Props = {
  postId: string;
  authorId: string;
  authorUsername: string;
  isOwn: boolean;
};

export function PostMenu({ postId, authorId, authorUsername, isOwn }: Props) {
  const [open, setOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  async function handleReport(reason: ReportReason) {
    setBusy(true);
    const r = await reportPost(postId, reason);
    setBusy(false);
    setReportOpen(false);
    setOpen(false);
    setFeedback(r.error ?? "신고 접수됨 · 검토 후 처리됩니다");
    setTimeout(() => setFeedback(null), 2500);
  }

  async function handleBlock() {
    if (!confirm(`@${authorUsername}을 차단하시겠습니까? 이 사용자의 게시물이 더 이상 보이지 않습니다.`)) return;
    setBusy(true);
    const r = await blockUser(authorId);
    setBusy(false);
    setOpen(false);
    setFeedback(r.error ?? `@${authorUsername} 차단됨`);
    setTimeout(() => setFeedback(null), 2500);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label="더보기"
        className="px-2 py-1 text-ink-faint hover:text-ink transition-colors text-lg leading-none"
      >
        ⋯
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-1 z-40 w-44 bg-bg-card border border-line shadow-sm">
            {!isOwn && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setReportOpen(true);
                    setOpen(false);
                  }}
                  disabled={busy}
                  className="w-full text-left px-3 py-2 text-sm font-serif hover:bg-bg disabled:opacity-50"
                >
                  신고
                </button>
                <button
                  type="button"
                  onClick={handleBlock}
                  disabled={busy}
                  className="w-full text-left px-3 py-2 text-sm font-serif hover:bg-bg disabled:opacity-50 border-t border-line"
                >
                  @{authorUsername} 차단
                </button>
              </>
            )}
            {isOwn && (
              <div className="px-3 py-2 text-xs text-ink-faint">
                내 게시물
              </div>
            )}
          </div>
        </>
      )}

      {reportOpen && (
        <ReportModal
          onClose={() => setReportOpen(false)}
          onSubmit={handleReport}
          busy={busy}
        />
      )}

      {feedback && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-ink text-bg text-sm font-serif">
          {feedback}
        </div>
      )}
    </div>
  );
}

function ReportModal({
  onClose,
  onSubmit,
  busy,
}: {
  onClose: () => void;
  onSubmit: (r: ReportReason) => void;
  busy: boolean;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-bg-card border border-line max-w-sm w-full p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-serif text-xl">신고 사유</h3>
        <p className="text-xs text-ink-faint font-serif">
          3명 이상이 같은 게시물을 신고하면 자동 검토 처리됩니다.
        </p>
        <div className="space-y-2">
          {REASONS.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => onSubmit(r.value)}
              disabled={busy}
              className="w-full text-left px-4 py-3 border border-line hover:border-ink transition-colors font-serif disabled:opacity-50"
            >
              {r.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={busy}
          className="w-full py-2 text-sm text-ink-faint hover:text-ink"
        >
          취소
        </button>
      </div>
    </div>
  );
}
