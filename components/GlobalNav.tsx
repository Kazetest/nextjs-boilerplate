"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const NAV_HIDDEN_PATHS = ["/login", "/onboarding", "/auth", "/legal"];

export function GlobalNav() {
  const pathname = usePathname() ?? "/";
  const [unread, setUnread] = useState(0);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    let cancelled = false;

    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      if (!user) {
        setAuthed(false);
        return;
      }
      setAuthed(true);
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("recipient_id", user.id)
        .eq("read", false);
      if (!cancelled) setUnread(count ?? 0);
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange(() => load());

    return () => {
      cancelled = true;
      sub?.subscription.unsubscribe();
    };
  }, [pathname]);

  if (
    !authed ||
    pathname === "/" ||
    NAV_HIDDEN_PATHS.some((p) => pathname.startsWith(p))
  ) {
    return null;
  }

  return (
    <>
      <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur border-b border-line">
        <div className="max-w-xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/feed" className="font-serif text-xl tracking-tight">
            NOai
          </Link>
          <nav className="hidden sm:flex items-center gap-5 text-sm font-serif">
            <NavLink href="/feed" label="피드" current={pathname} />
            <NavLink href="/explore" label="탐색" current={pathname} />
            <NavLink href="/create" label="+ 새 글" current={pathname} />
            <NavLink
              href="/chat"
              label="채팅"
              current={pathname}
              badge={unread}
            />
            <NavLink href="/profile/me" label="나" current={pathname} />
          </nav>
        </div>
      </header>

      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-bg/95 backdrop-blur border-t border-line">
        <div className="max-w-xl mx-auto grid grid-cols-5 text-xs font-serif">
          <BottomTab href="/feed" label="피드" current={pathname} />
          <BottomTab href="/explore" label="탐색" current={pathname} />
          <BottomTab href="/create" label="＋" current={pathname} />
          <BottomTab
            href="/chat"
            label="채팅"
            current={pathname}
            badge={unread}
          />
          <BottomTab href="/profile/me" label="나" current={pathname} />
        </div>
      </nav>
    </>
  );
}

function NavLink({
  href,
  label,
  current,
  badge = 0,
}: {
  href: string;
  label: string;
  current: string;
  badge?: number;
}) {
  const active = current === href || current.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`relative transition-colors ${
        active ? "text-ink" : "text-ink-soft hover:text-ink"
      }`}
    >
      {label}
      {badge > 0 && (
        <span className="absolute -top-2 -right-3 min-w-[16px] h-4 px-1 rounded-full bg-ink text-bg text-[10px] flex items-center justify-center font-sans">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}

function BottomTab({
  href,
  label,
  current,
  badge = 0,
}: {
  href: string;
  label: string;
  current: string;
  badge?: number;
}) {
  const active = current === href || current.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center py-2 transition-colors relative ${
        active ? "text-ink" : "text-ink-soft hover:text-ink"
      }`}
    >
      <span>{label}</span>
      {badge > 0 && (
        <span className="absolute top-1 right-1/4 min-w-[16px] h-4 px-1 rounded-full bg-ink text-bg text-[10px] flex items-center justify-center font-sans">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}
