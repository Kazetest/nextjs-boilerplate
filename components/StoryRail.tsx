import Link from "next/link";
import { Plus } from "lucide-react";
import { HumanAvatar } from "@/components/HumanAvatar";

export type StoryRailItem = {
  author_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  latest_at: string;
  story_count: number;
  seen_count: number;
};

export function StoryRail({
  items,
  currentUsername,
}: {
  items: StoryRailItem[];
  currentUsername: string | null;
}) {
  return (
    <section className="mb-6 border-b border-line pb-4">
      <div className="flex gap-4 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <Link
          href="/stories/create"
          className="group flex w-16 shrink-0 flex-col items-center gap-2"
          aria-label="스토리 만들기"
        >
          <span className="relative">
            <HumanAvatar username={currentUsername ?? "me"} size="lg" />
            <span className="absolute -bottom-0.5 -right-0.5 grid h-6 w-6 place-items-center rounded-full border-2 border-bg bg-ink text-bg transition-transform group-hover:scale-105">
              <Plus size={14} />
            </span>
          </span>
          <span className="max-w-full truncate font-sans text-[11px] text-ink-soft">
            내 스토리
          </span>
        </Link>

        {items.map((item) => {
          const seen = item.seen_count >= item.story_count;
          return (
            <Link
              key={item.author_id}
              href={`/story/${item.username}`}
              className="flex w-16 shrink-0 flex-col items-center gap-2"
            >
              <HumanAvatar
                username={item.username}
                avatarUrl={item.avatar_url}
                size="lg"
                ring
                seen={seen}
              />
              <span className="max-w-full truncate font-sans text-[11px] text-ink-soft">
                {item.username}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
