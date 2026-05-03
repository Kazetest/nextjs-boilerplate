"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type CreateResult = { error?: string; postId?: string };

export async function createPost(formData: FormData): Promise<CreateResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다" };

  const image = formData.get("image") as File | null;
  const caption = (formData.get("caption") as string) ?? "";
  const keystrokesRaw = (formData.get("keystrokes") as string) ?? "";
  const exifRaw = (formData.get("exif") as string) ?? "{}";
  const originType = formData.get("originType") as
    | "original"
    | "inspired_by_user"
    | "overseas_meme";
  const originCreator = (formData.get("originCreator") as string) || null;
  const originLabel = (formData.get("originLabel") as string) || null;

  if (!image || image.size === 0) return { error: "사진이 필요합니다" };
  if (image.size > 8 * 1024 * 1024)
    return { error: "사진은 8MB 이하로 업로드해주세요" };
  if (!caption.trim()) return { error: "캡션이 필요합니다" };
  if (caption.length > 500) return { error: "캡션은 500자 이하" };

  // 키스트로크 검증
  let keystrokes;
  try {
    keystrokes = JSON.parse(keystrokesRaw);
    if (!keystrokes?.strokes || !Array.isArray(keystrokes.strokes)) {
      return { error: "타이핑 데이터가 없습니다" };
    }
    if (keystrokes.strokes.length < Math.max(3, caption.length * 0.4)) {
      return { error: "타이핑 흔적이 부족합니다 (붙여넣기 의심)" };
    }
    if (keystrokes.durationMs < caption.length * 20) {
      return { error: "타이핑이 너무 빠릅니다" };
    }
  } catch {
    return { error: "키스트로크 데이터 오류" };
  }

  // 원작 검증
  if (originType === "inspired_by_user" && !originCreator?.trim()) {
    return { error: "원작자 아이디를 입력해주세요" };
  }
  if (
    !["original", "inspired_by_user", "overseas_meme"].includes(originType)
  ) {
    return { error: "원작 유형 오류" };
  }

  // AI 의심 해시태그 자동 검출 — 사용자가 직접 #ai 등을 박았다면 본인 인정으로 간주, 차단
  const { detectAiHashtags } = await import("@/lib/hashtag");
  const aiTags = detectAiHashtags(caption);
  if (aiTags.length > 0) {
    return {
      error: `AI 관련 해시태그가 감지됐습니다 (#${aiTags.join(", #")}). NOai는 AI 콘텐츠를 받지 않습니다.`,
    };
  }

  // SightEngine AI 이미지 탐지 (env 미설정 시 자동 스킵)
  const { detectAIImage } = await import("@/lib/sightengine");
  const aiCheck = await detectAIImage(image);
  if (aiCheck.enabled && aiCheck.isAI) {
    return {
      error: `AI 생성 이미지로 의심됩니다 (확률 ${Math.round(
        (aiCheck.score ?? 0) * 100
      )}%). 카메라 직촬·라이브 사진을 사용해주세요.`,
    };
  }

  // 이미지 업로드
  const ext = (image.name.split(".").pop() || "jpg").toLowerCase();
  const safeExt = ["jpg", "jpeg", "png", "webp", "heic"].includes(ext)
    ? ext
    : "jpg";
  const path = `${user.id}/${crypto.randomUUID()}.${safeExt}`;

  const { error: uploadError } = await supabase.storage
    .from("posts")
    .upload(path, image, {
      contentType: image.type || `image/${safeExt}`,
      upsert: false,
    });

  if (uploadError) return { error: `업로드 실패: ${uploadError.message}` };

  const {
    data: { publicUrl },
  } = supabase.storage.from("posts").getPublicUrl(path);

  // 원작 post 검색 (원작자가 NOai 가입자면 그 사람의 최신 포스트와 연결)
  let originPostId: string | null = null;
  if (originType === "inspired_by_user" && originCreator) {
    const cleaned = originCreator.replace(/^@/, "").trim();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", cleaned)
      .maybeSingle();
    if (profile) {
      const { data: latest } = await supabase
        .from("posts")
        .select("id")
        .eq("author_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      originPostId = latest?.id ?? null;
    }
  }

  let exifData;
  try {
    exifData = JSON.parse(exifRaw);
  } catch {
    exifData = {};
  }

  const { data: inserted, error: insertError } = await supabase
    .from("posts")
    .insert({
      author_id: user.id,
      image_url: publicUrl,
      image_path: path,
      caption,
      caption_keystrokes: keystrokes,
      exif_data: exifData,
      ai_score: aiCheck.score ?? null,
      origin_type: originType,
      origin_post_id: originPostId,
      origin_creator_username: originCreator?.replace(/^@/, "").trim() || null,
      origin_label: originLabel,
    })
    .select("id")
    .single();

  if (insertError) {
    // 업로드된 이미지 정리
    await supabase.storage.from("posts").remove([path]);
    return { error: `저장 실패: ${insertError.message}` };
  }

  revalidatePath("/feed");
  revalidatePath(`/profile/me`);

  redirect(`/post/${inserted.id}`);
}
