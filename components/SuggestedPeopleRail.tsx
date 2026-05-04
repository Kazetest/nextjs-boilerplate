import Link from "next/link";
import { Sparkles, UserPlus } from "lucide-react";
import { FollowButton } from "@/components/FollowButton";
import { HumanAvatar } from "@/components/HumanAvatar";

export type SuggestedPerson = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  post_count: number;
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
              href={`/profile/${person.username}`}
              className="flex min-w-0 items-center gap-3"
            >
              <HumanAvatar
                username={person.username}
                avatarUrl={person.avatar_url}
                size="md"
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
              <span className="inline-flex items-center gap-1 font-sans text-[11px] text-ink-faint">
                <UserPlus size={12} />
                추천
              </span>
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
