import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Bookmark, Camera } from "lucide-react";

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

  const byId = new Map(((posts ?? []) as unknown as SavedPost[]).map((p) => [p.id, p]));
  const rows = savedRows
    .map((savedPost) => byId.get(savedPost.post_id))
    .filter((post): post is SavedPost => !!post);

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
              <div className="absolute inset-x-0 bottom-0 hidden bg-gradient-to-t from-black/55 to-transparent p-2 text-white group-hover:block">
                <p className="truncate font-sans text-[11px]">
                  @{post.author?.username ?? "unknown"}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
