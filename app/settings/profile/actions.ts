"use server";

import { createClient } from "@/lib/supabase/server";
import { cleanUsername, validateUsername } from "@/lib/username";
import { revalidatePath } from "next/cache";

export type ProfileSaveResult = { error?: string; ok?: boolean; username?: string };

export async function saveProfile(formData: FormData): Promise<ProfileSaveResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다" };

  const username = cleanUsername((formData.get("username") as string) ?? "");
  const displayName = ((formData.get("displayName") as string) ?? "").trim();
  const bio = ((formData.get("bio") as string) ?? "").trim();
  const avatar = formData.get("avatar") as File | null;

  const usernameError = validateUsername(username);
  if (usernameError) return { error: usernameError };
  if (displayName.length > 30) return { error: "표시 이름은 30자 이하" };
  if (bio.length > 120) return { error: "소개는 120자 이하" };

  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existing && existing.id !== user.id) {
    return { error: "이미 사용 중인 아이디입니다" };
  }

  let avatarUrl: string | null | undefined;
  if (avatar && avatar.size > 0) {
    if (avatar.size > 3 * 1024 * 1024) {
      return { error: "프로필 사진은 3MB 이하로 올려주세요" };
    }
    if (!avatar.type.startsWith("image/")) {
      return { error: "이미지 파일만 업로드할 수 있어요" };
    }

    const ext = (avatar.name.split(".").pop() || "jpg").toLowerCase();
    const safeExt = ["jpg", "jpeg", "png", "webp", "heic"].includes(ext)
      ? ext
      : "jpg";
    const path = `${user.id}/${crypto.randomUUID()}.${safeExt}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(path, avatar, {
        contentType: avatar.type || `image/${safeExt}`,
        upsert: false,
      });

    if (uploadError) {
      const hint = /bucket/i.test(uploadError.message)
        ? " — Supabase에 'avatars' 버킷이 없습니다. _full_setup.sql 적용 필요."
        : "";
      return { error: `프로필 사진 업로드 실패: ${uploadError.message}${hint}` };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(path);
    avatarUrl = publicUrl;
  }

  const patch: Record<string, string | null> = {
    username,
    display_name: displayName || null,
    bio: bio || null,
  };
  if (avatarUrl !== undefined) patch.avatar_url = avatarUrl;

  const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/profile/me");
  revalidatePath(`/profile/${username}`);
  revalidatePath("/feed");
  return { ok: true, username };
}
