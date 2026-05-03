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

