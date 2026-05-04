"use server";

import { createClient } from "@/lib/supabase/server";
import { cleanUsername, validateUsername } from "@/lib/username";
import { redirect } from "next/navigation";

export type OnboardingResult = { error?: string; ok?: boolean };

export async function saveOnboarding({
  username,
  displayName,
  bio,
}: {
  username: string;
  displayName: string;
  bio: string;
}): Promise<OnboardingResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const clean = cleanUsername(username);
  const usernameError = validateUsername(clean);
  if (usernameError) return { error: usernameError };

  // 중복 체크
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", clean)
    .maybeSingle();

  if (existing && existing.id !== user.id)
    return { error: "이미 사용 중인 아이디입니다" };

  const { error } = await supabase
    .from("profiles")
    .update({
      username: clean,
      display_name: displayName || null,
      bio: bio || null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  redirect("/feed");
}
