"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginForm callbackError={null} />}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const callbackError = formatCallbackError(
    searchParams.get("error"),
    searchParams.get("detail")
  );

  return <LoginForm callbackError={callbackError} />;
}

function LoginForm({ callbackError }: { callbackError: string | null }) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState<"google" | "magic" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const displayError = error ?? callbackError;

  async function handleGoogle() {
    setLoading("google");
    setError(null);
    try {
      const supabase = createClient();
      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      console.log("[NOai] OAuth response:", { data, oauthError });
      if (oauthError) {
        setError(oauthError.message);
        setLoading(null);
      }
      // data.url 있으면 자동 redirect
    } catch (e) {
      console.error("[NOai] OAuth threw:", e);
      setError(e instanceof Error ? e.message : "Google 로그인 실패");
      setLoading(null);
    }
  }

  async function handleMagic(e: React.FormEvent) {
    e.preventDefault();
    setLoading("magic");
    setError(null);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(null);

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
            계정 1개 = 사람 1명. AI 봇 가입 차단.
          </p>

          {/* Google */}
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading !== null}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-line bg-bg-card hover:border-ink disabled:opacity-50 transition-colors font-serif text-base"
          >
            <GoogleIcon />
            {loading === "google" ? "이동 중..." : "Google로 계속하기"}
          </button>

          {/* divider */}
          <div className="w-full flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-line" />
            <span className="text-xs text-ink-faint font-serif">또는</span>
            <div className="flex-1 h-px bg-line" />
          </div>

          {/* magic link */}
          <form onSubmit={handleMagic} className="w-full space-y-3">
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-bg-card border border-line focus:border-ink outline-none text-ink font-serif text-lg transition-colors"
            />
            <button
              type="submit"
              disabled={loading !== null || !email}
              className="w-full px-4 py-3 bg-ink text-bg hover:bg-ink-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-base font-serif"
            >
              {loading === "magic" ? "보내는 중..." : "이메일로 마법링크 받기"}
            </button>
          </form>

          {displayError && (
            <div className="mt-5 px-4 py-3 border border-warn/40 bg-warn/5 text-warn text-sm font-serif leading-relaxed">
              <span className="block mb-0.5 text-[10px] tracking-[0.3em] uppercase opacity-70">
                Error
              </span>
              {displayError}
            </div>
          )}

          <p className="mt-8 text-xs text-ink-faint text-center leading-relaxed">
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
            다른 방법으로 다시
          </button>
        </div>
      )}
    </main>
  );
}

function formatCallbackError(error: string | null, detail: string | null) {
  if (!error) return null;
  const map: Record<string, string> = {
    callback_failed: "OAuth callback 실패",
    env_missing: "Supabase 환경변수 없음",
    no_code: "OAuth code 없음 — Supabase URL Configuration 확인",
    profile_create_failed: "프로필 생성 실패",
  };
  return `${map[error] ?? error}${detail ? `: ${detail}` : ""}`;
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.167 6.656 3.58 9 3.58z"
        fill="#EA4335"
      />
    </svg>
  );
}
