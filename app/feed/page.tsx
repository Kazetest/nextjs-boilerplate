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

  const { data: posts } = await supabase
    .from("posts")
    .select(
      `id, image_url, caption, origin_type, origin_creator_username, origin_label, created_at,
       author:profiles!posts_author_id_fkey(username, display_name)`
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const rows = (posts ?? []) as unknown as PostRow[];

  return (
    <div className="relative z-10 flex flex-col flex-1 w-full">
      <Header />
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
              <PostCard key={p.id} post={p} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-20 bg-bg/80 backdrop-blur border-b border-line">
      <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/feed" className="font-serif text-xl tracking-tight">
          NOai
        </Link>
        <nav className="flex items-center gap-6 text-sm font-serif">
          <Link href="/feed" className="text-ink">
            피드
          </Link>
          <Link
            href="/create"
            className="text-ink-soft hover:text-ink transition-colors"
          >
            + 새 글
          </Link>
          <Link
            href="/profile/me"
            className="text-ink-soft hover:text-ink transition-colors"
          >
            나
          </Link>
        </nav>
      </div>
    </header>
  );
}
