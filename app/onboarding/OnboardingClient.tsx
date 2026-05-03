"use client";

import { useState } from "react";
import { saveOnboarding } from "./actions";

export function OnboardingClient({
  currentUsername,
  email,
}: {
  currentUsername: string;
  email: string;
}) {
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handle(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const r = await saveOnboarding({
      username: username.trim().toLowerCase(),
      displayName: displayName.trim(),
      bio: bio.trim(),
    });

    if (r?.error) {
      setError(r.error);
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handle} className="space-y-6">
      <div>
        <label className="block text-xs tracking-widest text-ink-faint uppercase mb-2 font-serif">
          아이디 (영문/숫자/_, 3-20자)
        </label>
        <div className="flex items-center bg-bg-card border border-line focus-within:border-ink">
          <span className="pl-3 text-ink-faint font-serif">@</span>
          <input
            type="text"
            required
            minLength={3}
            maxLength={20}
            pattern="[a-z0-9_]+"
            value={username}
            onChange={(e) =>
              setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
            }
            placeholder="my_username"
            className="flex-1 px-2 py-3 bg-transparent outline-none font-serif text-base"
            autoFocus
          />
        </div>
        <p className="mt-2 text-xs text-ink-faint font-serif">
          현재: <span className="text-ink-soft">@{currentUsername}</span>
        </p>
      </div>

      <div>
        <label className="block text-xs tracking-widest text-ink-faint uppercase mb-2 font-serif">
          표시 이름 (선택)
        </label>
        <input
          type="text"
          maxLength={30}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="홍길동"
          className="w-full px-3 py-3 bg-bg-card border border-line focus:border-ink outline-none font-serif"
        />
      </div>

      <div>
        <label className="block text-xs tracking-widest text-ink-faint uppercase mb-2 font-serif">
          한 줄 소개 (선택)
        </label>
        <input
          type="text"
          maxLength={120}
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="진짜 사람이 직접 쓴 한 줄"
          className="w-full px-3 py-3 bg-bg-card border border-line focus:border-ink outline-none font-serif"
        />
      </div>

      {error && (
        <div className="px-4 py-3 border border-warn/40 bg-warn/5 text-warn text-sm font-serif leading-relaxed">
          <span className="block mb-0.5 text-[10px] tracking-[0.3em] uppercase opacity-70">
            Error
          </span>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || username.length < 3}
        className="w-full px-4 py-3 bg-ink text-bg hover:bg-ink-soft disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-base font-serif"
      >
        {submitting ? "저장 중..." : "시작하기 →"}
      </button>

      <p className="text-xs text-ink-faint text-center font-serif">
        가입 이메일: {email}
      </p>
    </form>
  );
}
