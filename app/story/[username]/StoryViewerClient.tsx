"use client";

import Image from "next/image";
import Link from "next/link";
import {
  Camera,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Clock3,
  MessageCircle,
  Send,
  ShieldCheck,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { sendMessage } from "@/app/chat/actions";

const STORY_DURATION_MS = 6500;

export type StoryItem = {
  id: string;
  image_url: string;
  caption: string | null;
  exif_data: Record<string, unknown> | null;
  ai_score: number | null;
  created_at: string;
  expires_at: string;
};

export function StoryViewerClient({
  profile,
  stories,
}: {
  profile: {
    username: string;
    displayName: string | null;
    avatarUrl: string | null;
    isMe: boolean;
  };
  stories: StoryItem[];
}) {
  const [index, setIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [reply, setReply] = useState("");
  const [sendingReply, setSendingReply] = useState(false);
  const [replyStatus, setReplyStatus] = useState<string | null>(null);
  const current = stories[index];
  const paused = reply.length > 0 || sendingReply;
  const progress = Math.min(100, (elapsed / STORY_DURATION_MS) * 100);

  function goTo(nextIndex: number) {
    setElapsed(0);
    setIndex(Math.max(0, Math.min(nextIndex, stories.length - 1)));
  }

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`/api/story/${current.id}/check-ai`, {
      method: "POST",
      signal: ctrl.signal,
    }).catch(() => {
      // fail-open: 스토리 검사는 백그라운드 보강만 담당
    });
    return () => ctrl.abort();
  }, [current.id]);

  useEffect(() => {
    if (paused) return;
    const timer = setTimeout(() => {
      setElapsed(0);
      setIndex((prev) => Math.min(prev + 1, stories.length - 1));
    }, STORY_DURATION_MS);
    const ticker = setInterval(() => {
      setElapsed((prev) => Math.min(STORY_DURATION_MS, prev + 120));
    }, 120);
    return () => {
      clearTimeout(timer);
      clearInterval(ticker);
    };
  }, [index, stories.length, paused]);

  const proof = useMemo(() => {
    const exif = current.exif_data as
      | { cameraModel?: string; dateTimeOriginal?: string }
      | null;
    return {
      camera: exif?.cameraModel || "직접 올린 사진",
      fresh: !!exif?.dateTimeOriginal,
    };
  }, [current.exif_data]);

  async function handleReply(e: React.FormEvent) {
    e.preventDefault();
    if (!reply.trim() || sendingReply) return;

    setSendingReply(true);
    setReplyStatus(null);
    const body = `스토리 답장: ${reply.trim()}`;
    const result = await sendMessage({
      recipientUsername: profile.username,
      body,
    });
    if (result?.error) {
      setReplyStatus(result.error);
      setSendingReply(false);
      return;
    }
    setReply("");
    setReplyStatus("보냈어요.");
    setSendingReply(false);
  }

  return (
    <main className="fixed inset-0 z-50 bg-[#111] text-white">
      <div className="mx-auto flex h-full max-w-md flex-col bg-black">
        <div className="absolute inset-x-0 top-0 z-20 mx-auto max-w-md px-4 pt-4">
          <div className="mb-4 grid grid-cols-[1fr_auto] items-center gap-3">
            <div className="flex gap-1.5">
              {stories.map((story, i) => (
                <span
                  key={story.id}
                  className="h-1 flex-1 overflow-hidden rounded-full bg-white/25"
                >
                  <span
                    className="block h-full bg-white transition-all"
                    style={{
                      width:
                        i < index ? "100%" : i === index ? `${progress}%` : "0%",
                    }}
                  />
                </span>
              ))}
            </div>
            <Link
              href="/feed"
              className="grid h-9 w-9 place-items-center rounded-full bg-black/35 text-white backdrop-blur transition-colors hover:bg-black/55"
              aria-label="닫기"
            >
              <X size={18} />
            </Link>
          </div>

          <Link
            href={`/profile/${profile.username}`}
            className="flex items-center gap-3"
          >
            <Avatar
              username={profile.username}
              avatarUrl={profile.avatarUrl}
              size="h-10 w-10"
            />
            <div className="min-w-0">
              <div className="truncate font-sans text-sm font-medium">
                @{profile.username}
              </div>
              <div className="truncate font-serif text-xs text-white/70">
                {profile.displayName
                  ? `${profile.displayName} · ${timeLeft(current.expires_at)}`
                  : timeLeft(current.expires_at)}
              </div>
            </div>
          </Link>
        </div>

        <div className="relative flex-1">
          <Image
            src={current.image_url}
            alt={current.caption ?? `${profile.username} story`}
            fill
            sizes="100vw"
            priority
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-transparent to-black/70" />

          <button
            type="button"
            onClick={() => goTo(index - 1)}
            className="absolute left-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/25 text-white backdrop-blur disabled:opacity-20"
            disabled={index === 0}
            aria-label="이전 스토리"
          >
            <ChevronLeft size={22} />
          </button>
          <button
            type="button"
            onClick={() => goTo(index + 1)}
            className="absolute right-2 top-1/2 z-10 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-black/25 text-white backdrop-blur disabled:opacity-20"
            disabled={index === stories.length - 1}
            aria-label="다음 스토리"
          >
            <ChevronRight size={22} />
          </button>

          <div className="absolute inset-x-0 bottom-0 z-20 space-y-4 px-4 pb-5">
            {current.caption && (
              <p className="rounded-lg bg-black/32 px-4 py-3 font-serif text-lg leading-relaxed text-white shadow-2xl backdrop-blur">
                {current.caption}
              </p>
            )}
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs text-white/78">
                <StoryBadge
                  icon={<Camera size={15} />}
                  text={proof.fresh ? "직촬" : proof.camera}
                />
                <StoryBadge
                  icon={<Clock3 size={15} />}
                  text={timeLeft(current.expires_at)}
                />
                <StoryBadge
                  icon={
                    typeof current.ai_score === "number" ? (
                      <CircleCheck size={15} />
                    ) : (
                      <ShieldCheck size={15} />
                    )
                  }
                  text={
                    typeof current.ai_score === "number"
                      ? "검사 완료"
                      : "검사 중"
                  }
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={`/profile/${profile.username}`}
                className="inline-flex h-9 items-center gap-2 rounded-full bg-black/32 px-3 font-sans text-xs text-white/82 backdrop-blur transition-colors hover:bg-black/50"
              >
                <UserRound size={14} />
                프로필
              </Link>
              {profile.isMe ? (
                <Link
                  href="/stories/create"
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-white px-3 font-sans text-xs text-black transition-colors hover:bg-white/85"
                >
                  <Camera size={14} />
                  새 스토리
                </Link>
              ) : (
                <Link
                  href={`/chat/${profile.username}`}
                  className="inline-flex h-9 items-center gap-2 rounded-full bg-black/32 px-3 font-sans text-xs text-white/82 backdrop-blur transition-colors hover:bg-black/50"
                >
                  <MessageCircle size={14} />
                  대화
                </Link>
              )}
            </div>
            {!profile.isMe && (
              <form
                onSubmit={handleReply}
                className="grid grid-cols-[1fr_auto] gap-2"
              >
                <input
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  maxLength={300}
                  placeholder={`@${profile.username}에게 답장`}
                  className="min-w-0 rounded-full border border-white/25 bg-black/35 px-4 py-3 font-serif text-sm text-white outline-none backdrop-blur placeholder:text-white/55 focus:border-white/70"
                  disabled={sendingReply}
                />
                <button
                  type="submit"
                  disabled={sendingReply || !reply.trim()}
                  className="grid h-11 w-11 place-items-center rounded-full bg-white text-black transition-colors hover:bg-white/85 disabled:opacity-40"
                  aria-label="답장 보내기"
                >
                  <Send size={18} />
                </button>
              </form>
            )}
            {replyStatus && (
              <p className="px-2 font-serif text-xs text-white/70">
                {replyStatus}
              </p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Avatar({
  username,
  avatarUrl,
  size,
}: {
  username: string;
  avatarUrl: string | null;
  size: string;
}) {
  return (
    <span
      className={`${size} grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/30 bg-white/15 font-sans text-sm font-medium uppercase`}
    >
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt=""
          width={64}
          height={64}
          className="h-full w-full object-cover"
        />
      ) : (
        username.slice(0, 2)
      )}
    </span>
  );
}

function timeLeft(expiresAt: string) {
  const ms = new Date(expiresAt).getTime() - Date.now();
  const h = Math.max(0, Math.ceil(ms / 3600000));
  return `${h}시간 남음`;
}

function StoryBadge({
  icon,
  text,
}: {
  icon: React.ReactNode;
  text: string;
}) {
  return (
    <span className="inline-flex min-w-0 items-center gap-2 rounded-full bg-black/32 px-3 py-2 backdrop-blur">
      <span className="shrink-0">{icon}</span>
      <span className="truncate font-serif">{text}</span>
    </span>
  );
}
