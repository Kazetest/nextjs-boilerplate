import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import { StoryViewerClient, type StoryItem } from "./StoryViewerClient";

export const dynamic = "force-dynamic";

export default async function StoryPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let cleaned = decodeURIComponent(username).replace(/^@/, "").toLowerCase();
  if (cleaned === "me") {
    const { data: me } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .maybeSingle();
    if (!me) redirect("/onboarding");
    cleaned = me.username;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url")
    .eq("username", cleaned)
    .maybeSingle();

  if (!profile) notFound();

  const { data: stories } = await supabase
    .from("stories")
    .select("id, image_url, caption, exif_data, ai_score, created_at, expires_at")
    .eq("author_id", profile.id)
    .gt("expires_at", new Date().toISOString())
    .eq("hidden_by_reports", false)
    .order("created_at", { ascending: true });

  const rows = (stories ?? []) as StoryItem[];
  if (rows.length === 0) notFound();

  await supabase.from("story_views").upsert(
    rows.map((story) => ({
      story_id: story.id,
      viewer_id: user.id,
      viewed_at: new Date().toISOString(),
    })),
    { onConflict: "story_id,viewer_id" }
  );

  return (
    <StoryViewerClient
      profile={{
        username: profile.username,
        displayName: profile.display_name,
        avatarUrl: profile.avatar_url,
        isMe: profile.id === user.id,
      }}
      stories={rows}
    />
  );
}
