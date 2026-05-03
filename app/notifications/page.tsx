import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { markAllRead } from "./actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  kind: "bow" | "comment" | "follow" | "message";
  read: boolean;
  created_at: string;
  post_id: string | null;
  actor: { username: string; display_name: string | null } | null;
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data, error } = await supabase
    .from("notifications")
    .select(
      `id, kind, read, created_at, post_id,
       actor:profiles!notifications_actor_id_fkey(username, display_name)`
    )
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = (data ?? []) as unknown as Row[];

  return (
    <main className="max-w-xl mx-auto px-4 py-6 w-full relative z-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl">알림</h1>
        {rows.some((r) => !r.read) && (
          <form action={markAllRead}>
            <button
              type="submit"
              className="text-xs text-ink-soft hover:text-ink font-serif"
            >
              모두 읽음
            </button>
          </form>
        )}
      </div>

      {error && (
        <p className="text-sm text-warn font-serif mb-4">
          알림 테이블이 아직 없습니다 (004_notifications.sql 적용 필요).
        </p>
      )}

      {rows.length === 0 ? (
        <div className="text-center py-20 text-ink-soft">
          <p className="font-serif text-lg">아직 알림이 없습니다.</p>
        </div>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {rows.map((n) => (
            <li
              key={n.id}
              className={`py-3 px-2 ${
                !n.read ? "bg-bg-card/50" : ""
              } hover:bg-bg-card transition-colors`}
            >
              <NotifLink n={n} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function NotifLink({ n }: { n: Row }) {
  const username = n.actor?.username ?? "탈퇴한 사용자";
  const text = textFor(n.kind, username);
  const href = hrefFor(n);

  const inner = (
    <div className="flex items-start justify-between gap-3">
      <p className="font-serif text-sm leading-relaxed">
        {!n.read && (
          <span className="inline-block w-1.5 h-1.5 bg-ink rounded-full mr-2 align-middle" />
        )}
        {text}
      </p>
      <time className="text-[11px] text-ink-faint font-sans shrink-0">
        {relative(n.created_at)}
      </time>
    </div>
  );

  if (!href) return inner;
  return <Link href={href}>{inner}</Link>;
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

function hrefFor(n: Row): string | null {
  if (!n.actor) return null;
  switch (n.kind) {
    case "bow":
    case "comment":
      return n.post_id ? `/post/${n.post_id}` : null;
    case "follow":
      return `/profile/${n.actor.username}`;
    case "message":
      return `/chat/${n.actor.username}`;
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
