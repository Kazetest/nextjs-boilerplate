import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function ExplorePage() {
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

  // 최근 7일 게시물 중 묵례 많은 순
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  let query = supabase
    .from("posts")
    .select(
      `id, image_url, caption, exif_data, created_at,
       author:profiles!posts_author_id_fkey(username)`
    )
    .eq("hidden_by_reports", false)
    .gte("created_at", sevenDaysAgo.toISOString())
    .order("created_at", { ascending: false })
    .limit(60);

  if (blockedIds.length > 0) {
    query = query.not("author_id", "in", `(${blockedIds.join(",")})`);
  }

  const { data: posts } = await query;
  const rows = posts ?? [];

  return (
    <div className="relative z-10 flex flex-col flex-1 w-full">
      <Header />

      <main className="max-w-2xl mx-auto px-4 py-8 w-full">
        <div className="mb-8">
          <h1 className="font-serif text-3xl mb-2">탐색</h1>
          <p className="text-sm text-ink-faint font-serif">
            지난 7일간의 진짜 게시물
          </p>
        </div>

        {rows.length === 0 ? (
          <p className="text-center text-ink-faint font-serif py-12">
            아직 탐색할 게시물이 없습니다.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-1">
            {rows.map((p) => (
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
        )}
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
        <nav className="flex items-center gap-6 text-sm font-serif">
          <Link
            href="/feed"
            className="text-ink-soft hover:text-ink transition-colors"
          >
            피드
          </Link>
          <Link href="/explore" className="text-ink">
            탐색
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
