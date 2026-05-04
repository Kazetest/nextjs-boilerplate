import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PostCard, type PostRow } from "@/components/PostCard";
import { StoryRail, type StoryRailItem } from "@/components/StoryRail";
import {
  SuggestedPeopleRail,
  type SuggestedPerson,
} from "@/components/SuggestedPeopleRail";

export const dynamic = "force-dynamic";

type SuggestedPersonRow = Omit<SuggestedPerson, "post_count">;

export default async function FeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  // 내가 차단한 사용자 ID 목록
  const { data: blocks } = await supabase
    .from("blocks")
    .select("blocked_id")
    .eq("blocker_id", user.id);
  const blockedIds = (blocks ?? []).map((b) => b.blocked_id);

  const [{ data: me }, { data: rawStories }, { data: followingRows }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("username")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("stories")
        .select(
          `id, author_id, created_at,
           author:profiles!stories_author_id_fkey(username, display_name, avatar_url)`
        )
        .gt("expires_at", new Date().toISOString())
        .eq("hidden_by_reports", false)
        .order("created_at", { ascending: false })
        .limit(80),
      supabase
        .from("follows")
        .select("following_id")
        .eq("follower_id", user.id),
    ]);

  const followingIds = (followingRows ?? []).map((row) => row.following_id);
  const excludedProfileIds = [user.id, ...blockedIds, ...followingIds];

  let suggestionsQuery = supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, bio, created_at")
    .order("created_at", { ascending: false })
    .limit(12);

  if (excludedProfileIds.length > 0) {
    suggestionsQuery = suggestionsQuery.not(
      "id",
      "in",
      `(${excludedProfileIds.join(",")})`
    );
  }

  const { data: suggestionRows } = await suggestionsQuery;
  const suggestionIds = (suggestionRows ?? []).map((row) => row.id);
  const { data: suggestionPosts } =
    suggestionIds.length > 0
      ? await supabase
          .from("posts")
          .select("author_id")
          .eq("hidden_by_reports", false)
          .in("author_id", suggestionIds)
          .limit(300)
      : { data: [] };
  const postCountByAuthor = new Map<string, number>();
  for (const post of suggestionPosts ?? []) {
    postCountByAuthor.set(
      post.author_id,
      (postCountByAuthor.get(post.author_id) ?? 0) + 1
    );
  }
  const suggestedPeople = ((suggestionRows ?? []) as SuggestedPersonRow[]).map(
    (person) => ({
      ...person,
      post_count: postCountByAuthor.get(person.id) ?? 0,
    })
  );

  const storyRows = (rawStories ?? []) as unknown as {
    id: string;
    author_id: string;
    created_at: string;
    author: {
      username: string;
      display_name: string | null;
      avatar_url: string | null;
    } | null;
  }[];
  const storyIds = storyRows.map((s) => s.id);
  const { data: views } =
    storyIds.length > 0
      ? await supabase
          .from("story_views")
          .select("story_id")
          .eq("viewer_id", user.id)
          .in("story_id", storyIds)
      : { data: [] };
  const viewed = new Set((views ?? []).map((v) => v.story_id));
  const storyMap = new Map<string, StoryRailItem>();

  for (const story of storyRows) {
    if (!story.author || blockedIds.includes(story.author_id)) continue;
    const prev = storyMap.get(story.author_id);
    if (!prev) {
      storyMap.set(story.author_id, {
        author_id: story.author_id,
        username: story.author.username,
        display_name: story.author.display_name,
        avatar_url: story.author.avatar_url,
        latest_at: story.created_at,
        story_count: 1,
        seen_count: viewed.has(story.id) ? 1 : 0,
      });
    } else {
      prev.story_count += 1;
      if (viewed.has(story.id)) prev.seen_count += 1;
    }
  }
  const storyItems = [...storyMap.values()].sort(
    (a, b) => new Date(b.latest_at).getTime() - new Date(a.latest_at).getTime()
  );

  let query = supabase
    .from("posts")
    .select(
      `id, author_id, image_url, caption, origin_type, origin_creator_username, origin_label, exif_data, hidden_by_reports, report_count, created_at,
       author:profiles!posts_author_id_fkey(username, display_name, avatar_url)`
    )
    .eq("hidden_by_reports", false)
    .order("created_at", { ascending: false })
    .limit(50);

  if (blockedIds.length > 0) {
    query = query.not("author_id", "in", `(${blockedIds.join(",")})`);
  }

  const { data: posts } = await query;
  const rows = (posts ?? []) as unknown as PostRow[];

  return (
    <div className="relative z-10 flex flex-col flex-1 w-full">
      <main className="max-w-xl mx-auto px-4 py-6 w-full">
        <StoryRail
          items={storyItems}
          currentUsername={me?.username ?? null}
        />
        <SuggestedPeopleRail people={suggestedPeople} />

        {rows.length === 0 ? (
          <div className="text-center py-24 max-w-md mx-auto">
            <div className="text-[10px] tracking-[0.4em] text-ink-faint uppercase mb-6">
              EMPTY
            </div>
            <h2 className="font-serif text-3xl md:text-4xl mb-4 leading-tight">
              아직 <em className="italic font-normal">아무도</em>
              <br />
              찍지 않았습니다
            </h2>
            <p className="text-sm text-ink-soft font-serif leading-relaxed mb-12">
              여기는 진짜 사람이 직접 찍은 것만 모이는 곳.
              <br />
              첫 사진을 남겨주세요.
            </p>
            <Link
              href="/create"
              className="group inline-flex items-center gap-3 px-7 py-3.5 bg-ink text-bg hover:bg-ink-soft transition-colors font-serif"
            >
              첫 글 쓰기
              <span className="transition-transform group-hover:translate-x-1">
                →
              </span>
            </Link>
            <div className="mt-16 grid grid-cols-3 gap-3 text-left">
              <Hint n="01" t="카메라" d="갤러리 X · 직촬만" />
              <Hint n="02" t="키스트로크" d="복붙 X · 한 글자씩" />
              <Hint n="03" t="원작" d="따라했다면 출처" />
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {rows.map((p) => (
              <PostCard key={p.id} post={p} currentUserId={user.id} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Hint({ n, t, d }: { n: string; t: string; d: string }) {
  return (
    <div className="border-t border-line pt-3">
      <div className="text-[10px] text-ink-faint tracking-widest mb-1">{n}</div>
      <div className="font-serif text-sm text-ink mb-0.5">{t}</div>
      <div className="text-[11px] text-ink-faint leading-snug">{d}</div>
    </div>
  );
}
