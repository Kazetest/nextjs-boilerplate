import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { OnboardingClient } from "./OnboardingClient";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("id, username, display_name, bio")
    .eq("id", user.id)
    .maybeSingle();

  if (profileErr) {
    console.error("[NOai] onboarding profile fetch error:", profileErr);
  }

  // profile 없으면 trigger가 늦었거나 실패한 것 — 직접 생성
  let safeProfile = profile;
  if (!safeProfile) {
    const fallbackUsername = `user_${user.id.slice(0, 8)}`;
    const { data: created, error: createErr } = await supabase
      .from("profiles")
      .insert({ id: user.id, username: fallbackUsername })
      .select("id, username, display_name, bio")
      .single();
    if (createErr || !created) {
      console.error("[NOai] onboarding profile create failed:", createErr);
      redirect("/login?error=profile_create_failed");
    }
    safeProfile = created;
  }

  if (!safeProfile.username.startsWith("user_")) {
    redirect("/feed");
  }

  return (
    <div className="relative z-10 flex flex-col flex-1 w-full">
      <header className="sticky top-0 z-20 bg-bg/80 backdrop-blur border-b border-line">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/" className="font-serif text-xl tracking-tight">
            NOai
          </Link>
          <span className="text-xs text-ink-faint font-serif">환영합니다</span>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 py-12 w-full">
        <div className="text-center mb-10">
          <h1 className="font-serif text-3xl mb-3">사용할 이름을 정해주세요</h1>
          <p className="text-sm text-ink-soft font-serif">
            아이디는 한 번 정하면 추후 변경이 어렵습니다.
          </p>
        </div>

        <OnboardingClient
          currentUsername={safeProfile.username}
          email={user.email ?? ""}
        />
      </main>
    </div>
  );
}
