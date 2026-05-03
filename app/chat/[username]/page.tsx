import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
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
    .select("id, username, display_name")
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
    <main className="max-w-xl mx-auto w-full flex flex-col flex-1 relative z-10">
      <div className="sticky top-14 z-20 bg-bg/80 backdrop-blur border-b border-line px-4 py-3 flex items-center justify-between">
        <Link
          href={`/profile/${other.username}`}
          className="font-serif text-base"
        >
          @{other.username}
          {other.display_name && (
            <span className="ml-2 text-xs text-ink-faint">
              {other.display_name}
            </span>
          )}
        </Link>
        <Link
          href="/chat"
          className="text-xs text-ink-soft hover:text-ink font-serif"
        >
          ← 목록
        </Link>
      </div>

      <ChatThreadClient
        meId={user.id}
        otherId={other.id}
        otherUsername={other.username}
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
