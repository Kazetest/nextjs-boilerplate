import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

type ProbeResult = {
  table: string;
  ok: boolean;
  detail: string;
};

async function probeTable(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: string
): Promise<ProbeResult> {
  const { error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (!error) return { table, ok: true, detail: "OK" };
  // PGRST205 = relation not found
  return {
    table,
    ok: false,
    detail: `${error.code ?? "?"} ${error.message}`.slice(0, 140),
  };
}

export default async function DebugPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const env = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    sightengineUser: !!process.env.SIGHTENGINE_API_USER,
  };

  let profile: {
    id: string;
    username: string;
    display_name: string | null;
    bio: string | null;
    created_at: string;
  } | null = null;
  if (user) {
    const { data } = await supabase
      .from("profiles")
      .select("id, username, display_name, bio, created_at")
      .eq("id", user.id)
      .maybeSingle();
    profile = data ?? null;
  }

  const probes = await Promise.all(
    [
      "profiles",
      "posts",
      "comments",
      "follows",
      "reactions",
      "reports",
      "blocks",
      "user_strikes",
      "messages",
      "notifications",
    ].map((t) => probeTable(supabase, t))
  );

  return (
    <main className="max-w-2xl mx-auto px-4 py-10 w-full relative z-10 space-y-10 font-serif">
      <div>
        <h1 className="text-3xl mb-2">진단</h1>
        <p className="text-sm text-ink-faint">
          페르소나 동선 막힘 시 이 페이지에서 어디서 끊겼는지 즉시 확인합니다.
        </p>
      </div>

      <Section title="1. 인증 상태 (P1 — 가입자 동선)">
        <Row k="user" v={user ? `${user.id.slice(0, 8)}… (${user.email ?? "no email"})` : "❌ 비로그인"} />
        <Row
          k="profile"
          v={
            profile
              ? `@${profile.username}${profile.username.startsWith("user_") ? " ⚠ 미설정" : " ✓"}`
              : user
              ? "❌ 없음 — handle_new_user trigger 미적용/실패. /onboarding 접근 시 self-heal"
              : "—"
          }
        />
        <Row
          k="다음 동선"
          v={
            !user ? (
              <Link href="/login" className="text-ink underline">
                /login →
              </Link>
            ) : !profile || profile.username.startsWith("user_") ? (
              <Link href="/onboarding" className="text-ink underline">
                /onboarding (username 미설정) →
              </Link>
            ) : (
              <Link href="/feed" className="text-ink underline">
                /feed (정상) →
              </Link>
            )
          }
        />
      </Section>

      <Section title="2. Supabase 환경 (모든 페르소나 공통)">
        <Row k="NEXT_PUBLIC_SUPABASE_URL" v={env.url ? new URL(env.url).host : "❌ 없음"} />
        <Row k="NEXT_PUBLIC_SUPABASE_ANON_KEY" v={env.hasAnon ? "✓" : "❌ 없음"} />
        <Row k="SIGHTENGINE_API_USER" v={env.sightengineUser ? "✓ (AI 이미지 검사 활성)" : "— (생략됨, AI 검사 스킵)"} />
      </Section>

      <Section title="3. 마이그레이션 적용 여부 (P2/P3/P4 동선)">
        {probes.map((p) => (
          <Row
            key={p.table}
            k={p.table}
            v={p.ok ? "✓" : `❌ ${p.detail}`}
            hint={tableHint(p.table)}
          />
        ))}
      </Section>

      <Section title="4. 페르소나 동선 빠른 점프">
        <ul className="space-y-2 text-sm">
          <li>
            <span className="text-ink-faint">P1 신규 →</span>{" "}
            <Link className="underline" href="/login">/login</Link> →{" "}
            <Link className="underline" href="/onboarding">/onboarding</Link> →{" "}
            <Link className="underline" href="/feed">/feed</Link>
          </li>
          <li>
            <span className="text-ink-faint">P2 창작 →</span>{" "}
            <Link className="underline" href="/create">/create</Link>
          </li>
          <li>
            <span className="text-ink-faint">P3 탐색 →</span>{" "}
            <Link className="underline" href="/explore">/explore</Link> ·{" "}
            <Link className="underline" href="/profile/me">/profile/me</Link>
          </li>
          <li>
            <span className="text-ink-faint">P4 소통 →</span>{" "}
            <Link className="underline" href="/chat">/chat</Link> ·{" "}
            <Link className="underline" href="/notifications">/notifications</Link>
          </li>
        </ul>
      </Section>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="text-xs tracking-[0.3em] text-ink-faint uppercase mb-3">{title}</h2>
      <div className="border border-line divide-y divide-line">{children}</div>
    </section>
  );
}

function Row({
  k,
  v,
  hint,
}: {
  k: string;
  v: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="px-3 py-2 grid grid-cols-[160px_1fr] gap-3 items-start">
      <span className="text-xs text-ink-faint pt-1">{k}</span>
      <div className="text-sm break-all">
        <div>{v}</div>
        {hint && <div className="text-[11px] text-ink-faint mt-1">{hint}</div>}
      </div>
    </div>
  );
}

function tableHint(t: string): string | undefined {
  switch (t) {
    case "profiles":
    case "posts":
    case "comments":
    case "follows":
    case "reactions":
      return "schema.sql";
    case "reports":
    case "blocks":
    case "user_strikes":
      return "002_moderation.sql";
    case "messages":
      return "003_messages.sql";
    case "notifications":
      return "004_notifications.sql";
  }
}
