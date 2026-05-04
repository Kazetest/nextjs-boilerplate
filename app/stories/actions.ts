"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type StoryResult = { error?: string; storyId?: string };

export async function createStory(formData: FormData): Promise<StoryResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다" };

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    const hint = /schema cache|relation|profiles/i.test(profileError.message)
      ? " — profiles 테이블 확인 필요. supabase/_full_setup.sql 적용 필요."
      : "";
    return { error: `프로필 확인 실패: ${profileError.message}${hint}` };
  }

  if (!profile) {
    const fallbackUsername = `user_${user.id.slice(0, 8)}`;
    const { error: createProfileError } = await supabase
      .from("profiles")
      .insert({ id: user.id, username: fallbackUsername });

    if (createProfileError) {
      const hint = /row-level security|violates/i.test(createProfileError.message)
        ? " — profiles RLS 정책 확인 필요. supabase/_full_setup.sql 적용 필요."
        : "";
      return {
        error: `프로필 자동 생성 실패: ${createProfileError.message}${hint}`,
      };
    }
  }

  const image = formData.get("image") as File | null;
  const caption = ((formData.get("caption") as string) ?? "").trim();
  const keystrokesRaw = (formData.get("keystrokes") as string) ?? "";
  const exifRaw = (formData.get("exif") as string) ?? "{}";

  if (!image || image.size === 0) return { error: "사진이 필요합니다" };
  if (image.size > 8 * 1024 * 1024)
    return { error: "스토리는 8MB 이하 이미지만 올릴 수 있어요" };
  if (caption.length > 180) return { error: "스토리는 180자 이하" };

  let keystrokes = null;
  if (caption) {
    try {
      keystrokes = JSON.parse(keystrokesRaw);
      if (!keystrokes?.strokes || !Array.isArray(keystrokes.strokes)) {
        return { error: "타이핑 데이터가 없습니다" };
      }
      if (keystrokes.strokes.length < Math.max(1, Math.ceil(caption.length * 0.2))) {
        return { error: "타이핑 흔적이 부족합니다" };
      }
      if (caption.length >= 20 && keystrokes.durationMs < caption.length * 8) {
        return { error: "타이핑이 너무 빠릅니다" };
      }
    } catch {
      return { error: "키스트로크 데이터 오류" };
    }

    const { detectAiHashtags } = await import("@/lib/hashtag");
    const aiTags = detectAiHashtags(caption);
    if (aiTags.length > 0) {
      return {
        error: `AI 관련 해시태그가 감지됐습니다 (#${aiTags.join(", #")}).`,
      };
    }
  }

  let exifData;
  try {
    exifData = JSON.parse(exifRaw);
  } catch {
    exifData = {};
  }

  const ext = (image.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ["jpg", "jpeg", "png", "webp", "heic"].includes(ext)
    ? ext
    : "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${safeExt}`;

  const { error: uploadError } = await supabase.storage
    .from("stories")
    .upload(path, image, {
      contentType: image.type || `image/${safeExt}`,
      upsert: false,
    });

  if (uploadError) {
    const hint = /bucket/i.test(uploadError.message)
      ? " — Supabase에 'stories' 버킷이 없습니다. supabase/_full_setup.sql 적용 필요."
      : /row-level security|violates/i.test(uploadError.message)
      ? " — stories storage RLS 정책이 없습니다. supabase/_full_setup.sql 적용 필요."
      : "";
    return { error: `업로드 실패: ${uploadError.message}${hint}` };
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("stories").getPublicUrl(path);

  const { data: inserted, error: insertError } = await supabase
    .from("stories")
    .insert({
      author_id: user.id,
      image_url: publicUrl,
      image_path: path,
      caption: caption || null,
      caption_keystrokes: keystrokes,
      exif_data: exifData,
    })
    .select("id")
    .single();

  if (insertError) {
    await supabase.storage.from("stories").remove([path]);
    const hint = /stories|story_views|schema cache|relation|column/i.test(insertError.message)
      ? " — 005_stories.sql 또는 _full_setup.sql 적용 필요."
      : /row-level security|violates/i.test(insertError.message)
      ? " — stories RLS 정책이 없습니다. supabase/_full_setup.sql 적용 필요."
      : "";
    return { error: `저장 실패: ${insertError.message}${hint}` };
  }

  revalidatePath("/feed");
  revalidatePath("/profile/me");
  redirect(`/story/me?created=${inserted.id}`);
}

export async function markStoryViewed(storyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return;

  await supabase.from("story_views").upsert(
    {
      story_id: storyId,
      viewer_id: user.id,
      viewed_at: new Date().toISOString(),
    },
    { onConflict: "story_id,viewer_id" }
  );
}
