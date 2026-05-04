"use client";

import { useEffect } from "react";

export function AICheckKickoff({ postId }: { postId: string }) {
  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/post/${postId}/check-ai`, {
      method: "POST",
      signal: ctrl.signal,
    }).catch(() => {
      // fail-open: 게시는 이미 완료됐고 검사는 백그라운드 보강만 담당
    });
    return () => ctrl.abort();
  }, [postId]);

  return null;
}
