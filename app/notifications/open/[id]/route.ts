import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type NotificationRow = {
  id: string;
  kind: "bow" | "comment" | "follow" | "message";
  post_id: string | null;
  actor: { username: string } | null;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data } = await supabase
    .from("notifications")
    .select(
      `id, kind, post_id,
       actor:profiles!notifications_actor_id_fkey(username)`
    )
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  const notification = data as unknown as NotificationRow | null;
  if (!notification) redirect("/notifications");

  await supabase
    .from("notifications")
    .update({ read: true })
    .eq("id", notification.id)
    .eq("user_id", user.id);

  redirect(targetFor(notification));
}

function targetFor(notification: NotificationRow): string {
  switch (notification.kind) {
    case "bow":
    case "comment":
      return notification.post_id ? `/post/${notification.post_id}` : "/notifications";
    case "follow":
      return notification.actor?.username
        ? `/profile/${notification.actor.username}`
        : "/notifications";
    case "message":
      return notification.actor?.username
        ? `/chat/${notification.actor.username}`
        : "/chat";
  }
}
