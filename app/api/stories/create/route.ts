import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { detectAiHashtags } from "@/lib/hashtag";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_STORY_IMAGE_BYTES = 8 * 1024 * 1024;

function fail({
  status,
  stage,
  code,
  error,
  hint,
}: {
  status: number;
  stage: string;
  code: string;
  error: string;
  hint?: string;
}) {
  return NextResponse.json(
    { ok: false, error, stage, code, hint },
    { status }
  );
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return fail({
        status: 401,
        stage: "auth",
        code: "AUTH_REQUIRED",
        error: "로그인이 필요합니다",
        hint: "다시 로그인한 뒤 스토리 업로드를 시도해주세요.",
      });
    }

    const formData = await request.formData();
    const image = formData.get("image") as File | null;
    const caption = ((formData.get("caption") as string) ?? "").trim();
    const keystrokesRaw = (formData.get("keystrokes") as string) ?? "";
    const exifRaw = (formData.get("exif") as string) ?? "{}";

    if (!image || image.size === 0) {
      return fail({
        status: 400,
        stage: "validate.image",
        code: "IMAGE_REQUIRED",
        error: "사진이 필요합니다",
        hint: "카메라 버튼으로 이미지를 다시 선택해주세요.",
      });
    }
    if (image.size > MAX_STORY_IMAGE_BYTES) {
      return fail({
        status: 413,
        stage: "validate.image",
        code: "IMAGE_TOO_LARGE",
        error: "스토리는 8MB 이하 이미지만 올릴 수 있어요",
        hint: "이미지를 더 작게 촬영하거나 JPG/WebP로 다시 선택해주세요.",
      });
    }
    if (caption.length > 180) {
      return fail({
        status: 400,
        stage: "validate.caption",
        code: "CAPTION_TOO_LONG",
        error: "스토리는 180자 이하",
      });
    }

    const admin = createAdminClient();
    const db = admin ?? supabase;
    const storage = admin ?? supabase;

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      return fail({
        status: 500,
        stage: "profile.lookup",
        code: "PROFILE_LOOKUP_FAILED",
        error: `프로필 확인 실패: ${profileError.message}`,
        hint: hintProfile(profileError.message),
      });
    }

    if (!profile) {
      const { error: createProfileError } = await db
        .from("profiles")
        .insert({ id: user.id, username: `user_${user.id.slice(0, 8)}` });

      if (createProfileError) {
        return fail({
          status: 500,
          stage: "profile.self_heal",
          code: "PROFILE_CREATE_FAILED",
          error: `프로필 자동 생성 실패: ${createProfileError.message}`,
          hint: hintRls(createProfileError.message, "profiles"),
        });
      }
    }

    let keystrokes = null;
    if (caption) {
      try {
        keystrokes = JSON.parse(keystrokesRaw);
        if (!keystrokes?.strokes || !Array.isArray(keystrokes.strokes)) {
          return fail({
            status: 400,
            stage: "validate.keystrokes",
            code: "KEYSTROKES_MISSING",
            error: "타이핑 데이터가 없습니다",
            hint: "캡션을 직접 한 글자 이상 다시 입력해주세요.",
          });
        }
        if (keystrokes.strokes.length < Math.max(1, Math.ceil(caption.length * 0.2))) {
          return fail({
            status: 400,
            stage: "validate.keystrokes",
            code: "KEYSTROKES_TOO_FEW",
            error: "타이핑 흔적이 부족합니다",
            hint: "복붙 대신 캡션을 직접 입력한 뒤 다시 올려주세요.",
          });
        }
        if (caption.length >= 20 && keystrokes.durationMs < caption.length * 8) {
          return fail({
            status: 400,
            stage: "validate.keystrokes",
            code: "KEYSTROKES_TOO_FAST",
            error: "타이핑이 너무 빠릅니다",
            hint: "자동 입력처럼 보입니다. 천천히 직접 입력해주세요.",
          });
        }
      } catch {
        return fail({
          status: 400,
          stage: "validate.keystrokes",
          code: "KEYSTROKES_PARSE_FAILED",
          error: "키스트로크 데이터 오류",
          hint: "페이지를 새로고침한 뒤 캡션을 다시 입력해주세요.",
        });
      }

      const aiTags = detectAiHashtags(caption);
      if (aiTags.length > 0) {
        return fail({
          status: 400,
          stage: "validate.caption",
          code: "AI_HASHTAG_DETECTED",
          error: `AI 관련 해시태그가 감지됐습니다 (#${aiTags.join(", #")}).`,
          hint: "NOai에는 AI 생성/홍보성 태그를 넣을 수 없습니다.",
        });
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

    if (admin) {
      const { error: bucketLookupError } = await admin.storage.getBucket("stories");
      if (bucketLookupError) {
        const { error: bucketCreateError } = await admin.storage.createBucket(
          "stories",
          {
            public: true,
            fileSizeLimit: MAX_STORY_IMAGE_BYTES,
            allowedMimeTypes: [
              "image/jpeg",
              "image/png",
              "image/webp",
              "image/heic",
              "image/heif",
            ],
          }
        );
        if (bucketCreateError && !/already exists/i.test(bucketCreateError.message)) {
          return fail({
            status: 500,
            stage: "storage.bucket",
            code: "STORIES_BUCKET_CREATE_FAILED",
            error: `stories 버킷 생성 실패: ${bucketCreateError.message}`,
            hint: "Vercel SUPABASE_SERVICE_ROLE_KEY 또는 Supabase Storage 권한 확인 필요.",
          });
        }
      }
    }

    const { error: uploadError } = await storage.storage
      .from("stories")
      .upload(path, image, {
        contentType: image.type || `image/${safeExt}`,
        upsert: false,
      });

    if (uploadError) {
      return fail({
        status: 500,
        stage: "storage.upload",
        code: "STORY_STORAGE_UPLOAD_FAILED",
        error: `업로드 실패: ${uploadError.message}`,
        hint: hintStorage(uploadError.message),
      });
    }

    const {
      data: { publicUrl },
    } = storage.storage.from("stories").getPublicUrl(path);

    const { data: inserted, error: insertError } = await db
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
      await storage.storage.from("stories").remove([path]);
      return fail({
        status: 500,
        stage: "stories.insert",
        code: "STORY_INSERT_FAILED",
        error: `저장 실패: ${insertError.message}`,
        hint: hintStories(insertError.message),
      });
    }

    revalidatePath("/feed");
    revalidatePath("/profile/me");

    return NextResponse.json({
      ok: true,
      storyId: inserted.id,
      redirectTo: `/story/me?created=${inserted.id}`,
    });
  } catch (e) {
    return fail({
      status: 500,
      stage: "unexpected",
      code: "STORY_UPLOAD_UNEXPECTED",
      error:
        e instanceof Error
          ? `스토리 업로드 실패: ${e.message}`
          : "스토리 업로드 실패",
      hint: "다시 시도해도 반복되면 /debug 시뮬레이션 결과를 확인해주세요.",
    });
  }
}

function hintProfile(message: string) {
  return /schema cache|relation|profiles/i.test(message)
    ? " — profiles 테이블 확인 필요. supabase/_full_setup.sql 적용 필요."
    : "";
}

function hintRls(message: string, target: string) {
  return /row-level security|violates/i.test(message)
    ? ` — ${target} RLS 정책 확인 필요. supabase/_full_setup.sql 적용 필요.`
    : "";
}

function hintStorage(message: string) {
  if (/bucket/i.test(message)) {
    return " — Supabase에 'stories' 버킷이 없습니다. supabase/_full_setup.sql 적용 필요.";
  }
  return hintRls(message, "stories storage");
}

function hintStories(message: string) {
  if (/stories|story_views|schema cache|relation|column/i.test(message)) {
    return " — 005_stories.sql 또는 _full_setup.sql 적용 필요.";
  }
  return hintRls(message, "stories");
}
