import { createClient } from "@/lib/supabase/server";
import Link from "next/link";
import { ProbeRunner } from "./ProbeRunner";

export const dynamic = "force-dynamic";

type SupaClient = Awaited<ReturnType<typeof createClient>>;

type ProbeRow = { table: string; ok: boolean; detail: string };

async function probeTable(supabase: SupaClient, table: string): Promise<ProbeRow> {
  const { error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (!error) return { table, ok: true, detail: "OK" };
  return { table, ok: false, detail: `${error.code ?? "?"} ${error.message}`.slice(0, 140) };
}

export default async function DebugPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const env = {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    hasAnon: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    sightengineActive:
      !!process.env.SIGHTENGINE_API_USER && !!process.env.SIGHTENGINE_API_SECRET,
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
      "stories",
      "story_views",
      "saved_posts",
    ].map((t) => probeTable(supabase, t))
  );

  const tablesAllOk = probes.every((p) => p.ok);
  const authOk = !!user;
  const profileOk = !!profile && !profile.username.startsWith("user_");

  return (
    <main className="max-w-3xl mx-auto px-4 py-12 w-full relative z-10 space-y-12 font-serif">
      {/* Header */}
      <div>
        <div className="text-[10px] tracking-[0.4em] text-ink-faint uppercase mb-2">
          DIAGNOSTICS
        </div>
        <h1 className="text-4xl mb-3">진단</h1>
        <p className="text-sm text-ink-faint leading-relaxed max-w-xl">
          페르소나 동선이 막힐 때 어디서 끊겼는지 한 화면에서 확인합니다.
        </p>
      </div>

      {/* Status snapshot */}
      <div className="grid grid-cols-3 gap-2">
        <StatusPill label="인증" ok={authOk} hint={user ? "로그인됨" : "비로그인"} />
        <StatusPill
          label="프로필"
          ok={profileOk}
          hint={
            profile
              ? profile.username.startsWith("user_")
                ? "username 미설정"
                : `@${profile.username}`
              : "없음"
          }
        />
        <StatusPill
          label="DB 테이블"
          ok={tablesAllOk}
          hint={`${probes.filter((p) => p.ok).length}/${probes.length}`}
        />
      </div>

      {/* P1 — 인증 */}
      <Section
        n="01"
        title="가입자 동선"
        subtitle="user / profile / 다음 단계"
      >
        <KV k="user" v={user ? `${user.email ?? user.id.slice(0, 8) + "…"}` : "❌ 비로그인"} />
        <KV
          k="profile"
          v={
            profile
              ? `@${profile.username}${profile.username.startsWith("user_") ? "  (미설정)" : ""}`
              : user
              ? "❌ 없음 — /onboarding 접근 시 self-heal"
              : "—"
          }
        />
        <KV
          k="다음 동선"
          v={
            !user ? (
              <Link href="/login" className="text-ink underline">
                /login →
              </Link>
            ) : !profile || profile.username.startsWith("user_") ? (
              <Link href="/onboarding" className="text-ink underline">
                /onboarding →
              </Link>
            ) : (
              <Link href="/feed" className="text-ink underline">
                /feed →
              </Link>
            )
          }
        />
      </Section>

      {/* Env */}
      <Section n="02" title="환경" subtitle="Supabase / SightEngine">
        <KV
          k="SUPABASE_URL"
          v={env.url ? new URL(env.url).host : "❌ 없음"}
          ok={!!env.url}
        />
        <KV
          k="ANON_KEY"
          v={env.hasAnon ? "✓ 주입됨" : "❌ 없음"}
          ok={env.hasAnon}
        />
        <KV
          k="SightEngine"
          v={env.sightengineActive ? "활성 (AI 검사 ON)" : "비활성 (검사 스킵)"}
          ok={true}
        />
      </Section>

      {/* DB 적용 여부 */}
      <Section n="03" title="DB 마이그레이션" subtitle="P2/P3/P4 의존">
        <div className="grid grid-cols-2 gap-x-3">
          {probes.map((p) => (
            <KV
              key={p.table}
              k={p.table}
              v={p.ok ? "✓" : "❌ " + p.detail.slice(0, 60)}
              ok={p.ok}
              dense
            />
          ))}
        </div>
        {!tablesAllOk && (
          <div className="mt-3 px-3 py-2 border border-warn/30 bg-warn/5 text-warn text-xs font-serif">
            ❌ 있는 테이블 →{" "}
            <a
              href="https://github.com/Kazetest/nextjs-boilerplate/blob/main/supabase/_full_setup.sql"
              target="_blank"
              rel="noreferrer"
              className="underline"
            >
              _full_setup.sql
            </a>
            을 Supabase SQL Editor에 한 번 붙여넣고 Run하세요.
          </div>
        )}
      </Section>

      {/* P2 — Live Probe */}
      <Section
        n="04"
        title="P2 게시 동선 라이브 시뮬"
        subtitle="storage upload + posts insert + SightEngine ping (실측 ms)"
      >
        {!user ? (
          <p className="text-sm text-ink-faint font-serif">
            로그인 후 실행 가능합니다.
          </p>
        ) : (
          <ProbeRunner />
        )}
      </Section>

      {/* Quick jump */}
      <Section n="05" title="페르소나 빠른 점프">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <JumpLink p="P1" label="가입" href="/login" />
          <JumpLink p="P1" label="아이디 설정" href="/onboarding" />
          <JumpLink p="P2" label="새 글 쓰기" href="/create" />
          <JumpLink p="P3" label="피드" href="/feed" />
          <JumpLink p="P3" label="탐색" href="/explore" />
          <JumpLink p="P3" label="내 프로필" href="/profile/me" />
          <JumpLink p="P4" label="채팅" href="/chat" />
          <JumpLink p="P4" label="알림" href="/notifications" />
        </div>
      </Section>
    </main>
  );
}

