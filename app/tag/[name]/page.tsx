import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
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

  const rows = (posts ?? []) as unknown as PostRow[];

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

        {rows.length === 0 ? (
          <p className="text-center text-ink-soft font-serif py-12">
            아직 #{tag} 태그가 붙은 게시물이 없습니다.
          </p>
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
