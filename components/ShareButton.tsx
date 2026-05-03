"use client";

import { useState } from "react";

export function ShareButton({
  url,
  title,
  text,
}: {
  url: string;
  title?: string;
  text?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handle() {
    const fullUrl = url.startsWith("http")
      ? url
      : typeof window !== "undefined"
      ? `${window.location.origin}${url}`
      : url;

    if (typeof navigator !== "undefined" && "share" in navigator) {
      try {
        await navigator.share({ url: fullUrl, title, text });
        return;
      } catch {
        // 사용자 취소 또는 미지원 → 클립보드 fallback
      }
    }
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("링크 복사", fullUrl);
    }
  }

  return (
    <button
      type="button"
      onClick={handle}
      className="inline-flex items-center gap-1.5 text-sm text-ink-soft hover:text-ink font-serif transition-colors"
      aria-label="공유"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M4 12v7a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
      <span>{copied ? "복사됨" : "공유"}</span>
    </button>
  );
}
