"use client";

import { Send } from "lucide-react";
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
      className="inline-flex h-10 items-center gap-2 px-3 font-sans text-sm text-ink-soft transition-colors hover:text-ink"
      aria-label="공유"
    >
      <Send size={20} />
      <span>{copied ? "복사됨" : "공유"}</span>
    </button>
  );
}
