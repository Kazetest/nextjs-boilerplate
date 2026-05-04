"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import type { ComponentType } from "react";
import {
  Bell,
  Bookmark,
  Camera,
  Compass,
  Home,
  MessageCircle,
  PlusSquare,
  User,
} from "lucide-react";
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
            <NavLink href="/feed" label="피드" current={pathname} icon={Home} />
            <NavLink
              href="/explore"
              label="탐색"
              current={pathname}
              icon={Compass}
            />
            <NavLink
              href="/create"
              label="새 글"
              current={pathname}
              icon={PlusSquare}
            />
            <NavLink
              href="/stories/create"
              label="스토리"
              current={pathname}
              icon={Camera}
            />
            <NavLink
              href="/notifications"
              label="알림"
              current={pathname}
              badge={unreadNotif}
              icon={Bell}
            />
            <NavLink
              href="/chat"
              label="채팅"
              current={pathname}
              badge={unread}
              icon={MessageCircle}
            />
            <NavLink
              href="/saved"
              label="저장"
              current={pathname}
              icon={Bookmark}
            />
            <NavLink
              href="/profile/me"
              label="나"
              current={pathname}
              icon={User}
            />
          </nav>
        </div>
      </header>

      <nav className="sm:hidden fixed bottom-0 inset-x-0 z-30 bg-bg/95 backdrop-blur border-t border-line">
        <Link
          href="/stories/create"
          className={`absolute -top-12 right-4 inline-flex h-10 items-center gap-2 rounded-full border px-4 font-sans text-xs shadow-[0_12px_34px_rgba(26,26,26,0.12)] transition-colors ${
            pathname.startsWith("/stories")
              ? "border-ink bg-ink text-bg"
              : "border-line bg-bg-card text-ink hover:border-ink"
          }`}
        >
          <Camera size={15} />
          스토리
        </Link>
        <div className="max-w-xl mx-auto grid grid-cols-6 text-xs font-serif">
          <BottomTab href="/feed" label="피드" current={pathname} icon={Home} />
          <BottomTab
            href="/explore"
            label="탐색"
            current={pathname}
            icon={Compass}
          />
          <BottomTab
            href="/create"
            label="작성"
            current={pathname}
            icon={PlusSquare}
          />
          <BottomTab
            href="/notifications"
            label="알림"
            current={pathname}
            badge={unreadNotif}
            icon={Bell}
          />
          <BottomTab
            href="/chat"
            label="채팅"
            current={pathname}
            badge={unread}
            icon={MessageCircle}
          />
          <BottomTab
            href="/profile/me"
            label="나"
            current={pathname}
            icon={User}
          />
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
  icon: Icon,
}: {
  href: string;
  label: string;
  current: string;
  badge?: number;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}) {
  const active = current === href || current.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`relative inline-flex items-center gap-1.5 transition-colors ${
        active ? "text-ink" : "text-ink-soft hover:text-ink"
      }`}
    >
      <Icon size={16} strokeWidth={active ? 2.4 : 1.8} />
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
  icon: Icon,
}: {
  href: string;
  label: string;
  current: string;
  badge?: number;
  icon: ComponentType<{ size?: number; strokeWidth?: number }>;
}) {
  const active = current === href || current.startsWith(href + "/");
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center py-2 transition-colors relative ${
        active ? "text-ink" : "text-ink-soft hover:text-ink"
      }`}
    >
      <Icon size={21} strokeWidth={active ? 2.4 : 1.8} />
      <span className="mt-0.5 font-sans text-[10px]">{label}</span>
      {badge > 0 && (
        <span className="absolute top-1 right-1/4 min-w-[16px] h-4 px-1 rounded-full bg-ink text-bg text-[10px] flex items-center justify-center font-sans">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </Link>
  );
}
