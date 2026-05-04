import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { HumanAvatar } from "@/components/HumanAvatar";
import { ChatThreadClient } from "./ChatThreadClient";

export const dynamic = "force-dynamic";

export default async function ChatThreadPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const cleaned = decodeURIComponent(username).replace(/^@/, "").toLowerCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: other } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("username", cleaned)
    .maybeSingle();

  if (!other) notFound();
  if (other.id === user.id) redirect("/chat");

  const { data: messages } = await supabase
    .from("messages")
    .select("id, sender_id, body, created_at, read")
    .or(
      `and(sender_id.eq.${user.id},recipient_id.eq.${other.id}),and(sender_id.eq.${other.id},recipient_id.eq.${user.id})`
    )
    .order("created_at", { ascending: true })
    .limit(200);

  // 들어온 메시지 read 처리 (best-effort)
  await supabase
    .from("messages")
    .update({ read: true })
    .eq("recipient_id", user.id)
    .eq("sender_id", other.id)
    .eq("read", false);

  return (
    <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col">
      <div className="sticky top-14 z-20 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-3 backdrop-blur">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/chat"
            className="grid h-9 w-9 place-items-center border border-line bg-bg-card text-ink-soft transition-colors hover:text-ink"
            aria-label="대화 목록"
          >
            <ArrowLeft size={17} />
          </Link>
          <Link
            href={`/profile/${other.username}`}
            className="flex min-w-0 items-center gap-3"
          >
            <HumanAvatar
              username={other.username}
              avatarUrl={other.avatar_url}
              size="sm"
            />
            <span className="min-w-0">
              <span className="block truncate font-sans text-sm font-medium">
                @{other.username}
              </span>
              {other.display_name && (
                <span className="block truncate font-serif text-xs text-ink-faint">
                  {other.display_name}
                </span>
              )}
            </span>
          </Link>
        </div>
        <Link
          href={`/profile/${other.username}`}
          className="font-sans text-xs text-ink-soft transition-colors hover:text-ink"
        >
          프로필
        </Link>
      </div>

      <ChatThreadClient
        meId={user.id}
        otherId={other.id}
        otherUsername={other.username}
        otherDisplayName={other.display_name}
        otherAvatarUrl={other.avatar_url}
        initialMessages={
          (messages ?? []) as {
            id: string;
            sender_id: string;
            body: string;
            created_at: string;
            read: boolean;
          }[]
        }
      />
    </main>
  );
}
