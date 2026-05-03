"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const NAV_HIDDEN_PATHS = ["/login", "/onboarding", "/auth", "/legal"];

export function GlobalNav() {
  const pathname = usePathname() ?? "/";
  const [unread, setUnread] = useState(0);
  const [unreadNotif, setUnreadNotif] = useState(0);

  // Hide on landing/auth/onboarding regardless of session state
  const hidden =
    pathname === "/" ||
    NAV_HIDDEN_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (hidden) return;

    let cancelled = false;
    const supabase = createClient();

    async function load() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (cancelled || !user) return;

        const [{ count: msgCount }, { count: notifCount }] = await Promise.all([
          supabase
            .from("messages")
            .select("id", { count: "exact", head: true })
            .eq("recipient_id", user.id)
            .eq("read", false),
          supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("read", false),
        ]);
        if (cancelled) return;
        setUnread(msgCount ?? 0);
        setUnreadNotif(notifCount ?? 0);
      } catch {
        /* lock 충돌 등 — 뱃지 0으로 두고 nav는 그대로 표시 */
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [pathname, hidden]);

  if (hidden) return null;

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
              href="/notifications"
              label="알림"
              current={pathname}
              badge={unreadNotif}
            />
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
        <div className="max-w-xl mx-auto grid grid-cols-6 text-xs font-serif">
          <BottomTab href="/feed" label="피드" current={pathname} />
          <BottomTab href="/explore" label="탐색" current={pathname} />
          <BottomTab href="/create" label="＋" current={pathname} />
          <BottomTab
            href="/notifications"
            label="알림"
            current={pathname}
            badge={unreadNotif}
          />
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
