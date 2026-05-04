import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { detectAiHashtags } from "@/lib/hashtag";
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_STORY_IMAGE_BYTES = 8 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "로그인이 필요합니다" }, { status: 401 });
    }

    const formData = await request.formData();
    const image = formData.get("image") as File | null;
    const caption = ((formData.get("caption") as string) ?? "").trim();
    const keystrokesRaw = (formData.get("keystrokes") as string) ?? "";
    const exifRaw = (formData.get("exif") as string) ?? "{}";

    if (!image || image.size === 0) {
      return NextResponse.json({ error: "사진이 필요합니다" }, { status: 400 });
    }
    if (image.size > MAX_STORY_IMAGE_BYTES) {
      return NextResponse.json(
        { error: "스토리는 8MB 이하 이미지만 올릴 수 있어요" },
        { status: 413 }
      );
    }
    if (caption.length > 180) {
      return NextResponse.json({ error: "스토리는 180자 이하" }, { status: 400 });
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
      return NextResponse.json(
        { error: `프로필 확인 실패: ${profileError.message}${hintProfile(profileError.message)}` },
        { status: 500 }
      );
    }

    if (!profile) {
      const { error: createProfileError } = await db
        .from("profiles")
        .insert({ id: user.id, username: `user_${user.id.slice(0, 8)}` });

      if (createProfileError) {
        return NextResponse.json(
          {
            error: `프로필 자동 생성 실패: ${createProfileError.message}${hintRls(
              createProfileError.message,
              "profiles"
            )}`,
          },
          { status: 500 }
        );
      }
    }

    let keystrokes = null;
    if (caption) {
      try {
        keystrokes = JSON.parse(keystrokesRaw);
        if (!keystrokes?.strokes || !Array.isArray(keystrokes.strokes)) {
          return NextResponse.json({ error: "타이핑 데이터가 없습니다" }, { status: 400 });
        }
        if (keystrokes.strokes.length < Math.max(1, Math.ceil(caption.length * 0.2))) {
          return NextResponse.json({ error: "타이핑 흔적이 부족합니다" }, { status: 400 });
        }
        if (caption.length >= 20 && keystrokes.durationMs < caption.length * 8) {
          return NextResponse.json({ error: "타이핑이 너무 빠릅니다" }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: "키스트로크 데이터 오류" }, { status: 400 });
      }

      const aiTags = detectAiHashtags(caption);
      if (aiTags.length > 0) {
        return NextResponse.json(
          { error: `AI 관련 해시태그가 감지됐습니다 (#${aiTags.join(", #")}).` },
          { status: 400 }
        );
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
          return NextResponse.json(
            {
              error: `stories 버킷 생성 실패: ${bucketCreateError.message} — Vercel SUPABASE_SERVICE_ROLE_KEY 확인 필요.`,
            },
            { status: 500 }
          );
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
      return NextResponse.json(
        { error: `업로드 실패: ${uploadError.message}${hintStorage(uploadError.message)}` },
        { status: 500 }
      );
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
      return NextResponse.json(
        { error: `저장 실패: ${insertError.message}${hintStories(insertError.message)}` },
        { status: 500 }
      );
    }

    revalidatePath("/feed");
    revalidatePath("/profile/me");

    return NextResponse.json({
      ok: true,
      storyId: inserted.id,
      redirectTo: `/story/me?created=${inserted.id}`,
    });
  } catch (e) {
    return NextResponse.json(
      {
        error:
          e instanceof Error
            ? `스토리 업로드 실패: ${e.message}`
            : "스토리 업로드 실패",
      },
      { status: 500 }
    );
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
