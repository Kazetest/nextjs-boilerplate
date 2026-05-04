import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  BadgeCheck,
  Bookmark,
  Camera,
  GalleryVerticalEnd,
  Grid3X3,
  ImageOff,
  MessageCircle,
  Plus,
  Settings,
  ShieldCheck,
} from "lucide-react";
import { FollowButton } from "@/components/FollowButton";
import { HumanAvatar } from "@/components/HumanAvatar";

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
      .maybeSingle();
    if (me) redirect(`/profile/${me.username}`);
    // profile 없는 신규 user는 onboarding으로 (handle_new_user trigger 미적용/실패 시 self-heal)
    redirect("/onboarding");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio, avatar_url, created_at")
    .eq("username", username)
    .maybeSingle();

  if (!profile) notFound();

  const [
    { data: posts },
    { count: postCount },
    { count: followerCount },
    { count: followingCount },
    { data: following },
    { data: stories },
  ] = await Promise.all([
    supabase
      .from("posts")
      .select("id, image_url, caption, exif_data, origin_type, ai_score, created_at")
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
    supabase
      .from("stories")
      .select("id, created_at")
      .eq("author_id", profile.id)
      .gt("expires_at", new Date().toISOString())
      .eq("hidden_by_reports", false)
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  const isMe = user.id === profile.id;
  const isFollowing = !!following;
  const hasStory = (stories ?? []).length > 0;
  const visiblePosts = posts ?? [];
  const freshPostCount = visiblePosts.filter(isFreshlyCaptured).length;
  const originalPostCount = visiblePosts.filter(
    (post) => post.origin_type === "original"
  ).length;

  return (
    <div className="relative z-10 flex flex-col flex-1 w-full">
      <main className="mx-auto w-full max-w-3xl px-4 py-8">
        <div className="border-b border-line pb-8">
          <div className="grid grid-cols-[auto_1fr] gap-5 sm:gap-8">
            <Link
              href={hasStory ? `/story/${profile.username}` : isMe ? "/stories/create" : `/profile/${profile.username}`}
              className="self-start"
              aria-label={hasStory ? "스토리 보기" : "프로필 아바타"}
            >
              <HumanAvatar
                username={profile.username}
                avatarUrl={profile.avatar_url}
                size="xl"
                ring={hasStory}
              />
            </Link>

            <div className="min-w-0">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <h1 className="truncate font-sans text-2xl font-medium tracking-tight">
                  @{profile.username}
                </h1>
                {isMe && (
                  <Link
                    href="/stories/create"
                    className="inline-flex h-9 items-center gap-2 border border-line bg-bg-card px-3 font-sans text-sm transition-colors hover:border-ink"
                  >
                    <Plus size={15} />
                    스토리
                  </Link>
                )}
              </div>

              <div className="mb-5 flex items-center gap-6 font-sans text-sm">
                <Stat label="게시물" value={postCount ?? 0} />
                <Stat label="팔로워" value={followerCount ?? 0} />
                <Stat label="팔로잉" value={followingCount ?? 0} />
              </div>

              <div className="space-y-1 font-serif">
                {profile.display_name && (
                  <p className="font-medium text-ink">{profile.display_name}</p>
                )}
                <p className="max-w-lg text-sm leading-relaxed text-ink-soft">
                  {profile.bio || "아직 소개가 없습니다."}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-3 border border-line bg-bg-card">
                <ProfileSignal
                  icon={<ShieldCheck size={15} />}
                  label="직촬"
                  value={freshPostCount}
                />
                <ProfileSignal
                  icon={<BadgeCheck size={15} />}
                  label="오리지널"
                  value={originalPostCount}
                />
                <ProfileSignal
                  icon={<GalleryVerticalEnd size={15} />}
                  label="스토리"
                  value={hasStory ? "ON" : "OFF"}
                />
              </div>

              <div className="mt-5 flex flex-wrap items-center gap-2">
                {isMe ? (
                  <>
                    <Link
                      href="/create"
                      className="inline-flex h-10 items-center gap-2 bg-ink px-4 font-sans text-sm text-bg transition-colors hover:bg-ink-soft"
                    >
                      <Camera size={16} />
                      새 게시물
                    </Link>
                    <Link
                      href="/chat"
                      className="inline-flex h-10 items-center gap-2 border border-line bg-bg-card px-4 font-sans text-sm transition-colors hover:border-ink"
                    >
                      <MessageCircle size={16} />
                      받은 대화
                    </Link>
                    <Link
                      href="/saved"
                      className="inline-flex h-10 items-center gap-2 border border-line bg-bg-card px-4 font-sans text-sm transition-colors hover:border-ink"
                    >
                      <Bookmark size={16} />
                      저장됨
                    </Link>
                    <Link
                      href="/settings/profile"
                      className="inline-flex h-10 items-center gap-2 border border-line bg-bg-card px-4 font-sans text-sm transition-colors hover:border-ink"
                    >
                      <Settings size={16} />
                      프로필 편집
                    </Link>
                  </>
                ) : (
                  <>
                    <FollowButton
                      targetId={profile.id}
                      initialFollowing={isFollowing}
                    />
                    {hasStory && (
                      <Link
                        href={`/story/${profile.username}`}
                        className="inline-flex h-10 items-center gap-2 bg-ink px-4 font-sans text-sm text-bg transition-colors hover:bg-ink-soft"
                      >
                        <GalleryVerticalEnd size={16} />
                        스토리 보기
                      </Link>
                    )}
                    <Link
                      href={`/chat/${profile.username}`}
                      className="inline-flex h-10 items-center gap-2 border border-line bg-bg-card px-4 font-sans text-sm transition-colors hover:border-ink"
                    >
                      <MessageCircle size={16} />
                      메시지
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex h-12 items-center justify-center gap-2 border-b border-line font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-ink">
          <Grid3X3 size={14} />
          Posts
        </div>

        {visiblePosts.length > 0 ? (
          <div className="grid grid-cols-3 gap-1">
            {visiblePosts.map((p) => {
              const fresh = isFreshlyCaptured(p);
              return (
                <Link
                  key={p.id}
                  href={`/post/${p.id}`}
                  className="group relative aspect-square overflow-hidden bg-bg-card"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image_url}
                    alt={p.caption.slice(0, 40)}
                    className="h-full w-full object-cover transition duration-200 group-hover:scale-[1.02] group-hover:opacity-90"
                  />
                  <div className="absolute inset-x-0 bottom-0 flex flex-wrap gap-1 bg-gradient-to-t from-ink/55 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    {fresh && (
                      <span className="inline-flex items-center gap-1 bg-bg/90 px-1.5 py-0.5 font-sans text-[10px] text-ink">
                        <Camera size={11} />
                        직촬
                      </span>
                    )}
                    {p.origin_type === "original" && (
                      <span className="inline-flex items-center gap-1 bg-bg/90 px-1.5 py-0.5 font-sans text-[10px] text-ink">
                        <BadgeCheck size={11} />
                        원본
                      </span>
                    )}
                    {typeof p.ai_score === "number" && p.ai_score < 0.5 && (
                      <span className="inline-flex items-center gap-1 bg-bg/90 px-1.5 py-0.5 font-sans text-[10px] text-ink">
                        <ShieldCheck size={11} />
                        검증
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="border border-dashed border-line bg-bg-card px-6 py-12 text-center">
            <ImageOff className="mx-auto mb-3 text-ink-faint" size={28} />
            <p className="font-serif text-sm text-ink-soft">
              아직 게시물이 없습니다.
            </p>
            {isMe ? (
              <Link
                href="/create"
                className="mt-4 inline-flex h-10 items-center gap-2 bg-ink px-4 font-sans text-sm text-bg transition-colors hover:bg-ink-soft"
              >
                <Camera size={16} />
                첫 게시물 만들기
              </Link>
            ) : (
              <p className="mt-1 font-serif text-xs text-ink-faint">
                새 직촬이 올라오면 여기에서 볼 수 있습니다.
              </p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="leading-tight">
      <span className="mr-1 font-semibold tabular-nums">{value}</span>
      <span className="text-ink-soft">{label}</span>
    </div>
  );
}

function ProfileSignal({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border-r border-line px-3 py-2 last:border-r-0">
      <span className="flex items-center gap-1 font-sans text-[11px] text-ink-faint">
        {icon}
        {label}
      </span>
      <span className="truncate font-sans text-sm font-medium text-ink tabular-nums">
        {value}
      </span>
    </div>
  );
}

function isFreshlyCaptured(post: {
  exif_data: Record<string, unknown> | null;
  created_at: string;
}): boolean {
  const exif = post.exif_data as { dateTimeOriginal?: string } | null;
  const dt = exif?.dateTimeOriginal;
  if (!dt) return false;
  const m = dt.match(
    /^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/
  );
  if (!m) return false;
  const [, y, mo, d, h, mi, s] = m;
  const captured = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s)
  ).getTime();
  const posted = new Date(post.created_at).getTime();
  return Math.abs(posted - captured) / 60000 <= 10;
}
