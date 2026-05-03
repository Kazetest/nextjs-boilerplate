import Link from "next/link";
import { tokenizeCaption } from "@/lib/hashtag";
import { PostMenu } from "@/components/PostMenu";

export type PostRow = {
  id: string;
  author_id?: string;
  image_url: string;
  caption: string;
  origin_type: "original" | "inspired_by_user" | "overseas_meme";
  origin_creator_username: string | null;
  origin_label: string | null;
  exif_data: Record<string, unknown> | null;
  hidden_by_reports?: boolean;
  report_count?: number;
  created_at: string;
  author: {
    username: string;
    display_name: string | null;
  } | null;
};

function isFreshlyCaptured(post: PostRow): boolean {
  const exif = post.exif_data as
    | { dateTimeOriginal?: string }
    | null
    | undefined;
  const dt = exif?.dateTimeOriginal;
  if (!dt) return false;
  const m = dt.match(
    /^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/
  );
  if (!m) return false;
  const [, y, mo, d, h, mi, s] = m;
  const captured = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s)
  ).getTime();
  const posted = new Date(post.created_at).getTime();
  return Math.abs(posted - captured) / 60000 <= 10;
}

export function PostCard({
  post,
  currentUserId,
}: {
  post: PostRow;
  currentUserId?: string;
}) {
  const fresh = isFreshlyCaptured(post);
  const isOwn = !!currentUserId && currentUserId === post.author_id;
  const flagged = !!post.hidden_by_reports;

  if (flagged && !isOwn) {
    return (
      <article className="border border-line bg-bg-card p-6 text-center text-ink-faint">
        <p className="font-serif text-sm">
          ⚠ 커뮤니티 신고로 검토 중인 게시물입니다.
        </p>
      </article>
    );
  }

  return (
    <article className="border border-line bg-bg-card overflow-hidden">
      <header className="px-4 py-3 flex items-center justify-between border-b border-line">
        <Link
          href={`/profile/${post.author?.username ?? "unknown"}`}
          className="font-serif text-sm text-ink hover:underline underline-offset-4"
        >
          @{post.author?.username ?? "unknown"}
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-ink-faint">
            {timeAgo(post.created_at)}
          </span>
          {post.author_id && (
            <PostMenu
              postId={post.id}
              authorId={post.author_id}
              authorUsername={post.author?.username ?? "unknown"}
              isOwn={isOwn}
            />
          )}
        </div>
      </header>

      <Link href={`/post/${post.id}`} className="block relative aspect-[4/5] bg-bg group">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.image_url}
          alt={post.caption.slice(0, 60)}
          className="w-full h-full object-cover group-hover:opacity-95 transition-opacity"
        />
        {fresh && (
          <div
            title="EXIF 촬영시각이 게시 시점과 일치 — 직촬 인증"
            className="absolute top-2 right-2 px-2 py-1 bg-bg/90 backdrop-blur text-xs font-serif text-ink border border-line"
          >
            ✓ 직촬
          </div>
        )}
        {flagged && isOwn && (
          <div className="absolute top-2 left-2 px-2 py-1 bg-warn/90 text-bg text-xs font-serif">
            검토 중
          </div>
        )}
      </Link>

      <div className="px-4 py-3 space-y-2">
        <p className="font-serif text-base leading-relaxed text-ink whitespace-pre-wrap">
          <CaptionWithTags text={post.caption} />
        </p>
        <OriginBadge post={post} />
      </div>
    </article>
  );
}

function CaptionWithTags({ text }: { text: string }) {
  const tokens = tokenizeCaption(text);
  return (
    <>
      {tokens.map((t, i) =>
        t.type === "text" ? (
          <span key={i}>{t.value}</span>
        ) : (
          <Link
            key={i}
            href={`/tag/${encodeURIComponent(t.tag.toLowerCase())}`}
            className="text-ink-soft hover:text-ink underline-offset-2 hover:underline"
          >
            #{t.tag}
          </Link>
        )
      )}
    </>
  );
}

function OriginBadge({ post }: { post: PostRow }) {
  if (post.origin_type === "original") {
    return (
      <div className="text-xs text-ink-faint font-serif">✦ 오리지널</div>
    );
  }
  if (post.origin_type === "inspired_by_user" && post.origin_creator_username) {
    return (
      <div className="text-xs font-serif text-ink-soft">
        ↗ 원작:{" "}
        <Link
          href={`/profile/${post.origin_creator_username}`}
          className="text-ink underline underline-offset-2"
        >
          @{post.origin_creator_username}
        </Link>
      </div>
    );
  }
  if (post.origin_type === "overseas_meme") {
    return (
      <div className="text-xs text-ink-soft font-serif">
        ↗ 해외 밈{post.origin_label ? ` · ${post.origin_label}` : ""}
      </div>
    );
  }
  return null;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}시간 전`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day}일 전`;
  return new Date(iso).toLocaleDateString("ko-KR");
}
