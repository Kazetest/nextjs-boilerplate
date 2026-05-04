"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowLeft, Camera, Save } from "lucide-react";
import { HumanAvatar } from "@/components/HumanAvatar";
import { saveProfile } from "./actions";

export function ProfileSettingsClient({
  initial,
}: {
  initial: {
    username: string;
    displayName: string;
    bio: string;
    avatarUrl: string | null;
  };
}) {
  const [username, setUsername] = useState(initial.username);
  const [displayName, setDisplayName] = useState(initial.displayName);
  const [bio, setBio] = useState(initial.bio);
  const [avatar, setAvatar] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(initial.avatarUrl);
  const objectUrlRef = useRef<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleAvatarChange(file: File | null) {
    setAvatar(file);
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    if (!file) {
      objectUrlRef.current = null;
      setPreview(initial.avatarUrl);
      return;
    }
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPreview(url);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSaved(false);

    const fd = new FormData();
    fd.append("username", username);
    fd.append("displayName", displayName);
    fd.append("bio", bio);
    if (avatar) fd.append("avatar", avatar);

    const result = await saveProfile(fd);
    if (result?.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }
    setSaved(true);
    setSubmitting(false);
  }

  return (
    <main className="relative z-10 mx-auto w-full max-w-xl px-4 py-8">
      <header className="mb-8 flex items-center justify-between">
        <Link
          href="/profile/me"
          className="grid h-10 w-10 place-items-center border border-line bg-bg-card text-ink-soft transition-colors hover:text-ink"
          aria-label="내 프로필"
        >
          <ArrowLeft size={18} />
        </Link>
        <div className="text-center">
          <p className="font-sans text-[10px] font-medium uppercase tracking-[0.28em] text-ink-faint">
            Profile
          </p>
          <h1 className="font-serif text-3xl">프로필 편집</h1>
        </div>
        <div className="h-10 w-10" />
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="border border-line bg-bg-card p-5">
          <div className="flex items-center gap-5">
            <HumanAvatar
              username={username || initial.username}
              avatarUrl={preview}
              size="xl"
            />
            <div className="min-w-0 flex-1">
              <label className="inline-flex h-10 cursor-pointer items-center gap-2 bg-ink px-4 font-sans text-sm text-bg transition-colors hover:bg-ink-soft">
                <Camera size={16} />
                사진 바꾸기
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => handleAvatarChange(e.target.files?.[0] ?? null)}
                />
              </label>
              <p className="mt-2 font-serif text-xs leading-relaxed text-ink-faint">
                얼굴이 아니어도 괜찮지만, AI 생성 이미지는 신고 대상입니다.
              </p>
            </div>
          </div>
        </section>

        <section className="space-y-4 border border-line bg-bg-card p-5">
          <Field label="아이디">
            <div className="flex items-center border border-line bg-bg focus-within:border-ink">
              <span className="pl-3 font-sans text-sm text-ink-faint">@</span>
              <input
                value={username}
                minLength={3}
                maxLength={20}
                pattern="[a-z0-9_]+"
                onChange={(e) =>
                  setUsername(
                    e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "")
                  )
                }
                className="min-w-0 flex-1 bg-transparent px-2 py-3 font-sans text-sm outline-none"
              />
            </div>
          </Field>

          <Field label="표시 이름">
            <input
              value={displayName}
              maxLength={30}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full border border-line bg-bg px-3 py-3 font-serif text-sm outline-none transition-colors focus:border-ink"
            />
          </Field>

          <Field label="소개">
            <textarea
              value={bio}
              maxLength={120}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full resize-none border border-line bg-bg px-3 py-3 font-serif text-sm leading-relaxed outline-none transition-colors focus:border-ink"
            />
            <div className="mt-1 text-right font-sans text-[11px] text-ink-faint">
              {bio.length}/120
            </div>
          </Field>
        </section>

        {error && (
          <div className="border border-warn/40 bg-warn/5 px-4 py-3 font-serif text-sm text-warn">
            {error}
          </div>
        )}
        {saved && (
          <div className="border border-emerald-500/30 bg-emerald-500/5 px-4 py-3 font-serif text-sm text-emerald-700">
            저장됐어요.
          </div>
        )}

        <button
          type="submit"
          disabled={submitting || username.length < 3}
          className="inline-flex h-11 w-full items-center justify-center gap-2 bg-ink px-5 font-sans text-sm text-bg transition-colors hover:bg-ink-soft disabled:opacity-40"
        >
          <Save size={16} />
          {submitting ? "저장 중" : "저장"}
        </button>
      </form>
    </main>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-ink-faint">
        {label}
      </span>
      {children}
    </label>
  );
}
