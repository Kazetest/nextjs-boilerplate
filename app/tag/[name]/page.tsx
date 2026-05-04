import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Hash, HeartHandshake, MessageCircle } from "lucide-react";
import { PostCard, type PostRow } from "@/components/PostCard";

export const dynamic = "force-dynamic";

export default async function TagPage({
  params,
}: {
  params: Promise<{ name: string }>;
}) {
  const { name } = await params;
  const tag = decodeURIComponent(name).toLowerCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // caption에 #tag 포함된 게시물 (대소문자 구분 없이)
  const { data: posts } = await supabase
    .from("posts")
    .select(
      `id, image_url, caption, origin_type, origin_creator_username, origin_label, exif_data, created_at,
       author:profiles!posts_author_id_fkey(username, display_name, avatar_url)`
    )
    .ilike("caption", `%#${tag}%`)
    .eq("hidden_by_reports", false)
    .order("created_at", { ascending: false })
    .limit(50);

  const baseRows = (posts ?? []) as unknown as PostRow[];
  const postIds = baseRows.map((post) => post.id);
  const [{ data: reactionRows }, { data: commentRows }, { data: savedRows }] =
    postIds.length > 0
      ? await Promise.all([
          supabase.from("reactions").select("post_id, user_id").in("post_id", postIds),
          supabase.from("comments").select("post_id").in("post_id", postIds),
          supabase
            .from("saved_posts")
            .select("post_id")
            .eq("user_id", user.id)
            .in("post_id", postIds),
        ])
      : [{ data: [] }, { data: [] }, { data: [] }];
  const reactionCountByPost = new Map<string, number>();
  const commentCountByPost = new Map<string, number>();
  const reactedByMe = new Set<string>();
  const savedByMe = new Set((savedRows ?? []).map((row) => row.post_id));
  for (const reaction of reactionRows ?? []) {
    reactionCountByPost.set(
      reaction.post_id,
      (reactionCountByPost.get(reaction.post_id) ?? 0) + 1
    );
    if (reaction.user_id === user.id) reactedByMe.add(reaction.post_id);
  }
  for (const comment of commentRows ?? []) {
    commentCountByPost.set(
      comment.post_id,
      (commentCountByPost.get(comment.post_id) ?? 0) + 1
    );
  }
  const rows = baseRows.map((post) => ({
    ...post,
    reaction_count: reactionCountByPost.get(post.id) ?? 0,
    comment_count: commentCountByPost.get(post.id) ?? 0,
    reacted_by_me: reactedByMe.has(post.id),
    saved_by_me: savedByMe.has(post.id),
  }));
  const totalReactions = rows.reduce(
    (sum, post) => sum + (post.reaction_count ?? 0),
    0
  );
  const totalComments = rows.reduce(
    (sum, post) => sum + (post.comment_count ?? 0),
    0
  );

  return (
    <div className="relative z-10 flex flex-col flex-1 w-full">
      <header className="sticky top-0 z-20 bg-bg/80 backdrop-blur border-b border-line">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/feed" className="font-serif text-xl tracking-tight">
            NOai
          </Link>
          <span className="font-serif text-sm text-ink-soft">#{tag}</span>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-8 w-full">
        <h1 className="font-serif text-3xl mb-2">#{tag}</h1>
        <p className="text-sm text-ink-faint font-serif mb-8">
          {rows.length}개의 게시물
        </p>

        <section className="mb-8 grid grid-cols-3 border border-line bg-bg-card">
          <TagStat icon={<Hash size={15} />} label="게시물" value={rows.length} />
          <TagStat
            icon={<HeartHandshake size={15} />}
            label="묵례"
            value={totalReactions}
          />
          <TagStat
            icon={<MessageCircle size={15} />}
            label="댓글"
            value={totalComments}
          />
        </section>

        {rows.length === 0 ? (
          <div className="border border-line bg-bg-card px-6 py-16 text-center">
            <p className="font-serif text-xl text-ink">
              아직 #{tag} 태그가 없습니다
            </p>
            <p className="mt-2 font-serif text-sm text-ink-soft">
              직접 찍은 게시물에 이 태그를 처음 붙여보세요.
            </p>
            <Link
              href="/create"
              className="mt-6 inline-flex h-10 items-center bg-ink px-4 font-sans text-sm text-bg transition-colors hover:bg-ink-soft"
            >
              게시물 만들기
            </Link>
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

function TagStat({
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