function StatusPill({
  label,
  ok,
  hint,
}: {
  label: string;
  ok: boolean;
  hint: string;
}) {
  return (
    <div
      className={`px-3 py-3 border text-center ${
        ok ? "border-emerald-500/30 bg-emerald-500/5" : "border-warn/40 bg-warn/5"
      }`}
    >
      <div className={`text-2xl mb-0.5 ${ok ? "text-emerald-400" : "text-warn"}`}>
        {ok ? "✓" : "✕"}
      </div>
      <div className="text-[10px] tracking-[0.3em] text-ink-faint uppercase">
        {label}
      </div>
      <div className="text-xs text-ink-soft mt-1 truncate font-serif">{hint}</div>
    </div>
  );
}

function Section({
  n,
  title,
  subtitle,
  children,
}: {
  n: string;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-line pt-6">
      <div className="mb-4">
        <div className="text-[10px] tracking-[0.3em] text-ink-faint mb-1">
          {n}
        </div>
        <h2 className="text-2xl">{title}</h2>
        {subtitle && (
          <p className="text-xs text-ink-faint mt-1 font-serif">{subtitle}</p>
        )}
      </div>
      <div>{children}</div>
    </section>
  );
}

function KV({
  k,
  v,
  ok,
  dense,
}: {
  k: string;
  v: React.ReactNode;
  ok?: boolean;
  dense?: boolean;
}) {
  return (
    <div
      className={`grid grid-cols-[140px_1fr] items-baseline gap-3 ${
        dense ? "py-1" : "py-2"
      } border-b border-line/40 last:border-0`}
    >
      <span className="text-xs text-ink-faint truncate">{k}</span>
      <span
        className={`text-sm break-all ${
          ok === false ? "text-warn" : ok === true ? "text-emerald-400" : "text-ink"
        }`}
      >
        {v}
      </span>
    </div>
  );
}

function JumpLink({
  p,
  label,
  href,
}: {
  p: string;
  label: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="border border-line px-3 py-2 hover:border-ink transition-colors flex items-center justify-between group"
    >
      <span className="text-sm font-serif">{label}</span>
      <span className="flex items-center gap-2">
        <span className="text-[10px] tracking-widest text-ink-faint">{p}</span>
        <span className="text-ink-faint group-hover:text-ink transition-colors">
          →
        </span>
      </span>
    </Link>
  );
}
