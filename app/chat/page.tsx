import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { ChatListClient, type ChatThread } from "./ChatListClient";

export const dynamic = "force-dynamic";

export default async function ChatListPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: threads, error } = await supabase.rpc("list_chat_threads");
  const list = ((threads as ChatThread[]) ?? []).filter((t) => t.other_username);

  return (
    <main className="relative z-10 mx-auto w-full max-w-2xl px-4 py-7">
      <ChatListClient threads={list} hasThreadError={!!error} />
    </main>
  );
}
