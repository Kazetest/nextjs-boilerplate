"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

// Vercel function timeout: Hobby는 10s 강제 상한, Pro에서 늘어남.
// 'use server' 파일은 type/const export 금지 — async function 외 export하면 모듈 전체 깨짐.
// maxDuration은 route segment 단에서만 설정 가능 (이 파일 X).

export type CreateResult = { error?: string; postId?: string };

export async function createPost(formData: FormData): Promise<CreateResult> {
  const t0 = Date.now();
  const log = (stage: string, extra: Record<string, unknown> = {}) =>
    console.log(`[NOai/createPost] ${stage}`, { ms: Date.now() - t0, ...extra });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "로그인이 필요합니다" };
  log("auth ok", { userId: user.id });

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

  // SightEngine을 createPost 흐름에서 제거 — Vercel function timeout 회피.
  // post 저장 직후 별도 API route(/api/post/[id]/check-ai)로 비동기 호출하여
  // ai_score 채우고 isAI일 경우 hidden_by_reports 처리.

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

  if (uploadError) {
    log("upload failed", { msg: uploadError.message });
    // 흔한 원인: storage bucket 'posts'가 없음 (schema.sql 미적용)
    const hint = /bucket/i.test(uploadError.message)
      ? " — Supabase에 'posts' 버킷이 없습니다. supabase/_full_setup.sql 적용 필요."
      : "";
    return { error: `업로드 실패: ${uploadError.message}${hint}` };
  }
  log("upload ok", { path });

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
      ai_score: null,
      origin_type: originType,
      origin_post_id: originPostId,
      origin_creator_username: originCreator?.replace(/^@/, "").trim() || null,
      origin_label: originLabel,
    })
    .select("id")
    .single();

  if (insertError) {
    log("insert failed", { msg: insertError.message, code: insertError.code });
    // 업로드된 이미지 정리
    await supabase.storage.from("posts").remove([path]);
    // 흔한 원인: profile 없음 (FK violation) 또는 hidden_by_reports 컬럼 없음 (002 미적용)
    const hint = /profiles/i.test(insertError.message)
      ? " — profile이 없습니다. /onboarding 먼저 완료하세요."
      : /hidden_by_reports|report_count/i.test(insertError.message)
      ? " — 002_moderation.sql 미적용. supabase/_full_setup.sql 실행 필요."
      : "";
    return { error: `저장 실패: ${insertError.message}${hint}` };
  }
  log("insert ok", { postId: inserted.id });

  revalidatePath("/feed");
  revalidatePath(`/profile/me`);

  redirect(`/post/${inserted.id}`);
}
