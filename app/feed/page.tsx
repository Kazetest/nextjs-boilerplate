import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { PostCard, type PostRow } from "@/components/PostCard";

export const dynamic = "force-dynamic";

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

  let query = supabase
    .from("posts")
    .select(
      `id, author_id, image_url, caption, origin_type, origin_creator_username, origin_label, exif_data, hidden_by_reports, report_count, created_at,
       author:profiles!posts_author_id_fkey(username, display_name)`
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
        {rows.length === 0 ? (
          <div className="text-center py-20 text-ink-soft">
            <p className="font-serif text-2xl mb-4">아직 아무것도 없습니다</p>
            <p className="text-sm font-serif">첫 게시물을 직접 찍어주세요.</p>
            <Link
              href="/create"
              className="inline-block mt-10 px-6 py-3 bg-ink text-bg hover:bg-ink-soft transition-colors font-serif"
            >
              첫 글 쓰기
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

