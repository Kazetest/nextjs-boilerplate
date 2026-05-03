import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { FollowButton } from "@/components/FollowButton";

export const dynamic = "force-dynamic";

export default async function ProfilePage({
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

  if (username === "me") {
    const { data: me } = await supabase
      .from("profiles")
      .select("username")
      .eq("id", user.id)
      .single();
    if (me) redirect(`/profile/${me.username}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, created_at")
    .eq("username", username)
    .maybeSingle();

  if (!profile) notFound();

  const [
    { data: posts },
    { count: postCount },
    { count: followerCount },
    { count: followingCount },
    { data: following },
  ] = await Promise.all([
    supabase
      .from("posts")
      .select("id, image_url, caption, exif_data, created_at")
      .eq("author_id", profile.id)
      .eq("hidden_by_reports", false)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("posts")
      .select("*", { count: "exact", head: true })
      .eq("author_id", profile.id)
      .eq("hidden_by_reports", false),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", profile.id),
    supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", profile.id),
    user.id !== profile.id
      ? supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", user.id)
          .eq("following_id", profile.id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const isMe = user.id === profile.id;
  const isFollowing = !!following;

  return (
    <div className="relative z-10 flex flex-col flex-1 w-full">
      <header className="sticky top-0 z-20 bg-bg/80 backdrop-blur border-b border-line">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/feed" className="font-serif text-xl tracking-tight">
            NOai
          </Link>
          <Link
            href="/feed"
            className="text-sm text-ink-faint hover:text-ink font-serif"
          >
            ← 피드
          </Link>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-10 w-full">
        <div className="text-center mb-12">
          <h1 className="font-serif text-3xl mb-2">@{profile.username}</h1>
          {profile.display_name && (
            <p className="text-ink-soft font-serif mb-3">
              {profile.display_name}
            </p>
          )}
          {profile.bio && (
            <p className="text-ink-soft font-serif text-sm mb-6 max-w-md mx-auto">
              {profile.bio}
            </p>
          )}

          <div className="flex items-center justify-center gap-8 text-sm font-serif mb-6">
            <Stat label="게시물" value={postCount ?? 0} />
            <Stat label="팔로워" value={followerCount ?? 0} />
            <Stat label="팔로잉" value={followingCount ?? 0} />
          </div>

          {!isMe && (
            <div className="flex items-center justify-center gap-3">
              <FollowButton
                targetId={profile.id}
                initialFollowing={isFollowing}
              />
              <Link
                href={`/chat/${profile.username}`}
                className="px-4 py-2 border border-line hover:border-ink transition-colors text-sm font-serif"
              >
                메시지
              </Link>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1">
          {(posts ?? []).map((p) => (
            <Link
              key={p.id}
              href={`/post/${p.id}`}
              className="aspect-square bg-bg-card overflow-hidden hover:opacity-80 transition-opacity"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={p.image_url}
                alt={p.caption.slice(0, 40)}
                className="w-full h-full object-cover"
              />
            </Link>
          ))}
        </div>

        {(posts ?? []).length === 0 && (
          <p className="text-center text-ink-faint font-serif py-12">
            아직 게시물이 없습니다.
          </p>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="text-center">
      <div className="text-2xl text-ink font-serif tabular-nums">
        {value}
      </div>
      <div className="text-xs text-ink-faint mt-0.5">{label}</div>
    </div>
  );
}
