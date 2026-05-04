import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { ComponentType } from "react";
import {
  BadgeCheck,
  Camera,
  GalleryVerticalEnd,
  Hash,
  Images,
  MessageCircle,
  Search,
  Sparkles,
  UserRound,
} from "lucide-react";
import { FollowButton } from "@/components/FollowButton";
import { HumanAvatar } from "@/components/HumanAvatar";
import { extractHashtags } from "@/lib/hashtag";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string }>;

type ProfileHit = {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
};

type ExplorePost = {
  id: string;
  image_url: string;
  caption: string;
  exif_data: Record<string, unknown> | null;
  origin_type: "original" | "inspired_by_user" | "overseas_meme";
  created_at: string;
  author: { username: string } | null;
};

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const q = ((sp.q ?? "").trim().replace(/^#/, "")).slice(0, 48);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 차단 사용자 ID
  const { data: blocks } = await supabase
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", user.id);
  const blockedIds = (blocks ?? []).map((b) => b.blocked_id);

  const { data: followingRows } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);
  const followingIds = (followingRows ?? []).map((row) => row.following_id);

  // 최근 7일 게시물 중 묵례 많은 순
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let query = supabase
    .from("posts")
    .select(
      `id, image_url, caption, exif_data, origin_type, created_at,
       author:profiles!posts_author_id_fkey(username)`
    )
    .eq("hidden_by_reports", false)
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(60);

  if (blockedIds.length > 0) {
    query = query.not("author_id", "in", `(${blockedIds.join(",")})`);
  }

  if (q) {
    query = query.ilike("caption", `%${q}%`);
  }

  const [{ data: posts }, { data: people }] = await Promise.all([
    query,
    q
      ? supabase
          .from("profiles")
          .select("id, username, display_name, bio, avatar_url")
          .or(`username.ilike.%${q}%,display_name.ilike.%${q}%,bio.ilike.%${q}%`)
          .limit(8)
      : supabase
          .from("profiles")
          .select("id, username, display_name, bio, avatar_url")
          .order("created_at", { ascending: false })
          .limit(8),
  ]);

  const rows = (posts ?? []) as unknown as ExplorePost[];
  const peopleRows = ((people ?? []) as ProfileHit[]).filter(
    (p) => p.id !== user.id && !blockedIds.includes(p.id)
  );
  const peopleIds = peopleRows.map((person) => person.id);
  const { data: activeStories } =
    peopleIds.length > 0
      ? await supabase
          .from("stories")
          .select("author_id")
          .in("author_id", peopleIds)
          .gt("expires_at", new Date().toISOString())
          .eq("hidden_by_reports", false)
      : { data: [] };
  const storyAuthorIds = new Set(
    (activeStories ?? []).map((story) => story.author_id)
  );
  const tagCounts = new Map<string, number>();
  for (const post of rows) {
    for (const tag of extractHashtags(post.caption)) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }
  const tags = [...tagCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 12);

  return (
    <div className="relative z-10 flex flex-col flex-1 w-full">
      <main className="mx-auto w-full max-w-4xl px-4 py-7">
        <div className="mb-6 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-sans text-[10px] font-medium uppercase tracking-[0.28em] text-ink-faint">
              Explore
            </p>
            <h1 className="font-serif text-3xl">
              {q ? `"${q}" 검색` : "탐색"}
            </h1>
            <p className="mt-1 font-serif text-sm text-ink-faint">
              사람, 태그, 직접 찍은 게시물을 찾습니다.
            </p>
          </div>

          <form
            action="/explore"
            className="grid w-full grid-cols-[1fr_auto] gap-2 border border-line bg-bg-card p-2 sm:max-w-sm"
          >
            <label className="flex min-w-0 items-center gap-2 px-2">
              <Search size={17} className="shrink-0 text-ink-faint" />
              <input
                name="q"
                defaultValue={q}
                placeholder="사람, 태그, 문장"
                className="min-w-0 flex-1 bg-transparent py-2 font-sans text-sm outline-none placeholder:text-ink-faint"
              />
            </label>
            <button
              type="submit"
              className="grid h-10 w-10 place-items-center bg-ink text-bg transition-colors hover:bg-ink-soft"
              aria-label="검색"
            >
              <Search size={16} />
            </button>
          </form>
        </div>

        <section className="mb-7 grid grid-cols-3 border border-line bg-bg-card">
          <ExploreStat icon={Images} label="게시물" value={rows.length} />
          <ExploreStat icon={UserRound} label="계정" value={peopleRows.length} />
          <ExploreStat icon={Hash} label="태그" value={tags.length} />
        </section>

        <section className="mb-7 grid gap-3 sm:grid-cols-2">
          <PanelTitle icon={UserRound} title={q ? "사람" : "새로 온 사람"} />
          <PanelTitle icon={Hash} title={q ? "태그" : "요즘 태그"} />
          <div className="hidden items-center gap-2 font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-ink-faint sm:flex">
            <UserRound size={14} />
            {q ? "사람" : "새로 온 사람"}
          </div>
          <div className="hidden items-center gap-2 font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-ink-faint sm:flex">
            <Hash size={14} />
            {q ? "태그" : "요즘 태그"}
          </div>
          <div className="border border-line bg-bg-card">
            {peopleRows.length === 0 ? (
              <EmptyLine text="아직 찾은 계정이 없습니다." />
            ) : (
              <div className="divide-y divide-line">
                {peopleRows.slice(0, 5).map((person) => {
                  const hasStory = storyAuthorIds.has(person.id);
                  return (
                    <div
                      key={person.id}
                      className="px-3 py-3 transition-colors hover:bg-bg"
                    >
                      <div className="flex items-start gap-3">
                        <Link
                          href={hasStory ? `/story/${person.username}` : `/profile/${person.username}`}
                          className="shrink-0"
                          aria-label={hasStory ? `@${person.username} 스토리 보기` : `@${person.username} 프로필 보기`}
                        >
                          <HumanAvatar
                            username={person.username}
                            avatarUrl={person.avatar_url}
                            size="md"
                            ring={hasStory}
                          />
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link
                            href={`/profile/${person.username}`}
                            className="group block min-w-0"
                          >
                            <span className="block truncate font-sans text-sm font-medium group-hover:underline">
                              @{person.username}
                            </span>
                            <span className="block truncate font-serif text-xs text-ink-faint">
                              {person.display_name || person.bio || "NOai 사용자"}
                            </span>
                          </Link>
                          <div className="mt-3 flex flex-wrap items-center gap-1.5">
                            <FollowButton
                              targetId={person.id}
                              initialFollowing={followingIds.includes(person.id)}
                              compact
                            />
                            <IconLink
                              href={`/profile/${person.username}`}
                              label="프로필"
                              icon={<UserRound size={14} />}
                            />
                            <IconLink
                              href={`/chat/${person.username}`}
                              label="DM"
                              icon={<MessageCircle size={14} />}
                            />
                            {hasStory && (
                              <IconLink
                                href={`/story/${person.username}`}
                                label="스토리"
                                icon={<GalleryVerticalEnd size={14} />}
                                strong
                              />
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          <div className="border border-line bg-bg-card p-3">
            {tags.length === 0 ? (
              <EmptyLine text="아직 태그가 충분하지 않습니다." />
            ) : (
              <div className="flex flex-wrap gap-2">
                {tags.map(([tag, count]) => (
                  <Link
                    key={tag}
                    href={`/tag/${encodeURIComponent(tag)}`}
                    className="inline-flex h-9 items-center gap-2 border border-line bg-bg px-3 font-sans text-xs transition-colors hover:border-ink"
                  >
                    #{tag}
                    <span className="text-ink-faint">{count}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-3 flex items-center gap-2 font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-ink-faint">
            <Sparkles size={14} />
            Human Posts
          </div>
          {rows.length === 0 ? (
            <div className="border border-line bg-bg-card px-6 py-16 text-center">
              <p className="font-serif text-xl text-ink">아직 탐색할 게시물이 없습니다</p>
              <p className="mt-2 font-serif text-sm text-ink-soft">
                첫 게시물이 올라오면 여기가 곧 살아납니다.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-1">
              {rows.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/post/${p.id}`}
                  className={`group relative overflow-hidden bg-bg-card transition-opacity hover:opacity-90 ${
                    i % 11 === 0 ? "row-span-2 aspect-[1/2]" : "aspect-square"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.image_url}
                    alt={p.caption.slice(0, 40)}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-black/55 to-transparent p-2 text-white group-hover:block">
                    <div className="flex flex-wrap items-center gap-1">
                      <span className="truncate font-sans text-[11px]">
                        @{p.author?.username ?? "unknown"}
                      </span>
                      {isFreshlyCaptured(p) && (
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
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ExploreStat({
  icon: Icon,
  label,
  value,
}: {
  icon: ComponentType<{ size?: number }>;
  label: string;
  value: number;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border-r border-line px-3 py-2 last:border-r-0">
      <span className="flex items-center gap-1 font-sans text-[11px] text-ink-faint">
        <Icon size={15} />
        {label}
      </span>
      <span className="font-sans text-sm font-medium text-ink tabular-nums">
        {value}
      </span>
    </div>
  );
}

function PanelTitle({
  icon: Icon,
  title,
}: {
  icon: ComponentType<{ size?: number }>;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 font-sans text-[11px] font-medium uppercase tracking-[0.22em] text-ink-faint sm:hidden">
      <Icon size={14} />
      {title}
    </div>
  );
}

function EmptyLine({ text }: { text: string }) {
  return <p className="px-3 py-6 text-center font-serif text-sm text-ink-faint">{text}</p>;
}

function IconLink({
  href,
  icon,
  label,
  strong = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  strong?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex h-8 items-center gap-1.5 border px-2.5 font-sans text-xs transition-colors ${
        strong
          ? "border-ink bg-ink text-bg hover:bg-ink-soft"
          : "border-line bg-bg-card text-ink-soft hover:border-ink hover:text-ink"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

function isFreshlyCaptured(post: ExplorePost): boolean {
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
