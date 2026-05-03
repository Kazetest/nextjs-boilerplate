import { createClient } from "@/lib/supabase/server";
import Link from "next/link";

export const dynamic = "force-dynamic";

type SupaClient = Awaited<ReturnType<typeof createClient>>;

type ProbeResult = {
  table: string;
  ok: boolean;
  detail: string;
};

type PublishStep = {
  stage: string;
  ok: boolean;
  detail: string;
  hint?: string;
};

async function probeTable(
  supabase: SupaClient,
  table: string
): Promise<ProbeResult> {
  const { error } = await supabase.from(table).select("*", { count: "exact", head: true });
  if (!error) return { table, ok: true, detail: "OK" };
  return {
    table,
    ok: false,
    detail: `${error.code ?? "?"} ${error.message}`.slice(0, 140),
  };
}

async function simulatePublish(
  supabase: SupaClient,
  userId: string
): Promise<PublishStep[]> {
  const results: PublishStep[] = [];

  // 1. storage 'posts' bucket 존재 + listable
  try {
    const { data: list, error: listErr } = await supabase.storage
      .from("posts")
      .list(userId, { limit: 1 });
    if (listErr) {
      results.push({
        stage: "storage 'posts' bucket",
        ok: false,
        detail: listErr.message,
        hint: "supabase/_full_setup.sql 미적용 또는 bucket 수동 삭제됨",
      });
    } else {
      results.push({
        stage: "storage 'posts' bucket",
        ok: true,
        detail: `${list?.length ?? 0}개 객체 (자기 폴더)`,
      });
    }
  } catch (e) {
    results.push({
      stage: "storage 'posts' bucket",
      ok: false,
      detail: e instanceof Error ? e.message : "unknown",
    });
  }

  // 2. upload 권한 — 1바이트 텍스트 → 즉시 삭제
  const probePath = `${userId}/__probe-${Date.now()}.txt`;
  try {
    const blob = new Blob(["x"], { type: "text/plain" });
    const { error: upErr } = await supabase.storage
      .from("posts")
      .upload(probePath, blob, { contentType: "text/plain", upsert: false });
    if (upErr) {
      results.push({
        stage: "storage upload (probe)",
        ok: false,
        detail: upErr.message,
        hint: "RLS 'posts storage upload' 정책 또는 bucket 권한 확인",
      });
    } else {
      results.push({
        stage: "storage upload (probe)",
        ok: true,
        detail: "OK (즉시 삭제됨)",
      });
      await supabase.storage.from("posts").remove([probePath]);
    }
  } catch (e) {
    results.push({
      stage: "storage upload (probe)",
      ok: false,
      detail: e instanceof Error ? e.message : "unknown",
    });
  }

  // 3. posts insert 권한 — dummy → 즉시 삭제
  try {
    const { data: dummy, error: insErr } = await supabase
      .from("posts")
      .insert({
        author_id: userId,
        image_url: "https://probe.invalid/x.jpg",
        image_path: "__probe__",
        caption: "__publish_probe__",
        origin_type: "original",
      })
      .select("id")
      .single();
    if (insErr) {
      const m = insErr.message;
      let hint: string | undefined;
      if (/profiles/i.test(m)) hint = "profile row 없음 — /onboarding 먼저";
      else if (/hidden_by_reports|report_count/i.test(m))
        hint = "002_moderation 컬럼 누락 — _full_setup.sql 재실행";
      else if (/violates row-level security/i.test(m))
        hint = "posts insert RLS 거부 — auth.uid()와 author_id 불일치";
      results.push({
        stage: "posts insert (probe)",
        ok: false,
        detail: m,
        hint,
      });
    } else if (dummy) {
      results.push({
        stage: "posts insert (probe)",
        ok: true,
        detail: `OK id=${dummy.id.slice(0, 8)}… (즉시 삭제됨)`,
      });
      await supabase.from("posts").delete().eq("id", dummy.id);
    }
  } catch (e) {
    results.push({
      stage: "posts insert (probe)",
      ok: false,
      detail: e instanceof Error ? e.message : "unknown",
    });
  }

  // 4. SightEngine ping (활성이면 실제 호출, 응답 시간 측정 — stuck 원인 후보 검증)
  const seUser = process.env.SIGHTENGINE_API_USER;
  const seSecret = process.env.SIGHTENGINE_API_SECRET;
  if (!seUser || !seSecret) {
    results.push({
      stage: "SightEngine env",
      ok: true,
      detail: "비활성 — AI 이미지 검사 스킵 (이게 stuck 원인은 아님)",
    });
  } else {
    const t0 = Date.now();
    try {
      // 1x1 PNG (66바이트 base64) — 실제 호출로 응답 시간 측정
      const tinyPng = Uint8Array.from(
        atob(
          "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
        ),
        (c) => c.charCodeAt(0)
      );
      const fd = new FormData();
      fd.append("media", new Blob([tinyPng], { type: "image/png" }), "p.png");
      fd.append("models", "genai");
      fd.append("api_user", seUser);
      fd.append("api_secret", seSecret);
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch("https://api.sightengine.com/1.0/check.json", {
        method: "POST",
        body: fd,
        signal: ctrl.signal,
      }).finally(() => clearTimeout(timer));
      const ms = Date.now() - t0;
      if (!res.ok) {
        results.push({
          stage: "SightEngine ping",
          ok: false,
          detail: `${res.status} ${res.statusText} (${ms}ms)`,
          hint: "API 키 무효 또는 quota 초과. createPost는 timeout 후 silent skip하므로 stuck 원인은 아님",
        });
      } else {
        results.push({
          stage: "SightEngine ping",
          ok: true,
          detail: `${ms}ms — Vercel Hobby 10s면 upload+insert와 합산 ${ms > 4000 ? "risk" : "OK"}`,
        });
      }
    } catch (e) {
      const ms = Date.now() - t0;
      const msg = e instanceof Error ? e.message : "unknown";
      results.push({
        stage: "SightEngine ping",
        ok: false,
        detail: `${msg} (${ms}ms)`,
        hint:
          ms >= 7900
            ? "8s timeout — SightEngine이 hang. 비활성 권장 (env 제거 또는 키 교체)"
            : "외부 API 도달 실패",
      });
    }
  }

  return results;
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

  const publishSim = user ? await simulatePublish(supabase, user.id) : null;

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

      <Section title="4. P2 게시 동선 시뮬레이션 (storage upload + posts insert dry-run)">
        {!publishSim ? (
          <Row k="—" v="로그인 후 표시됩니다" />
        ) : (
          publishSim.map((p) => (
            <Row
              key={p.stage}
              k={p.stage}
              v={p.ok ? `✓ ${p.detail}` : `❌ ${p.detail}`}
              hint={p.hint}
            />
          ))
        )}
      </Section>

      <Section title="5. 페르소나 동선 빠른 점프">
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
