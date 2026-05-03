import { createBrowserClient } from "@supabase/ssr";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (typeof window !== "undefined") {
    // 진단용 — Vercel 빌드 시 inline됐는지 확인
    console.log("[NOai] Supabase env:", {
      hasUrl: !!url,
      hasKey: !!key,
      urlHost: url ? new URL(url).host : null,
      keyPreview: key ? `${key.slice(0, 12)}...` : null,
    });
  }

  if (!url || !key) {
    throw new Error(
      `[NOai] Supabase env missing — url=${!!url}, key=${!!key}. Vercel env에 NEXT_PUBLIC_SUPABASE_ANON_KEY 또는 SUPABASE_PUBLISHABLE_KEY 필요.`
    );
  }

  return createBrowserClient(url, key);
}
