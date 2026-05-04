"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CircleDot,
  Inbox,
  MessageCircle,
  MessageCircleMore,
  Search,
  SearchX,
  Send,
  Sparkles,
} from "lucide-react";
import { HumanAvatar } from "@/components/HumanAvatar";
import { startChat } from "./actions";

export type ChatThread = {
  other_id: string;
  other_username: string;
  other_display_name: string | null;
  other_avatar_url: string | null;
  last_message: string;
  last_at: string;
  last_from_me: boolean;
  unread_count: number;
};

type Filter = "all" | "unread";

export function ChatListClient({
  threads,
  hasThreadError,
}: {
  threads: ChatThread[];
  hasThreadError: boolean;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const unreadTotal = threads.reduce((sum, t) => sum + t.unread_count, 0);
  const recentTotal = threads.filter((t) => isToday(t.last_at)).length;
  const normalizedQuery = query.replace(/^@/, "").trim().toLowerCase();

  const filtered = useMemo(() => {
    return threads.filter((thread) => {
      const haystack = [
        thread.other_username,
        thread.other_display_name ?? "",
        thread.last_message,
      ]
        .join(" ")
        .toLowerCase();
      const matchesQuery =
        normalizedQuery.length === 0 || haystack.includes(normalizedQuery);
      const matchesFilter =
        filter === "all" || thread.unread_count > 0;
      return matchesQuery && matchesFilter;
    });
  }, [threads, normalizedQuery, filter]);

  return (
    <>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="font-sans text-[10px] font-medium uppercase tracking-[0.28em] text-ink-faint">
            Direct
          </p>
          <h1 className="font-serif text-3xl">메시지</h1>
        </div>
        <div className="grid h-11 w-11 place-items-center border border-line bg-bg-card text-ink-soft">
          <MessageCircle size={19} />
        </div>
      </div>

      <section className="mb-5 grid grid-cols-3 border border-line bg-bg-card">
        <ChatStat icon={<Inbox size={15} />} label="대화" value={threads.length} />
        <ChatStat
          icon={<CircleDot size={15} />}
          label="안 읽음"
          value={unreadTotal}
        />
        <ChatStat
          icon={<Sparkles size={15} />}
          label="오늘"
          value={recentTotal}
        />
      </section>

      <form
        action={startChat}
        className="mb-3 grid grid-cols-[1fr_auto] gap-2 border border-line bg-bg-card p-2"
      >
        <label className="flex min-w-0 items-center gap-2 px-2">
          <Search size={17} className="shrink-0 text-ink-faint" />
          <input
            name="username"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="@username 검색 또는 새 대화"
            className="min-w-0 flex-1 bg-transparent py-2 font-sans text-sm outline-none placeholder:text-ink-faint"
          />
        </label>
        <button
          type="submit"
          className="grid h-10 w-10 place-items-center bg-ink text-bg transition-colors hover:bg-ink-soft"
          aria-label="대화 시작"
        >
          <Send size={16} />
        </button>
      </form>

      <div className="mb-5 flex gap-2">
        <FilterButton
          active={filter === "all"}
          label="전체"
          count={threads.length}
          onClick={() => setFilter("all")}
        />
        <FilterButton
          active={filter === "unread"}
          label="안 읽음"
          count={threads.filter((t) => t.unread_count > 0).length}
          onClick={() => setFilter("unread")}
        />
      </div>

      {hasThreadError && (
        <div className="mb-4 font-serif text-sm text-warn">
          채팅 기능을 위한 마이그레이션이 필요합니다 (003_messages.sql).
        </div>
      )}

      {threads.length === 0 ? (
        <EmptyState
          icon={<MessageCircleMore size={22} />}
          title="첫 대화를 시작하세요"
          body="프로필에서 메시지를 누르거나 위 검색창에 아이디를 입력하면 바로 열립니다."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<SearchX size={22} />}
          title="맞는 대화가 없습니다"
          body="아이디나 최근 메시지를 조금 다르게 입력해보세요."
        />
      ) : (
        <ul className="space-y-2">
          {filtered.map((thread) => (
            <li
              key={thread.other_id}
              className={`border border-line bg-bg-card transition-colors ${
                thread.unread_count > 0 ? "shadow-[inset_3px_0_0_var(--ink)]" : ""
              }`}
            >
              <Link
                href={`/chat/${thread.other_username}`}
                className="flex items-center gap-3 px-3 py-3 transition-colors hover:bg-bg"
              >
                <HumanAvatar
                  username={thread.other_username}
                  avatarUrl={thread.other_avatar_url}
                  size="md"
                  ring={thread.unread_count > 0}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-sans text-sm font-medium">
                      @{thread.other_username}
                    </span>
                    {thread.other_display_name && (
                      <span className="truncate text-xs text-ink-faint">
                        {thread.other_display_name}
                      </span>
                    )}
                  </div>
                  <p
                    className={`mt-1 truncate font-serif text-sm ${
                      thread.unread_count > 0 ? "text-ink" : "text-ink-soft"
                    }`}
                  >
                    {thread.last_from_me && (
                      <span className="text-ink-faint">나: </span>
                    )}
                    {thread.last_message}
                  </p>
                </div>
                <div className="ml-3 flex shrink-0 flex-col items-end gap-1">
                  <time className="font-sans text-[11px] text-ink-faint">
                    {formatRelative(thread.last_at)}
                  </time>
                  {thread.unread_count > 0 && (
                    <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-ink px-1.5 font-sans text-[11px] text-bg">
                      {thread.unread_count > 99 ? "99+" : thread.unread_count}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function ChatStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border-r border-line px-3 py-2 last:border-r-0">
      <span className="flex items-center gap-1 font-sans text-[11px] text-ink-faint">
        {icon}
        {label}
      </span>
      <span className="font-sans text-sm font-medium text-ink tabular-nums">
        {value}
      </span>
    </div>
  );
}

function FilterButton({
  active,
  label,
  count,
  onClick,
}: {
  active: boolean;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-2 border px-3 font-sans text-xs transition-colors ${
        active
          ? "border-ink bg-ink text-bg"
          : "border-line bg-bg-card text-ink-soft hover:border-ink hover:text-ink"
      }`}
    >
      {label}
      <span className={active ? "text-bg/70" : "text-ink-faint"}>{count}</span>
    </button>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="border border-line bg-bg-card px-6 py-16 text-center text-ink-soft">
      <div className="mx-auto mb-5 grid h-14 w-14 place-items-center border border-line bg-bg">
        {icon}
      </div>
      <p className="mb-2 font-serif text-xl text-ink">{title}</p>
      <p className="mx-auto max-w-xs font-serif text-sm leading-relaxed">
        {body}
      </p>
    </div>
  );
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day}일`;
  return d.toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" });
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}
