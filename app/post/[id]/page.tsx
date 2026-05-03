import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { PostCard, type PostRow } from "@/components/PostCard";
import { AuthenticityCard } from "@/components/AuthenticityCard";
import { KeystrokeReplay } from "@/components/KeystrokeReplay";
import { ReactionButton } from "@/components/ReactionButton";
import { CommentSection } from "@/components/CommentSection";
import type { KeystrokeRecord } from "@/lib/keystroke";

export const dynamic = "force-dynamic";

export default async function PostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: post } = await supabase
    .from("posts")
    .select(
      `id, author_id, image_url, caption, caption_keystrokes, exif_data, origin_type, origin_creator_username, origin_label, hidden_by_reports, report_count, created_at,
       author:profiles!posts_author_id_fkey(username, display_name)`
    )
    .eq("id", id)
    .maybeSingle();

  if (!post) notFound();

  const { count: reactionCount } = await supabase
    .from("reactions")
    .select("*", { count: "exact", head: true })
    .eq("post_id", id);

  const { data: myReaction } = await supabase
    .from("reactions")
    .select("user_id")
    .eq("user_id", user.id)
    .eq("post_id", id)
    .maybeSingle();

  const { data: comments } = await supabase
    .from("comments")
    .select(
      `id, body, created_at, author:profiles!comments_author_id_fkey(username)`
    )
    .eq("post_id", id)
    .order("created_at", { ascending: true });

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("username")
    .eq("id", user.id)
    .single();

  const keystrokes = post.caption_keystrokes as KeystrokeRecord | null;

  return (
    <div className="relative z-10 flex flex-col flex-1 w-full">
      <header className="sticky top-0 z-20 bg-bg/80 backdrop-blur border-b border-line">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
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

      <main className="max-w-xl mx-auto px-4 py-6 w-full space-y-8">
        <PostCard post={post as unknown as PostRow} currentUserId={user.id} />

        <div className="flex items-center gap-6 px-4">
          <ReactionButton
            postId={id}
            initialReacted={!!myReaction}
            initialCount={reactionCount ?? 0}
          />
          <span className="text-sm text-ink-faint font-serif">
            댓글 {comments?.length ?? 0}
          </span>
        </div>

        <AuthenticityCard post={post as unknown as PostRow} />

        {keystrokes && keystrokes.strokes && keystrokes.strokes.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-[10px] tracking-[0.3em] text-ink-faint uppercase font-serif">
              캡션 타이핑 재생
            </h3>
            <KeystrokeReplay
              record={keystrokes}
              finalText={post.caption}
            />
          </div>
        )}

        <CommentSection
          postId={id}
          comments={(comments ?? []) as unknown as {
            id: string;
            body: string;
            created_at: string;
            author: { username: string } | null;
          }[]}
          currentUsername={myProfile?.username ?? "me"}
        />
      </main>
    </div>
  );
}
