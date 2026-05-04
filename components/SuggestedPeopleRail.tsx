import Link from "next/link";
import {
  GalleryVerticalEnd,
  MessageCircle,
  Sparkles,
  UserRound,
} from "lucide-react";
import { FollowButton } from "@/components/FollowButton";
import { HumanAvatar } from "@/components/HumanAvatar";

export type SuggestedPerson = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  post_count: number;
  has_story?: boolean;
};

export function SuggestedPeopleRail({ people }: { people: SuggestedPerson[] }) {
  if (people.length === 0) return null;

  return (
    <section className="mb-8 border-y border-line py-4">
      <div className="mb-3 flex items-center justify-between gap-4 px-1">
        <div>
          <p className="flex items-center gap-1 font-sans text-[10px] font-medium uppercase tracking-[0.24em] text-ink-faint">
            <Sparkles size={12} />
            Discover
          </p>
          <h2 className="mt-1 font-serif text-lg text-ink">
            새로 이어질 사람
          </h2>
        </div>
        <Link
          href="/explore"
          className="font-sans text-xs text-ink-soft transition-colors hover:text-ink"
        >
          더 보기
        </Link>
      </div>

      <div className="flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {people.map((person) => (
          <article
            key={person.id}
            className="w-44 shrink-0 border border-line bg-bg-card p-3"
          >
            <Link
              href={person.has_story ? `/story/${person.username}` : `/profile/${person.username}`}
              className="flex min-w-0 items-center gap-3"
              aria-label={person.has_story ? `@${person.username} 스토리 보기` : `@${person.username} 프로필 보기`}
            >
              <HumanAvatar
                username={person.username}
                avatarUrl={person.avatar_url}
                size="md"
                ring={person.has_story}
              />
              <span className="min-w-0">
                <span className="block truncate font-sans text-sm font-medium text-ink">
                  @{person.username}
                </span>
                <span className="block truncate font-serif text-xs text-ink-faint">
                  {person.display_name || `${person.post_count} posts`}
                </span>
              </span>
            </Link>

            <p className="mt-3 line-clamp-2 min-h-[2.5rem] font-serif text-xs leading-relaxed text-ink-soft">
              {person.bio || "직접 찍고 직접 쓰는 NOai 계정입니다."}
            </p>

            <div className="mt-3 grid grid-cols-[1fr_auto] items-center gap-2">
              <div className="flex min-w-0 items-center gap-1">
                <MiniLink
                  href={`/profile/${person.username}`}
                  label="프로필"
                  icon={<UserRound size={13} />}
                />
                <MiniLink
                  href={`/chat/${person.username}`}
                  label="DM"
                  icon={<MessageCircle size={13} />}
                />
                {person.has_story && (
                  <MiniLink
                    href={`/story/${person.username}`}
                    label="스토리"
                    icon={<GalleryVerticalEnd size={13} />}
                    strong
                  />
                )}
              </div>
              <FollowButton
                targetId={person.id}
                initialFollowing={false}
                compact
              />
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function MiniLink({
  href,
  icon,
  label,
  strong = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  strong?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-label={label}
      className={`grid h-8 w-8 place-items-center border transition-colors ${
        strong
          ? "border-ink bg-ink text-bg hover:bg-ink-soft"
          : "border-line bg-bg text-ink-soft hover:border-ink hover:text-ink"
      }`}
      title={label}
    >
      {icon}
    </Link>
  );
}
