import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Bookmark, Camera, HeartHandshake, MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

type SavedRow = {
  post_id: string;
  created_at: string;
};

type SavedPost = {
  id: string;
  image_url: string;
  caption: string;
  created_at: string;
  author: { username: string } | null;
  reaction_count?: number;
  comment_count?: number;
};

export default async function SavedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: saved, error } = await supabase
    .from("saved_posts")
    .select("post_id, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(120);

  const savedRows = (saved ?? []) as SavedRow[];
  const ids = savedRows.map((row) => row.post_id);
  const { data: posts } =
    ids.length > 0
      ? await supabase
          .from("posts")
          .select(
            `id, image_url, caption, created_at,
             author:profiles!posts_author_id_fkey(username)`
          )
          .in("id", ids)
          .eq("hidden_by_reports", false)
      : { data: [] };

  const postRows = (posts ?? []) as unknown as SavedPost[];
  const visibleIds = postRows.map((post) => post.id);
  const [{ data: reactionRows }, { data: commentRows }] =
    visibleIds.length > 0
      ? await Promise.all([
          supabase.from("reactions").select("post_id").in("post_id", visibleIds),
          supabase.from("comments").select("post_id").in("post_id", visibleIds),
        ])
      : [{ data: [] }, { data: [] }];
  const reactionCountByPost = new Map<string, number>();
  const commentCountByPost = new Map<string, number>();
  for (const reaction of reactionRows ?? []) {
    reactionCountByPost.set(
      reaction.post_id,
      (reactionCountByPost.get(reaction.post_id) ?? 0) + 1
    );
  }
  for (const comment of commentRows ?? []) {
    commentCountByPost.set(
      comment.post_id,
      (commentCountByPost.get(comment.post_id) ?? 0) + 1
    );
  }
  const decoratedPosts: SavedPost[] = postRows.map((post) => ({
    ...post,
    reaction_count: reactionCountByPost.get(post.id) ?? 0,
    comment_count: commentCountByPost.get(post.id) ?? 0,
  }));
  const byId = new Map(decoratedPosts.map((p) => [p.id, p]));
  const rows = savedRows
    .map((savedPost) => byId.get(savedPost.post_id))
    .filter((post): post is SavedPost => !!post);
  const totalReactions = rows.reduce(
    (sum, post) => sum + (post.reaction_count ?? 0),
    0
  );
  const totalComments = rows.reduce(
    (sum, post) => sum + (post.comment_count ?? 0),
    0
  );

  return (
    <main className="relative z-10 mx-auto w-full max-w-3xl px-4 py-7">
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="font-sans text-[10px] font-medium uppercase tracking-[0.28em] text-ink-faint">
            Private
          </p>
          <h1 className="font-serif text-3xl">저장됨</h1>
          <p className="mt-1 font-serif text-sm text-ink-faint">
            다시 보고 싶은 인간 게시물만 모아둡니다.
          </p>
        </div>
        <div className="grid h-11 w-11 place-items-center border border-line bg-bg-card text-ink-soft">
          <Bookmark size={19} />
        </div>
      </header>

      {error && (
        <div className="mb-4 border border-warn/40 bg-warn/5 px-4 py-3 font-serif text-sm text-warn">
          saved_posts 테이블이 필요합니다. _full_setup.sql 또는 008_saved_posts.sql을 적용해주세요.
        </div>
      )}

      <section className="mb-5 grid grid-cols-3 border border-line bg-bg-card">
        <SavedStat icon={<Bookmark size={15} />} label="저장" value={rows.length} />
        <SavedStat
          icon={<HeartHandshake size={15} />}
          label="묵례"
          value={totalReactions}
        />
        <SavedStat
          icon={<MessageCircle size={15} />}
          label="댓글"
          value={totalComments}
        />
      </section>

      {rows.length === 0 ? (
        <div className="border border-line bg-bg-card px-6 py-16 text-center">
          <div className="mx-auto mb-5 grid h-14 w-14 place-items-center border border-line bg-bg text-ink-soft">
            <Camera size={22} />
          </div>
          <p className="font-serif text-xl text-ink">아직 저장한 게시물이 없습니다</p>
          <p className="mt-2 font-serif text-sm text-ink-soft">
            마음에 남는 게시물 상세에서 저장을 눌러보세요.
          </p>
          <Link
            href="/explore"
            className="mt-6 inline-flex h-10 items-center bg-ink px-4 font-sans text-sm text-bg transition-colors hover:bg-ink-soft"
          >
            탐색하러 가기
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-1">
          {rows.map((post) => (
            <Link
              key={post.id}
              href={`/post/${post.id}`}
              className="group relative aspect-square overflow-hidden bg-bg-card transition-opacity hover:opacity-90"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={post.image_url}
                alt={post.caption.slice(0, 40)}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/65 to-transparent p-2 text-white opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                <p className="truncate font-sans text-[11px]">
                  @{post.author?.username ?? "unknown"}
                </p>
                <div className="mt-1 flex items-center gap-2 font-sans text-[11px] text-white/85">
                  <span className="inline-flex items-center gap-1">
                    <HeartHandshake size={12} />
                    {post.reaction_count ?? 0}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle size={12} />
                    {post.comment_count ?? 0}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}

function SavedStat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1 border-r border-line px-3 py-2 last:border-r-0">
      <span className="flex items-center gap-1 font-sans text-[11px] text-ink-faint">
        {icon}
        {label}
      </span>
      <span className="font-sans text-sm font-medium text-ink tabular-nums">
        {value}
      </span>
    </div>
  );
}
