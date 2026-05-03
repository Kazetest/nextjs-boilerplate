"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export type OnboardingResult = { error?: string; ok?: boolean };

const RESERVED = new Set([
  "admin",
  "noai",
  "support",
  "help",
  "about",
  "api",
  "auth",
  "feed",
  "create",
  "post",
  "profile",
  "trend",
  "tag",
  "explore",
  "onboarding",
  "settings",
  "login",
  "logout",
  "signup",
  "me",
  "you",
  "system",
  "official",
]);

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

  const cleanUsername = username.toLowerCase().trim();

  if (cleanUsername.length < 3 || cleanUsername.length > 20)
    return { error: "아이디는 3~20자" };
  if (!/^[a-z0-9_]+$/.test(cleanUsername))
    return { error: "영문 소문자, 숫자, _ 만 가능" };
  if (cleanUsername.startsWith("user_"))
    return { error: "user_ 로 시작하는 아이디는 사용 불가" };
  if (RESERVED.has(cleanUsername))
    return { error: "예약된 아이디입니다" };

  // 중복 체크
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", cleanUsername)
    .maybeSingle();

  if (existing && existing.id !== user.id)
    return { error: "이미 사용 중인 아이디입니다" };

  const { error } = await supabase
    .from("profiles")
    .update({
      username: cleanUsername,
      display_name: displayName || null,
      bio: bio || null,
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  redirect("/feed");
}
