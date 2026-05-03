import Link from "next/link";

export type PostRow = {
  id: string;
  image_url: string;
  caption: string;
  origin_type: "original" | "inspired_by_user" | "overseas_meme";
  origin_creator_username: string | null;
  origin_label: string | null;
  created_at: string;
  author: {
    username: string;
    display_name: string | null;
  } | null;
};

export function PostCard({ post }: { post: PostRow }) {
  return (
    <article className="border border-line bg-bg-card overflow-hidden">
      {/* author */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-line">
        <Link
          href={`/profile/${post.author?.username ?? "unknown"}`}
          className="font-serif text-sm text-ink hover:underline underline-offset-4"
        >
          @{post.author?.username ?? "unknown"}
        </Link>
        <span className="text-xs text-ink-faint">
          {timeAgo(post.created_at)}
        </span>
      </header>

      {/* image */}
      <div className="relative aspect-[4/5] bg-bg">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={post.image_url}
          alt={post.caption.slice(0, 60)}
          className="w-full h-full object-cover"
        />
      </div>

      {/* caption + meta */}
      <div className="px-4 py-3 space-y-2">
        <p className="font-serif text-base leading-relaxed text-ink whitespace-pre-wrap">
          {post.caption}
        </p>
        <OriginBadge post={post} />
      </div>
    </article>
  );
}

function OriginBadge({ post }: { post: PostRow }) {
  if (post.origin_type === "original") {
    return (
      <div className="text-xs text-ink-faint font-serif">
        ✦ 오리지널
      </div>
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
