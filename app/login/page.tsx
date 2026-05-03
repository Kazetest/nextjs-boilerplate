"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);

    if (authError) {
      setError(authError.message);
    } else {
      setSent(true);
    }
  }

  return (
    <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-20 max-w-md mx-auto w-full">
      <Link
        href="/"
        className="text-[10px] tracking-[0.4em] text-ink-faint uppercase mb-12 hover:text-ink transition-colors"
      >
        ← NOai
      </Link>

      {!sent ? (
        <>
          <h1 className="font-serif text-3xl md:text-4xl mb-3 text-center">
            가입 또는 로그인
          </h1>
          <p className="text-ink-soft mb-10 text-center font-serif">
            이메일로 마법링크를 보냅니다. 비밀번호 없음.
          </p>

          <form onSubmit={handleSubmit} className="w-full space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-bg-card border border-line focus:border-ink outline-none text-ink font-serif text-lg transition-colors"
              autoFocus
            />

            <button
              type="submit"
              disabled={loading || !email}
              className="w-full px-4 py-4 bg-ink text-bg hover:bg-ink-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-lg font-serif"
            >
              {loading ? "보내는 중..." : "마법링크 받기"}
            </button>
          </form>

          {error && (
            <p className="mt-4 text-sm text-warn font-serif">{error}</p>
          )}

          <p className="mt-8 text-xs text-ink-faint text-center">
            가입 시 NOai의 “No AI” 원칙에 동의하는 것으로 간주합니다.
          </p>
        </>
      ) : (
        <div className="text-center">
          <div className="font-serif text-5xl mb-8">✉</div>
          <h1 className="font-serif text-3xl mb-4">메일함 확인</h1>
          <p className="text-ink-soft font-serif">
            <span className="text-ink">{email}</span> 으로
            <br />
            마법링크를 보냈습니다.
          </p>
          <button
            onClick={() => {
              setSent(false);
              setEmail("");
            }}
            className="mt-10 text-sm text-ink-faint hover:text-ink underline underline-offset-4"
          >
            다른 이메일로 다시
          </button>
        </div>
      )}
    </main>
  );
}
