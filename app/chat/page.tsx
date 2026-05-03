import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { startChat } from "./actions";

export const dynamic = "force-dynamic";

type Thread = {
  other_id: string;
  other_username: string;
  other_display_name: string | null;
  last_message: string;
  last_at: string;
  last_from_me: boolean;
  unread_count: number;
};

export default async function ChatListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: threads, error } = await supabase.rpc("list_chat_threads");
  const list = ((threads as Thread[]) ?? []).filter((t) => t.other_username);

  return (
    <main className="max-w-xl mx-auto px-4 py-6 w-full relative z-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-serif text-2xl">채팅</h1>
      </div>

      <form action={startChat} className="mb-6 flex gap-2">
        <input
          name="username"
          placeholder="@아이디 입력 후 엔터"
          className="flex-1 px-3 py-2 bg-bg-card border border-line focus:border-ink outline-none font-serif text-sm"
        />
        <button
          type="submit"
          className="px-4 py-2 bg-ink text-bg hover:bg-ink-soft transition-colors font-serif text-sm"
        >
          시작
        </button>
      </form>

      {error && (
        <div className="text-sm text-warn mb-4 font-serif">
          채팅 기능을 위한 마이그레이션이 필요합니다 (003_messages.sql).
        </div>
      )}

      {list.length === 0 ? (
        <div className="text-center py-20 text-ink-soft">
          <p className="font-serif text-lg mb-2">아직 대화가 없습니다</p>
          <p className="text-sm font-serif">
            누군가의 프로필에서 메시지를 시작해보세요.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {list.map((t) => (
            <li key={t.other_id}>
              <Link
                href={`/chat/${t.other_username}`}
                className="flex items-center justify-between py-4 px-2 hover:bg-bg-card transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-base truncate">
                      @{t.other_username}
                    </span>
                    {t.other_display_name && (
                      <span className="text-xs text-ink-faint truncate">
                        {t.other_display_name}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-ink-soft truncate mt-1 font-serif">
                    {t.last_from_me && (
                      <span className="text-ink-faint">나: </span>
                    )}
                    {t.last_message}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 ml-3 shrink-0">
                  <time className="text-[11px] text-ink-faint font-sans">
                    {formatRelative(t.last_at)}
                  </time>
                  {t.unread_count > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 rounded-full bg-ink text-bg text-[11px] flex items-center justify-center font-sans">
                      {t.unread_count > 99 ? "99+" : t.unread_count}
                    </span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
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
