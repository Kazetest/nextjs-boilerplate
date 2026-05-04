import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowUpRight,
  AtSign,
  Bell,
  Eye,
  HeartHandshake,
  ListFilter,
  MessageCircle,
  MessageSquare,
  UserPlus,
} from "lucide-react";
import { HumanAvatar } from "@/components/HumanAvatar";
import { markAllRead } from "./actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  kind: "bow" | "comment" | "follow" | "message";
  read: boolean;
  created_at: string;
  post_id: string | null;
  actor: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
  } | null;
};

type FilterKey = "all" | "unread" | Row["kind"];

const filters: { key: FilterKey; label: string }[] = [
  { key: "all", label: "전체" },
  { key: "unread", label: "안 읽음" },
  { key: "bow", label: "묵례" },
  { key: "comment", label: "댓글" },
  { key: "follow", label: "팔로우" },
  { key: "message", label: "메시지" },
];

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const { filter } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("notifications")
    .select(
      `id, kind, read, created_at, post_id,
       actor:profiles!notifications_actor_id_fkey(username, display_name, avatar_url)`
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as unknown as Row[];
  const activeFilter = normalizeFilter(filter);
  const unreadCount = rows.filter((r) => !r.read).length;
  const filteredRows = rows.filter((row) => {
    if (activeFilter === "all") return true;
    if (activeFilter === "unread") return !row.read;
    return row.kind === activeFilter;
  });
  const counts = {
    all: rows.length,
    unread: unreadCount,
    bow: rows.filter((r) => r.kind === "bow").length,
    comment: rows.filter((r) => r.kind === "comment").length,
    follow: rows.filter((r) => r.kind === "follow").length,
    message: rows.filter((r) => r.kind === "message").length,
  } satisfies Record<FilterKey, number>;

  return (
    <main className="relative z-10 mx-auto w-full max-w-2xl px-4 py-7">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="font-sans text-[10px] font-medium uppercase tracking-[0.28em] text-ink-faint">
            Activity
          </p>
          <h1 className="font-serif text-3xl">알림</h1>
        </div>
        {rows.some((r) => !r.read) && (
          <form action={markAllRead}>
            <button
              type="submit"
              className="border border-line bg-bg-card px-3 py-2 font-sans text-xs text-ink-soft transition-colors hover:border-ink hover:text-ink"
            >
              모두 읽음
            </button>
          </form>
        )}
      </div>

      <section className="mb-5 grid grid-cols-3 border border-line bg-bg-card">
        <ActivityStat
          icon={<Bell size={15} />}
          label="전체"
          value={rows.length}
        />
        <ActivityStat
          icon={<Eye size={15} />}
          label="안 읽음"
          value={unreadCount}
        />
        <ActivityStat
          icon={<AtSign size={15} />}
          label="오늘"
          value={rows.filter((r) => isToday(r.created_at)).length}
        />
      </section>

      <NotificationFocus unreadCount={unreadCount} latest={rows[0] ?? null} />

      <nav className="mb-5 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {filters.map((item) => {
          const active = activeFilter === item.key;
          return (
            <Link
              key={item.key}
              href={
                item.key === "all"
                  ? "/notifications"
                  : `/notifications?filter=${item.key}`
              }
              className={`inline-flex h-9 shrink-0 items-center gap-2 border px-3 font-sans text-xs transition-colors ${
                active
                  ? "border-ink bg-ink text-bg"
                  : "border-line bg-bg-card text-ink-soft hover:border-ink hover:text-ink"
              }`}
            >
              <ListFilter size={13} />
              {item.label}
              <span
                className={`tabular-nums ${
                  active ? "text-bg/70" : "text-ink-faint"
                }`}
              >
                {counts[item.key]}
              </span>
            </Link>
          );
        })}
      </nav>

      {error && (
        <p className="text-sm text-warn font-serif mb-4">
          알림 테이블이 아직 없습니다 (004_notifications.sql 적용 필요).
        </p>
      )}

      {filteredRows.length === 0 ? (
        <div className="border border-line bg-bg-card px-6 py-16 text-center text-ink-soft">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center border border-line bg-bg">
            <Bell size={22} />
          </div>
          <p className="font-serif text-xl text-ink">
            {emptyTitle(activeFilter)}
          </p>
          <p className="mt-2 font-serif text-sm">
            {emptyText(activeFilter)}
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {filteredRows.map((n) => (
            <li
              key={n.id}
              className={`border border-line transition-colors ${
                !n.read ? "bg-bg-card" : "bg-bg-card/55"
              } hover:bg-bg`}
            >
              <NotifLink n={n} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function normalizeFilter(value?: string): FilterKey {
  if (
    value === "unread" ||
    value === "bow" ||
    value === "comment" ||
    value === "follow" ||
    value === "message"
  ) {
    return value;
  }
  return "all";
}

function NotificationFocus({
  unreadCount,
  latest,
}: {
  unreadCount: number;
  latest: Row | null;
}) {
  if (unreadCount > 0) {
    return (
      <section className="mb-5 border border-ink bg-ink px-4 py-3 text-bg">
        <div className="flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="font-sans text-[10px] uppercase tracking-[0.24em] text-bg/55">
              Needs attention
            </p>
            <p className="truncate font-serif text-lg">
              읽지 않은 알림 {unreadCount}개
            </p>
          </div>
          <Link
            href="/notifications?filter=unread"
            className="shrink-0 rounded-full border border-bg/35 px-3 py-1.5 font-sans text-xs text-bg transition-colors hover:bg-bg hover:text-ink"
          >
            보기
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mb-5 border border-line bg-bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="font-sans text-[10px] uppercase tracking-[0.24em] text-ink-faint">
            All clear
          </p>
          <p className="truncate font-serif text-sm text-ink-soft">
            {latest ? `최근 알림 ${relative(latest.created_at)}` : "새 알림이 없습니다"}
          </p>
        </div>
        <Link
          href="/feed"
          className="shrink-0 rounded-full border border-line px-3 py-1.5 font-sans text-xs text-ink-soft transition-colors hover:border-ink hover:text-ink"
        >
          피드로
        </Link>
      </div>
    </section>
  );
}

function ActivityStat({
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

function NotifLink({ n }: { n: Row }) {
  const username = n.actor?.username ?? "탈퇴한 사용자";
  const text = textFor(n.kind, username);
  const actionLabel = actionFor(n.kind);

  const inner = (
    <div className="flex items-center gap-3 px-3 py-3">
      <div className="relative">
        <HumanAvatar
          username={n.actor?.username ?? "??"}
          avatarUrl={n.actor?.avatar_url}
          size="md"
        />
        <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center border-2 border-bg-card bg-ink text-bg">
          <NotifIcon kind={n.kind} />
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="font-sans text-[10px] uppercase tracking-[0.18em] text-ink-faint">
            {kindLabel(n.kind)}
          </span>
          {!n.read && (
            <span className="border border-ink bg-ink px-1.5 py-0.5 font-sans text-[10px] text-bg">
              새 알림
            </span>
          )}
        </div>
        <p className="font-serif text-sm leading-relaxed text-ink">{text}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <time className="font-sans text-[11px] text-ink-faint">
            {relative(n.created_at)}
          </time>
          <span className="inline-flex items-center gap-1 font-sans text-[11px] text-ink-soft">
            {actionLabel}
            <ArrowUpRight size={12} />
          </span>
        </div>
      </div>
      {!n.read && <span className="h-2 w-2 rounded-full bg-ink" />}
    </div>
  );

  return <Link href={`/notifications/open/${n.id}`}>{inner}</Link>;
}

function NotifIcon({ kind }: { kind: Row["kind"] }) {
  switch (kind) {
    case "bow":
      return <HeartHandshake size={13} />;
    case "comment":
      return <MessageSquare size={13} />;
    case "follow":
      return <UserPlus size={13} />;
    case "message":
      return <MessageCircle size={13} />;
  }
}

function textFor(kind: Row["kind"], username: string): string {
  switch (kind) {
    case "bow":
      return `@${username} 님이 회원님 게시물에 묵례를 보냈습니다.`;
    case "comment":
      return `@${username} 님이 회원님 게시물에 댓글을 남겼습니다.`;
    case "follow":
      return `@${username} 님이 회원님을 팔로우합니다.`;
    case "message":
      return `@${username} 님이 메시지를 보냈습니다.`;
  }
}

function kindLabel(kind: Row["kind"]): string {
  switch (kind) {
    case "bow":
      return "Bow";
    case "comment":
      return "Comment";
    case "follow":
      return "Follow";
    case "message":
      return "Direct";
  }
}

function actionFor(kind: Row["kind"]): string {
  switch (kind) {
    case "bow":
    case "comment":
      return "게시물 보기";
    case "follow":
      return "프로필 보기";
    case "message":
      return "대화 열기";
  }
}

function relative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}일`;
  return new Date(iso).toLocaleDateString("ko-KR", {
    month: "numeric",
    day: "numeric",
  });
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

function emptyTitle(filter: FilterKey): string {
  if (filter === "unread") return "읽지 않은 알림이 없습니다";
  if (filter === "bow") return "아직 묵례가 없습니다";
  if (filter === "comment") return "아직 댓글 알림이 없습니다";
  if (filter === "follow") return "아직 팔로우 알림이 없습니다";
  if (filter === "message") return "아직 메시지 알림이 없습니다";
  return "아직 조용합니다";
}

function emptyText(filter: FilterKey): string {
  if (filter === "unread") return "새 반응이 오면 바로 위에 모아둘게요.";
  if (filter === "bow") return "누군가 게시물에 묵례하면 여기에서 볼 수 있습니다.";
  if (filter === "comment") return "직접 입력한 댓글 반응이 여기에 쌓입니다.";
  if (filter === "follow") return "새 팔로워가 생기면 여기에서 이어갈 수 있습니다.";
  if (filter === "message") return "새 DM이 오면 바로 대화로 들어갈 수 있습니다.";
  return "묵례, 댓글, 팔로우, 메시지가 오면 여기에 모입니다.";
}
