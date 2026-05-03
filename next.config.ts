import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Supabase Vercel Integration이 새 키 시스템 (SUPABASE_PUBLISHABLE_KEY)으로 박는데,
  // 우리 코드는 표준 NEXT_PUBLIC_SUPABASE_ANON_KEY 사용 → 빌드 시 alias.
  env: {
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      "",
  },
  // Server Actions 기본 bodySizeLimit는 1MB. /create는 8MB 이미지까지 허용하므로 올림.
  // 이걸 안 하면 큰 이미지 업로드 시 'An unexpected response was received from the server' 발생.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
