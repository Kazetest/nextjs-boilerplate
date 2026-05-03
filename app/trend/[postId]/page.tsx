import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PostCard, type PostRow } from "@/components/PostCard";

export const dynamic = "force-dynamic";

type RawPost = PostRow & { author_id: string; origin_post_id: string | null };

export default async function TrendPage({
  params,
}: {
  params: Promise<{ postId: string }>;
}) {
  const { postId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 1. 이 게시물 가져오기
  const { data: thisPost } = await supabase
    .from("posts")
    .select(
      `id, author_id, image_url, caption, origin_type, origin_post_id, origin_creator_username, origin_label, exif_data, hidden_by_reports, created_at,
       author:profiles!posts_author_id_fkey(username, display_name)`
    )
    .eq("id", postId)
    .maybeSingle();

  if (!thisPost) notFound();

  // 2. 진짜 origin은? (post.origin_post_id가 있으면 부모, 없으면 자기 자신)
  let originPost: RawPost = thisPost as unknown as RawPost;
  if (thisPost.origin_post_id) {
    const { data: parent } = await supabase
      .from("posts")
      .select(
        `id, author_id, image_url, caption, origin_type, origin_post_id, origin_creator_username, origin_label, exif_data, hidden_by_reports, created_at,
         author:profiles!posts_author_id_fkey(username, display_name)`
      )
      .eq("id", thisPost.origin_post_id)
      .maybeSingle();
    if (parent) originPost = parent as unknown as RawPost;
  }

  // 3. 이 origin을 따라한 모든 카피
  const { data: copies } = await supabase
    .from("posts")
    .select(
      `id, author_id, image_url, caption, origin_type, origin_post_id, origin_creator_username, origin_label, exif_data, hidden_by_reports, created_at,
       author:profiles!posts_author_id_fkey(username, display_name)`
    )
    .eq("origin_post_id", originPost.id)
    .eq("hidden_by_reports", false);

  const allPosts = [originPost, ...((copies as unknown as RawPost[]) ?? [])];
  const ids = allPosts.map((p) => p.id);

  // 4. 각 게시물의 묵례 카운트
  const reactionMap = new Map<string, number>();
  if (ids.length > 0) {
    const { data: reactions } = await supabase
      .from("reactions")
      .select("post_id")
      .in("post_id", ids);
    (reactions ?? []).forEach((r) => {
      reactionMap.set(r.post_id, (reactionMap.get(r.post_id) ?? 0) + 1);
    });
  }

  // 5. 랭킹 (묵례 desc)
  const ranking = allPosts
    .map((p) => ({ post: p, reactions: reactionMap.get(p.id) ?? 0 }))
    .sort((a, b) => b.reactions - a.reactions);

  const originRank = ranking.findIndex((r) => r.post.id === originPost.id) + 1;
  const overtaken = originRank > 1 && ranking.length > 1;
  const totalCopies = (copies ?? []).length;

  return (
    <div className="relative z-10 flex flex-col flex-1 w-full">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-8 w-full">
        <div className="text-center mb-10">
          <div className="text-[10px] tracking-[0.4em] text-ink-faint uppercase mb-3">
            ORIGIN TRACKING
          </div>
          <h1 className="font-serif text-3xl mb-2">원작 추적</h1>
          <p className="text-sm text-ink-soft font-serif">
            원작 1개 + 카피 {totalCopies}개
          </p>
        </div>

        {overtaken && (
          <div className="border border-warn bg-warn/5 px-4 py-4 mb-10 text-center">
            <p className="font-serif text-base text-ink mb-1">
              카피가 원작을 추월했습니다
            </p>
            <p className="text-xs text-ink-soft font-serif">
              현재 1위:{" "}
              <Link
                href={`/profile/${ranking[0].post.author?.username}`}
                className="underline underline-offset-2"
              >
                @{ranking[0].post.author?.username}
              </Link>
              {" · "}
              {ranking[0].reactions} 묵례
            </p>
          </div>
        )}

        {ranking.length === 1 && (
          <p className="text-center text-ink-faint font-serif py-6 text-sm">
            아직 이 게시물을 따라한 사람이 없습니다.
          </p>
        )}

        <div className="space-y-10">
          {ranking.map((r, i) => {
            const isOrigin = r.post.id === originPost.id;
            return (
              <div key={r.post.id} className="relative">
                <div className="flex items-center justify-between mb-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-serif tabular-nums text-ink">
                      #{i + 1}
                    </span>
                    {isOrigin && (
                      <span className="text-[10px] tracking-widest uppercase bg-ink text-bg px-2 py-0.5 font-serif">
                        원작
                      </span>
                    )}
                  </div>
                  <span className="text-sm font-serif text-ink-soft tabular-nums">
                    🙇 {r.reactions}
                  </span>
                </div>
                <PostCard
                  post={r.post as unknown as PostRow}
                  currentUserId={user.id}
                />
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-20 bg-bg/80 backdrop-blur border-b border-line">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
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
  );
}
